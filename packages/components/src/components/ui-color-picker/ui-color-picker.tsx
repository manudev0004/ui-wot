import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator';

/**
 * A color picker component for selecting color values.
 * Provides a simple HTML5 color input with consistent styling and WoT integration.
 *
 * @example Basic Usage
 * ```html
 * <ui-color-picker value="#ff0000" label="Theme Color"></ui-color-picker>
 * ```
 *
 * @example JavaScript Integration
 * ```javascript
 * const colorPicker = document.querySelector('#color-selector');
 *
 * // Set initial value with write operation
 * await colorPicker.setValue('#00ff00', {
 *   writeOperation: async (color) => {
 *     await thing.writeProperty('deviceColor', color);
 *   }
 * });
 *
 * // Listen for color changes
 * colorPicker.addEventListener('valueMsg', (e) => {
 *   console.log('Color changed to:', e.detail.newVal);
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

  /**
   * Whether the component is disabled.
   */
  @Prop() disabled: boolean = false;

  /**
   * Whether the component is read-only.
   */
  @Prop() readonly: boolean = false;

  /**
   * Show last updated timestamp.
   */
  @Prop() showLastUpdated: boolean = false;

  /**
   * Show status badge when true.
   */
  @Prop() showStatus: boolean = true;

  /**
   * Current color value in hex format (e.g., #ff0000).
   */
  @Prop({ mutable: true }) value: string = '#000000';

  /**
   * Text label displayed above the color picker.
   */
  @Prop() label?: string;

  // ============================== COMPONENT STATE ==============================

  /** Internal state for the color value */
  @State() private selectedColor: string = '#000000';

  /** Operation status for unified status indicators */
  @State() private operationStatus: OperationStatus = 'idle';

  /** Last error message (if any) */
  @State() private lastError?: string;

  /** Timestamp of last value update */
  @State() private lastUpdatedTs?: number;

  /** Stored write operation for user interaction */
  private storedWriteOperation?: (value: string) => Promise<any>;

  // ============================== COMPONENT EVENTS ==============================

  /**
   * Emitted when the color value changes.
   */
  @Event() valueMsg: EventEmitter<UiMsg<string>>;

  // ============================== LIFECYCLE METHODS ==============================

  componentWillLoad() {
    this.selectedColor = this.value || '#000000';
  }

  @Watch('value')
  valueChanged(newValue: string) {
    this.selectedColor = newValue || '#000000';
  }

  // ============================== PUBLIC METHODS ==============================

  /**
   * Set the color value programmatically.
   * @param color - The color value in hex format
   * @param options - Optional configuration including write operation
   * @returns Promise that resolves to true if successful
   */
  @Method()
  async setValue(
    color: string,
    options?: {
      writeOperation?: (value: string) => Promise<void>;
      _isRevert?: boolean;
    },
  ): Promise<boolean> {
    const prevValue = this.selectedColor;

    // Clear error state unless reverting
    if (this.operationStatus === 'error' && !options?._isRevert) {
      StatusIndicator.applyStatus(this, 'idle');
    }

    // Store write operation for user interactions
    if (options?.writeOperation) {
      this.storedWriteOperation = options.writeOperation;
    }

    // Update without emitting events (for setup)
    this.updateValue(color, prevValue, false);
    return true;
  }

  /**
   * Get the current color value.
   * @returns The current color value
   */
  @Method()
  async getValue(): Promise<string> {
    return this.selectedColor;
  }

  // ============================== PRIVATE METHODS ==============================

  /**
   * Handle color change from user interaction.
   */
  private async handleColorChange(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const newColor = target.value;
    const prevValue = this.selectedColor;

    this.updateValue(newColor, prevValue, true);

    // Execute stored write operation if available
    if (this.storedWriteOperation) {
      try {
        StatusIndicator.applyStatus(this, 'loading');
        await this.storedWriteOperation(newColor);
        StatusIndicator.applyStatus(this, 'success');
      } catch (error: any) {
        StatusIndicator.applyStatus(this, 'error', error?.message || 'Operation failed');
        // Revert on error
        await this.setValue(prevValue, { _isRevert: true });
      }
    }
  }

  /**
   * Update the internal value and emit events if needed.
   */
  private updateValue(color: string, prevValue?: string, emitEvent: boolean = true): void {
    this.selectedColor = color;
    this.value = color;
    this.lastUpdatedTs = Date.now();

    if (emitEvent) {
      this.emitValueMsg(color, prevValue);
    }
  }

  /**
   * Emit the valueMsg event with standardized format.
   */
  private emitValueMsg(newVal: string, prevVal?: string): void {
    const msg: UiMsg<string> = {
      newVal,
      prevVal,
      ts: Date.now(),
      source: this.el.id || 'ui-color-picker',
      ok: true,
    };
    this.valueMsg.emit(msg);
  }

  /**
   * Format timestamp for display.
   */
  private formatTimestamp(timestamp?: number): string {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString();
  }

  // ============================== RENDER METHOD ==============================

  render() {
    const canInteract = !this.disabled && !this.readonly;

    return (
      <div class="flex flex-col gap-2">
        {this.label && <label class="text-sm font-medium text-gray-700 dark:text-gray-300">{this.label}</label>}

        <div class="flex items-center">
          <input
            type="color"
            class={`color-picker-input w-16 h-16 border-2 border-gray-300 dark:border-gray-600 ${this.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${
              this.readonly ? 'cursor-default' : ''
            }`}
            value={this.selectedColor}
            disabled={this.disabled}
            readonly={this.readonly}
            onInput={e => canInteract && this.handleColorChange(e)}
          />
        </div>

        {this.showStatus && this.operationStatus !== 'idle' && (
          <div
            class={`status-indicator flex items-center gap-1 text-xs ${
              this.operationStatus === 'loading'
                ? 'text-blue-600 dark:text-blue-400'
                : this.operationStatus === 'success'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {this.operationStatus === 'loading' && <span>Updating...</span>}
            {this.operationStatus === 'success' && <span>✓</span>}
            {this.operationStatus === 'error' && <span>✗ {this.lastError || 'Error'}</span>}
          </div>
        )}

        {this.showLastUpdated && this.lastUpdatedTs && <div class="text-xs text-gray-500 dark:text-gray-400">Last updated: {this.formatTimestamp(this.lastUpdatedTs)}</div>}
      </div>
    );
  }
}
