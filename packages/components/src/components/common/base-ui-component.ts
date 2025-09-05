import { EventEmitter } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { OperationStatus } from '../../utils/status-indicator';

/**
 * Interface defining the common state that UI components should have.
 * This ensures consistency across all components.
 */
export interface BaseUiState {
  /** Internal state for tracking if component is initialized */
  isInitialized: boolean;
  /** Flag to prevent event loops when setting values programmatically */
  suppressEvents: boolean;
  /** Operation status for unified status indicators */
  operationStatus: OperationStatus;
  /** Last error message (if any) */
  lastError?: string;
  /** Timestamp of last value update for showLastUpdated feature */
  lastUpdatedTs?: number;
  /** Auto-updating timer for relative timestamps */
  timestampUpdateTimer?: number;
  /** Counter to trigger re-renders for timestamp updates */
  timestampCounter: number;
}

/**
 * Interface defining methods that UI components should implement for base functionality.
 */
export interface BaseUiMethods<T> {
  /** Get the current value from the component */
  getCurrentValue(): T;
  /** Update the component's internal value */
  updateValue(value: T): void;
  /** Check if the component is in readonly mode */
  isReadonly(): boolean;
  /** Get the component tag name for event source identification */
  getComponentTag(): string;
  /** Clear connection error state */
  clearConnectionError(): void;
  /** Get the read pulse timestamp */
  getReadPulseTimestamp(): number | undefined;
  /** Set the read pulse timestamp */
  setReadPulseTimestamp(timestamp: number | undefined): void;
}

/**
 * Utility class for common UI component functionality.
 * Provides static methods for state management, lifecycle, and common operations.
 * 
 * Since Stencil doesn't support class inheritance, this class provides reusable
 * methods that can be called from individual components to reduce code duplication.
 * 
 * @example
 * ```typescript
 * @Component({
 *   tag: 'ui-custom',
 *   styleUrl: 'ui-custom.css',
 *   shadow: true,
 * })
 * export class UiCustom implements BaseUiMethods<string> {
 *   @State() private baseState: BaseUiState = UiComponentHelper.createBaseState();
 *   @Event() valueMsg: EventEmitter<UiMsg<string>>;
 *   
 *   componentWillLoad() {
 *     UiComponentHelper.baseComponentWillLoad(this.baseState, this.showLastUpdated);
 *   }
 *   
 *   disconnectedCallback() {
 *     UiComponentHelper.baseDisconnectedCallback(this.baseState);
 *   }
 * }
 * ```
 */
export class UiComponentHelper {
  /** Replace state immutably to trigger Stencil re-render */
  private static replaceState(component: any, state: BaseUiState, partial: Partial<BaseUiState>) {
    // Reassign to a new object so @State detects change
    component.baseState = { ...state, ...partial } as BaseUiState;
  }
  /**
   * Create initial base state for a component.
   * 
   * @returns Initial base state object
   */
  static createBaseState(): BaseUiState {
    return {
      isInitialized: false,
      suppressEvents: false,
      operationStatus: 'idle',
      lastError: undefined,
      lastUpdatedTs: undefined,
      timestampUpdateTimer: undefined,
      timestampCounter: 0,
    };
  }

  /**
   * Base lifecycle helper for component initialization.
   * Should be called from componentWillLoad() in components.
   * 
   * @param state - The component's base state
   * @param showLastUpdated - Whether to enable timestamp updates
   * 
   * @example
   * ```typescript
   * componentWillLoad() {
   *   UiComponentHelper.baseComponentWillLoad(this.baseState, this.showLastUpdated);
   * }
   * ```
   */
  static baseComponentWillLoad(component: any, state: BaseUiState, showLastUpdated: boolean = false): void {
    this.replaceState(component, state, { isInitialized: true });
    if (showLastUpdated) {
      this.startTimestampUpdater(component, component.baseState);
    }
  }

  /**
   * Base cleanup helper for component disconnection.
   * Should be called from disconnectedCallback() in components.
   * 
   * @param state - The component's base state
   * 
   * @example
   * ```typescript
   * disconnectedCallback() {
   *   UiComponentHelper.baseDisconnectedCallback(this.baseState);
   * }
   * ```
   */
  static baseDisconnectedCallback(state: BaseUiState): void {
    this.stopTimestampUpdater(state);
  }

  /**
   * Set the component value with optional device communication and status management.
   * Generic implementation that can be used by all components.
   *
   * @param component - The component instance (should implement BaseUiMethods<T>)
   * @param state - The component's base state
   * @param value - The value to set
   * @param valueMsg - The component's value event emitter
   * @param options - Configuration options for the operation
   * @returns Promise<boolean> - true if successful, false if failed
   */
  static async setValue<T>(
    component: BaseUiMethods<T>,
    state: BaseUiState,
    value: T,
    valueMsg: EventEmitter<UiMsg<T>>,
    options?: {
      writeOperation?: () => Promise<any>;
      readOperation?: () => Promise<any>;
      optimistic?: boolean;
      autoRetry?: { attempts: number; delay: number };
      customStatus?: 'loading' | 'success' | 'error';
      errorMessage?: string;
      _isRevert?: boolean;
    },
  ): Promise<boolean> {
    const prevValue = component.getCurrentValue();

    // Handle manual status override (backward compatibility)
      if (options?.customStatus) {
        if (options.customStatus === 'loading') {
          this.replaceState(component as any, state, { operationStatus: 'loading' });
          return true;
        }
        if (options.customStatus === 'success') {
          this.replaceState(component as any, state, { operationStatus: 'success', lastError: undefined });
          setTimeout(() => {
            const s = (component as any).baseState as BaseUiState;
            if (s.operationStatus === 'success') this.replaceState(component as any, s, { operationStatus: 'idle' });
          }, 1200);
          component.updateValue(value);
          this.replaceState(component as any, (component as any).baseState, { lastUpdatedTs: Date.now() });
          this.handleReadPulseForReadonly(component);
          this.emitValueMsg((component as any).baseState, component, valueMsg, value, prevValue);
          return true;
        }
        if (options.customStatus === 'error') {
          this.replaceState(component as any, state, { operationStatus: 'error', lastError: options.errorMessage || 'Operation failed' });
          return false;
        }
      }

    // Auto-clear error state when user tries again (unless this is a revert)
    if (state.operationStatus === 'error' && !options?._isRevert) {
      this.replaceState(component as any, state, { operationStatus: 'idle', lastError: undefined });
      component.clearConnectionError();
    }

    // Optimistic update (default: true)
    const optimistic = options?.optimistic !== false;
    if (optimistic && !options?._isRevert) {
      component.updateValue(value);
      this.replaceState(component as any, (component as any).baseState, { lastUpdatedTs: Date.now() });
      this.handleReadPulseForReadonly(component);
      this.emitValueMsg((component as any).baseState, component, valueMsg, value, prevValue);
    }

    // Handle Promise-based operations
    if (options?.writeOperation || options?.readOperation) {
      const operation = options.writeOperation || options.readOperation;

      // Show loading state
  this.replaceState(component as any, (component as any).baseState, { operationStatus: 'loading', lastError: undefined });

      try {
        await operation();

        // Success - show success state and update value if not optimistic
        this.replaceState(component as any, (component as any).baseState, { operationStatus: 'success', lastError: undefined });
        setTimeout(() => {
          const s = (component as any).baseState as BaseUiState;
          if (s.operationStatus === 'success') this.replaceState(component as any, s, { operationStatus: 'idle' });
        }, 1200);

        // If not optimistic, apply value now
        if (!optimistic) {
          component.updateValue(value);
          this.replaceState(component as any, (component as any).baseState, { lastUpdatedTs: Date.now() });
          this.handleReadPulseForReadonly(component);
          this.emitValueMsg((component as any).baseState, component, valueMsg, value, prevValue);
        }

        return true;
      } catch (error) {
        // Error - show error state and revert if optimistic
        this.replaceState(component as any, (component as any).baseState, {
          operationStatus: 'error',
          lastError: (error as any)?.message || String(error) || 'Operation failed',
        });

        if (optimistic && !options?._isRevert) {
          // Revert to previous value
          component.updateValue(prevValue);
        }

        // Auto-retry logic
        if (options?.autoRetry && options.autoRetry.attempts > 0) {
          setTimeout(async () => {
            const retryOptions = {
              ...options,
              autoRetry: {
                attempts: options.autoRetry.attempts - 1,
                delay: options.autoRetry.delay,
              },
            };
            await this.setValue(component, state, value, valueMsg, retryOptions);
          }, options.autoRetry.delay);
        }

        return false;
      }
    }

    // Simple value setting (no operation)
    if (!options?.writeOperation && !options?.readOperation) {
      component.updateValue(value);
      this.replaceState(component as any, (component as any).baseState, { lastUpdatedTs: Date.now() });
      this.handleReadPulseForReadonly(component);
      this.emitValueMsg((component as any).baseState, component, valueMsg, value, prevValue);
    }

    return true;
  }

  /**
   * Set value without triggering events (for external updates).
   * 
   * @param component - The component instance
   * @param state - The component's base state
   * @param value - The value to set silently
   */
  static setValueSilent<T>(component: BaseUiMethods<T>, state: BaseUiState, value: T): void {
    state.suppressEvents = true;
    component.updateValue(value);
    this.replaceState(component as any, state, { lastUpdatedTs: Date.now() });
    this.handleReadPulseForReadonly(component);
    state.suppressEvents = false;
  }

  /**
   * Get the current component value with optional metadata.
   * 
   * @param component - The component instance
   * @param state - The component's base state
   * @param includeMetadata - Whether to include additional metadata
   * @returns Current value or object with metadata
   */
  static getValue<T>(
    component: BaseUiMethods<T>,
    state: BaseUiState,
    includeMetadata: boolean = false,
  ): T | { value: T; lastUpdated?: number; status: string; error?: string } {
    const currentValue = component.getCurrentValue();
    
    if (includeMetadata) {
      return {
        value: currentValue,
        lastUpdated: state.lastUpdatedTs,
        status: state.operationStatus,
        error: state.lastError,
      };
    }
    return currentValue;
  }

  /**
   * Set operation status for external status management.
   * 
   * @param state - The component's base state
   * @param status - The status to set
   * @param errorMessage - Optional error message for error status
   */
  static setStatus(state: BaseUiState, status: 'idle' | 'loading' | 'success' | 'error', errorMessage?: string): void {
    const component = (state as any).__component || (undefined as any);
    const comp = component || ({} as any);
    const current = comp.baseState || state;
    if (status === 'loading') {
      this.replaceState(comp, current, { operationStatus: 'loading', lastError: undefined });
    } else if (status === 'success') {
      this.replaceState(comp, current, { operationStatus: 'success', lastError: undefined, lastUpdatedTs: Date.now() });
      setTimeout(() => {
        const s = (comp as any).baseState as BaseUiState;
        if (s && s.operationStatus === 'success') this.replaceState(comp, s, { operationStatus: 'idle' });
      }, 1200);
    } else if (status === 'error') {
      this.replaceState(comp, current, { operationStatus: 'error', lastError: errorMessage });
      setTimeout(() => {
        const s = (comp as any).baseState as BaseUiState;
        if (s && s.operationStatus === 'error') this.replaceState(comp, s, { operationStatus: 'idle', lastError: undefined });
      }, 3000);
    } else {
      this.replaceState(comp, current, { operationStatus: 'idle', lastError: undefined });
    }
  }

  /**
   * Trigger a read pulse indicator for readonly mode.
   * 
   * @param component - The component instance
   */
  static triggerReadPulse<T>(component: BaseUiMethods<T>): void {
    if (component.isReadonly()) {
      component.setReadPulseTimestamp(Date.now());
      // Auto-hide after animation duration
      setTimeout(() => {
        const readPulseTs = component.getReadPulseTimestamp();
        if (readPulseTs && Date.now() - readPulseTs >= 1500) {
          component.setReadPulseTimestamp(undefined);
        }
      }, 1500);
    }
  }

  /**
   * Emit value change events consistently across components.
   * 
   * @param state - The component's base state
   * @param component - The component instance
   * @param valueMsg - The component's value event emitter
   * @param value - Current value
   * @param prevValue - Previous value (optional)
   */
  static emitValueMsg<T>(
    state: BaseUiState,
    component: BaseUiMethods<T>,
    valueMsg: EventEmitter<UiMsg<T>>,
    value: T,
    prevValue?: T,
  ): void {
    if (state.suppressEvents) return;
    
    valueMsg.emit({
      payload: value,
      prev: prevValue,
      ts: Date.now(),
      source: component.getComponentTag(),
      ok: true,
    });
  }

  /**
   * Start auto-updating timer for relative timestamps
   */
  static startTimestampUpdater(component: any, state: BaseUiState): void {
    this.stopTimestampUpdater(state);
    const intervalId = window.setInterval(() => {
      const s = (component as any).baseState as BaseUiState;
      const next = (s?.timestampCounter ?? 0) + 1;
      this.replaceState(component, s || state, { timestampCounter: next });
    }, 30000);
    // Store timer id on current state object reference
    (component as any).baseState = { ...(component as any).baseState, timestampUpdateTimer: intervalId } as BaseUiState;
  }

  /**
   * Stop auto-updating timer
   */
  static stopTimestampUpdater(state: BaseUiState): void {
    if (state.timestampUpdateTimer) {
      clearInterval(state.timestampUpdateTimer);
      state.timestampUpdateTimer = undefined;
    }
  }

  /**
   * Handle read pulse for readonly components.
   */
  static handleReadPulseForReadonly<T>(component: BaseUiMethods<T>): void {
    if (component.isReadonly()) {
      component.setReadPulseTimestamp(Date.now());
    }
  }
}
