import { Component, Prop, State, h, Event, EventEmitter, Element, Watch, Method } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { StatusIndicator } from '../../utils/status-indicator';

export interface UiButtonClick { label: string }

export interface UiButtonClick { label: string }

/**
 * Button component with various visual styles, matching the ui-number-picker design family.
 * Supports the same variants, colors, and themes as the number picker.
 *
 * @example Basic Usage
 * ```html
 * <ui-button variant="minimal" label="Click Me"></ui-button>
 * ```
 *
 * @example Different Variants
 * ```html
 * <ui-button variant="outlined" color="primary" label="Outlined Button"></ui-button>
 * <ui-button variant="filled" color="secondary" label="Filled Button"></ui-button>
 * ```
 *
 * @example Custom Click Handler
 * ```html
 * <ui-button on-click="handleButtonClick" label="Custom Handler"></ui-button>
 * ```
 *
 * @example Event Handling
 * ```javascript
 * window.handleButtonClick = function(data) {
 *   console.log('Button clicked:', data.label);
 *   // Your custom logic here
 * };
 * ```
 */
@Component({
  tag: 'ui-button',
  styleUrl: 'ui-button.css',
  shadow: true,
})
export class UiButton {
  @Element() el!: HTMLElement;

  /**
   * Visual style variant of the button.
   * - minimal: Clean button with subtle background (default)
   * - outlined: Button with border outline
   * - filled: Solid filled button
   */
  @Prop() variant: 'minimal' | 'outlined' | 'filled' = 'minimal';

  /**
   * Whether the component is disabled (cannot be interacted with).
   * @example
   * ```html
   * <ui-button disabled="true" label="Cannot Click"></ui-button>
   * ```
   */
  @Prop() disabled: boolean = false;

  /**
   * Dark theme variant.
   * @example
   * ```html
   * <ui-button dark="true" label="Dark Button"></ui-button>
   * ```
   */
  @Prop() dark: boolean = false;

  /**
   * Color scheme to match thingsweb webpage
   * @example
   * ```html
   * <ui-button color="secondary" label="Colored Button"></ui-button>
   * ```
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /**
   * Button text label.
   * @example
   * ```html
   * <ui-button label="Click Me"></ui-button>
   * ```
   */
  @Prop() label: string = 'Button';

  /**
   * Whether the component is read-only (displays value but cannot be changed).
   * @example
   * ```html
   * <ui-button readonly="true" label="Display Only"></ui-button>
   * ```
   */
  @Prop() readonly: boolean = false;

  /**
   * Enable keyboard navigation.
   * @example
   * ```html
   * <ui-button keyboard="false" label="No Keyboard"></ui-button>
   * ```
   */
  @Prop() keyboard: boolean = true;

  /**
   * Show last updated timestamp below the component.
   * @example
   * ```html
   * <ui-button showLastUpdated="true" label="With Timestamp"></ui-button>
   * ```
   */
  @Prop() showLastUpdated: boolean = false;

  /** Internal state for tracking if component is initialized */
  @State() isInitialized: boolean = false;

  /** Current button value - corresponds to its label */
  @State() isActive: string = '';

  /** Prevents infinite event loops during external updates */
  @State() suppressEvents: boolean = false;

  /** Current operation status for visual feedback */
  @State() operationStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';

  /** Error message for failed operations */
  @State() lastError?: string;

  /** Timestamp of last successful update */
  @State() lastUpdatedTs?: number;
  
  /** Timer for auto-updating timestamps */
  @State() timestampUpdateTimer?: number;
  @State() private timestampCounter = 0;

  /**
   * Deprecated: string-based handler names are removed.
   * Use the `buttonClick` DOM event instead:
   * document.querySelector('ui-button').addEventListener('buttonClick', (e) => { ... })
   */

  /**
   * Thing Description URL for action invocation.
   * When provided, button will trigger an action on the device.
   * @example "http://device.local/actions/turnOn"
   */
  // TD integration removed: use normal clickHandler or events for external integration

  /** Event emitted when button is clicked */
  @Event() buttonClick: EventEmitter<UiButtonClick>;

  /**
   * Primary event emitted when the component value changes.
   * Use this event for all value change handling.
   * @example
   * ```javascript
   * document.querySelector('ui-button').addEventListener('valueMsg', (event) => {
   *   console.log('Button clicked:', event.detail);
   * });
   * ```
   */
  @Event() valueMsg!: EventEmitter<UiMsg<string>>;

  /** Consolidated setValue method with automatic Promise-based status management */
  @Method()
  async setValue(value: string, options?: {
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
        this.lastError = undefined;
      } else if (options.customStatus === 'success') {
        this.operationStatus = 'success';
        this.lastError = undefined;
        this.lastUpdatedTs = Date.now();
        setTimeout(() => { this.operationStatus = 'idle'; }, 1200);
      } else if (options.customStatus === 'error') {
        this.operationStatus = 'error';
        this.lastError = options.errorMessage || 'Operation failed';
        setTimeout(() => { this.operationStatus = 'idle'; this.lastError = undefined; }, 3000);
      }
      return true;
    }

    // Update the button label
    this.isActive = value;
    this.label = value;

    // Emit value change event
    if (!this.suppressEvents) {
      this.emitValueMsg(value);
    }

    // Handle automatic Promise-based operations
    if (options?.writeOperation || options?.readOperation) {
      this.operationStatus = 'loading';
      this.lastError = undefined;

      try {
        // Perform write operation if provided
        if (options.writeOperation) {
          await options.writeOperation();
        }

        // Perform read operation if provided  
        if (options.readOperation) {
          await options.readOperation();
        }

        // Success state
        this.operationStatus = 'success';
        this.lastUpdatedTs = Date.now();
        setTimeout(() => { this.operationStatus = 'idle'; }, 1200);
        return true;

      } catch (error) {
        // Handle failure
        this.operationStatus = 'error';
        this.lastError = error instanceof Error ? error.message : 'Operation failed';
        
        // Revert optimistic update if enabled
        if (options?.optimistic !== false && !options?._isRevert) {
          this.isActive = prevValue;
          this.label = prevValue;
        }

        setTimeout(() => { this.operationStatus = 'idle'; this.lastError = undefined; }, 3000);
        return false;
      }
    }

    return true;
  }

  /** Get current button value (its label) */
  @Method()
  async getValue(): Promise<string> {
    return this.isActive || this.label;
  }

  /** Set value silently without triggering events or status changes */
  @Method()
  async setValueSilent(value: string): Promise<boolean> {
    this.suppressEvents = true;
    this.isActive = value;
    this.label = value;
    this.suppressEvents = false;
    return true;
  }

  /** Manually set operation status */
  @Method()
  async setStatus(status: 'idle' | 'loading' | 'success' | 'error', message?: string): Promise<void> {
    StatusIndicator.applyStatus(this, status, { errorMessage: message });
  }

  /** Trigger visual read pulse (brief animation) */
  @Method()
  async triggerReadPulse(): Promise<void> {
    // For buttons, read pulse could highlight the button briefly
    this.operationStatus = 'loading';
    setTimeout(() => {
      this.operationStatus = 'success';
      this.lastUpdatedTs = Date.now();
      setTimeout(() => { this.operationStatus = 'idle'; }, 800);
    }, 200);
  }

  /** Emit standardized value change event */
  private emitValueMsg(value: string): void {
    if (this.suppressEvents) return;
    
    this.valueMsg.emit({
      payload: value,
      ts: Date.now(),
      source: this.el?.id || 'ui-button',
      meta: {
        label: this.label,
        variant: this.variant,
        color: this.color
      }
    });
  }

  /** Check if component can be interacted with */
  private get canInteract(): boolean {
    return !this.disabled && !this.readonly;
  }

  /** Watch for label changes and update internal state */
  @Watch('label')
  watchLabel(newValue: string): void {
    if (this.isInitialized) {
      this.isActive = newValue;
    }
  }

  /** Initialize component */
  componentWillLoad() {
    // Initialize state
    this.isActive = this.label;
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

  /** Watch for mode prop changes and update readonly state */
  @Watch('disabled')
  protected watchDisabled(newValue: boolean) {
    // Update interaction state when disabled prop changes
    if (newValue && this.operationStatus === 'idle') {
      this.operationStatus = 'error';
      this.lastError = 'Component is disabled';
      setTimeout(() => { this.operationStatus = 'idle'; this.lastError = undefined; }, 1000);
    }
  }

  /** Handle button click */
  private handleClick = async () => {
    if (this.disabled || !this.canInteract) return;

    // Show quick feedback
    this.operationStatus = 'loading';

    // Emit both legacy and unified events
    this.emitClick();
    this.emitValueMsg(this.label);

    // Assume success for local-only action; external handlers can override via attributes/events
    setTimeout(() => {
      this.operationStatus = 'success';
      // Auto clear
      setTimeout(() => { this.operationStatus = 'idle'; this.lastError = undefined; }, 1200);
    }, 50);
  };

  /** Emit click events */
  private emitClick() {
    // Emit click event for parent to handle
    this.buttonClick.emit({
      label: this.label,
    });

  // Local-only: consumers should listen to `buttonClick` for custom behavior.
  }

  /** Handle keyboard input */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled || !this.canInteract || !this.keyboard) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleClick();
    }
  };

  /** Get button style classes */
  private getButtonStyle(): string {
    const isDisabled = this.disabled;

    let baseClasses = 'px-6 h-12 flex items-center justify-center text-base font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg';

    if (isDisabled) {
      baseClasses += ' opacity-50 cursor-not-allowed';
    } else {
      baseClasses += ' cursor-pointer hover:scale-105 active:scale-95';
    }

    // Variant-specific styling with explicit color control
    if (this.variant === 'minimal') {
      // Minimal: No background, no border, just text
      if (isDisabled) {
        baseClasses += ' text-gray-400';
      } else {
        // Clear color specification based on theme
        if (this.dark) {
          baseClasses += ' bg-transparent text-white-dark hover:bg-gray-800';
        } else {
          baseClasses += ' bg-transparent text-black-force hover:bg-gray-100';
        }
      }
    } else if (this.variant === 'outlined') {
      // Outlined: Border with user's chosen color, no background
      if (isDisabled) {
        baseClasses += ' border-2 border-gray-300 text-gray-400 bg-transparent';
      } else {
        const borderColor = `border-${this.getColorName()}`;
        const hoverBg = `hover:bg-${this.getColorName()}`;

        if (this.dark) {
          baseClasses += ` border-2 ${borderColor} bg-transparent text-white-dark ${hoverBg} hover:text-white-force`;
        } else {
          baseClasses += ` border-2 ${borderColor} bg-transparent text-black-force ${hoverBg} hover:text-white-force`;
        }
      }
    } else if (this.variant === 'filled') {
      // Filled: Background with user's chosen color, text color matches theme
      if (isDisabled) {
        baseClasses += ' bg-gray-400 text-white-force';
      } else {
        // Filled buttons: black text in light theme, white text in dark theme
        if (this.dark) {
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

  /** Get color name for CSS classes */
  private getColorName(): string {
    return this.color === 'primary' ? 'primary' : this.color === 'secondary' ? 'secondary' : 'neutral';
  }

  /** Render component */
  render() {
    const isDisabled = this.disabled;

    return (
  <div class="relative" part="container" role="group" aria-label={this.label || 'Button'}>
        <div class="flex items-center">
          <button 
            class={this.getButtonStyle()} 
            onClick={this.handleClick} 
            onKeyDown={this.handleKeyDown} 
            disabled={isDisabled} 
            aria-label={this.label} 
            part="button" 
            aria-pressed={isDisabled ? 'false' : undefined}
          >
            {this.label}
          </button>
        </div>
        
        {/* Unified Status Badge (timestamp moved below) */}
        <div class="flex justify-end items-start mt-2">
          {StatusIndicator.renderStatusBadge(this.operationStatus, this.dark ? 'dark' : 'light', this.lastError, h)}
        </div>
        {this.showLastUpdated && (
          <div class="flex justify-end mt-2">
            {StatusIndicator.renderTimestamp(this.lastUpdatedTs ? new Date(this.lastUpdatedTs) : null, this.dark ? 'dark' : 'light', h)}
          </div>
        )}
      </div>
    );
  }
}
