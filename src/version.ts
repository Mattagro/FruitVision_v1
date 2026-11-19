// Versión de la app: se inyecta desde package.json en el build (vite.config.ts).
// Mantener alineada con CACHE_NAME en public/sw.js al publicar una nueva versión.
declare const __APP_VERSION__: string | undefined;

export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ ? __APP_VERSION__ : 'dev';
