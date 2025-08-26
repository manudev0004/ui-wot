import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { formatLastUpdated } from '../../utils/common-props';

/**
 * Advanced slider component with reactive state management and multiple visual styles.
 *
 * @example Basic Usage
 * ```html
 * <ui-slider variant="narrow" min="0" max="100" value="50" label="Brightness"></ui-slider>
 * ```
 *
 * @example Different Variants
 * ```html
 * <ui-slider variant="narrow" min="0" max="100" value="30" label="Narrow Style"></ui-slider>
 * <ui-slider variant="wide" min="0" max="100" value="60" label="Wide Style"></ui-slider>
 * <ui-slider variant="rainbow" min="0" max="360" value="180" label="Rainbow Hue"></ui-slider>
 * <ui-slider variant="neon" min="0" max="100" value="80" label="Neon Glow"></ui-slider>
 * <ui-slider variant="stepped" step="10" min="0" max="100" value="50" label="Stepped Control"></ui-slider>
 * ```
 *
 * @example Read-Only Mode
 * ```html
 * <ui-slider readonly="true" value="75" min="0" max="100" label="Sensor Reading"></ui-slider>
 * ```
 *
 * @example JavaScript Integration with Multiple Sliders
 * ```javascript
 * // For single slider
 * const slider = document.querySelector('#my-slider');
 *
 * // For multiple sliders
 * const sliders = document.querySelectorAll('ui-slider');
 * sliders.forEach(slider => {
 *   slider.addEventListener('valueMsg', (e) => {
 *     console.log('Slider ID:', e.detail.source);
 *     console.log('New value:', e.detail.payload);
 *   });
 * });
 *
 * // Set value by ID
 * const brightnessSlider = document.getElementById('brightness-slider');
 * await brightnessSlider.setValue(75);
 * ```
 *
 * @example HTML with IDs
 * ```html
 * <ui-slider id="brightness-slider" label="Brightness" variant="narrow" min="0" max="100"></ui-slider>
 * <ui-slider id="volume-slider" label="Volume" variant="wide" min="0" max="100"></ui-slider>
 * ```
 */
@Component({
  tag: 'ui-slider',
  styleUrl: 'ui-slider.css',
  shadow: true,
})
export class UiSlider {
  @Element() el: HTMLElement;

  /** Component props */

  /**
   * Visual style variant of the slider.
   */
  @Prop() variant: 'narrow' | 'wide' | 'rainbow' | 'neon' | 'stepped' = 'narrow';

  /**
   * Orientation of the slider.
   */
  @Prop() orientation: 'horizontal' | 'vertical' = 'horizontal';

  /**
   * Current numeric value of the slider.
   */
  @Prop({ mutable: true }) value: number = 0;

  /**
   * Whether the slider is disabled (cannot be interacted with).
   */
  @Prop() disabled: boolean = false;

  /**
   * Whether the slider is read-only (displays value but cannot be changed).
   */
  @Prop({ mutable: true }) readonly: boolean = false;

  /**
   * Text label displayed above the slider.
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
   * Enable keyboard navigation (Arrow keys, Home, End, PageUp, PageDown).
   * Default: true
   */
  @Prop() keyboard: boolean = true;

  /**
   * Show last updated timestamp when true
   */
  @Prop() showLastUpdated: boolean = false;

  /**
   * Minimum value of the slider.
   */
  @Prop() min: number = 0;

  /**
   * Maximum value of the slider.
   */
  @Prop() max: number = 100;

  /**
   * Step increment for the slider.
   */
  @Prop() step: number = 1;

  /**
   * Shape of the slider thumb.
   */
  @Prop() thumbShape: 'circle' | 'square' | 'arrow' | 'triangle' | 'diamond' = 'circle';

  /**
   * Enable manual control interface.
   */
  @Prop() enableManualControl: boolean = false;

  /** Internal state tracking current visual state */
  @State() private isActive: number = 0;

  /** Internal state for tracking if component is initialized */
  @State() private isInitialized: boolean = false;

  /** Flag to prevent event loops when setting values programmatically */
  @State() private suppressEvents: boolean = false;

  /** Manual input value for text control */
  @State() manualInputValue: string = '';

  /** Operation status for write mode indicators */
  @State() operationStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  @State() lastError?: string;
  /** Timestamp of last read pulse (readonly updates) */
  @State() readPulseTs?: number;
  /** Connection state for readonly mode */
  @Prop({ mutable: true }) connected: boolean = true;
  /** Timestamp of last value update for showLastUpdated feature */
  @State() lastUpdatedTs?: number;

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
    const clampedValue = Math.max(this.min, Math.min(this.max, value));
    
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
        this.manualInputValue = String(clampedValue);
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
      this.manualInputValue = String(clampedValue);
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
          this.manualInputValue = String(clampedValue);
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
          this.manualInputValue = String(prevValue);
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
      this.manualInputValue = String(clampedValue);
      this.lastUpdatedTs = Date.now();
      this.emitValueMsg(clampedValue, prevValue);
    }

    return true;
  }

  /**
   * Get the current slider value with optional metadata
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
    const clampedValue = Math.max(this.min, Math.min(this.max, value));
    this.suppressEvents = true;
    this.isActive = clampedValue;
    this.value = clampedValue;
    this.manualInputValue = String(clampedValue);
    this.lastUpdatedTs = Date.now();
    this.suppressEvents = false;
  }

  /**
   * Set operation status for external status management
   */
  @Method()
  async setStatus(status: 'idle' | 'loading' | 'success' | 'error', errorMessage?: string): Promise<void> {
    this.operationStatus = status;
    if (status === 'error' && errorMessage) {
      this.lastError = errorMessage;
    } else if (status !== 'error') {
      this.lastError = undefined;
    }
    
    // Auto-clear success status
    if (status === 'success') {
      setTimeout(() => { 
        if (this.operationStatus === 'success') {
          this.operationStatus = 'idle'; 
        }
      }, 1200);
    }
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

  /** Render status badge for visual feedback */
  private renderStatusBadge() {
    const isReadonly = this.readonly;
    const connected = this.connected !== false;
    
    if (isReadonly) {
      if (!connected) {
        return <span style={{position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '4px'}}>
          <span style={{width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block'}}></span>
        </span>;
      }
      const active = this.readPulseTs && (Date.now() - this.readPulseTs < 1500);
      if (active) {
        return <span style={{position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '4px'}}>
          <span style={{position: 'absolute', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#60a5fa', opacity: '0.6', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'}}></span>
          <span style={{width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'inline-block'}}></span>
        </span>;
      }
      return null;
    }

    switch (this.operationStatus) {
      case 'loading':
        return <span style={{position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '4px'}} title="Sending...">
          <span style={{width: '12px', height: '12px', borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', animation: 'spin 1s linear infinite'}}></span>
        </span>;
      case 'success':
          return <span style={{position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: '8px'}} title="Sent">
            <span style={{width: '16px', height: '16px', borderRadius: '9999px', backgroundColor: '#22c55e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '800', lineHeight: '16px'}}>✓</span>
          </span>;
      case 'error':
          return <span style={{position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: '8px'}} title={this.lastError || 'Error'}>
            <span style={{width: '16px', height: '16px', borderRadius: '9999px', backgroundColor: '#ef4444', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', lineHeight: '16px'}}>×</span>
          </span>;
      default:
        return null;
    }
  }

  /**
   * Primary event emitted when the slider value changes.
   */
  @Event() valueMsg: EventEmitter<UiMsg<number>>;

  /** Initialize component state from props */
  componentWillLoad() {
    const clampedValue = Math.max(this.min, Math.min(this.max, this.value));
    this.isActive = clampedValue;
    this.manualInputValue = String(clampedValue);
    this.isInitialized = true;
  }

  /** Watch for value prop changes and update internal state */
  @Watch('value')
  watchValue(newVal: number) {
    if (!this.isInitialized) return;

    const clampedValue = Math.max(this.min, Math.min(this.max, newVal));
    if (this.isActive !== clampedValue) {
      const prevValue = this.isActive;
      this.isActive = clampedValue;
      this.manualInputValue = String(clampedValue);
      this.emitValueMsg(clampedValue, prevValue);
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
      source: this.el?.id || 'ui-slider',
      ok: true,
    };
    this.valueMsg.emit(msg);
  }

  /** Handle slider value change */
  private handleChange = (event: Event) => {
    if (this.disabled || this.readonly) return;

    const target = event.target as HTMLInputElement;
    const newValue = Number(target.value);
    const clampedValue = Math.max(this.min, Math.min(this.max, newValue));
    
    // Simple value change without any operation - for basic slider functionality
    this.isActive = clampedValue;
    this.value = clampedValue;
    this.manualInputValue = String(clampedValue);
    this.lastUpdatedTs = Date.now();
    this.emitValueMsg(clampedValue, this.isActive);
  };

  /** Handle manual input */
  private handleManualInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    this.manualInputValue = target.value;
  };

  /** Handle manual submit */
  private handleManualSubmit = (event: Event) => {
    event.preventDefault();
    if (this.disabled || this.readonly) return;

    const newValue = Number(this.manualInputValue);
    if (isNaN(newValue)) {
      this.manualInputValue = String(this.isActive);
      return;
    }

    const clampedValue = Math.max(this.min, Math.min(this.max, newValue));
    this.isActive = clampedValue;
    this.value = clampedValue;
    this.manualInputValue = String(clampedValue);
    this.lastUpdatedTs = Date.now();
    this.emitValueMsg(clampedValue, this.isActive);
  };

  /** Handle keyboard navigation */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled || this.readonly || !this.keyboard) return;

    let newValue = this.isActive;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        newValue = Math.min(this.max, this.isActive + this.step);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        newValue = Math.max(this.min, this.isActive - this.step);
        break;
      case 'Home':
        event.preventDefault();
        newValue = this.min;
        break;
      case 'End':
        event.preventDefault();
        newValue = this.max;
        break;
      case 'PageUp':
        event.preventDefault();
        newValue = Math.min(this.max, this.isActive + this.step * 10);
        break;
      case 'PageDown':
        event.preventDefault();
        newValue = Math.max(this.min, this.isActive - this.step * 10);
        break;
      default:
        return;
    }

    this.isActive = newValue;
    this.value = newValue;
    this.manualInputValue = String(newValue);
    this.lastUpdatedTs = Date.now();
    this.emitValueMsg(newValue, this.isActive);
  };

  /** Get track styles */
  private getTrackStyle() {
    const isDisabled = this.disabled;
    
    let baseClasses = 'relative rounded-full transition-all duration-200';
    
    // Size based on variant
    if (this.variant === 'wide') {
      baseClasses += this.orientation === 'vertical' ? ' w-6' : ' h-6';
    } else {
      baseClasses += this.orientation === 'vertical' ? ' w-2' : ' h-2';
    }
    
    // Orientation
    if (this.orientation === 'vertical') {
      baseClasses += ' flex-col-reverse';
    }
    
    // Background and effects
    if (this.variant === 'neon') {
      baseClasses += ' shadow-lg';
    }
    
    if (isDisabled) {
      baseClasses += ' opacity-50';
    }
    
    return baseClasses;
  }

  /** Render step marks for stepped variant */
  private renderStepMarks() {
    if (this.variant !== 'stepped') return null;

    const steps = [];
    for (let i = this.min; i <= this.max; i += this.step) {
      const percentage = ((i - this.min) / (this.max - this.min)) * 100;
      steps.push(
        <div
          key={i}
          class={`absolute w-1 h-1 bg-gray-400 rounded-full ${
            this.orientation === 'vertical' 
              ? `bottom-[${percentage}%] left-1/2 -translate-x-1/2` 
              : `left-[${percentage}%] top-1/2 -translate-y-1/2`
          }`}
        />
      );
    }
    
    return steps;
  }

  /** Render last updated timestamp if enabled */
  private renderLastUpdated() {
    if (!this.showLastUpdated || !this.lastUpdatedTs) return null;

    const timeText = formatLastUpdated(this.lastUpdatedTs);
    return (
      <span 
        class={`text-xs ${this.dark ? 'text-gray-300' : 'text-gray-500'} ml-2`}
        title={`Last updated: ${new Date(this.lastUpdatedTs).toLocaleString()}`}
        part="last-updated"
      >
        {timeText}
      </span>
    );
  }

  /** Render the component */
  render() {
    const canInteract = !this.disabled && !this.readonly;
    const percentage = ((this.isActive - this.min) / (this.max - this.min)) * 100;

    // Tooltip text
    let hoverTitle = '';
    if (this.readonly) {
      hoverTitle = 'Read-only mode - Value reflects external state';
    } else if (this.disabled) {
      hoverTitle = 'Slider is disabled';
    } else {
      hoverTitle = `Drag to adjust${this.label ? ` ${this.label}` : ''} (${this.isActive})`;
    }

    return (
      <div class="space-y-3" part="container">
        {/* Label and status indicators */}
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            {/* Label slot or prop */}
            <slot name="label">
              {this.label && (
                <label
                  class={`text-sm font-medium ${this.dark ? 'text-white' : 'text-gray-900'}`}
                  part="label"
                >
                  {this.label}
                </label>
              )}
            </slot>
            
            {/* Status badge */}
            {this.renderStatusBadge()}
            
            {/* Last updated timestamp */}
            {this.renderLastUpdated()}
          </div>
          
          {/* Current value display */}
          <span class={`text-sm font-medium ${this.dark ? 'text-gray-300' : 'text-gray-600'}`}>
            {this.isActive}
          </span>
        </div>

        {/* Slider control */}
        {this.readonly ? (
          // Read-only indicator
          <div
            class={`relative rounded-full transition-all duration-300 ${
              this.orientation === 'vertical' ? 'w-2 h-32' : 'h-2 w-full'
            } bg-gray-300`}
            title={`${hoverTitle} - Current value: ${this.isActive}`}
            part="readonly-indicator"
          >
            <div
              class={`absolute bg-green-500 animate-pulse shadow-lg shadow-green-500/50 rounded-full ${
                this.orientation === 'vertical' 
                  ? `w-full bottom-0 h-[${percentage}%]` 
                  : `h-full left-0 w-[${percentage}%]`
              }`}
            />
          </div>
        ) : (
          // Interactive slider
          <div
            class={`relative ${this.orientation === 'vertical' ? 'h-32 flex justify-center' : 'w-full'}`}
            part="control-container"
          >
            <input
              type="range"
              min={this.min}
              max={this.max}
              step={this.step}
              value={this.isActive}
              disabled={!canInteract}
              class={`slider-input ${this.getTrackStyle()}`}
              onInput={this.handleChange}
              onKeyDown={this.handleKeyDown}
              title={hoverTitle}
              part="control"
            />
            
            {/* Step marks */}
            {this.renderStepMarks()}
          </div>
        )}

        {/* Manual control interface */}
        {this.enableManualControl && canInteract && (
          <div class={`p-3 rounded-lg border ${this.dark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
            <h4 class={`text-sm font-medium mb-2 ${this.dark ? 'text-white' : 'text-gray-900'}`}>Manual Control</h4>
            <form onSubmit={this.handleManualSubmit} class="flex gap-2 items-center">
              <input
                type="number"
                min={this.min}
                max={this.max}
                step={this.step}
                value={this.manualInputValue}
                disabled={!canInteract}
                class={`flex-1 px-2 py-1 text-sm border rounded ${
                  this.dark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'
                }`}
                onInput={this.handleManualInput}
                part="manual-input"
              />
              <button
                type="submit"
                disabled={!canInteract}
                class={`px-3 py-1 text-sm rounded transition-colors ${
                  this.dark ? 'bg-primary text-white hover:bg-primary/80' : 'bg-primary text-white hover:bg-primary/80'
                }`}
                part="manual-submit"
              >
                Set
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }
}
