import { Component, Prop, State, h, Watch, Event, EventEmitter } from '@stencil/core';

/**
 * Toggle switch component with various features and multiple visual styles.
 * 
 * @example Basic Usage
 * ```html
 * <ui-toggle variant="circle" state="active" label="Light"></ui-toggle>
 * ```
 * 
 * @example Custom Handler Usage
 * ```html
 * <ui-toggle 
 *   value="true"
 *   change-handler="myToggleHandler"
 *   label="Custom Toggle">
 * </ui-toggle>
 * ```
 * 
 */
@Component({
  tag: 'ui-toggle',
  styleUrl: 'ui-toggle.css',
  shadow: true,
})
export class UiToggle {
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
   * Current state of the toggle.
   * - active: Toggle is on/active
   * - disabled: Toggle cannot be clicked or interacted with
   * - default: Toggle is off/inactive (default)
   */
  @Prop({ mutable: true }) state: 'active' | 'disabled' | 'default' = 'default';

  /**
   * Theme for the component.
   */
  @Prop() theme: 'light' | 'dark' = 'light';

  /**
   * Color scheme
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /**
   * Optional text label, to display text left to the toggle.
   * When given, clicking the label will also toggle the switch.
   */
  @Prop() label?: string;

  /**
   * Current value for local control mode (true/false, on/off, 1/0).
   * @example "true", "false", "on", "off", "1", "0"
   */
  @Prop({ mutable: true }) value?: string;

  /**
   * Function name to call when toggle state changes (for local control).
   * User defines this function in their code, component will invoke it.
   * @example "handleMyToggle"
   */
  @Prop() changeHandler?: string;

  /** 
   * Whether the toggle is disabled
   */
  @Prop() disabled: boolean = false;

  /** Internal state tracking if toggle is on/off */
  @State() isActive: boolean = true;

  /** Event emitted when toggle state changes */
  @Event() toggle: EventEmitter<{ active: boolean }>;

  /** Watch for value prop changes */
  @Watch('value')
  watchValue() {
    if (this.value) {
      const boolValue = this.parseValue(this.value);
      this.isActive = boolValue;
    }
  }

  /** Initialize component */
  componentWillLoad() {
    this.isActive = this.state === 'active';
    
    if (this.value) {
      // Initialize from value prop
      const boolValue = this.parseValue(this.value);
      this.isActive = boolValue;
    }
  }

  private parseValue(value: string): boolean {
    const lowerValue = value.toLowerCase();
    return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'on' || lowerValue === 'yes';
  }

  /** Toggle click handler */
  private handleToggle() {
    if (this.state === 'disabled' || this.disabled) return;

    const newActive = !this.isActive;
    this.isActive = newActive;
    this.toggle.emit({ active: newActive });

    // Call provided function
    if (this.changeHandler && typeof (window as any)[this.changeHandler] === 'function') {
      (window as any)[this.changeHandler]({
        active: newActive,
        value: newActive ? 'true' : 'false',
        label: this.label
      });
    }

    // Update value prop for local control
    if (this.value !== undefined) {
      this.value = newActive ? 'true' : 'false';
    }
  }

  /** Keyboard 'enter' and 'spacebar' input handle to toggle switch state */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.handleToggle();
    }
  };

  /** Fetch current toggle background style */
  getToggleStyle() {
    const isDisabled = this.state === 'disabled';
    const isActive = this.isActive;
    
    // Bigger size for apple variant
    const size = this.variant === 'apple' ? 'w-11 h-7' : 'w-12 h-6';

    // Different shapes of thumb
    let shape = 'rounded-full';
    if (this.variant === 'square') shape = 'rounded-md';
    if (this.variant === 'apple') shape = 'rounded-full shadow-inner border-2 border-gray-500';

    // Background color
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

  /** Fetch current active color */
  getActiveColor() {
    if (this.color === 'secondary') return 'bg-secondary';
    if (this.color === 'neutral') return 'bg-gray-500';
    return 'bg-primary';
  }

  /** Fetch current neon color */
  getNeonColor() {
    return this.color === 'secondary' ? 'neon-secondary' : 'neon-primary';
  }

  /** Fetch current thumb style */
  getThumbStyle() {
    const isActive = this.isActive;
    
    // Apple variant
    if (this.variant === 'apple') {
      const baseStyle = 'absolute w-6 h-6 bg-white transition-all duration-200 ease-in-out shadow-md rounded-full top-0 left-0';
      const movement = isActive ? 'translate-x-4' : 'translate-x-0';
      return `${baseStyle} ${movement}`;
    }
    
    // Standard thumb
    const baseStyle = 'absolute w-4 h-4 bg-white transition-transform duration-300 ease-in-out shadow-sm';
    const shape = this.variant === 'square' ? 'rounded-sm' : 'rounded-full';
    
    let position = 'top-1 left-1';
    if (this.variant === 'neon') {
      position = 'top-0.5 left-1';
    }
    
    const movement = isActive ? 'translate-x-6' : 'translate-x-0';
    
    return `${baseStyle} ${shape} ${position} ${movement}`;
  }

  /** Tick and cross icons for cross variant */
  showCrossIcons() {
    if (this.variant !== 'cross') return null;
    
    const isActive = this.isActive;
    
    return (
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        {!isActive ? (
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

  /** Render final component */
  render() {
    const toggleStyle = this.getToggleStyle();
    const thumbStyle = this.getThumbStyle();
    const isDisabled = this.state === 'disabled' || this.disabled;

    return (
      <div class="inline-flex items-center space-x-3">
        {this.label && (
          <label
            class={`select-none mr-2 ${isDisabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer'} ${this.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
            onClick={() => !isDisabled && this.handleToggle()}
          >
            {this.label}
          </label>
        )}
        
        <span
          class={toggleStyle}
          role="switch"
          aria-checked={this.isActive ? 'true' : 'false'}
          aria-disabled={isDisabled ? 'true' : 'false'}
          tabindex={isDisabled ? -1 : 0}
          onClick={() => !isDisabled && this.handleToggle()}
          onKeyDown={this.handleKeyDown}
        >
          <span class={thumbStyle}></span>
          {this.showCrossIcons()}
        </span>
      </div>
    );
  }
}
