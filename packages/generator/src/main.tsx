import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
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

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if ((existing as any).loaded) return resolve();
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
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

async function wotInit() {
  const cdn = 'https://cdn.jsdelivr.net/npm/@node-wot/browser-bundle@latest/dist/wot-bundle.min.js';
  try {
    await loadScript(cdn);
  } catch (err) {
    console.warn('[generator][wotInit] WoT bundle failed from', cdn, err);
  }

  // Register all custom components
  const components = [UiButton, UiToggle, UiSlider, UiText, UiNumberPicker, UiCalendar, UiCheckbox, UiColorPicker, UiFilePicker, UiEvent, UiNotification, UiObject];
  components.forEach(define => define());

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  try {
    await initializeWot();
  } catch {
    console.error('[generator][main] initializeWot failed; TD wiring will be skipped until WoT available');
  }
}

wotInit();
