import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types'; // Standard message format
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator'; // Status indicator utility

/**
 * A versatile checkbox component designed for WoT device control.
 *
 * It has various features, multiple visual styles, status and last updated timestamps.
 *
 * @example Basic Usage
 * ```html
 * <ui-checkbox variant="outlined" value="true" label="Accept Terms"></ui-checkbox>
 * <ui-checkbox variant="minimal" value="false" label="Enable Notifications"></ui-checkbox>
 * <ui-checkbox variant="filled" label="Device Status" show-last-updated="true"></ui-checkbox>
 * ```
 *
 * @example JS integaration with node-wot browser bundle
 * ```javascript
 * const checkbox = document.getElementById('device-checkbox');
 * const initialValue = Boolean(await (await thing.readProperty('enabled')).value());
 *
 * await checkbox.setValue(initialValue, {
 *   writeOperation: async value => {
 *     await thing.writeProperty('enabled', value);
 *   }
 * });
 * ```
 */
@Component({
  tag: 'ui-checkbox',
  styleUrl: 'ui-checkbox.css',
  shadow: true,
})
export class UiCheckbox {
  @Element() el: HTMLElement;

  // ============================== COMPONENT PROPERTIES ==============================

  /**
   * Visual style variant of the checkbox.
   * - minimal: Clean design with transparent background
   * - outlined: Border-focused design with outline style
   * - filled: Solid background when checked
   */
  @Prop() variant: 'minimal' | 'outlined' | 'filled' = 'outlined';

  /** Color theme for the active state matching to thingsweb theme */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /** Enable dark mode theme styling when true */
  @Prop() dark: boolean = false;

  /** Current boolean value of the checkbox */
  @Prop({ mutable: true }) value: boolean = false;

  /** Disable user interaction when true */
  @Prop() disabled: boolean = false;

  /** Text label displayed right to the checkbox (optional) */
  @Prop() label?: string;

  /** Enable keyboard navigation so user can toggle using 'Space' and 'Enter' keys) when true */
  @Prop() keyboard: boolean = true;

  /** Show last updated timestamp below the component */
  @Prop() showLastUpdated: boolean = false;

  /** Show visual operation status indicators (loading, success, failed) right to the component */
  @Prop() showStatus: boolean = false;

  /** Connection state for read-only monitoring */
  @Prop({ mutable: true }) connected: boolean = true;

  // ============================== COMPONENT STATE ==============================

  /** Current operation status for visual feedback */
  @State() operationStatus: OperationStatus = 'idle';

  /** Error message from failed operations if any (optional) */
  @State() lastError?: string;

  /** Timestamp when value was last updated (optional) */
  @State() lastUpdatedTs?: number;

  /** Internal state that controls the visual appearance of the checkbox */
  @State() private isActive: boolean = false;

  /** Internal state counter for timestamp re-rendering */
  @State() private timestampCounter: number = 0;

  /** Internal state to prevents infinite event loops while programmatic updates */
  @State() private suppressEvents: boolean = false;

  // ============================== PRIVATE PROPERTIES ==============================

  /** Tracks component initialization state to prevent early watchers */
  private isInitialized: boolean = false;

  /** Timer for updating relative timestamps */
  private timestampUpdateTimer?: number;

  /** Stores API function from first initialization to use further for any user interactions */
  private storedWriteOperation?: (value: boolean) => Promise<any>;

  // ============================== EVENTS ==============================

  /**
   * Emitted when checkbox value changes through user interaction or setValue calls.
   * Contains the new value, previous value, timestamp, and source information.
   */
  @Event() valueMsg: EventEmitter<UiMsg<boolean>>;

  // ============================== PUBLIC METHODS ==============================

  /**
   * Sets the checkbox value with optional device communication api and other options.
   *
   * This is the primary method for connecting checkboxes to real devices.
   * It supports optimistic updates, error handling, and automatic retries.
   *
   * @param value - The boolean value to set (true = checked, false = unchecked)
   * @param options - Configuration for device communication and behavior
   * @returns Promise resolving to true if successful, false if failed
   *
   * @example Basic Usage
   * ```javascript
   * await checkbox.setValue(true);
   * ```
   *
   * @example JS integaration with node-wot browser bundle
   *  * ```javascript
   * const checkbox = document.getElementById('device-checkbox');
   * const initialValue = Boolean(await (await thing.readProperty('enabled')).value());
   * await checkbox.setValue(initialValue, {
   *   writeOperation: async value => {
   *     await thing.writeProperty('enabled', value);
   *   },
   *   autoRetry: { attempts: 3, delay: 1000 }
   * });
   * ```
   */
  @Method()
  async setValue(
    value: boolean,
    options?: {
      writeOperation?: (value: boolean) => Promise<any>;
      readOperation?: () => Promise<any>;
      optimistic?: boolean;
      autoRetry?: { attempts: number; delay: number };
      _isRevert?: boolean;
    },
  ): Promise<boolean> {
    const prevValue = this.isActive;

    // Clear any existing error state
    if (this.operationStatus === 'error' && !options?._isRevert) {
      this.operationStatus = 'idle';
      this.lastError = undefined;
      this.connected = true;
    }

    // Simple value update without other operations
    if (!options?.writeOperation && !options?.readOperation) {
      this.updateValue(value, prevValue);
      return true;
    }

    // If there is writeOperation store operation for future user interactions
    if (options.writeOperation && !options._isRevert) {
      this.storedWriteOperation = options.writeOperation;
      this.updateValue(value, prevValue, false);
      return true;
    }

    // Execute operation immediately if no options selected
    return this.executeOperation(value, prevValue, options);
  }

  /**
   * Gets the current checkbox value with optional metadata.
   *
   * @param includeMetadata - Whether to include status, timestamp and other information
   * @returns Current value or detailed metadata object
   */
  @Method()
  async getValue(includeMetadata: boolean = false): Promise<boolean | { value: boolean; lastUpdated?: number; status: string; error?: string }> {
    if (includeMetadata) {
      return {
        value: this.isActive,
        lastUpdated: this.lastUpdatedTs,
        status: this.operationStatus,
        error: this.lastError,
      };
    }
    return this.isActive;
  }

  /**
   * This method updates the value silently without triggering events.
   *
   * Use this for external data synchronization to prevent event loops.
   * Perfect for WebSocket updates or polling from remote devices.
   *
   * @param value - The boolean value to set silently
   */
  @Method()
  async setValueSilent(value: boolean): Promise<void> {
    this.updateValue(value, this.isActive, false);
  }

  /**
   * (Advance) to manually set the operation status indicator.
   *
   * Useful when managing device communication externally and you want to show loading/success/error states.
   *
   * @param status - The status to display
   * @param errorMessage - (Optional) error message for error status
   */
  @Method()
  async setStatus(status: 'idle' | 'loading' | 'success' | 'error', errorMessage?: string): Promise<void> {
    StatusIndicator.applyStatus(this, status, errorMessage);
  }

  /**
   * This triggers a visual pulse for read-only mode.
   *
   * Note: Checkbox doesn't have readonly mode but keeping method for consistency.
   * Updates the last updated timestamp when called.
   */
  @Method()
  async triggerReadPulse(): Promise<void> {
    if (this.showLastUpdated) {
      this.lastUpdatedTs = Date.now();
    }
  }

  // ============================== LIFECYCLE METHODS ==============================

  /** Initialize component state from props */
  componentWillLoad() {
    this.isActive = Boolean(this.value);
    this.isInitialized = true;
    if (this.showLastUpdated) this.startTimestampUpdater();
  }

  /** Clean up timers when component is removed */
  disconnectedCallback() {
    this.stopTimestampUpdater();
  }

  // ============================== WATCHERS ==============================

  /** Sync internal state when value prop changes externally */
  @Watch('value')
  watchValue(newVal: boolean) {
    if (!this.isInitialized) return;

    if (this.isActive !== newVal) {
      const prevValue = this.isActive;
      this.isActive = newVal;
      this.emitValueMsg(newVal, prevValue);
    }
  }

  // ============================== PRIVATE METHODS ==============================

  /**
   * This is the core state update method that handles value changes consistently.
   * It updates both internal state and external prop and also manages timestamps, and emits events (optional).
   */
  private updateValue(value: boolean, prevValue?: boolean, emitEvent: boolean = true): void {
    this.isActive = value;
    this.value = value;
    this.lastUpdatedTs = Date.now();

    if (emitEvent && !this.suppressEvents) {
      this.emitValueMsg(value, prevValue);
    }
  }

  /** Sets different operation status with automatic timeout to return to its idle state */
  private setStatusWithTimeout(status: OperationStatus, duration: number = 1000): void {
    this.operationStatus = status;
    if (status !== 'idle') {
      setTimeout(() => {
        if (this.operationStatus === status) this.operationStatus = 'idle';
      }, duration);
    }
  }

  /** Executes stored operations with error handling and retry logic */
  private async executeOperation(value: boolean, prevValue: boolean, options: any): Promise<boolean> {
    const optimistic = options?.optimistic !== false;

    // Show new value immediately (if optimistic = true)
    if (optimistic && !options?._isRevert) {
      this.updateValue(value, prevValue);
    }

    this.operationStatus = 'loading';

    try {
      // Execute the API call
      if (options.writeOperation) {
        await options.writeOperation(value);
      } else if (options.readOperation) {
        await options.readOperation();
      }

      this.setStatusWithTimeout('success', 1200); // Success status for 1.2 seconds

      // Update value after successful operation, (if optimistic = false)
      if (!optimistic) {
        this.updateValue(value, prevValue);
      }

      return true;
    } catch (error) {
      this.operationStatus = 'error';
      this.lastError = error?.message || String(error) || 'Operation failed';

      // Revert optimistic changes if operation is not successful or has an error
      if (optimistic && !options?._isRevert) {
        this.updateValue(prevValue, value, false);
      }

      // Retry logic
      if (options?.autoRetry && options.autoRetry.attempts > 0) {
        setTimeout(() => {
          this.setValue(value, {
            ...options,
            autoRetry: { ...options.autoRetry, attempts: options.autoRetry.attempts - 1 },
          });
        }, options.autoRetry.delay);
      } else {
        this.setStatusWithTimeout('idle', 3000); // Clear error after 3 seconds
      }

      return false;
    }
  }

  /** Emits value change events with consistent UIMsg data structure */
  private emitValueMsg(value: boolean, prevValue?: boolean) {
    if (this.suppressEvents) return;
    this.valueMsg.emit({
      newVal: value,
      prevVal: prevValue,
      ts: Date.now(),
      source: this.el?.id || 'ui-checkbox',
      ok: true,
    });
  }

  /** Handles user click interactions */
  private handleChange = async () => {
    if (this.disabled) return;

    const newValue = !this.isActive;
    const prevValue = this.isActive;

    // Execute stored operation if available
    if (this.storedWriteOperation) {
      this.operationStatus = 'loading';
      this.updateValue(newValue, prevValue);

      try {
        await this.storedWriteOperation(newValue);
        this.setStatusWithTimeout('success');
      } catch (error) {
        console.error('Write operation failed:', error);
        this.operationStatus = 'error';
        this.lastError = error?.message || 'Operation failed';
        this.updateValue(prevValue, newValue, false);
        this.setStatusWithTimeout('idle', 3000); // Clear error after 3 seconds
      }
    } else {
      // Simple checkbox without device operations
      this.updateValue(newValue, prevValue);

      if (this.showStatus) {
        this.operationStatus = 'loading';
        setTimeout(() => this.setStatusWithTimeout('success'), 100); // Quick success feedback
      }
    }
  };

  /** Handle keyboard 'enter' and 'spacebar' input to toggle checkbox state */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled || !this.keyboard) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.handleChange();
    }
  };

  /** Manages timestamp update timer for relative time display */
  private startTimestampUpdater() {
    this.stopTimestampUpdater();
    this.timestampUpdateTimer = window.setInterval(() => this.timestampCounter++, 60000); //  Update every minute
  }

  /** Stops the timestamp update timer */
  private stopTimestampUpdater() {
    if (this.timestampUpdateTimer) {
      clearInterval(this.timestampUpdateTimer);
      this.timestampUpdateTimer = undefined;
    }
  }

  // ============================== RENDERING HELPERS ==============================

  /** Renders the status badge according to current operation state */
  private renderStatusBadge() {
    if (!this.showStatus) return null;

    const status = this.operationStatus || 'idle';
    const message = this.lastError || (status === 'idle' ? 'Ready' : '');
    return StatusIndicator.renderStatusBadge(status, 'light', message, h);
  }

  /** Renders the last updated timestamp */
  private renderLastUpdated() {
    if (!this.showLastUpdated || !this.lastUpdatedTs) return null;
    return StatusIndicator.renderTimestamp(new Date(this.lastUpdatedTs), this.dark ? 'dark' : 'light', h);
  }

  // ============================== STYLING HELPERS ==============================

  /** Generates CSS classes and styles for the checkbox based on variant,color and state */
  private getCheckboxStyle(): { classes: string; style: { [key: string]: string } } {
    const isDisabled = this.disabled;

    let baseClasses = 'w-5 h-5 rounded border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center cursor-pointer';
    let style: { [key: string]: string } = {};

    if (isDisabled) {
      baseClasses += ' opacity-50 cursor-not-allowed';
    } else {
      baseClasses += ' hover:scale-105 active:scale-95';
    }

    // Variant-specific styling with CSS variables
    if (this.variant === 'minimal') {
      if (this.isActive) {
        style.backgroundColor = this.getActiveColor();
        style.borderColor = this.getActiveColor();
      } else {
        baseClasses += ` bg-transparent border-gray-300 ${this.dark ? 'border-gray-600' : ''}`;
      }
    } else if (this.variant === 'outlined') {
      if (this.isActive) {
        baseClasses += ' bg-transparent border-2';
        style.borderColor = this.getActiveColor();
      } else {
        baseClasses += ` bg-transparent border-gray-300 ${this.dark ? 'border-gray-600' : ''}`;
      }
    } else if (this.variant === 'filled') {
      if (this.isActive) {
        style.backgroundColor = this.getActiveColor();
        style.borderColor = this.getActiveColor();
      } else {
        baseClasses += ` bg-gray-100 border-gray-300 ${this.dark ? 'bg-gray-800 border-gray-600' : ''}`;
      }
    }

    return { classes: baseClasses, style };
  }

  /** Generate the active color using global CSS variables */
  private getActiveColor(): string {
    switch (this.color) {
      case 'secondary':
        return 'var(--color-secondary)';
      case 'neutral':
        return 'var(--color-neutral)';
      default:
        return 'var(--color-primary)';
    }
  }

  // ============================== MAIN COMPONENT RENDER METHOD ==============================

  /**
   * Renders the complete checkbox component with all features and styles.
   */
  render() {
    const canInteract = !this.disabled;
    const hoverTitle = this.disabled ? 'Checkbox is disabled' : `Click to ${this.isActive ? 'uncheck' : 'check'}${this.label ? ` ${this.label}` : ''}`;

    return (
      <div class="inline-block" part="container" role="group" aria-label={this.label || 'Checkbox'}>
        <div class="inline-flex items-center gap-3 relative">
          {/* Checkbox Control */}
          <div
            class={this.getCheckboxStyle().classes}
            style={this.getCheckboxStyle().style}
            onClick={() => canInteract && this.handleChange()}
            onKeyDown={this.handleKeyDown}
            tabIndex={canInteract ? 0 : -1}
            title={hoverTitle}
            part="control"
            role="checkbox"
            aria-checked={this.isActive ? 'true' : 'false'}
            aria-disabled={this.disabled ? 'true' : 'false'}
          >
            {this.isActive && (
              <svg
                class={`w-3 h-3 ${this.variant === 'outlined' ? 'text-current' : 'text-white'}`}
                style={this.variant === 'outlined' ? { color: this.getActiveColor() } : {}}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clip-rule="evenodd"
                />
              </svg>
            )}
          </div>

          {/* Label */}
          <slot name="label">
            {this.label && (
              <label
                class={`select-none transition-colors duration-200 ${!canInteract ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer hover:text-opacity-80'} ${
                  this.dark ? 'text-white' : 'text-gray-900'
                }`}
                onClick={() => canInteract && this.handleChange()}
                title={hoverTitle}
                part="label"
              >
                {this.label}
              </label>
            )}
          </slot>

          {/* Status Badge */}
          {this.renderStatusBadge()}
        </div>

        {/* Last Updated Timestamp */}
        {this.renderLastUpdated()}
      </div>
    );
  }
}
