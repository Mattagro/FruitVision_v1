import { BoundingBox, CaptureProvenance } from '../types/citrus';
import { yoloDetector } from './vision/yoloDetector';
import { APP_VERSION } from '../version';

/**
 * Construye la trazabilidad de una captura al guardarla.
 *
 * - El método (según las cajas automáticas: yolo, color o mixed; 'manual' si solo hay
 *   cajas dibujadas a mano) y los conteos por origen salen de las cajas realmente
 *   guardadas (`source`), por lo que reflejan las ediciones del usuario.
 * - El modelo y los umbrales YOLO son los activos AL GUARDAR. Si el usuario
 *   detectó con un modelo y cambió de modelo antes de guardar, no coincidirán.
 *   Para una validación, conviene no cambiar de modelo entre detectar y guardar.
 * - Si la captura ya tenía trazabilidad con el mismo método, se conservan la
 *   versión, el modelo y los umbrales originales (reabrir y re-guardar no los pisa).
 */
export function buildProvenance(
  boxes: BoundingBox[],
  previous?: CaptureProvenance
): CaptureProvenance {
  const boxesBySource = { color: 0, yolo: 0, manual: 0 };
  for (const b of boxes) boxesBySource[b.source] += 1;

  const auto = boxesBySource.color + boxesBySource.yolo;
  const method: CaptureProvenance['method'] =
    boxes.length === 0 ? 'none'
    : auto === 0 ? 'manual'
    : boxesBySource.yolo > 0 && boxesBySource.color > 0 ? 'mixed'
    : boxesBySource.yolo > 0 ? 'yolo'
    : 'color';

  const base: CaptureProvenance = {
    appVersion: APP_VERSION,
    savedAt: Date.now(),
    method,
    boxesBySource,
  };

  if (boxesBySource.yolo > 0) {
    const cfg = yoloDetector.getConfig();
    base.model = {
      name: cfg.activeModelName,
      fingerprint: cfg.modelFingerprint,
      sizeBytes: cfg.modelSizeBytes,
      inputSize: cfg.inputSize,
      classes: cfg.classes,
      modelType: cfg.modelType,
    };
    base.yoloParams = { conf: cfg.confThreshold, iou: cfg.iouThreshold, tileGrid: cfg.tileGrid };
  }

  // Reabrir y re-guardar con el mismo método: conservar versión/modelo/umbrales originales
  // (siempre se refrescan savedAt y los conteos por origen).
  if (previous && previous.method === method) {
    return {
      ...base,
      appVersion: previous.appVersion,
      model: previous.model ?? base.model,
      yoloParams: previous.yoloParams ?? base.yoloParams,
    };
  }
  return base;
}
