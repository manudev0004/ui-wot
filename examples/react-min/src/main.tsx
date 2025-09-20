import React from 'react';
import { createRoot } from 'react-dom/client';
import { UiToggle, UiSlider, UiText, UiButton, UiEvent, UiObject} from '@thingweb/ui-wot-components';
import { defineCustomElements } from '@thingweb/ui-wot-components/loader';
import App from './App';

// Register all custom elements once via loader (simple and robust)
defineCustomElements();

createRoot(document.getElementById('root')!).render(<App />);
