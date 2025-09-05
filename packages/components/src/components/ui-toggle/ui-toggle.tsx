import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { StatusIndicator } from '../../utils/status-indicator';
import { 
  UiComponentUtils, 
  UiComponentMethods, 
  SetValueOptions, 
  OperationStatus 
} from '../../utils/ui-mixins';

/**
 * Toggle switch component with reactive state management and multiple visual styles.
 * Supports IoT device integration with status indicators and error handling.
 *
 * @example Basic Usage
 * ```html
 * <ui-toggle variant="circle" value="true" label="Light"></ui-toggle>
 * <ui-toggle variant="neon" value="false" label="Fan"></ui-toggle>
 * <ui-toggle readonly="true" label="Sensor" show-last-updated="true"></ui-toggle>
 * ```
 *
 * @example JavaScript Integration
 * ```javascript
 * const toggle = document.getElementById('light-toggle');
 *
 * // Set value with event handling
 * await toggle.setValue(true);
 *
 * // Listen for changes
 * toggle.addEventListener('valueMsg', (e) => {
 *   console.log('Toggle changed to:', e.detail.payload);
 * });
 *
 * // Device communication (IoT)
 * await toggle.setValue(true, {
 *   writeOperation: async () => {
 *     await fetch('/api/devices/light/power', {
 *       method: 'POST',
 *       body: JSON.stringify({ on: true })
 *     });
 *   },
 *   optimistic: true
 * });
 * ```
 */
@Component({
  tag: 'ui-toggle',
  styleUrl: 'ui-toggle.css',
  shadow: true,
})
export class UiToggle implements UiComponentMethods<boolean> {
  @Element() el: HTMLElement;

  // Shared state using utility pattern
  @State() operationStatus: OperationStatus = 'idle';
  @State() lastError?: string;
  @State() lastUpdatedTs?: number;
  @State() timestampCounter: number = 0;
  @State() readPulseTs?: number;
  @State() connected: boolean = true;

  // Component-specific props

  /**
   * Visual style variant of the toggle.
   * - circle: Common pill-shaped toggle (default)
   * - square: Rectangular toggle with square thumb
   * - apple: iOS-style switch (bigger size, rounded edges)
   * - cross: Shows × when off, ✓ when on with red background when off and green when on
   * - neon: Glowing effect when active
   */
  @Prop() variant: 'circle' | 'square' | 'apple' | 'cross' | 'neon' = 'circle';

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
   * Current boolean value of the toggle.
   */
  @Prop({ mutable: true }) value: boolean = false;

  /**
   * Whether the toggle is disabled when true, it cannot be interacted with.
   */
  @Prop() disabled: boolean = false;

  /**
   * Whether the toggle is read-only (when true displays value but cannot be changed).
   */
  @Prop({ mutable: true }) readonly: boolean = false;

  /**
   * Text label displayed next to the toggle.
   */
  @Prop() label?: string;

  /**
   * Enable keyboard navigation (Space and Enter keys).
   * Default: true
   */
  @Prop() keyboard: boolean = true;

  /**
   * Show last updated timestamp when true
   */
  @Prop() showLastUpdated: boolean = false;

  // Component-specific state
  @State() private isActive: boolean = false;
  @State() private isInitialized: boolean = false;

  // Timer for timestamp updates
  private timestampTimer?: number;

  // Event emitter
  @Event() valueMsg: EventEmitter<UiMsg<boolean>>;

  // Implement UiComponentMethods interface
  getComponentTag(): string {
    return 'ui-toggle';
  }

  updateInternalValue(value: boolean): void {
    this.isActive = value;
    this.value = value;
  }

  getCurrentValue(): boolean {
    return this.isActive;
  }

  // Public API methods
  @Method()
  async setValue(value: boolean, options?: SetValueOptions): Promise<boolean> {
    const prevValue = this.getCurrentValue();
    
    // Simple value setting (no operation)
    if (!options?.writeOperation && !options?.readOperation) {
      this.updateInternalValue(value);
      this.lastUpdatedTs = Date.now();
      if (this.readonly) UiComponentUtils.triggerReadPulse(this);
      UiComponentUtils.emitValueChange(this.valueMsg, this.getComponentTag(), value, prevValue);
      return true;
    }
    
    // Delegate complex operations to utility
    return UiComponentUtils.performValueOperation(this, value, this.valueMsg, options);
  }

  @Method()
  async getValue(): Promise<boolean> {
    return this.getCurrentValue();
  }

  @Method()
  async setValueSilent(value: boolean): Promise<void> {
    this.updateInternalValue(value);
    this.lastUpdatedTs = Date.now();
    if (this.readonly) UiComponentUtils.triggerReadPulse(this);
  }

  @Method()
  async setStatus(status: OperationStatus, errorMessage?: string): Promise<void> {
    UiComponentUtils.setOperationStatus(this, status, errorMessage);
  }

  @Method()
  async triggerReadPulse(): Promise<void> {
    if (this.readonly) UiComponentUtils.triggerReadPulse(this);
  }

  // Render status badge
  private renderStatusBadge() {
    if (this.readonly) {
      if (!this.connected) {
        return StatusIndicator.renderStatusBadge('error', 'light', 'Disconnected', h);
      }
      if (this.readPulseTs && Date.now() - this.readPulseTs < 1500) {
        return StatusIndicator.renderStatusBadge('success', 'light', 'Data received', h);
      }
      return null;
    }
    return StatusIndicator.renderStatusBadge(this.operationStatus, 'light', this.lastError || '', h);
  }

  // Component lifecycle
  componentWillLoad() {
    this.isActive = Boolean(this.value);
    this.isInitialized = true;
    if (this.showLastUpdated) {
      this.timestampTimer = UiComponentUtils.startTimestampUpdater(this);
    }
  }

  componentDidLoad() {
    if (this.readonly) {
      setTimeout(() => (this.readPulseTs = Date.now()), 200);
    }
  }

  disconnectedCallback() {
    if (this.timestampTimer) {
      clearInterval(this.timestampTimer);
    }
  }

  // Watch for value prop changes
  @Watch('value')
  watchValue(newVal: boolean) {
    if (!this.isInitialized) return;

    if (this.isActive !== newVal) {
      const prevValue = this.isActive;
      this.isActive = newVal;
      UiComponentUtils.emitValueChange(this.valueMsg, this.getComponentTag(), newVal, prevValue);
      if (this.readonly) this.readPulseTs = Date.now();
    }
  }

  // Event handling
  private handleToggle = () => {
    if (this.disabled || this.readonly) return;
    const newValue = !this.isActive;
    this.isActive = newValue;
    this.value = newValue;
    this.lastUpdatedTs = Date.now();
    UiComponentUtils.emitValueChange(this.valueMsg, this.getComponentTag(), newValue, !newValue);
  };  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled || this.readonly || !this.keyboard) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.handleToggle();
    }
  };

  /** Styling helpers */
  private getToggleStyle(): string {
    const { variant, disabled } = this;

    const sizeMap = {
      apple: 'w-11 h-7',
      default: 'w-12 h-6',
    };

    const shapeMap = {
      square: 'rounded-md',
      apple: 'rounded-full shadow-inner border-2 border-gray-500',
      default: 'rounded-full',
    };

    const size = sizeMap[variant] || sizeMap.default;
    const shape = shapeMap[variant] || shapeMap.default;
    const disabledClass = disabled ? 'disabled-state' : '';

    return `relative inline-block cursor-pointer transition-all duration-300 ease-in-out ${size} ${shape} ${disabledClass}`.trim();
  }

  private getThumbStyle(): string {
    const { variant, isActive } = this;

    if (variant === 'apple') {
      const movement = isActive ? 'translate-x-4' : 'translate-x-0';
      return `absolute w-6 h-6 bg-white transition-all duration-200 ease-in-out shadow-md rounded-full top-0 left-0 ${movement}`;
    }

    const shape = variant === 'square' ? 'rounded-sm' : 'rounded-full';
    const position = variant === 'neon' ? 'top-0.5 left-1' : 'top-1 left-1';
    const movement = isActive ? 'translate-x-6' : 'translate-x-0';

    return `absolute w-4 h-4 bg-white transition-transform duration-300 ease-in-out shadow-sm ${shape} ${position} ${movement}`;
  }

  private getBackgroundColor(): string {
    const { color, variant, isActive } = this;

    if (color === 'neutral') return isActive ? 'var(--color-neutral)' : '#d1d5db';
    if (variant === 'cross') return isActive ? this.getActiveColor() : 'var(--color-danger)';
    if (variant === 'apple') return isActive ? 'var(--color-success)' : '#374151';
    if (variant === 'neon') return isActive ? this.getNeonColor() : 'var(--color-danger)';

    return isActive ? this.getActiveColor() : '#d1d5db';
  }

  /** Get active color using CSS variables */
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

  /** Get neon color using CSS variables */
  private getNeonColor(): string {
    return this.color === 'secondary' ? 'var(--color-secondary)' : 'var(--color-primary)';
  }

  /** Render cross/tick icons for cross variant */
  private renderCrossIcons() {
    if (this.variant !== 'cross') return null;
    return (
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        {!this.isActive ? (
          <div class="absolute top-0 right-0 w-6 h-6 flex items-center justify-center">
            <span class="text-white text-xl font-bold">×</span>
          </div>
        ) : (
          <div class="absolute top-0 left-0 w-6 h-6 flex items-center justify-center">
            <span class="text-white text-lg font-bold">✓</span>
          </div>
        )}
      </div>
    );
  }

    /** Render timestamp */
  private renderTimestamp() {
    if (!this.showLastUpdated || !this.lastUpdatedTs) return null;
    return StatusIndicator.renderTimestamp(new Date(this.lastUpdatedTs), this.dark ? 'dark' : 'light', h);
  }

  /** Render the component */
  render() {
    const canInteract = !this.disabled && !this.readonly;
    const hoverTitle = this.readonly
      ? 'Read-only mode - Value reflects external state'
      : this.disabled
      ? 'Toggle is disabled'
      : `Click to ${this.isActive ? 'turn off' : 'turn on'}${this.label ? ` ${this.label}` : ''}`;

    return (
      <div class="inline-block" part="container" role="group" aria-label={this.label || 'Toggle'}>
        <div class="inline-flex items-center space-x-2 relative">
          {/* Label */}
          <slot name="label">
            {this.label && (
              <label
                class={`select-none mr-2 transition-colors duration-200 ${!canInteract ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer hover:text-opacity-80'} ${
                  this.dark ? 'text-white' : 'text-gray-900'
                }`}
                onClick={() => canInteract && this.handleToggle()}
                title={hoverTitle}
                part="label"
              >
                {this.label}
              </label>
            )}
          </slot>

          {/* Toggle control */}
          {this.readonly ? (
            <span
              class={`inline-flex items-center justify-center transition-all duration-300 ${
                this.variant === 'square' ? 'w-6 h-6 rounded-md' : this.variant === 'apple' ? 'w-7 h-7 rounded-full' : 'w-6 h-6 rounded-full'
              }`}
              style={{
                backgroundColor: this.isActive ? 'var(--color-success)' : 'var(--color-danger)',
                boxShadow: this.isActive ? '0 10px 15px -3px rgba(34, 197, 94, 0.5)' : '0 10px 15px -3px rgba(239, 68, 68, 0.5)',
              }}
              title={`${hoverTitle} - Current state: ${this.isActive ? 'ON' : 'OFF'}`}
              part="readonly-indicator"
            >
              <span class={`text-white text-xs font-bold ${this.variant === 'square' ? 'text-[10px]' : ''}`}>
                {this.variant === 'square' ? (this.isActive ? '■' : '□') : this.isActive ? '●' : '○'}
              </span>
            </span>
          ) : (
            <span
              class={`${this.getToggleStyle()} ${canInteract ? 'hover:shadow-md' : ''} transition-all duration-200`}
              style={{ backgroundColor: this.getBackgroundColor() }}
              onClick={() => canInteract && this.handleToggle()}
              onKeyDown={this.handleKeyDown}
              tabIndex={canInteract ? 0 : -1}
              title={hoverTitle}
              part="control"
              role="switch"
              aria-checked={this.isActive ? 'true' : 'false'}
              aria-disabled={this.disabled ? 'true' : 'false'}
            >
              <span class={this.getThumbStyle()} part="thumb"></span>
              {this.renderCrossIcons()}
            </span>
          )}

          {/* Read pulse indicator */}
          {this.readonly && this.readPulseTs && Date.now() - this.readPulseTs < 1500 && (
            <span class="ml-1 flex items-center" part="readonly-pulse-sibling">
              <span
                class="w-3 h-3 rounded-full shadow-md"
                title="Updated"
                aria-hidden="true"
                style={{
                  backgroundColor: 'var(--color-info)',
                  animation: 'ui-read-pulse 1.4s ease-in-out forwards',
                }}
              ></span>
            </span>
          )}

          {/* Status badge */}
          {this.renderStatusBadge()}
        </div>

        {/* Last updated timestamp */}
        {this.renderTimestamp()}
      </div>
    );
  }

  // Implementation of BaseUiMethods interface

  // Helper methods for utility functions (interfaces requirements)
  updateValue(value: boolean): void {
    this.isActive = value;
    this.value = value;
  }

  isReadonly(): boolean {
    return this.readonly;
  }

  clearConnectionError(): void {
    this.connected = true;
  }

  getReadPulseTimestamp(): number | undefined {
    return this.readPulseTs;
  }

  setReadPulseTimestamp(timestamp: number | undefined): void {
    this.readPulseTs = timestamp;
  }
}
