import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types'; // Standard message format
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator'; // Status indicator utility

/**
 * A versatile event listener component designed for WoT device control.
 *
 * It has various features, multiple visual styles, status and last updated timestamps.
 *
 * @example Basic Usage
 * ```html
 * <ui-event variant="outlined" label="Temperature Events" event-name="temperatureChanged"></ui-event>
 * <ui-event variant="filled" label="Motion Events" max-events="20" show-timestamp="true"></ui-event>
 * <ui-event variant="outlined" label="Device Status" show-last-updated="true"></ui-event>
 * ```
 *
 * @example JS integaration with node-wot browser bundle
 * ```javascript
 * const eventListener = document.getElementById('event-listener');
 * await eventListener.startListening();
 *
 * // Subscribe to event and pipe to component
 * await thing.subscribeEvent('on-bool', async data => {
 *   const value = data?.value ?? data;
 *   await eventListener.addEvent({
 *     event: 'on-bool',
 *     value,
 *     timestamp: new Date().toISOString()
 *   });
 * });
 * ```
 */
@Component({
  tag: 'ui-event',
  styleUrl: 'ui-event.css',
  shadow: true,
})
export class UiEvent {
  @Element() el: HTMLElement;

  // ============================== COMPONENT PROPERTIES ==============================

  /**
   * Visual style variant of the event listener.
   * - outlined: Border-focused design with outline style
   * - filled: Solid background design
   */
  @Prop() variant: 'outlined' | 'filled' = 'outlined';

  /** Color theme for the active state matching to thingsweb theme */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /** Enable dark mode theme styling when true */
  @Prop() dark: boolean = false;

  /** Disable user interaction when true */
  @Prop() disabled: boolean = false;

  /** Text label displayed above the event listener (optional) */
  @Prop() label?: string;

  /** Enable keyboard navigation so user can interact using keyboard when true */
  @Prop() keyboard: boolean = true;

  /** Show last updated timestamp below the component */
  @Prop() showLastUpdated: boolean = false;

  /** Show visual operation status indicators (loading, success, failed) right to the component */
  @Prop() showStatus: boolean = true;

  /** Connection status indicator */
  @Prop() connected: boolean = false;

  /** Event name to subscribe to (for identification/display purposes) */
  @Prop() eventName?: string;

  /** Maximum number of events to keep in history */
  @Prop() maxEvents: number = 15;

  /** Show event timestamps */
  @Prop() showTimestamp: boolean = true;

  // ============================== COMPONENT STATE ==============================

  /** Current operation status for visual feedback */
  @State() operationStatus: OperationStatus = 'idle';

  /** Error message from failed operations if any (optional) */
  @State() lastError?: string;

  /** Timestamp when value was last updated (optional) */
  @State() lastUpdatedTs?: number;

  /** Internal state for the event history */
  @State() private eventHistory: Array<{
    id: string;
    timestamp: number;
    data: any;
    source?: string;
  }> = [];

  /** Current subscription status */
  @State() private isSubscribed: boolean = false;

  /** Event count */
  @State() private eventCount: number = 0;

  // ============================== PRIVATE PROPERTIES ==============================

  /** Timer for updating relative timestamps */
  private timestampUpdateTimer?: number;

  // ============================== EVENTS ==============================

  /**
   * Emitted when an event is received.
   * Contains the event data with metadata and source information.
   */
  @Event() eventReceived: EventEmitter<UiMsg<any>>;

  // ============================== PUBLIC METHODS ==============================

  /**
   * Starts listening for events with optional device communication api and other options.
   *
   * This is the primary method for connecting event listeners to real devices.
   * It supports event filtering, history management, and status tracking.
   *
   * @returns Promise resolving to void when listening starts
   *
   * ```
   */
  @Method()
  async startListening(): Promise<void> {
    if (this.isSubscribed) return;

    this.operationStatus = 'loading';
    this.lastError = '';

    try {
      // The component is now ready to receive events via the addEvent() method
      this.isSubscribed = true;
      this.operationStatus = 'success';
      this.lastUpdatedTs = Date.now();
    } catch (error) {
      this.lastError = error.message || 'Failed to start listening';
      this.operationStatus = 'error';
    }
  }

  /**
   * Gets the current event history with optional metadata.
   *
   * @param includeMetadata - Whether to include status, timestamp and other information
   * @returns Current event history or detailed metadata object
   */
  @Method()
  async getEventHistory(includeMetadata: boolean = false): Promise<Array<any> | { value: Array<any>; lastUpdated?: number; status: string; error?: string }> {
    if (includeMetadata) {
      return {
        value: [...this.eventHistory],
        lastUpdated: this.lastUpdatedTs,
        status: this.operationStatus,
        error: this.lastError,
      };
    }
    return [...this.eventHistory];
  }

  /**
   * This method adds an event.
   *
   * @param eventData - The event data to add
   * @param eventId - Optional event ID
   */
  @Method()
  async addEvent(eventData: any, eventId?: string): Promise<void> {
    const event = {
      id: eventId || `event-${Date.now()}`,
      timestamp: Date.now(),
      data: eventData,
      source: this.eventName,
    };

    this.handleReceivedEvent(event);
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

  /**
   * Stop listening for events.
   *
   * @returns Promise resolving to void when listening stops
   */
  @Method()
  async stopListening(): Promise<void> {
    if (!this.isSubscribed) return;

    this.isSubscribed = false;
    this.operationStatus = 'idle';
  }

  /**
   * Clear event history and reset counters.
   */
  @Method()
  async clearEvents(): Promise<void> {
    this.eventHistory = [];
    this.eventCount = 0;
  }

  /**
   * Check if component is currently listening for events.
   *
   * @returns Promise resolving to boolean indicating listening status
   */
  @Method()
  async isListening(): Promise<boolean> {
    return this.isSubscribed;
  }

  // ============================== LIFECYCLE METHODS ==============================

  /** Initialize component state from props */
  componentWillLoad() {
    if (this.showLastUpdated) this.startTimestampUpdater();
  }

  /** Clean up timers when component is removed */
  disconnectedCallback() {
    this.stopTimestampUpdater();
  }

  // ============================== WATCHERS ==============================

  /** Sync internal state when event name prop changes externally */
  @Watch('eventName')
  onEventNameChange() {
    if (this.isSubscribed) {
      this.stopListening();
      this.startListening();
    }
  }

  /** Sync internal state when operation status changes externally */
  @Watch('operationStatus')
  onStatusChange() {
    this.startTimestampUpdater();
  }

  // ============================== PRIVATE METHODS ==============================

  /** Handles received events and history management */
  private handleReceivedEvent(event: any) {
    // Add to history
    this.eventHistory = [event, ...this.eventHistory.slice(0, this.maxEvents - 1)];
    this.eventCount++;
    this.lastUpdatedTs = Date.now();

    // Emit event received notification
    this.eventReceived.emit({
      newVal: event.data,
      ts: event.timestamp,
      meta: { eventId: event.id, source: event.source },
    });
  }

  /** Manages timestamp update timer for relative time display */
  private startTimestampUpdater() {
    this.stopTimestampUpdater();
    if (this.showLastUpdated && this.lastUpdatedTs) {
      this.timestampUpdateTimer = window.setInterval(() => {
        this.lastUpdatedTs = this.lastUpdatedTs;
      }, 60000); // Update every minute
    }
  }

  /** Stops the timestamp update timer */
  private stopTimestampUpdater() {
    if (this.timestampUpdateTimer) {
      clearInterval(this.timestampUpdateTimer);
      this.timestampUpdateTimer = undefined;
    }
  }

  /** Gets variant-specific CSS classes and styles */
  private getVariantStyles(): { classes: string; style: any } {
    const baseClasses = 'relative rounded-lg transition-all duration-200';
    const style: any = {};

    if (this.variant === 'filled') {
      const filledClass = `variant-filled-${this.color}`;
      style.borderColor = this.getActiveColor();
      style.borderWidth = '1px';
      return { classes: `${baseClasses} border ${filledClass}`, style };
    }
    // Outlined variant
    style.borderColor = this.getActiveColor();
    style.borderWidth = '2px';
    return { classes: `${baseClasses} border bg-transparent`, style };
  }

  /** Generate the active color using global CSS variables */
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

  // ============================== RENDERING HELPERS ==============================

  /** Renders the status badge according to current operation state */
  private renderStatusBadge() {
    if (!this.showStatus || this.operationStatus === 'idle') return null;
    return StatusIndicator.renderStatusBadge(this.operationStatus, this.lastError || '', h);
  }

  /** Renders the last updated timestamp */
  private renderLastUpdated() {
    if (!this.showLastUpdated) return null;

    // render an invisible placeholder when lastUpdatedTs is missing.
    const lastUpdatedDate = this.lastUpdatedTs ? new Date(this.lastUpdatedTs) : null;
    return StatusIndicator.renderTimestamp(lastUpdatedDate, this.dark ? 'dark' : 'light', h);
  }

  /** Renders the event history display */
  private renderEventHistory() {
    if (this.eventHistory.length === 0) {
      return (
        <div class={`text-center py-4 ${this.dark ? 'text-white' : 'text-[var(--color-neutral)]'}`}>
          <span class="text-sm">No events received</span>
        </div>
      );
    }

    return this.eventHistory.slice(0, 5).map(event => (
      <div key={event.id} class="border-b last:border-b-0 py-2 border-[var(--color-neutral)]/30">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <pre class={`text-xs font-mono overflow-x-auto block ${this.dark ? 'text-white' : 'text-gray-900'}`}>{JSON.stringify(event.data, null, 2)}</pre>
          </div>
          {this.showTimestamp && <div class={`text-xs ml-2 ${this.dark ? 'text-gray-300' : 'text-[var(--color-neutral)]'}`}>{new Date(event.timestamp).toLocaleTimeString()}</div>}
        </div>
      </div>
    ));
  }

  /** Renders the control buttons */
  private renderControls() {
    const primaryButtonStyle = this.isSubscribed ? { backgroundColor: 'var(--color-danger)', color: 'white' } : { backgroundColor: this.getActiveColor(), color: 'white' };

    return (
      <div class="flex gap-2 mb-3">
        <button
          class={`px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            this.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-80'
          }`}
          style={this.disabled ? { backgroundColor: 'var(--color-neutral)', color: 'white' } : primaryButtonStyle}
          onClick={() => (this.isSubscribed ? this.stopListening() : this.startListening())}
          disabled={this.disabled}
        >
          {this.isSubscribed ? 'Stop' : 'Start'} Listening
        </button>
        <button
          class={`px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            this.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-80'
          }`}
          style={{ backgroundColor: 'var(--color-neutral)', color: 'white' }}
          onClick={() => this.clearEvents()}
          disabled={this.disabled}
        >
          Clear Events
        </button>
      </div>
    );
  }

  // ============================== MAIN COMPONENT RENDER METHOD ==============================

  /**
   * Renders the complete event listener component with all features and styles.
   */
  render() {
    const variantStyles = this.getVariantStyles();
    const panelBg = this.dark ? 'bg-transparent' : 'bg-[var(--neutral-clr-50)]';
    const headerTextColor = this.getActiveColor();
    const generalTextColor = this.dark ? 'text-white' : 'text-gray-900';
    const historyBg = this.dark ? 'bg-transparent' : 'bg-[var(--neutral-clr-50)]';

    return (
      <div class="w-full max-w-2xl">
        {/* Label */}
        {this.label && <label class={`block text-sm font-medium mb-2 ${generalTextColor}`}>{this.label}</label>}

        <div class="relative inline-flex items-start w-full">
          <div class={`${variantStyles.classes} p-4 w-full ${panelBg}`} style={variantStyles.style}>
            {/* Header with event info and status */}
            <div class="flex justify-between items-center mb-3">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium" style={{ color: headerTextColor }}>
                  Event Listener
                </span>
                {this.eventName && <span class="text-xs px-2 py-1 rounded bg-[var(--color-neutral)]/20 text-[var(--color-neutral)]">{this.eventName}</span>}
              </div>
              <div class="flex items-center gap-1">
                <span class={`w-2 h-2 rounded-full ${this.isSubscribed ? 'bg-[var(--color-success)]' : 'bg-[var(--color-neutral)]'}`}></span>
                <span class={`text-xs text-[var(--color-neutral)]`}>{this.eventCount} events</span>
              </div>
            </div>

            {/* Controls */}
            {this.renderControls()}

            {/* Event history */}
            <div class={`border rounded max-h-48 overflow-y-auto border-[var(--color-neutral)]/30 ${historyBg}`}>{this.renderEventHistory()}</div>
          </div>

          {/* Status badge */}
          <div class="ml-2 flex-shrink-0">{this.renderStatusBadge()}</div>
        </div>

        {/* Last updated timestamp */}
        {this.renderLastUpdated()}
      </div>
    );
  }
}
