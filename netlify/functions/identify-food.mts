/**
 * Server-side proxy for AI food identification.
 *
 * Reads OPENROUTER_API_KEY from Netlify env vars (Site → Site settings →
 * Environment variables). Forwards a single base64-encoded photo to
 * OpenRouter using a vision-capable model and returns a structured JSON
 * list of { name, estimatedGrams, calories, protein, carbs, fat }.
 *
 * The model can be overridden by setting AI_VISION_MODEL. Default is the
 * free Llama 3.2 11B Vision routing through OpenRouter.
 */

interface IdentifyRequestBody {
  image?: string;
  mimeType?: string;
}

interface IdentifiedItem {
  name: string;
  estimatedGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: 'low' | 'medium' | 'high';
}

const SYSTEM_PROMPT = `You are a precise food identification assistant. You look at a photo of a meal and return STRICT JSON describing each distinct food item visible.

Rules:
- Be specific: "grilled chicken breast" not "meat"; "jacket potato" not "potato dish"; "tuna in spring water" not "fish".
- For mixed dishes (salads, bowls), break out each visible ingredient.
- For each item, estimate the weight in grams of the visible portion, then provide the macros for THAT weight (not per 100g).
- If you can't see what's inside something (a covered dish, sandwich interior), note "unknown" for confidence and give your best guess.
- Round macros to integers.
- Output ONLY the JSON object — no markdown fences, no commentary, no preamble.
- If nothing edible is visible, return {"items": []}.

Output schema:
{
  "items": [
    {
      "name": "string",
      "estimatedGrams": number,
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "confidence": "low" | "medium" | "high"
    }
  ]
}`;

const USER_PROMPT = 'Identify every food item visible in this photo. Reply with JSON only.';

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });

export default async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return json(503, {
      error: 'AI vision is not configured.',
      help: 'Add OPENROUTER_API_KEY in Netlify → Site settings → Environment variables, then redeploy.'
    });
  }

  let body: IdentifyRequestBody;
  try {
    body = (await request.json()) as IdentifyRequestBody;
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const image = body.image?.trim();
  if (!image) {
    return json(400, { error: 'Missing image in request body' });
  }

  const mimeType = body.mimeType && /^image\/(jpeg|png|webp)$/.test(body.mimeType) ? body.mimeType : 'image/jpeg';
  const dataUrl = image.startsWith('data:') ? image : `data:${mimeType};base64,${image}`;

  // Verified free vision model on OpenRouter (2026-05-13). Override with the
  // AI_VISION_MODEL env var if it rate-limits or gets deprecated. Other free
  // candidates: google/gemma-4-31b-it:free, baidu/qianfan-ocr-fast:free.
  const model = process.env.AI_VISION_MODEL || 'nvidia/nemotron-nano-12b-v2-vl:free';

  let upstream: Response;
  try {
    upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lifedboard.netlify.app',
        'X-Title': 'Life Dashboard'
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: USER_PROMPT },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ]
      })
    });
  } catch (error) {
    return json(502, {
      error: 'Could not reach AI provider',
      detail: error instanceof Error ? error.message : 'network error'
    });
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    if (upstream.status === 429) {
      return json(429, {
        error: 'The free AI model is busy. Wait a few seconds and try again.',
        detail: text.slice(0, 500),
        model
      });
    }
    return json(upstream.status, {
      error: `AI provider returned ${upstream.status}`,
      detail: text.slice(0, 500),
      model
    });
  }

  let upstreamData: { choices?: Array<{ message?: { content?: string } }> };
  try {
    upstreamData = (await upstream.json()) as typeof upstreamData;
  } catch {
    return json(502, { error: 'AI provider returned non-JSON response' });
  }

  const content = upstreamData.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return json(502, { error: 'AI provider returned an empty response' });
  }

  // Some models wrap JSON in ```json … ``` fences despite response_format. Strip it.
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: { items?: IdentifiedItem[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return json(502, {
      error: 'AI provider returned invalid JSON',
      raw: content.slice(0, 500)
    });
  }

  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const sanitised: IdentifiedItem[] = items
    .filter((item) => item && typeof item.name === 'string' && Number.isFinite(item.estimatedGrams))
    .map((item) => ({
      name: String(item.name).trim().slice(0, 120),
      estimatedGrams: Math.max(1, Math.round(Number(item.estimatedGrams) || 0)),
      calories: Math.max(0, Math.round(Number(item.calories) || 0)),
      protein: Math.max(0, Math.round(Number(item.protein) || 0)),
      carbs: Math.max(0, Math.round(Number(item.carbs) || 0)),
      fat: Math.max(0, Math.round(Number(item.fat) || 0)),
      confidence:
        item.confidence === 'high' || item.confidence === 'medium' || item.confidence === 'low'
          ? item.confidence
          : undefined
    }))
    .slice(0, 12);

  return json(200, { items: sanitised, model });
};

export const config = {
  path: '/.netlify/functions/identify-food'
};
