import { Component, Prop, State, h, Event, EventEmitter, Watch, Element, Method } from '@stencil/core';
import { UiMsg } from '../../utils/types';

/**
 * Advanced toggle switch component with reactive state management and multiple visual styles.
 *
 * @example Basic Usage
 * ```html
 * <ui-toggle variant="circle" value="true" label="Light"></ui-toggle>
 * ```
 *
 * @example Different Variants
 * ```html
 * <ui-toggle variant="apple" value="false" label="iOS Style"></ui-toggle>
 * <ui-toggle variant="square" value="true" label="Square Style"></ui-toggle>
 * <ui-toggle variant="cross" value="false" label="Cross/Tick Style"></ui-toggle>
 * <ui-toggle variant="neon" value="true" label="Neon Glow"></ui-toggle>
 * ```
 *
 * @example Read-Only Mode
 * ```html
 * <ui-toggle readonly="true" value="false" label="Sensor Status"></ui-toggle>
 * ```
 *
 * @example JavaScript Integration with Multiple Toggles
 * ```javascript
 * // For single toggle
 * const toggle = document.querySelector('#my-toggle');
 *
 * // For multiple toggles
 * const toggles = document.querySelectorAll('ui-toggle');
 * toggles.forEach(toggle => {
 *   toggle.addEventListener('valueMsg', (e) => {
 *     console.log('Toggle ID:', e.detail.source);
 *     console.log('New value:', e.detail.payload);
 *   });
 * });
 *
 * // Set value by ID
 * const lightToggle = document.getElementById('light-toggle');
 * await lightToggle.setValue(true);
 * ```
 *
 * @example HTML with IDs
 * ```html
 * <ui-toggle id="light-toggle" label="Light" variant="circle"></ui-toggle>
 * <ui-toggle id="fan-toggle" label="Fan" variant="apple"></ui-toggle>
 * ```
 */
@Component({
  tag: 'ui-toggle',
  styleUrl: 'ui-toggle.css',
  shadow: true,
})
export class UiToggle {
  @Element() el: HTMLElement;

  /** Component props */

  /**
   * Visual style variant of the toggle.
   */
  @Prop() variant: 'circle' | 'square' | 'apple' | 'cross' | 'neon' = 'circle';

  /**
   * Current boolean value of the toggle.
   */
  @Prop({ mutable: true }) value: boolean = false;

  /**
   * Whether the toggle is disabled (cannot be interacted with).
   */
  @Prop() disabled: boolean = false;

  /**
   * Whether the toggle is read-only (displays value but cannot be changed).
   */
  @Prop({ mutable: true }) readonly: boolean = false;

  /**
   * Text label displayed next to the toggle.
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
   * Enable keyboard navigation (Space and Enter keys).
   * Default: true
   */
  @Prop() keyboard: boolean = true;

  /** Internal state tracking current visual state */
  @State() private isActive: boolean = false;

  /** Internal state for tracking if component is initialized */
  @State() private isInitialized: boolean = false;

  /** Operation status for write mode indicators */
  @State() operationStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  @State() lastError?: string;
  /** Timestamp of last read pulse (readonly updates) */
  @State() readPulseTs?: number;
  /** Connection state for readonly mode */
  @Prop({ mutable: true }) connected: boolean = true;

  /** Simple status methods */
  @Method()
  async startWriteOperation(): Promise<void> {
    this.operationStatus = 'loading';
  }

  @Method()
  async finishWriteOperation(success: boolean, errorMsg?: string): Promise<void> {
    this.operationStatus = success ? 'success' : 'error';
    this.lastError = success ? undefined : (errorMsg || 'Operation failed');
    if (success) {
      // Clear success status after short delay
      setTimeout(() => { 
        if (this.operationStatus === 'success') this.operationStatus = 'idle'; 
      }, 1200);
    }
    // Keep error state persistent - don't auto-clear
  }

  @Method()
  async markReadUpdate(): Promise<void> {
    this.readPulseTs = Date.now();
  }

  @Method()
  async clearErrorState(): Promise<void> {
    // Only clear if currently in error state, don't override success/loading
    if (this.operationStatus === 'error') {
      this.operationStatus = 'idle';
    }
    this.lastError = undefined;
    this.connected = true;
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
      const active = this.readPulseTs && (Date.now() - this.readPulseTs < 1200);
      if (active) {
        return <span style={{position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '4px'}}>
          <span style={{position: 'absolute', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#60a5fa', opacity: '0.75', animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite'}}></span>
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
   * Primary event emitted when the toggle value changes.
   */
  @Event() valueMsg: EventEmitter<UiMsg<boolean>>;

  /**
   * Set the toggle value programmatically.
   * @param value - The new boolean value
   * @returns Promise that resolves to true if successful
   */
  @Method()
  async setValue(value: boolean): Promise<boolean> {
    // Store previous value for potential revert
    const prevValue = this.isActive;
    
    // If in error state, show loading when user tries to interact
    if (this.operationStatus === 'error' && !this.readonly) {
      this.startWriteOperation();
    }
    
    this.isActive = value;
    this.value = value;

    // Emit the unified message event
    this.emitValueMsg(value, prevValue);

    return true;
  }

  /**
   * Revert toggle to previous value (used when write fails)
   */
  @Method()
  async revertValue(prevValue: boolean): Promise<void> {
    this.isActive = prevValue;
    this.value = prevValue;
  }

  /**
   * Get the current toggle value.
   * @returns Promise that resolves to the current boolean value
   */
  @Method()
  async getValue(): Promise<boolean> {
    return this.isActive;
  }

  /** Initialize component state from props */
  componentWillLoad() {
    this.isActive = Boolean(this.value);
    this.isInitialized = true;
  }

  /** Watch for value prop changes and update internal state */
  @Watch('value')
  watchValue(newVal: boolean) {
    if (!this.isInitialized) return;

    if (this.isActive !== newVal) {
      const prevValue = this.isActive;
      this.isActive = newVal;
      this.emitValueMsg(newVal, prevValue);
    }
  }

  /** Emit the unified UiMsg event */
  private emitValueMsg(value: boolean, prevValue?: boolean) {
    // Primary unified event
    const msg: UiMsg<boolean> = {
      payload: value,
      prev: prevValue,
      ts: Date.now(),
      source: this.el?.id || 'ui-toggle',
      ok: true,
    };
    this.valueMsg.emit(msg);
  }

  /** Handle toggle click */
  private handleToggle = () => {
    if (this.disabled || this.readonly) return;

    const newValue = !this.isActive;
    this.setValue(newValue);
  };

  /** Handle keyboard navigation */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled || this.readonly || !this.keyboard) return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.handleToggle();
    }
  };

  /** Get toggle background style classes - enhanced from old component */
  private getToggleStyle(): string {
    const isDisabled = this.disabled;
    const isActive = this.isActive;

    // Different sizes based on variant
    let size = 'w-12 h-6'; // default
    if (this.variant === 'apple') size = 'w-11 h-7';

    // Different shapes based on variant
    let shape = 'rounded-full';
    if (this.variant === 'square') shape = 'rounded-md';
    if (this.variant === 'apple') shape = 'rounded-full shadow-inner border-2 border-gray-500';

    // Background color logic from old component
    let bgColor = 'bg-gray-300';

    if (this.color === 'neutral') {
      bgColor = isActive ? 'bg-gray-500' : 'bg-gray-300';
    } else if (this.variant === 'cross') {
      bgColor = isActive ? this.getActiveColor() : 'bg-red-500';
    } else if (this.variant === 'apple') {
      bgColor = isActive ? 'bg-green-500' : 'bg-gray-700';
    } else if (this.variant === 'neon') {
      bgColor = isActive ? this.getNeonColor() : 'neon-red';
    } else if (isActive) {
      bgColor = this.getActiveColor();
    }

    const disabled = isDisabled ? 'disabled-state' : '';
    const base = 'relative inline-block cursor-pointer transition-all duration-300 ease-in-out';

    return `${base} ${size} ${shape} ${bgColor} ${disabled}`.trim();
  }

  /** Get thumb style classes - enhanced from old component */
  private getThumbStyle(): string {
    const isActive = this.isActive;

    // Apple variant special handling
    if (this.variant === 'apple') {
      const baseStyle = 'absolute w-6 h-6 bg-white transition-all duration-200 ease-in-out shadow-md rounded-full top-0 left-0';
      const movement = isActive ? 'translate-x-4' : 'translate-x-0';
      return `${baseStyle} ${movement}`;
    }

    // Standard thumb styling
    const baseStyle = 'absolute w-4 h-4 bg-white transition-transform duration-300 ease-in-out shadow-sm';
    const shape = this.variant === 'square' ? 'rounded-sm' : 'rounded-full';

    let position = 'top-1 left-1';
    if (this.variant === 'neon') {
      position = 'top-0.5 left-1';
    }

    const movement = isActive ? 'translate-x-6' : 'translate-x-0';

    return `${baseStyle} ${shape} ${position} ${movement}`;
  }

  /** Get active color class based on color prop */
  private getActiveColor(): string {
    const colorMap = {
      primary: 'bg-primary',
      secondary: 'bg-secondary',
      neutral: 'bg-gray-500',
      // legacy alias used in some demos
      success: 'bg-green-500',
    };
    return colorMap[this.color] || 'bg-primary';
  }

  /** Get neon color class */
  private getNeonColor(): string {
    return this.color === 'secondary' ? 'neon-secondary' : 'neon-primary';
  }

  /** Render cross/tick icons for cross variant - from old component */
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

  /** Render the component */
  render() {
    const canInteract = !this.disabled && !this.readonly;

    // Tooltip text
    let hoverTitle = '';
    if (this.readonly) {
      hoverTitle = 'Read-only mode - Value reflects external state';
    } else if (this.disabled) {
      hoverTitle = 'Toggle is disabled';
    } else {
      hoverTitle = `Click to ${this.isActive ? 'turn off' : 'turn on'}${this.label ? ` ${this.label}` : ''}`;
    }

    return (
      <div class="inline-flex items-center space-x-2" part="container">
        {/* Label slot or prop */}
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
          // Read-only indicator respecting variant styling
          <span
            class={`inline-flex items-center justify-center transition-all duration-300 ${
              this.variant === 'square' ? 'w-6 h-6 rounded-md' : this.variant === 'apple' ? 'w-7 h-7 rounded-full' : 'w-6 h-6 rounded-full'
            } ${this.isActive ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-red-500 shadow-lg shadow-red-500/50'}`}
            title={`${hoverTitle} - Current state: ${this.isActive ? 'ON' : 'OFF'}`}
            part="readonly-indicator"
          >
            <span class={`text-white text-xs font-bold ${this.variant === 'square' ? 'text-[10px]' : ''}`}>
              {this.variant === 'square' ? (this.isActive ? '■' : '□') : this.isActive ? '●' : '○'}
            </span>
          </span>
        ) : (
          // Interactive toggle - using enhanced styling from old component
          <span
            class={`${this.getToggleStyle()} ${
              canInteract ? 'hover:shadow-md' : ''
            } transition-all duration-200`}
            onClick={() => canInteract && this.handleToggle()}
            onKeyDown={this.handleKeyDown}
            tabIndex={canInteract ? 0 : -1}
            title={hoverTitle}
            part="control"
          >
            <span class={this.getThumbStyle()} part="thumb"></span>
            {this.renderCrossIcons()}
          </span>
        )}
  {/* Status badge placed to the right of the control */}
  {this.renderStatusBadge()}
      </div>
    );
  }
}
