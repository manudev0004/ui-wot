/**
 * @fileoverview Simple entry point for UI-WoT components
 *
 * This exports the component classes for use in frameworks.
 * For HTML usage, just import the built bundle directly.
 */

// Export components for framework usage
export { UiButton } from './components/ui-button/ui-button';
export { UiToggle } from './components/ui-toggle/ui-toggle';
export { UiSlider } from './components/ui-slider/ui-slider';
export { UiNumberPicker } from './components/ui-number-picker/ui-number-picker';
export { UiCheckbox } from './components/ui-checkbox/ui-checkbox';
export { UiCalendar } from './components/ui-calendar/ui-calendar';
export { UiNotification } from './components/ui-notification/ui-notification';
export { UiText } from './components/ui-text/ui-text';
export { UiEvent } from './components/ui-event/ui-event';
export { UiColorPicker } from './components/ui-color-picker/ui-color-picker';
export { UiFilePicker } from './components/ui-file-picker/ui-file-picker';
export { UiObject } from './components/ui-object/ui-object';

// Export utility types
export * from './utils/types';

// Export services (tree-shakable)
export * as Services from './services';

// Also export browser-client helpers as top-level named exports for convenience

// (Auto-connect helpers omitted in this build)

// Browser bundle helpers (dynamic WoT loader + one-liners)
export {
  initializeWot,
  initiliseWot,
  connectProperty as connectProperty,
  connectAction as connectAction,
  connectEvent as connectEvent,
  connectAll as connectAll,
} from './services/browser-bundle-connect';
