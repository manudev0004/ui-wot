import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types'; // Standard message format
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator'; // Status indicator utility

/**
 * A versatile color picker component designed for WoT device control.
 *
 * @example Basic Usage
 * ```html
 * <ui-color-picker value="#ff0000" label="Theme Color"></ui-color-picker>
 * ```
 *
 * @example JS integaration with node-wot browser bundle
 * ```javascript
 * const colorPicker = document.getElementById('device-color');
 * const initialValue = String(await (await thing.readProperty('deviceColor')).value());
 *
 * await colorPicker.setValue(initialValue, {
 *   writeOperation: async value => {
 *     await thing.writeProperty('deviceColor', value);
 *   }
 * });
 * ```
 */
@Component({
  tag: 'ui-color-picker',
  styleUrl: 'ui-color-picker.css',
  shadow: true,
})
export class UiColorPicker {
  @Element() el: HTMLElement;

  // ============================== COMPONENT PROPERTIES ==============================

  /** Enable dark mode theme styling when true */
  @Prop() dark: boolean = false;

  /** Current color value in hex format (e.g., #ff0000) */
  @Prop({ mutable: true }) value: string = '#000000';

  /** Disable user interaction when true */
  @Prop() disabled: boolean = false;

  /** Text label displayed right to the color picker (optional) */
  @Prop() label?: string;

  /** Show last updated timestamp below the component */
  @Prop() showLastUpdated: boolean = false;

  /** Show visual operation status indicators (loading, success, failed) right to the component */
  @Prop() showStatus: boolean = true;

  // ============================== COMPONENT STATE ==============================

  /** Current operation status for visual feedback */
  @State() operationStatus: OperationStatus = 'idle';

  /** Error message from failed operations if any (optional) */
  @State() lastError?: string;

  /** Timestamp when value was last updated (optional) */
  @State() lastUpdatedTs?: number;

  /** Internal state that controls the visual appearance of the color picker */
  @State() private selectedColor: string = '#000000';

  /** Internal state counter for timestamp re-rendering */
  @State() private timestampCounter: number = 0;

  /** Internal state to prevents infinite event loops while programmatic updates */
  @State() private suppressEvents: boolean = false;

  // ============================== PRIVATE PROPERTIES ==============================

  /** Tracks component initialization state to prevent early watchers */
  private isInitialized: boolean = false;

  /** Timer for updating relative timestamps */
  private timestampUpdateTimer?: number;

  /** Stores API function from first initialization to use further for any user interactions */
  private storedWriteOperation?: (value: string) => Promise<any>;

  // ============================== EVENTS ==============================

  /**
   * Emitted when color picker value changes through user interaction or setValue calls.
   * Contains the new value, previous value, timestamp, and source information.
   */
  @Event() valueMsg: EventEmitter<UiMsg<string>>;

  // ============================== PUBLIC METHODS ==============================

  /**
   * Sets the color picker value with optional device communication api and other options.
   *
   * This is the primary method for connecting color pickers to real devices.
   * It supports optimistic updates, error handling, and automatic retries.
   *
   * @param value - The color value to set in hex format (e.g., #ff0000)
   * @param options - Configuration for device communication and behavior
   * @returns Promise resolving to true if successful, false if failed
   *
   * @example Basic Usage
   * ```javascript
   * await colorPicker.setValue('#ff0000');
   * ```
   *
   * @example JS integration with node-wot browser bundle
   * ```javascript
   * const colorPicker = document.getElementById('device-color');
   * const initialValue = String(await (await thing.readProperty('deviceColor')).value());
   * await colorPicker.setValue(initialValue, {
   *   writeOperation: async value => {
   *     await thing.writeProperty('deviceColor', value);
   *   },
   *   autoRetry: { attempts: 3, delay: 1000 }
   * });
   * ```
   */
  @Method()
  async setValue(
    value: string,
    options?: {
      writeOperation?: (value: string) => Promise<any>;
      readOperation?: () => Promise<any>;
      optimistic?: boolean;
      autoRetry?: { attempts: number; delay: number };
      _isRevert?: boolean;
    },
  ): Promise<boolean> {
    const prevValue = this.selectedColor;

    // Clear any existing error state
    if (this.operationStatus === 'error' && !options?._isRevert) {
      StatusIndicator.applyStatus(this, 'idle');
    }

    // Simple value update without other operations
    if (!options?.writeOperation && !options?.readOperation) {
      this.updateValue(value, prevValue);
      return true;
    }

    // If there is writeOperation store operation for future user interactions
    if (options.writeOperation && !options._isRevert) {
      this.storedWriteOperation = options.writeOperation;

      try {
        // Update the value optimistically
        this.updateValue(value, prevValue, false);
        return true;
      } catch (error) {
        StatusIndicator.applyStatus(this, 'error', error?.message || 'Setup failed');
        return false;
      }
    }

    // Execute operation immediately if no options selected
    return this.executeOperation(value, prevValue, options);
  }

  /**
   * Gets the current color picker value with optional metadata.
   *
   * @param includeMetadata - Whether to include status, timestamp and other information
   * @returns Current value or detailed metadata object
   */
  @Method()
  async getValue(includeMetadata: boolean = false): Promise<string | { value: string; lastUpdated?: number; status: string; error?: string }> {
    if (includeMetadata) {
      return {
        value: this.selectedColor,
        lastUpdated: this.lastUpdatedTs,
        status: this.operationStatus,
        error: this.lastError,
      };
    }
    return this.selectedColor;
  }

  /**
   * This method updates the value silently without triggering events.
   *
   * Use this for external data synchronization to prevent event loops.
   * Perfect for WebSocket updates or polling from remote devices.
   *
   * @param value - The color value to set silently in hex format
   */
  @Method()
  async setValueSilent(value: string): Promise<void> {
    this.updateValue(value, this.selectedColor, false);
  }

  /**
   * (Advance) to manually set the operation status indicator.
   *
   * Useful when managing device communication externally and you want to show loading/success/error states.
   *
   * @param status - The status to display
   * @param errorMessage - (Optional) error message for error status
   */
  @Method()
  async setStatus(status: 'idle' | 'loading' | 'success' | 'error', errorMessage?: string): Promise<void> {
    StatusIndicator.applyStatus(this, status, errorMessage);
  }

  // ============================== LIFECYCLE METHODS ==============================

  /** Initialize component state from props */
  componentWillLoad() {
    this.selectedColor = this.value || '#000000';
    this.isInitialized = true;
    if (this.showLastUpdated) this.startTimestampUpdater();
  }

  /** Clean up timers when component is removed */
  disconnectedCallback() {
    this.stopTimestampUpdater();
  }

  // ============================== WATCHERS ==============================

  /** Sync internal state when value prop changes externally */
  @Watch('value')
  watchValue(newVal: string) {
    if (!this.isInitialized) return;

    if (this.selectedColor !== newVal) {
      const prevValue = this.selectedColor;
      this.selectedColor = newVal;
      this.emitValueMsg(newVal, prevValue);
    }
  }

  // ============================== PRIVATE METHODS ==============================

  /**
   * This is the core state update method that handles value changes consistently.
   * It updates both internal state and external prop and also manages timestamps, and emits events (optional).
   */
  private updateValue(value: string, prevValue?: string, emitEvent: boolean = true): void {
    this.selectedColor = value;
    this.value = value;
    this.lastUpdatedTs = Date.now();

    if (emitEvent && !this.suppressEvents) {
      this.emitValueMsg(value, prevValue);
    }
  }

  /** Executes stored operations with error handling and retry logic */
  private async executeOperation(value: string, prevValue: string, options: any): Promise<boolean> {
    const optimistic = options?.optimistic !== false;

    // Show new value immediately (if optimistic = true)
    if (optimistic && !options?._isRevert) {
      this.updateValue(value, prevValue);
    }

    StatusIndicator.applyStatus(this, 'loading');

    try {
      // Execute the API call
      if (options.writeOperation) {
        await options.writeOperation(value);
      } else if (options.readOperation) {
        await options.readOperation();
      }

      StatusIndicator.applyStatus(this, 'success');

      // Update value after successful operation, (if optimistic = false)
      if (!optimistic) {
        this.updateValue(value, prevValue);
      }

      return true;
    } catch (error) {
      StatusIndicator.applyStatus(this, 'error', error?.message || String(error) || 'Operation failed');

      // Revert optimistic changes if operation is not successful or has an error
      if (optimistic && !options?._isRevert) {
        this.updateValue(prevValue, value, false);
      }

      // Retry logic
      if (options?.autoRetry && options.autoRetry.attempts > 0) {
        setTimeout(() => {
          this.setValue(value, {
            ...options,
            autoRetry: { ...options.autoRetry, attempts: options.autoRetry.attempts - 1 },
          });
        }, options.autoRetry.delay);
      }

      return false;
    }
  }

  /** Emits value change events with consistent UIMsg data structure */
  private emitValueMsg(value: string, prevValue?: string) {
    if (this.suppressEvents) return;
    this.valueMsg.emit({
      newVal: value,
      prevVal: prevValue,
      ts: Date.now(),
      source: this.el?.id || 'ui-color-picker',
      ok: true,
    });
  }

  /** Handles user color change interactions */
  private handleColorChange = async (event: Event) => {
    if (this.disabled) return;

    const target = event.target as HTMLInputElement;
    const newValue = target.value;
    const prevValue = this.selectedColor;

    StatusIndicator.applyStatus(this, 'loading');

    // Execute stored operation if available
    if (this.storedWriteOperation) {
      this.updateValue(newValue, prevValue);

      try {        
        await this.storedWriteOperation(newValue);
        StatusIndicator.applyStatus(this, 'success');
      } catch (error) {
        StatusIndicator.applyStatus(this, 'error', error?.message || 'Operation failed');
        this.updateValue(prevValue, newValue, false);
      }
    } else {
      StatusIndicator.applyStatus(this, 'error', 'No operation configured - setup may have failed');
    }
  };

  /** Manages timestamp update timer for relative time display */
  private startTimestampUpdater() {
    this.stopTimestampUpdater();
    this.timestampUpdateTimer = window.setInterval(() => this.timestampCounter++, 60000); //  Update every minute
  }

  /** Stops the timestamp update timer */
  private stopTimestampUpdater() {
    if (this.timestampUpdateTimer) {
      clearInterval(this.timestampUpdateTimer);
      this.timestampUpdateTimer = undefined;
    }
  }

  // ============================== RENDERING HELPERS ==============================

  /** Renders the status badge according to current operation state */
  private renderStatusBadge() {
    if (!this.showStatus) return null;

    const status = this.operationStatus || 'idle';
    const message = this.lastError || (status === 'idle' ? 'Ready' : '');
    return StatusIndicator.renderStatusBadge(status, message, h);
  }

  /** Renders the last updated timestamp */
  private renderLastUpdated() {
    if (!this.showLastUpdated) return null;

    // render an invisible placeholder when lastUpdatedTs is missing.
    const lastUpdatedDate = this.lastUpdatedTs ? new Date(this.lastUpdatedTs) : null;
    return StatusIndicator.renderTimestamp(lastUpdatedDate, this.dark ? 'dark' : 'light', h);
  }

  // ============================== MAIN COMPONENT RENDER METHOD ==============================

  /**
   * Renders the complete color picker component with all features and styles.
   */
  render() {
    const canInteract = !this.disabled;

    return (
      <div class="inline-block" part="container" role="group" aria-label={this.label || 'Color Picker'}>
        <div class="inline-flex items-center space-x-2 relative">
          {/* Label */}
          {this.label && (
            <label
              class={`select-none mr-2 transition-colors duration-200 ${!canInteract ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer hover:text-opacity-80'} ${
                this.dark ? 'text-white' : 'text-gray-900'
              }`}
              part="label"
            >
              {this.label}
            </label>
          )}

          {/* Color Picker Input */}
          <input
            type="color"
            class={`color-picker-input w-16 h-16 border-2 border-gray-300 dark:border-gray-600 rounded-md transition-all duration-200 ${
              this.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            value={this.selectedColor}
            disabled={this.disabled}
            onInput={e => canInteract && this.handleColorChange(e)}
            part="color-input"
          />

          {/* Status Badge */}
          {this.renderStatusBadge()}
        </div>

        {/* Last Updated Timestamp */}
        {this.renderLastUpdated()}
      </div>
    );
  }
}