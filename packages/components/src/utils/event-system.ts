/**
 * Centralized Event System for UI-WoT Components
 * Provides standardized event emission and handling
 */

export interface ValueMessage {
  /** The actual value being emitted */
  value: any;
  /** Component identifier */
  component: string;
  /** Element reference for source tracking */
  element: HTMLElement;
  /** Timestamp when event was created */
  timestamp: number;
  /** Optional metadata for context */
  meta?: {
    /** Event type classification */
    type?: 'user' | 'programmatic' | 'system';
    /** Validation status */
    valid?: boolean;
    /** Previous value for comparison */
    previousValue?: any;
    /** Change reason */
    reason?: string;
    /** Additional context data */
    context?: Record<string, any>;
  };
}

export interface EmitOptions {
  /** Bubble the event up the DOM tree */
  bubbles?: boolean;
  /** Allow the event to be cancelled */
  cancelable?: boolean;
  /** Debounce delay in milliseconds */
  debounce?: number;
  /** Custom event type override */
  eventType?: string;
  /** Additional metadata */
  meta?: ValueMessage['meta'];
}

/**
 * Central timestamp manager for consistent timing
 */
class TimestampManager {
  private static instance: TimestampManager;
  
  static getInstance(): TimestampManager {
    if (!TimestampManager.instance) {
      TimestampManager.instance = new TimestampManager();
    }
    return TimestampManager.instance;
  }
  
  /**
   * Get current timestamp in milliseconds
   */
  now(): number {
    return Date.now();
  }
  
  /**
   * Get high-resolution timestamp for performance measurement
   */
  nowHighRes(): number {
    return performance.now();
  }
  
  /**
   * Format timestamp as ISO string
   */
  toISOString(timestamp?: number): string {
    return new Date(timestamp || this.now()).toISOString();
  }
}

/**
 * Debouncing utility for event emissions
 */
class DebouncedEmitter {
  private timers = new Map<string, NodeJS.Timeout>();
  
  /**
   * Emit an event with debouncing
   */
  emit(
    key: string,
    element: HTMLElement,
    eventType: string,
    detail: any,
    delay: number,
    options: CustomEventInit = {}
  ): void {
    // Clear existing timer
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      const event = new CustomEvent(eventType, {
        bubbles: true,
        cancelable: true,
        ...options,
        detail
      });
      
      element.dispatchEvent(event);
      this.timers.delete(key);
    }, delay);
    
    this.timers.set(key, timer);
  }
  
  /**
   * Cancel pending emission
   */
  cancel(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }
  
  /**
   * Cancel all pending emissions
   */
  cancelAll(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
}

// Singleton instances
const timestampManager = TimestampManager.getInstance();
const debouncedEmitter = new DebouncedEmitter();

/**
 * Central event emission utility
 * Standardizes value change events across all UI-WoT components
 */
export function emitValueMsg(
  element: HTMLElement,
  component: string,
  value: any,
  options: EmitOptions = {}
): ValueMessage {
  const {
    bubbles = true,
    cancelable = true,
    debounce = 0,
    eventType = 'valueChanged',
    meta = {}
  } = options;
  
  // Create standardized value message
  const valueMessage: ValueMessage = {
    value,
    component,
    element,
    timestamp: timestampManager.now(),
    meta: {
      type: 'user',
      valid: true,
      ...meta
    }
  };
  
  // Generate debounce key
  const debounceKey = `${component}-${element.id || 'anonymous'}-${eventType}`;
  
  if (debounce > 0) {
    // Use debounced emission
    debouncedEmitter.emit(
      debounceKey,
      element,
      eventType,
      valueMessage,
      debounce,
      { bubbles, cancelable }
    );
  } else {
    // Immediate emission
    const event = new CustomEvent(eventType, {
      bubbles,
      cancelable,
      detail: valueMessage
    });
    
    element.dispatchEvent(event);
  }
  
  return valueMessage;
}

/**
 * Enhanced event emission with additional event types
 */
export function emitStatusMsg(
  element: HTMLElement,
  component: string,
  status: 'success' | 'error' | 'warning' | 'info',
  message: string,
  options: EmitOptions = {}
): void {
  emitValueMsg(element, component, { status, message }, {
    ...options,
    eventType: 'statusChanged',
    meta: {
      type: 'system',
      ...options.meta
    }
  });
}

/**
 * Emit focus events
 */
export function emitFocusMsg(
  element: HTMLElement,
  component: string,
  focused: boolean,
  options: EmitOptions = {}
): void {
  emitValueMsg(element, component, { focused }, {
    ...options,
    eventType: 'focusChanged',
    meta: {
      type: 'user',
      ...options.meta
    }
  });
}

/**
 * Emit validation events
 */
export function emitValidationMsg(
  element: HTMLElement,
  component: string,
  valid: boolean,
  errors: string[] = [],
  options: EmitOptions = {}
): void {
  emitValueMsg(element, component, { valid, errors }, {
    ...options,
    eventType: 'validationChanged',
    meta: {
      type: 'system',
      valid,
      ...options.meta
    }
  });
}

/**
 * Get timestamp utilities
 */
export const timestamp = {
  now: () => timestampManager.now(),
  nowHighRes: () => timestampManager.nowHighRes(),
  toISOString: (ts?: number) => timestampManager.toISOString(ts)
};

/**
 * Cancel debounced emissions
 */
export function cancelDebouncedEmission(component: string, elementId?: string, eventType?: string): void {
  const key = `${component}-${elementId || 'anonymous'}-${eventType || 'valueChanged'}`;
  debouncedEmitter.cancel(key);
}

/**
 * Cancel all debounced emissions
 */
export function cancelAllDebouncedEmissions(): void {
  debouncedEmitter.cancelAll();
}
