import * as tf from '@tensorflow/tfjs';
import JSZip from 'jszip';
import { BoundingBox, YoloModelConfig } from '../../types/citrus';

export interface YoloInferenceResult {
  boxes: BoundingBox[];
  processTimeMs: number;
  tilesProcessed: number;
}

export class YoloDetectorService {
  private model: tf.GraphModel | null = null;
  private config: YoloModelConfig = {
    inputSize: 640,
    confThreshold: 0.35,
    iouThreshold: 0.45,
    tileGrid: 1,
    classes: ['citrus'],
    modelType: 'demo',
    isLoaded: false,
    isWarmedUp: false,
    activeModelName: 'Detector Cítricos Demo (Precalibrado)',
  };

  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true })!;
    this.initBackend();
  }

  private async initBackend() {
    try {
      await tf.setBackend('webgl');
      await tf.ready();
    } catch {
      try {
        await tf.setBackend('cpu');
        await tf.ready();
      } catch (e) {
        console.warn('Failed to set TF backend:', e);
      }
    }
  }

  public getConfig(): YoloModelConfig {
    return { ...this.config };
  }

  public setThresholds(conf: number, iou: number, tileGrid: 1 | 2) {
    this.config.confThreshold = conf;
    this.config.iouThreshold = iou;
    this.config.tileGrid = tileGrid;
  }

  /**
   * Load model from a ZIP file containing model.json and .bin shards
   */
  public async loadZipFile(zipFile: File | Blob): Promise<boolean> {
    try {
      const zip = await JSZip.loadAsync(zipFile);
      const extractedFiles: File[] = [];

      for (const [relativePath, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;
        const cleanName = relativePath.split('/').pop() || relativePath;
        const lower = cleanName.toLowerCase();
        if (lower.endsWith('.json') || lower.endsWith('.bin')) {
          const blob = await entry.async('blob');
          const normalizedName = lower === 'labels.json' ? 'labels.json'
            : lower.endsWith('.json') ? 'model.json' : cleanName;
          extractedFiles.push(new File([blob], normalizedName));
        }
      }

      if (extractedFiles.length === 0) {
        throw new Error('El archivo ZIP no contiene ningún archivo .json o .bin.');
      }

      return await this.loadUserFiles(extractedFiles);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.config.loadError = msg;
      this.config.isLoaded = false;
      throw new Error(`Error al leer archivo ZIP: ${msg}`);
    }
  }

  /**
   * Load user-provided TF.js model files (.json + .bin shards)
   */
  public async loadUserFiles(files: FileList | File[]): Promise<boolean> {
    const fileList = Array.from(files);
    
    // Check if a single ZIP file was provided
    const zipFile = fileList.find(f => f.name.toLowerCase().endsWith('.zip'));
    if (zipFile && fileList.length === 1) {
      return await this.loadZipFile(zipFile);
    }

    const labelsFile = fileList.find(f => f.name.toLowerCase() === 'labels.json');
    const jsonFile = fileList.find(f => f.name.toLowerCase().endsWith('.json') && f !== labelsFile);
    if (!jsonFile) {
      throw new Error('No se encontró el archivo model.json. Asegúrate de incluir el archivo .json junto a los archivos .bin.');
    }

    // Inspect json text to verify all required weight shards are present
    let expectedShards: string[] = [];
    try {
      const jsonText = await jsonFile.text();
      const parsed = JSON.parse(jsonText);
      if (parsed.weightsManifest && Array.isArray(parsed.weightsManifest)) {
        for (const manifest of parsed.weightsManifest) {
          if (Array.isArray(manifest.paths)) {
            expectedShards.push(...manifest.paths);
          }
        }
      }
    } catch (e) {
      console.warn('No se pudo inspeccionar weightsManifest:', e);
    }

    // Normalize files: ensure JSON is named 'model.json' for TF.js browserFiles loader
    const normalizedFiles: File[] = [];
    normalizedFiles.push(new File([jsonFile], 'model.json', { type: 'application/json' }));

    const binFiles = fileList.filter(f => f !== jsonFile && f.name.toLowerCase().endsWith('.bin'));

    // Check if any expected shard is missing
    if (expectedShards.length > 0) {
      const missingShards = expectedShards.filter(expected => 
        !binFiles.some(f => f.name === expected || f.name.endsWith(expected))
      );

      if (missingShards.length > 0) {
        const foundCount = binFiles.length;
        throw new Error(
          `Faltan fragmentos .bin requeridos por el modelo: ${missingShards.join(', ')}. Tu modelo necesita ${expectedShards.length} fragmentos binarios (se subieron ${foundCount}).`
        );
      }

      // Add bin files with their matching expected shard names
      for (const shardName of expectedShards) {
        const matched = binFiles.find(f => f.name === shardName || f.name.endsWith(shardName));
        if (matched) {
          normalizedFiles.push(new File([matched], shardName));
        }
      }
    } else {
      // If no manifest paths found, include all bin files as-is
      normalizedFiles.push(...binFiles);
    }

    if (normalizedFiles.length <= 1) {
      throw new Error('Faltan los archivos de pesos binarios (.bin). Se requiere model.json y al menos un archivo .bin.');
    }

    try {
      if (this.model) {
        this.model.dispose();
        this.model = null;
      }

      this.config.isLoaded = false;
      this.config.loadError = undefined;

      const loadedModel = await tf.loadGraphModel(tf.io.browserFiles(normalizedFiles));
      // Validar que sea un detector YOLO: entrada [1,H,W,3], salida [1,4+nc,N]
      const inShape = loadedModel.inputs?.[0]?.shape;
      const outShape = loadedModel.outputs?.[0]?.shape;
      if (outShape && outShape.length !== 3) {
        loadedModel.dispose();
        throw new Error(
          `El modelo no es un detector YOLO (salida ${JSON.stringify(outShape)}). ` +
          `Una red de clasificación (yolov8n-cls) no es compatible: entrena con dataset de detección (data.yaml) y exporta con imgsz=640.`
        );
      }
      if (inShape && inShape[1] && inShape[1] > 0) this.config.inputSize = inShape[1];

      let labels: string[] | null = null;
      if (labelsFile) {
        try {
          const arr = JSON.parse(await labelsFile.text());
          if (Array.isArray(arr)) labels = arr.map(String);
        } catch { /* labels.json inválido: se ignora */ }
      }
      if (outShape) {
        const nc = Math.min(outShape[1]!, outShape[2]!) - 4;
        this.config.classes = Array.from({ length: nc }, (_, i) => labels?.[i] ?? `clase_${i}`);
      } else if (labels) {
        this.config.classes = labels;
      }

      this.model = loadedModel;
      this.config.isLoaded = true;
      this.config.modelType = 'yolov8';
      this.config.activeModelName = jsonFile.name.replace('.json', '');

      // Warmup tensor
      await this.warmup();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.config.loadError = msg;
      this.config.isLoaded = false;
      throw new Error(`Error al cargar modelo TF.js: ${msg}`);
    }
  }

  /**
   * Warmup model with dummy zeros
   */
  private async warmup() {
    if (!this.model) return;
    try {
      tf.tidy(() => {
        const dummy = tf.zeros([1, this.config.inputSize, this.config.inputSize, 3]);
        this.model!.predict(dummy);
      });
      this.config.isWarmedUp = true;
    } catch (e) {
      console.warn('Warmup notice:', e);
    }
  }

  /**
   * Run inference on an image source (Image, Video, or Canvas)
   */
  public async detect(
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number
  ): Promise<YoloInferenceResult> {
    const startTime = performance.now();

    // If custom model is loaded, run real TF.js model graph inference
    if (this.model && this.config.isLoaded) {
      return this.runTfInference(source, sourceWidth, sourceHeight, startTime);
    }

    // Otherwise run fast multi-scale citrus detector (Demo calibrated model)
    return this.runCalibratedDemoInference(source, sourceWidth, sourceHeight, startTime);
  }

  /**
   * Run full TF.js GraphModel inference with optional 2x2 tiling
   */
  private async runTfInference(
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
    startTime: number
  ): Promise<YoloInferenceResult> {
    const { inputSize, confThreshold, iouThreshold, tileGrid } = this.config;
    const allBoxes: Array<{
      box: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
      score: number;
      classId: number;
    }> = [];

    // Define tiles
    const tiles: Array<{ sx: number; sy: number; sw: number; sh: number }> = [];
    if (tileGrid === 2) {
      const halfW = sourceWidth / 2;
      const halfH = sourceHeight / 2;
      const overlap = 0.15; // 15% overlap for border fruits
      const ow = halfW * overlap;
      const oh = halfH * overlap;

      tiles.push(
        { sx: 0, sy: 0, sw: halfW + ow, sh: halfH + oh },
        { sx: Math.max(0, halfW - ow), sy: 0, sw: halfW + ow, sh: halfH + oh },
        { sx: 0, sy: Math.max(0, halfH - oh), sw: halfW + ow, sh: halfH + oh },
        { sx: Math.max(0, halfW - ow), sy: Math.max(0, halfH - oh), sw: halfW + ow, sh: halfH + oh }
      );
    } else {
      tiles.push({ sx: 0, sy: 0, sw: sourceWidth, sh: sourceHeight });
    }

    if (this.offscreenCanvas.width !== inputSize || this.offscreenCanvas.height !== inputSize) {
      this.offscreenCanvas.width = inputSize;
      this.offscreenCanvas.height = inputSize;
    }

    for (const tile of tiles) {
      this.offscreenCtx.clearRect(0, 0, inputSize, inputSize);
      this.offscreenCtx.drawImage(
        source,
        tile.sx, tile.sy, tile.sw, tile.sh,
        0, 0, inputSize, inputSize
      );

      // Extract prediction within tf.tidy
      const predictions = tf.tidy(() => {
        const tensor = tf.browser.fromPixels(this.offscreenCanvas)
          .toFloat()
          .div(255.0)
          .expandDims(0); // [1, 640, 640, 3]

        const rawOutput = this.model!.predict(tensor) as tf.Tensor;
        // Output can be [1, 84, 8400] for YOLOv8 (where 84 = 4 bbox + 80 classes, or 4 + 1 for citrus)
        let reshaped = rawOutput;
        if (rawOutput.shape.length === 3 && rawOutput.shape[1]! < rawOutput.shape[2]!) {
          reshaped = rawOutput.transpose([0, 2, 1]); // -> [1, 8400, 84]
        }
        return reshaped.squeeze([0]).arraySync() as number[][];
      });

      // Parse predictions [8400, 4 + classes]
      for (const row of predictions) {
        // [cx, cy, w, h, class0_score, ...]
        const cx = row[0];
        const cy = row[1];
        const w = row[2];
        const h = row[3];

        let maxScore = 0;
        let bestClass = 0;
        for (let c = 4; c < row.length; c++) {
          if (row[c] > maxScore) {
            maxScore = row[c];
            bestClass = c - 4;
          }
        }

        if (maxScore >= confThreshold) {
          // Normalize to tile coordinates
          const left = Math.max(0, (cx - w / 2) / inputSize);
          const top = Math.max(0, (cy - h / 2) / inputSize);
          const right = Math.min(1, (cx + w / 2) / inputSize);
          const bottom = Math.min(1, (cy + h / 2) / inputSize);

          // Project back to whole image normalized coordinates
          const globalX = (tile.sx + left * tile.sw) / sourceWidth;
          const globalY = (tile.sy + top * tile.sh) / sourceHeight;
          const globalW = (right - left) * (tile.sw / sourceWidth);
          const globalH = (bottom - top) * (tile.sh / sourceHeight);

          allBoxes.push({
            box: [globalY, globalX, globalY + globalH, globalX + globalW],
            score: maxScore,
            classId: bestClass,
          });
        }
      }
    }

    // Run NMS across all collected boxes
    const finalBoxes: BoundingBox[] = [];
    if (allBoxes.length > 0) {
      const boxesTensor = tf.tensor2d(allBoxes.map(b => b.box));
      const scoresTensor = tf.tensor1d(allBoxes.map(b => b.score));

      const selectedIndices = await tf.image.nonMaxSuppressionAsync(
        boxesTensor,
        scoresTensor,
        300,
        iouThreshold,
        confThreshold
      );

      const indices = await selectedIndices.data();
      boxesTensor.dispose();
      scoresTensor.dispose();
      selectedIndices.dispose();

      for (const idx of Array.from(indices)) {
        const item = allBoxes[idx];
        const [ymin, xmin, ymax, xmax] = item.box;
        finalBoxes.push({
          id: `yolo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          x: Math.max(0, xmin),
          y: Math.max(0, ymin),
          width: Math.min(1 - xmin, ymax - ymin > 0 ? xmax - xmin : 0.05),
          height: Math.min(1 - ymin, ymax - ymin > 0 ? ymax - ymin : 0.05),
          classId: item.classId,
          className: this.config.classes[item.classId] || 'Cítrico',
          confidence: Number(item.score.toFixed(2)),
          source: 'yolo',
          colorHex: '#10b981', // Emerald for YOLO
        });
      }
    }

    const processTimeMs = Math.round(performance.now() - startTime);
    return {
      boxes: finalBoxes,
      processTimeMs,
      tilesProcessed: tiles.length,
    };
  }

  /**
   * Calibrated heuristic citrus detector for instant out-of-the-box demo without uploading weights
   */
  private async runCalibratedDemoInference(
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
    startTime: number
  ): Promise<YoloInferenceResult> {
    const procW = 480;
    const procH = Math.round((sourceHeight / sourceWidth) * 480);
    this.offscreenCanvas.width = procW;
    this.offscreenCanvas.height = procH;
    this.offscreenCtx.drawImage(source, 0, 0, procW, procH);

    const imgData = this.offscreenCtx.getImageData(0, 0, procW, procH);
    const data = imgData.data;
    const totalPixels = procW * procH;

    // Scan for both ripe orange and lemon citrus clusters using high-recall multi-band energy
    const detectedBlobs: Array<{ x: number; y: number; r: number; conf: number }> = [];
    const step = 4;

    for (let y = 16; y < procH - 16; y += step) {
      for (let x = 16; x < procW - 16; x += step) {
        const idx = (y * procW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Citrus color signature (orange: R > 150, G: 80..190, B < 90; lemon: R > 160, G > 160, B < 90)
        const isOrange = r > 150 && g > 75 && g < 185 && b < 100 && (r - g) > 20;
        const isLemon = r > 160 && g > 150 && b < 110 && Math.abs(r - g) < 40 && (r - b) > 60;

        if (isOrange || isLemon) {
          // Local contrast with surrounding foliage (foliage is green: G > R and G > B)
          let foliageNeighbors = 0;
          const checkOffsets = [-12, 12];
          for (const dy of checkOffsets) {
            for (const dx of checkOffsets) {
              const nIdx = ((y + dy) * procW + (x + dx)) * 4;
              if (nIdx >= 0 && nIdx < totalPixels * 4) {
                const nr = data[nIdx];
                const ng = data[nIdx + 1];
                const nb = data[nIdx + 2];
                if (ng > nr && ng > nb) foliageNeighbors++;
              }
            }
          }

          // Fruit surrounded or partially embedded in canopy
          const confidence = Math.min(0.96, 0.65 + (foliageNeighbors / 4) * 0.3);
          if (confidence >= this.config.confThreshold) {
            // Find radius by radial ray cast
            let radius = 10;
            for (let rTest = 6; rTest < 45; rTest += 3) {
              const rayIdx = ((y) * procW + (x + rTest)) * 4;
              if (rayIdx < totalPixels * 4) {
                const testR = data[rayIdx];
                const testG = data[rayIdx + 1];
                const testB = data[rayIdx + 2];
                const stillCitrus = isOrange ? (testR > 130 && testB < 110) : (testR > 130 && testG > 120);
                if (stillCitrus) radius = rTest;
                else break;
              }
            }

            detectedBlobs.push({ x, y, r: radius, conf: confidence });
          }
        }
      }
    }

    // Cluster merge / NMS in 2D space
    const merged: BoundingBox[] = [];
    const used = new Uint8Array(detectedBlobs.length);

    for (let i = 0; i < detectedBlobs.length; i++) {
      if (used[i]) continue;
      const base = detectedBlobs[i];
      let sumX = base.x;
      let sumY = base.y;
      let sumR = base.r;
      let maxConf = base.conf;
      let count = 1;
      used[i] = 1;

      for (let j = i + 1; j < detectedBlobs.length; j++) {
        if (used[j]) continue;
        const candidate = detectedBlobs[j];
        const dist = Math.hypot(candidate.x - base.x, candidate.y - base.y);
        if (dist < base.r * 1.5) {
          sumX += candidate.x;
          sumY += candidate.y;
          sumR = Math.max(sumR, candidate.r);
          maxConf = Math.max(maxConf, candidate.conf);
          count++;
          used[j] = 1;
        }
      }

      const avgX = sumX / count;
      const avgY = sumY / count;
      const fruitRad = Math.max(8, sumR);

      // Create normalized bounding box
      const normX = Math.max(0, (avgX - fruitRad) / procW);
      const normY = Math.max(0, (avgY - fruitRad) / procH);
      const normW = Math.min(1 - normX, (fruitRad * 2) / procW);
      const normH = Math.min(1 - normY, (fruitRad * 2) / procH);

      merged.push({
        id: `demo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        x: Number(normX.toFixed(4)),
        y: Number(normY.toFixed(4)),
        width: Number(normW.toFixed(4)),
        height: Number(normH.toFixed(4)),
        classId: 0,
        className: 'Cítrico (Demo)',
        confidence: Number(maxConf.toFixed(2)),
        source: 'yolo',
        colorHex: '#10b981',
      });
    }

    const processTimeMs = Math.round(performance.now() - startTime);
    return {
      boxes: merged,
      processTimeMs,
      tilesProcessed: 1,
    };
  }
}

export const yoloDetector = new YoloDetectorService();
