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
 * @example TD Integration with HTTP
 * ```html
 * <ui-toggle 
 *   td-url="http://device.local/properties/power"
 *   label="Smart Light"
 *   protocol="http"
 *   mode="readwrite">
 * </ui-toggle>
 * ```
 * 
 * @example TD Integration with MQTT
 * ```html
 * <ui-toggle 
 *   td-url="mqtt://device"
 *   mqtt-host="localhost:1883"
 *   mqtt-topic="device/toggle"
 *   label="MQTT Device"
 *   protocol="mqtt"
 *   mode="readwrite">
 * </ui-toggle>
 * ```
 * 
 * @example TD Device Read-Only (shows colored circle)
 * ```html
 * <ui-toggle 
 *   td-url="http://sensor.local/status"
 *   label="Door Sensor"
 *   mode="read">
 * </ui-toggle>
 * ```
 * 
 * @example Local Control with Custom Handler
 * ```html
 * <ui-toggle 
 *   value="true"
 *   on-change="myToggleHandler"
 *   label="Custom Toggle">
 * </ui-toggle>
 * ```
 * 
 * @example User's JavaScript Handler
 * ```javascript
 * window.myToggleHandler = function(data) {
 *   console.log('Toggle changed:', data.active);
 *   console.log('New value:', data.value);
 *   console.log('Label:', data.label);
 *   // Your custom logic here
 * };
 * ```
 * 
 * @example Event Handling
 * ```javascript
 * document.querySelector('ui-toggle').addEventListener('toggle', (event) => {
 *   console.log('Toggle state:', event.detail.active);
 *   // Your custom logic here
 * });
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

  /**
   * Current value for local control mode (true/false, on/off, 1/0).
   * When no td-url is provided and value is set, this controls the toggle state.
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
   * Protocol to use for Thing Description communication.
   * - http: HTTP REST API (default)
   * - coap: CoAP protocol  
   * - mqtt: MQTT protocol
   */
  @Prop() protocol: 'http' | 'coap' | 'mqtt' = 'http';

  /**
   * MQTT broker host for MQTT protocol (e.g., "localhost:1883")
   */
  @Prop() mqttHost?: string;

  /**
   * MQTT topic path for MQTT protocol (e.g., "device/toggle")
   */
  @Prop() mqttTopic?: string;

  /**
   * Device interaction mode.
   * - read: Only read from device (display current state as colored circle)
   * - write: Only write to device (control device but don't sync state)
   * - readwrite: Read and write (full synchronization) - default
   */
  @Prop() mode: 'read' | 'write' | 'readwrite' = 'readwrite';

  /** Internal state tracking if toggle is on/off */
  @State() isActive: boolean = true;

  /** Event emitted when toggle state changes */
  @Event() toggle: EventEmitter<{ active: boolean }>;

  /** Watch for TD URL changes and reconnect */
  @Watch('tdUrl')
  @Watch('value')
  async watchTdUrl() {
    if (this.tdUrl && (this.mode === 'read' || this.mode === 'readwrite')) {
      await this.readDeviceState();
    } else if (!this.tdUrl && this.value) {
      // Handle local value changes
      const boolValue = this.parseValue(this.value);
      this.isActive = boolValue;
    }
  }

  /** Initialize component */
  async componentWillLoad() {
    this.isActive = this.state === 'active';
    
    if (this.tdUrl && (this.mode === 'read' || this.mode === 'readwrite')) {
      await this.readDeviceState();
    } else if (!this.tdUrl && this.value) {
      // Initialize from value prop when no TD URL
      const boolValue = this.parseValue(this.value);
      this.isActive = boolValue;
    }
  }

  /** Parse string value to boolean */
  private parseValue(value: string): boolean {
    const lowerValue = value.toLowerCase();
    return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'on' || lowerValue === 'yes';
  }

  /** Read current state from device */
  private async readDeviceState() {
    if (!this.tdUrl) return;

    try {
      console.log(`Reading from: ${this.tdUrl} via ${this.protocol}`);
      
      if (this.protocol === 'http') {
        await this.readDeviceStateHttp();
      } else if (this.protocol === 'coap') {
        await this.readDeviceStateCoap();
      } else if (this.protocol === 'mqtt') {
        await this.readDeviceStateMqtt();
      }
    } catch (error) {
      console.warn('Failed to read state:', error);
    }
  }

  /** Read via HTTP */
  private async readDeviceStateHttp() {
    const response = await fetch(this.tdUrl);
    
    if (response.ok) {
      const value = await response.json();
      const booleanValue = typeof value === 'boolean' ? value : Boolean(value);
      
      this.isActive = booleanValue;
      console.log(`Read value: ${booleanValue}`);
    }
  }

  /** Read via CoAP */
  private async readDeviceStateCoap() {
    try {
      // Simple CoAP GET request
      const url = new URL(this.tdUrl);
      const response = await fetch(`coap://${url.host}${url.pathname}`, {
        method: 'GET'
      });
      const value = await response.json();
      const booleanValue = typeof value === 'boolean' ? value : Boolean(value);
      this.isActive = booleanValue;
      console.log(`CoAP read value: ${booleanValue}`);
    } catch (error) {
      console.warn('CoAP read failed:', error);
      throw error;
    }
  }

  /** Read via MQTT */
  private async readDeviceStateMqtt() {
    if (!this.mqttHost || !this.mqttTopic) {
      console.warn('MQTT host and topic are required for MQTT protocol');
      return;
    }

    try {
      // Use WebSocket-based MQTT connection
      const wsUrl = `ws://${this.mqttHost}/mqtt`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        // Subscribe to topic
        const subscribeMsg = {
          cmd: 'subscribe',
          topic: this.mqttTopic
        };
        ws.send(JSON.stringify(subscribeMsg));
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.topic === this.mqttTopic) {
          const booleanValue = typeof data.payload === 'boolean' ? data.payload : Boolean(data.payload);
          this.isActive = booleanValue;
          console.log(`MQTT read value: ${booleanValue}`);
        }
      };
    } catch (error) {
      console.warn('MQTT read failed:', error);
      throw error;
    }
  }

  /** Write new state to TD device */
  private async updateDevice(value: boolean) {
    if (!this.tdUrl) return;

    try {
      console.log(`Writing ${value} to: ${this.tdUrl} via ${this.protocol}`);
      
      if (this.protocol === 'http') {
        await this.updateDeviceHttp(value);
      } else if (this.protocol === 'coap') {
        await this.updateDeviceCoap(value);
      } else if (this.protocol === 'mqtt') {
        await this.updateDeviceMqtt(value);
      }
    } catch (error) {
      console.warn('Failed to write:', error);
      throw error;
    }
  }

  /** Write via HTTP */
  private async updateDeviceHttp(value: boolean) {
    const response = await fetch(this.tdUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(value),
    });

    if (!response.ok) {
      throw new Error(`Write failed: ${response.status}`);
    }
    
    console.log(`Successfully wrote: ${value}`);
  }

  /** Write via CoAP */
  private async updateDeviceCoap(value: boolean) {
    try {
      const url = new URL(this.tdUrl);
      const response = await fetch(`coap://${url.host}${url.pathname}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(value),
      });

      if (!response.ok) {
        throw new Error(`CoAP write failed: ${response.status}`);
      }
      
      console.log(`CoAP successfully wrote: ${value}`);
    } catch (error) {
      console.warn('CoAP write failed:', error);
      throw error;
    }
  }

  /** Write via MQTT */
  private async updateDeviceMqtt(value: boolean) {
    if (!this.mqttHost || !this.mqttTopic) {
      console.warn('MQTT host and topic are required for MQTT protocol');
      throw new Error('MQTT configuration missing');
    }

    try {
      // Use WebSocket-based MQTT connection
      const wsUrl = `ws://${this.mqttHost}/mqtt`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        // Publish to topic
        const publishMsg = {
          cmd: 'publish',
          topic: this.mqttTopic,
          payload: value
        };
        ws.send(JSON.stringify(publishMsg));
        console.log(`MQTT successfully wrote: ${value}`);
        ws.close();
      };
      
      ws.onerror = (error) => {
        console.warn('MQTT write failed:', error);
        throw new Error('MQTT write failed');
      };
    } catch (error) {
      console.warn('MQTT write failed:', error);
      throw error;
    }
  }

  /** Toggle click handle */
  private async handleToggle() {
    if (this.state === 'disabled') return;
    
    // Don't allow interaction in read-only mode (applies to both TD URL and local control)
    if (this.mode === 'read') {
      return;
    }

    const newActive = !this.isActive;
    this.isActive = newActive;

    // Emit toggle event for parent to handle
    this.toggle.emit({ active: newActive });

    // Call user's changeHandler if provided
    if (this.changeHandler && typeof (window as any)[this.changeHandler] === 'function') {
      (window as any)[this.changeHandler]({
        active: newActive,
        value: newActive ? 'true' : 'false',
        label: this.label
      });
    }

    // Update value prop for local control
    if (!this.tdUrl && this.value !== undefined) {
      this.value = newActive ? 'true' : 'false';
    }

    // Update device if connected and write mode is enabled
    if (this.tdUrl && (this.mode === 'write' || this.mode === 'readwrite')) {
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
    const isReadOnly = this.mode === 'read';
    const hoverTitle = isReadOnly ? 'Value cannot be changed (Read-only mode)' : '';

    return (
      <div class="inline-flex items-center space-x-3">
        {this.label && (
          <label
            class={`select-none mr-2 ${isDisabled || isReadOnly ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer'} ${this.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
            onClick={() => !isDisabled && !isReadOnly && this.handleToggle()}
            title={hoverTitle}
          >
            {this.label}
          </label>
        )}
        
        {isReadOnly ? (
          // Show colored circle for read-only mode
          <span 
            class={`inline-block w-6 h-6 rounded-full ${this.isActive ? 'bg-green-500' : 'bg-red-500'}`}
            title={hoverTitle}
          ></span>
        ) : (

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
        )}
      </div>
    );
  }
}
