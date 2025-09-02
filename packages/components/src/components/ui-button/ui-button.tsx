import { Component, Prop, State, h, Event, EventEmitter, Element, Watch, Method } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { StatusIndicator } from '../../utils/status-indicator';

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
 * @example Event Handling
 * ```html
 * <ui-button id="my-button" label="Custom Handler"></ui-button>
 * ```
 *
 * @example JavaScript Event Handling
 * ```javascript
 * document.querySelector('#my-button').addEventListener('valueMsg', (event) => {
 *   console.log('Button clicked:', event.detail.payload);
 *   console.log('Button label:', event.detail.source);
 * });
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
  @Prop() variant: 'minimal' | 'outlined' | 'filled' = 'outlined';

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
  @Prop() showLastUpdated: boolean = true;

  /** Connection state for readonly mode */
  @Prop({ mutable: true }) connected: boolean = true;

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

  /**
   * Set the button value (label) with automatic operation management.
   * This method allows you to change the button text and optionally perform operations.
   * 
   * @param value - The string value to set as button label
   * @param options - Configuration options for the operation
   * @returns Promise<boolean> - true if successful, false if failed
   * 
   * @example Basic Usage (Easy)
   * ```javascript
   * // Simple label change
   * const button = document.querySelector('ui-button');
   * await button.setValue('Click Me');
   * await button.setValue('Save Changes');
   * ```
   * 
   * @example Dynamic Button States (Advanced)
   * ```javascript
   * // Button that changes based on state
   * const saveButton = document.querySelector('#save-button');
   * 
   * // Initial state
   * await saveButton.setValue('Save');
   * 
   * // When user makes changes
   * await saveButton.setValue('Save Changes*');
   * 
   * // During save operation
   * await saveButton.setValue('Saving...', {
   *   writeOperation: async () => {
   *     const response = await fetch('/api/save', {
   *       method: 'POST',
   *       body: JSON.stringify(formData)
   *     });
   *     if (!response.ok) throw new Error('Save failed');
   *   }
   * });
   * 
   * // After successful save
   * await saveButton.setValue('Saved ✓');
   * ```
   * 
   * @example API Operation Button (Advanced)
   * ```javascript
   * // Button that performs API calls
   * const deployButton = document.querySelector('#deploy-button');
   * 
   * await deployButton.setValue('Deploy', {
   *   writeOperation: async () => {
   *     // Start deployment
   *     const deployResponse = await fetch('/api/deploy', { method: 'POST' });
   *     if (!deployResponse.ok) throw new Error('Deployment failed');
   *     
   *     // Wait for completion
   *     const { deploymentId } = await deployResponse.json();
   *     await waitForDeployment(deploymentId);
   *   },
   *   autoRetry: {
   *     attempts: 2,
   *     delay: 5000
   *   }
   * });
   * ```
   * 
   * @example Multi-step Workflow (Advanced)
   * ```javascript
   * // Button for complex workflows
   * const processButton = document.querySelector('#process-button');
   * 
   * // Step 1: Validate
   * await processButton.setValue('Validating...', { customStatus: 'loading' });
   * await validateData();
   * 
   * // Step 2: Process
   * await processButton.setValue('Processing...', {
   *   writeOperation: async () => {
   *     await processData();
   *     await uploadResults();
   *   }
   * });
   * 
   * // Step 3: Complete
   * await processButton.setValue('Completed ✓', { customStatus: 'success' });
   * ```
   */
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

  /**
   * Get current button value (its label).
   * 
   * @returns Promise<string> - The current button label/text
   * 
   * @example Basic Usage (Easy)
   * ```javascript
   * // Get current button text
   * const button = document.querySelector('ui-button');
   * const currentText = await button.getValue();
   * console.log('Button says:', currentText);
   * ```
   * 
   * @example Dynamic UI Updates (Advanced)
   * ```javascript
   * // Check button state and update other elements
   * const buttons = document.querySelectorAll('ui-button');
   * 
   * for (const button of buttons) {
   *   const text = await button.getValue();
   *   const status = document.querySelector(`#status-${button.id}`);
   *   
   *   if (text.includes('✓')) {
   *     status.textContent = 'Completed';
   *     status.className = 'status-success';
   *   } else if (text.includes('...')) {
   *     status.textContent = 'In Progress';
   *     status.className = 'status-loading';
   *   }
   * }
   * ```
   * 
   * @example Button State Management (Advanced)
   * ```javascript
   * // Store and restore button states
   * const buttons = document.querySelectorAll('ui-button');
   * const buttonStates = new Map();
   * 
   * // Save current states
   * for (const button of buttons) {
   *   const value = await button.getValue();
   *   buttonStates.set(button.id, value);
   * }
   * 
   * // Later restore states
   * for (const [buttonId, savedValue] of buttonStates) {
   *   const button = document.querySelector(`#${buttonId}`);
   *   await button.setValue(savedValue);
   * }
   * ```
   */
  @Method()
  async getValue(): Promise<string> {
    return this.isActive || this.label;
  }

  /**
   * Set value silently without triggering events or status changes.
   * Use this for external updates that shouldn't trigger event listeners.
   * 
   * @param value - The string value to set as button label
   * @returns Promise<boolean> - Always returns true
   * 
   * @example Basic Usage (Easy)
   * ```javascript
   * // Update button text without triggering events
   * const button = document.querySelector('ui-button');
   * await button.setValueSilent('Updated Text');
   * ```
   * 
   * @example External Data Sync (Advanced)
   * ```javascript
   * // Sync button states from server without events
   * const response = await fetch('/api/ui-state');
   * const uiState = await response.json();
   * 
   * for (const [buttonId, label] of Object.entries(uiState.buttons)) {
   *   const button = document.querySelector(`#${buttonId}`);
   *   if (button) {
   *     await button.setValueSilent(label);
   *   }
   * }
   * ```
   * 
   * @example Real-time Collaboration (Advanced)
   * ```javascript
   * // Update UI from other users' actions
   * websocket.addEventListener('message', async (event) => {
   *   const { type, buttonId, newLabel } = JSON.parse(event.data);
   *   
   *   if (type === 'button-update') {
   *     const button = document.querySelector(`#${buttonId}`);
   *     if (button) {
   *       // Silent update to prevent event loops
   *       await button.setValueSilent(newLabel);
   *     }
   *   }
   * });
   * ```
   */
  @Method()
  async setValueSilent(value: string): Promise<boolean> {
    this.suppressEvents = true;
    this.isActive = value;
    this.label = value;
    this.suppressEvents = false;
    return true;
  }

  /**
   * Manually set operation status for external status management.
   * 
   * @param status - The status to set ('idle', 'loading', 'success', 'error')
   * @param message - Optional error message for error status
   * @returns Promise<void>
   * 
   * @example Basic Usage (Easy)
   * ```javascript
   * const button = document.querySelector('ui-button');
   * 
   * // Show loading
   * await button.setStatus('loading');
   * 
   * // Show success
   * await button.setStatus('success');
   * 
   * // Show error
   * await button.setStatus('error', 'Operation failed');
   * 
   * // Clear status
   * await button.setStatus('idle');
   * ```
   * 
   * @example Form Submission (Advanced)
   * ```javascript
   * // Form submission with status feedback
   * const submitButton = document.querySelector('#submit-form');
   * const form = document.querySelector('#my-form');
   * 
   * form.addEventListener('submit', async (e) => {
   *   e.preventDefault();
   *   
   *   try {
   *     await submitButton.setStatus('loading');
   *     
   *     const formData = new FormData(form);
   *     const response = await fetch('/api/submit', {
   *       method: 'POST',
   *       body: formData
   *     });
   *     
   *     if (!response.ok) {
   *       throw new Error(`HTTP ${response.status}: ${response.statusText}`);
   *     }
   *     
   *     await submitButton.setStatus('success');
   *     form.reset();
   *     
   *   } catch (error) {
   *     await submitButton.setStatus('error', error.message);
   *   }
   * });
   * ```
   * 
   * @example Multi-Button Workflow (Advanced)
   * ```javascript
   * // Coordinate status across multiple buttons
   * const buttons = document.querySelectorAll('.workflow-button');
   * 
   * async function runWorkflow() {
   *   for (let i = 0; i < buttons.length; i++) {
   *     const button = buttons[i];
   *     
   *     try {
   *       // Set current button to loading
   *       await button.setStatus('loading');
   *       
   *       // Set previous buttons to success
   *       for (let j = 0; j < i; j++) {
   *         await buttons[j].setStatus('success');
   *       }
   *       
   *       // Perform step
   *       await performWorkflowStep(i);
   *       
   *       // Set to success
   *       await button.setStatus('success');
   *       
   *     } catch (error) {
   *       await button.setStatus('error', `Step ${i + 1} failed`);
   *       break;
   *     }
   *   }
   * }
   * ```
   */
  @Method()
  async setStatus(status: 'idle' | 'loading' | 'success' | 'error', message?: string): Promise<void> {
    StatusIndicator.applyStatus(this, status, { errorMessage: message });
  }

  /**
   * Trigger visual read pulse (brief animation).
   * Provides visual feedback for data refresh or read operations.
   * 
   * @returns Promise<void>
   * 
   * @example Basic Usage (Easy)
   * ```javascript
   * // Show visual feedback after reading data
   * const button = document.querySelector('ui-button');
   * await button.triggerReadPulse();
   * ```
   * 
   * @example Data Refresh Indicator (Advanced)
   * ```javascript
   * // Show pulse when refreshing button data
   * const refreshButton = document.querySelector('#refresh-data');
   * 
   * setInterval(async () => {
   *   try {
   *     const response = await fetch('/api/status');
   *     const data = await response.json();
   *     
   *     // Update button text silently
   *     await refreshButton.setValueSilent(`Status: ${data.status}`);
   *     
   *     // Show pulse to indicate refresh
   *     await refreshButton.triggerReadPulse();
   *     
   *   } catch (error) {
   *     console.error('Failed to refresh:', error);
   *   }
   * }, 30000); // Every 30 seconds
   * ```
   * 
   * @example User Action Feedback (Advanced)
   * ```javascript
   * // Provide feedback for quick actions
   * const copyButton = document.querySelector('#copy-button');
   * 
   * copyButton.addEventListener('click', async () => {
   *   try {
   *     await navigator.clipboard.writeText('copied content');
   *     
   *     // Brief feedback
   *     await copyButton.setValue('Copied!');
   *     await copyButton.triggerReadPulse();
   *     
   *     // Reset after delay
   *     setTimeout(async () => {
   *       await copyButton.setValue('Copy');
   *     }, 2000);
   *     
   *   } catch (error) {
   *     await copyButton.setStatus('error', 'Copy failed');
   *   }
   * });
   * ```
   */
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
    if (this.showLastUpdated) {
  // Ensure we show an initial "last updated" when enabled so the UI always reserves space
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
    // Emit unified valueMsg event instead of separate buttonClick
    this.emitValueMsg(this.label);
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
  <div class="relative inline-block" part="container" role="group" aria-label={this.label || 'Button'}>
        <div class="inline-flex items-center">
          <button 
            class={this.getButtonStyle()} 
            onClick={this.handleClick} 
            onKeyDown={this.handleKeyDown} 
            disabled={isDisabled} 
            aria-label={this.label} 
            part="button" 
            aria-pressed={isDisabled ? 'false' : undefined}
          >
            <span part="label">{this.label}</span>
          </button>

          {/* Render status as an external sibling to the button so it's outside and vertically centered */}
          <div class="ml-3 flex items-center self-center" role="status">
            {StatusIndicator.renderStatusBadge(this.operationStatus, this.dark ? 'dark' : 'light', this.lastError, h, { position: 'sibling-right' })}
          </div>
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
