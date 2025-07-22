import { Component, Prop, State, h, Watch } from '@stencil/core';

/**
 * Modern, accessible toggle switch with multiple visual styles and IoT integration.
 * Simply provide a direct property URL for plug-and-play device control.
 * 
 * @example Basic Usage
 * ```html
 * <ui-toggle variant="circle" state="active" label="Enable notifications"></ui-toggle>
 * ```
 * 
 * @example IoT Integration
 * ```html
 * <ui-toggle td-url="http://device.com/properties/switch" label="Smart Device"></ui-toggle>
 * ```
 */
@Component({
  tag: 'ui-toggle',
  styleUrl: 'ui-toggle.css',
  shadow: true,
})
export class UiToggle {
  /**
   * Visual style variant of the toggle switch.
   * - circle: Standard pill-shaped toggle (default)
   * - square: Rectangular toggle with square thumb
   * - apple: iOS-style switch with inner shadow
   * - cross: Shows × when off, ✓ when on
   * - neon: Glowing effect when active
   */
  @Prop() variant: 'circle' | 'square' | 'apple' | 'cross' | 'neon' = 'circle';

  /**
   * Current state of the toggle.
   * - active: Toggle is on/active (default)
   * - disabled: Toggle cannot be interacted with
   */
  @Prop({ mutable: true }) state: 'active' | 'disabled' = 'active';

  /**
   * Visual theme for the component.
   * - light: Bright colors suitable for light backgrounds
   * - dark: Muted colors suitable for dark backgrounds
   */
  @Prop() theme: 'light' | 'dark' = 'light';

  /**
   * Color scheme for the toggle appearance.
   * - primary: Teal/green professional color
   * - secondary: Pink/purple accent color
   * - neutral: Grayscale minimal appearance
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /**
   * Optional text label displayed next to the toggle.
   * When provided, clicking the label will also toggle the switch.
   */
  @Prop() label?: string;

  /**
   * Direct URL to the device property for IoT integration.
   * Provide the complete property URL for automatic device control.
   * 
   * @example
   * ```
   * td-url="http://plugfest.thingweb.io:80/http-data-schema-thing/properties/bool"
   * ```
   */
  @Prop() tdUrl?: string;

  /** Internal state tracking if toggle is on/off */
  @State() isActive: boolean = true;

  /** Watch for TD URL changes and reconnect */
  @Watch('tdUrl')
  async watchTdUrl() {
    await this.readDeviceState();
  }

  /** Initialize component */
  async componentWillLoad() {
    this.isActive = this.state === 'active';
    if (this.tdUrl) {
      await this.readDeviceState();
    }
  }

  /** Read current state from device */
  private async readDeviceState() {
    if (!this.tdUrl) return;

    try {
      console.log(`Reading from: ${this.tdUrl}`);
      const response = await fetch(this.tdUrl);
      
      if (response.ok) {
        const value = await response.json();
        const booleanValue = typeof value === 'boolean' ? value : Boolean(value);
        
        this.isActive = booleanValue;
        console.log(`Read value: ${booleanValue}`);
      }
    } catch (error) {
      console.warn('Failed to read device state:', error);
    }
  }

  /** Write new state to device */
  private async updateDevice(value: boolean) {
    if (!this.tdUrl) return;

    try {
      console.log(`Writing ${value} to: ${this.tdUrl}`);
      
      const response = await fetch(this.tdUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(value),
      });

      if (response.ok) {
        console.log(`Successfully wrote ${value}`);
      } else {
        throw new Error(`Write failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to write to device:', error);
      throw error;
    }
  }

  /** Handle toggle click */
  private async handleToggle() {
    if (this.state === 'disabled') return;

    const newActive = !this.isActive;
    this.isActive = newActive;

    // Update device if connected
    if (this.tdUrl) {
      try {
        await this.updateDevice(newActive);
      } catch (error) {
        // Revert on failure
        this.isActive = !newActive;
        console.warn('Reverted due to device write failure');
      }
    }
  }

  /** Handle keyboard input */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.handleToggle();
    }
  };

  /** Get toggle background style */
  getToggleStyle() {
    const isDisabled = this.state === 'disabled';
    const isOn = this.isActive;
    
    // Size
    const size = this.variant === 'apple' ? 'w-11 h-7' : 'w-12 h-6';

    // Shape
    let shape = 'rounded-full';
    if (this.variant === 'square') shape = 'rounded-md';
    if (this.variant === 'apple') shape = 'rounded-full shadow-inner border-2 border-gray-500';

    // Background color
    let bgColor = 'bg-gray-300'; // default off
    
    if (this.color === 'neutral') {
      bgColor = isOn ? 'bg-gray-500' : 'bg-gray-300';
    } else if (this.variant === 'cross') {
      bgColor = isOn ? this.getActiveColor() : 'bg-red-500';
    } else if (this.variant === 'apple') {
      bgColor = isOn ? 'bg-green-500' : 'bg-gray-700';
    } else if (this.variant === 'neon') {
      bgColor = isOn ? this.getNeonColor() : 'neon-red';
    } else if (isOn) {
      bgColor = this.getActiveColor();
    }

    const disabled = isDisabled ? 'disabled-state' : '';
    const base = 'relative inline-block cursor-pointer transition-all duration-300 ease-in-out';

    return `${base} ${size} ${shape} ${bgColor} ${disabled}`.trim();
  }

  /** Get active color */
  getActiveColor() {
    if (this.color === 'secondary') return 'bg-secondary';
    if (this.color === 'neutral') return 'bg-gray-500';
    return 'bg-primary';
  }

  /** Get neon color */
  getNeonColor() {
    return this.color === 'secondary' ? 'neon-secondary' : 'neon-primary';
  }

  /** Get thumb style */
  getThumbStyle() {
    const isOn = this.isActive;
    
    // Apple variant
    if (this.variant === 'apple') {
      const baseStyle = 'absolute w-6 h-6 bg-white transition-all duration-200 ease-in-out shadow-md rounded-full top-0 left-0';
      const movement = isOn ? 'translate-x-4' : 'translate-x-0';
      return `${baseStyle} ${movement}`;
    }
    
    // Standard thumb
    const baseStyle = 'absolute w-4 h-4 bg-white transition-transform duration-300 ease-in-out shadow-sm';
    const shape = this.variant === 'square' ? 'rounded-sm' : 'rounded-full';
    
    let position = 'top-1 left-1';
    if (this.variant === 'neon') {
      position = 'top-0.5 left-1';
    }
    
    const movement = isOn ? 'translate-x-6' : 'translate-x-0';
    
    return `${baseStyle} ${shape} ${position} ${movement}`;
  }

  /** Show cross icons */
  showCrossIcons() {
    if (this.variant !== 'cross') return null;
    
    const isOn = this.isActive;
    
    return (
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        {!isOn ? (
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

  /** Render component */
  render() {
    const toggleStyle = this.getToggleStyle();
    const thumbStyle = this.getThumbStyle();
    const isDisabled = this.state === 'disabled';

    return (
      <div class="inline-flex items-center space-x-3">
        {this.label && (
          <label
            class={`select-none mr-2 ${isDisabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer'}`}
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
