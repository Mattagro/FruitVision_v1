/**
 * Types and interfaces for Citrus Counting, Computer Vision and Agronomic Yield
 */

export type CitrusVariety = 
  | 'Naranja Valencia'
  | 'Naranja Navel'
  | 'Limón Eureka'
  | 'Limón Fino'
  | 'Mandarina W. Murcott'
  | 'Mandarina Clementina'
  | 'Pomelo Star Ruby'
  | 'Cítrico General';

export type TreeFace = 'N' | 'S' | 'E' | 'O' | 'Total';

export interface BoundingBox {
  id: string;
  x: number;       // Normalized [0, 1] relative to image width
  y: number;       // Normalized [0, 1] relative to image height
  width: number;   // Normalized [0, 1]
  height: number;  // Normalized [0, 1]
  classId: number;
  className: string;
  confidence: number;
  source: 'color' | 'yolo' | 'manual';
  circularity?: number;
  colorHex?: string;
}

export interface CitrusClassDef {
  id: number;
  name: string;
  color: string;
  defaultHsv: {
    hMin: number;
    hMax: number;
    sMin: number;
    sMax: number;
    vMin: number;
    vMax: number;
  };
}

export interface CaptureMetadata {
  id: string;
  timestamp: number;
  predio: string;
  cuartel: string;
  hilera: string;
  arbol: string;
  cara: TreeFace;
  variedad: CitrusVariety;
  etapa: 'Verde' | 'Envero' | 'Maduro' | 'Cosecha';
  gps?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  foliageCalibration: number; // Factor de corrección por visibilidad (ej: 1.4 = 40% oculta)
  fruitWeightGram: number;    // Peso medio proyectado del fruto en gramos
  treeDensityHa: number;      // Árboles por hectárea
  notes?: string;
}

export interface CaptureRecord {
  id: string;
  imageDataUrl: string;
  width: number;
  height: number;
  boxes: BoundingBox[];
  metadata: CaptureMetadata;
  count: number;
}

export interface HsvFilterParams {
  hMin: number;              // 0 - 360
  hMax: number;              // 0 - 360
  sMin: number;              // 0 - 100 (%)
  sMax: number;              // 0 - 100 (%)
  vMin: number;              // 0 - 100 (%)
  vMax: number;              // 0 - 100 (%)
  minRadius: number;         // px en resolución de procesamiento (ej: 6)
  maxRadius: number;         // px en resolución de procesamiento (ej: 75)
  minCircularity: number;    // 0.0 - 1.0 (ej: 0.55 descarta ramas u hojas)
  adaptiveLuminance: boolean;// Normalización local de contraste
  morphologyIterations: number; // 1 o 2 iteraciones de apertura/cierre
}

export interface YoloModelConfig {
  inputSize: number;
  confThreshold: number;
  iouThreshold: number;
  tileGrid: 1 | 2;           // 1x1 or 2x2 tiling
  classes: string[];
  modelType: 'yolov8' | 'yolov11' | 'demo';
  isLoaded: boolean;
  isWarmedUp: boolean;
  loadError?: string;
  activeModelName: string;
}

export interface YieldBlockStats {
  predio: string;
  cuartel: string;
  variedad: string;
  totalCaptures: number;
  uniqueTrees: number;
  totalVisibleFruits: number;
  avgFruitsPerTree: number;
  stdDev: number;
  cvPercent: number;
  recommendedSampleSize: number; // n para margen de error +-10% y 95% confianza
  isSampleSufficient: boolean;
  estimatedKgPerTree: number;
  estimatedTonsPerHa: number;
  density: number;
  foliageFactor: number;
  fruitWeightAvg: number;
}
