import React from 'react';
import { createRoot } from 'react-dom/client';
import { defineCustomElements } from '@thingweb/ui-wot-components/loader';
import App from './App';

defineCustomElements();

createRoot(document.getElementById('root')!).render(<App />);
