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
 * @example Read-Only Mode
 * ```html
 * <ui-checkbox readonly="true" value="false" label="Sensor Status"></ui-checkbox>
 * ```
 *
 * @example JavaScript Integration with Multiple Checkboxes
 * ```javascript
 * // For single checkbox
 * const checkbox = document.querySelector('#my-checkbox');
 *
 * // For multiple checkboxes
 * const checkboxes = document.querySelectorAll('ui-checkbox');
 * checkboxes.forEach(checkbox => {
 *   checkbox.addEventListener('valueMsg', (e) => {
 *     console.log('Checkbox ID:', e.detail.source);
 *     console.log('New value:', e.detail.payload);
 *   });
 * });
 *
 * // Set value by ID
 * const termsCheckbox = document.getElementById('terms-checkbox');
 * await termsCheckbox.setValue(true);
 * ```
 *
 * @example HTML with IDs
 * ```html
 * <ui-checkbox id="terms-checkbox" label="Accept Terms" variant="outlined"></ui-checkbox>
 * <ui-checkbox id="newsletter-checkbox" label="Subscribe to Newsletter" variant="filled"></ui-checkbox>
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
   * Whether the checkbox is disabled (cannot be interacted with).
   */
  @Prop() disabled: boolean = false;

  /**
   * Whether the checkbox is read-only (displays value but cannot be changed).
   */
  @Prop({ mutable: true }) readonly: boolean = false;

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
  @Prop() showLastUpdated: boolean = false;

  /** Internal state tracking current visual state */
  @State() private isActive: boolean = false;

  /** Internal state for tracking if component is initialized */
  @State() private isInitialized: boolean = false;

  /** Flag to prevent event loops when setting values programmatically */
  @State() private suppressEvents: boolean = false;

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

  /** Consolidated setValue method with automatic Promise-based status management */
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
      this.connected = true;
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
   * Get the current checkbox value with optional metadata
   * @param includeMetadata - Include last updated timestamp and status
   * @returns Promise that resolves to the current value or value with metadata
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
   * Set value programmatically without triggering events (for external updates)
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
   * Set operation status for external status management
   */
  @Method()
  async setStatus(status: 'idle' | 'loading' | 'success' | 'error', errorMessage?: string): Promise<void> {
    StatusIndicator.applyStatus(this, status, { errorMessage });
  }

  /**
   * Trigger a read pulse indicator for readonly mode when data is actually fetched
   */
  @Method()
  async triggerReadPulse(): Promise<void> {
    if (this.readonly) {
      this.readPulseTs = Date.now();
    }
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
    if (this.showLastUpdated && this.lastUpdatedTs) {
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
      payload: value,
      prev: prevValue,
      ts: Date.now(),
      source: this.el?.id || 'ui-checkbox',
      ok: true,
    };
    this.valueMsg.emit(msg);
  }

  /** Handle checkbox click */
  private handleClick = () => {
    if (this.disabled || this.readonly) return;

    const newValue = !this.isActive;
    // Simple value change without any operation - for basic checkbox functionality
    this.isActive = newValue;
    this.value = newValue;
    this.lastUpdatedTs = Date.now();
    this.emitValueMsg(newValue, !newValue);
  };

  /** Get checkbox container style classes */
  private getCheckboxStyles() {
    const isDisabled = this.disabled;
    const isActive = this.isActive || this.readonly;
    
    let baseClasses = 'transition-all duration-300 flex items-center justify-center cursor-pointer';
    
    if (isDisabled) {
      baseClasses += ' opacity-50 cursor-not-allowed';
    }

    // Variant-specific styling with creative differences
    if (this.variant === 'minimal') {
      // Minimal: Simple circle that fills with color when checked
      baseClasses += ' w-4 h-4 rounded-full border-2';
      if (isActive) {
        baseClasses += this.color === 'primary' ? ' bg-primary border-primary text-white scale-110' :
                      this.color === 'secondary' ? ' bg-secondary border-secondary text-white scale-110' :
                      ' bg-neutral border-neutral text-white scale-110';
      } else {
        baseClasses += this.dark ? ' border-gray-500 bg-transparent hover:border-gray-400' : 
                      ' border-gray-400 bg-transparent hover:border-gray-600';
      }
    } else if (this.variant === 'outlined') {
      // Outlined: Square with thick border and checkmark
      baseClasses += ' w-5 h-5 rounded border-2';
      if (isActive) {
        baseClasses += this.color === 'primary' ? ' border-primary bg-white text-primary shadow-md' :
                      this.color === 'secondary' ? ' border-secondary bg-white text-secondary shadow-md' :
                      ' border-neutral bg-white text-neutral shadow-md';
      } else {
        baseClasses += this.dark ? ' border-gray-600 bg-gray-800 hover:border-gray-500' : 
                      ' border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm';
      }
    } else { // filled
      // Filled: Traditional square checkbox with solid fill when checked
      baseClasses += ' w-5 h-5 rounded';
      if (isActive) {
        baseClasses += this.color === 'primary' ? ' bg-primary text-white border border-primary' :
                      this.color === 'secondary' ? ' bg-secondary text-white border border-secondary' :
                      ' bg-neutral text-white border border-neutral';
      } else {
        baseClasses += this.dark ? ' bg-gray-700 border border-gray-600 hover:bg-gray-600' : 
                      ' bg-gray-50 border border-gray-300 hover:bg-gray-100';
      }
    }

    return baseClasses;
  }

  private getLabelStyles() {
    const isDisabled = this.disabled;
    
    let classes = 'ml-3 text-sm font-medium cursor-pointer';
    
    if (isDisabled) {
      classes += ' opacity-50 cursor-not-allowed';
    } else {
      classes += this.dark ? ' text-white' : ' text-gray-900';
    }

    return classes;
  }



  /** Render checkmark icon */
  private renderCheckmark() {
    if (this.variant === 'minimal') {
      // Simple dot for minimal variant
      return (
        <div class="w-2 h-2 rounded-full bg-current"></div>
      );
    } else if (this.variant === 'outlined') {
      // Classic checkmark for outlined variant
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
    } else {
      // Traditional checkmark for filled variant
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
  }

  /** Render the component */
  render() {
    const checkboxStyles = this.getCheckboxStyles();
    const labelStyles = this.getLabelStyles();
    const isDisabled = this.disabled;

    return (
      <div class="inline-block">
        <div class="flex items-center">
          <div class="relative">
            {/* Success Indicator */}
            {this.operationStatus === 'success' && (
              <div class="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 z-10">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 3L4.5 8.5L2 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            )}
            
            <div
              class={checkboxStyles}
              onClick={this.handleClick}
              role="checkbox"
              aria-checked={this.isActive ? 'true' : 'false'}
              aria-disabled={isDisabled ? 'true' : 'false'}
              tabIndex={isDisabled ? -1 : 0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  this.handleClick();
                }
              }}
            >
              {this.isActive && this.renderCheckmark()}
            </div>
          </div>
          {this.label && (
            <label class={labelStyles} onClick={this.handleClick}>
              {this.label}
            </label>
          )}
        </div>
        
        {/* Unified Status Indicators - Right aligned */}
        <div class="flex justify-between items-start mt-2">
          <div class="flex-1"></div>
          <div class="flex flex-col items-end gap-1">
            {StatusIndicator.renderStatusBadge(this.operationStatus, this.dark ? 'dark' : 'light', this.lastError, h)}
            {this.showLastUpdated && StatusIndicator.renderTimestamp(this.lastUpdatedTs ? new Date(this.lastUpdatedTs) : null, this.dark ? 'dark' : 'light', h)}
          </div>
        </div>
      </div>
    );
  }
}
