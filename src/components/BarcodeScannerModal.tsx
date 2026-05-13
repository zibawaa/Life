import { Camera, Keyboard, RefreshCw, ScanBarcode, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import type { FoodEntry, LocalFood, MealSlot, ProductLookupResult } from '../types';
import { generateId, todayKey } from '../data/defaults';
import { lookupOpenFoodFactsProduct } from '../data/openFoodFacts';

const supportsNativeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
const supportsCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

const loadZxing = () =>
  Promise.all([import('@zxing/library'), import('@zxing/browser')]).then(([lib, browser]) => ({
    BarcodeFormat: lib.BarcodeFormat,
    DecodeHintType: lib.DecodeHintType,
    BrowserMultiFormatReader: browser.BrowserMultiFormatReader
  }));

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

const round = (value: number) => Math.round(value);

type Stage = 'scanning' | 'looking-up' | 'review' | 'error';
type Brightness = 'ok' | 'dark' | 'bright';

export function BarcodeScannerModal({
  open,
  onClose,
  onLog,
  onSaveLocalFood,
  defaultDate
}: {
  open: boolean;
  onClose: () => void;
  onLog: (entry: FoodEntry) => Promise<void>;
  onSaveLocalFood?: (food: LocalFood) => Promise<void>;
  defaultDate?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lookupTokenRef = useRef(0);

  const [stage, setStage] = useState<Stage>('scanning');
  const [status, setStatus] = useState('Align the barcode in the box');
  const [brightness, setBrightness] = useState<Brightness>('ok');
  const [product, setProduct] = useState<ProductLookupResult | null>(null);
  const [grams, setGrams] = useState(100);
  const [mealSlot, setMealSlot] = useState<MealSlot>(inferMealSlot());
  const [saving, setSaving] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Reset modal state when opened
  useEffect(() => {
    if (!open) return;
    setStage('scanning');
    setProduct(null);
    setStatus('Align the barcode in the box');
    setBrightness('ok');
    setGrams(100);
    setMealSlot(inferMealSlot());
    setManualMode(false);
    setManualCode('');
  }, [open]);

  // Camera + decoder lifecycle. Single effect, sequential: stream → decoder.
  // This avoids a race where the ZXing chunk loads before getUserMedia resolves
  // and the decoder gives up because streamRef.current is null.
  useEffect(() => {
    if (!open || stage !== 'scanning') return;
    if (!supportsCamera) {
      setStage('error');
      setStatus('This device cannot access the camera.');
      return;
    }

    let cancelled = false;
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    const startNative = async () => {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      await video.play().catch(() => undefined);

      const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
      const loop = async () => {
        if (cancelled) return;
        if (video.readyState < 2 || video.videoWidth === 0) {
          window.setTimeout(loop, 200);
          return;
        }
        try {
          const codes = await detector.detect(video);
          const raw = codes[0]?.rawValue;
          if (raw) {
            handleDetected(raw);
            return;
          }
        } catch {
          /* keep trying */
        }
        window.setTimeout(loop, 250);
      };
      loop();
    };

    const startZxing = async () => {
      const { BarcodeFormat, DecodeHintType, BrowserMultiFormatReader } = await loadZxing();
      if (cancelled) return;
      const video = videoRef.current;
      if (!video) return;

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });

      const controls = await reader.decodeFromConstraints(constraints, video, (result, _err, ctrls) => {
        if (cancelled) {
          ctrls.stop();
          return;
        }
        zxingControlsRef.current = ctrls;
        if (result) {
          ctrls.stop();
          handleDetected(result.getText());
        }
      });
      zxingControlsRef.current = controls;
      // Capture the stream ZXing created so brightness sampling and cleanup work.
      const mediaStream = video.srcObject;
      if (mediaStream instanceof MediaStream) {
        streamRef.current = mediaStream;
      }
    };

    const start = supportsNativeDetector ? startNative : startZxing;

    start().catch((error) => {
      if (cancelled) return;
      setStage('error');
      setStatus(
        error instanceof Error && error.name === 'NotAllowedError'
          ? 'Camera permission was blocked. Enable it in Settings → Safari → Camera.'
          : 'Could not start the scanner. Try manual entry.'
      );
    });

    return () => {
      cancelled = true;
      zxingControlsRef.current?.stop();
      zxingControlsRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stage]);

  // Brightness sampling — every 700ms while scanning
  useEffect(() => {
    if (!open || stage !== 'scanning') return;
    let cancelled = false;
    if (!sampleCanvasRef.current) {
      sampleCanvasRef.current = document.createElement('canvas');
      sampleCanvasRef.current.width = 96;
      sampleCanvasRef.current.height = 54;
    }
    const canvas = sampleCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const sample = () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let sum = 0;
          for (let i = 0; i < data.length; i += 4) {
            sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          }
          const avg = sum / (data.length / 4);
          const next: Brightness = avg < 40 ? 'dark' : avg > 215 ? 'bright' : 'ok';
          setBrightness((current) => (current === next ? current : next));
          setStatus(
            next === 'dark'
              ? 'Too dark — find more light'
              : next === 'bright'
                ? 'Too bright — reduce glare'
                : 'Align the barcode in the box'
          );
        } catch {
          /* ignore — happens on cross-origin or before video is ready */
        }
      }
      window.setTimeout(sample, 700);
    };
    sample();
    return () => {
      cancelled = true;
    };
  }, [open, stage]);

  const handleDetected = async (raw: string) => {
    const token = ++lookupTokenRef.current;
    setStage('looking-up');
    setStatus(`Looking up ${raw}...`);
    try {
      const result = await lookupOpenFoodFactsProduct(raw);
      if (token !== lookupTokenRef.current) return;
      setProduct(result);
      const initialGrams = result.servingOptions?.[0]?.grams || result.baseGrams || 100;
      setGrams(Math.max(1, Math.round(initialGrams)));
      setStage('review');
    } catch (error) {
      if (token !== lookupTokenRef.current) return;
      setStage('error');
      setStatus(error instanceof Error ? error.message : 'Product not found. Try again or enter manually.');
    }
  };

  const ratio = product ? grams / (product.baseGrams || 100) : 0;
  const macros = product
    ? {
        calories: round(product.calories * ratio),
        protein: round(product.protein * ratio),
        carbs: round(product.carbs * ratio),
        fat: round(product.fat * ratio)
      }
    : { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const rescan = () => {
    setProduct(null);
    setStage('scanning');
    setStatus('Align the barcode in the box');
  };

  const log = async () => {
    if (!product) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (onSaveLocalFood) {
        await onSaveLocalFood({
          id: `barcode-${product.barcode}`,
          barcode: product.barcode,
          name: product.name,
          brand: product.brand,
          source: 'barcode',
          baseGrams: product.baseGrams ?? 100,
          servingOptions: product.servingOptions,
          unverified: product.unverified,
          calories: product.calories,
          protein: product.protein,
          carbs: product.carbs,
          fat: product.fat,
          servingSize: product.servingSize,
          savedAt: now,
          updatedAt: now
        });
      }
      await onLog({
        id: generateId('food'),
        type: 'food',
        date: defaultDate ?? todayKey(),
        title: product.name,
        notes: product.unverified ? 'Unverified barcode entry.' : '',
        createdAt: now,
        updatedAt: now,
        meal: product.name,
        mealSlot,
        foodId: `barcode-${product.barcode}`,
        foodName: product.name,
        brand: product.brand,
        servingLabel: `${grams}g`,
        servingGrams: grams,
        servingUnit: 'g',
        servingAmount: grams,
        isQuickAdd: false,
        isRecipe: false,
        unverified: product.unverified,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        waterMl: 0,
        barcode: product.barcode,
        source: 'barcode'
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="scanner-modal" role="dialog" aria-modal="true" aria-label="Scan barcode">
      <video ref={videoRef} className="scanner-video-bg" muted playsInline autoPlay />

      {(stage === 'scanning' || stage === 'looking-up') && (
        <>
          <div className="scanner-overlay" aria-hidden="true">
            <div className={`scanner-viewfinder brightness-${brightness}`}>
              <span className="scanner-corner tl" />
              <span className="scanner-corner tr" />
              <span className="scanner-corner bl" />
              <span className="scanner-corner br" />
              <span className="scanner-scanline" />
            </div>
          </div>
          <header className="scanner-header">
            <button type="button" className="scanner-close" onClick={onClose} aria-label="Close scanner">
              <X size={22} />
            </button>
            <div className={`scanner-status pill brightness-${brightness}`}>
              <ScanBarcode size={16} />
              <span>{status}</span>
            </div>
            <span aria-hidden="true" className="scanner-spacer" />
          </header>

          <div className="scanner-bottom">
            {manualMode ? (
              <form
                className="scanner-manual"
                onSubmit={(event) => {
                  event.preventDefault();
                  const code = manualCode.trim();
                  if (code) void handleDetected(code);
                }}
              >
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={manualCode}
                  onChange={(event) => setManualCode(event.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Type the digits under the barcode"
                  autoFocus
                />
                <button type="submit" className="primary-button" disabled={!manualCode.trim()}>
                  Look up
                </button>
                <button type="button" className="scanner-text-link" onClick={() => setManualMode(false)}>
                  Back to camera
                </button>
              </form>
            ) : (
              <button type="button" className="scanner-text-link" onClick={() => setManualMode(true)}>
                <Keyboard size={16} /> Type the code instead
              </button>
            )}
          </div>
        </>
      )}

      {stage === 'review' && product && (
        <div className="scanner-result">
          <header className="scanner-result-head">
            <h3>{product.name}</h3>
            {product.brand && <span>{product.brand}</span>}
            <button type="button" className="scanner-close" onClick={onClose} aria-label="Close">
              <X size={22} />
            </button>
          </header>

          <div className="scanner-macro-grid">
            <Macro label="Calories" value={`${macros.calories}`} unit="kcal" />
            <Macro label="Protein" value={`${macros.protein}`} unit="g" />
            <Macro label="Carbs" value={`${macros.carbs}`} unit="g" />
            <Macro label="Fat" value={`${macros.fat}`} unit="g" />
          </div>

          <div className="scanner-serving">
            <label>
              <span>Serving</span>
              <div className="scanner-serving-input">
                <button type="button" onClick={() => setGrams((g) => Math.max(1, g - 10))} aria-label="Decrease grams">-</button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={grams}
                  min={1}
                  onChange={(event) => setGrams(Math.max(1, Number.parseFloat(event.target.value) || 0))}
                />
                <span className="scanner-unit">g</span>
                <button type="button" onClick={() => setGrams((g) => g + 10)} aria-label="Increase grams">+</button>
              </div>
            </label>
            <p className="scanner-per100">
              Per 100g: {round(product.calories)} kcal · P {round(product.protein)}g · C {round(product.carbs)}g · F {round(product.fat)}g
            </p>
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
            <button type="button" className="secondary-button" onClick={rescan}>
              <RefreshCw size={16} /> Scan again
            </button>
            <button type="button" className="primary-button" onClick={() => void log()} disabled={saving}>
              <Camera size={16} /> {saving ? 'Adding…' : `Add to ${MEAL_SLOTS.find((m) => m.key === mealSlot)?.label}`}
            </button>
          </div>
        </div>
      )}

      {stage === 'error' && (
        <div className="scanner-result">
          <header className="scanner-result-head">
            <h3>Scanner</h3>
            <button type="button" className="scanner-close" onClick={onClose} aria-label="Close">
              <X size={22} />
            </button>
          </header>
          <p className="form-message">{status}</p>
          <div className="scanner-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Close</button>
            <button type="button" className="primary-button" onClick={rescan}>
              <RefreshCw size={16} /> Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Macro({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="scanner-macro">
      <strong>{value}</strong>
      <em>{unit}</em>
      <span>{label}</span>
    </div>
  );
}
