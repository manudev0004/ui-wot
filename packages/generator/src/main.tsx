import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
// Define all UI-WoT custom elements
import { defineCustomElement as UiButton } from '@thingweb/ui-wot-components/components/ui-button';
import { defineCustomElement as UiToggle } from '@thingweb/ui-wot-components/components/ui-toggle';
import { defineCustomElement as UiSlider } from '@thingweb/ui-wot-components/components/ui-slider';
import { defineCustomElement as UiText } from '@thingweb/ui-wot-components/components/ui-text';
import { defineCustomElement as UiNumberPicker } from '@thingweb/ui-wot-components/components/ui-number-picker';
import { defineCustomElement as UiCalendar } from '@thingweb/ui-wot-components/components/ui-calendar';
import { defineCustomElement as UiCheckbox } from '@thingweb/ui-wot-components/components/ui-checkbox';
import { defineCustomElement as UiColorPicker } from '@thingweb/ui-wot-components/components/ui-color-picker';
import { defineCustomElement as UiFilePicker } from '@thingweb/ui-wot-components/components/ui-file-picker';
import { defineCustomElement as UiEvent } from '@thingweb/ui-wot-components/components/ui-event';
import { defineCustomElement as UiNotification } from '@thingweb/ui-wot-components/components/ui-notification';
import { defineCustomElement as UiObject } from '@thingweb/ui-wot-components/components/ui-object';
import { initializeWot } from '@thingweb/ui-wot-components/services';

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
  // Try multiple CDNs for Node-WoT browser bundle so `window.WoT` exists
  const cdnCandidates = [
    'https://cdn.jsdelivr.net/npm/@node-wot/browser-bundle@latest/dist/wot-bundle.min.js',
    'https://unpkg.com/@node-wot/browser-bundle@latest/dist/wot-bundle.min.js',
    'https://fastly.jsdelivr.net/npm/@node-wot/browser-bundle@latest/dist/wot-bundle.min.js',
  ];
  let wotLoaded = false;
  for (const url of cdnCandidates) {
    try {
      await loadScript(url);
      wotLoaded = true;
      console.log('[generator][bootstrap] WoT bundle loaded from', url);
      console.log('[generator][bootstrap] window.WoT present:', typeof (window as any).WoT !== 'undefined');
      break;
    } catch (err) {
      console.warn('[generator][bootstrap] WoT bundle failed from', url, err);
    }
  }
  if (!wotLoaded) {
    console.warn('[generator][bootstrap] No WoT bundle loaded; wiring will wait until available');
  }

  // Define all custom elements for use in React rendering
  UiButton();
  UiToggle();
  UiSlider();
  UiText();
  UiNumberPicker();
  UiCalendar();
  UiCheckbox();
  UiColorPicker();
  UiFilePicker();
  UiEvent();
  UiNotification();
  UiObject();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  // Initialize WoT and prepare one-liner auto-wiring capability
  try {
    await initializeWot();
    // Note: actual connectAll will be called after TD is chosen and components are in DOM.
    // We leave this initialized so later pages can call connectAll with the selected TD URL.
  } catch (err) {
    console.warn('initializeWot failed; TD wiring will be skipped until WoT available:', err);
  }
}

bootstrap();
