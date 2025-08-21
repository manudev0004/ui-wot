import { Component, Prop, State, h, Event, EventEmitter, Element, Listen, Method } from '@stencil/core';
import { UiMsg, TdCapability, classifyTdProperty } from '../../utils/types';

/**
 * Smart wrapper for TD properties that provides visual feedback, status indicators,
 * and handles the connection between UI controls and Thing Description properties.
 * 
 * @slot control - The control component (ui-toggle, ui-slider, etc.)
 * @slot label - Custom label content
 * @slot description - Additional description content
 * @slot actions - Action buttons (refresh, configure, etc.)
 * 
 * @example
 * Basic usage with toggle:
 * ```html
 * <ui-property-card property="on" thing-id="light-1" label="Living Room Light">
 *   <ui-toggle slot="control" value="false"></ui-toggle>
 * </ui-property-card>
 * ```
 */
@Component({
  tag: 'ui-property-card',
  styleUrl: 'ui-property-card.css',
  shadow: true,
})
export class UiPropertyCard {
  @Element() hostElement: HTMLElement;

  /**
   * Thing ID this property belongs to
   */
  @Prop() thingId?: string;

  /**
   * Property name from the Thing Description
   */
  @Prop() property?: string;

  /**
   * Display label for the property
   */
  @Prop() label?: string;

  /**
   * Description text for the property
   */
  @Prop() description?: string;

  /**
   * Property schema from Thing Description (for capability detection)
   */
  @Prop() schema?: any;

  /**
   * Show capability badge (read-only, write-only, etc.)
   */
  @Prop() showCapabilityBadge: boolean = true;

  /**
   * Show status indicator (success, error, pending)
   */
  @Prop() showStatus: boolean = true;

  /**
   * Show last updated timestamp
   */
  @Prop() showTimestamp: boolean = true;

  /**
   * Visual style variant
   */
  @Prop() variant: 'default' | 'compact' | 'minimal' = 'default';

  /** Current operation status */
  @State() status: 'idle' | 'pending' | 'success' | 'error' = 'idle';

  /** Status message */
  @State() statusMessage?: string;

  /** Last updated timestamp */
  @State() lastUpdated?: number;

  /** Computed capability information */
  @State() capability?: TdCapability;

  /** Timer for status auto-clear */
  private statusTimer?: number;

  /**
   * Emitted when a control action should be performed (read, write, observe)
   */
  @Event() propertyAction: EventEmitter<{
    action: 'read' | 'write' | 'observe' | 'unobserve';
    thingId?: string;
    property?: string;
    value?: any;
  }>;

  /**
   * Listen to valueMsg events from slotted controls
   */
  @Listen('valueMsg')
  handleControlValueChange(event: CustomEvent<UiMsg<any>>) {
    // Forward to external handlers for TD write operations
    this.propertyAction.emit({
      action: 'write',
      thingId: this.thingId,
      property: this.property,
      value: event.detail.payload
    });

    // Show pending status
    this.setStatus('pending', 'Writing value...');
  }

  /**
   * Set the current status with optional auto-clear
   */
  @Method()
  async setStatus(status: 'idle' | 'pending' | 'success' | 'error', message?: string, autoClearMs?: number) {
    this.status = status;
    this.statusMessage = message;
    this.lastUpdated = Date.now();

    // Clear any existing timer
    if (this.statusTimer) {
      clearTimeout(this.statusTimer);
    }

    // Auto-clear success/error status
    if (autoClearMs && (status === 'success' || status === 'error')) {
      this.statusTimer = window.setTimeout(() => {
        this.status = 'idle';
        this.statusMessage = undefined;
      }, autoClearMs);
    }
  }

  /**
   * Acknowledge a successful operation
   */
  @Method()
  async ackSuccess(message: string = 'Success') {
    this.setStatus('success', message, 2000);
  }

  /**
   * Report an error
   */
  @Method()
  async reportError(message: string) {
    this.setStatus('error', message);
  }

  componentWillLoad() {
    // Compute capability if schema provided
    if (this.schema) {
      this.capability = classifyTdProperty(this.schema);
    }
  }

  disconnectedCallback() {
    if (this.statusTimer) {
      clearTimeout(this.statusTimer);
    }
  }

  /** Render capability badge */
  private renderCapabilityBadge() {
    if (!this.showCapabilityBadge || !this.capability) return null;

    const badgeClasses = {
      'readwrite': 'bg-blue-100 text-blue-800',
      'read-only': 'bg-gray-100 text-gray-800',
      'write-only': 'bg-orange-100 text-orange-800'
    };

    const icons = {
      'readwrite': '⟷',
      'read-only': '👁',
      'write-only': '✏️'
    };

    return (
      <span 
        class={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${badgeClasses[this.capability.mode]}`}
        title={`Capability: ${this.capability.mode}`}
        part="capability-badge"
      >
        <span class="mr-1">{icons[this.capability.mode]}</span>
        {this.capability.mode}
      </span>
    );
  }

  /** Render status indicator */
  private renderStatusIndicator() {
    if (!this.showStatus) return null;

    const statusClasses = {
      idle: 'bg-gray-300',
      pending: 'bg-blue-500 animate-pulse',
      success: 'bg-green-500',
      error: 'bg-red-500'
    };

    const statusIcons = {
      idle: '○',
      pending: '◐',
      success: '✓',
      error: '✗'
    };

    return (
      <div class="flex items-center space-x-2" part="status">
        <span 
          class={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold ${statusClasses[this.status]}`}
          title={this.statusMessage || this.status}
        >
          {statusIcons[this.status]}
        </span>
        
        {this.statusMessage && (
          <span class={`text-sm ${this.status === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
            {this.statusMessage}
          </span>
        )}
      </div>
    );
  }

  /** Render timestamp */
  private renderTimestamp() {
    if (!this.showTimestamp || !this.lastUpdated) return null;

    const timeAgo = Math.floor((Date.now() - this.lastUpdated) / 1000);
    const timeText = timeAgo < 60 ? `${timeAgo}s ago` : `${Math.floor(timeAgo / 60)}m ago`;

    return (
      <span class="text-xs text-gray-500" title={new Date(this.lastUpdated).toLocaleString()}>
        {timeText}
      </span>
    );
  }

  /** Render action buttons */
  private renderActions() {
    return (
      <div class="flex items-center space-x-2" part="actions">
        <slot name="actions">
          {/* Default refresh button */}
          <button 
            class="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh value"
            onClick={() => this.propertyAction.emit({
              action: 'read',
              thingId: this.thingId,
              property: this.property
            })}
          >
            ↻
          </button>
        </slot>
      </div>
    );
  }

  render() {
    const cardClasses = {
      default: 'p-4 bg-white border border-gray-200 rounded-lg shadow-sm',
      compact: 'p-3 bg-white border border-gray-200 rounded-md',
      minimal: 'p-2 border-b border-gray-100'
    };

    return (
      <div class={cardClasses[this.variant]} part="card">
        {/* Header */}
        <div class="flex items-start justify-between mb-3" part="header">
          <div class="flex-1">
            <div class="flex items-center space-x-2 mb-1">
              <slot name="label">
                {this.label && (
                  <h3 class="text-sm font-medium text-gray-900" part="label">
                    {this.label}
                  </h3>
                )}
              </slot>
              {this.renderCapabilityBadge()}
            </div>

            <slot name="description">
              {this.description && (
                <p class="text-sm text-gray-600" part="description">
                  {this.description}
                </p>
              )}
            </slot>
          </div>

          {this.renderActions()}
        </div>

        {/* Control */}
        <div class="flex items-center justify-between" part="body">
          <div class="flex-1">
            <slot name="control"></slot>
          </div>

          <div class="ml-4 flex items-center space-x-3">
            {this.renderStatusIndicator()}
            {this.renderTimestamp()}
          </div>
        </div>
      </div>
    );
  }
}
