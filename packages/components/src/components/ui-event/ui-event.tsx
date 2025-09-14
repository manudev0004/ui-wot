import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator';

/**
 * Event listener component for displaying and managing event data streams.
 * Designed to connect with external data sources via JavaScript at the HTML level.
 *
 * @example Basic Event Display
 * ```html
 * <ui-event
 *   label="Temperature Events"
 *   event-name="temperatureChanged"
 *   max-events="10"
 *   show-timestamp="true">
 * </ui-event>
 * ```
 *
 * @example External Data Connection
 * ```javascript
 * const eventComponent = document.getElementById('event-listener');
 *
 * // Add events programmatically from external sources
 * await eventComponent.addEvent({
 *   temperature: 23.5,
 *   humidity: 65,
 *   timestamp: Date.now()
 * });
 *
 * // Listen for UI events
 * eventComponent.addEventListener('eventReceived', (e) => {
 *   console.log('New event displayed:', e.detail);
 * });
 * ```
 *
 * @example Event Filtering
 * ```javascript
 * const listener = document.getElementById('event-listener');
 *
 * // Set custom filter for event data
 * await listener.setEventFilter((event) => {
 *   return event.data.temperature > 25;
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

  /** Component props */

  /**
   * Visual style variant
   */
  @Prop() variant: 'minimal' | 'outlined' | 'filled' = 'outlined';

  /**
   * Whether the component is disabled
   */
  @Prop() disabled: boolean = false;

  /**
   * Color theme
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /**
   * Dark mode support
   */
  @Prop() dark: boolean = false;

  /**
   * Enable keyboard interactions
   */
  @Prop() keyboard: boolean = true;

  /**
   * Show last updated timestamp
   */
  @Prop() showLastUpdated: boolean = false;

  /**
   * Show status badge when true
   */
  @Prop() showStatus: boolean = true;

  /**
   * Whether component is in readonly mode
   */
  @Prop() readonly: boolean = false;

  /**
   * Connection status indicator
   */
  @Prop() connected: boolean = false;

  /** WoT TD Integration props */

  /**
   * Display label for the component
   */
  @Prop() label?: string;

  /**
   * Event name to subscribe to (for identification/display purposes)
   */
  @Prop() eventName?: string;

  /** Event display and management props */

  /**
   * Maximum number of events to keep in history
   */
  @Prop() maxEvents: number = 15;

  /**
   * Show event timestamps
   */
  @Prop() showTimestamp: boolean = true;

  /**
   * Enable event filtering
   */
  @Prop() enableFiltering: boolean = false;

  /**
   * Filter expression (JSONPath or simple property)
   */
  @Prop() filterExpression?: string;

  /** Component state */

  /**
   * Current operation status
   */
  @State() operationStatus: OperationStatus = 'idle';

  /**
   * Last error message
   */
  @State() lastError: string = '';

  /**
   * Last updated timestamp
   */
  @State() lastUpdatedTs: number = 0;

  /**
   * Timestamp update timer
   */
  @State() timestampUpdateTimer: number = 0;

  /**
   * Event suppression flag
   */
  @State() suppressEvents: boolean = false;

  /**
   * Event history
   */
  @State() eventHistory: Array<{
    id: string;
    timestamp: number;
    data: any;
    source?: string;
  }> = [];

  /**
   * Current subscription status
   */
  @State() isSubscribed: boolean = false;

  /**
   * Event count
   */
  @State() eventCount: number = 0;

  /**
   * Current filter function
   */
  private eventFilter?: (event: any) => boolean;

  /** Component events */

  /**
   * Emitted when an event is received from the Thing
   */
  @Event() eventReceived: EventEmitter<UiMsg<any>>;

  /**
   * Standard value message event for consistency with other components
   */
  @Event() valueMsg: EventEmitter<UiMsg<any>>;

  /** Lifecycle methods */

  disconnectedCallback() {
    this.clearTimestampTimer();
  }

  /** Watchers */

  @Watch('eventName')
  onEventNameChange() {
    if (this.isSubscribed) {
      this.stopListening();
      this.startListening();
    }
  }

  @Watch('operationStatus')
  onStatusChange() {
    this.startTimestampTimer();
  }

  /** Public methods */

  /**
   * Start listening for events (enables the component)
   */
  @Method()
  async startListening(): Promise<void> {
    if (this.isSubscribed) return;

    this.operationStatus = 'loading';
    this.lastError = '';
    this.isSubscribed = true;
    this.operationStatus = 'success';
    this.lastUpdatedTs = Date.now();
  }

  /**
   * Stop listening for events (disables the component)
   */
  @Method()
  async stopListening(): Promise<void> {
    this.isSubscribed = false;
    this.operationStatus = 'idle';
  }

  /**
   * Add an event programmatically from external sources
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
   * Set event filter function
   */
  @Method()
  async setEventFilter(filterFn: (event: any) => boolean): Promise<void> {
    this.eventFilter = filterFn;
  }

  /**
   * Clear event history
   */
  @Method()
  async clearEvents(): Promise<void> {
    this.eventHistory = [];
    this.eventCount = 0;
  }

  /**
   * Get event history
   */
  @Method()
  async getEventHistory(): Promise<Array<any>> {
    return [...this.eventHistory];
  }

  /**
   * Set component status
   */
  @Method()
  async setStatus(status: 'idle' | 'loading' | 'success' | 'error', errorMessage?: string): Promise<void> {
    StatusIndicator.applyStatus(this, status, errorMessage);
  }

  /** Private methods */

  private handleReceivedEvent(event: any) {
    // Apply filter if set
    if (this.eventFilter && !this.eventFilter(event)) {
      return;
    }

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

    // Also emit as value message for consistency
    this.valueMsg.emit({
      newVal: event.data,
      ts: event.timestamp,
      meta: { type: 'event', eventName: this.eventName },
    });
  }

  private startTimestampTimer() {
    this.clearTimestampTimer();
    if (this.showLastUpdated && this.lastUpdatedTs) {
      this.timestampUpdateTimer = window.setInterval(() => {
        // Force re-render to update relative timestamps
        this.lastUpdatedTs = this.lastUpdatedTs;
      }, 60000); // Update every minute
    }
  }

  private clearTimestampTimer() {
    if (this.timestampUpdateTimer) {
      clearInterval(this.timestampUpdateTimer);
      this.timestampUpdateTimer = 0;
    }
  }

  private getVariantClasses(): string {
    const baseClasses = 'relative rounded-lg transition-all duration-200';

    switch (this.variant) {
      case 'minimal':
        return `${baseClasses} bg-transparent border-0`;
      case 'outlined':
        return `${baseClasses} border-2 ${this.dark ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'}`;
      case 'filled':
        return `${baseClasses} border-0 ${this.dark ? 'bg-gray-700' : 'bg-gray-100'}`;
      default:
        return baseClasses;
    }
  }

  private renderStatusBadge() {
    if (!this.showStatus || this.operationStatus === 'idle') return null;
    return StatusIndicator.renderStatusBadge(this.operationStatus, this.lastError || '', h);
  }

  private renderLastUpdated() {
    if (!this.showLastUpdated) return null;

    // render an invisible placeholder when lastUpdatedTs is missing.
    const lastUpdatedDate = this.lastUpdatedTs ? new Date(this.lastUpdatedTs) : null;
    return StatusIndicator.renderTimestamp(lastUpdatedDate, this.dark ? 'dark' : 'light', h);
  }

  private renderEventHistory() {
    if (this.eventHistory.length === 0) {
      return (
        <div class={`text-center py-4 ${this.dark ? 'text-gray-400' : 'text-gray-500'}`}>
          <span class="text-sm">No events received</span>
        </div>
      );
    }

    return this.eventHistory.slice(0, 5).map(event => (
      <div key={event.id} class={`border-b last:border-b-0 py-2 ${this.dark ? 'border-gray-600' : 'border-gray-200'}`}>
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <pre class={`text-xs font-mono ${this.dark ? 'text-gray-300' : 'text-gray-700'}`}>{JSON.stringify(event.data, null, 2)}</pre>
          </div>
          {this.showTimestamp && <div class={`text-xs ml-2 ${this.dark ? 'text-gray-400' : 'text-gray-500'}`}>{new Date(event.timestamp).toLocaleTimeString()}</div>}
        </div>
      </div>
    ));
  }

  private renderControls() {
    return (
      <div class="flex gap-2 mb-3">
        <button
          class={`px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            this.disabled
              ? 'bg-gray-400 text-white cursor-not-allowed opacity-50'
              : this.isSubscribed
              ? 'bg-danger text-white hover:bg-red-600 focus:ring-danger cursor-pointer'
              : 'bg-success text-white hover:bg-green-600 focus:ring-success cursor-pointer'
          }`}
          onClick={() => (this.isSubscribed ? this.stopListening() : this.startListening())}
          disabled={this.disabled}
        >
          {this.isSubscribed ? 'Stop' : 'Start'} Listening
        </button>
        <button
          class={`px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            this.disabled ? 'bg-gray-400 text-white cursor-not-allowed opacity-50' : 'bg-neutral text-white hover:bg-neutral-hover focus:ring-neutral cursor-pointer'
          }`}
          onClick={() => this.clearEvents()}
          disabled={this.disabled}
        >
          Clear Events
        </button>
      </div>
    );
  }

  render() {
    const containerClasses = this.getVariantClasses();

    return (
      <div class="w-full">
        {/* Label */}
        {this.label && <label class={`block text-sm font-medium mb-2 ${this.dark ? 'text-gray-200' : 'text-gray-700'}`}>{this.label}</label>}

        {/* Main container with status badge */}
        <div class="relative inline-flex items-start w-full">
          <div class={`${containerClasses} p-4 w-full`}>
            {/* Header with event info and status */}
            <div class="flex justify-between items-center mb-3">
              <div class="flex items-center gap-2">
                <span class={`text-sm font-medium ${this.dark ? 'text-gray-200' : 'text-gray-800'}`}>📥 Event Listener</span>
                {this.eventName && <span class={`text-xs px-2 py-1 rounded ${this.dark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>{this.eventName}</span>}
              </div>
              <div class="flex items-center gap-1">
                <span class={`w-2 h-2 rounded-full ${this.isSubscribed ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                <span class={`text-xs ${this.dark ? 'text-gray-400' : 'text-gray-500'}`}>{this.eventCount} events</span>
              </div>
            </div>

            {/* Controls */}
            {this.renderControls()}

            {/* Event history */}
            <div class={`border rounded max-h-48 overflow-y-auto ${this.dark ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}>{this.renderEventHistory()}</div>
          </div>

          {/* Status badge */}
          <div class="ml-2 flex-shrink-0">{this.renderStatusBadge()}</div>
        </div>

        {/* Last updated timestamp */}
        {this.renderLastUpdated()}

        {/* Error message */}
        {this.lastError && <div class="text-xs mt-1 text-red-500">{this.lastError}</div>}
      </div>
    );
  }
}
