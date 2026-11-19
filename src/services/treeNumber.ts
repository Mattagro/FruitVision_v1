import { CaptureMetadata, CaptureRecord } from '../types/citrus';
import { realCaptures } from './demo';

/**
 * Siguiente número de árbol: incrementa el número final y conserva prefijo y ceros
 * ("12" -> "13", "A9" -> "A10", "007" -> "008"). Devuelve null si el texto no
 * termina en número (no se puede avanzar solo).
 */
export function nextTreeLabel(label: string): string | null {
  const m = /^(.*?)(\d+)$/.exec(label.trim());
  if (!m) return null;
  const next = String(parseInt(m[2], 10) + 1).padStart(m[2].length, '0');
  return m[1] + next;
}

const sameSlot = (a: CaptureMetadata, b: CaptureMetadata) =>
  a.predio === b.predio &&
  a.cuartel === b.cuartel &&
  a.hilera === b.hilera &&
  a.arbol === b.arbol &&
  a.cara === b.cara;

/**
 * Evita guardar dos capturas del mismo árbol por descuido: si ya existe una captura
 * real con el mismo predio, cuartel, hilera, árbol y cara, avanza al siguiente
 * número libre. Incluir la cara permite fotografiar varias caras (N, S, E, O) de un
 * mismo árbol sin que el número cambie. Las muestras demo no cuentan.
 */
export function resolveTreeConflict(
  meta: CaptureMetadata,
  captures: CaptureRecord[]
): { meta: CaptureMetadata; advanced: boolean } {
  const saved = realCaptures(captures).map(c => c.metadata);
  let current = meta;
  let advanced = false;
  for (let i = 0; i < 5000; i++) {
    if (!saved.some(m => sameSlot(m, current))) break;
    const next = nextTreeLabel(current.arbol);
    if (next === null) return { meta, advanced: false }; // no numérico: no se puede avanzar
    current = { ...current, arbol: next };
    advanced = true;
  }
  return { meta: current, advanced };
}
