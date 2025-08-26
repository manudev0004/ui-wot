/**
 * @fileoverview entry point for your component library
 *
 * This is the entry point for your component library. Use this file to export utilities,
 * constants or data structure that accompany your components.
 *
 * DO NOT use this file to export your components. Instead, use the recommended approaches
 * to consume components of this package as outlined in the `README.md`.
 */

// Core components
export { UiButton } from './components/ui-button/ui-button';
export { UiToggle } from './components/ui-toggle/ui-toggle';
export { UiSlider } from './components/ui-slider/ui-slider';
export { UiNumberPicker } from './components/ui-number-picker/ui-number-picker';
export { UiCalendar } from './components/ui-calendar/ui-calendar';
export { UiCheckbox } from './components/ui-checkbox/ui-checkbox';
export { UiText } from './components/ui-text/ui-text';
export { UiHeading } from './components/ui-heading/ui-heading';

// Smart wrapper
export { UiPropertyCard } from './components/ui-property-card/ui-property-card';

// Services (runtime implementations are intentionally not exported here to avoid
// bundling server-side/node-only dependencies into the web component build.
// Consumers who need the WoT runtime can import from the services module
// directly at application runtime.)
// Type-only exports for TypeScript consumers remain below.

// Types and utilities
export * from './utils/types';
export { classifyTdProperty } from './utils/types';

// Type definitions
export type {
  ConsumedThing as WoTThing,
  ThingDescription,
  PropertyElement,
  ActionElement,
  EventElement
} from './services/wot-service';

export { setMode } from '@stencil/core';
