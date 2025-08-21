import { Component, Prop, State, h, Event, EventEmitter, Watch, Element, Method } from '@stencil/core';
import { UiMsg } from '../../utils/types';

/** @deprecated Use UiMsg<boolean> instead */
export interface UiToggleToggleEvent { active: boolean }
/** @deprecated Use UiMsg<boolean> instead */
export interface UiToggleValueChange { value: boolean; label?: string }

/**
 * A clean, accessible boolean toggle switch component.
 * 
 * @slot label - Custom label content (overrides label prop)
 * 
 * @example
 * Basic usage:
 * ```html
 * <ui-toggle value="true" label="Living Room Light"></ui-toggle>
 * ```
 * 
 * @example
 * Listen to value changes:
 * ```javascript
 * toggle.addEventListener('valueMsg', (e) => {
 *   console.log('New value:', e.detail.payload);
 *   console.log('Previous:', e.detail.prev);
 * });
 * ```
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
   * Text label displayed next to the toggle.
   */
  @Prop() label?: string;

  /**
   * Color theme variant.
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /**
   * Component size variant.
   */
  @Prop() size: 'sm' | 'md' | 'lg' = 'md';

  /** Internal state tracking current visual state */
  @State() isActive: boolean = false;

  /** Internal state for tracking if component is initialized */
  @State() isInitialized: boolean = false;

  /**
   * Primary event emitted when the toggle value changes.
   * Use this event for all value change handling.
   */
  @Event() valueMsg: EventEmitter<UiMsg<boolean>>;

  /** @deprecated Use valueMsg instead */
  @Event() valueChange: EventEmitter<UiToggleValueChange>;

  /** @deprecated Use valueMsg instead */
  @Event() toggle: EventEmitter<UiToggleToggleEvent>;

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

    // Legacy events for backward compatibility
    this.valueChange.emit({ value, label: this.label });
    this.toggle.emit({ active: value });
  }

  /** Handle toggle click */
  private handleToggle = () => {
    if (this.disabled || this.readonly) return;
    
    const newValue = !this.isActive;
    this.setValue(newValue);
  };

  /** Handle keyboard navigation */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled || this.readonly) return;
    
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.handleToggle();
    }
  };

  /** Generate CSS classes for the toggle background */
  private getToggleClasses(): string {
    const baseClasses = 'relative inline-block cursor-pointer transition-all duration-300 ease-in-out';
    
    // Size classes
    const sizeClasses = {
      sm: 'w-8 h-4',
      md: 'w-12 h-6', 
      lg: 'w-16 h-8'
    };
    
    // Shape classes based on variant
    const shapeClasses = {
      circle: 'rounded-full',
      square: 'rounded-md',
      apple: 'rounded-full shadow-inner border-2 border-gray-500',
      cross: 'rounded-full',
      neon: 'rounded-full'
    };
    
    // Background color based on state and variant
    let bgClass = 'bg-gray-300';
    if (this.isActive) {
      if (this.variant === 'cross') {
        bgClass = this.getActiveColor();
      } else if (this.variant === 'apple') {
        bgClass = 'bg-green-500';
      } else if (this.variant === 'neon') {
        bgClass = this.getNeonColor();
      } else {
        bgClass = this.getActiveColor();
      }
    } else {
      if (this.variant === 'cross') {
        bgClass = 'bg-red-500';
      } else if (this.variant === 'apple') {
        bgClass = 'bg-gray-700';
      } else if (this.variant === 'neon') {
        bgClass = 'neon-red';
      }
    }
    
    const disabledClass = this.disabled ? 'opacity-50 cursor-not-allowed' : '';
    const readonlyClass = this.readonly ? 'opacity-75' : '';
    
    return `${baseClasses} ${sizeClasses[this.size]} ${shapeClasses[this.variant]} ${bgClass} ${disabledClass} ${readonlyClass}`.trim();
  }

  /** Generate CSS classes for the toggle thumb */
  private getThumbClasses(): string {
    const baseClasses = 'absolute bg-white transition-transform duration-300 ease-in-out shadow-sm';
    
    // Size based on parent size
    const thumbSizes = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-6 h-6'
    };
    
    // Position based on size
    const positions = {
      sm: 'top-0.5 left-0.5',
      md: 'top-1 left-1', 
      lg: 'top-1 left-1'
    };
    
    // Movement distance based on size
    const movements = {
      sm: this.isActive ? 'translate-x-4' : 'translate-x-0',
      md: this.isActive ? 'translate-x-6' : 'translate-x-0',
      lg: this.isActive ? 'translate-x-8' : 'translate-x-0'
    };
    
    // Shape
    const shape = this.variant === 'square' ? 'rounded-sm' : 'rounded-full';
    
    // Special handling for apple variant
    if (this.variant === 'apple') {
      const appleMovement = this.isActive ? 'translate-x-4' : 'translate-x-0';
      return `absolute w-6 h-6 bg-white transition-all duration-200 ease-in-out shadow-md rounded-full top-0 left-0 ${appleMovement}`;
    }
    
    return `${baseClasses} ${thumbSizes[this.size]} ${positions[this.size]} ${movements[this.size]} ${shape}`;
  }

  /** Get active color class based on color prop */
  private getActiveColor(): string {
    const colorMap = {
      primary: 'bg-primary',
      secondary: 'bg-secondary', 
      neutral: 'bg-gray-500'
    };
    return colorMap[this.color];
  }

  /** Get neon color class */
  private getNeonColor(): string {
    return this.color === 'secondary' ? 'neon-secondary' : 'neon-primary';
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
                  : 'cursor-pointer hover:text-opacity-80 text-gray-900'
              }`}
              onClick={() => canInteract && this.handleToggle()}
              title={hoverTitle}
              part="label"
              id={`${this.hostElement?.id || 'ui-toggle'}-label`}
            >
              {this.label}
              {/* Read-only indicator */}
              {this.readonly && (
                <span class="ml-1 text-xs opacity-60" title="Read-only">📖</span>
              )}
            </label>
          )}
        </slot>

        {/* Toggle control */}
        {this.readonly ? (
          // Read-only indicator
          <span 
            class={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 ${
              this.isActive 
                ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' 
                : 'bg-red-500 shadow-lg shadow-red-500/50'
            }`} 
            title={`${hoverTitle} - Current state: ${this.isActive ? 'ON' : 'OFF'}`}
            part="readonly-indicator"
          >
            <span class="text-white text-xs font-bold">
              {this.isActive ? '●' : '○'}
            </span>
          </span>
        ) : (
          // Interactive toggle
          <span
            class={`${this.getToggleClasses()} ${
              canInteract 
                ? 'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary' 
                : ''
            }`}
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
            <span class={this.getThumbClasses()} part="thumb"></span>
            {this.renderCrossIcons()}
          </span>
        )}
      </div>
    );
  }
}
