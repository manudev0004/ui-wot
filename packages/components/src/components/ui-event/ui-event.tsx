import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator';

/**
 * Event listener component for subscribing to and publishing WoT events.
 * Provides real-time event handling with filtering, buffering, and visual feedback.
 *
 * @example Basic Event Subscription
 * ```html
 * <ui-event
 *   label="Temperature Events"
 *   event-name="temperatureChanged"
 *   max-events="10"
 *   show-timestamp="true">
 * </ui-event>
 * ```
 *
 * @example Event Publishing
 * ```html
 * <ui-event
 *   label="Alert Publisher"
 *   mode="publisher"
 *   event-name="alertTriggered"
 *   auto-publish="true">
 * </ui-event>
 * ```
 *
 * @example Advanced Filtering
 * ```javascript
 * const listener = document.getElementById('event-listener');
 *
 * // Set custom filter
 * await listener.setEventFilter((event) => {
 *   return event.payload.temperature > 25;
 * });
 *
 * // Subscribe to events
 * listener.addEventListener('eventReceived', (e) => {
 *   console.log('Filtered event:', e.detail);
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

  /** Event listener specific props */

  /**
   * Display label for the component
   */
  @Prop() label?: string;

  /**
   * Component mode: listener or publisher
   */
  @Prop() mode: 'listener' | 'publisher' | 'bidirectional' = 'listener';

  /**
   * Event name to subscribe to or publish
   */
  @Prop() eventName?: string;

  /**
   * Maximum number of events to keep in history
   */
  @Prop() maxEvents: number = 50;

  /**
   * Show event timestamps
   */
  @Prop() showTimestamp: boolean = true;

  /**
   * Auto-publish mode for publishers
   */
  @Prop() autoPublish: boolean = false;

  /**
   * Event payload template for publishing
   */
  @Prop() payloadTemplate?: string;

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
   * Initialization state
   */
  @State() isInitialized: boolean = false;

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
    payload: any;
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
   * Emitted when an event is received (listener mode)
   */
  @Event() eventReceived: EventEmitter<UiMsg<any>>;

  /**
   * Emitted when an event is published (publisher mode)
   */
  @Event() eventPublished: EventEmitter<UiMsg<any>>;

  /**
   * Standard value message event
   */
  @Event() valueMsg: EventEmitter<UiMsg<any>>;

  /** Lifecycle methods */

  componentWillLoad() {
    // Initialize state before first render to avoid Stencil warnings
    this.isInitialized = true;
    
    // If component should auto-start listening, initialize the state
    if (this.mode === 'listener' || this.mode === 'bidirectional') {
      this.initializeListening();
    }
  }

  componentDidLoad() {
    // Component is now ready - can perform actions that don't change state
    if (this.mode === 'listener' || this.mode === 'bidirectional') {
      // Start the actual listening process without changing state
      this.beginListening();
    }
  }

  disconnectedCallback() {
    this.stopListening();
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
   * Initialize listening state without triggering re-renders (for componentWillLoad)
   */
  private initializeListening(): void {
    if (!this.eventName) return;
    
    // Set initial state without triggering state changes during load
    this.operationStatus = 'loading';
    this.lastError = '';
    this.isSubscribed = true;
    this.operationStatus = 'success';
    this.lastUpdatedTs = Date.now();
  }

  /**
   * Begin the actual listening process after component is loaded
   */
  private beginListening(): void {
    if (!this.eventName || !this.isSubscribed) return;
    
    try {
      // In a real implementation, this would connect to the WoT event system
      // For demo purposes, we'll simulate event listening
      this.simulateEventListening();
    } catch (error) {
      // If there's an error during setup, update state appropriately
      this.operationStatus = 'error';
      this.lastError = error instanceof Error ? error.message : String(error);
    }
  }

  /**
   * Start listening for events
   */
  @Method()
  async startListening(): Promise<void> {
    if (!this.eventName || this.isSubscribed) return;

    try {
      this.operationStatus = 'loading';
      this.lastError = '';

      // In a real implementation, this would connect to the WoT event system
      // For demo purposes, we'll simulate event listening
      this.simulateEventListening();

      this.isSubscribed = true;
      this.operationStatus = 'success';
      this.lastUpdatedTs = Date.now();
    } catch (error) {
      this.operationStatus = 'error';
      this.lastError = error instanceof Error ? error.message : String(error);
    }
  }

  /**
   * Stop listening for events
   */
  @Method()
  async stopListening(): Promise<void> {
    this.isSubscribed = false;
    this.operationStatus = 'idle';
  }

  /**
   * Publish an event
   */
  @Method()
  async publishEvent(payload: any, options?: { eventName?: string }): Promise<void> {
    if (this.mode === 'listener') {
      throw new Error('Component is in listener mode - cannot publish events');
    }

    try {
      this.operationStatus = 'loading';
      this.lastError = '';

      const eventName = options?.eventName || this.eventName;
      if (!eventName) {
        throw new Error('Event name is required for publishing');
      }

      // In a real implementation, this would publish to the WoT event system
      await this.simulateEventPublishing(eventName, payload);

      this.operationStatus = 'success';
      this.lastUpdatedTs = Date.now();

      // Emit event published notification
      this.eventPublished.emit({
        payload: { eventName, payload },
        ts: Date.now(),
        meta: { source: 'ui-event-listener' },
      });
    } catch (error) {
      this.operationStatus = 'error';
      this.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    }
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
    StatusIndicator.applyStatus(this, status, { errorMessage });
  }

  /** Private methods */

  private simulateEventListening() {
    // Simulate receiving events every 3-5 seconds
    const interval = setInterval(() => {
      if (!this.isSubscribed) {
        clearInterval(interval);
        return;
      }

      const simulatedEvent = {
        id: `event-${Date.now()}`,
        timestamp: Date.now(),
        payload: {
          temperature: Math.round(20 + Math.random() * 15),
          humidity: Math.round(40 + Math.random() * 30),
          location: 'sensor-01',
        },
        source: this.eventName,
      };

      this.handleReceivedEvent(simulatedEvent);
    }, 3000 + Math.random() * 2000);
  }

  private async simulateEventPublishing(_eventName: string, _payload: any): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Event published successfully
    // Parameters prefixed with _ to indicate intentional non-use
  }

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
      payload: event.payload,
      ts: event.timestamp,
      meta: { eventId: event.id, source: event.source },
    });

    // Also emit as value message for consistency
    this.valueMsg.emit({
      payload: event.payload,
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
    return StatusIndicator.renderStatusBadge(this.operationStatus, this.dark ? 'dark' : 'light', this.lastError || '', h, { position: 'sibling-right' });
  }

  private renderLastUpdated() {
    if (!this.showLastUpdated || !this.lastUpdatedTs) return null;

    const theme = this.dark ? 'dark' : 'light';
    return StatusIndicator.renderTimestamp(new Date(this.lastUpdatedTs), theme, h);
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
            <pre class={`text-xs font-mono ${this.dark ? 'text-gray-300' : 'text-gray-700'}`}>{JSON.stringify(event.payload, null, 2)}</pre>
          </div>
          {this.showTimestamp && <div class={`text-xs ml-2 ${this.dark ? 'text-gray-400' : 'text-gray-500'}`}>{new Date(event.timestamp).toLocaleTimeString()}</div>}
        </div>
      </div>
    ));
  }

  private renderControls() {
    if (this.mode === 'listener') {
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
              this.disabled 
                ? 'bg-gray-400 text-white cursor-not-allowed opacity-50' 
                : 'bg-neutral text-white hover:bg-neutral-hover focus:ring-neutral cursor-pointer'
            }`}
            onClick={() => this.clearEvents()} 
            disabled={this.disabled}
          >
            Clear Events
          </button>
        </div>
      );
    }

    if (this.mode === 'publisher') {
      return (
        <div class="flex gap-2 mb-3">
          <button 
            class={`px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              this.disabled 
                ? 'bg-gray-400 text-white cursor-not-allowed opacity-50' 
                : `bg-${this.color} text-white hover:bg-${this.color}-hover focus:ring-${this.color} cursor-pointer`
            }`}
            onClick={() => this.publishTestEvent()} 
            disabled={this.disabled}
          >
            Publish Test Event
          </button>
        </div>
      );
    }

    return null;
  }

  private async publishTestEvent() {
    const testPayload = this.payloadTemplate ? JSON.parse(this.payloadTemplate) : { message: 'Test event', timestamp: Date.now() };

    await this.publishEvent(testPayload);
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
            {/* Header with mode and status */}
            <div class="flex justify-between items-center mb-3">
              <div class="flex items-center gap-2">
                <span class={`text-sm font-medium ${this.dark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {this.mode === 'listener' ? '📥' : this.mode === 'publisher' ? '📤' : '🔄'}
                  {this.mode.charAt(0).toUpperCase() + this.mode.slice(1)}
                </span>
                {this.eventName && <span class={`text-xs px-2 py-1 rounded ${this.dark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>{this.eventName}</span>}
              </div>
              {this.mode === 'listener' && (
                <div class="flex items-center gap-1">
                  <span class={`w-2 h-2 rounded-full ${this.isSubscribed ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                  <span class={`text-xs ${this.dark ? 'text-gray-400' : 'text-gray-500'}`}>{this.eventCount} events</span>
                </div>
              )}
            </div>

            {/* Controls */}
            {this.renderControls()}

            {/* Event history */}
            {this.mode !== 'publisher' && (
              <div class={`border rounded max-h-48 overflow-y-auto ${this.dark ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}>{this.renderEventHistory()}</div>
            )}

            {/* Publisher payload input */}
            {this.mode === 'publisher' && (
              <div class="space-y-2">
                <label class={`text-xs ${this.dark ? 'text-gray-300' : 'text-gray-600'}`}>Event Payload (JSON):</label>
                <textarea
                  class={`w-full p-2 text-xs font-mono border rounded ${this.dark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300'}`}
                  rows={4}
                  value={this.payloadTemplate || '{\n  "message": "Hello World",\n  "timestamp": "' + new Date().toISOString() + '"\n}'}
                  onInput={e => (this.payloadTemplate = (e.target as HTMLTextAreaElement).value)}
                  disabled={this.disabled}
                />
              </div>
            )}
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
