interface DetectedBarcode {
  boundingBox: DOMRectReadOnly;
  cornerPoints: Array<{ x: number; y: number }>;
  format: string;
  rawValue: string;
}

interface BarcodeDetectorOptions {
  formats?: string[];
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  static getSupportedFormats(): Promise<string[]>;
  detect(image: CanvasImageSource): Promise<DetectedBarcode[]>;
}

