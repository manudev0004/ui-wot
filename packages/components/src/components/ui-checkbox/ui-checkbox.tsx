import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { StatusIndicator } from '../../utils/status-indicator';

/**
 * Advanced checkbox component with reactive state management and multiple visual styles.
 *
 * @example Basic Usage
 * ```html
 * <ui-checkbox variant="outlined" value="true" label="Accept Terms"></ui-checkbox>
 * ```
 *
 * @example Different Variants
 * ```html
 * <ui-checkbox variant="minimal" value="false" label="Minimal Style"></ui-checkbox>
 * <ui-checkbox variant="outlined" value="true" label="Outlined Style"></ui-checkbox>
 * <ui-checkbox variant="filled" value="false" label="Filled Style"></ui-checkbox>
 * ```
 *
 * @example JavaScript Integration
 * ```javascript
 * const checkbox = document.querySelector('#terms-checkbox');
 * checkbox.addEventListener('valueMsg', (e) => {
 *   console.log('Checkbox value:', e.detail.payload);
 * });
 * 
 * // Set value programmatically
 * await checkbox.setValue(true);
 * ```
 */
@Component({
  tag: 'ui-checkbox',
  styleUrl: 'ui-checkbox.css',
  shadow: true,
})
export class UiCheckbox {
  @Element() el: HTMLElement;

  /** Component props */

  /**
   * Visual style variant of the checkbox.
   */
  @Prop() variant: 'minimal' | 'outlined' | 'filled' = 'outlined';

  /**
   * Current boolean value of the checkbox.
   */
  @Prop({ mutable: true }) value: boolean = false;
  /**
   * Backwards-compatible `checked` attribute alias for `value`.
   * Accepts attribute usage like `checked` or `checked="true"` in demos.
   */
  @Prop({ mutable: true, reflect: true }) checked?: boolean;

  /**
   * Whether the checkbox is disabled (cannot be interacted with).
   */
  @Prop() disabled: boolean = false;

  // Note: checkbox does not support readonly mode

  /**
   * Text label displayed next to the checkbox.
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
   * Enable keyboard navigation (Space and Enter keys).
   * Default: true
   */
  @Prop() keyboard: boolean = true;

  /**
   * Show last updated timestamp when true
   */
  @Prop() showLastUpdated: boolean = true;

  /**
   * Show status badge when true
   */
  @Prop() showStatus: boolean = true;

  /** Connection state for readonly mode */
  @Prop({ mutable: true }) connected: boolean = true;

  /** Internal state tracking current visual state */
  @State() private isActive: boolean = false;

  /** Internal state for tracking if component is initialized */
  private isInitialized: boolean = false;

  /** Flag to prevent event loops when setting values programmatically */
  @State() private suppressEvents: boolean = false;

  // Keep internal sync between `value` and `checked` for attribute compatibility
  @Watch('checked')
  protected onCheckedChanged(newVal: boolean) {
    if (this.suppressEvents) return;
    this.suppressEvents = true;
    try {
      // Coerce undefined to false when attribute not present
      this.value = !!newVal;
    } finally {
      this.suppressEvents = false;
    }
  }

  @Watch('value')
  protected onValueChanged(newVal: boolean) {
    if (this.suppressEvents) return;
    this.suppressEvents = true;
    try {
      this.checked = !!newVal;
    } finally {
      this.suppressEvents = false;
    }
  }

  /** Operation status for write mode indicators */
  @State() operationStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  @State() lastError?: string;
  /** Timestamp of last value update for showLastUpdated feature */
  @State() lastUpdatedTs?: number;
  
  /** Timer for auto-updating timestamps */
  @State() timestampUpdateTimer?: number;
  @State() private timestampCounter = 0;

  /**
   * Set the checkbox value with automatic device communication and status management.
   * 
   * @param value - The boolean value to set (true = checked, false = unchecked)
   * @param options - Configuration options for the operation
   * @returns Promise<boolean> - true if successful, false if failed
   * 
   * @example Basic Usage (Easy)
   * ```javascript
   * const checkbox = document.querySelector('ui-checkbox');
   * await checkbox.setValue(true);   // Check
   * await checkbox.setValue(false);  // Uncheck
   * ```
   * 
   * @example IoT Device Control (Advanced)
   * ```javascript
   * const securityCheckbox = document.querySelector('#security-system');
   * await securityCheckbox.setValue(true, {
   *   writeOperation: async () => {
   *     await fetch('/api/security/arm', { method: 'POST' });
   *   },
   *   autoRetry: { attempts: 3, delay: 2000 }
   * });
   * ```
   */
  @Method()
  async setValue(value: boolean, options?: {
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
    /** Manual status override (for advanced users) */
    customStatus?: 'loading' | 'success' | 'error';
    /** Error message for manual error status */
    errorMessage?: string;
    /** Internal flag to indicate this is a revert operation */
    _isRevert?: boolean;
  }): Promise<boolean> {
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
    }
    
    // Optimistic update (default: true)
    const optimistic = options?.optimistic !== false;
    if (optimistic && !options?._isRevert) {
      this.isActive = value;
      this.value = value;
      this.lastUpdatedTs = Date.now();
      this.emitValueMsg(value, prevValue);
    }
    
    // Handle Promise-based operations
    if (options?.writeOperation || options?.readOperation) {
      const operation = options.writeOperation || options.readOperation;
      
      // Show loading state
      this.operationStatus = 'loading';
      
      try {
        // Execute the operation
        await operation();
        
        // Success - show success state briefly
        this.operationStatus = 'success';
        setTimeout(() => { 
          if (this.operationStatus === 'success') this.operationStatus = 'idle'; 
        }, 1200);
        
        // If not optimistic, apply value now
        if (!optimistic) {
          this.isActive = value;
          this.value = value;
          this.lastUpdatedTs = Date.now();
          this.emitValueMsg(value, prevValue);
        }
        
        return true;
        
      } catch (error) {
        // Error - show error state and revert if optimistic
        this.operationStatus = 'error';
        this.lastError = error.message || 'Operation failed';
        
        if (optimistic && !options?._isRevert) {
          // Revert to previous value
          this.isActive = prevValue;
          this.value = prevValue;
          // Don't emit event for revert to avoid loops
        }
        
        // Auto-retry logic
        if (options?.autoRetry && options.autoRetry.attempts > 0) {
          setTimeout(async () => {
            const retryOptions = {
              ...options,
              autoRetry: {
                attempts: options.autoRetry.attempts - 1,
                delay: options.autoRetry.delay
              }
            };
            await this.setValue(value, retryOptions);
          }, options.autoRetry.delay);
        }
        
        return false;
      }
    }
    
    // Simple value setting (no operation)
    if (!options?.writeOperation && !options?.readOperation && !options?._isRevert) {
      this.isActive = value;
      this.value = value;
      this.lastUpdatedTs = Date.now();
      this.emitValueMsg(value, prevValue);
    }

    return true;
  }

  /**
   * Get the current checkbox value with optional metadata.
   * 
   * @param includeMetadata - Include last updated timestamp and status
   * @returns Promise that resolves to the current value or value with metadata
   * 
   * @example Basic Usage (Easy)
   * ```javascript
   * const checkbox = document.querySelector('ui-checkbox');
   * const isChecked = await checkbox.getValue();
   * console.log('Checkbox is:', isChecked ? 'checked' : 'unchecked');
   * ```
   * 
   * @example With Metadata (Advanced)
   * ```javascript
   * const result = await checkbox.getValue(true);
   * console.log('Value:', result.value, 'Status:', result.status);
   * ```
   */
  @Method()
  async getValue(includeMetadata: boolean = false): Promise<boolean | { value: boolean; lastUpdated?: number; status: string; error?: string }> {
    if (includeMetadata) {
      return {
        value: this.isActive,
        lastUpdated: this.lastUpdatedTs,
        status: this.operationStatus,
        error: this.lastError
      };
    }
    return this.isActive;
  }

  /**
   * Set value programmatically without triggering events (for external updates).
   * 
   * @param value - The boolean value to set silently
   * @returns Promise<void>
   * 
   * @example Basic Usage (Easy)
   * ```javascript
   * const checkbox = document.querySelector('ui-checkbox');
   * await checkbox.setValueSilent(true);
   * ```
   * 
   * @example External Sync (Advanced)
   * ```javascript
   * // Sync from external system without events
   * const response = await fetch('/api/settings');
   * const settings = await response.json();
   * await checkbox.setValueSilent(settings.notifications);
   * ```
   */
  @Method()
  async setValueSilent(value: boolean): Promise<void> {
    this.suppressEvents = true;
    this.isActive = value;
    this.value = value;
    this.lastUpdatedTs = Date.now();
    this.suppressEvents = false;
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
   * const checkbox = document.querySelector('ui-checkbox');
   * await checkbox.setStatus('loading');
   * await checkbox.setStatus('success');
   * await checkbox.setStatus('error', 'Permission denied');
   * ```
   */
  @Method()
  async setStatus(status: 'idle' | 'loading' | 'success' | 'error', errorMessage?: string): Promise<void> {
    StatusIndicator.applyStatus(this, status, errorMessage);
  }

  /**
   * Trigger a read pulse indicator for readonly mode when data is actually fetched.
   * Note: Checkboxes don't support readonly mode, so this method is kept for API compatibility.
   * 
   * @returns Promise<void>
   * 
   * @example Basic Usage (Easy)
   * ```javascript
   * const checkbox = document.querySelector('ui-checkbox');
   * await checkbox.triggerReadPulse(); // No visual effect for checkboxes
   * ```
   */
  @Method()
  async triggerReadPulse(): Promise<void> {
  // checkbox does not support readonly/read-pulse; no-op kept for API compatibility
  return;
  }

  /**
   * Primary event emitted when the checkbox value changes.
   */
  @Event() valueMsg: EventEmitter<UiMsg<boolean>>;

  /** Initialize component state from props */
  componentWillLoad() {
    this.isActive = Boolean(this.value);
    this.isInitialized = true;
    
    // Initialize timestamp auto-update timer if showLastUpdated is enabled
    if (this.showLastUpdated) {
  // Seed initial timestamp so the timestamp area is present when enabled
  if (!this.lastUpdatedTs) this.lastUpdatedTs = Date.now();
      this.timestampUpdateTimer = window.setInterval(() => {
        // Force re-render to update relative timestamp
        this.timestampCounter++;
      }, 30000); // Update every 30 seconds
    }
  }

  /** Cleanup component */
  disconnectedCallback() {
    if (this.timestampUpdateTimer) {
      clearInterval(this.timestampUpdateTimer);
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
    }
  }

  /** Emit the unified UiMsg event */
  private emitValueMsg(value: boolean, prevValue?: boolean) {
    // Don't emit events if suppressed (to prevent loops)
    if (this.suppressEvents) return;
    
    // Primary unified event
    const msg: UiMsg<boolean> = {
      newVal: value,
      prevVal: prevValue,
      ts: Date.now(),
      source: this.el?.id || 'ui-checkbox',
      ok: true,
    };
    this.valueMsg.emit(msg);
  }

  /** Handle checkbox change */
  private handleChange = () => {
    if (this.disabled) return;

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
  };

  /** Get checkbox container style classes */
  private getCheckboxStyles() {
    const { disabled, variant, color, dark, isActive } = this;
    
    let classes = 'transition-all duration-300 flex items-center justify-center';
    
    // Base cursor and opacity
    classes += disabled ? ' opacity-50 cursor-not-allowed' : ' cursor-pointer';
    
    // Variant-specific styling
    switch (variant) {
      case 'minimal':
        classes += ' w-4 h-4 rounded-full border-2';
        if (isActive) {
          const colorClass = color === 'primary' ? 'primary' : color === 'secondary' ? 'secondary' : 'neutral';
          classes += ` bg-${colorClass} border-${colorClass} text-white scale-110`;
        } else {
          classes += dark ? ' border-gray-500 bg-transparent hover:border-gray-400' : 
                           ' border-gray-400 bg-transparent hover:border-gray-600';
        }
        break;
        
      case 'outlined':
        classes += ' w-5 h-5 rounded border-2';
        if (isActive) {
          const colorClass = color === 'primary' ? 'primary' : color === 'secondary' ? 'secondary' : 'neutral';
          classes += ` border-${colorClass} bg-white text-${colorClass} shadow-md`;
        } else {
          classes += dark ? ' border-gray-600 bg-gray-800 hover:border-gray-500' : 
                           ' border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm';
        }
        break;
        
      default: // filled
        classes += ' w-5 h-5 rounded';
        if (isActive) {
          const colorClass = color === 'primary' ? 'primary' : color === 'secondary' ? 'secondary' : 'neutral';
          classes += ` bg-${colorClass} text-white border border-${colorClass}`;
        } else {
          classes += dark ? ' bg-gray-700 border border-gray-600 hover:bg-gray-600' : 
                           ' bg-gray-50 border border-gray-300 hover:bg-gray-100';
        }
        break;
    }

    return classes;
  }

  private getLabelStyles() {
    const { disabled, dark } = this;
    
    let classes = 'ml-3 text-sm font-medium';
    classes += disabled ? ' opacity-50 cursor-not-allowed' : ' cursor-pointer';
    classes += dark ? ' text-white' : ' text-gray-900';

    return classes;
  }

  /** Render checkmark icon */
  private renderCheckmark() {
    if (this.variant === 'minimal') {
      return <div class="w-2 h-2 rounded-full bg-current"></div>;
    }
    
    // Both outlined and filled variants use the same checkmark SVG
    return (
      <svg
        class="w-3 h-3"
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill-rule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clip-rule="evenodd"
        />
      </svg>
    );
  }

  /** Render the component */
  render() {
    return (
      <div class="inline-block" part="container" role="group" aria-label={this.label || 'Checkbox'}>
        <div class="flex items-center gap-2">
          <div class="relative">
            <div
              class={this.getCheckboxStyles()}
              onClick={this.handleChange}
              role="checkbox"
              aria-checked={this.isActive ? 'true' : 'false'}
              aria-disabled={this.disabled ? 'true' : 'false'}
              tabIndex={this.disabled ? -1 : 0}
              part="checkbox"
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !this.disabled) {
                  e.preventDefault();
                  this.handleChange();
                }
              }}
            >
              {this.isActive && this.renderCheckmark()}
            </div>
          </div>
          
          {this.label && (
            <label class={this.getLabelStyles()} onClick={this.handleChange} part="label">
              {this.label}
            </label>
          )}

          {/* Status indicator */}
          {this.showStatus && (
            <div class="ml-2 flex items-center self-center" role="status">
              {StatusIndicator.renderStatusBadge(
                this.operationStatus, 
                this.dark ? 'dark' : 'light', 
                this.lastError, 
                h, 
                { position: 'sibling-right' }
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        {this.showLastUpdated && (
          <div class="mt-1 text-xs text-gray-500">
            {StatusIndicator.renderTimestamp(
              this.lastUpdatedTs ? new Date(this.lastUpdatedTs) : null, 
              this.dark ? 'dark' : 'light', 
              h
            )}
          </div>
        )}
      </div>
    );
  }
}
