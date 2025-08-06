import { Component, Prop, State, h, Event, EventEmitter } from '@stencil/core';
import { DataHandler } from '../../utils/data-handler';

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
  @Prop() clickHandler?: string;

  /**
   * Thing Description URL for action invocation.
   * When provided, button will trigger an action on the device.
   * @example "http://device.local/actions/turnOn"
   */
  @Prop() tdUrl?: string;

  /**
   * Data payload to send with the action.
   * Can be a JSON string or any value that will be JSON serialized.
   * @example '{"brightness": 100}' or '"on"' or '42'
   */
  @Prop() actionData?: string;

  /** Operation status for user feedback */
  @State() showSuccess: boolean = false;

  /** Last error message */
  @State() errorMessage?: string;

  /** Event emitted when button is clicked */
  @Event() buttonClick: EventEmitter<{ label: string }>;

  /** Handle button click */
  private handleClick = async () => {
    if (this.state === 'disabled') return;
    
    // If TD URL is provided, invoke action on device
    if (this.tdUrl) {
      await this.invokeAction();
    }
    
    this.emitClick();
  };

  /** Invoke action on TD device */
  private async invokeAction() {
    // Clear previous state
    this.showSuccess = false;
    this.errorMessage = undefined;
    
    try {
      let payload = undefined;
      if (this.actionData) {
        try {
          payload = JSON.parse(this.actionData);
        } catch {
          // If not valid JSON, use as string
          payload = this.actionData;
        }
      }

      const result = await DataHandler.writeToDevice(this.tdUrl, payload);

      if (result.success) {
        this.showSuccess = true;
        
        // Clear success indicator after 3 seconds
        setTimeout(() => {
          this.showSuccess = false;
        }, 3000);
      } else {
        this.errorMessage = result.error;
        
        // Clear error after 8 seconds
        setTimeout(() => {
          this.errorMessage = undefined;
        }, 8000);
        
        console.warn('Action failed:', result.error);
      }
    } catch (error) {
      this.errorMessage = error.message || 'Action failed';
      
      setTimeout(() => {
        this.errorMessage = undefined;
      }, 8000);
      
      console.warn('Action failed:', error);
    }
  }

  /** Emit click events */
  private emitClick() {
    // Emit click event for parent to handle
    this.buttonClick.emit({ 
      label: this.label 
    });

    // Call user's callback function if provided
    if (this.clickHandler && typeof (window as any)[this.clickHandler] === 'function') {
      (window as any)[this.clickHandler]({
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
      <div class="relative">
        {/* Success Indicator */}
        {this.showSuccess && (
          <div class="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 z-10">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 3L4.5 8.5L2 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        )}
        
        <button
          class={this.getButtonStyle()}
          onClick={this.handleClick}
          onKeyDown={this.handleKeyDown}
          disabled={isDisabled}
          aria-label={this.label}
        >
          {this.label}
        </button>
        
        {/* Error Message */}
        {this.errorMessage && (
          <div class="text-red-500 text-sm mt-1 px-2">
            {this.errorMessage}
          </div>
        )}
      </div>
    );
  }
}
