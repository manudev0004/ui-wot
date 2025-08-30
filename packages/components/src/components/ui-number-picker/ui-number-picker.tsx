import { Component, Element, Prop, State, h, Watch, Event, EventEmitter, Method } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { StatusIndicator } from '../../utils/status-indicator';

export interface UiNumberPickerValueChange { value: number; label?: string }

/**
 * Number picker component with various visual styles, TD integration and customizable range.
 * Supports increment/decrement buttons with Thing Description integration for IoT devices.
 *
 * @example Basic Usage
 * ```html
 * <ui-number-picker variant="minimal" value="3" label="Quantity"></ui-number-picker>
 * ```
 *
 * @example TD Integration with HTTP
 * ```html
 * <ui-number-picker
 *   td-url="http://device.local/properties/volume"
 *   label="Device Volume"
 *   protocol="http"
 *   mode="readwrite"
 *   min="0"
 *   max="100">
 * </ui-number-picker>
 * ```
 *
 * @example TD Integration with MQTT
 * ```html
 * <ui-number-picker
 *   td-url="mqtt://device"
 *   mqtt-host="localhost:1883"
 *   mqtt-topic="device/volume"
 *   label="MQTT Volume"
 *   protocol="mqtt"
 *   mode="readwrite">
 * </ui-number-picker>
 * ```
 *
 * @example TD Device Read-Only (shows value only)
 * ```html
 * <ui-number-picker
 *   td-url="http://sensor.local/temperature"
 *   label="Temperature Sensor"
 *   mode="read">
 * </ui-number-picker>
 * ```
 *
 * @example Local Control with Custom Handler
 * ```html
 * <ui-number-picker
 *   value="3"
 *   on-change="handleNumberChange"
 *   variant="filled"
 *   label="Custom Counter">
 * </ui-number-picker>
 * ```
 *
 * @example Event Handling
 * ```javascript
 * window.handleNumberChange = function(data) {
 *   console.log('Number changed:', data.value);
 *   console.log('Label:', data.label);
 *   // Your custom logic here
 * };
 * ```
 */
@Component({
  tag: 'ui-number-picker',
  styleUrl: 'ui-number-picker.css',
  shadow: true,
})
export class UiNumberPicker {
  @Element() el: HTMLElement;

  /**
   * Visual style variant of the number picker.
   * - minimal: Clean buttons with subtle background (default)
   * - outlined: Buttons with border outline
   * - filled: Solid filled buttons
   */
  @Prop() variant: 'minimal' | 'outlined' | 'filled' = 'minimal';

  /**
   * Current numeric value of the number picker.
   */
  @Prop({ mutable: true }) value: number = 0;

  /**
   * Whether the number picker is disabled (cannot be interacted with).
   */
  @Prop() disabled: boolean = false;

  /**
   * Whether the number picker is read-only (displays value but cannot be changed).
   */
  @Prop({ mutable: true }) readonly: boolean = false;

  /**
   * Text label displayed above the number picker.
   */
  @Prop() label?: string;

  /**
   * Color theme variant.
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /**
   * Enable dark theme for the component.
   * When true, uses light text on dark backgrounds.
   */
  @Prop() dark: boolean = false;

  /**
   * Enable keyboard navigation (Arrow keys).
   * Default: true
   */
  @Prop() keyboard: boolean = true;

  /**
   * Show last updated timestamp when true
   */
  @Prop() showLastUpdated: boolean = false;

  // TD integration removed: external systems should use events

  /**
   * Device interaction mode.
   * - read: Only read from device (display current value, no interaction)
   * - write: Only write to device (control device but don't sync state)
   * - readwrite: Read and write (full synchronization) - default
   */
  @Prop() mode: 'read' | 'write' | 'readwrite' = 'readwrite';

  /**
   * Minimum allowed value.
   */
  @Prop() min?: number = 0;

  /**
   * Maximum allowed value.
   */
  @Prop() max?: number = 100;

  /**
   * Step increment/decrement amount.
   */
  @Prop() step: number = 1;

  /** Internal state tracking current visual state */
  @State() private isActive: number = 0;

  /** Internal state for tracking if component is initialized */
  @State() private isInitialized: boolean = false;

  /** Flag to prevent event loops when setting values programmatically */
  @State() private suppressEvents: boolean = false;

  /** Operation status for write mode indicators */
  @State() operationStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  @State() lastError?: string;
  /** Timestamp of last read pulse (readonly updates) */
  @State() readPulseTs?: number;
  /** Connection state for readonly mode */
  @Prop({ mutable: true }) connected: boolean = true;
  /** Timestamp of last value update for showLastUpdated feature */
  @State() lastUpdatedTs?: number;
  
  /** Timer for auto-updating timestamps */
  @State() timestampUpdateTimer?: number;
  @State() private timestampCounter = 0;

  /** Consolidated setValue method with automatic Promise-based status management */
  @Method()
  async setValue(value: number, options?: {
    /** Automatic write operation - component handles all status transitions */
    writeOperation?: () => Promise<any>;
    /** Automatic read operation with pulse indicator */
    readOperation?: () => Promise<any>;
    /** Apply change optimistically, revert on failure (default: true) */
    optimistic?: boolean;
    /** Auto-retry configuration for failed operations */
    autoRetry?: {
      attempts: number;
      delay: number;
    };
    /** Manual status override (for advanced users) */
    customStatus?: 'loading' | 'success' | 'error';
    /** Error message for manual error status */
    errorMessage?: string;
    /** Internal flag to indicate this is a revert operation */
    _isRevert?: boolean;
  }): Promise<boolean> {
    const prevValue = this.isActive;
    
    // Clamp value to min/max bounds
    const clampedValue = this.min !== undefined && this.max !== undefined 
      ? Math.max(this.min, Math.min(this.max, value))
      : value;
    
    // Handle manual status override (backward compatibility)
    if (options?.customStatus) {
      if (options.customStatus === 'loading') {
        this.operationStatus = 'loading';
        return true;
      }
      if (options.customStatus === 'success') {
        this.operationStatus = 'success';
        setTimeout(() => { 
          if (this.operationStatus === 'success') this.operationStatus = 'idle'; 
        }, 1200);
        this.isActive = clampedValue;
        this.value = clampedValue;
        this.lastUpdatedTs = Date.now();
        this.emitValueMsg(clampedValue, prevValue);
        return true;
      }
      if (options.customStatus === 'error') {
        this.operationStatus = 'error';
        this.lastError = options.errorMessage || 'Operation failed';
        return false;
      }
    }
    
    // Auto-clear error state when user tries again (unless this is a revert)
    if (this.operationStatus === 'error' && !options?._isRevert) {
      this.operationStatus = 'idle';
      this.lastError = undefined;
      this.connected = true;
    }
    
    // Optimistic update (default: true)
    const optimistic = options?.optimistic !== false;
    if (optimistic && !options?._isRevert) {
      this.isActive = clampedValue;
      this.value = clampedValue;
      this.lastUpdatedTs = Date.now();
      this.emitValueMsg(clampedValue, prevValue);
    }
    
    // Handle Promise-based operations
    if (options?.writeOperation || options?.readOperation) {
      const operation = options.writeOperation || options.readOperation;
      
      // Show loading state
      this.operationStatus = 'loading';
      
      try {
        // Execute the operation
        await operation();
        
        // Success - show success state briefly
        this.operationStatus = 'success';
        setTimeout(() => { 
          if (this.operationStatus === 'success') this.operationStatus = 'idle'; 
        }, 1200);
        
        // If not optimistic, apply value now
        if (!optimistic) {
          this.isActive = clampedValue;
          this.value = clampedValue;
          this.lastUpdatedTs = Date.now();
          this.emitValueMsg(clampedValue, prevValue);
        }
        
        return true;
        
      } catch (error) {
        // Error - show error state and revert if optimistic
        this.operationStatus = 'error';
        this.lastError = error.message || 'Operation failed';
        
        if (optimistic && !options?._isRevert) {
          // Revert to previous value
          this.isActive = prevValue;
          this.value = prevValue;
          // Don't emit event for revert to avoid loops
        }
        
        // Auto-retry logic
        if (options?.autoRetry && options.autoRetry.attempts > 0) {
          setTimeout(async () => {
            const retryOptions = {
              ...options,
              autoRetry: {
                attempts: options.autoRetry.attempts - 1,
                delay: options.autoRetry.delay
              }
            };
            await this.setValue(clampedValue, retryOptions);
          }, options.autoRetry.delay);
        }
        
        return false;
      }
    }
    
    // Simple value setting (no operation)
    if (!options?.writeOperation && !options?.readOperation && !options?._isRevert) {
      this.isActive = clampedValue;
      this.value = clampedValue;
      this.lastUpdatedTs = Date.now();
      this.emitValueMsg(clampedValue, prevValue);
    }

    return true;
  }

  /**
   * Get the current number picker value with optional metadata
   * @param includeMetadata - Include last updated timestamp and status
   * @returns Promise that resolves to the current value or value with metadata
   */
  @Method()
  async getValue(includeMetadata: boolean = false): Promise<number | { value: number; lastUpdated?: number; status: string; error?: string }> {
    if (includeMetadata) {
      return {
        value: this.isActive,
        lastUpdated: this.lastUpdatedTs,
        status: this.operationStatus,
        error: this.lastError
      };
    }
    return this.isActive;
  }

  /**
   * Set value programmatically without triggering events (for external updates)
   */
  @Method()
  async setValueSilent(value: number): Promise<void> {
    const clampedValue = this.min !== undefined && this.max !== undefined 
      ? Math.max(this.min, Math.min(this.max, value))
      : value;
    this.suppressEvents = true;
    this.isActive = clampedValue;
    this.value = clampedValue;
    this.lastUpdatedTs = Date.now();
    this.suppressEvents = false;
  }

  /**
   * Set operation status for external status management
   */
  @Method()
  async setStatus(status: 'idle' | 'loading' | 'success' | 'error', errorMessage?: string): Promise<void> {
    StatusIndicator.applyStatus(this, status, { errorMessage });
  }

  /**
   * Trigger a read pulse indicator for readonly mode when data is actually fetched
   */
  @Method()
  async triggerReadPulse(): Promise<void> {
    if (this.readonly) {
      this.readPulseTs = Date.now();
    }
  }

  /**
   * Primary event emitted when the number picker value changes.
   */
  @Event() valueMsg: EventEmitter<UiMsg<number>>;

  /** Event emitted when value changes */
  @Event() valueChange: EventEmitter<UiNumberPickerValueChange>;

  /** Initialize component state from props */
  componentWillLoad() {
    this.isActive = this.value || 0;
    this.isInitialized = true;
    
    // Start auto-updating timestamp timer if showLastUpdated is enabled
    if (this.showLastUpdated) {
      this.startTimestampUpdater();
    }
  }

  /** Start auto-updating relative timestamps */
  private startTimestampUpdater() {
    this.stopTimestampUpdater(); // Ensure no duplicate timers
    this.timestampUpdateTimer = window.setInterval(() => {
      // Force re-render to update relative time by incrementing counter
      this.timestampCounter++;
    }, 30000); // Update every 30 seconds
  }

  /** Stop auto-updating timestamps */
  private stopTimestampUpdater() {
    if (this.timestampUpdateTimer) {
      clearInterval(this.timestampUpdateTimer);
      this.timestampUpdateTimer = undefined;
    }
  }

  /** Cleanup component */
  disconnectedCallback() {
    this.stopTimestampUpdater();
  }

  /** Watch for value prop changes and update internal state */
  @Watch('value')
  watchValue(newVal: number) {
    if (!this.isInitialized) return;

    if (this.isActive !== newVal) {
      const prevValue = this.isActive;
      this.isActive = newVal;
      this.emitValueMsg(newVal, prevValue);
    }
  }

  /** Emit the unified UiMsg event */
  private emitValueMsg(value: number, prevValue?: number) {
    // Don't emit events if suppressed (to prevent loops)
    if (this.suppressEvents) return;
    
    // Primary unified event
    const msg: UiMsg<number> = {
      payload: value,
      prev: prevValue,
      ts: Date.now(),
      source: this.el?.id || 'ui-number-picker',
      ok: true,
    };
    this.valueMsg.emit(msg);
  }

  // Device read logic removed

  /** Read via CoAP */
  // CoAP helper removed

  /** Read via MQTT */
  // MQTT helper removed

  /** Write new state to TD device */
  // Device write logic removed

  /** Write via CoAP */
  // CoAP helper removed

  /** Write via MQTT */
  // MQTT helper removed

  /** Handle increment */
  private handleIncrement = async () => {
    if (this.disabled || this.readonly) return;

    // Don't allow interaction in read-only mode
    if (this.mode === 'read') {
      return;
    }

    const newValue = this.isActive + this.step;
    if (this.max !== undefined && newValue > this.max) return;

    // Simple value change without any operation - for basic number picker functionality
    this.isActive = newValue;
    this.value = newValue;
    this.lastUpdatedTs = Date.now();
    this.emitValueMsg(newValue, this.isActive - this.step);
    this.operationStatus = 'success';
    setTimeout(() => { this.operationStatus = 'idle'; }, 1000);
    // Local-only change: external device updates should be handled by listeners to `valueChange`.
  };

  /** Handle decrement */
  private handleDecrement = async () => {
    if (this.disabled || this.readonly) return;

    // Don't allow interaction in read-only mode
    if (this.mode === 'read') {
      return;
    }

    const newValue = this.isActive - this.step;
    if (this.min !== undefined && newValue < this.min) return;

    // Simple value change without any operation - for basic number picker functionality
    this.isActive = newValue;
    this.value = newValue;
    this.lastUpdatedTs = Date.now();
    this.emitValueMsg(newValue, this.isActive + this.step);
    this.operationStatus = 'success';
    setTimeout(() => { this.operationStatus = 'idle'; }, 1000);
    // Local-only change: external device updates should be handled by listeners to `valueChange`.
  };

  /** Handle keyboard input */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled || this.readonly || !this.keyboard) return;

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.handleIncrement();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.handleDecrement();
    }
  };

  /** Get button style classes */
  private getButtonStyle(type: 'increment' | 'decrement'): string {
    const isDisabled = this.disabled;
    const isAtMax = this.max !== undefined && this.isActive >= this.max && type === 'increment';
    const isAtMin = this.min !== undefined && this.isActive <= this.min && type === 'decrement';
    const disabled = isDisabled || isAtMax || isAtMin;

    let baseClasses = 'w-12 h-12 flex items-center justify-center text-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg';

    if (disabled) {
      baseClasses += ' opacity-50 cursor-not-allowed';
    } else {
      baseClasses += ' cursor-pointer hover:scale-105 active:scale-95';
    }

    // Variant-specific styling with explicit color control
    if (this.variant === 'minimal') {
      // Minimal: No background, no border, just text
      if (disabled) {
        baseClasses += ' text-gray-400';
      } else {
        // Clear color specification based on theme
        if (this.dark) {
          baseClasses += ' bg-transparent text-white-dark hover:bg-gray-800';
        } else {
          baseClasses += ' bg-transparent text-black-force hover:bg-gray-100';
        }
      }
    } else if (this.variant === 'outlined') {
      // Outlined: Border with user's chosen color, no background
      if (disabled) {
        baseClasses += ' border-2 border-gray-300 text-gray-400 bg-transparent';
      } else {
        const borderColor = `border-${this.getColorName()}`;
        const hoverBg = `hover:bg-${this.getColorName()}`;

        if (this.dark) {
          baseClasses += ` border-2 ${borderColor} bg-transparent text-white-dark ${hoverBg} hover:text-white-force`;
        } else {
          baseClasses += ` border-2 ${borderColor} bg-transparent text-black-force ${hoverBg} hover:text-white-force`;
        }
      }
    } else if (this.variant === 'filled') {
      // Filled: Background with user's chosen color, text color matches theme
      if (disabled) {
        baseClasses += ' bg-gray-400 text-white-force';
      } else {
        // Filled buttons: black text in light theme, white text in dark theme
        if (this.dark) {
          baseClasses += ` bg-${this.getColorName()} text-white-force hover:bg-${this.getColorName()}-dark`;
        } else {
          baseClasses += ` bg-${this.getColorName()} text-black-force hover:bg-${this.getColorName()}-dark`;
        }
      }
    }

    // Focus ring color matches component color
    baseClasses += ` focus:ring-${this.getColorName()}`;

    return baseClasses;
  }

  /** Get value display style */
  private getValueStyle(): string {
    const isDisabled = this.disabled;

    let classes = 'min-w-[60px] h-12 flex items-center justify-center text-lg font-semibold rounded-lg border-2 number-display';

    if (isDisabled) {
      // Disabled state
      classes += ' bg-gray-100 text-gray-400 border-gray-300 dark:bg-gray-800 dark:text-gray-600 dark:border-gray-600';
    } else {
      // Center box: white background with primary color text and border
      classes += ` bg-white text-${this.getColorName()} border-${this.getColorName()} dark:bg-white dark:text-${this.getColorName()} dark:border-${this.getColorName()}`;
    }

    return classes;
  }

  /** Get color name for CSS classes */
  private getColorName(): string {
    return this.color === 'primary' ? 'primary' : this.color === 'secondary' ? 'secondary' : 'neutral';
  }

  /** Readonly background classes derived from color and theme */
  private getReadonlyBg(): string {
    if (this.dark) {
      // darker backgrounds for dark mode but keep colored borders/text
      if (this.color === 'primary') return 'bg-gray-800 border-primary text-white';
      if (this.color === 'secondary') return 'bg-gray-800 border-secondary text-white';
      return 'bg-gray-800 border-gray-600 text-white';
    }

    // Light mode: use colored borders and light backgrounds
    if (this.color === 'primary') return 'bg-white border-primary text-primary';
    if (this.color === 'secondary') return 'bg-white border-secondary text-secondary';
    return 'bg-white border-gray-300 text-gray-900';
  }

  /** Readonly text color classes derived from color */
  private getReadonlyText(): string {
    if (this.dark) return 'text-white';
    if (this.color === 'primary') return 'text-primary';
    if (this.color === 'secondary') return 'text-secondary';
    return 'text-gray-900';
  }

  /** Render component */
  render() {
    const isDisabled = this.disabled;
    const isReadOnly = this.readonly || this.mode === 'read';
    const hoverTitle = isReadOnly ? 'Value cannot be changed (Read-only mode)' : '';
  // IMPORTANT: add 'relative' so absolutely positioned status/timestamp badges render correctly
  const containerClasses = `relative flex flex-col items-center gap-3 ${isDisabled ? 'opacity-75' : ''}`;

    return (
      <div class={containerClasses} part="container" role="group" aria-label={this.label || 'Number picker'}>
        <div class="flex items-center">
          {/* Label slot or prop */}
          <slot name="label">
            {this.label && (
              <label class={`text-sm font-medium ${this.dark ? 'text-white' : 'text-gray-900'}`} title={hoverTitle} part="label">
                {this.label}
                {isReadOnly && <span class="ml-1 text-xs text-blue-500 dark:text-blue-400">(Read-only)</span>}
              </label>
            )}
          </slot>
        </div>

        {/* Status badge only (timestamp moved below) */}
        <div class="flex justify-end items-start mt-2">
          {StatusIndicator.renderStatusBadge(this.operationStatus, this.dark ? 'dark' : 'light', this.lastError, h)}
        </div>

        {isReadOnly ? (
          // Read-only indicator (no glow/shadow in readonly mode)
          <div
            class={`flex items-center justify-center min-w-[120px] h-12 px-4 rounded-lg border transition-all duration-300 ${
              this.getReadonlyBg() }
            `}
            title={`${hoverTitle} - Current value: ${this.isActive}`}
            part="readonly-indicator"
          >
            <span class={`text-lg font-medium ${this.getReadonlyText()}`}>{this.isActive}</span>
          </div>
        ) : (
          // Show interactive number picker (wrapped with fragment to allow bottom timestamp)
          <div class="flex flex-col items-center w-full" part="interactive-wrapper">
          <div class="relative flex items-center gap-3" tabindex={isDisabled ? -1 : 0} onKeyDown={this.handleKeyDown}>
            {/* Decrement Button */}
            <button
              class={this.getButtonStyle('decrement')}
              onClick={this.handleDecrement}
              disabled={isDisabled || (this.min !== undefined && this.isActive <= this.min)}
              aria-label="Decrease value"
              part="decrement-button"
            >
              −
            </button>

            {/* Value Display */}
            <div class={this.getValueStyle()} part="value-display">{this.isActive}</div>

            {/* Increment Button */}
            <button
              class={this.getButtonStyle('increment')}
              onClick={this.handleIncrement}
              disabled={isDisabled || (this.max !== undefined && this.isActive >= this.max)}
              aria-label="Increase value"
              part="increment-button"
            >
              +
            </button>
          </div>
            {/* Bottom timestamp */}
            {this.showLastUpdated && (
              <div class="w-full flex justify-end mt-2">
                {StatusIndicator.renderTimestamp(this.lastUpdatedTs ? new Date(this.lastUpdatedTs) : null, this.dark ? 'dark' : 'light', h)}
              </div>
            )}
          </div>
        )}

        {/* Error Message (optional) */}
        {this.lastError && <div class="text-red-500 text-sm mt-2 px-2">{this.lastError}</div>}
      </div>
    );
  }
}
