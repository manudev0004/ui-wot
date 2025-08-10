import { Component, Prop, State, h, Watch, Event, EventEmitter } from '@stencil/core';
import { WotService, WotResult } from '../../utils/wot-service';

/**
 * Toogle switch component with various fetueres, multiple visual styles and TD integration.
 * Link a direct property URL for plug-and-play device control.
 * 
 * @example Basic Usage
 * ```html
 * <ui-toggle variant="circle" state="active" label="Light"></ui-toggle>
 * ```
 * 
 * @example TD Integration (Auto-detects protocol)
 * ```html
 * <ui-toggle 
 *   td-url="http://device.local/properties/power"
 *   label="Smart Light"
 *   mode="readwrite">
 * </ui-toggle>
 * ```
 * 
 * @example Multi-protocol Support
 * ```html
 * <!-- HTTP -->
 * <ui-toggle td-url="http://device.local/properties/power" label="HTTP Device"></ui-toggle>
 * 
 * <!-- CoAP -->
 * <ui-toggle td-url="coap://device.local/properties/power" label="CoAP Device"></ui-toggle>
 * 
 * <!-- MQTT (via TD) -->
 * <ui-toggle td-url="mqtt://broker.local/device/properties/power" label="MQTT Device"></ui-toggle>
 * ```
 * 
 * @example TD Device Read-Only (shows colored circle)
 * ```html
 * <ui-toggle 
 *   td-url="http://sensor.local/properties/status"
 *   label="Door Sensor"
 *   mode="read">
 * </ui-toggle>
 * ```
 * 
 * @example Local Control with Custom Handler
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
   * Device interaction mode.
   * - read: Only read from device (display current state as colored circle)
   * - write: Only write to device (control device but don't sync state)
   * - readwrite: Read and write (full synchronization) - default
   */
  @Prop() mode: 'read' | 'write' | 'readwrite' = 'readwrite';

  /** Internal state tracking if toggle is on/off */
  @State() isActive: boolean = true;

  /** Success feedback state */
  @State() showSuccess: boolean = false;

  /** Last error message */
  @State() errorMessage?: string;

  /** Property observation subscription */
  private observationSubscription?: any;

  /** Event emitted when toggle state changes */
  @Event() toggle: EventEmitter<{ active: boolean }>;

  /** Watch for TD URL changes and reconnect */
  @Watch('tdUrl')
  async watchTdUrl() {
    if (this.tdUrl && (this.mode === 'read' || this.mode === 'readwrite')) {
      await this.readDeviceState();
      // Setup property observation if supported
      this.setupPropertyObservation();
    } else if (!this.tdUrl && this.value) {
      // Handle local value changes
      const boolValue = this.parseValue(this.value);
      this.isActive = boolValue;
    }
  }

  /** Watch for value prop changes */
  @Watch('value')
  watchValue() {
    if (!this.tdUrl && this.value) {
      const boolValue = this.parseValue(this.value);
      this.isActive = boolValue;
    }
  }

  /** Initialize component */
  async componentWillLoad() {
    this.isActive = this.state === 'active';
    
    if (this.tdUrl && (this.mode === 'read' || this.mode === 'readwrite')) {
      await this.readDeviceState();
      // Setup property observation if supported
      this.setupPropertyObservation();
    } else if (!this.tdUrl && this.value) {
      // Initialize from value prop if there is no TD URL
      const boolValue = this.parseValue(this.value);
      this.isActive = boolValue;
    }
  }

  /** Cleanup on component destroy */
  disconnectedCallback() {
    if (this.observationSubscription) {
      try {
        // Unsubscribe from property observation
        this.observationSubscription.stop?.();
      } catch (error) {
        console.warn('Failed to unsubscribe from property observation:', error);
      }
    }
  }

  private parseValue(value: string): boolean {
    const lowerValue = value.toLowerCase();
    return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'on' || lowerValue === 'yes';
  }

  /** Read current state from device using node-wot */
  private async readDeviceState() {
    if (!this.tdUrl) return;

    // Clear previous state
    this.showSuccess = false;
    this.errorMessage = undefined;

    try {
      console.log(`Reading from: ${this.tdUrl} using Node-WoT`);
      
      const result: WotResult = await WotService.readProperty(this.tdUrl);
      
      if (result.success && result.value !== undefined) {
        const booleanValue = typeof result.value === 'boolean' ? result.value : Boolean(result.value);
        this.isActive = booleanValue;
        this.showSuccess = true;
        
        // Clear success indicator after 3 seconds
        setTimeout(() => {
          this.showSuccess = false;
        }, 3000);
        
        console.log(`Successfully read value: ${booleanValue}`);
      } else {
        this.errorMessage = result.error || 'Failed to read toggle state';
        
        // Clear error indicator after 8 seconds
        setTimeout(() => {
          this.errorMessage = undefined;
        }, 8000);
        
        console.warn('Device read failed:', result.error);
      }
    } catch (error) {
      this.errorMessage = `Connection failed: ${error.message || 'Unknown error'}`;
      
      // Clear error indicator after 8 seconds
      setTimeout(() => {
        this.errorMessage = undefined;
      }, 8000);
      
      console.warn('Failed to read state:', error);
    }
  }

  /** Setup property observation for real-time updates */
  private async setupPropertyObservation() {
    if (!this.tdUrl || this.mode === 'write') return;

    try {
      const result = await WotService.observeProperty(this.tdUrl, (value) => {
        const booleanValue = typeof value === 'boolean' ? value : Boolean(value);
        this.isActive = booleanValue;
        console.log(`Property observation update: ${booleanValue}`);
      });

      if (result.success) {
        this.observationSubscription = result.value;
        console.log('Property observation setup successfully');
      } else {
        console.warn('Property observation not supported:', result.error);
      }
    } catch (error) {
      console.warn('Failed to setup property observation:', error);
    }
  }

  /** Write new state to TD device using node-wot */
  private async updateDevice(value: boolean): Promise<boolean> {
    if (!this.tdUrl || this.mode === 'read') return false;

    // Clear previous state
    this.showSuccess = false;
    this.errorMessage = undefined;

    try {
      console.log(`Writing ${value} to: ${this.tdUrl} using Node-WoT`);
      
      const result: WotResult = await WotService.writeProperty(this.tdUrl, value);
      
      if (result.success) {
        this.showSuccess = true;
        
        // Clear success indicator after 3 seconds
        setTimeout(() => {
          this.showSuccess = false;
        }, 3000);
        
        console.log(`Successfully wrote: ${value}`);
        return true;
      } else {
        this.errorMessage = result.error || 'Failed to write toggle state';
        
        // Clear error indicator after 8 seconds
        setTimeout(() => {
          this.errorMessage = undefined;
        }, 8000);
        
        console.warn('Device write failed:', result.error);
        return false;
      }
    } catch (error) {
      this.errorMessage = `Connection failed: ${error.message || 'Unknown error'}`;
      
      // Clear error indicator after 8 seconds
      setTimeout(() => {
        this.errorMessage = undefined;
      }, 8000);
      
      console.warn('Failed to write:', error);
      return false;
    }
  }

  /** Toggle click handle */
  private async handleToggle() {
    if (this.state === 'disabled') return;
    
    // No interaction in read-only mode
    if (this.mode === 'read') {
      return;
    }

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
    if (!this.tdUrl && this.value !== undefined) {
      this.value = newActive ? 'true' : 'false';
    }

    // Update device if connected and write mode is enabled
    if (this.tdUrl && (this.mode === 'write' || this.mode === 'readwrite')) {
      const success = await this.updateDevice(newActive);
      if (!success) {
        // Revert on failure
        this.isActive = !newActive;
        console.warn('Change failed, reverted state');
        // Emit revert event
        this.toggle.emit({ active: !newActive });
      }
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

        {/* Status indicators for TD operations */}
        {this.tdUrl && (
          <div class="flex items-center space-x-1">
            {this.showSuccess && (
              <span class="inline-flex items-center text-green-600" title="Successfully updated">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
              </span>
            )}
            {this.errorMessage && (
              <span class="inline-flex items-center text-red-600" title={this.errorMessage}>
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
}
