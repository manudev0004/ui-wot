import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types'; // Standard message format
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator'; // Status indicator utility

/**
 * A versatile slider component designed for WoT device control and monitoring.
 *
 * It supports continuous value selection with multiple visual styles, orientations, and different thumb shapes.
 * Supports both interactive control and read-only monitoring modes with customizable ranges.
 *
 * @example Basic Usage
 * ```html
 * <ui-slider variant="narrow" value="50" label="Brightness"></ui-slider>
 * <ui-slider variant="wide" value="75" min="0" max="100"></ui-slider>
 * <ui-slider readonly="true" label="Sensor" show-last-updated="true"></ui-slider>
 * ```
 *
 * @example JS integration with node-wot browser bundle
 * ```javascript
 * const slider = document.getElementById('device-brightness');
 * const initialValue = Number(await (await thing.readProperty('brightness')).value());
 *
 * await slider.setValue(initialValue, {
 *   writeOperation: async value => {
 *     await thing.writeProperty('brightness', value);
 *   }
 * });
 * ```
 */
@Component({
  tag: 'ui-slider',
  styleUrl: 'ui-slider.css',
  shadow: true,
})
export class UiSlider {
  @Element() el: HTMLElement;

  // ============================== COMPONENT PROPERTIES ==============================

  /**
   * Visual style variant of the slider.
   * - narrow: Thin track with minimal styling (default)
   * - wide: Thicker track
   * - rainbow: Multi-color gradient track
   * - neon: Glowing effect styling
   * - stepped: Visual step indicators
   */
  @Prop() variant: 'narrow' | 'wide' | 'rainbow' | 'neon' | 'stepped' = 'narrow';

  /** Color theme for the active state matching to thingsweb theme */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /** Orientation of the slider */
  @Prop() orientation: 'horizontal' | 'vertical' = 'horizontal';

  /** Shape of the slider thumb */
  @Prop() thumbShape: 'circle' | 'square' | 'arrow' | 'triangle' | 'diamond' = 'circle';

  /** Enable dark mode theme styling when true */
  @Prop() dark: boolean = false;

  /** Current numeric value of the slider */
  @Prop({ mutable: true }) value: number = 0;

  /** Disable user interaction when true */
  @Prop() disabled: boolean = false;

  /** Read only mode, display value but prevent changes when true. Just to monitor changes*/
  @Prop({ mutable: true }) readonly: boolean = false;

  /** Text label displayed above the slider (optional) */
  @Prop() label?: string;

  /** Enable keyboard navigation so user can change value using 'Arrow Up' and 'Arrow Down' keys) when true */
  @Prop() keyboard: boolean = true;

  /** Show last updated timestamp below the component */
  @Prop() showLastUpdated: boolean = false;

  /** Show visual operation status indicators (loading, success, failed) right to the component */
  @Prop() showStatus: boolean = false;

  /** Connection state for read-only monitoring */
  @Prop({ mutable: true }) connected: boolean = true;

  /** Minimum allowed value (optional) */
  @Prop() min?: number = 0;

  /** Maximum allowed value (optional) */
  @Prop() max?: number = 100;

  /** Step increment/decrement amount (optional) */
  @Prop() step?: number = 1;

  // ============================== COMPONENT STATE ==============================

  /** Current operation status for visual feedback */
  @State() operationStatus: OperationStatus = 'idle';

  /** Error message from failed operations if any (optional) */
  @State() lastError?: string;

  /** Timestamp when value was last updated (optional) */
  @State() lastUpdatedTs?: number;

  /** Timestamp for read-only pulse animation (optional) */
  @State() readPulseTs?: number;

  /** Internal state holding the current displayed value */
  @State() private currentValue: number = 0;

  /** Internal state counter for timestamp re-rendering */
  @State() private timestampCounter: number = 0;

  /** Internal state to prevents infinite event loops while programmatic updates */
  @State() private suppressEvents: boolean = false;

  // ============================== PRIVATE PROPERTIES ==============================

  /** Tracks component initialization state to prevent early watchers*/
  private isInitialized: boolean = false;

  /** Timer for updating relative timestamps */
  private timestampUpdateTimer?: number;

  /** Stores API function from first initialization to use further for any user interactions */
  private storedWriteOperation?: (value: number) => Promise<any>;

  // ============================== EVENTS ==============================

  /**
   * Emitted when slider value changes through user interaction or setValue calls.
   * Contains the new value, previous value, timestamp, and source information.
   */
  @Event() valueMsg: EventEmitter<UiMsg<number>>;

  // ============================== PUBLIC METHODS ==============================

  /**
   * Set the slider value with optional device api and other options.
   *
   * This is the primary method for connecting slider to real devices.
   * It supports optimistic updates, error handling, and automatic retries.
   * Values are automatically clamped to the min/max range.
   *
   * @param value - The numeric value to set (will be clamped to min/max range)
   * @param options - Optional configuration options for the operation
   * @returns Promise resolving to true if successful, false if failed
   *
   * @example Basic Usage
   * ```javascript
   * const slider = document.querySelector('ui-slider');
   * await slider.setValue(50);    // Set to 50
   * await slider.setValue(75.5);  // Set to 75.5 (decimals supported)
   * ```
   *
   * @example JS integration with node-wot browser bundle
   * ```javascript
   * // Smart thermostat control
   * const thermostat = document.querySelector('#thermostat');
   *
   * await thermostat.setValue(72, {
   *   writeOperation: async value => {
   *     await thing.writeProperty('brightness', value);
   *   },
   *   optimistic: true,
   *   autoRetry: {
   *     attempts: 2,
   *     delay: 3000
   *   }
   * });
   * ```
   */
  @Method()
  async setValue(
    value: number,
    options?: {
      writeOperation?: (value: number) => Promise<any>;
      readOperation?: () => Promise<any>;
      optimistic?: boolean;
      autoRetry?: { attempts: number; delay: number };
      _isRevert?: boolean;
    },
  ): Promise<boolean> {
    const prevValue = this.currentValue;
    const clampedValue = Math.max(this.min, Math.min(this.max, value));

    // Clear any existing error state
    if (this.operationStatus === 'error' && !options?._isRevert) {
      StatusIndicator.applyStatus(this, 'idle');
      this.connected = true;
    }

    // Simple value update without other operations
    if (!options?.writeOperation && !options?.readOperation) {
      this.updateValue(clampedValue, prevValue);
      return true;
    }

    // If there is writeOperation store operation for future user interactions
    if (options.writeOperation && !options._isRevert) {
      this.storedWriteOperation = options.writeOperation;
      StatusIndicator.applyStatus(this, 'loading');

      try {
        // Update the value optimistically
        this.updateValue(clampedValue, prevValue, false);
        StatusIndicator.applyStatus(this, 'success');
        return true;
      } catch (error) {
        StatusIndicator.applyStatus(this, 'error', error?.message || 'Setup failed');
        return false;
      }
    }

    // Execute operation immediately if no options selected
    return this.executeOperation(clampedValue, prevValue, options);
  }

  /**
   * Get the current slider value with optional metadata.
   *
   * @param includeMetadata - Whether to include status, timestamp and other information
   * @returns Current value or detailed metadata object
   *
   */
  @Method()
  async getValue(includeMetadata: boolean = false): Promise<number | { value: number; lastUpdated?: number; status: string; error?: string }> {
    if (includeMetadata) {
      return {
        value: this.currentValue,
        lastUpdated: this.lastUpdatedTs,
        status: this.operationStatus,
        error: this.lastError,
      };
    }
    return this.currentValue;
  }

  /**
   * This method updates the value silently without triggering events.
   *
   * Use this for external data synchronization to prevent event loops.
   * Perfect for WebSocket updates or polling from remote devices.
   *
   * @param value - The numeric value to set silently
   *
   */
  @Method()
  async setValueSilent(value: number): Promise<void> {
    const clampedValue = Math.max(this.min, Math.min(this.max, value));
    this.updateValue(clampedValue, this.currentValue, false);
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
   * Useful to shows users when data has been refreshed from an external source.
   * The pulse automatically fades after 1.5 seconds.
   */
  @Method()
  async triggerReadPulse(): Promise<void> {
    if (this.readonly) {
      this.readPulseTs = Date.now();
      setTimeout(() => {
        if (this.readPulseTs && Date.now() - this.readPulseTs >= 1500) {
          // 1.5 seconds
          this.readPulseTs = undefined;
        }
      }, 1500);
    }
  }

  // ============================== LIFECYCLE METHODS ==============================

  /** Initialize component state from props */
  componentWillLoad() {
    const clampedValue = Math.max(this.min, Math.min(this.max, this.value));
    this.currentValue = clampedValue;
    this.isInitialized = true;
    if (this.showLastUpdated) this.startTimestampUpdater();
  }

  /** Show initial pulse for read-only components */
  componentDidLoad() {
    if (this.readonly) {
      setTimeout(() => (this.readPulseTs = Date.now()), 200);
    }
  }

  /** Clean up timers when component is removed */
  disconnectedCallback() {
    this.stopTimestampUpdater();
  }

  // ============================== WATCHERS ==============================

  /** Sync internal state when value prop changes externally */
  @Watch('value')
  watchValue(newVal: number) {
    if (!this.isInitialized) return;

    const clampedValue = Math.max(this.min, Math.min(this.max, newVal));
    if (this.currentValue !== clampedValue) {
      const prevValue = this.currentValue;
      this.currentValue = clampedValue;
      this.emitValueMsg(clampedValue, prevValue);
      if (this.readonly) this.readPulseTs = Date.now();
    }
  }

  // ============================== PRIVATE METHODS ==============================

  /**
   * This is the core state update method that handles value changes consistently.
   * It updates both internal state and external prop and also manages timestamps, and emits events (optional).
   */
  private updateValue(value: number, prevValue?: number, emitEvent: boolean = true): void {
    // Clamp value to min/max range
    const clampedValue = Math.max(this.min, Math.min(this.max, value));
    this.currentValue = clampedValue;
    this.value = clampedValue;
    this.lastUpdatedTs = Date.now();

    if (this.readonly) {
      this.readPulseTs = Date.now();
    }

    if (emitEvent && !this.suppressEvents) {
      this.emitValueMsg(clampedValue, prevValue);
    }
  }

  /** Executes stored operations with error handling and retry logic */
  private async executeOperation(value: number, prevValue: number, options: any): Promise<boolean> {
    const optimistic = options?.optimistic !== false;

    // Show new value immediately (if optimistic = true)
    if (optimistic && !options?._isRevert) {
      this.updateValue(value, prevValue);
    }

    StatusIndicator.applyStatus(this, 'loading');

    try {
      // Execute the API call
      if (options.writeOperation) {
        await options.writeOperation(value);
      } else if (options.readOperation) {
        await options.readOperation();
      }

      StatusIndicator.applyStatus(this, 'success');

      // Update value after successful operation, (if optimistic = false)
      if (!optimistic) {
        this.updateValue(value, prevValue);
      }

      return true;
    } catch (error) {
      StatusIndicator.applyStatus(this, 'error', error?.message || String(error) || 'Operation failed');

      // Revert optimistic changes if operation is not successful or has an error
      if (optimistic && !options?._isRevert) {
        this.updateValue(prevValue, value, false);
      }

      // Auto-retry
      if (options?.autoRetry && options.autoRetry.attempts > 0) {
        setTimeout(() => {
          this.setValue(value, {
            ...options,
            autoRetry: { ...options.autoRetry, attempts: options.autoRetry.attempts - 1 },
          });
        }, options.autoRetry.delay);
      }

      return false;
    }
  }

  /** Emits value change events with consistent UIMsg data structure */
  private emitValueMsg(value: number, prevValue?: number) {
    if (this.suppressEvents) return;
    this.valueMsg.emit({
      newVal: value,
      prevVal: prevValue,
      ts: Date.now(),
      source: this.el?.id || 'ui-slider',
      ok: true,
    });
  }

  /** Handles user click interactions */
  private handleChange = async (event: Event) => {
    if (this.disabled || this.readonly) return;

    const target = event.target as HTMLInputElement;
    const newValue = Number(target.value);
    const clampedValue = Math.max(this.min, Math.min(this.max, newValue));
    const prevValue = this.currentValue;

    // Execute stored writeOperation if available
    if (this.storedWriteOperation) {
      StatusIndicator.applyStatus(this, 'loading');
      this.updateValue(clampedValue, prevValue); // Optimistic update

      try {
        await this.storedWriteOperation(clampedValue);
        StatusIndicator.applyStatus(this, 'success');
      } catch (error) {
        StatusIndicator.applyStatus(this, 'error', error?.message || 'Operation failed');
        this.updateValue(prevValue, clampedValue, false); // Revert, no event
      }
    } else {
      StatusIndicator.applyStatus(this, 'error', 'No operation configured - setup may have failed');
    }
  };

  /** Handle keyboard navigation */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled || this.readonly || !this.keyboard) return;

    let newValue = this.currentValue;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        newValue = Math.min(this.max, this.currentValue + this.step);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        newValue = Math.max(this.min, this.currentValue - this.step);
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
        newValue = Math.min(this.max, this.currentValue + this.step * 10);
        break;
      case 'PageDown':
        event.preventDefault();
        newValue = Math.max(this.min, this.currentValue - this.step * 10);
        break;
      default:
        return;
    }

    const prev = this.currentValue;
    this.currentValue = newValue;
    this.value = newValue;
    this.lastUpdatedTs = Date.now();
    this.emitValueMsg(newValue, prev);
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

    if (this.readonly) {
      if (!this.connected) {
        return StatusIndicator.renderStatusBadge('error', 'Disconnected', h);
      }
      if (this.readPulseTs && Date.now() - this.readPulseTs < 1500) {
        return StatusIndicator.renderStatusBadge('success', 'Data received', h);
      }
      return StatusIndicator.renderStatusBadge('idle', 'Connected', h);
    }

    const status = this.operationStatus || 'idle';
    const message = this.lastError || (status === 'idle' ? 'Ready' : '');
    return StatusIndicator.renderStatusBadge(status, message, h);
  }

  /** Renders the last updated timestamp (with placeholder reservation) */
  private renderLastUpdated() {
    if (!this.showLastUpdated) return null;

    // render an invisible placeholder when lastUpdatedTs is missing.
    const lastUpdatedDate = this.lastUpdatedTs ? new Date(this.lastUpdatedTs) : null;
    return StatusIndicator.renderTimestamp(lastUpdatedDate, this.dark ? 'dark' : 'light', h);
  }

  /** Renders a small transient read pulse indicator next to readonly UI */
  private renderReadPulseIndicator() {
    if (!(this.readonly && this.readPulseTs && Date.now() - this.readPulseTs < 1500)) return null;
    return (
      <span class="ml-1 inline-flex items-center" part="readonly-pulse-sibling">
        <style>{`@keyframes ui-read-pulse { 0% { opacity: 0; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.05); } 100% { opacity: 0; transform: scale(1.2); } }`}</style>
        <span
          class="w-3 h-3 rounded-full shadow-md"
          title="Updated"
          aria-hidden="true"
          style={{ backgroundColor: 'var(--color-info)', animation: 'ui-read-pulse 1.4s ease-in-out forwards' } as any}
        ></span>
      </span>
    );
  }

  // ============================== STYLING HELPERS ==============================

  /** Get track styles */
  private getTrackStyle() {
    const isDisabled = this.disabled;
    const range = this.max - this.min || 1;
    const percentage = ((this.currentValue - this.min) / range) * 100;

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
      percentage,
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

  /** Readonly background classes derived from color and theme */
  private getReadonlyBg(): string {
    if (this.dark) {
      if (this.color === 'primary') return 'bg-gray-800 border-primary text-white';
      if (this.color === 'secondary') return 'bg-gray-800 border-secondary text-white';
      return 'bg-gray-800 border-gray-600 text-white';
    }

    if (this.color === 'primary') return 'bg-white border-primary text-primary';
    if (this.color === 'secondary') return 'bg-white border-secondary text-secondary';
    return 'bg-white border-gray-300 text-gray-900';
  }

  /** Readonly text color classes*/
  private getReadonlyText(): string {
    if (this.dark) return 'text-white';
    if (this.color === 'primary') return 'text-primary';
    if (this.color === 'secondary') return 'text-secondary';
    return 'text-gray-900';
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
              transform: 'translateX(-50%) translateY(1px)',
            }}
          ></div>,
        );
      } else {
        steps.push(
          <div
            key={i}
            class="absolute w-0.5 h-3 bg-gray-400"
            style={{
              left: `${percentage}%`,
              top: '50%',
              transform: 'translateX(-50%) translateY(-50%)',
            }}
          ></div>,
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
          <svg width="12" height="16" viewBox="0 0 12 16" class="absolute -translate-x-1.5">
            <path d="M8 3 L3 8 L8 13 Z" fill={thumbColor} stroke={strokeColor} stroke-width="1" />
          </svg>
          {/* Right pointing triangle */}
          <svg width="12" height="16" viewBox="0 0 12 16" class="absolute translate-x-1.5">
            <path d="M4 3 L9 8 L4 13 Z" fill={thumbColor} stroke={strokeColor} stroke-width="1" />
          </svg>
        </div>
      );
    }

    if (this.thumbShape === 'triangle') {
      return (
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg width="20" height="20" viewBox="0 0 20 20" class="absolute">
            <path d="M10 3 L17 15 L3 15 Z" fill={thumbColor} stroke={strokeColor} stroke-width="1" />
          </svg>
        </div>
      );
    }

    if (this.thumbShape === 'diamond') {
      return (
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg width="20" height="20" viewBox="0 0 20 20" class="absolute">
            <path d="M2 10 L10 2 L18 10 L10 18 Z" fill={thumbColor} stroke={strokeColor} stroke-width="1" />
          </svg>
        </div>
      );
    }

    return null;
  }

  // ============================== MAIN COMPONENT RENDER METHOD ==============================

  /**
   * Renders the complete toggle component with all features and styles.
   */
  render() {
    const trackStyles = this.getTrackStyle();
    const thumbStyle = this.getThumbStyle();
    const isDisabled = this.disabled;
    const isVertical = this.orientation === 'vertical';
    const isReadOnly = this.readonly;
    const safeRange = this.max - this.min || 1;
    const percent = ((this.currentValue - this.min) / safeRange) * 100;

    return (
      <div class={isVertical ? 'flex flex-col items-center w-20 mx-4 mb-4' : 'w-full'} part="container">
        {/* Label only for horizontal sliders */}
        {this.label && !isVertical && (
          <label class={`block text-sm font-medium mb-4 ${isDisabled ? 'text-gray-400' : ''} ${this.dark ? 'text-white' : 'text-gray-900'}`} part="label">
            {this.label}
          </label>
        )}
        {/* Value labels for vertical sliders */}
        {isVertical && (
          <div class={`text-xs mb-4 text-center ${this.dark ? 'text-gray-300' : 'text-gray-500'}`}>
            <span>{this.max}</span>
          </div>
        )}
        {/* Read-only UI */}
        {isReadOnly ? (
          <>
            <div
              class={`relative flex items-center justify-center min-w-[120px] h-12 px-4 mr-20 rounded-lg border transition-all duration-300 ${this.getReadonlyBg()}
            `}
              title={`Read-only value: ${this.currentValue}`}
              part="readonly-indicator"
            >
              <span class={`text-lg font-medium ${this.getReadonlyText()}`}>{this.currentValue}</span>
              {/* Status badge positioned to the right, space reserved via mr-20 */}
              {this.showStatus && <div class="absolute left-full ml-2 top-1/2 -translate-y-1/2 flex items-center">{this.renderStatusBadge()}</div>}
            </div>
            {/* Read-only indicator */}
            {this.renderReadPulseIndicator()}
          </>
        ) : (
          <div
            class={isVertical ? 'relative flex flex-col items-center justify-center' : 'relative'}
            style={isVertical ? { height: '12rem', width: '1.5rem' } : {}}
            tabIndex={isDisabled ? -1 : 0}
            onKeyDown={this.handleKeyDown}
          >
            <div class={trackStyles.track}>
              {this.variant !== 'rainbow' && (
                <div
                  class={`${trackStyles.progress} ${trackStyles.progressSize}`}
                  style={isVertical ? { height: `${percent}%`, bottom: '0', left: '0', position: 'absolute', width: '100%' } : { width: `${percent}%`, height: '100%' }}
                ></div>
              )}
              {this.renderStepMarks()}
            </div>
            <input
              type="range"
              min={this.min}
              max={this.max}
              step={this.step}
              value={this.currentValue}
              disabled={isDisabled}
              class={`absolute inset-0 ${isVertical ? 'slider-vertical' : 'w-full h-full'} opacity-0 cursor-pointer z-10 ${isDisabled ? 'cursor-not-allowed' : ''}`}
              style={isVertical ? { writingMode: 'bt-lr', height: '100%', width: '100%' } : {}}
              onInput={e => this.handleChange(e)}
              onKeyDown={this.handleKeyDown}
              tabIndex={isDisabled ? -1 : 0}
            />
            <div
              class={`absolute ${isVertical ? 'left-1/2 -translate-x-1/2' : 'top-1/2 -translate-y-1/2 -translate-x-1/2'} ${thumbStyle} ${
                isDisabled ? 'opacity-50' : ''
              } pointer-events-none z-0`}
              style={isVertical ? { bottom: `calc(${percent}% - 0.5rem)` } : { left: `${percent}%` }}
            >
              {this.renderCustomThumb()}
            </div>
          </div>
        )}
        {/* Value labels for vertical */}
        {isVertical && (
          <div class={`flex flex-col items-center mt-4 space-y-2 text-xs ${this.dark ? 'text-gray-300' : 'text-gray-500'}`} style={{ marginBottom: '1.5rem' }}>
            <span>{this.min}</span>
            {!isReadOnly ? (
              <div class="relative flex justify-center">
                {/* Value box centered to slider */}
                <div
                  class={`px-2 py-1 rounded text-center font-medium border text-xs min-w-8 ${
                    this.dark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                  } shadow-sm`}
                >
                  {this.currentValue}
                </div>
                {/* Status indicator positioned absolutely */}
                {this.showStatus && <div class="absolute left-full ml-1 top-0 flex items-center h-full">{this.renderStatusBadge()}</div>}
              </div>
            ) : null}
            {this.label && (
              <span class="text-xs font-medium text-center mt-1 mb-2" part="label">
                {this.label}
              </span>
            )}
          </div>
        )}
        {/* Horizontal value labels*/}
        {!isVertical && (
          <>
            <div class={`flex justify-between items-center text-xs mt-3 ${this.dark ? 'text-gray-300' : 'text-gray-500'}`}>
              <span>{this.min}</span>
              <span>{this.max}</span>
            </div>
            {!isReadOnly && (
              <div class="relative flex justify-center mt-0">
                {/* Value box centered */}
                <div
                  class={`px-2 py-1 rounded text-center font-medium border text-xs min-w-8 ${
                    this.dark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                  } shadow-sm`}
                  style={{ display: 'inline-block' }}
                >
                  {this.currentValue}
                </div>
                {/* Status indicator positioned*/}
                {this.showStatus && <div class="absolute left-full ml-2 top-0 flex items-center h-full">{this.renderStatusBadge()}</div>}
              </div>
            )}
          </>
        )}

        {/* Last updated timestamp */}
        {this.showLastUpdated && <div class="flex justify-center mt-2">{this.renderLastUpdated()}</div>}
      </div>
    );
  }
}
