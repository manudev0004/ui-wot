import { Component, Prop, State, h, Watch, Event, EventEmitter } from '@stencil/core';

/**
 * Number picker component with increment/decrement buttons for numeric input.
 * Pure UI component focused on user interaction and value management.
 * 
 * @example Basic Usage
 * ```html
 * <ui-number-picker variant="minimal" value="3" label="Quantity"></ui-number-picker>
 * ```
 * 
 * @example Event Handling
 * ```javascript
 * const picker = document.querySelector('ui-number-picker');
 * picker.addEventListener('valueChange', (e) => {
 *   console.log('Number changed:', e.detail.value);
 *   console.log('Label:', e.detail.label);
 * });
 * ```
 * 
 * @example Framework Integration
 * ```javascript
 * // React
 * <ui-number-picker value={count} onValueChange={(e) => setCount(e.detail.value)} />
 * 
 * // Vue
 * <ui-number-picker :value="count" @valueChange="count = $event.detail.value" />
 * ```
 */
@Component({
  tag: 'ui-number-picker',
  styleUrl: 'ui-number-picker.css',
  shadow: true,
})
export class UiNumberPicker {
  /**
   * Visual style variant of the number picker.
   * - minimal: Clean buttons with subtle background (default)
   * - outlined: Buttons with border outline
   * - filled: Solid filled buttons
   */
  @Prop() variant: 'minimal' | 'outlined' | 'filled' = 'minimal';

  /**
   * Whether the number picker is disabled.
   */
  @Prop() disabled: boolean = false;

  /**
   * Theme for the component.
   */
  @Prop() theme: 'light' | 'dark' = 'light';

  /**
   * Color scheme to match thingsweb webpage 
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /**
   * Optional text label, to display above the number picker.
   */
  @Prop() label?: string;

  /**
   * Current value of the number picker.
   */
  @Prop({ mutable: true }) value: number = 0;

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

  /** Internal state tracking current value */
  @State() currentValue: number = 0;

  /** Event emitted when value changes */
  @Event() valueChange: EventEmitter<{ value: number; label?: string }>;

  /** Watch for value prop changes */
  @Watch('value')
  watchValue() {
    this.currentValue = this.value;
  }

  /** Initialize component */
  componentWillLoad() {
    this.currentValue = this.value;
  }

  /** Handle increment */
  private handleIncrement = () => {
    if (this.disabled) return;
    
    const newValue = this.currentValue + this.step;
    if (this.max !== undefined && newValue > this.max) return;
    
    this.currentValue = newValue;
    this.value = newValue;
    
    this.valueChange.emit({
      value: newValue,
      label: this.label
    });
  };

  /** Handle decrement */
  private handleDecrement = () => {
    if (this.disabled) return;
    
    const newValue = this.currentValue - this.step;
    if (this.min !== undefined && newValue < this.min) return;
    
    this.currentValue = newValue;
    this.value = newValue;
    
    this.valueChange.emit({
      value: newValue,
      label: this.label
    });
  };

  /** Get button style classes */
  private getButtonStyle(type: 'increment' | 'decrement'): string {
    const isAtMax = this.max !== undefined && this.currentValue >= this.max && type === 'increment';
    const isAtMin = this.min !== undefined && this.currentValue <= this.min && type === 'decrement';
    const isDisabled = this.disabled || isAtMax || isAtMin;
    
    let baseClasses = 'w-12 h-12 flex items-center justify-center text-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg';
    
    if (isDisabled) {
      baseClasses += ' opacity-50 cursor-not-allowed';
    } else {
      baseClasses += ' cursor-pointer hover:scale-105 active:scale-95';
    }

    // Variant-specific styling with explicit color control
    if (this.variant === 'minimal') {
      // Minimal: No background, no border, just text
      if (isDisabled) {
        baseClasses += ' text-gray-400';
      } else {
        // Clear color specification based on theme
        if (this.theme === 'dark') {
          baseClasses += ' bg-transparent text-white-dark hover:bg-gray-800';
        } else {
          baseClasses += ' bg-transparent text-black-force hover:bg-gray-100';
        }
      }
    } else if (this.variant === 'outlined') {
      // Outlined: Border with user's chosen color, no background
      if (isDisabled) {
        baseClasses += ' border-2 border-gray-300 text-gray-400 bg-transparent';
      } else {
        const borderColor = `border-${this.getColorName()}`;
        const hoverBg = `hover:bg-${this.getColorName()}`;
        
        if (this.theme === 'dark') {
          baseClasses += ` border-2 ${borderColor} bg-transparent text-white-dark ${hoverBg} hover:text-white-force`;
        } else {
          baseClasses += ` border-2 ${borderColor} bg-transparent text-black-force ${hoverBg} hover:text-white-force`;
        }
      }
    } else if (this.variant === 'filled') {
      // Filled: Background with user's chosen color, text color matches theme
      if (isDisabled) {
        baseClasses += ' bg-gray-400 text-white-force';
      } else {
        // Filled buttons: black text in light theme, white text in dark theme
        if (this.theme === 'dark') {
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
    let classes = 'min-w-[60px] h-12 flex items-center justify-center text-lg font-semibold rounded-lg border-2 number-display';
    
    if (this.disabled) {
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
    return this.color === 'primary' ? 'primary' : 
           this.color === 'secondary' ? 'secondary' : 'neutral';
  }

  /** Render component */
  render() {
    const containerClasses = `flex flex-col items-center gap-3 ${this.disabled ? 'opacity-75' : ''}`;

    return (
      <div class={containerClasses}>
        {this.label && (
          <label 
            class={`text-sm font-medium ${this.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
          >
            {this.label}
          </label>
        )}
        
        <div class="relative flex items-center gap-3">
          {/* Decrement Button */}
          <button
            class={this.getButtonStyle('decrement')}
            onClick={this.handleDecrement}
            disabled={this.disabled || (this.min !== undefined && this.currentValue <= this.min)}
            aria-label="Decrease value"
          >
            −
          </button>

          {/* Value Display */}
          <div class={this.getValueStyle()}>
            {this.currentValue}
          </div>

          {/* Increment Button */}
          <button
            class={this.getButtonStyle('increment')}
            onClick={this.handleIncrement}
            disabled={this.disabled || (this.max !== undefined && this.currentValue >= this.max)}
            aria-label="Increase value"
          >
            +
          </button>
        </div>
      </div>
    );
  }
}
