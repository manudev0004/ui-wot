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
  @Prop() variant: 'outlined' | 'filled' = 'outlined';

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

  /**
   * Cleanup function for event subscription
   */
  private unsubscribe?: () => void;

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

    // Clean up event subscription
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
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

    try {
      // The component is now ready to receive events via the addEvent() method
      // No mock events are generated - events come from external sources

      // Set up cleanup function for consistency (though no cleanup needed for external events)
      this.unsubscribe = () => {
        // Cleanup would go here if we had external subscriptions to clean up
      };

      this.isSubscribed = true;
      this.operationStatus = 'success';
      this.lastUpdatedTs = Date.now();
    } catch (error) {
      this.lastError = error.message || 'Failed to start listening';
      this.operationStatus = 'error';
    }
  }

  /**
   * Stop listening for events (disables the component)
   */
  @Method()
  async stopListening(): Promise<void> {
    if (!this.isSubscribed) return;

    // Set flag to false FIRST to prevent race conditions
    this.isSubscribed = false;
    this.operationStatus = 'idle';

    // Clean up event subscription
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
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
   * Check if component is currently listening for events
   */
  @Method()
  async isListening(): Promise<boolean> {
    return this.isSubscribed;
  }

  /**
   * Set component status
   */
  @Method()
  async setStatus(status: 'idle' | 'loading' | 'success' | 'error', errorMessage?: string): Promise<void> {
    StatusIndicator.applyStatus(this, status, errorMessage);
  }

  /**
   * Force cleanup (for debugging)
   */
  @Method()
  async forceCleanup(): Promise<void> {
    this.isSubscribed = false;
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
    this.operationStatus = 'idle';
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

    // Use CSS custom properties directly in style
    const colorClass = `color-${this.color}`;

    switch (this.variant) {
      case 'outlined':
        return `${baseClasses} border-2 bg-transparent variant-outlined ${colorClass}`;
      case 'filled':
        return `${baseClasses} border variant-filled ${colorClass}`;
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
        <div class={`text-center py-4 ${this.dark ? 'text-[var(--neutral-clr-50)]' : 'text-[var(--color-neutral)]'}`}>
          <span class="text-sm">No events received</span>
        </div>
      );
    }

    return this.eventHistory.slice(0, 5).map(event => (
      <div key={event.id} class="border-b last:border-b-0 py-2 border-[var(--color-neutral)]/30">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <pre class={`text-xs font-mono overflow-x-auto block ${this.dark ? 'text-[var(--neutral-clr-50)]' : 'text-[var(--neutral-clr-900)]'}`}>
              {JSON.stringify(event.data, null, 2)}
            </pre>
          </div>
          {this.showTimestamp && (
            <div class={`text-xs ml-2 ${this.dark ? 'text-[var(--color-neutral-light)]' : 'text-[var(--color-neutral)]'}`}>{new Date(event.timestamp).toLocaleTimeString()}</div>
          )}
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
              ? 'bg-[var(--color-neutral)] text-white cursor-not-allowed opacity-50'
              : this.isSubscribed
              ? 'bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger)]/80 focus:ring-[var(--color-danger)] cursor-pointer'
              : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] focus:ring-[var(--color-primary)] cursor-pointer'
          }`}
          onClick={() => (this.isSubscribed ? this.stopListening() : this.startListening())}
          disabled={this.disabled}
        >
          {this.isSubscribed ? 'Stop' : 'Start'} Listening
        </button>
        <button
          class={`px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            this.disabled
              ? 'bg-[var(--color-neutral)] text-white cursor-not-allowed opacity-50'
              : 'bg-[var(--color-neutral)] text-white hover:bg-[var(--color-neutral-hover)] focus:ring-[var(--color-neutral)] cursor-pointer'
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
    const panelBg = this.dark ? 'bg-transparent' : 'bg-[var(--neutral-clr-50)]';
    const textColor = this.dark ? 'text-[var(--neutral-clr-50)]' : 'text-[var(--neutral-clr-900)]';
    const historyBg = this.dark ? 'bg-transparent' : 'bg-[var(--neutral-clr-50)]';

    return (
      <div class="w-full max-w-2xl">
        {/* Label */}
        {this.label && <label class={`block text-sm font-medium mb-2 ${textColor}`}>{this.label}</label>}

        {/* Main container with status badge */}
        <div class="relative inline-flex items-start w-full">
          <div class={`${containerClasses} p-4 w-full ${panelBg}`}>
            {/* Header with event info and status */}
            <div class="flex justify-between items-center mb-3">
              <div class="flex items-center gap-2">
                <span class={`text-sm font-medium ${textColor}`}>Event Listener</span>
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

        {/* Error message */}
        {this.lastError && <div class="text-xs mt-1 text-[var(--color-danger)]">{this.lastError}</div>}
      </div>
    );
  }
}
