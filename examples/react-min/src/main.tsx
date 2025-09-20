import React from 'react';
import { createRoot } from 'react-dom/client';
import { defineCustomElement as defineUiToggle } from '@thingweb/ui-wot-components/components/ui-toggle';
import { defineCustomElement as defineUiSlider } from '@thingweb/ui-wot-components/components/ui-slider';
import { defineCustomElement as defineUiText } from '@thingweb/ui-wot-components/components/ui-text';
import { defineCustomElement as defineUiButton } from '@thingweb/ui-wot-components/components/ui-button';
// Note: ui-event is part of the library; add export if you want to tree-shake it similarly
import App from './App';
import { defineCustomElement as defineUiEvent } from '@thingweb/ui-wot-components/components/ui-event';
import { defineCustomElement as defineUiObjectEditor } from '@thingweb/ui-wot-components/components/ui-object-editor';

// Register only the components you need (tree-shakable)
defineUiToggle();
defineUiSlider();
defineUiText();
defineUiButton();
defineUiEvent();
defineUiObjectEditor();

createRoot(document.getElementById('root')!).render(<App />);
