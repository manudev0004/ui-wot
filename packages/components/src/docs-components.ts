/**
 * This is a documnetaion for UI-WoT Components
 * 
 * A modern collection of reusable UI components for rapid web development specially designed for the things description integration.
 * Explore, integrate, and accelerate your UI projects with ease. There are various components available like buttons, toggles, sliders, number pickers, checkboxes, calendars, notifications, text displays, and event triggers. Every one has customizable themes, status indicators, and various features that can be enabled/disabled using attributes.
 *
 * @module UIComponents
 * @version 0.1.0
 */

// Export all component classes for JSDoc documentation
export { UiToggle } from './components/ui-toggle/ui-toggle';
export { UiButton } from './components/ui-button/ui-button';
export { UiCheckbox } from './components/ui-checkbox/ui-checkbox';
export { UiNumberPicker } from './components/ui-number-picker/ui-number-picker';
export { UiSlider } from './components/ui-slider/ui-slider';
export { UiText } from './components/ui-text/ui-text';
export { UiNotification } from './components/ui-notification/ui-notification';
export { UiEvent } from './components/ui-event/ui-event';
export { UiCalendar } from './components/ui-calendar/ui-calendar';

// Export utility types and interfaces for JsDoc documentation
export { UiMsg } from './utils/types';
export { OperationStatus, StatusIndicator } from './utils/status-indicator';

