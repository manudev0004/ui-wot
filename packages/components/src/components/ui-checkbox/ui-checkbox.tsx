import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { formatLastUpdated } from '../../utils/common-props';

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
    this.operationStatus = status;
    if (status === 'error' && errorMessage) {
      this.lastError = errorMessage;
    } else if (status !== 'error') {
      this.lastError = undefined;
    }
    
    // Auto-clear success status
    if (status === 'success') {
      setTimeout(() => { 
        if (this.operationStatus === 'success') {
          this.operationStatus = 'idle'; 
        }
      }, 1200);
    }
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

  /** Render status badge for visual feedback */
  private renderStatusBadge() {
    const isReadonly = this.readonly;
    const connected = this.connected !== false;
    
    if (isReadonly) {
      if (!connected) {
        return <span style={{position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '4px'}}>
          <span style={{width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block'}}></span>
        </span>;
      }
      const active = this.readPulseTs && (Date.now() - this.readPulseTs < 1500);
      if (active) {
        return <span style={{position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '4px'}}>
          <span style={{position: 'absolute', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#60a5fa', opacity: '0.6', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'}}></span>
          <span style={{width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'inline-block'}}></span>
        </span>;
      }
      return null;
    }

    switch (this.operationStatus) {
      case 'loading':
        return <span style={{position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '4px'}} title="Sending...">
          <span style={{width: '12px', height: '12px', borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', animation: 'spin 1s linear infinite'}}></span>
        </span>;
      case 'success':
          return <span style={{position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: '8px'}} title="Sent">
            <span style={{width: '16px', height: '16px', borderRadius: '9999px', backgroundColor: '#22c55e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '800', lineHeight: '16px'}}>✓</span>
          </span>;
      case 'error':
          return <span style={{position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: '8px'}} title={this.lastError || 'Error'}>
            <span style={{width: '16px', height: '16px', borderRadius: '9999px', backgroundColor: '#ef4444', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', lineHeight: '16px'}}>×</span>
          </span>;
      default:
        return null;
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

  /** Handle keyboard navigation */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled || this.readonly || !this.keyboard) return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.handleClick();
    }
  };

  /** Get checkbox container style classes */
  private getCheckboxStyle(): string {
    const isDisabled = this.disabled;
    const isActive = this.isActive;
    const canInteract = !this.disabled && !this.readonly;

    let baseClasses = 'w-5 h-5 border-2 rounded transition-all duration-200 flex items-center justify-center';
    
    if (this.variant === 'minimal') {
      baseClasses += ' border-transparent bg-transparent';
      if (isActive) {
        baseClasses += ' text-primary';
      } else {
        baseClasses += ' text-gray-400 hover:text-gray-600';
      }
    } else if (this.variant === 'filled') {
      if (isActive) {
        baseClasses += ` border-transparent ${this.getActiveColor()} text-white`;
      } else {
        baseClasses += this.dark ? ' border-gray-500 bg-transparent hover:border-gray-400' : ' border-gray-300 bg-white hover:border-gray-400';
      }
    } else { // outlined variant
      if (isActive) {
        baseClasses += ` border-2 ${this.getActiveBorderColor()} ${this.getActiveColor()} text-white`;
      } else {
        baseClasses += this.dark ? ' border-gray-500 bg-transparent hover:border-gray-400' : ' border-gray-300 bg-white hover:border-gray-400';
      }
    }

    if (isDisabled) {
      baseClasses += ' opacity-50 cursor-not-allowed';
    } else if (canInteract) {
      baseClasses += ' cursor-pointer';
    }

    return baseClasses;
  }

  /** Get active color class based on color prop */
  private getActiveColor(): string {
    const colorMap = {
      primary: 'bg-primary',
      secondary: 'bg-secondary',
      neutral: 'bg-gray-500',
    };
    return colorMap[this.color] || 'bg-primary';
  }

  /** Get active border color class based on color prop */
  private getActiveBorderColor(): string {
    const colorMap = {
      primary: 'border-primary',
      secondary: 'border-secondary',
      neutral: 'border-gray-500',
    };
    return colorMap[this.color] || 'border-primary';
  }

  /** Render checkmark icon */
  private renderCheckmark() {
    if (!this.isActive) return null;

    if (this.variant === 'minimal') {
      return <span class="text-lg font-bold">✓</span>;
    }

    return (
      <svg 
        class="w-3 h-3 fill-current" 
        viewBox="0 0 20 20"
      >
        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
      </svg>
    );
  }

  /** Render last updated timestamp if enabled */
  private renderLastUpdated() {
    if (!this.showLastUpdated || !this.lastUpdatedTs) return null;

    const timeText = formatLastUpdated(this.lastUpdatedTs);
    return (
      <span 
        class={`text-xs ${this.dark ? 'text-gray-300' : 'text-gray-500'} ml-2`}
        title={`Last updated: ${new Date(this.lastUpdatedTs).toLocaleString()}`}
        part="last-updated"
      >
        {timeText}
      </span>
    );
  }

  /** Render the component */
  render() {
    const canInteract = !this.disabled && !this.readonly;

    // Tooltip text
    let hoverTitle = '';
    if (this.readonly) {
      hoverTitle = 'Read-only mode - Value reflects external state';
    } else if (this.disabled) {
      hoverTitle = 'Checkbox is disabled';
    } else {
      hoverTitle = `Click to ${this.isActive ? 'uncheck' : 'check'}${this.label ? ` ${this.label}` : ''}`;
    }

    return (
      <div class="inline-flex items-center space-x-2" part="container">
        {/* Checkbox control */}
        {this.readonly ? (
          // Read-only indicator
          <span
            class={`inline-flex items-center justify-center w-5 h-5 rounded transition-all duration-300 ${
              this.isActive ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-red-500 shadow-lg shadow-red-500/50'
            }`}
            title={`${hoverTitle} - Current state: ${this.isActive ? 'CHECKED' : 'UNCHECKED'}`}
            part="readonly-indicator"
          >
            <span class="text-white text-xs font-bold">
              {this.isActive ? '✓' : '○'}
            </span>
          </span>
        ) : (
          // Interactive checkbox
          <span
            class={`${this.getCheckboxStyle()} ${
              canInteract ? 'hover:shadow-md' : ''
            }`}
            onClick={() => canInteract && this.handleClick()}
            onKeyDown={this.handleKeyDown}
            tabIndex={canInteract ? 0 : -1}
            title={hoverTitle}
            part="control"
          >
            {this.renderCheckmark()}
          </span>
        )}

        {/* Status badge placed to the right of the control */}
        {this.renderStatusBadge()}

        {/* Label slot or prop */}
        <slot name="label">
          {this.label && (
            <label
              class={`select-none transition-colors duration-200 ${!canInteract ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer hover:text-opacity-80'} ${
                this.dark ? 'text-white' : 'text-gray-900'
              }`}
              onClick={() => canInteract && this.handleClick()}
              title={hoverTitle}
              part="label"
            >
              {this.label}
            </label>
          )}
        </slot>

        {/* Last updated timestamp */}
        {this.renderLastUpdated()}
      </div>
    );
  }
}
