import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator';

/**
 * Toggle switch component with reactive state management and multiple visual styles.
 * Supports IoT device integration with status indicators and error handling.
 *
 * @example Basic Usage
 * ```html
 * <ui-toggle variant="circle" value="true" label="Light"></ui-toggle>
 * <ui-toggle variant="neon" value="false" label="Fan"></ui-toggle>
 * <ui-toggle readonly="true" label="Sensor" show-last-updated="true"></ui-toggle>
 * ```
 *
 * @example JavaScript Integration
 * ```javascript
 * const toggle = document.getElementById('light-toggle');
 *
 * // Set value with event handling
 * await toggle.setValue(true);
 *
 * // Listen for changes
 * toggle.addEventListener('valueMsg', (e) => {
 *   console.log('Toggle changed to:', e.detail.payload);
 * });
 *
 * // Device communication (IoT)
 * await toggle.setValue(true, {
 *   writeOperation: async () => {
 *     await fetch('/api/devices/light/power', {
 *       method: 'POST',
 *       body: JSON.stringify({ on: true })
 *     });
 *   },
 *   optimistic: true
 * });
 * ```
 */
@Component({
  tag: 'ui-toggle',
  styleUrl: 'ui-toggle.css',
  shadow: true,
})
export class UiToggle {
  @Element() el: HTMLElement;

  /**
   * @example Component props
   * 
   * Visual style variant of the toggle.
   * - circle: Common pill-shaped toggle (default)
   * - square: Rectangular toggle with square thumb
   * - apple: iOS-style switch (bigger size, rounded edges)
   * - cross: Shows × when off, ✓ when on with red background when off and green when on
   * - neon: Glowing effect when active
   * 
   */
  @Prop() variant: 'circle' | 'square' | 'apple' | 'cross' | 'neon' = 'circle';

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
   * Current boolean value of the toggle.
   */
  @Prop({ mutable: true }) value: boolean = false;

  /**
   * Whether the toggle is disabled when true, it cannot be interacted with.
   */
  @Prop() disabled: boolean = false;

  /**
   * Whether the toggle is read-only (when true displays value but cannot be changed).
   */
  @Prop({ mutable: true }) readonly: boolean = false;

  /**
   * Text label displayed next to the toggle.
   */
  @Prop() label?: string;

  /**
   * Enable keyboard navigation (Space and Enter keys).
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

  /** Connection state for readonly mode */
  @Prop({ mutable: true }) connected: boolean = true;

  /** Internal state tracking current visual state */
  @State() private isActive: boolean = false;

  /** Internal state for tracking if component is initialized */
  @State() private isInitialized: boolean = false;

  /** Flag to prevent varios event loops when setting values programmatically, make it fast but will lack some features*/
  @State() private suppressEvents: boolean = false;

  /** Operation status for unified status indicators */
  @State() operationStatus: OperationStatus = 'idle';

  /** Last error message (if any) */
  @State() lastError?: string;

  /** Timestamp of last read pulse (for readonly) */
  @State() readPulseTs?: number;

  /** Timestamp of last value update for showLastUpdated feature */
  @State() lastUpdatedTs?: number;

  /** Auto-updating timer for relative timestamps */
  @State() private timestampUpdateTimer?: number;

  /** Counter to trigger re-renders for timestamp updates - using state change to force re-render */
  @State() private timestampCounter: number = 0;

  /**
   * Set the toggle value and it has optional device communication and status management.
   *
   * @param value - The boolean value to set (true = on, false = off)
   * @param options - Configuration options for the operation
   * @returns Promise<boolean> - true if successful, false if failed
   *
   * @example
   * ```javascript
   * // Basic usage
   * await toggle.setValue(true);
   *
   * // With device communication
   * await toggle.setValue(true, {
   *   writeOperation: async () => {
   *     const response = await fetch('/api/devices/light', {
   *       method: 'POST',
   *       body: JSON.stringify({ on: true })
   *     });
   *   },
   *   optimistic: true,  // Update UI immediately
   *   autoRetry: { attempts: 3, delay: 1000 }
   * });
   * ```
   */
  @Method()
  async setValue(
    value: boolean,
    options?: {
      /** Automatic write operation - component handles all status transitions */
      writeOperation?: () => Promise<any>;
      /** Automatic read operation with pulse indicator */
      readOperation?: () => Promise<any>;
      /** Apply change optimistically, revert on failure (default: true) */
      optimistic?: boolean;
      /** Auto-retry configuration for failed operations */
      autoRetry?: {
        attempts: number;
        delay: number;
      };
      /** Manual status override (for advanced uses) */
      customStatus?: 'loading' | 'success' | 'error';
      /** Error message for manual error status */
      errorMessage?: string;
      /** Internal flag to indicate this is a revert operation */
      _isRevert?: boolean;
    },
  ): Promise<boolean> {
    const prevValue = this.isActive;

    // Handle manual status override (backward compatibility)
    if (options?.customStatus) {
      if (options.customStatus === 'loading') {
        this.operationStatus = 'loading';
        return true;
      }
      if (options.customStatus === 'success') {
        this.operationStatus = 'success';
        setTimeout(() => {
          if (this.operationStatus === 'success') this.operationStatus = 'idle';
        }, 1200);
        this.isActive = value;
        this.value = value;
        this.lastUpdatedTs = Date.now();
        if (this.readonly) this.readPulseTs = Date.now();
        this.emitValueMsg(value, prevValue);
        return true;
      }
      if (options.customStatus === 'error') {
        this.operationStatus = 'error';
        this.lastError = options.errorMessage || 'Operation failed';
        return false;
      }
    }

    // Auto-clear error state when user tries again (unless this is a revert)
    if (this.operationStatus === 'error' && !options?._isRevert) {
      this.operationStatus = 'idle';
      this.lastError = undefined;
      this.connected = true;
    }

    // Optimistic update (default: true)
    const optimistic = options?.optimistic !== false;
    if (optimistic && !options?._isRevert) {
      this.isActive = value;
      this.value = value;
      this.lastUpdatedTs = Date.now();
      if (this.readonly) this.readPulseTs = Date.now();
      this.emitValueMsg(value, prevValue);
    }

    // Handle Promise-based operations
    if (options?.writeOperation || options?.readOperation) {
      const operation = options.writeOperation || options.readOperation;

      // Show loading state
      this.operationStatus = 'loading';

      try {
        await operation();

        // Success - show success state and update value if not optimistic
        this.operationStatus = 'success';
        setTimeout(() => {
          if (this.operationStatus === 'success') this.operationStatus = 'idle';
        }, 1200);

        // If not optimistic, apply value now
        if (!optimistic) {
          this.isActive = value;
          this.value = value;
          this.lastUpdatedTs = Date.now();
          if (this.readonly) this.readPulseTs = Date.now();
          this.emitValueMsg(value, prevValue);
        }

        return true;
      } catch (error) {
        // Error - show error state and revert if optimistic
        this.operationStatus = 'error';
        this.lastError = error?.message || String(error) || 'Operation failed';

        if (optimistic && !options?._isRevert) {
          // Revert to previous value
          this.isActive = prevValue;
          this.value = prevValue;
        }

        // Auto-retry logic
        if (options?.autoRetry && options.autoRetry.attempts > 0) {
          setTimeout(async () => {
            const retryOptions = {
              ...options,
              autoRetry: {
                attempts: options.autoRetry.attempts - 1,
                delay: options.autoRetry.delay,
              },
            };
            await this.setValue(value, retryOptions);
          }, options.autoRetry.delay);
        }

        return false;
      }
    }

    // Simple value setting (no operation)
    if (!options?.writeOperation && !options?.readOperation) {
      this.isActive = value;
      this.value = value;
      this.lastUpdatedTs = Date.now();
      if (this.readonly) this.readPulseTs = Date.now();
      this.emitValueMsg(value, prevValue);
    }

    return true;
  }

  /**
   * Get the current toggle value with optional metadata.
   *
   * @param includeMetadata - Whether to include additional metadata (default: false)
   * @returns Promise<boolean | MetadataResult> - Current value or object with metadata
   *
   * @example
   * ```javascript
   * // Basic usage
   * const isOn = await toggle.getValue();
   * console.log('Toggle is:', isOn ? 'ON' : 'OFF');
   *
   * // With metadata
   * const result = await toggle.getValue(true);
   * console.log('Value:', result.value);
   * console.log('Last updated:', new Date(result.lastUpdated));
   * console.log('Status:', result.status);
   * ```
   */
  @Method()
  async getValue(includeMetadata: boolean = false): Promise<boolean | { value: boolean; lastUpdated?: number; status: string; error?: string }> {
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
   * Set value without triggering events (for external updates).
   * Use this method when updating from external data sources to prevent event loops.
   *
   * @param value - The boolean value to set silently
   * @returns Promise<void>
   *
   * @example
   * ```javascript
   * // Basic silent update
   * await toggle.setValueSilent(true);
   *
   * // In real-time context (WebSocket)
   * websocket.onmessage = async (event) => {
   *   const data = JSON.parse(event.data);
   *   await toggle.setValueSilent(data.isOn);
   *
   *   // Optional visual indicator
   *   if (toggle.readonly) {
   *     await toggle.triggerReadPulse();
   *   }
   * };
   * ```
   */
  @Method()
  async setValueSilent(value: boolean): Promise<void> {
    this.suppressEvents = true;
    this.isActive = value;
    this.value = value;
    this.lastUpdatedTs = Date.now();
    // Visual cue for readonly components when external updates arrive
    if (this.readonly) this.readPulseTs = Date.now();
    this.suppressEvents = false;
  }

  /**
   * Set operation status for external status management.
   * Use this method to manually control the visual status indicators
   * when managing device communication externally.
   *
   * @param status - The status to set ('idle', 'loading', 'success', 'error')
   * @param errorMessage - Optional error message for error status
   * @returns Promise<void>
   *
   * @example
   * ```javascript
   * const toggle = document.querySelector('ui-toggle');
   *
   * // Show loading indicator
   * await toggle.setStatus('loading');
   *
   * try {
   *   await deviceOperation();
   *   await toggle.setStatus('success');
   * } catch (error) {
   *   await toggle.setStatus('error', error.message);
   * }
   *
   * // Clear status indicator
   * await toggle.setStatus('idle');
   * ```
   */
  @Method()
  async setStatus(status: 'idle' | 'loading' | 'success' | 'error', errorMessage?: string): Promise<void> {
    StatusIndicator.applyStatus(this, status, { errorMessage });
  }

  /**
   * Trigger a read pulse indicator for readonly mode whenever data is fetched.
   * Use this method to provide visual feedback when refreshing data from external sources

   * @returns Promise<void>
   *
   * @example Basic Usage (Easy)
   * ```javascript
   * // Show visual pulse when data is refreshed
   * const toggle = document.querySelector('ui-toggle');
   * await toggle.triggerReadPulse();
   * ```
   *
   */
  @Method()
  async triggerReadPulse(): Promise<void> {
    if (this.readonly) {
      this.readPulseTs = Date.now();
      // Auto-hide after animation duration
      setTimeout(() => {
        if (this.readPulseTs && Date.now() - this.readPulseTs >= 1500) {
          this.readPulseTs = undefined;
        }
      }, 1500);
    }
  }

  /** Render status badge */
  private renderStatusBadge() {
    // Only render status badge if showStatus is true
    if (!this.showStatus) {
      return null;
    }

    if (this.readonly) {
      if (!this.connected) {
        return StatusIndicator.renderStatusBadge('error', 'light', 'Disconnected', h);
      }
      if (this.readPulseTs && Date.now() - this.readPulseTs < 1500) {
        return StatusIndicator.renderStatusBadge('success', 'light', 'Data received', h);
      }
      // Show idle status for readonly when connected
      return StatusIndicator.renderStatusBadge('idle', 'light', 'Connected', h);
    }
    
    // For interactive mode, show operation status or default idle
    const status = this.operationStatus || 'idle';
    const message = this.lastError || (status === 'idle' ? 'Ready' : '');
    return StatusIndicator.renderStatusBadge(status, 'light', message, h);
  }

  /**
   * Event emitted when the toggle value changes.
   *
   * @example
   * ```javascript
   * toggle.addEventListener('valueMsg', (event) => {
   *   // event.detail contains:
   *   // - payload: new value (boolean)
   *   // - prev: previous value
   *   // - source: component id
   *   // - ts: timestamp
   *
   *   console.log('New value:', event.detail.payload);
   *
   *   // Example: Send to server
   *   fetch('/api/device/light', {
   *     method: 'POST',
   *     body: JSON.stringify({ on: event.detail.payload })
   *   });
   * });
   * ```
   */
  @Event() valueMsg: EventEmitter<UiMsg<boolean>>;

  /** Component lifecycle */
  componentWillLoad() {
    this.isActive = Boolean(this.value);
    this.isInitialized = true;
    if (this.showLastUpdated) this.startTimestampUpdater();
  }

  componentDidLoad() {
    if (this.readonly) {
      setTimeout(() => (this.readPulseTs = Date.now()), 200);
    }
  }

  disconnectedCallback() {
    this.stopTimestampUpdater();
  }

  /** Timestamp management */
  private startTimestampUpdater() {
    this.stopTimestampUpdater();
    this.timestampUpdateTimer = window.setInterval(() => this.timestampCounter++, 30000);
  }

  private stopTimestampUpdater() {
    if (this.timestampUpdateTimer) {
      clearInterval(this.timestampUpdateTimer);
      this.timestampUpdateTimer = undefined;
    }
  }

  /** Watch for value prop changes and update internal state */
  @Watch('value')
  watchValue(newVal: boolean) {
    if (!this.isInitialized) return;

    if (this.isActive !== newVal) {
      const prevValue = this.isActive;
      this.isActive = newVal;
      this.emitValueMsg(newVal, prevValue);
      if (this.readonly) this.readPulseTs = Date.now();
    }
  }

  /** Event handling */
  private emitValueMsg(value: boolean, prevValue?: boolean) {
    if (this.suppressEvents) return;
    this.valueMsg.emit({
      payload: value,
      prev: prevValue,
      ts: Date.now(),
      source: this.el?.id || 'ui-toggle',
      ok: true,
    });
  }

  private handleChange = () => {
    if (this.disabled || this.readonly) return;
    
    // Show loading state briefly for visual feedback (only if showStatus is enabled)
    if (this.showStatus) {
      this.operationStatus = 'loading';
    }
    
    const newValue = !this.isActive;
    this.isActive = newValue;
    this.value = newValue;
    
    // Update timestamp only if showLastUpdated is enabled
    if (this.showLastUpdated) {
      this.lastUpdatedTs = Date.now();
    }
    
    this.emitValueMsg(newValue, !newValue);
    
    // Show success state and auto-clear (only if showStatus is enabled)
    if (this.showStatus) {
      setTimeout(() => {
        this.operationStatus = 'success';
        setTimeout(() => {
          this.operationStatus = 'idle';
        }, 1000);
      }, 100);
    }
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled || this.readonly || !this.keyboard) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.handleChange();
    }
  };

  /** Styling helpers */
  private getToggleStyle(): string {
    const { variant, disabled, isActive, color } = this;

    const sizeMap = {
      apple: 'w-11 h-7',
      default: 'w-12 h-6',
    };

    const shapeMap = {
      square: 'rounded-md',
      apple: 'rounded-full shadow-inner border-2 border-gray-500',
      default: 'rounded-full',
    };

    const size = sizeMap[variant] || sizeMap.default;
    const shape = shapeMap[variant] || shapeMap.default;
    const disabledClass = disabled ? 'disabled-state' : '';
    
    // Add neon glow classes when variant is neon and toggle is active
    let neonClass = '';
    if (variant === 'neon' && isActive) {
      if (color === 'secondary') {
        neonClass = 'neon-secondary';
      } else {
        neonClass = 'neon-primary';
      }
    } else if (variant === 'neon' && !isActive) {
      neonClass = 'neon-red'; // Red glow when neon toggle is off
    }

    return `relative inline-block cursor-pointer transition-all duration-300 ease-in-out ${size} ${shape} ${disabledClass} ${neonClass}`.trim();
  }

  private getThumbStyle(): string {
    const { variant, isActive } = this;

    if (variant === 'apple') {
      const movement = isActive ? 'translate-x-4' : 'translate-x-0';
      return `absolute w-6 h-6 bg-white transition-all duration-200 ease-in-out shadow-md rounded-full top-0 left-0 ${movement}`;
    }

    const shape = variant === 'square' ? 'rounded-sm' : 'rounded-full';
    const position = variant === 'neon' ? 'top-0.5 left-1' : 'top-1 left-1';
    const movement = isActive ? 'translate-x-6' : 'translate-x-0';

    return `absolute w-4 h-4 bg-white transition-transform duration-300 ease-in-out shadow-sm ${shape} ${position} ${movement}`;
  }

  private getBackgroundColor(): string {
    const { color, variant, isActive } = this;

    if (color === 'neutral') return isActive ? 'var(--color-neutral)' : '#d1d5db';
    if (variant === 'cross') return isActive ? this.getActiveColor() : 'var(--color-danger)';
    if (variant === 'apple') return isActive ? 'var(--color-success)' : '#374151';
    if (variant === 'neon') return isActive ? this.getNeonColor() : 'var(--color-danger)';

    return isActive ? this.getActiveColor() : '#d1d5db';
  }

  /** Get active color using CSS variables */
  private getActiveColor(): string {
    switch (this.color) {
      case 'secondary':
        return 'var(--color-secondary)';
      case 'neutral':
        return 'var(--color-neutral)';
      default:
        return 'var(--color-primary)';
    }
  }

  /** Get neon color using CSS variables */
  private getNeonColor(): string {
    return this.color === 'secondary' ? 'var(--color-secondary)' : 'var(--color-primary)';
  }

  /** Render cross/tick icons for cross variant */
  private renderCrossIcons() {
    if (this.variant !== 'cross') return null;
    return (
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        {!this.isActive ? (
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

  /** Render last updated timestamp */
  private renderLastUpdated() {
    if (!this.showLastUpdated || !this.lastUpdatedTs) return null;
    return StatusIndicator.renderTimestamp(new Date(this.lastUpdatedTs), this.dark ? 'dark' : 'light', h);
  }

  /** Render the component */
  render() {
    const canInteract = !this.disabled && !this.readonly;
    const hoverTitle = this.readonly
      ? 'Read-only mode - Value reflects external state'
      : this.disabled
      ? 'Toggle is disabled'
      : `Click to ${this.isActive ? 'turn off' : 'turn on'}${this.label ? ` ${this.label}` : ''}`;

    return (
      <div class="inline-block" part="container" role="group" aria-label={this.label || 'Toggle'}>
        <div class="inline-flex items-center space-x-2 relative">
          {/* Label */}
          <slot name="label">
            {this.label && (
              <label
                class={`select-none mr-2 transition-colors duration-200 ${!canInteract ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer hover:text-opacity-80'} ${
                  this.dark ? 'text-white' : 'text-gray-900'
                }`}
                onClick={() => canInteract && this.handleChange()}
                title={hoverTitle}
                part="label"
              >
                {this.label}
              </label>
            )}
          </slot>

          {/* Toggle control */}
          {this.readonly ? (
            <span
              class={`inline-flex items-center justify-center transition-all duration-300 ${
                this.variant === 'square' ? 'w-6 h-6 rounded-md' : this.variant === 'apple' ? 'w-7 h-7 rounded-full' : 'w-6 h-6 rounded-full'
              }`}
              style={{
                backgroundColor: this.isActive ? 'var(--color-success)' : 'var(--color-danger)',
                boxShadow: this.isActive ? '0 10px 15px -3px rgba(34, 197, 94, 0.5)' : '0 10px 15px -3px rgba(239, 68, 68, 0.5)',
              }}
              title={`${hoverTitle} - Current state: ${this.isActive ? 'ON' : 'OFF'}`}
              part="readonly-indicator"
            >
              <span class={`text-white text-xs font-bold ${this.variant === 'square' ? 'text-[10px]' : ''}`}>
                {this.variant === 'square' ? (this.isActive ? '■' : '□') : this.isActive ? '●' : '○'}
              </span>
            </span>
          ) : (
            <span
              class={`${this.getToggleStyle()} ${canInteract ? 'hover:shadow-md' : ''} transition-all duration-200`}
              style={{ backgroundColor: this.getBackgroundColor() }}
              onClick={() => canInteract && this.handleChange()}
              onKeyDown={this.handleKeyDown}
              tabIndex={canInteract ? 0 : -1}
              title={hoverTitle}
              part="control"
              role="switch"
              aria-checked={this.isActive ? 'true' : 'false'}
              aria-disabled={this.disabled ? 'true' : 'false'}
            >
              <span class={this.getThumbStyle()} part="thumb"></span>
              {this.renderCrossIcons()}
            </span>
          )}

          {/* Read pulse indicator */}
          {this.readonly && this.readPulseTs && Date.now() - this.readPulseTs < 1500 && (
            <span class="ml-1 flex items-center" part="readonly-pulse-sibling">
              <span
                class="w-3 h-3 rounded-full shadow-md"
                title="Updated"
                aria-hidden="true"
                style={{
                  backgroundColor: 'var(--color-info)',
                  animation: 'ui-read-pulse 1.4s ease-in-out forwards',
                }}
              ></span>
            </span>
          )}

          {/* Status badge */}
          {this.renderStatusBadge()}
        </div>

        {/* Last updated timestamp */}
        {this.renderLastUpdated()}
      </div>
    );
  }
}
