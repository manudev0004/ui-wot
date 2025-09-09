import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Helper to dynamically load external script and wait for it to be ready
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      // If script already present and loaded, resolve
      if ((existing as any).loaded) return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load script')));
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.onload = () => {
      (script as any).loaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function bootstrap() {
  try {
    // Try to load Node-WoT browser bundle from CDN so `WoT` global becomes available
    await loadScript('https://cdn.jsdelivr.net/npm/@node-wot/browser-bundle@latest/dist/wot-bundle.min.js');
  } catch (err) {
    // If loading fails, continue — wotService will fall back to mock mode
    console.warn('Could not load node-wot browser bundle, continuing with mock WoT:', err);
  }

  // Register UI web components (ESM bundle)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    await import('../../components/dist/ui-wot-components/ui-wot-components.esm.js');
  } catch (err) {
    console.warn('Failed to import UI components bundle:', err);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap();
