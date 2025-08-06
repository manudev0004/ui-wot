import { Component, Prop, State, h, Event, EventEmitter } from '@stencil/core';
import { DataHandler } from '../../utils/data-handler';
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator';

/**
 * Checkbox component with consistent styling to match the design system.
 */
@Component({
  tag: 'ui-checkbox',
  styleUrl: 'ui-checkbox.css',
  shadow: true,
})
export class UiCheckbox {
  /**
   * Visual style variant of the checkbox.
   */
  @Prop() variant: 'minimal' | 'outlined' | 'filled' = 'outlined';

  /**
   * Current state of the checkbox.
   */
  @Prop({ mutable: true }) state: 'disabled' | 'active' | 'default' = 'default';

  /**
   * Theme for the component.
   */
  @Prop() theme: 'light' | 'dark' = 'light';

  /**
   * Color scheme to match design system.
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /**
   * Optional text label for the checkbox.
   */
  @Prop() label?: string;

  /**
   * Whether the checkbox is checked.
   */
  @Prop({ mutable: true }) checked: boolean = false;

  /**
   * Custom callback function name.
   */
  @Prop() changeHandler?: string;

  /**
   * Thing Description URL for property control.
   * When provided, checkbox will read/write boolean values to the device.
   * @example "http://device.local/properties/enabled"
   */
  @Prop() tdUrl?: string;

  /**
   * Operation status for user feedback.
   */
  @State() operationStatus: OperationStatus = 'idle';

  /**
   * Last error message.
   */
  @State() lastError?: string;

  /**
   * Internal state for checked status.
   */
  @State() isChecked: boolean = false;

  /**
   * Event emitted when checkbox state changes.
   */
  @Event() checkboxChange: EventEmitter<{ checked: boolean }>;

  componentWillLoad() {
    this.isChecked = this.checked;
    
    // Initialize from TD if URL provided
    if (this.tdUrl) {
      this.readFromDevice();
    }
  }

  private async readFromDevice() {
    if (!this.tdUrl) return;
    
    this.operationStatus = 'loading';
    
    const result = await DataHandler.readFromDevice(this.tdUrl, {
      expectedValueType: 'boolean',
      retryCount: 2,
      timeout: 5000
    });

    if (result.success && typeof result.value === 'boolean') {
      this.isChecked = result.value;
      this.checked = result.value;
      this.operationStatus = 'success';
      this.lastError = undefined;
      
      // Clear success indicator after 2 seconds
      setTimeout(() => {
        this.operationStatus = 'idle';
      }, 2000);
    } else {
      this.operationStatus = 'error';
      this.lastError = DataHandler.getErrorMessage(result);
      
      // Clear error indicator after 5 seconds
      setTimeout(() => {
        this.operationStatus = 'idle';
        this.lastError = undefined;
      }, 5000);
      
      console.warn('Checkbox read failed:', this.lastError);
    }
  }

  private async writeToDevice(value: boolean): Promise<boolean> {
    if (!this.tdUrl) return true; // Local control, always succeeds
    
    this.operationStatus = 'loading';
    
    const result = await DataHandler.writeToDevice(this.tdUrl, value, {
      retryCount: 2,
      timeout: 5000
    });

    if (result.success) {
      this.operationStatus = 'success';
      this.lastError = undefined;
      
      // Clear success indicator after 2 seconds
      setTimeout(() => {
        this.operationStatus = 'idle';
      }, 2000);
      
      return true;
    } else {
      this.operationStatus = 'error';
      this.lastError = DataHandler.getErrorMessage(result);
      
      // Clear error indicator after 5 seconds
      setTimeout(() => {
        this.operationStatus = 'idle';
        this.lastError = undefined;
      }, 5000);
      
      console.warn('Checkbox write failed:', this.lastError);
      return false;
    }
  }

  private handleClick = async () => {
    if (this.state === 'disabled') return;

    const newValue = !this.isChecked;
    const previousValue = this.isChecked;

    this.isChecked = newValue;
    this.checked = newValue;
    
    // Emit the change event
    this.checkboxChange.emit({ checked: newValue });

    // Call custom callback if provided
    if (this.changeHandler && typeof (window as any)[this.changeHandler] === 'function') {
      (window as any)[this.changeHandler]({ checked: newValue });
    }

    // Update device if TD URL provided
    if (this.tdUrl) {
      const success = await this.writeToDevice(newValue);
      if (!success) {
        // Revert to previous value on write failure
        this.isChecked = previousValue;
        this.checked = previousValue;
        
        // Re-emit with reverted value
        this.checkboxChange.emit({ checked: previousValue });
        if (this.changeHandler && typeof (window as any)[this.changeHandler] === 'function') {
          (window as any)[this.changeHandler]({ checked: previousValue });
        }
      }
    }
  };

  private getCheckboxStyles() {
    const isDisabled = this.state === 'disabled';
    const isActive = this.state === 'active' || this.isChecked;
    
    let baseClasses = 'transition-all duration-300 flex items-center justify-center cursor-pointer';
    
    if (isDisabled) {
      baseClasses += ' opacity-50 cursor-not-allowed';
    }

    // Variant-specific styling with creative differences
    if (this.variant === 'minimal') {
      // Minimal: Simple circle that fills with color when checked
      baseClasses += ' w-4 h-4 rounded-full border-2';
      if (isActive) {
        baseClasses += this.color === 'primary' ? ' bg-primary border-primary text-white scale-110' :
                      this.color === 'secondary' ? ' bg-secondary border-secondary text-white scale-110' :
                      ' bg-neutral border-neutral text-white scale-110';
      } else {
        baseClasses += this.theme === 'dark' ? ' border-gray-500 bg-transparent hover:border-gray-400' : 
                      ' border-gray-400 bg-transparent hover:border-gray-600';
      }
    } else if (this.variant === 'outlined') {
      // Outlined: Square with thick border and checkmark
      baseClasses += ' w-5 h-5 rounded border-2';
      if (isActive) {
        baseClasses += this.color === 'primary' ? ' border-primary bg-white text-primary shadow-md' :
                      this.color === 'secondary' ? ' border-secondary bg-white text-secondary shadow-md' :
                      ' border-neutral bg-white text-neutral shadow-md';
      } else {
        baseClasses += this.theme === 'dark' ? ' border-gray-600 bg-gray-800 hover:border-gray-500' : 
                      ' border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm';
      }
    } else { // filled
      // Filled: Traditional square checkbox with solid fill when checked
      baseClasses += ' w-5 h-5 rounded';
      if (isActive) {
        baseClasses += this.color === 'primary' ? ' bg-primary text-white border border-primary' :
                      this.color === 'secondary' ? ' bg-secondary text-white border border-secondary' :
                      ' bg-neutral text-white border border-neutral';
      } else {
        baseClasses += this.theme === 'dark' ? ' bg-gray-700 border border-gray-600 hover:bg-gray-600' : 
                      ' bg-gray-50 border border-gray-300 hover:bg-gray-100';
      }
    }

    return baseClasses;
  }

  private getLabelStyles() {
    const isDisabled = this.state === 'disabled';
    
    let classes = 'ml-3 text-sm font-medium cursor-pointer';
    
    if (isDisabled) {
      classes += ' opacity-50 cursor-not-allowed';
    } else {
      classes += this.theme === 'dark' ? ' text-white' : ' text-gray-900';
    }

    return classes;
  }

  render() {
    const checkboxStyles = this.getCheckboxStyles();
    const labelStyles = this.getLabelStyles();
    const isDisabled = this.state === 'disabled';

    return (
      <div class="flex items-center">
        <div class="relative">
          {/* Status Indicator */}
          {this.tdUrl && this.operationStatus !== 'idle' && (
            <div
              class={StatusIndicator.getStatusClasses(this.operationStatus, {
                theme: this.theme,
                size: 'small',
                position: 'top-right'
              })}
              title={StatusIndicator.getStatusTooltip(this.operationStatus, this.lastError)}
              role="status"
              aria-label={StatusIndicator.getStatusTooltip(this.operationStatus, this.lastError)}
            >
              {StatusIndicator.getStatusIcon(this.operationStatus)}
            </div>
          )}
          
          <div
            class={checkboxStyles}
            onClick={this.handleClick}
            role="checkbox"
            aria-checked={this.isChecked ? 'true' : 'false'}
            aria-disabled={isDisabled ? 'true' : 'false'}
            tabIndex={isDisabled ? -1 : 0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.handleClick();
              }
            }}
          >
            {this.isChecked && this.renderCheckmark()}
          </div>
        </div>
        {this.label && (
          <label class={labelStyles} onClick={this.handleClick}>
            {this.label}
          </label>
        )}
      </div>
    );
  }

  private renderCheckmark() {
    if (this.variant === 'minimal') {
      // Simple dot for minimal variant
      return (
        <div class="w-2 h-2 rounded-full bg-current"></div>
      );
    } else if (this.variant === 'outlined') {
      // Classic checkmark for outlined variant
      return (
        <svg
          class="w-3 h-3"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      );
    } else {
      // Traditional checkmark for filled variant
      return (
        <svg
          class="w-3 h-3"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      );
    }
  }
}
