import { Camera, ChevronLeft, RefreshCw, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FoodEntry, LocalFood, MealSlot } from '../types';
import { generateId, todayKey } from '../data/defaults';
import { allFoods, searchFoods } from '../data/foodEngine';

const MEAL_SLOTS: Array<{ key: MealSlot; label: string }> = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' }
];

const inferMealSlot = (): MealSlot => {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snacks';
};

interface IdentifiedItem {
  id: string;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: 'low' | 'medium' | 'high';
  matchedSeed?: LocalFood;
  enabled: boolean;
}

type Stage = 'camera' | 'analyzing' | 'review' | 'error';

const supportsCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;

async function videoFrameToBase64Jpeg(video: HTMLVideoElement): Promise<{ base64: string; mimeType: string }> {
  const w = video.videoWidth;
  const h = video.videoHeight;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(w, h));
  const targetW = Math.round(w * scale);
  const targetH = Math.round(h * scale);
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not draw the frame.');
  ctx.drawImage(video, 0, 0, targetW, targetH);
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const [, base64] = dataUrl.split(',');
  return { base64, mimeType: 'image/jpeg' };
}

const reconcileWithSeeds = (
  raw: { name: string; estimatedGrams: number; calories: number; protein: number; carbs: number; fat: number; confidence?: 'low' | 'medium' | 'high' },
  localFoods: LocalFood[]
): IdentifiedItem => {
  const merged = allFoods(localFoods);
  const matches = searchFoods(raw.name, merged);
  const seed = matches.find((m) => m.source === 'seed') || matches[0];

  if (seed) {
    // Trust seed macros over the model's, scale by the model's gram estimate
    const ratio = raw.estimatedGrams / (seed.baseGrams || 100);
    return {
      id: generateId('photo-item'),
      name: seed.name,
      grams: raw.estimatedGrams,
      calories: Math.round(seed.calories * ratio),
      protein: Math.round(seed.protein * ratio),
      carbs: Math.round(seed.carbs * ratio),
      fat: Math.round(seed.fat * ratio),
      confidence: raw.confidence,
      matchedSeed: seed,
      enabled: true
    };
  }

  return {
    id: generateId('photo-item'),
    name: raw.name,
    grams: raw.estimatedGrams,
    calories: raw.calories,
    protein: raw.protein,
    carbs: raw.carbs,
    fat: raw.fat,
    confidence: raw.confidence,
    enabled: true
  };
};

const recalcMacros = (item: IdentifiedItem, newGrams: number): IdentifiedItem => {
  if (!item.matchedSeed) {
    // No seed → scale linearly from the original AI estimate
    const ratio = newGrams / Math.max(1, item.grams);
    return {
      ...item,
      grams: newGrams,
      calories: Math.round(item.calories * ratio),
      protein: Math.round(item.protein * ratio),
      carbs: Math.round(item.carbs * ratio),
      fat: Math.round(item.fat * ratio)
    };
  }
  const seed = item.matchedSeed;
  const ratio = newGrams / (seed.baseGrams || 100);
  return {
    ...item,
    grams: newGrams,
    calories: Math.round(seed.calories * ratio),
    protein: Math.round(seed.protein * ratio),
    carbs: Math.round(seed.carbs * ratio),
    fat: Math.round(seed.fat * ratio)
  };
};

export function FoodPhotoModal({
  open,
  onClose,
  onLog,
  defaultDate,
  localFoods = []
}: {
  open: boolean;
  onClose: () => void;
  onLog: (entry: FoodEntry) => Promise<void>;
  defaultDate?: string;
  localFoods?: LocalFood[];
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stage, setStage] = useState<Stage>('camera');
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<IdentifiedItem[]>([]);
  const [mealSlot, setMealSlot] = useState<MealSlot>(inferMealSlot());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setStage('camera');
    setStatus('');
    setItems([]);
    setMealSlot(inferMealSlot());
    setPreviewUrl(null);
  }, [open]);

  // Camera lifecycle (only in 'camera' stage)
  useEffect(() => {
    if (!open || stage !== 'camera') return;
    if (!supportsCamera) {
      setStage('error');
      setStatus('This device cannot access the camera.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1440 }
          },
          audio: false
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (error) {
        if (cancelled) return;
        setStage('error');
        setStatus(
          error instanceof Error && error.name === 'NotAllowedError'
            ? 'Camera permission was blocked. Enable it in Settings → Safari → Camera.'
            : 'Camera unavailable on this device.'
        );
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [open, stage]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    setStage('analyzing');
    setStatus('Identifying foods…');

    try {
      const { base64, mimeType } = await videoFrameToBase64Jpeg(video);
      // Stop the camera once we have the frame — saves battery during the API call
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setPreviewUrl(`data:${mimeType};base64,${base64}`);

      const response = await fetch('/.netlify/functions/identify-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType })
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        if (response.status === 503) {
          setStage('error');
          setStatus(
            errBody.help ||
              'AI vision is not configured. Add OPENROUTER_API_KEY in Netlify env vars then redeploy.'
          );
          return;
        }
        setStage('error');
        setStatus(errBody.error || `Identification failed (${response.status}).`);
        return;
      }

      const data = (await response.json()) as {
        items: Array<{
          name: string;
          estimatedGrams: number;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          confidence?: 'low' | 'medium' | 'high';
        }>;
      };
      if (!data.items?.length) {
        setStage('error');
        setStatus('No food detected in the photo. Try a closer shot with better light.');
        return;
      }

      const reconciled = data.items.map((raw) => reconcileWithSeeds(raw, localFoods));
      setItems(reconciled);
      setStage('review');
    } catch (error) {
      setStage('error');
      setStatus(error instanceof Error ? error.message : 'Something went wrong identifying the photo.');
    }
  };

  const retake = () => {
    setItems([]);
    setPreviewUrl(null);
    setStage('camera');
    setStatus('');
  };

  const updateGrams = (id: string, grams: number) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? recalcMacros(item, Math.max(1, grams)) : item))
    );
  };

  const toggle = (id: string) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)));
  };

  const remove = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const enabledItems = items.filter((item) => item.enabled);
  const totals = enabledItems.reduce(
    (sum, item) => ({
      calories: sum.calories + item.calories,
      protein: sum.protein + item.protein,
      carbs: sum.carbs + item.carbs,
      fat: sum.fat + item.fat
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const logAll = async () => {
    if (!enabledItems.length) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const date = defaultDate ?? todayKey();
      for (const item of enabledItems) {
        await onLog({
          id: generateId('food'),
          type: 'food',
          date,
          title: item.name,
          notes: item.matchedSeed ? '' : 'Macros estimated from photo.',
          createdAt: now,
          updatedAt: now,
          meal: item.name,
          mealSlot,
          foodId: item.matchedSeed?.id,
          foodName: item.name,
          servingLabel: `${item.grams}g`,
          servingGrams: item.grams,
          servingUnit: 'g',
          servingAmount: item.grams,
          isQuickAdd: !item.matchedSeed,
          isRecipe: false,
          unverified: !item.matchedSeed,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          waterMl: 0,
          source: 'manual'
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="scanner-modal photo-modal" role="dialog" aria-modal="true" aria-label="Identify food from photo">
      {stage === 'camera' && (
        <>
          <video ref={videoRef} className="scanner-video-bg" muted playsInline autoPlay />
          <header className="scanner-header">
            <button type="button" className="scanner-close" onClick={onClose} aria-label="Close">
              <X size={22} />
            </button>
            <div className="scanner-status pill">
              <Sparkles size={16} />
              <span>Aim at your meal, then tap shutter</span>
            </div>
            <span aria-hidden="true" className="scanner-spacer" />
          </header>
          <div className="photo-shutter-bar">
            <button type="button" className="photo-shutter" onClick={() => void capture()} aria-label="Take photo">
              <span className="photo-shutter-inner" />
            </button>
          </div>
        </>
      )}

      {stage === 'analyzing' && (
        <div className="photo-analyzing">
          {previewUrl && <img src={previewUrl} className="photo-preview" alt="" />}
          <div className="photo-analyzing-card">
            <RefreshCw size={22} className="spin" />
            <strong>Identifying foods…</strong>
            <span>This usually takes 2–5 seconds.</span>
          </div>
        </div>
      )}

      {stage === 'review' && (
        <div className="photo-review">
          <header className="photo-review-head">
            <button type="button" className="search-back" onClick={retake} aria-label="Retake photo">
              <ChevronLeft size={22} />
            </button>
            <div className="photo-review-title">
              <h3>Detected {items.length} item{items.length === 1 ? '' : 's'}</h3>
              <span>Tap a row to edit grams. Untick anything wrong.</span>
            </div>
            <button type="button" className="scanner-close" onClick={onClose} aria-label="Close">
              <X size={22} />
            </button>
          </header>

          {previewUrl && (
            <img src={previewUrl} className="photo-review-thumb" alt="Captured meal" />
          )}

          <div className="photo-items">
            {items.map((item) => (
              <div key={item.id} className={`photo-item ${item.enabled ? '' : 'disabled'}`}>
                <label className="photo-item-toggle">
                  <input type="checkbox" checked={item.enabled} onChange={() => toggle(item.id)} />
                </label>
                <div className="photo-item-body">
                  <div className="photo-item-head">
                    <strong>{item.name}</strong>
                    {item.matchedSeed && <span className="photo-item-tag">Matched</span>}
                    {item.confidence && <span className={`photo-item-confidence ${item.confidence}`}>{item.confidence}</span>}
                  </div>
                  <div className="photo-item-macros">
                    {item.calories} kcal · P {item.protein}g · C {item.carbs}g · F {item.fat}g
                  </div>
                  <div className="photo-item-grams">
                    <button type="button" onClick={() => updateGrams(item.id, item.grams - 10)} aria-label="Decrease grams">−</button>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={item.grams}
                      onChange={(event) => updateGrams(item.id, Math.max(1, Number.parseFloat(event.target.value) || 0))}
                    />
                    <span>g</span>
                    <button type="button" onClick={() => updateGrams(item.id, item.grams + 10)} aria-label="Increase grams">+</button>
                  </div>
                </div>
                <button type="button" className="photo-item-remove" onClick={() => remove(item.id)} aria-label="Remove item">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="photo-totals">
            <strong>{totals.calories} kcal</strong>
            <span>P {totals.protein}g · C {totals.carbs}g · F {totals.fat}g</span>
          </div>

          <div className="scanner-mealslot" role="radiogroup" aria-label="Meal">
            {MEAL_SLOTS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={mealSlot === key}
                className={mealSlot === key ? 'active' : ''}
                onClick={() => setMealSlot(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="scanner-actions">
            <button type="button" className="secondary-button" onClick={retake}>
              <Camera size={16} /> Retake
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => void logAll()}
              disabled={!enabledItems.length || saving}
            >
              {saving ? 'Adding…' : `Add ${enabledItems.length} to ${MEAL_SLOTS.find((m) => m.key === mealSlot)?.label}`}
            </button>
          </div>
        </div>
      )}

      {stage === 'error' && (
        <div className="scanner-result">
          <header className="scanner-result-head">
            <h3>Identify from photo</h3>
            <button type="button" className="scanner-close" onClick={onClose} aria-label="Close">
              <X size={22} />
            </button>
          </header>
          <p className="form-message">{status}</p>
          <div className="scanner-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Close</button>
            <button type="button" className="primary-button" onClick={retake}>
              <RefreshCw size={16} /> Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
