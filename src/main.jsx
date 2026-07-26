import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { startServiceWorkerUpdateChecks } from './pwa';

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (registration) startServiceWorkerUpdateChecks(swUrl, registration);
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
