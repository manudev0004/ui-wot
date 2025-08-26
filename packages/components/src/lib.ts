/**
 * UI-WoT Library - Web of Things UI Components
 * 
 * A comprehensive library for building Web of Things (WoT) user interfaces
 * using Eclipse Thingweb node-wot ecosystem with tree-shaking support.
 * 
 * @example
 * ```typescript
 * import { WoTService, createBinder } from '@thingweb/ui-wot-components';
 * 
 * // Create a WoT service
 * const wotService = new WoTService({ debug: true });
 * 
 * // Consume a Thing Description
 * await wotService.consumeThing('myDevice', 'http://device.local/td');
 * 
 * // Read a property
 * const result = await wotService.readProperty('myDevice', 'temperature');
 * console.log(result.payload); // Current temperature
 * 
 * // Bind to UI components
 * const binder = createBinder(wotService);
 * await binder.bindProperty('myDevice', 'temperature', '#temp-display');
 * ```
 */

// Core services (runtime implementations are not re-exported to prevent
// bundling node-only modules into the web build. Import services at
// application runtime when needed.)

// Component classes for framework integration
export { UiButton } from './components/ui-button/ui-button';
export { UiText } from './components/ui-text/ui-text';
export { UiToggle } from './components/ui-toggle/ui-toggle';
export { UiSlider } from './components/ui-slider/ui-slider';
export { UiNumberPicker } from './components/ui-number-picker/ui-number-picker';
export { UiCalendar } from './components/ui-calendar/ui-calendar';
export { UiCheckbox } from './components/ui-checkbox/ui-checkbox';

// Types and interfaces
export type {
  // WoT Core Types
  ConsumedThing as WoTThing,
  ThingDescription,
  PropertyElement,
  ActionElement,
  EventElement,
  
  // Service Configuration
  WoTServiceConfig
} from './services/wot-service';

export type {
  // Utility Types
  UiMsg,
  TdCapability
} from './utils/types';

// Utilities
export { classifyTdProperty } from './utils/types';
export * from './utils/status-indicator';
export * from './utils/data-handler';

// Re-export services for tree-shaking
export * from './services';

/**
 * Library version
 */
export const VERSION = '0.1.0';

/**
 * Check if node-wot is available
 */
export function isNodeWoTAvailable(): boolean {
  try {
    require('@node-wot/core');
    return true;
  } catch {
    return false;
  }
}

/**
 * Library capabilities
 */
export const CAPABILITIES = {
  nodeWoT: isNodeWoTAvailable(),
  customFallback: false,
  components: [
    'ui-button',
    'ui-heading', 
    'ui-text',
    'ui-toggle',
    'ui-slider',
    'ui-number-picker',
    'ui-calendar',
    'ui-checkbox'
  ],
  protocols: ['http', 'https'],
  features: [
    'property-reading',
    'property-writing', 
    'property-observation',
    'action-invocation',
    'td-validation',
    'auto-binding',
    'tree-shaking',
    'typescript',
    'custom-elements'
  ]
} as const;
