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
  @Prop() onChangeCallback?: string;

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
  }

  private handleClick = () => {
    if (this.state === 'disabled') return;

    this.isChecked = !this.isChecked;
    this.checked = this.isChecked;
    
    // Emit the change event
    this.checkboxChange.emit({ checked: this.isChecked });

    // Call custom callback if provided
    if (this.onChangeCallback && typeof window[this.onChangeCallback] === 'function') {
      window[this.onChangeCallback]({ checked: this.isChecked });
    }
  };

  private getCheckboxStyles() {
    const isDisabled = this.state === 'disabled';
    const isActive = this.state === 'active' || this.isChecked;
    
    let baseClasses = 'w-5 h-5 rounded cursor-pointer transition-all duration-200 flex items-center justify-center';
    
    if (isDisabled) {
      baseClasses += ' opacity-50 cursor-not-allowed';
    }

    // Color and variant styling
    if (this.variant === 'minimal') {
      if (isActive) {
        baseClasses += this.color === 'primary' ? ' bg-primary text-white' :
                      this.color === 'secondary' ? ' bg-secondary text-white' :
                      ' bg-neutral text-white';
      } else {
        baseClasses += this.theme === 'dark' ? ' bg-gray-700 border border-gray-600' : ' bg-gray-100 border border-gray-300';
      }
    } else if (this.variant === 'outlined') {
      baseClasses += ' border-2';
      if (isActive) {
        baseClasses += this.color === 'primary' ? ' border-primary bg-primary text-white' :
                      this.color === 'secondary' ? ' border-secondary bg-secondary text-white' :
                      ' border-neutral bg-neutral text-white';
      } else {
        baseClasses += this.theme === 'dark' ? ' border-gray-600 bg-transparent' : ' border-gray-300 bg-white';
      }
    } else { // filled
      if (isActive) {
        baseClasses += this.color === 'primary' ? ' bg-primary text-white border border-primary' :
                      this.color === 'secondary' ? ' bg-secondary text-white border border-secondary' :
                      ' bg-neutral text-white border border-neutral';
      } else {
        baseClasses += this.theme === 'dark' ? ' bg-gray-700 border border-gray-600' : ' bg-gray-50 border border-gray-300';
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
          {this.isChecked && (
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
          )}
        </div>
        {this.label && (
          <label class={labelStyles} onClick={this.handleClick}>
            {this.label}
          </label>
        )}
      </div>
    );
  }
}
