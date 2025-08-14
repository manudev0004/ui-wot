import { Component, Prop, State, h, Event, EventEmitter } from '@stencil/core';

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
  // TD integration removed: use events or external handlers instead

  /**
   * Success feedback state.
   */
  @State() showSuccess: boolean = false;

  /**
   * Last error message.
   */
  @State() errorMessage?: string;

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
  // External integrations should listen for events; no device reads performed here.
  }

  // Device integration removed; external systems should use events.

  private handleClick = async () => {
    if (this.state === 'disabled') return;

  const newValue = !this.isChecked;
  this.isChecked = newValue;
  this.checked = newValue;

    // Emit the change event
    this.checkboxChange.emit({ checked: newValue });

    // Call custom callback if provided
    if (this.changeHandler && typeof (window as any)[this.changeHandler] === 'function') {
      (window as any)[this.changeHandler]({ checked: newValue });
    }

  // Local control only: external integrations should handle device writes.
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
        baseClasses +=
          this.color === 'primary'
            ? ' bg-primary border-primary text-white scale-110'
            : this.color === 'secondary'
            ? ' bg-secondary border-secondary text-white scale-110'
            : ' bg-neutral border-neutral text-white scale-110';
      } else {
        baseClasses += this.theme === 'dark' ? ' border-gray-500 bg-transparent hover:border-gray-400' : ' border-gray-400 bg-transparent hover:border-gray-600';
      }
    } else if (this.variant === 'outlined') {
      // Outlined: Square with thick border and checkmark
      baseClasses += ' w-5 h-5 rounded border-2';
      if (isActive) {
        baseClasses +=
          this.color === 'primary'
            ? ' border-primary bg-white text-primary shadow-md'
            : this.color === 'secondary'
            ? ' border-secondary bg-white text-secondary shadow-md'
            : ' border-neutral bg-white text-neutral shadow-md';
      } else {
        baseClasses += this.theme === 'dark' ? ' border-gray-600 bg-gray-800 hover:border-gray-500' : ' border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm';
      }
    } else {
      // filled
      // Filled: Traditional square checkbox with solid fill when checked
      baseClasses += ' w-5 h-5 rounded';
      if (isActive) {
        baseClasses +=
          this.color === 'primary'
            ? ' bg-primary text-white border border-primary'
            : this.color === 'secondary'
            ? ' bg-secondary text-white border border-secondary'
            : ' bg-neutral text-white border border-neutral';
      } else {
        baseClasses += this.theme === 'dark' ? ' bg-gray-700 border border-gray-600 hover:bg-gray-600' : ' bg-gray-50 border border-gray-300 hover:bg-gray-100';
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
      <div class="inline-block">
        <div class="flex items-center">
          <div class="relative">
            {/* Success Indicator */}
            {this.showSuccess && (
              <div class="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 z-10">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 3L4.5 8.5L2 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
            )}

            <div
              class={checkboxStyles}
              onClick={this.handleClick}
              role="checkbox"
              aria-checked={this.isChecked ? 'true' : 'false'}
              aria-disabled={isDisabled ? 'true' : 'false'}
              tabIndex={isDisabled ? -1 : 0}
              onKeyDown={e => {
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

        {/* Error Message */}
        {this.errorMessage && <div class="text-red-500 text-sm mt-1 px-2">{this.errorMessage}</div>}
      </div>
    );
  }

  private renderCheckmark() {
    if (this.variant === 'minimal') {
      // Simple dot for minimal variant
      return <div class="w-2 h-2 rounded-full bg-current"></div>;
    } else if (this.variant === 'outlined') {
      // Classic checkmark for outlined variant
      return (
        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
      );
    } else {
      // Traditional checkmark for filled variant
      return (
        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
      );
    }
  }
}
