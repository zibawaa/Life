import { Camera, Keyboard, ScanBarcode, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import type { ProductLookupResult } from '../types';
import { lookupOpenFoodFactsProduct } from '../data/openFoodFacts';
import { Field } from './Primitives';

const supportsNativeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
const supportsCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

const loadZxing = () =>
  Promise.all([import('@zxing/library'), import('@zxing/browser')]).then(([lib, browser]) => ({
    BarcodeFormat: lib.BarcodeFormat,
    DecodeHintType: lib.DecodeHintType,
    BrowserMultiFormatReader: browser.BrowserMultiFormatReader
  }));

export function BarcodeScanner({ onProduct }: { onProduct: (product: ProductLookupResult) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [status, setStatus] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);

  const stopCamera = () => {
    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const lookup = async (barcode: string) => {
    const cleaned = barcode.trim();
    if (!cleaned) return;
    setLookupBusy(true);
    setStatus('Reading product details...');
    try {
      const product = await lookupOpenFoodFactsProduct(cleaned);
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
    if (!supportsCamera) {
      setStatus('This browser cannot access the camera. Use manual barcode entry.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        await video.play().catch(() => undefined);
      }
      setScanning(true);
      setStatus(supportsNativeDetector ? 'Point the camera at a barcode.' : 'Scanning... hold the barcode steady in the frame.');
    } catch (error) {
      setStatus(error instanceof Error && error.name === 'NotAllowedError'
        ? 'Camera permission was blocked. Use manual barcode entry.'
        : 'Camera unavailable. Use manual barcode entry.');
    }
  };

  // Native BarcodeDetector loop (Chrome/Edge/Android)
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
  }, [scanning]);

  // ZXing fallback for Safari/iOS (no BarcodeDetector). Lazy-loaded.
  useEffect(() => {
    if (!scanning || supportsNativeDetector) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    let cancelled = false;
    loadZxing()
      .then(({ BarcodeFormat, DecodeHintType, BrowserMultiFormatReader }) => {
        if (cancelled) return;
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 200 });

        return reader.decodeFromStream(stream, video, (result, _err, controls) => {
          if (cancelled) {
            controls.stop();
            return;
          }
          zxingControlsRef.current = controls;
          if (result) {
            controls.stop();
            stopCamera();
            lookup(result.getText());
          }
        });
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('Could not start the scanner. Use manual barcode entry.');
        stopCamera();
      });

    return () => {
      cancelled = true;
      zxingControlsRef.current?.stop();
      zxingControlsRef.current = null;
    };
  }, [scanning]);

  useEffect(() => stopCamera, []);

  return (
    <div className="barcode-box">
      <div className={`camera-stage ${scanning ? 'active' : ''}`}>
        {scanning ? (
          <video ref={videoRef} className="scanner-video" muted playsInline autoPlay />
        ) : (
          <div className="camera-placeholder">
            <ScanBarcode size={36} />
            <strong>Camera scanner</strong>
            <span>Use your phone camera to scan the product barcode.</span>
          </div>
        )}
      </div>

      <div className="barcode-actions">
        <button type="button" className="primary-button" onClick={scanning ? stopCamera : startCamera}>
          {scanning ? <X size={16} /> : <Camera size={16} />}
          {scanning ? 'Stop camera' : 'Open camera'}
        </button>
      </div>

      <div className="manual-barcode">
        <Field label="Barcode number">
          <input value={manualBarcode} onChange={(event) => setManualBarcode(event.target.value)} inputMode="numeric" placeholder="Enter barcode manually" />
        </Field>
        <button type="button" className="secondary-button" onClick={() => lookup(manualBarcode)} disabled={lookupBusy || !manualBarcode.trim()}>
          <Keyboard size={16} />
          Use code
        </button>
      </div>

      {status && <p className="form-message">{status}</p>}
    </div>
  );
}
