import { Component, Prop, State, h, Event, EventEmitter, Element, Listen, Method } from '@stencil/core';
import { UiMsg, TdCapability, classifyTdProperty } from '../../utils/types';
import { StatusIndicator } from '../../utils/status-indicator';

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

  /** Current operation status using unified system */
  @State() operationStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';

  /** Error message for unified system */
  @State() lastError?: string;

  /** Last updated timestamp using unified system */
  @State() lastUpdatedTs?: number;
  
  /** Timer for auto-updating timestamps */
  @State() timestampUpdateTimer?: number;
  @State() private timestampCounter = 0;

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

    // Show loading status
    this.setStatus('loading', 'Writing value...');
  }

  /**
   * Set the current status with unified system
   */
  @Method()
  async setStatus(status: 'idle' | 'loading' | 'success' | 'error', message?: string, autoClearMs?: number) {
    // Map 'pending' to 'loading' for backward compatibility
    if (status === 'loading') {
      this.operationStatus = 'loading';
    } else {
      this.operationStatus = status;
    }
    
    if (status === 'error' && message) {
      this.lastError = message;
    } else if (status !== 'error') {
      this.lastError = undefined;
    }
    
    if (status === 'success' || status === 'loading') {
      this.lastUpdatedTs = Date.now();
    }

    // Clear any existing timer
    if (this.statusTimer) {
      clearTimeout(this.statusTimer);
    }

    // Auto-clear success/error status
    if (autoClearMs && (status === 'success' || status === 'error')) {
      this.statusTimer = window.setTimeout(() => {
        this.operationStatus = 'idle';
        this.lastError = undefined;
      }, autoClearMs);
    } else if (status === 'success') {
      // Default auto-clear for success
      this.statusTimer = window.setTimeout(() => {
        this.operationStatus = 'idle';
      }, 1200);
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
    
    // Initialize timestamp auto-update timer if showTimestamp is enabled
    if (this.showTimestamp && this.lastUpdatedTs) {
      this.timestampUpdateTimer = window.setInterval(() => {
        // Force re-render to update relative timestamp
        this.timestampCounter++;
      }, 30000); // Update every 30 seconds
    }
  }

  disconnectedCallback() {
    if (this.statusTimer) {
      clearTimeout(this.statusTimer);
    }
    if (this.timestampUpdateTimer) {
      clearInterval(this.timestampUpdateTimer);
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

  /** Render status indicator using unified system */
  private renderStatusIndicator() {
    if (!this.showStatus) return null;
    return StatusIndicator.renderStatusBadge(this.operationStatus, 'light', this.lastError, h);
  }

  /** Render timestamp using unified system */
  private renderTimestamp() {
    if (!this.showTimestamp || !this.lastUpdatedTs) return null;
    return StatusIndicator.renderTimestamp(new Date(this.lastUpdatedTs), 'light', h);
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
