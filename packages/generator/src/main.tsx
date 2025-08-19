import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Load and register UI web components from the components package (use built ESM bundle)
import '../../components/dist/ui-wot-components/ui-wot-components.esm.js';
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
