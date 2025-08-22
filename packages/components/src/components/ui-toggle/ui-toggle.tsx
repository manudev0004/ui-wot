import { Component, Prop, State, h, Event, EventEmitter, Watch, Element, Method } from '@stencil/core';
import { UiMsg } from '../../utils/types';

/** @deprecated Use UiMsg<boolean> instead */
export interface UiToggleToggleEvent { active: boolean }
/** @deprecated Use UiMsg<boolean> instead */
export interface UiToggleValueChange { value: boolean; label?: string }

/**
 * Advanced toggle switch component with reactive state management and multiple visual styles.
 * Provides accessibility features, flexible event handling, and beautiful UI variants.
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
 * @example JavaScript Integration
 * ```javascript
 * const toggle = document.querySelector('ui-toggle');
 * 
 * // Listen for value changes (preferred)
 * toggle.addEventListener('valueMsg', (e) => {
 *   console.log('New value:', e.detail.payload);
 *   console.log('Previous:', e.detail.prev);
 *   console.log('Timestamp:', e.detail.ts);
 * });
 * 
 * // Programmatically set value
 * await toggle.setValue(true);
 * 
 * // Get current value
 * const currentValue = await toggle.getValue();
 * ```
 *
 * <!-- @deprecated The following events are deprecated, use valueMsg instead
 * @example Legacy Events (Deprecated)
 * ```javascript
 * // DON'T USE - Deprecated events
 * toggle.addEventListener('valueChange', (e) => {
 *   console.log('Legacy value change:', e.detail.value);
 * });
 * 
 * toggle.addEventListener('toggle', (e) => {
 *   console.log('Legacy toggle:', e.detail.active);
 * });
 * ```
 * -->
 */
@Component({
  tag: 'ui-toggle',
  styleUrl: 'ui-toggle.css',
  shadow: true,
})
export class UiToggle {
  @Element() hostElement: HTMLElement;

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
  @Prop() readonly: boolean = false;

  /**
   * Legacy mode prop for backward compatibility with older demos.
   * Accepts 'read' to indicate read-only mode, 'readwrite' for interactive.
   */
  @Prop() mode?: 'read' | 'readwrite';

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

  /**
   * Primary event emitted when the toggle value changes.
   * Use this event for all value change handling.
   */
  @Event() valueMsg: EventEmitter<UiMsg<boolean>>;

  // /** @deprecated Use valueMsg instead */
  // @Event() valueChange: EventEmitter<UiToggleValueChange>;

  // /** @deprecated Use valueMsg instead */
  // @Event() toggle: EventEmitter<UiToggleToggleEvent>;

  /**
   * Set the toggle value programmatically.
   * @param value - The new boolean value
   * @returns Promise that resolves to true if successful
   */
  @Method()
  async setValue(value: boolean): Promise<boolean> {
    const prevValue = this.isActive;
    this.isActive = value;
    this.value = value;
    
    // Emit the unified message event
    this.emitValueMsg(value, prevValue);
    
    return true;
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
    // Support legacy `mode="read"` used across the demos/docs
    if (!this.readonly && this.mode === 'read') {
      this.readonly = true;
    }
    this.isInitialized = true;
  }

  @Watch('mode')
  watchMode(newMode?: 'read' | 'readwrite') {
    if (newMode === 'read') {
      this.readonly = true;
    } else if (newMode === 'readwrite') {
      this.readonly = false;
    }
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

  /** Emit the unified UiMsg event and legacy events for backward compatibility */
  private emitValueMsg(value: boolean, prevValue?: boolean) {
    // Primary unified event
    const msg: UiMsg<boolean> = {
      payload: value,
      prev: prevValue,
      ts: Date.now(),
      source: this.hostElement?.id || 'ui-toggle',
      ok: true
    };
    this.valueMsg.emit(msg);

    // Legacy events commented out - use valueMsg instead
    // this.valueChange.emit({ value, label: this.label });
    // this.toggle.emit({ active: value });
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
      success: 'bg-green-500'
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
      <div class="inline-flex items-center space-x-3" part="container">
        {/* Label slot or prop */}
        <slot name="label">
          {this.label && (
            <label
              class={`select-none mr-2 transition-colors duration-200 ${
                !canInteract 
                  ? 'cursor-not-allowed text-gray-400' 
                  : 'cursor-pointer hover:text-opacity-80'
              } ${
                this.dark ? 'text-white' : 'text-gray-900'
              }`}
              onClick={() => canInteract && this.handleToggle()}
              title={hoverTitle}
              part="label"
              id={`${this.hostElement?.id || 'ui-toggle'}-label`}
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
              this.variant === 'square' 
                ? 'w-6 h-6 rounded-md' 
                : this.variant === 'apple'
                ? 'w-7 h-7 rounded-full'
                : 'w-6 h-6 rounded-full'
            } ${
              this.isActive 
                ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' 
                : 'bg-red-500 shadow-lg shadow-red-500/50'
            }`} 
            title={`${hoverTitle} - Current state: ${this.isActive ? 'ON' : 'OFF'}`}
            part="readonly-indicator"
          >
            <span class={`text-white text-xs font-bold ${
              this.variant === 'square' ? 'text-[10px]' : ''
            }`}>
              {this.variant === 'square' 
                ? (this.isActive ? '■' : '□')
                : (this.isActive ? '●' : '○')
              }
            </span>
          </span>
        ) : (
          // Interactive toggle - using enhanced styling from old component
          <span
            class={`${this.getToggleStyle()} ${
              canInteract 
                ? 'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary' 
                : ''
            } transition-all duration-200`}
            role="switch"
            aria-checked={this.isActive ? 'true' : 'false'}
            aria-disabled={this.disabled ? 'true' : 'false'}
            aria-label={this.label || `Toggle switch ${this.isActive ? 'on' : 'off'}`}
            tabIndex={canInteract ? 0 : -1}
            onClick={() => canInteract && this.handleToggle()}
            onKeyDown={this.handleKeyDown}
            title={hoverTitle}
            part="control"
          >
            <span class={this.getThumbStyle()} part="thumb"></span>
            {this.renderCrossIcons()}
          </span>
        )}
      </div>
    );
  }
}
