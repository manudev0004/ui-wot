import React from 'react';
import { createRoot } from 'react-dom/client';
import { defineCustomElement as UiToggle } from '@thingweb/ui-wot-components/components/ui-toggle';
import { defineCustomElement as UiSlider } from '@thingweb/ui-wot-components/components/ui-slider';
import { defineCustomElement as UiText } from '@thingweb/ui-wot-components/components/ui-text';
import { defineCustomElement as UiButton } from '@thingweb/ui-wot-components/components/ui-button';
import { defineCustomElement as UiEvent } from '@thingweb/ui-wot-components/components/ui-event';
import { defineCustomElement as UiObject } from '@thingweb/ui-wot-components/components/ui-object';
import App from './App';

UiToggle();
UiSlider();
UiText();
UiButton();
UiEvent();
UiObject();

createRoot(document.getElementById('root')!).render(<App />);
