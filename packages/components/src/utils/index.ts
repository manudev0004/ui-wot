/**
 * UI-WoT Components Utilities
 * Centralized exports for all component utilities
 */

// Event System
export * from './event-system';

// Status Management
export * from './status-lifecycle';

// Data Handling
export * from './data-handler';

// Status Indicator
export * from './status-indicator';

// Common Props
export * from './common-props';

// Types
export * from './types';

// Re-export key utilities for convenience
export {
  emitValueMsg,
  emitStatusMsg,
  emitFocusMsg,
  emitValidationMsg,
  timestamp,
  cancelDebouncedEmission,
  cancelAllDebouncedEmissions
} from './event-system';

export {
  getStatusManager,
  setSuccess,
  setError,
  setWarning,
  setInfo,
  clearStatus,
  clearAllStatuses,
  onComponentDisconnected
} from './status-lifecycle';

// Validation utilities
export const validators = {
  required: (value: any) => value != null && value !== '',
  minLength: (min: number) => (value: string) => value && value.length >= min,
  maxLength: (max: number) => (value: string) => !value || value.length <= max,
  pattern: (regex: RegExp) => (value: string) => !value || regex.test(value),
  min: (min: number) => (value: number) => typeof value === 'number' && value >= min,
  max: (max: number) => (value: number) => typeof value === 'number' && value <= max,
  range: (min: number, max: number) => (value: number) => 
    typeof value === 'number' && value >= min && value <= max,
  email: (value: string) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  url: (value: string) => !value || /^https?:\/\/.+/.test(value),
  number: (value: any) => !isNaN(Number(value)),
  integer: (value: any) => Number.isInteger(Number(value)),
  boolean: (value: any) => typeof value === 'boolean'
};

// CSS class utilities
export const cssClasses = {
  base: 'ui-component',
  states: {
    loading: 'ui-loading',
    disabled: 'ui-disabled',
    focused: 'ui-focused',
    invalid: 'ui-invalid',
    valid: 'ui-valid'
  },
  status: {
    success: 'ui-status-success',
    error: 'ui-status-error',
    warning: 'ui-status-warning',
    info: 'ui-status-info',
    idle: 'ui-status-idle'
  },
  sizes: {
    xs: 'ui-size-xs',
    sm: 'ui-size-sm',
    md: 'ui-size-md',
    lg: 'ui-size-lg',
    xl: 'ui-size-xl'
  },
  variants: {
    primary: 'ui-variant-primary',
    secondary: 'ui-variant-secondary',
    outline: 'ui-variant-outline',
    ghost: 'ui-variant-ghost'
  }
};
