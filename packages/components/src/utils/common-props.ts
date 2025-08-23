/**
 * Common properties and utilities shared across all UI components
 * Based on ui-toggle component structure for consistency
 */

export interface UiComponentBase {
  /**
   * Text label displayed with the component.
   */
  label?: string;

  /**
   * Color theme variant.
   */
  color: 'primary' | 'secondary' | 'neutral' | 'success';

  /**
   * Enable dark theme for the component.
   * When true, uses light text on dark backgrounds.
   */
  dark: boolean;

  /**
   * Whether the component is disabled (cannot be interacted with).
   */
  disabled: boolean;

  /**
   * Whether the component is read-only (displays value but cannot be changed).
   */
  readonly: boolean;

  /**
   * Legacy mode prop for backward compatibility with older demos.
   * Accepts 'read' to indicate read-only mode, 'readwrite' for interactive.
   */
  mode?: 'read' | 'readwrite';

  /**
   * Enable keyboard navigation.
   * Default: true
   */
  keyboard: boolean;
}

/**
 * Common color mapping used across all components
 * Maintains consistency with ui-toggle implementation
 */
export const COLOR_MAP = {
  primary: 'bg-primary',
  secondary: 'bg-secondary', 
  neutral: 'bg-gray-500',
  // legacy alias used in some demos
  success: 'bg-green-500'
} as const;

/**
 * Get active color class based on color prop
 */
export function getActiveColor(color: keyof typeof COLOR_MAP): string {
  return COLOR_MAP[color] || COLOR_MAP.primary;
}

/**
 * Get neon color class for neon variants
 */
export function getNeonColor(color: 'primary' | 'secondary'): string {
  return color === 'secondary' ? 'neon-secondary' : 'neon-primary';
}

/**
 * Common component state management interface
 */
export interface ComponentState {
  isInitialized: boolean;
}

/**
 * Common component methods interface
 */
export interface ComponentMethods<T> {
  /**
   * Set the component value programmatically.
   * @param value - The new value
   * @returns Promise that resolves to true if successful
   */
  setValue(value: T): Promise<boolean>;

  /**
   * Get the current component value.
   * @returns Promise that resolves to the current value
   */
  getValue(): Promise<T>;
}

/**
 * Common accessibility helpers
 */
export class AccessibilityHelpers {
  /**
   * Generate aria-label for components
   */
  static generateAriaLabel(
    componentType: string,
    value: any,
    label?: string,
    isActive?: boolean
  ): string {
    if (label) {
      return `${label} ${componentType}${isActive ? ' active' : ''}`;
    }
    return `${componentType} ${isActive ? 'active' : 'inactive'}, current value ${value}`;
  }

  /**
   * Generate tooltip text
   */
  static generateTooltip(
    readonly: boolean,
    disabled: boolean,
    action: string,
    label?: string
  ): string {
    if (readonly) {
      return 'Read-only mode - Value reflects external state';
    } else if (disabled) {
      return `${label || 'Component'} is disabled`;
    } else {
      return `${action}${label ? ` ${label}` : ''}`;
    }
  }
}

/**
 * Common keyboard event handler
 */
export function createKeyboardHandler(
  disabled: boolean,
  readonly: boolean,
  keyboard: boolean,
  onActivate: () => void
) {
  return (event: KeyboardEvent) => {
    if (disabled || readonly || !keyboard) return;
    
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      onActivate();
    }
  };
}

/**
 * Legacy mode support - converts mode prop to readonly
 */
export function handleLegacyMode(readonly: boolean, mode?: 'read' | 'readwrite'): boolean {
  if (!readonly && mode === 'read') {
    return true;
  }
  return readonly;
}

/**
 * Watch handler for legacy mode changes
 */
export function createModeWatcher(setReadonly: (value: boolean) => void) {
  return (newMode?: 'read' | 'readwrite') => {
    if (newMode === 'read') {
      setReadonly(true);
    } else if (newMode === 'readwrite') {
      setReadonly(false);
    }
  };
}
