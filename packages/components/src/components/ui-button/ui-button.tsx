import { Component, Prop, h, Event, EventEmitter } from '@stencil/core';

/**
 * Button component with various visual styles, matching the ui-number-picker design family.
 * Supports the same variants, colors, and themes as the number picker.
 * 
 * @example Basic Usage
 * ```html
 * <ui-button variant="minimal" label="Click Me"></ui-button>
 * ```
 * 
 * @example Different Variants
 * ```html
 * <ui-button variant="outlined" color="primary" label="Outlined Button"></ui-button>
 * <ui-button variant="filled" color="secondary" label="Filled Button"></ui-button>
 * ```
 * 
 * @example Custom Click Handler
 * ```html
 * <ui-button on-click="handleButtonClick" label="Custom Handler"></ui-button>
 * ```
 * 
 * @example Event Handling
 * ```javascript
 * window.handleButtonClick = function(data) {
 *   console.log('Button clicked:', data.label);
 *   // Your custom logic here
 * };
 * ```
 */
@Component({
  tag: 'ui-button',
  styleUrl: 'ui-button.css',
  shadow: true,
})
export class UiButton {
  /**
   * Visual style variant of the button.
   * - minimal: Clean button with subtle background (default)
   * - outlined: Button with border outline
   * - filled: Solid filled button
   */
  @Prop() variant: 'minimal' | 'outlined' | 'filled' = 'minimal';

  /**
   * Current state of the button.
   * - active: Button is enabled (default)
   * - disabled: Button cannot be interacted with
   */
  @Prop({ mutable: true }) state: 'active' | 'disabled' = 'active';

  /**
   * Theme for the component.
   */
  @Prop() theme: 'light' | 'dark' = 'light';

  /**
   * Color scheme to match thingsweb webpage 
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /**
   * Button text label.
   */
  @Prop() label: string = 'Button';

  /**
   * Function name to call when button is clicked.
   * User defines this function in their code, component will invoke it.
   * @example "handleButtonClick"
   */
  @Prop() onClick?: string;

  /** Event emitted when button is clicked */
  @Event() buttonClick: EventEmitter<{ label: string }>;

  /** Handle button click */
  private handleClick = () => {
    if (this.state === 'disabled') return;
    
    this.emitClick();
  };

  /** Emit click events */
  private emitClick() {
    // Emit click event for parent to handle
    this.buttonClick.emit({ 
      label: this.label 
    });

    // Call user's callback function if provided
    if (this.onClick && typeof window[this.onClick] === 'function') {
      window[this.onClick]({
        label: this.label
      });
    }
  }

  /** Handle keyboard input */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.state === 'disabled') return;
    
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleClick();
    }
  };

  /** Get button style classes */
  private getButtonStyle(): string {
    const isDisabled = this.state === 'disabled';
    
    let baseClasses = 'px-6 h-12 flex items-center justify-center text-base font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg';
    
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

  /** Get color name for CSS classes */
  private getColorName(): string {
    return this.color === 'primary' ? 'primary' : 
           this.color === 'secondary' ? 'secondary' : 'neutral';
  }

  /** Render component */
  render() {
    const isDisabled = this.state === 'disabled';

    return (
      <button
        class={this.getButtonStyle()}
        onClick={this.handleClick}
        onKeyDown={this.handleKeyDown}
        disabled={isDisabled}
        aria-label={this.label}
      >
        {this.label}
      </button>
    );
  }
}
