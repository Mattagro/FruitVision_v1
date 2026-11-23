import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Alto real visible. Samsung Internet (y otros) pueden reportar 100dvh mayor que el área
// visible: la barra inferior del navegador tapa la última franja de la app. Se mide con
// visualViewport (o innerHeight) y se expone como --app-h para el contenedor raíz.
const setAppHeight = () => {
  const h = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty('--app-h', `${Math.round(h)}px`);
};
setAppHeight();
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', setAppHeight);
window.visualViewport?.addEventListener('resize', setAppHeight);

// Register Service Worker for Offline PWA support with auto-update
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swUrl).then((reg) => {
      // Check for updates immediately
      reg.update();

      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });
    }).catch((err) => {
      console.warn('Service worker registration failed:', err);
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
