import { Component, Prop, State, h, Watch, Event, EventEmitter } from '@stencil/core';

/**
 * Number picker component with various visual styles, TD integration and customizable range.
 * Supports increment/decrement buttons with Thing Description integration for IoT devices.
 * 
 * @example Basic Usage
 * ```html
 * <ui-number-picker variant="minimal" value="3" label="Quantity"></ui-number-picker>
 * ```
 * 
 * @example TD Integration with HTTP
 * ```html
 * <ui-number-picker 
 *   td-url="http://device.local/properties/volume"
 *   label="Device Volume"
 *   protocol="http"
 *   mode="readwrite"
 *   min="0"
 *   max="100">
 * </ui-number-picker>
 * ```
 * 
 * @example TD Integration with MQTT
 * ```html
 * <ui-number-picker 
 *   td-url="mqtt://device"
 *   mqtt-host="localhost:1883"
 *   mqtt-topic="device/volume"
 *   label="MQTT Volume"
 *   protocol="mqtt"
 *   mode="readwrite">
 * </ui-number-picker>
 * ```
 * 
 * @example TD Device Read-Only (shows value only)
 * ```html
 * <ui-number-picker 
 *   td-url="http://sensor.local/temperature"
 *   label="Temperature Sensor"
 *   mode="read">
 * </ui-number-picker>
 * ```
 * 
 * @example Local Control with Custom Handler
 * ```html
 * <ui-number-picker 
 *   value="3"
 *   on-change="handleNumberChange"
 *   variant="filled"
 *   label="Custom Counter">
 * </ui-number-picker>
 * ```
 * 
 * @example Event Handling
 * ```javascript
 * window.handleNumberChange = function(data) {
 *   console.log('Number changed:', data.value);
 *   console.log('Label:', data.label);
 *   // Your custom logic here
 * };
 * ```
 */
@Component({
  tag: 'ui-number-picker',
  styleUrl: 'ui-number-picker.css',
  shadow: true,
})
export class UiNumberPicker {
  /**
   * Visual style variant of the number picker.
   * - minimal: Clean buttons with subtle background (default)
   * - outlined: Buttons with border outline
   * - filled: Solid filled buttons
   */
  @Prop() variant: 'minimal' | 'outlined' | 'filled' = 'minimal';

  /**
   * Current state of the number picker.
   * - active: Number picker is enabled (default)
   * - disabled: Number picker cannot be interacted with
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
   * Optional text label, to display above the number picker.
   */
  @Prop() label?: string;

  /**
   * Direct URL of TD number properties to auto connect and interact with the device.
   * @example
   * ```
   * td-url="http://plugfest.thingweb.io:80/http-data-schema-thing/properties/number"
   * ```
   */
  @Prop() tdUrl?: string;

  /**
   * Current value of the number picker (for local control mode).
   * When no td-url is provided and value is set, this controls the picker state.
   * @example 5, 10, 25
   */
  @Prop({ mutable: true }) value: number = 0;

  /**
   * Function name to call when value changes.
   * User defines this function in their code, component will invoke it.
   * @example "handleNumberChange"
   */
  @Prop() onChange?: string;

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
   * MQTT topic path for MQTT protocol (e.g., "device/volume")
   */
  @Prop() mqttTopic?: string;

  /**
   * Device interaction mode.
   * - read: Only read from device (display current value, no interaction)
   * - write: Only write to device (control device but don't sync state)
   * - readwrite: Read and write (full synchronization) - default
   */
  @Prop() mode: 'read' | 'write' | 'readwrite' = 'readwrite';

  /**
   * Minimum allowed value.
   */
  @Prop() min?: number = 0;

  /**
   * Maximum allowed value.
   */
  @Prop() max?: number = 100;

  /**
   * Step increment/decrement amount.
   */
  @Prop() step: number = 1;

  /** Internal state tracking current value */
  @State() currentValue: number = 0;

  /** Event emitted when value changes */
  @Event() valueChange: EventEmitter<{ value: number; label?: string }>;

  /** Watch for TD URL changes and reconnect */
  @Watch('tdUrl')
  @Watch('value')
  async watchTdUrl() {
    if (this.tdUrl && (this.mode === 'read' || this.mode === 'readwrite')) {
      await this.readDeviceState();
    } else if (!this.tdUrl && this.value !== undefined) {
      // Handle local value changes
      this.currentValue = this.value;
    }
  }

  /** Initialize component */
  componentWillLoad() {
    this.currentValue = this.value;
    
    if (this.tdUrl && (this.mode === 'read' || this.mode === 'readwrite')) {
      this.readDeviceState();
    } else if (!this.tdUrl && this.value !== undefined) {
      // Initialize from value prop when no TD URL
      this.currentValue = this.value;
    }
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
      const numberValue = typeof value === 'number' ? value : Number(value);
      
      this.currentValue = numberValue;
      this.value = numberValue;
      console.log(`Read value: ${numberValue}`);
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
      const numberValue = typeof value === 'number' ? value : Number(value);
      this.currentValue = numberValue;
      this.value = numberValue;
      console.log(`CoAP read value: ${numberValue}`);
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
          const numberValue = typeof data.payload === 'number' ? data.payload : Number(data.payload);
          this.currentValue = numberValue;
          this.value = numberValue;
          console.log(`MQTT read value: ${numberValue}`);
        }
      };
    } catch (error) {
      console.warn('MQTT read failed:', error);
      throw error;
    }
  }

  /** Write new state to TD device */
  private async updateDevice(value: number) {
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
  private async updateDeviceHttp(value: number) {
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
  private async updateDeviceCoap(value: number) {
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
  private async updateDeviceMqtt(value: number) {
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

  /** Handle increment */
  private handleIncrement = async () => {
    if (this.state === 'disabled') return;
    
    // Don't allow interaction in read-only mode
    if (this.mode === 'read') {
      return;
    }
    
    const newValue = this.currentValue + this.step;
    if (this.max !== undefined && newValue > this.max) return;
    
    this.currentValue = newValue;
    this.value = newValue;
    this.emitChange();

    // Update device if connected and write mode is enabled
    if (this.tdUrl && (this.mode === 'write' || this.mode === 'readwrite')) {
      try {
        await this.updateDevice(newValue);
      } catch (error) {
        // Revert on failure
        this.currentValue = this.currentValue - this.step;
        this.value = this.currentValue;
        console.warn('Change failed, reverted state');
        // Emit revert event
        this.emitChange();
      }
    }
  };

  /** Handle decrement */
  private handleDecrement = async () => {
    if (this.state === 'disabled') return;
    
    // Don't allow interaction in read-only mode
    if (this.mode === 'read') {
      return;
    }
    
    const newValue = this.currentValue - this.step;
    if (this.min !== undefined && newValue < this.min) return;
    
    this.currentValue = newValue;
    this.value = newValue;
    this.emitChange();

    // Update device if connected and write mode is enabled
    if (this.tdUrl && (this.mode === 'write' || this.mode === 'readwrite')) {
      try {
        await this.updateDevice(newValue);
      } catch (error) {
        // Revert on failure
        this.currentValue = this.currentValue + this.step;
        this.value = this.currentValue;
        console.warn('Change failed, reverted state');
        // Emit revert event
        this.emitChange();
      }
    }
  };

  /** Emit value change events */
  private emitChange() {
    // Emit value change event for parent to handle
    this.valueChange.emit({ 
      value: this.currentValue, 
      label: this.label 
    });

    // Call user's callback function if provided
    if (this.onChange && typeof window[this.onChange] === 'function') {
      window[this.onChange]({
        value: this.currentValue,
        label: this.label
      });
    }

    // Update value prop for local control
    if (!this.tdUrl && this.value !== undefined) {
      this.value = this.currentValue;
    }
  }

  /** Handle keyboard input */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.state === 'disabled') return;
    
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.handleIncrement();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.handleDecrement();
    }
  };

  /** Get button style classes */
  private getButtonStyle(type: 'increment' | 'decrement'): string {
    const isDisabled = this.state === 'disabled';
    const isAtMax = this.max !== undefined && this.currentValue >= this.max && type === 'increment';
    const isAtMin = this.min !== undefined && this.currentValue <= this.min && type === 'decrement';
    const disabled = isDisabled || isAtMax || isAtMin;
    
    let baseClasses = 'w-12 h-12 flex items-center justify-center text-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg';
    
    if (disabled) {
      baseClasses += ' opacity-50 cursor-not-allowed';
    } else {
      baseClasses += ' cursor-pointer hover:scale-105 active:scale-95';
    }

    // Variant-specific styling with explicit color control
    if (this.variant === 'minimal') {
      // Minimal: No background, no border, just text
      if (disabled) {
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
      if (disabled) {
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
      if (disabled) {
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

  /** Get value display style */
  private getValueStyle(): string {
    const isDisabled = this.state === 'disabled';
    
    let classes = 'min-w-[60px] h-12 flex items-center justify-center text-lg font-semibold rounded-lg border-2 number-display';
    
    if (isDisabled) {
      // Disabled state
      classes += ' bg-gray-100 text-gray-400 border-gray-300 dark:bg-gray-800 dark:text-gray-600 dark:border-gray-600';
    } else {
      // Center box: white background with primary color text and border
      classes += ` bg-white text-${this.getColorName()} border-${this.getColorName()} dark:bg-white dark:text-${this.getColorName()} dark:border-${this.getColorName()}`;
    }

    return classes;
  }

  /** Get color name for CSS classes */
  private getColorName(): string {
    return this.color === 'primary' ? 'primary' : 
           this.color === 'secondary' ? 'secondary' : 'neutral';
  }

  /** Render component */
  render() {
    const isDisabled = this.state === 'disabled';
    const isReadOnly = this.mode === 'read';
    const hoverTitle = isReadOnly ? 'Value cannot be changed (Read-only mode)' : '';
    const containerClasses = `flex flex-col items-center gap-3 ${isDisabled ? 'opacity-75' : ''}`;

    return (
      <div class={containerClasses}>
        {this.label && (
          <label 
            class={`text-sm font-medium ${this.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
            title={hoverTitle}
          >
            {this.label}
            {isReadOnly && (
              <span class="ml-1 text-xs text-blue-500 dark:text-blue-400">(Read-only)</span>
            )}
          </label>
        )}
        
        {isReadOnly ? (
          // Show value display only for read-only mode
          <div 
            class="flex items-center justify-center min-w-[120px] h-12 px-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600"
            title={hoverTitle}
          >
            <span class={`text-lg font-medium ${this.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {this.currentValue}
            </span>
          </div>
        ) : (
          // Show interactive number picker
          <div 
            class="flex items-center gap-3"
            tabindex={isDisabled ? -1 : 0}
            onKeyDown={this.handleKeyDown}
          >
            {/* Decrement Button */}
            <button
              class={this.getButtonStyle('decrement')}
              onClick={this.handleDecrement}
              disabled={isDisabled || (this.min !== undefined && this.currentValue <= this.min)}
              aria-label="Decrease value"
            >
              −
            </button>

            {/* Value Display */}
            <div class={this.getValueStyle()}>
              {this.currentValue}
            </div>

            {/* Increment Button */}
            <button
              class={this.getButtonStyle('increment')}
              onClick={this.handleIncrement}
              disabled={isDisabled || (this.max !== undefined && this.currentValue >= this.max)}
              aria-label="Increase value"
            >
              +
            </button>
          </div>
        )}
      </div>
    );
  }
}
