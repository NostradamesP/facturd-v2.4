import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'

const APP_VERSION = '2026-06-18-3';
const APP_VERSION_KEY = 'facturd_app_version';

async function resetLegacyOfflineState() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ('caches' in window) {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((key) => caches.delete(key)));
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    (async () => {
      try {
        const currentVersion = localStorage.getItem(APP_VERSION_KEY);
        if (currentVersion !== APP_VERSION) {
          await resetLegacyOfflineState();
          localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
        }

        const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
          updateViaCache: 'none',
        });
        await registration.update();
      } catch (error) {
        console.warn('Service worker registration failed:', error);
      }
    })();
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
