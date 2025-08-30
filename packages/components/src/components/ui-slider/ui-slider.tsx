import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { StatusIndicator } from '../../utils/status-indicator';

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
   * Primary event emitted when the slider value changes.
   */
  @Event() valueMsg: EventEmitter<UiMsg<number>>;

  /** Initialize component state from props */
  componentWillLoad() {
    const clampedValue = Math.max(this.min, Math.min(this.max, this.value));
    this.isActive = clampedValue;
    this.manualInputValue = String(clampedValue);
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
  const prev = this.isActive;
  this.isActive = clampedValue;
  this.value = clampedValue;
  this.manualInputValue = String(clampedValue);
  this.lastUpdatedTs = Date.now();
  this.emitValueMsg(clampedValue, prev);
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
  const prev = this.isActive;
  this.isActive = clampedValue;
  this.value = clampedValue;
  this.manualInputValue = String(clampedValue);
  this.lastUpdatedTs = Date.now();
  this.emitValueMsg(clampedValue, prev);
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

  const prev = this.isActive;
  this.isActive = newValue;
  this.value = newValue;
  this.manualInputValue = String(newValue);
  this.lastUpdatedTs = Date.now();
  this.emitValueMsg(newValue, prev);
  };

  /** Get track styles */
  private getTrackStyle() {
    const isDisabled = this.disabled;
  const range = (this.max - this.min) || 1;
  const percentage = ((this.isActive - this.min) / range) * 100;

    let trackSize = 'h-2 w-full';
    let progressSize = 'h-2';
    
    if (this.orientation === 'vertical') {
      trackSize = 'w-2 h-48'; // Shorter height for vertical
      if (this.variant === 'wide') trackSize = 'w-3 h-48';
      if (this.variant === 'narrow') trackSize = 'w-1 h-48';
      progressSize = 'w-2';
      if (this.variant === 'wide') progressSize = 'w-3';
      if (this.variant === 'narrow') progressSize = 'w-1';
    } else {
      if (this.variant === 'wide') trackSize = 'h-4 w-full';
      if (this.variant === 'narrow') trackSize = 'h-1 w-full';
      if (this.variant === 'wide') progressSize = 'h-4';
      if (this.variant === 'narrow') progressSize = 'h-1';
    }

    let bgColor = 'bg-gray-300';
    let progressColor = this.getActiveColor();

    if (this.variant === 'rainbow') {
      if (this.orientation === 'vertical') {
        bgColor = 'bg-gradient-to-t from-red-500 via-yellow-500 via-green-500 to-blue-500';
      } else {
        bgColor = 'bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 to-blue-500';
      }
      progressColor = '';
    } else if (this.variant === 'neon') {
      bgColor = 'bg-gray-700';
      progressColor = this.getNeonColor();
    }

    const disabled = isDisabled ? 'opacity-50 cursor-not-allowed' : '';
    
    return {
      track: `relative ${trackSize} ${bgColor} rounded-full ${disabled}`,
      progress: `absolute ${progressColor} rounded-full transition-all duration-200`,
      progressSize,
      percentage
    };
  }

  /** Get thumb styles */
  private getThumbStyle() {
    let size = 'w-5 h-5';
    let shape = 'rounded-full';
    
    if (this.thumbShape === 'square') {
      shape = 'rounded-sm';
    } else if (this.thumbShape === 'arrow') {
      size = 'w-8 h-6';
      shape = '';
    } else if (this.thumbShape === 'triangle' || this.thumbShape === 'diamond') {
      size = 'w-6 h-6';
      shape = '';
    }

    let bgColor = 'bg-white';
    const border = 'border border-gray-300';

    // For custom shapes, don't add background and border as they're handled by SVG
    if (this.thumbShape === 'arrow' || this.thumbShape === 'triangle' || this.thumbShape === 'diamond') {
      return `${size} cursor-pointer flex items-center justify-center`;
    }

    return `${size} ${shape} ${bgColor} ${border} cursor-pointer`;
  }

  /** Fetch current active color */
  private getActiveColor() {
    if (this.color === 'secondary') return 'bg-secondary';
    if (this.color === 'neutral') return 'bg-gray-500';
    return 'bg-primary';
  }

  /** Fetch current neon color */
  private getNeonColor() {
    return this.color === 'secondary' ? 'neon-secondary-track' : 'neon-primary-track';
  }

  /** Render step marks for stepped variant */
  private renderStepMarks() {
    if (this.variant !== 'stepped') return null;

    const steps = [];
  const safeStep = this.step || 1;
  const stepCount = Math.max(1, Math.floor((this.max - this.min) / safeStep));
    
    for (let i = 0; i <= stepCount; i++) {
      const percentage = (i / stepCount) * 100;
      
      if (this.orientation === 'vertical') {
        steps.push(
          <div
            key={i}
            class="absolute h-0.5 w-3 bg-gray-400"
            style={{ 
              bottom: `${percentage}%`,
              left: '50%',
              transform: 'translateX(-50%) translateY(1px)'
            }}
          ></div>
        );
      } else {
        steps.push(
          <div
            key={i}
            class="absolute w-0.5 h-3 bg-gray-400"
            style={{ 
              left: `${percentage}%`,
              top: '50%',
              transform: 'translateX(-50%) translateY(-50%)'
            }}
          ></div>
        );
      }
    }

    return <div class="absolute inset-0 pointer-events-none">{steps}</div>;
  }

  /** Render custom thumb shapes */
  private renderCustomThumb() {
    if (!['arrow', 'triangle', 'diamond'].includes(this.thumbShape)) return null;

    const thumbColor = this.variant === 'neon' ? '#ffffff' : '#ffffff';
    const strokeColor = '#374151';

    if (this.thumbShape === 'arrow') {
      return (
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Left pointing triangle */}
          <svg 
            width="12" 
            height="16" 
            viewBox="0 0 12 16" 
            class="absolute -translate-x-1.5"
          >
            <path 
              d="M8 3 L3 8 L8 13 Z" 
              fill={thumbColor} 
              stroke={strokeColor} 
              stroke-width="1"
            />
          </svg>
          {/* Right pointing triangle */}
          <svg 
            width="12" 
            height="16" 
            viewBox="0 0 12 16" 
            class="absolute translate-x-1.5"
          >
            <path 
              d="M4 3 L9 8 L4 13 Z" 
              fill={thumbColor} 
              stroke={strokeColor} 
              stroke-width="1"
            />
          </svg>
        </div>
      );
    }

    if (this.thumbShape === 'triangle') {
      return (
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 20 20" 
            class="absolute"
          >
            <path 
              d="M10 3 L17 15 L3 15 Z" 
              fill={thumbColor} 
              stroke={strokeColor} 
              stroke-width="1"
            />
          </svg>
        </div>
      );
    }

    if (this.thumbShape === 'diamond') {
      return (
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 20 20" 
            class="absolute"
          >
            <path 
              d="M2 10 L10 2 L18 10 L10 18 Z" 
              fill={thumbColor} 
              stroke={strokeColor} 
              stroke-width="1"
            />
          </svg>
        </div>
      );
    }

    return null;
  }

  /** Render the component */
  render() {
    const trackStyles = this.getTrackStyle();
    const thumbStyle = this.getThumbStyle();
    const isDisabled = this.disabled;
    const isVertical = this.orientation === 'vertical';
  const safeRange = (this.max - this.min) || 1;
  const percent = ((this.isActive - this.min) / safeRange) * 100;

    return (
      <div class={isVertical ? 'flex flex-col items-center w-20 mx-4 mb-4' : 'w-full'}> {/* Reduced mb-4 for vertical to avoid excess space */}
        {/* Label only for horizontal sliders */}
        {this.label && !isVertical && (
          <label
            class={`block text-sm font-medium mb-4 ${isDisabled ? 'text-gray-400' : ''} ${this.dark ? 'text-white' : 'text-gray-900'}`}
          >
            {this.label}
          </label>
        )}

        {/* Value labels for vertical - max at top */}
        {isVertical && (
          <div class={`text-xs mb-4 text-center ${this.dark ? 'text-gray-300' : 'text-gray-500'}`}>
            <span>{this.max}</span>
          </div>
        )}

        {/* Slider Interface */}
        <div
          class={isVertical ? 'relative flex flex-col items-center justify-center' : 'relative'}
          style={isVertical ? {height: '12rem', width: '1.5rem'} : {}}
          tabIndex={isDisabled ? -1 : 0}
          onKeyDown={this.handleKeyDown}
          role="slider"
          aria-valuemin={this.min}
          aria-valuemax={this.max}
          aria-valuenow={this.isActive}
          aria-disabled={isDisabled ? 'true' : 'false'}
        >
          {/* Success Indicator moved next to value display */}
          
          <div class={trackStyles.track}>
            {this.variant !== 'rainbow' && (
              <div
                class={`${trackStyles.progress} ${trackStyles.progressSize}`}
                style={isVertical
                  ? {height: `${percent}%`, bottom: '0', left: '0', position: 'absolute', width: '100%'}
                  : {width: `${percent}%`, height: '100%'}}
              ></div>
            )}
            {this.renderStepMarks()}
          </div>
          <input
            type="range"
            min={this.min}
            max={this.max}
            step={this.step}
            value={this.isActive}
            disabled={isDisabled}
            class={`absolute inset-0 ${isVertical ? 'slider-vertical' : 'w-full h-full'} opacity-0 cursor-pointer z-10 ${isDisabled ? 'cursor-not-allowed' : ''}`}
            style={isVertical ? {writingMode: 'bt-lr', height: '100%', width: '100%'} : {}}
            onInput={(e) => this.handleChange(e)}
            onKeyDown={this.handleKeyDown}
            tabIndex={isDisabled ? -1 : 0}
          />
          <div
            class={`absolute ${isVertical ? 'left-1/2 -translate-x-1/2' : 'top-1/2 -translate-y-1/2 -translate-x-1/2'} ${thumbStyle} ${isDisabled ? 'opacity-50' : ''} pointer-events-none z-0`}
            style={isVertical
              ? {bottom: `calc(${percent}% - 0.5rem)`}
              : {left: `${percent}%`}}
          >
            {this.renderCustomThumb()}
          </div>
        </div>

        {/* Value labels for vertical - min, current value box, and label at bottom */}
        {isVertical && (
          <div class={`flex flex-col items-center mt-4 space-y-2 text-xs ${this.dark ? 'text-gray-300' : 'text-gray-500'}`} style={{marginBottom: '1.5rem'}}> {/* Increased margin below label/value group to prevent overlap */}
            <span>{this.min}</span>
            <div class="flex items-center">
              <div class={`px-2 py-1 rounded text-center font-medium border text-xs min-w-8 ${this.dark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'} shadow-sm`}>
                {this.isActive}
              </div>
              {/* Status indicator directly next to value for vertical slider */}
              {this.operationStatus !== 'idle' && (
                <div class="ml-2">
                  {StatusIndicator.renderStatusBadge(this.operationStatus, this.dark ? 'dark' : 'light', this.lastError, h, { position: 'sibling-right' })}
                </div>
              )}
            </div>
            {this.label && (
              <span class="text-xs font-medium text-center mt-1 mb-2">{this.label}</span>
            )}
          </div>
        )}

        {/* Horizontal value labels: min/max on top, value box below, centered with extra gap */}
        {!isVertical && (
          <>
            <div class={`flex justify-between items-center text-xs mt-3 ${this.dark ? 'text-gray-300' : 'text-gray-500'}`}>
              <span>{this.min}</span>
              <span>{this.max}</span>
            </div>
            <div class="flex justify-center mt-0 items-center"> {/* Increased gap (mt-4) and added items-center */}
              <div class={`px-2 py-1 rounded text-center font-medium border text-xs min-w-8 ${this.dark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'} shadow-sm`} style={{display: 'inline-block'}}>
                {this.isActive}
              </div>
              {/* Status indicator directly next to value */}
              {this.operationStatus !== 'idle' && (
                <div class="ml-2">
                  {StatusIndicator.renderStatusBadge(this.operationStatus, this.dark ? 'dark' : 'light', this.lastError, h, { position: 'sibling-right' })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Manual Control Interface */}
        {this.enableManualControl && (
          <div class={`mt-4 p-3 border rounded-lg ${isVertical ? 'w-full max-w-xs' : ''} ${this.dark ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}>
            <h4 class={`text-sm font-medium mb-2 ${this.dark ? 'text-white' : 'text-gray-900'}`}>Manual Control</h4>
            <form onSubmit={this.handleManualSubmit} class="flex gap-2 items-center">
              <input
                type="number"
                min={this.min}
                max={this.max}
                step={this.step}
                value={this.manualInputValue}
                disabled={isDisabled}
                class={`flex-1 px-2 py-1 text-sm border rounded ${this.dark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onInput={this.handleManualInput}
                placeholder="Enter value"
              />
              <button
                type="submit"
                disabled={isDisabled}
                class={`px-3 py-1 text-sm font-medium rounded transition-colors ${isDisabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary-dark'}`}
              >Set</button>
            </form>
          </div>
        )}
        
        {/* Timestamp only (Status indicator moved to value display) */}
        {this.showLastUpdated && (
          <div class="flex justify-end mt-2">
            {StatusIndicator.renderTimestamp(this.lastUpdatedTs ? new Date(this.lastUpdatedTs) : null, this.dark ? 'dark' : 'light', h)}
          </div>
        )}
      </div>
    );
  }
}
