import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { StatusIndicator } from '../../utils/status-indicator';

/**
 * Advanced slider component with reactive state management and multiple visual styles.
 *
 * @example Basic Usage
 * ```html
 * <ui-slider variant="narrow" min="0" max="100" value="50" label="Brightness"></ui-slider>
 * ```
 *
 * @example Different Variants
 * ```html
 * <ui-slider variant="narrow" min="0" max="100" value="30" label="Narrow Style"></ui-slider>
 * <ui-slider variant="wide" min="0" max="100" value="60" label="Wide Style"></ui-slider>
 * <ui-slider variant="rainbow" min="0" max="360" value="180" label="Rainbow Hue"></ui-slider>
 * <ui-slider variant="neon" min="0" max="100" value="80" label="Neon Glow"></ui-slider>
 * <ui-slider variant="stepped" step="10" min="0" max="100" value="50" label="Stepped Control"></ui-slider>
 * ```
 *
 * @example Read-Only Mode
 * ```html
 * <ui-slider readonly="true" value="75" min="0" max="100" label="Sensor Reading"></ui-slider>
 * ```
 *
 * @example JavaScript Integration with Multiple Sliders
 * ```javascript
 * // For single slider
 * const slider = document.querySelector('#my-slider');
 *
 * // For multiple sliders
 * const sliders = document.querySelectorAll('ui-slider');
 * sliders.forEach(slider => {
 *   slider.addEventListener('valueMsg', (e) => {
 *     console.log('Slider ID:', e.detail.source);
 *     console.log('New value:', e.detail.payload);
 *   });
 * });
 *
 * // Set value by ID
 * const brightnessSlider = document.getElementById('brightness-slider');
 * await brightnessSlider.setValue(75);
 * ```
 *
 * @example HTML with IDs
 * ```html
 * <ui-slider id="brightness-slider" label="Brightness" variant="narrow" min="0" max="100"></ui-slider>
 * <ui-slider id="volume-slider" label="Volume" variant="wide" min="0" max="100"></ui-slider>
 * ```
 */
@Component({
  tag: 'ui-slider',
  styleUrl: 'ui-slider.css',
  shadow: true,
})
export class UiSlider {
  @Element() el: HTMLElement;

  /** Component props */

  /**
   * Visual style variant of the slider.
   */
  @Prop() variant: 'narrow' | 'wide' | 'rainbow' | 'neon' | 'stepped' = 'narrow';

  /**
   * Orientation of the slider.
   */
  @Prop() orientation: 'horizontal' | 'vertical' = 'horizontal';

  /**
   * Current numeric value of the slider.
   */
  @Prop({ mutable: true }) value: number = 0;

  /**
   * Whether the slider is disabled (cannot be interacted with).
   */
  @Prop() disabled: boolean = false;

  /**
   * Whether the slider is read-only (displays value but cannot be changed).
   */
  @Prop({ mutable: true }) readonly: boolean = false;

  /**
   * Text label displayed above the slider.
   */
  @Prop() label?: string;

  /**
   * Color theme variant.
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /**
   * Enable dark theme for the component.
   * When true, uses light text on dark backgrounds.
   */
  @Prop() dark: boolean = false;

  /**
   * Enable keyboard navigation (Arrow keys, Home, End, PageUp, PageDown).
   * Default: true
   */
  @Prop() keyboard: boolean = true;

  /**
   * Show last updated timestamp when true
   */
  @Prop() showLastUpdated: boolean = false;

  /**
   * Show status badge when true
   */
  @Prop() showStatus: boolean = true;

  /**
   * Minimum value of the slider.
   */
  @Prop() min: number = 0;

  /**
   * Maximum value of the slider.
   */
  @Prop() max: number = 100;

  /**
   * Step increment for the slider.
   */
  @Prop() step: number = 1;

  /**
   * Shape of the slider thumb.
   */
  @Prop() thumbShape: 'circle' | 'square' | 'arrow' | 'triangle' | 'diamond' = 'circle';

  /** Internal state tracking current visual state */
  @State() private isActive: number = 0;

  /** Internal state for tracking if component is initialized */
  private isInitialized: boolean = false;

  /** Flag to prevent event loops when setting values programmatically */
  @State() private suppressEvents: boolean = false;

  /** Manual input value for text control */
  @State() manualInputValue: string = '';

  /** Operation status for write mode indicators */
  @State() operationStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  @State() lastError?: string;
  /** Timestamp of last read pulse (readonly updates) */
  @State() readPulseTs?: number;
  /** Connection state for readonly mode */
  @Prop({ mutable: true }) connected: boolean = true;
  /** Timestamp of last value update for showLastUpdated feature */
  @State() lastUpdatedTs?: number;

  /** Timer for auto-updating timestamps */
  @State() timestampUpdateTimer?: number;
  @State() private timestampCounter = 0;

  /** Stored write operation for user interaction */
  private storedWriteOperation?: (value: number) => Promise<any>;

  /** Helper method to update value and timestamps consistently */
  private updateValue(value: number, prevValue?: number, emitEvent: boolean = true): void {
    // Clamp value to min/max range
    const clampedValue = Math.max(this.min, Math.min(this.max, value));
    this.isActive = clampedValue;
    this.value = clampedValue;
    this.lastUpdatedTs = Date.now();

    if (this.readonly) {
      this.readPulseTs = Date.now();
    }

    if (emitEvent && !this.suppressEvents) {
      this.emitValueMsg(clampedValue, prevValue);
    }
  }

  /** Helper method to set status with automatic timeout */
  private setStatusWithTimeout(status: 'idle' | 'loading' | 'success' | 'error', duration: number = 1000): void {
    this.operationStatus = status;
    if (status !== 'idle') {
      setTimeout(() => {
        if (this.operationStatus === status) this.operationStatus = 'idle';
      }, duration);
    }
  }

  /**
   * Set the slider value with automatic device communication and status management.
   * Values are automatically clamped to the min/max range.
   *
   * @param value - The numeric value to set (will be clamped to min/max range)
   * @param options - Configuration options for the operation
   * @returns Promise<boolean> - true if successful, false if failed
   *
   * @example Basic Usage (Easy)
   * ```javascript
   * // Simple value setting
   * const slider = document.querySelector('ui-slider');
   * await slider.setValue(50);    // Set to 50
   * await slider.setValue(75.5);  // Set to 75.5 (decimals supported)
   * ```
   *
   * @example Temperature Control (Advanced)
   * ```javascript
   * // Smart thermostat control
   * const thermostat = document.querySelector('#thermostat');
   *
   * await thermostat.setValue(72, {
   *   writeOperation: async () => {
   *     const response = await fetch('/api/hvac/setpoint', {
   *       method: 'POST',
   *       headers: { 'Content-Type': 'application/json' },
   *       body: JSON.stringify({
   *         temperature: 72,
   *         zone: 'living-room'
   *       })
   *     });
   *     if (!response.ok) throw new Error('Failed to set temperature');
   *   },
   *   optimistic: true,
   *   autoRetry: {
   *     attempts: 2,
   *     delay: 3000
   *   }
   * });
   * ```
   *
   * @example Volume Control (Advanced)
   * ```javascript
   * // Audio system volume control
   * const volumeSlider = document.querySelector('#volume');
   *
   * await volumeSlider.setValue(85, {
   *   writeOperation: async () => {
   *     await fetch(`/api/audio/volume/${85}`);
   *   },
   *   readOperation: async () => {
   *     // Verify the actual volume was set
   *     const response = await fetch('/api/audio/volume');
   *     const { volume } = await response.json();
   *     if (Math.abs(volume - 85) > 1) {
   *       throw new Error('Volume mismatch');
   *     }
   *   }
   * });
   * ```
   *
   * @example Sensor Calibration (Advanced)
   * ```javascript
   * // Sensor calibration with validation
   * const calibrationSlider = document.querySelector('#sensor-offset');
   *
   * await calibrationSlider.setValue(-2.5, {
   *   writeOperation: async () => {
   *     // Apply calibration offset
   *     await fetch('/api/sensors/calibrate', {
   *       method: 'POST',
   *       body: JSON.stringify({ offset: -2.5 })
   *     });
   *
   *     // Wait for sensor to stabilize
   *     await new Promise(resolve => setTimeout(resolve, 2000));
   *
   *     // Validate calibration worked
   *     const testReading = await fetch('/api/sensors/test-reading');
   *     const { reading } = await testReading.json();
   *     if (Math.abs(reading) > 0.1) {
   *       throw new Error('Calibration verification failed');
   *     }
   *   }
   * });
   * ```
   */
  @Method()
  async setValue(
    value: number,
    options?: {
      writeOperation?: (value: number) => Promise<any>;
      readOperation?: () => Promise<any>;
      optimistic?: boolean;
      autoRetry?: { attempts: number; delay: number };
      _isRevert?: boolean;
    },
  ): Promise<boolean> {
    const prevValue = this.isActive;
    const clampedValue = Math.max(this.min, Math.min(this.max, value));

    // Clear error state on new attempts
    if (this.operationStatus === 'error' && !options?._isRevert) {
      this.operationStatus = 'idle';
      this.lastError = undefined;
      this.connected = true;
    }

    // SIMPLE CASE: Just set value without operations
    if (!options?.writeOperation && !options?.readOperation) {
      this.updateValue(clampedValue, prevValue);
      this.manualInputValue = String(clampedValue);
      return true;
    }

    // SETUP CASE: Store writeOperation for user interaction
    if (options.writeOperation && !options._isRevert) {
      this.storedWriteOperation = options.writeOperation;
      this.updateValue(clampedValue, prevValue, false); // No event for setup
      this.manualInputValue = String(clampedValue);
      return true;
    }

    // EXECUTION CASE: Execute operations immediately (internal calls)
    return this.executeOperation(clampedValue, prevValue, options);
  }

  /** Simplified operation execution */
  private async executeOperation(value: number, prevValue: number, options: any): Promise<boolean> {
    const optimistic = options?.optimistic !== false;

    // Optimistic update
    if (optimistic && !options?._isRevert) {
      this.updateValue(value, prevValue);
      this.manualInputValue = String(value);
    }

    this.operationStatus = 'loading';

    try {
      // Execute the operation
      if (options.writeOperation) {
        await options.writeOperation(value);
      } else if (options.readOperation) {
        await options.readOperation();
      }

      // Success
      this.setStatusWithTimeout('success', 1200);

      // Non-optimistic update
      if (!optimistic) {
        this.updateValue(value, prevValue);
        this.manualInputValue = String(value);
      }

      return true;
    } catch (error) {
      // Error handling
      this.operationStatus = 'error';
      this.lastError = error?.message || String(error) || 'Operation failed';

      // Revert optimistic changes
      if (optimistic && !options?._isRevert) {
        this.updateValue(prevValue, value, false);
        this.manualInputValue = String(prevValue);
      }

      // Auto-retry
      if (options?.autoRetry && options.autoRetry.attempts > 0) {
        setTimeout(() => {
          this.setValue(value, {
            ...options,
            autoRetry: { ...options.autoRetry, attempts: options.autoRetry.attempts - 1 },
          });
        }, options.autoRetry.delay);
      } else {
        this.setStatusWithTimeout('idle', 3000); // Clear error after 3s
      }

      return false;
    }
  }

  /**
   * Get the current slider value with optional metadata.
   *
   * @param includeMetadata - Include last updated timestamp and status information
   * @returns Promise that resolves to the current value or value with metadata
   *
   * @example Basic Usage (Easy)
   * ```javascript
   * // Get simple numeric value
   * const slider = document.querySelector('ui-slider');
   * const currentValue = await slider.getValue();
   * console.log('Current position:', currentValue);
   * ```
   *
   * @example With Metadata (Advanced)
   * ```javascript
   * // Get value with status information
   * const slider = document.querySelector('ui-slider');
   * const result = await slider.getValue(true);
   *
   * console.log('Value:', result.value);
   * console.log('Last updated:', new Date(result.lastUpdated));
   * console.log('Status:', result.status);
   * if (result.error) {
   *   console.error('Error:', result.error);
   * }
   * ```
   *
   * @example Multi-Slider Dashboard (Advanced)
   * ```javascript
   * // Monitor multiple sliders
   * const sliders = document.querySelectorAll('ui-slider');
   * const dashboard = {};
   *
   * for (const slider of sliders) {
   *   const data = await slider.getValue(true);
   *   dashboard[slider.id] = {
   *     value: data.value,
   *     percentage: ((data.value - slider.min) / (slider.max - slider.min)) * 100,
   *     status: data.status,
   *     lastUpdated: data.lastUpdated
   *   };
   * }
   *
   * console.log('Slider Dashboard:', dashboard);
   * ```
   *
   * @example Range Validation (Advanced)
   * ```javascript
   * // Check if values are in acceptable ranges
   * const temperatureSliders = document.querySelectorAll('.temperature-slider');
   * const alerts = [];
   *
   * for (const slider of temperatureSliders) {
   *   const value = await slider.getValue();
   *   const zone = slider.getAttribute('data-zone');
   *
   *   if (value < 65 || value > 78) {
   *     alerts.push({
   *       zone,
   *       temperature: value,
   *       status: value < 65 ? 'too-cold' : 'too-hot'
   *     });
   *   }
   * }
   *
   * if (alerts.length > 0) {
   *   console.warn('Temperature alerts:', alerts);
   * }
   * ```
   */
  @Method()
  async getValue(includeMetadata: boolean = false): Promise<number | { value: number; lastUpdated?: number; status: string; error?: string }> {
    if (includeMetadata) {
      return {
        value: this.isActive,
        lastUpdated: this.lastUpdatedTs,
        status: this.operationStatus,
        error: this.lastError,
      };
    }
    return this.isActive;
  }

  /**
   * Set value programmatically without triggering events (for external updates).
   * Values are automatically clamped to the min/max range.
   *
   * @param value - The numeric value to set silently
   * @returns Promise<void>
   *
   * @example Basic Usage (Easy)
   * ```javascript
   * // Update from external data without triggering events
   * const slider = document.querySelector('ui-slider');
   * await slider.setValueSilent(45);
   * ```
   *
   * @example Sensor Data Updates (Advanced)
   * ```javascript
   * // Real-time sensor data updates
   * const temperatureSlider = document.querySelector('#temperature-display');
   *
   * // WebSocket connection for live sensor data
   * const ws = new WebSocket('ws://sensors.example.com/temperature');
   * ws.addEventListener('message', async (event) => {
   *   const sensorData = JSON.parse(event.data);
   *
   *   if (sensorData.sensorId === 'temp-001') {
   *     // Silent update to prevent event loops
   *     await temperatureSlider.setValueSilent(sensorData.temperature);
   *
   *     // Visual pulse to show fresh data
   *     await temperatureSlider.triggerReadPulse();
   *   }
   * });
   * ```
   *
   * @example Multi-Zone Climate Control (Advanced)
   * ```javascript
   * // Update multiple zone sliders from API
   * async function updateAllZones() {
   *   const response = await fetch('/api/climate/zones');
   *   const zones = await response.json();
   *
   *   for (const zone of zones) {
   *     const slider = document.querySelector(`#zone-${zone.id}`);
   *     if (slider) {
   *       // Silent update from API data
   *       await slider.setValueSilent(zone.currentTemperature);
   *
   *       // Update setpoint slider too
   *       const setpointSlider = document.querySelector(`#setpoint-${zone.id}`);
   *       if (setpointSlider) {
   *         await setpointSlider.setValueSilent(zone.targetTemperature);
   *       }
   *     }
   *   }
   * }
   *
   * // Update every 60 seconds
   * setInterval(updateAllZones, 60000);
   * ```
   *
   * @example Data Synchronization (Advanced)
   * ```javascript
   * // Sync slider with external control system
   * const volumeSlider = document.querySelector('#system-volume');
   *
   * // Listen for external volume changes (from physical controls)
   * const eventSource = new EventSource('/api/audio/events');
   * eventSource.addEventListener('volume-changed', async (event) => {
   *   const { newVolume, source } = JSON.parse(event.data);
   *
   *   // Only update if change came from external source
   *   if (source !== 'web-ui') {
   *     await volumeSlider.setValueSilent(newVolume);
   *     await volumeSlider.triggerReadPulse();
   *   }
   * });
   * ```
   */
  @Method()
  async setValueSilent(value: number): Promise<void> {
    const clampedValue = Math.max(this.min, Math.min(this.max, value));
    this.updateValue(clampedValue, this.isActive, false); // Use helper with emitEvent=false
    this.manualInputValue = String(clampedValue);
  }

  /**
   * Set operation status for external status management.
   *
   * @param status - The status to set ('idle', 'loading', 'success', 'error')
   * @param errorMessage - Optional error message for error status
   * @returns Promise<void>
   *
   * @example Basic Usage (Easy)
   * ```javascript
   * const slider = document.querySelector('ui-slider');
   *
   * // Show loading
   * await slider.setStatus('loading');
   *
   * // Show success
   * await slider.setStatus('success');
   *
   * // Show error
   * await slider.setStatus('error', 'Connection timeout');
   *
   * // Clear status
   * await slider.setStatus('idle');
   * ```
   *
   * @example Climate System Control (Advanced)
   * ```javascript
   * // HVAC system with complex status management
   * const thermostatSlider = document.querySelector('#thermostat');
   *
   * async function updateHVACSetpoint(temperature) {
   *   try {
   *     await thermostatSlider.setStatus('loading');
   *
   *     // Step 1: Validate temperature range
   *     if (temperature < 60 || temperature > 85) {
   *       throw new Error('Temperature out of acceptable range');
   *     }
   *
   *     // Step 2: Check system status
   *     const systemResponse = await fetch('/api/hvac/status');
   *     const systemStatus = await systemResponse.json();
   *
   *     if (systemStatus.maintenance_mode) {
   *       throw new Error('System in maintenance mode');
   *     }
   *
   *     // Step 3: Set new temperature
   *     const setResponse = await fetch('/api/hvac/setpoint', {
   *       method: 'POST',
   *       body: JSON.stringify({ temperature })
   *     });
   *
   *     if (!setResponse.ok) {
   *       throw new Error('Failed to update setpoint');
   *     }
   *
   *     // Success
   *     await thermostatSlider.setStatus('success');
   *
   *   } catch (error) {
   *     await thermostatSlider.setStatus('error', error.message);
   *   }
   * }
   * ```
   *
   * @example Progressive Status Updates (Advanced)
   * ```javascript
   * // Multi-step process with progressive status
   * const calibrationSlider = document.querySelector('#sensor-calibration');
   *
   * async function calibrateSensor(offset) {
   *   const steps = [
   *     'Preparing sensor...',
   *     'Applying offset...',
   *     'Stabilizing...',
   *     'Verifying calibration...'
   *   ];
   *
   *   try {
   *     for (let i = 0; i < steps.length; i++) {
   *       await calibrationSlider.setStatus('loading');
   *       console.log(`Step ${i + 1}: ${steps[i]}`);
   *
   *       // Simulate step processing
   *       await performCalibrationStep(i, offset);
   *       await new Promise(resolve => setTimeout(resolve, 1000));
   *     }
   *
   *     await calibrationSlider.setStatus('success');
   *
   *   } catch (error) {
   *     await calibrationSlider.setStatus('error', `Calibration failed at step ${i + 1}`);
   *   }
   * }
   * ```
   */
  @Method()
  async setStatus(status: 'idle' | 'loading' | 'success' | 'error', errorMessage?: string): Promise<void> {
    StatusIndicator.applyStatus(this, status, errorMessage);
  }

  /**
   * Trigger a read pulse indicator for readonly mode when data is actually fetched.
   * Provides visual feedback for data refresh operations.
   *
   * @returns Promise<void>
   *
   * @example Basic Usage (Easy)
   * ```javascript
   * // Show visual pulse when data is refreshed
   * const slider = document.querySelector('ui-slider');
   * await slider.triggerReadPulse();
   * ```
   *
   * @example Periodic Data Refresh (Advanced)
   * ```javascript
   * // Regular sensor data updates with visual feedback
   * const sensorSlider = document.querySelector('#pressure-sensor');
   *
   * setInterval(async () => {
   *   try {
   *     const response = await fetch('/api/sensors/pressure');
   *     const data = await response.json();
   *
   *     // Update value silently
   *     await sensorSlider.setValueSilent(data.pressure);
   *
   *     // Show visual pulse to indicate fresh data
   *     await sensorSlider.triggerReadPulse();
   *
   *   } catch (error) {
   *     console.error('Failed to refresh pressure data:', error);
   *   }
   * }, 10000); // Every 10 seconds
   * ```
   *
   * @example User-Triggered Refresh (Advanced)
   * ```javascript
   * // Manual refresh button with pulse feedback
   * const refreshButton = document.querySelector('#refresh-sensors');
   * const sliders = document.querySelectorAll('ui-slider[readonly]');
   *
   * refreshButton.addEventListener('click', async () => {
   *   refreshButton.disabled = true;
   *   refreshButton.textContent = 'Refreshing...';
   *
   *   try {
   *     // Fetch all sensor data
   *     const response = await fetch('/api/sensors/all');
   *     const sensorData = await response.json();
   *
   *     // Update each slider with pulse
   *     for (const slider of sliders) {
   *       const sensorId = slider.getAttribute('data-sensor');
   *       if (sensorData[sensorId]) {
   *         await slider.setValueSilent(sensorData[sensorId].value);
   *         await slider.triggerReadPulse();
   *       }
   *     }
   *
   *   } catch (error) {
   *     console.error('Refresh failed:', error);
   *   } finally {
   *     refreshButton.disabled = false;
   *     refreshButton.textContent = 'Refresh Sensors';
   *   }
   * });
   * ```
   *
   * @example Real-time Streaming Data (Advanced)
   * ```javascript
   * // Continuous data stream with selective pulse
   * const temperatureSliders = document.querySelectorAll('.temperature-sensor');
   *
   * const eventSource = new EventSource('/api/sensors/stream');
   * eventSource.addEventListener('temperature', async (event) => {
   *   const { sensorId, temperature, isSignificantChange } = JSON.parse(event.data);
   *
   *   const slider = document.querySelector(`[data-sensor="${sensorId}"]`);
   *   if (slider) {
   *     // Always update value
   *     await slider.setValueSilent(temperature);
   *
   *     // Only pulse for significant changes (> 1 degree)
   *     if (isSignificantChange) {
   *       await slider.triggerReadPulse();
   *     }
   *   }
   * });
   * ```
   */
  @Method()
  async triggerReadPulse(): Promise<void> {
    if (this.readonly) {
      this.readPulseTs = Date.now();
      // Force re-render to show pulse, then auto-hide after duration
      setTimeout(() => {
        if (this.readPulseTs && Date.now() - this.readPulseTs >= 1500) {
          this.readPulseTs = undefined; // Force re-render to hide pulse
        }
      }, 1500);
    }
  }

  /**
   * Primary event emitted when the slider value changes.
   */
  @Event() valueMsg: EventEmitter<UiMsg<number>>;

  /** Initialize component state from props */
  componentWillLoad() {
    const clampedValue = Math.max(this.min, Math.min(this.max, this.value));
    this.isActive = clampedValue;
    this.manualInputValue = String(clampedValue);
    this.isInitialized = true;

    // Start auto-updating timestamp timer if showLastUpdated is enabled
    if (this.showLastUpdated) {
      this.startTimestampUpdater();
    }
  }

  componentDidLoad() {
    // Trigger a one-time read pulse on initial load for readonly components
    if (this.readonly) {
      setTimeout(() => {
        this.readPulseTs = Date.now();
      }, 200);
    }
  }

  /** Start auto-updating relative timestamps */
  private startTimestampUpdater() {
    this.stopTimestampUpdater(); // Ensure no duplicate timers
    this.timestampUpdateTimer = window.setInterval(() => {
      // Force re-render to update relative time by incrementing counter
      this.timestampCounter++;
    }, 60000); // Update every 60 seconds (optimized)
  }

  /** Stop auto-updating timestamps */
  private stopTimestampUpdater() {
    if (this.timestampUpdateTimer) {
      clearInterval(this.timestampUpdateTimer);
      this.timestampUpdateTimer = undefined;
    }
  }

  /** Cleanup component */
  disconnectedCallback() {
    this.stopTimestampUpdater();
  }

  /** Watch for value prop changes and update internal state */
  @Watch('value')
  watchValue(newVal: number) {
    if (!this.isInitialized) return;

    const clampedValue = Math.max(this.min, Math.min(this.max, newVal));
    if (this.isActive !== clampedValue) {
      const prevValue = this.isActive;
      this.isActive = clampedValue;
      this.manualInputValue = String(clampedValue);
      this.emitValueMsg(clampedValue, prevValue);
      if (this.readonly) this.readPulseTs = Date.now();
    }
  }

  /** Emit the unified UiMsg event */
  private emitValueMsg(value: number, prevValue?: number) {
    // Don't emit events if suppressed (to prevent loops)
    if (this.suppressEvents) return;

    // Primary unified event
    const msg: UiMsg<number> = {
      newVal: value,
      prevVal: prevValue,
      ts: Date.now(),
      source: this.el?.id || 'ui-slider',
      ok: true,
    };
    this.valueMsg.emit(msg);
  }

  /** Handle slider value change */
  private handleChange = async (event: Event) => {
    if (this.disabled || this.readonly) return;

    const target = event.target as HTMLInputElement;
    const newValue = Number(target.value);
    const clampedValue = Math.max(this.min, Math.min(this.max, newValue));
    const prevValue = this.isActive;

    // Execute stored writeOperation if available
    if (this.storedWriteOperation) {
      this.setStatusWithTimeout('loading');
      this.updateValue(clampedValue, prevValue); // Optimistic update

      try {
        await this.storedWriteOperation(clampedValue);
        this.setStatusWithTimeout('success');
      } catch (error) {
        console.error('Write operation failed:', error);
        this.operationStatus = 'error';
        this.lastError = error?.message || 'Operation failed';
        this.updateValue(prevValue, clampedValue, false); // Revert, no event
        this.setStatusWithTimeout('idle', 3000);
      }
    } else {
      // Simple value change without operations
      this.updateValue(clampedValue, prevValue);

      if (this.showStatus) {
        this.operationStatus = 'loading';
        setTimeout(() => this.setStatusWithTimeout('success'), 50);
      }
    }
  };

  /** Handle keyboard navigation */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled || this.readonly || !this.keyboard) return;

    let newValue = this.isActive;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        newValue = Math.min(this.max, this.isActive + this.step);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        newValue = Math.max(this.min, this.isActive - this.step);
        break;
      case 'Home':
        event.preventDefault();
        newValue = this.min;
        break;
      case 'End':
        event.preventDefault();
        newValue = this.max;
        break;
      case 'PageUp':
        event.preventDefault();
        newValue = Math.min(this.max, this.isActive + this.step * 10);
        break;
      case 'PageDown':
        event.preventDefault();
        newValue = Math.max(this.min, this.isActive - this.step * 10);
        break;
      default:
        return;
    }

    const prev = this.isActive;
    this.isActive = newValue;
    this.value = newValue;
    this.manualInputValue = String(newValue);
    this.lastUpdatedTs = Date.now();
    this.emitValueMsg(newValue, prev);
  };

  /** Get track styles */
  private getTrackStyle() {
    const isDisabled = this.disabled;
    const range = this.max - this.min || 1;
    const percentage = ((this.isActive - this.min) / range) * 100;

    let trackSize = 'h-2 w-full';
    let progressSize = 'h-2';

    if (this.orientation === 'vertical') {
      trackSize = 'w-2 h-48'; // Shorter height for vertical
      if (this.variant === 'wide') trackSize = 'w-3 h-48';
      if (this.variant === 'narrow') trackSize = 'w-1 h-48';
      progressSize = 'w-2';
      if (this.variant === 'wide') progressSize = 'w-3';
      if (this.variant === 'narrow') progressSize = 'w-1';
    } else {
      if (this.variant === 'wide') trackSize = 'h-4 w-full';
      if (this.variant === 'narrow') trackSize = 'h-1 w-full';
      if (this.variant === 'wide') progressSize = 'h-4';
      if (this.variant === 'narrow') progressSize = 'h-1';
    }

    let bgColor = 'bg-gray-300';
    let progressColor = this.getActiveColor();

    if (this.variant === 'rainbow') {
      if (this.orientation === 'vertical') {
        bgColor = 'bg-gradient-to-t from-red-500 via-yellow-500 via-green-500 to-blue-500';
      } else {
        bgColor = 'bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 to-blue-500';
      }
      progressColor = '';
    } else if (this.variant === 'neon') {
      bgColor = 'bg-gray-700';
      progressColor = this.getNeonColor();
    }

    const disabled = isDisabled ? 'opacity-50 cursor-not-allowed' : '';

    return {
      track: `relative ${trackSize} ${bgColor} rounded-full ${disabled}`,
      progress: `absolute ${progressColor} rounded-full transition-all duration-200`,
      progressSize,
      percentage,
    };
  }

  /** Get thumb styles */
  private getThumbStyle() {
    let size = 'w-5 h-5';
    let shape = 'rounded-full';

    if (this.thumbShape === 'square') {
      shape = 'rounded-sm';
    } else if (this.thumbShape === 'arrow') {
      size = 'w-8 h-6';
      shape = '';
    } else if (this.thumbShape === 'triangle' || this.thumbShape === 'diamond') {
      size = 'w-6 h-6';
      shape = '';
    }

    let bgColor = 'bg-white';
    const border = 'border border-gray-300';

    // For custom shapes, don't add background and border as they're handled by SVG
    if (this.thumbShape === 'arrow' || this.thumbShape === 'triangle' || this.thumbShape === 'diamond') {
      return `${size} cursor-pointer flex items-center justify-center`;
    }

    return `${size} ${shape} ${bgColor} ${border} cursor-pointer`;
  }

  /** Fetch current active color */
  private getActiveColor() {
    if (this.color === 'secondary') return 'bg-secondary';
    if (this.color === 'neutral') return 'bg-gray-500';
    return 'bg-primary';
  }

  /** Fetch current neon color */
  private getNeonColor() {
    return this.color === 'secondary' ? 'neon-secondary-track' : 'neon-primary-track';
  }

  /** Readonly background classes derived from color and theme */
  private getReadonlyBg(): string {
    if (this.dark) {
      if (this.color === 'primary') return 'bg-gray-800 border-primary text-white';
      if (this.color === 'secondary') return 'bg-gray-800 border-secondary text-white';
      return 'bg-gray-800 border-gray-600 text-white';
    }

    if (this.color === 'primary') return 'bg-white border-primary text-primary';
    if (this.color === 'secondary') return 'bg-white border-secondary text-secondary';
    return 'bg-white border-gray-300 text-gray-900';
  }

  /** Readonly text color classes derived from color */
  private getReadonlyText(): string {
    if (this.dark) return 'text-white';
    if (this.color === 'primary') return 'text-primary';
    if (this.color === 'secondary') return 'text-secondary';
    return 'text-gray-900';
  }

  /** Render step marks for stepped variant */
  private renderStepMarks() {
    if (this.variant !== 'stepped') return null;

    const steps = [];
    const safeStep = this.step || 1;
    const stepCount = Math.max(1, Math.floor((this.max - this.min) / safeStep));

    for (let i = 0; i <= stepCount; i++) {
      const percentage = (i / stepCount) * 100;

      if (this.orientation === 'vertical') {
        steps.push(
          <div
            key={i}
            class="absolute h-0.5 w-3 bg-gray-400"
            style={{
              bottom: `${percentage}%`,
              left: '50%',
              transform: 'translateX(-50%) translateY(1px)',
            }}
          ></div>,
        );
      } else {
        steps.push(
          <div
            key={i}
            class="absolute w-0.5 h-3 bg-gray-400"
            style={{
              left: `${percentage}%`,
              top: '50%',
              transform: 'translateX(-50%) translateY(-50%)',
            }}
          ></div>,
        );
      }
    }

    return <div class="absolute inset-0 pointer-events-none">{steps}</div>;
  }

  /** Render custom thumb shapes */
  private renderCustomThumb() {
    if (!['arrow', 'triangle', 'diamond'].includes(this.thumbShape)) return null;

    const thumbColor = this.variant === 'neon' ? '#ffffff' : '#ffffff';
    const strokeColor = '#374151';

    if (this.thumbShape === 'arrow') {
      return (
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Left pointing triangle */}
          <svg width="12" height="16" viewBox="0 0 12 16" class="absolute -translate-x-1.5">
            <path d="M8 3 L3 8 L8 13 Z" fill={thumbColor} stroke={strokeColor} stroke-width="1" />
          </svg>
          {/* Right pointing triangle */}
          <svg width="12" height="16" viewBox="0 0 12 16" class="absolute translate-x-1.5">
            <path d="M4 3 L9 8 L4 13 Z" fill={thumbColor} stroke={strokeColor} stroke-width="1" />
          </svg>
        </div>
      );
    }

    if (this.thumbShape === 'triangle') {
      return (
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg width="20" height="20" viewBox="0 0 20 20" class="absolute">
            <path d="M10 3 L17 15 L3 15 Z" fill={thumbColor} stroke={strokeColor} stroke-width="1" />
          </svg>
        </div>
      );
    }

    if (this.thumbShape === 'diamond') {
      return (
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg width="20" height="20" viewBox="0 0 20 20" class="absolute">
            <path d="M2 10 L10 2 L18 10 L10 18 Z" fill={thumbColor} stroke={strokeColor} stroke-width="1" />
          </svg>
        </div>
      );
    }

    return null;
  }

  /** Render the component */
  render() {
    const trackStyles = this.getTrackStyle();
    const thumbStyle = this.getThumbStyle();
    const isDisabled = this.disabled;
    const isVertical = this.orientation === 'vertical';
    const isReadOnly = this.readonly; // mirror number-picker behavior
    const safeRange = this.max - this.min || 1;
    const percent = ((this.isActive - this.min) / safeRange) * 100;

    return (
      <div class={isVertical ? 'flex flex-col items-center w-20 mx-4 mb-4' : 'w-full'} part="container" role="group" aria-label={this.label || 'Slider'}>
        {' '}
        {/* Reduced mb-4 for vertical to avoid excess space */}
        {/* Label only for horizontal sliders */}
        {this.label && !isVertical && (
          <label class={`block text-sm font-medium mb-4 ${isDisabled ? 'text-gray-400' : ''} ${this.dark ? 'text-white' : 'text-gray-900'}`} part="label">
            {this.label}
          </label>
        )}
        {/* Value labels for vertical - max at top (show in readonly and interactive) */}
        {isVertical && (
          <div class={`text-xs mb-4 text-center ${this.dark ? 'text-gray-300' : 'text-gray-500'}`}>
            <span>{this.max}</span>
          </div>
        )}
        {/* Slider Interface or Read-only indicator */}
        {isReadOnly ? (
          // Read-only indicator (static; no pulse/glow)
          <div
            class={`relative flex items-center justify-center min-w-[120px] h-12 px-4 mr-20 rounded-lg border transition-all duration-300 ${this.getReadonlyBg()}
            `}
            title={`Read-only value: ${this.isActive}`}
            part="readonly-indicator"
          >
            <span class={`text-lg font-medium ${this.getReadonlyText()}`}>{this.isActive}</span>
            {/* transient read-pulse dot */}
            {this.readPulseTs && Date.now() - this.readPulseTs < 1500 ? (
              <>
                <style>{`@keyframes ui-read-pulse { 0% { opacity: 0; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.05); } 100% { opacity: 0; transform: scale(1.2); } }`}</style>
                <span
                  class="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-400 shadow-md z-10"
                  style={{ animation: 'ui-read-pulse 2s ease-in-out forwards' } as any}
                  title="Updated"
                  part="readonly-pulse"
                ></span>
              </>
            ) : null}
          </div>
        ) : (
          <div
            class={isVertical ? 'relative flex flex-col items-center justify-center' : 'relative'}
            style={isVertical ? { height: '12rem', width: '1.5rem' } : {}}
            tabIndex={isDisabled ? -1 : 0}
            onKeyDown={this.handleKeyDown}
            role="slider"
            aria-valuemin={this.min}
            aria-valuemax={this.max}
            aria-valuenow={this.isActive}
            aria-disabled={isDisabled ? 'true' : 'false'}
          >
            {/* Success Indicator moved next to value display */}

            <div class={trackStyles.track}>
              {this.variant !== 'rainbow' && (
                <div
                  class={`${trackStyles.progress} ${trackStyles.progressSize}`}
                  style={isVertical ? { height: `${percent}%`, bottom: '0', left: '0', position: 'absolute', width: '100%' } : { width: `${percent}%`, height: '100%' }}
                ></div>
              )}
              {this.renderStepMarks()}
            </div>
            <input
              type="range"
              min={this.min}
              max={this.max}
              step={this.step}
              value={this.isActive}
              disabled={isDisabled}
              class={`absolute inset-0 ${isVertical ? 'slider-vertical' : 'w-full h-full'} opacity-0 cursor-pointer z-10 ${isDisabled ? 'cursor-not-allowed' : ''}`}
              style={isVertical ? { writingMode: 'bt-lr', height: '100%', width: '100%' } : {}}
              onInput={e => this.handleChange(e)}
              onKeyDown={this.handleKeyDown}
              tabIndex={isDisabled ? -1 : 0}
            />
            <div
              class={`absolute ${isVertical ? 'left-1/2 -translate-x-1/2' : 'top-1/2 -translate-y-1/2 -translate-x-1/2'} ${thumbStyle} ${
                isDisabled ? 'opacity-50' : ''
              } pointer-events-none z-0`}
              style={isVertical ? { bottom: `calc(${percent}% - 0.5rem)` } : { left: `${percent}%` }}
            >
              {this.renderCustomThumb()}
            </div>
          </div>
        )}
        {/* Value labels for vertical - min at bottom; in interactive mode include current small box */}
        {isVertical && (
          <div class={`flex flex-col items-center mt-4 space-y-2 text-xs ${this.dark ? 'text-gray-300' : 'text-gray-500'}`} style={{ marginBottom: '1.5rem' }}>
            <span>{this.min}</span>
            {!isReadOnly ? (
              <div class="relative flex justify-center">
                {/* Value box centered to slider */}
                <div
                  class={`px-2 py-1 rounded text-center font-medium border text-xs min-w-8 ${
                    this.dark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                  } shadow-sm`}
                >
                  {this.isActive}
                </div>
                {/* Status indicator positioned absolutely so it doesn't shift value */}
                {this.showStatus && (
                  <div class="absolute left-full ml-1 top-0 flex items-center h-full">{StatusIndicator.renderStatusBadge(this.operationStatus, this.lastError, h)}</div>
                )}
              </div>
            ) : // readonly: don't show the small current value box (main indicator shows value)
            null}
            {this.label && (
              <span class="text-xs font-medium text-center mt-1 mb-2" part="label">
                {this.label}
              </span>
            )}
          </div>
        )}
        {/* Horizontal value labels: min/max on top (show even when readonly); current small box only in interactive mode */}
        {!isVertical && (
          <>
            <div class={`flex justify-between items-center text-xs mt-3 ${this.dark ? 'text-gray-300' : 'text-gray-500'}`}>
              <span>{this.min}</span>
              <span>{this.max}</span>
            </div>
            {!isReadOnly && (
              <div class="relative flex justify-center mt-0">
                {/* Value box centered */}
                <div
                  class={`px-2 py-1 rounded text-center font-medium border text-xs min-w-8 ${
                    this.dark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                  } shadow-sm`}
                  style={{ display: 'inline-block' }}
                >
                  {this.isActive}
                </div>
                {/* Status indicator positioned absolutely so it doesn't shift value */}
                {this.showStatus && (
                  <div class="absolute left-full ml-2 top-0 flex items-center h-full">{StatusIndicator.renderStatusBadge(this.operationStatus, this.lastError, h)}</div>
                )}
              </div>
            )}
          </>
        )}
        {/* Last updated timestamp */}
        {this.showLastUpdated && (
          <div class="flex justify-center mt-2">{StatusIndicator.renderTimestamp(this.lastUpdatedTs ? new Date(this.lastUpdatedTs) : null, this.dark ? 'dark' : 'light', h)}</div>
        )}
      </div>
    );
  }
}
