import { Component, Element, Prop, State, Event, EventEmitter, Method, h } from '@stencil/core';
import { UiMsg } from '../../utils/types'; // Standard message format
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator'; // Status indicator utility

/**
 * A simple button component designed for WoT device actions.
 *
 * Features multiple visual styles, status indicators, and Web of Things integration.
 * Buttons trigger actions rather than managing state values.
 *
 * @example Basic Usage
 * ```html
 * <ui-button label="Click Me"></ui-button>
 * <ui-button variant="filled" label="Submit" show-status="true"></ui-button>
 * ```
 *
 * @example WoT Action Integration
 * ```javascript
 * const button = document.getElementById('device-button');
 * await button.setAction(async () => {
 *   await thing.invokeAction('execute');
 * });
 * ```
 */
@Component({
  tag: 'ui-button',
  styleUrl: 'ui-button.css',
  shadow: true,
})
export class UiButton {
  @Element() el: HTMLElement;

  // ============================================= COMPONENT PROPERTIES =============================================

  /**
   * Visual style variant of the button.
   * - minimal: Clean design with transparent background
   * - outlined: Border-focused design with outline style
   * - filled: Solid background design
   */
  @Prop() variant: 'minimal' | 'outlined' | 'filled' = 'outlined';

  /** Color theme for the button matching to thingsweb theme */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /** Enable dark mode theme styling when true */
  @Prop() dark: boolean = false;

  /** Text label displayed on the button */
  @Prop() label: string = 'Button';

  /** Disable user interaction when true */
  @Prop() disabled: boolean = false;

  /** Enable keyboard navigation so user can click using 'Space' and 'Enter' keys when true */
  @Prop() keyboard: boolean = true;

  /** Show last updated timestamp below the component */
  @Prop() showLastUpdated: boolean = false;

  /** Show visual operation status indicators (loading, success, failed) right to the component */
  @Prop() showStatus: boolean = false;

  // =============== COMPONENT STATE ===============

  /** Current operation status for visual feedback */
  @State() operationStatus: OperationStatus = 'idle';

  /** Error message from failed operations if any (optional) */
  @State() lastError?: string;

  /** Timestamp when button was last clicked (optional) */
  @State() lastClickedTs?: number;

  /** Internal state counter for timestamp re-rendering */
  @State() private timestampCounter: number = 0;

  // =============== PRIVATE PROPERTIES ===============

  /** Timer for updating relative timestamps */
  private timestampUpdateTimer?: number;

  /** Stores the action function to execute on click */
  private storedAction?: () => Promise<any>;

  // =============== EVENTS ===============

  /**
   * Emitted when button is clicked through user interaction.
   * Contains the button label, timestamp, and source information.
   */
  @Event() clickMsg: EventEmitter<UiMsg<string>>;

  // =============== PUBLIC METHODS ===============

  /**
   * Sets the action to execute when button is clicked.
   * This is the primary method for connecting button to real devices .
   *
   * @param actionFn - The async function to execute on button click
   * @returns Promise resolving to true if successful, false if failed
   *
   * @example Basic Usage
   * ```javascript
   * await button.setAction(async () => {
   *   await thing.invokeAction('execute');
   * });
   * ```
   */
  @Method()
  async setAction(actionFn?: () => Promise<any>): Promise<boolean> {
    this.storedAction = actionFn;
    return true;
  }

  /**
   * (Advance) to manually set the operation status indicator.
   * Useful when managing device communication externally and you want to show loading/success/error states.
   *
   * @param status - The status to display
   * @param errorMessage - (Optional) error message for error status
   */
  @Method()
  async setStatus(status: 'idle' | 'loading' | 'success' | 'error', errorMessage?: string): Promise<void> {
    StatusIndicator.applyStatus(this, status, errorMessage);
  }

  // =============== LIFECYCLE METHODS ===============

  /** Initialize component state from props */
  componentWillLoad() {
    if (this.showLastUpdated) this.startTimestampUpdater();
  }

  /** Clean up timers when component is removed */
  disconnectedCallback() {
    this.stopTimestampUpdater();
  }

  // =============== PRIVATE METHODS ===============

  /** Emits click events with consistent UIMsg data structure */
  private emitClickMsg() {
    this.clickMsg.emit({
      newVal: this.label,
      prevVal: undefined,
      ts: Date.now(),
      source: this.el?.id || 'ui-button',
      ok: true,
    });
  }

  /** Handles user click interactions */
  private handleClick = async () => {
    if (this.disabled) return;

    this.lastClickedTs = Date.now();
    this.emitClickMsg();

    StatusIndicator.applyStatus(this, 'loading');

    // Execute stored action if available
    if (this.storedAction) {
      try {
        await this.storedAction();
        StatusIndicator.applyStatus(this, 'success');
      } catch (error) {
        StatusIndicator.applyStatus(this, 'error', error?.message || 'Action failed');
      }
    } else {
      StatusIndicator.applyStatus(this, 'error', 'No action configured - setup may have failed');
    }
  };

  /** Handle keyboard 'enter' and 'spacebar' input to click button */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled || !this.keyboard) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.handleClick();
    }
  };

  /** Manages timestamp update timer for relative time display */
  private startTimestampUpdater() {
    this.stopTimestampUpdater();
    this.timestampUpdateTimer = window.setInterval(() => this.timestampCounter++, 60000); // Update every minute
  }

  /** Stops the timestamp update timer */
  private stopTimestampUpdater() {
    if (this.timestampUpdateTimer) {
      clearInterval(this.timestampUpdateTimer);
      this.timestampUpdateTimer = undefined;
    }
  }

  // =============== RENDERING HELPERS ===============

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

    // render an invisible placeholder when lastClickedTs is missing.
    const lastUpdatedDate = this.lastClickedTs ? new Date(this.lastClickedTs) : null;
    return StatusIndicator.renderTimestamp(lastUpdatedDate, this.dark ? 'dark' : 'light', h);
  }

  // =============== STYLING HELPERS ===============

  /** Generates CSS classes and styles for the button based on variant and color */
  private getButtonStyle(): { classes: string; style: { [key: string]: string } } {
    const isDisabled = this.disabled;

    // Thingweb-inspired button styling with Fira Mono font
    let baseClasses =
      'inline-flex items-center justify-center gap-4 font-mono font-medium cursor-pointer transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-[10px] border px-5 py-3';
    let style: { [key: string]: string } = {};

    // Apply Fira Mono font
    style.fontFamily = 'var(--font-mono)';
    style.fontSize = 'var(--fs-body, 1rem)';
    style.fontWeight = 'var(--fw-medium, 500)';
    style.lineHeight = 'normal';

    if (isDisabled) {
      baseClasses += ' opacity-50 cursor-not-allowed';
    } else {
      baseClasses += ' hover:opacity-90 active:scale-[0.98] hover:scale-105';
    }

    // Variant-specific styling matching Thingweb patterns
    if (this.variant === 'minimal') {
      baseClasses += ' bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-800';
      style.color = this.getActiveColor();
    } else if (this.variant === 'outlined') {
      baseClasses += ' bg-transparent hover:bg-opacity-10';
      style.borderColor = this.getActiveColor();
      style.color = this.getActiveColor();
      style['--hover-bg'] = this.getActiveColor();
    } else if (this.variant === 'filled') {
      baseClasses += ' text-white';
      style.backgroundColor = this.getActiveColor();
      style.borderColor = this.getActiveColor();
      style['--hover-bg'] = this.getHoverColor();
    }

    // Focus ring color
    style['--tw-ring-color'] = this.getActiveColor();

    return { classes: baseClasses, style };
  }

  /** Generate the active color using global CSS variables */
  private getActiveColor(): string {
    switch (this.color) {
      case 'secondary':
        return 'var(--color-secondary)';
      case 'neutral':
        return 'var(--color-neutral)';
      default:
        return 'var(--ifm-color-primary)';
    }
  }

  /** Generate the hover color using global CSS variables */
  private getHoverColor(): string {
    switch (this.color) {
      case 'secondary':
        return 'var(--color-secondary-hover)';
      case 'neutral':
        return 'var(--color-neutral-hover)';
      default:
        return 'var(--color-primary-hover)';
    }
  }

  // =============== MAIN COMPONENT RENDER METHOD ===============

  /**
   * Renders the complete button component with all features and styles.
   */
  render() {
    const canInteract = !this.disabled;
    const hoverTitle = this.disabled ? 'Button is disabled' : `Click ${this.label}`;

    return (
      <div class="inline-block" part="container" role="group" aria-label={this.label}>
        <div class="inline-flex items-center space-x-3 relative">
          {/* Button Control */}
          <button
            class={this.getButtonStyle().classes}
            style={this.getButtonStyle().style}
            onClick={() => canInteract && this.handleClick()}
            onKeyDown={this.handleKeyDown}
            tabIndex={canInteract ? 0 : -1}
            title={hoverTitle}
            part="control"
            disabled={this.disabled}
            aria-disabled={this.disabled ? 'true' : 'false'}
          >
            {this.label}
          </button>

          {/* Status Badge */}
          {this.renderStatusBadge()}
        </div>

        {/* Last Updated Timestamp */}
        {this.renderLastUpdated()}
      </div>
    );
  }
}
