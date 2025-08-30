import { Component, Prop, h, Event, EventEmitter, Method, Element, State, Watch } from '@stencil/core';
import { 
  emitValueMsg, 
  getStatusManager, 
  ComponentStatusManager,
  onComponentDisconnected,
  validators,
  cssClasses,
  ValueMessage,
  EmitOptions
} from '../../utils';

export interface UiButtonClick { 
  label: string;
  timestamp: number;
}

/**
 * Normalized Button Component
 * A button component following UI-WoT standards with centralized utilities
 *
 * @example Basic Usage
 * ```html
 * <ui-button-normalized variant="primary" label="Click Me"></ui-button-normalized>
 * ```
 *
 * @example With Status Management
 * ```html
 * <ui-button-normalized label="Save" auto-status="true"></ui-button-normalized>
 * ```
 */
@Component({
  tag: 'ui-button-normalized',
  styleUrl: 'ui-button-normalized.css',
  shadow: true,
})
export class UiButtonNormalized {
  @Element() el!: HTMLElement;
  
  @State() protected componentStatus: string = 'idle';
  @State() private isInitialized: boolean = false;
  
  private statusManager?: ComponentStatusManager;
  private isConnected = false;

  /**
   * Button text label
   */
  @Prop() label: string = 'Button';
  
  /**
   * Visual variant of the button
   */
  @Prop() variant: 'primary' | 'secondary' | 'outline' | 'ghost' = 'primary';
  
  /**
   * Size variant
   */
  @Prop() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  
  /**
   * Whether the button is disabled
   */
  @Prop() disabled: boolean = false;
  
  /**
   * Whether the button is in loading state
   */
  @Prop() loading: boolean = false;
  
  /**
   * Icon to display before label
   */
  @Prop() icon?: string;
  
  /**
   * Icon to display after label
   */
  @Prop() iconEnd?: string;
  
  /**
   * Button type for form submission
   */
  @Prop() type: 'button' | 'submit' | 'reset' = 'button';
  
  /**
   * Auto-manage status feedback for async operations
   */
  @Prop() autoStatus: boolean = false;
  
  /**
   * Debounce delay for rapid clicks (ms)
   */
  @Prop() debounceDelay: number = 150;

  /**
   * Event emitted when button is clicked
   */
  @Event() buttonClick: EventEmitter<UiButtonClick>;

  /**
   * Primary event emitted when the component value changes
   */
  @Event() valueMsg: EventEmitter<ValueMessage>;

  connectedCallback(): void {
    this.isConnected = true;
    
    // Initialize status manager
    this.statusManager = getStatusManager(this.el, 'button-normalized');
    
    // Add component classes
    this.el.classList.add('ui-component', 'ui-button-normalized');
    
    // Set component attributes
    this.el.setAttribute('data-ui-component', 'button-normalized');
    this.el.setAttribute('data-ui-version', '1.0.0');
    
    // Validate props
    this.validateProps();
    this.isInitialized = true;
  }
  
  disconnectedCallback(): void {
    this.isConnected = false;
    
    // Cleanup status manager
    if (this.statusManager) {
      onComponentDisconnected(this.el);
    }
  }

  /**
   * Trigger button click programmatically
   */
  @Method()
  async triggerClick(): Promise<void> {
    if (!this.canInteract()) return;
    this.handleClick();
  }

  /**
   * Set loading state with optional message
   */
  @Method()
  async setLoading(loading: boolean, message?: string): Promise<void> {
    this.loading = loading;
    
    if (loading && message) {
      this.setInfo(message, 0); // No auto-clear for loading
    } else if (!loading) {
      this.clearStatus();
    }
  }

  /**
   * Perform async operation with automatic status management
   */
  @Method()
  async performAction(
    action: () => Promise<any>,
    options: {
      loadingMessage?: string;
      successMessage?: string;
      errorMessage?: string;
    } = {}
  ): Promise<boolean> {
    if (!this.autoStatus) {
      console.warn('autoStatus must be enabled to use performAction');
      return false;
    }

    const {
      loadingMessage = 'Processing...',
      successMessage = 'Action completed successfully',
      errorMessage = 'Action failed'
    } = options;

    return this.withStatus(action, loadingMessage, successMessage, errorMessage)
      .then(result => result !== null);
  }

  private canInteract(): boolean {
    return !this.disabled && !this.loading && this.isConnected;
  }

  private handleClick = (): void => {
    if (!this.canInteract()) return;

    const clickData: UiButtonClick = {
      label: this.label,
      timestamp: Date.now()
    };

    // Emit standard button click event
    this.buttonClick.emit(clickData);
    
    // Emit unified value message
    this.emitValue(clickData, {
      debounce: this.debounceDelay,
      meta: {
        type: 'user',
        context: { variant: this.variant, size: this.size }
      }
    });

    // Auto status feedback for local actions
    if (this.autoStatus) {
      this.setSuccess('Button clicked', 1500);
    }
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.canInteract()) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleClick();
    }
  };

  private validateProps(): void {
    const rules = {
      label: validators.required,
      variant: (value: string) => ['primary', 'secondary', 'outline', 'ghost'].includes(value),
      size: (value: string) => ['xs', 'sm', 'md', 'lg', 'xl'].includes(value),
      type: (value: string) => ['button', 'submit', 'reset'].includes(value),
      debounceDelay: validators.min(0)
    };
    
    for (const [propName, validator] of Object.entries(rules)) {
      const value = (this as any)[propName];
      const result = validator(value);
      
      if (typeof result === 'string') {
        this.setError(`Invalid ${propName}: ${result}`);
        return;
      } else if (!result) {
        this.setError(`Invalid ${propName} value`);
        return;
      }
    }
  }

  private emitValue(value: any, options: EmitOptions = {}): ValueMessage {
    const emitOptions: EmitOptions = {
      debounce: 150,
      ...options
    };
    
    const valueMessage = emitValueMsg(this.el, 'button-normalized', value, emitOptions);
    this.valueMsg.emit(valueMessage);
    return valueMessage;
  }

  private setSuccess(message: string, autoClear = 3000): void {
    this.statusManager?.setSuccess({ message, autoClear });
    this.componentStatus = 'success';
  }
  
  private setError(message: string, autoClear?: number): void {
    this.statusManager?.setError({ message, autoClear });
    this.componentStatus = 'error';
  }
  
  private setInfo(message: string, autoClear = 4000): void {
    this.statusManager?.setInfo({ message, autoClear });
    this.componentStatus = 'info';
  }
  
  private clearStatus(): void {
    this.statusManager?.clear();
    this.componentStatus = 'idle';
  }

  private async withStatus<T>(
    operation: () => Promise<T>,
    loadingMessage = 'Processing...',
    successMessage = 'Operation completed',
    errorMessage = 'Operation failed'
  ): Promise<T | null> {
    try {
      this.setInfo(loadingMessage, 0); // No auto-clear for loading
      const result = await operation();
      this.setSuccess(successMessage);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : errorMessage;
      this.setError(errorMsg);
      return null;
    }
  }

  private getCssClasses(baseClasses: string, conditionalClasses: Record<string, boolean> = {}): string {
    const classes = [baseClasses];
    
    Object.entries(conditionalClasses).forEach(([className, condition]) => {
      if (condition) {
        classes.push(className);
      }
    });
    
    return classes.join(' ');
  }

  private getButtonClasses(): string {
    return this.getCssClasses(
      `${cssClasses.base} ui-button`,
      {
        [cssClasses.variants[this.variant]]: true,
        [cssClasses.sizes[this.size]]: true,
        [cssClasses.states.disabled]: this.disabled,
        [cssClasses.states.loading]: this.loading,
        'ui-button-with-icon': !!this.icon,
        'ui-button-with-end-icon': !!this.iconEnd,
      }
    );
  }

  @Watch('componentStatus')
  statusChangedHandler(newStatus: string): void {
    this.el.setAttribute('data-status', newStatus);
    
    // Update loading state based on status
    if (newStatus === 'info') {
      this.loading = true;
    } else if (newStatus === 'idle') {
      this.loading = false;
    }
  }

  render() {
    if (!this.isInitialized) {
      return null;
    }

    const buttonClasses = this.getButtonClasses();
    const isDisabled = this.disabled || this.loading;

    return (
      <div class="ui-button-container" part="container">
        <button
          class={buttonClasses}
          onClick={this.handleClick}
          onKeyDown={this.handleKeyDown}
          disabled={isDisabled}
          type={this.type}
          aria-label={this.label}
          aria-busy={this.loading ? 'true' : 'false'}
          part="button"
        >
          {/* Leading Icon */}
          {this.icon && (
            <span class="ui-button-icon ui-button-icon-start" part="icon-start">
              <slot name="icon">{this.icon}</slot>
            </span>
          )}
          
          {/* Loading Spinner */}
          {this.loading && (
            <span class="ui-button-spinner" part="spinner" aria-hidden="true">
              <svg viewBox="0 0 24 24" class="ui-spinner">
                <circle 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  stroke-width="2" 
                  fill="none" 
                  stroke-dasharray="31.416" 
                  stroke-dashoffset="31.416"
                >
                  <animate 
                    attributeName="stroke-dasharray" 
                    dur="2s" 
                    values="0 31.416;15.708 15.708;0 31.416;0 31.416" 
                    repeatCount="indefinite"
                  />
                  <animate 
                    attributeName="stroke-dashoffset" 
                    dur="2s" 
                    values="0;-15.708;-31.416;-31.416" 
                    repeatCount="indefinite"
                  />
                </circle>
              </svg>
            </span>
          )}
          
          {/* Button Label */}
          <span class="ui-button-label" part="label">
            {this.label}
          </span>
          
          {/* Trailing Icon */}
          {this.iconEnd && (
            <span class="ui-button-icon ui-button-icon-end" part="icon-end">
              <slot name="icon-end">{this.iconEnd}</slot>
            </span>
          )}
        </button>
        
        {/* Status Message Slot */}
        <div class="ui-button-status" part="status">
          <slot name="status"></slot>
        </div>
      </div>
    );
  }
}
