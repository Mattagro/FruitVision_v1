import { CaptureRecord } from '../types/citrus';

/**
 * Las capturas demo (muestras de ejemplo) se guardan junto a las reales para poder
 * practicar, pero NO deben mezclarse con datos de validación o de rendimiento.
 * Se reconocen por la marca isDemo o, en capturas guardadas antes de existir esa
 * marca, por el prefijo 'demo_' de su id.
 */
export function isDemoCapture(c: Pick<CaptureRecord, 'id' | 'isDemo'>): boolean {
  return c.isDemo === true || c.id.startsWith('demo_');
}

/** Capturas reales: todas menos las demo. */
export function realCaptures(captures: CaptureRecord[]): CaptureRecord[] {
  return captures.filter(c => !isDemoCapture(c));
}
