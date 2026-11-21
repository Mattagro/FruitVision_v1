/**
 * Geometría del preprocesado de YOLO.
 *
 * - Estirado (heredado): el cuadro se comprime a inputSize×inputSize. En video 16:9 o 9:16
 *   los frutos se deforman, algo que el modelo no vio al entrenar.
 * - Letterbox (estándar de Ultralytics): se escala manteniendo la proporción y se rellena
 *   con gris 114 hasta cuadrar. Los frutos conservan su forma.
 */
export const LETTERBOX_FILL = 'rgb(114,114,114)';

export interface TileGeometry {
  padX: number;   // margen izquierdo dentro del tensor (px)
  padY: number;   // margen superior (px)
  drawW: number;  // ancho ocupado por la imagen dentro del tensor (px)
  drawH: number;  // alto ocupado por la imagen (px)
}

export function tileGeometry(sw: number, sh: number, inputSize: number, letterbox: boolean): TileGeometry {
  if (!letterbox || sw <= 0 || sh <= 0) {
    return { padX: 0, padY: 0, drawW: inputSize, drawH: inputSize };
  }
  const scale = Math.min(inputSize / sw, inputSize / sh);
  const drawW = sw * scale;
  const drawH = sh * scale;
  return { padX: (inputSize - drawW) / 2, padY: (inputSize - drawH) / 2, drawW, drawH };
}

/**
 * Caja del modelo (centro y tamaño en píxeles del tensor) → coordenadas normalizadas 0..1
 * dentro del tile. Devuelve null si, recortada, la caja queda vacía (p. ej. cae en el relleno).
 */
export function boxToTileNorm(
  cx: number, cy: number, w: number, h: number, g: TileGeometry
): { left: number; top: number; right: number; bottom: number } | null {
  const left = Math.max(0, (cx - w / 2 - g.padX) / g.drawW);
  const top = Math.max(0, (cy - h / 2 - g.padY) / g.drawH);
  const right = Math.min(1, (cx + w / 2 - g.padX) / g.drawW);
  const bottom = Math.min(1, (cy + h / 2 - g.padY) / g.drawH);
  return right > left && bottom > top ? { left, top, right, bottom } : null;
}
