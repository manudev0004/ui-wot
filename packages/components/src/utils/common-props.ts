/**
 * Common properties and utilities shared across all UI components
 * Simplified and optimized for human-readable code
 */

// Debug mode flag - set globally or via environment
export const DEBUG_MODE = typeof window !== 'undefined' 
  ? window.localStorage?.getItem('ui-wot-debug') === 'true' || window.location?.search.includes('debug=true')
  : process.env.NODE_ENV === 'development';

// Simple debug logger
export function debug(...args: any[]) {
  if (DEBUG_MODE) {
    console.log('[UI-WoT]', ...args);
  }
}

/**
 * Common props that all UI components should have
 */
export interface CommonProps {
  /** Text label displayed with the component */
  label?: string;
  
  /** Color theme: primary (blue), secondary (purple), neutral (gray) */
  color?: 'primary' | 'secondary' | 'neutral';
  
  /** Dark theme mode */
  dark?: boolean;
  
  /** Disabled state - component cannot be interacted with */
  disabled?: boolean;
  
  /** Read-only state - shows value but cannot be changed */
  readonly?: boolean;
  
  /** Enable keyboard navigation (Space/Enter keys) */
  keyboard?: boolean;
  
  /** Connection state for network-connected components */
  connected?: boolean;
}

/**
 * Default values for common props
 */
export const DEFAULT_PROPS: Required<CommonProps> = {
  label: undefined,
  color: 'primary',
  dark: false,
  disabled: false,
  readonly: false,
  keyboard: true,
  connected: true
};

/**
 * Simple color utilities
 */
export function getActiveColor(color: string = 'primary'): string {
  switch (color) {
    case 'secondary': return 'bg-secondary';
    case 'neutral': return 'bg-neutral';
    default: return 'bg-primary';
  }
}

export function getNeonColor(color: string = 'primary'): string {
  return color === 'secondary' ? 'neon-secondary' : 'neon-primary';
}

/**
 * Simple keyboard handler
 */
export function handleKeyboardEvent(
  event: KeyboardEvent, 
  callback: () => void, 
  enabled: boolean = true
): void {
  if (!enabled) return;
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    callback();
  }
}
