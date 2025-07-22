import { Component, Prop, State, h, Watch, Event, EventEmitter } from '@stencil/core';

/**
 * Toogle switch component with various fetueres, multiple visual styles and TD integration.
 * Link a direct property URL for plug-and-play device control.
 * 
 * @example Basic Usage
 * ```html
 * <ui-toggle variant="circle" state="active" label="Light"></ui-toggle>
 * ```
 * 
 * @example TD Integration
 * ```html
 * <ui-toggle td-url="http://plugfest.thingweb.io/http-data-schema-thing/properties/bool" label="Test Device"></ui-toggle>
 * ```
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
   * Color scheme to match thingsweb webpage 
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /**
   * Optional text label, to display text left to the toggle.
   * When given, clicking the label will also toggle the switch.
   */
  @Prop() label?: string;

  /**
   * Direct URL of TD boolean properties to auto connect and interact with the device.
   * @example
   * ```
   * td-url="http://plugfest.thingweb.io:80/http-data-schema-thing/properties/bool"
   * ```
   */
  @Prop() tdUrl?: string;

  /** Internal state tracking if toggle is on/off */
  @State() isActive: boolean = true;

  /** Event emitted when toggle state changes */
  @Event() toggle: EventEmitter<{ active: boolean }>;

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
      console.warn('Failed to read state:', error);
    }
  }

  /** Write new state to TD device */
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
        console.log(`Successfully wrote: ${value}`);
      } else {
        throw new Error(`Write failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to write:', error);
      throw error;
    }
  }

  /** Toggle click handle */
  private async handleToggle() {
    if (this.state === 'disabled') return;

    const newActive = !this.isActive;
    this.isActive = newActive;

    // Emit toggle event
    this.toggle.emit({ active: newActive });

    // Update device if connected
    if (this.tdUrl) {
      try {
        await this.updateDevice(newActive);
      } catch (error) {
        // Revert on failure
        this.isActive = !newActive;
        console.warn('Change failed, reverted state');
        // Emit revert event
        this.toggle.emit({ active: !newActive });
      }
    }
  }

  /** Handle keyboard 'enter' and 'spacebar' input to toggle switch state */
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
    
    // Bigger sixe for apple variant
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
    const isDisabled = this.state === 'disabled';

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
