// One-shot test of the OpenRouter vision call the Netlify function will make.
// Generates a tiny synthetic "plate" image, sends it, prints the parsed result.
//
// Usage: OPENROUTER_API_KEY=... node scripts/test-vision.mjs

const key = process.env.OPENROUTER_API_KEY;
if (!key) {
  console.error('Set OPENROUTER_API_KEY first');
  process.exit(1);
}

// Public Unsplash food photo (a burger meal)
const IMAGE_URL = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1280';

const model = process.env.AI_VISION_MODEL || 'meta-llama/llama-3.2-11b-vision-instruct:free';

const body = {
  model,
  temperature: 0.1,
  max_tokens: 1024,
  response_format: { type: 'json_object' },
  messages: [
    {
      role: 'system',
      content: `You return STRICT JSON listing each food item in the photo with estimatedGrams, calories, protein, carbs, fat, confidence. Output schema:
{"items":[{"name":"...","estimatedGrams":N,"calories":N,"protein":N,"carbs":N,"fat":N,"confidence":"low|medium|high"}]}`
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Identify every food item visible. Reply JSON only.' },
        { type: 'image_url', image_url: { url: IMAGE_URL } }
      ]
    }
  ]
};

console.log(`Calling OpenRouter with model: ${model}`);
console.log(`Image: ${IMAGE_URL}`);

const t0 = Date.now();
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://lifedboard.netlify.app',
    'X-Title': 'Life Dashboard'
  },
  body: JSON.stringify(body)
});
const elapsed = Date.now() - t0;

console.log(`HTTP ${response.status} (${elapsed}ms)`);

if (!response.ok) {
  console.error(await response.text());
  process.exit(1);
}

const data = await response.json();
const content = data.choices?.[0]?.message?.content?.trim() || '';
console.log('\nRaw model output:\n', content.slice(0, 800));

const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
try {
  const parsed = JSON.parse(cleaned);
  console.log('\nParsed JSON:');
  console.log(JSON.stringify(parsed, null, 2));
  console.log(`\nItems: ${parsed.items?.length ?? 0}`);
} catch (error) {
  console.error('\nParse failed:', error.message);
}

console.log(`\nUsage: ${JSON.stringify(data.usage || {})}`);
