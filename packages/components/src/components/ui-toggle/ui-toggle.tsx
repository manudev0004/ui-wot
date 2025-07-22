import { Component, Prop, State, Event, EventEmitter, h, Watch } from '@stencil/core';

/**
 * Interface for connecting to IoT devices
 */
export interface IoTDevice {
  name: string;
  url: string;
  type?: string;
}

/**
 * UI Toggle - A Smart Switch for Web and IoT
 * 
 * Simple toggle component that can control anything from UI state to smart lights!
 * Just give it a device URL and property name - it handles the rest.
 * 
 * @example
 * <!-- Basic toggle -->
 * <ui-toggle label="Dark mode"></ui-toggle>
 * 
 * <!-- Smart device control -->
 * <ui-toggle 
 *   device-url="https://my-lamp.local/td" 
 *   property="power"
 *   label="Living room lamp">
 * </ui-toggle>
 */
@Component({
  tag: 'ui-toggle',
  styleUrl: 'ui-toggle.css',
  shadow: true,
})
export class UiToggle {
  /**
   * How the toggle looks
   * circle = standard pill shape
   * square = rectangular with rounded corners  
   * apple = iOS style with shadow
   * cross = shows × and ✓ icons
   * neon = glowing effect
   */
  @Prop() variant: 'circle' | 'square' | 'apple' | 'cross' | 'neon' = 'circle';

  /**
   * Is the toggle on or off?
   * default = off/inactive
   * active = on/active  
   * disabled = can't be clicked
   */
  @Prop({ mutable: true }) state: 'default' | 'active' | 'disabled' = 'default';

  /**
   * Light or dark appearance
   */
  @Prop() theme: 'light' | 'dark' = 'light';

  /**
   * Color scheme
   * primary = teal/green
   * secondary = pink/purple  
   * neutral = gray
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /**
   * Text shown next to toggle (clickable)
   */
  @Prop() label?: string;

  /**
   * URL to your smart device's description file
   * Makes the toggle control real IoT devices!
   */
  @Prop() deviceUrl?: string;

  /**
   * Which device property to control (default: "switch")
   * Common names: "power", "state", "on", "enabled"
   */
  @Prop() property: string = 'switch';

  /**
   * Legacy way to connect devices (use device-url instead)
   * @deprecated
   */
  @Prop() device?: IoTDevice;

  // Internal state
  @State() isOn: boolean = false;
  @State() deviceInfo: any = null;
  @State() deviceBaseUrl: string = '';

  // Event when toggle changes
  @Event() toggle: EventEmitter<{ active: boolean; state: string }>;

  // Watch for device URL changes
  @Watch('deviceUrl')
  async onDeviceUrlChange() {
    await this.connectToDevice();
  }

  // Watch for property name changes  
  @Watch('property')
  async onPropertyChange() {
    if (this.deviceInfo) {
      await this.readDeviceState();
    }
  }

  // Watch for legacy device prop
  @Watch('device')
  async onDeviceChange() {
    console.warn('device prop is deprecated. Use device-url instead!');
  }

  // Setup component
  async componentWillLoad() {
    this.isOn = this.state === 'active';
    if (this.deviceUrl) {
      await this.connectToDevice();
    }
  }

  // Connect to smart device
  async connectToDevice() {
    if (!this.deviceUrl) return;

    try {
      console.log(`Connecting to device: ${this.deviceUrl}`);
      const response = await fetch(this.deviceUrl);
      
      if (!response.ok) {
        throw new Error(`Can't reach device: ${response.status}`);
      }

      this.deviceInfo = await response.json();
      
      // Get device's base URL
      const url = new URL(this.deviceUrl);
      this.deviceBaseUrl = `${url.protocol}//${url.host}`;
      
      console.log(`Connected to: ${this.deviceInfo.title || 'Smart Device'}`);
      
      // Read current state
      await this.readDeviceState();
    } catch (error) {
      console.error('Failed to connect to device:', error);
    }
  }

  // Read what the device is currently doing
  async readDeviceState() {
    if (!this.deviceInfo || !this.deviceBaseUrl) return;

    try {
      const deviceProperty = this.deviceInfo.properties?.[this.property];
      if (!deviceProperty) {
        console.warn(`Device doesn't have '${this.property}' property`);
        return;
      }

      const endpoint = deviceProperty.forms?.[0];
      if (!endpoint?.href) {
        console.warn(`No endpoint found for '${this.property}'`);
        return;
      }

      // Build full URL
      const fullUrl = endpoint.href.startsWith('http') 
        ? endpoint.href 
        : `${this.deviceBaseUrl}${endpoint.href}`;

      console.log(`Reading from: ${fullUrl}`);
      const response = await fetch(fullUrl);
      
      if (response.ok) {
        const value = await response.json();
        const isOn = typeof value === 'boolean' ? value : Boolean(value);
        
        this.isOn = isOn;
        this.state = isOn ? 'active' : 'default';
        console.log(`Device is ${isOn ? 'ON' : 'OFF'}`);
      }
    } catch (error) {
      console.warn('Failed to read device state:', error);
    }
  }

  // Tell the device to change state
  async updateDevice(turnOn: boolean) {
    if (!this.deviceInfo || !this.deviceBaseUrl) return;

    try {
      const deviceProperty = this.deviceInfo.properties?.[this.property];
      if (!deviceProperty) {
        console.warn(`Device doesn't have '${this.property}' property`);
        return;
      }

      // Find endpoint that accepts writes
      const writeEndpoint = deviceProperty.forms?.find((form: any) => 
        !form.op || form.op.includes('writeproperty') || form.op.includes('readproperty')
      );

      if (!writeEndpoint?.href) {
        console.warn(`Can't write to '${this.property}' property`);
        return;
      }

      // Build full URL
      const fullUrl = writeEndpoint.href.startsWith('http') 
        ? writeEndpoint.href 
        : `${this.deviceBaseUrl}${writeEndpoint.href}`;

      console.log(`Updating device: ${turnOn ? 'ON' : 'OFF'}`);
      
      const response = await fetch(fullUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(turnOn),
      });

      if (response.ok) {
        console.log(`Device updated successfully!`);
      } else {
        throw new Error(`Update failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to update device:', error);
      throw error; // Let caller handle reversion
    }
  }

  // When user clicks the toggle
  async handleToggle() {
    if (this.state === 'disabled') return;

    const willBeOn = !this.isOn;
    this.isOn = willBeOn;
    this.state = willBeOn ? 'active' : 'default';

    // Tell anyone listening that we changed
    this.toggle.emit({ 
      active: willBeOn, 
      state: this.state 
    });

    // Update connected device if we have one
    if (this.deviceUrl && this.deviceInfo) {
      try {
        await this.updateDevice(willBeOn);
      } catch (error) {
        console.warn('Device update failed, reverting:', error);
        // Undo the change
        this.isOn = !willBeOn;
        this.state = !willBeOn ? 'active' : 'default';
      }
    }

    // Show warning for old device prop
    if (this.device) {
      console.warn('device prop is deprecated. Use device-url instead!');
    }
  }

  // Handle keyboard presses
  handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.handleToggle();
    }
  };

  // Figure out how the toggle background should look
  getToggleStyle() {
    const isDisabled = this.state === 'disabled';
    const isActive = this.state === 'active';
    
    // Size - Apple is bigger for that iOS feel
    const size = this.variant === 'apple' 
      ? 'w-11 h-7' 
      : 'w-12 h-6';

    // Shape
    let shape = 'rounded-full'; // most toggles are round
    if (this.variant === 'square') shape = 'rounded-md';
    if (this.variant === 'apple') shape = 'rounded-full shadow-inner border-2 border-gray-500';

    // Color when active/inactive
    let bgColor = 'bg-neutral-light'; // default = off
    
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

  // Get color for active state
  getActiveColor() {
    if (this.color === 'secondary') return 'bg-secondary';
    if (this.color === 'neutral') return 'bg-gray-500';
    return 'bg-primary'; // default
  }

  // Get neon color for active state
  getNeonColor() {
    return this.color === 'secondary' ? 'neon-secondary' : 'neon-primary';
  }

  // Figure out how the sliding thumb should look
  getThumbStyle() {
    const isActive = this.state === 'active';
    
    // Apple variant is special (bigger and different positioning)
    if (this.variant === 'apple') {
      const baseStyle = 'absolute w-6 h-6 bg-white transition-all duration-200 ease-in-out shadow-md rounded-full top-0 left-0';
      const movement = isActive ? 'translate-x-4' : 'translate-x-0';
      return `${baseStyle} ${movement}`;
    }
    
    // Standard thumb for other variants
    const baseStyle = 'absolute w-4 h-4 bg-white transition-transform duration-300 ease-in-out shadow-sm';
    const shape = this.variant === 'square' ? 'rounded-sm' : 'rounded-full';
    
    // Position the thumb properly
    let position = 'top-1 left-1';
    if (this.variant === 'neon') {
      position = 'top-0.5 left-1'; // neon needs special alignment
    }
    
    const movement = isActive ? 'translate-x-6' : 'translate-x-0';
    
    return `${baseStyle} ${shape} ${position} ${movement}`;
  }

  // Show × and ✓ for cross variant
  showCrossIcons() {
    if (this.variant !== 'cross') return null;
    
    const isActive = this.state === 'active';
    
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

  // Render the toggle component
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
          aria-checked={this.state === 'active' ? 'true' : 'false'}
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
