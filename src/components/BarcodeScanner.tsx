import { Camera, Keyboard, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ProductLookupResult } from '../types';
import { lookupOpenFoodFactsProduct } from '../data/openFoodFacts';
import { Field } from './Primitives';

export function BarcodeScanner({ onProduct }: { onProduct: (product: ProductLookupResult) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [status, setStatus] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const supportsNativeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const lookup = async (barcode: string) => {
    setLookupBusy(true);
    setStatus('Looking up product...');
    try {
      const product = await lookupOpenFoodFactsProduct(barcode);
      onProduct(product);
      setStatus(`Found ${product.name}. Review and save it with your meal.`);
      setManualBarcode(product.barcode);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Lookup failed. Add the food manually.');
    } finally {
      setLookupBusy(false);
    }
  };

  const startCamera = async () => {
    if (!supportsNativeDetector) {
      setStatus('Camera barcode detection is not supported in this browser. Use manual barcode entry.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      setStatus('Point the camera at a barcode.');
    } catch {
      setStatus('Camera permission was blocked or unavailable. Use manual barcode entry.');
    }
  };

  useEffect(() => {
    if (!scanning || !videoRef.current || !supportsNativeDetector) return;

    const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    let cancelled = false;

    const loop = async () => {
      if (cancelled || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        const rawValue = codes[0]?.rawValue;
        if (rawValue) {
          stopCamera();
          await lookup(rawValue);
          return;
        }
      } catch {
        setStatus('Scanning failed. Use manual barcode entry.');
        stopCamera();
        return;
      }

      window.setTimeout(loop, 450);
    };

    loop();

    return () => {
      cancelled = true;
    };
  }, [scanning, supportsNativeDetector]);

  useEffect(() => stopCamera, []);

  return (
    <div className="barcode-box">
      <div className="barcode-actions">
        <button type="button" className="secondary-button" onClick={scanning ? stopCamera : startCamera}>
          {scanning ? <X size={16} /> : <Camera size={16} />}
          {scanning ? 'Stop camera' : 'Scan barcode'}
        </button>
      </div>

      {scanning && <video ref={videoRef} className="scanner-video" muted playsInline />}

      <div className="manual-barcode">
        <Field label="Barcode number">
          <input value={manualBarcode} onChange={(event) => setManualBarcode(event.target.value)} inputMode="numeric" placeholder="Enter barcode manually" />
        </Field>
        <button type="button" className="secondary-button" onClick={() => lookup(manualBarcode)} disabled={lookupBusy || !manualBarcode.trim()}>
          {manualBarcode.trim() ? <Search size={16} /> : <Keyboard size={16} />}
          Lookup
        </button>
      </div>

      {status && <p className="form-message">{status}</p>}
    </div>
  );
}

