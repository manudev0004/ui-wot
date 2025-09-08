import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types';

/**
 * Notification component for displaying temporary event data with auto-dismiss functionality.
 * Supports multiple notification types with smooth animations and customizable duration.
 *
 * @example Basic Notification
 * ```html
 * <ui-notification message="Operation completed successfully" type="success"></ui-notification>
 * ```
 *
 * @example Custom Duration
 * ```html
 * <ui-notification 
 *   message="This will auto-dismiss in 5 seconds" 
 *   type="info" 
 *   duration="5000">
 * </ui-notification>
 * ```
 *
 * @example Manual Dismiss
 * ```html
 * <ui-notification 
 *   message="Click to dismiss" 
 *   type="warning" 
 *   duration="0"
 *   id="manual-notification">
 * </ui-notification>
 * ```
 *
 * @example JavaScript Integration
 * ```javascript
 * const notification = document.querySelector('#manual-notification');
 * 
 * // Listen for close events
 * notification.addEventListener('notificationClose', (e) => {
 *   console.log('Notification closed:', e.detail);
 * });
 * 
 * // Dismiss programmatically
 * await notification.dismiss();
 * 
 * // Show notification programmatically
 * await notification.show();
 * ```
 */
@Component({
  tag: 'ui-notification',
  styleUrl: 'ui-notification.css',
  shadow: true,
})
export class UiNotification {
  @Element() el: HTMLElement;

  /** Component props */

  /**
   * The message text to display in the notification.
   */
  @Prop() message: string = '';

  /**
   * Type of notification affecting styling and icons.
   * - info: General information (blue)
   * - success: Success messages (green) 
   * - warning: Warning messages (orange)
   * - error: Error messages (red)
   */
  @Prop() type: 'info' | 'success' | 'warning' | 'error' = 'info';

  /**
   * Duration in milliseconds before auto-dismiss.
   * Set to 0 to disable auto-dismiss.
   * Default: 3000 (3 seconds)
   */
  @Prop() duration: number = 3000;

  /**
   * Whether to show a close button.
   * Default: true
   */
  @Prop() showCloseButton: boolean = true;

  /**
   * Whether to show an icon based on the notification type.
   * Default: true
   */
  @Prop() showIcon: boolean = true;

  /**
   * Enable dark theme for the component.
   */
  @Prop() dark: boolean = false;

  /** Component state */

  @State() private isVisible: boolean = false;
  @State() private isAnimating: boolean = false;
  @State() private dismissTimer?: number;

  /** Component events */

  /**
   * Emitted when the notification is closed/dismissed.
   * Contains information about how it was closed (auto, manual, programmatic).
   */
  @Event() notificationClose!: EventEmitter<{
    message: string;
    type: string;
    dismissMethod: 'auto' | 'manual' | 'programmatic';
    timestamp: number;
  }>;

  /**
   * Emitted when notification value/state changes.
   * Compatible with other UI components for unified event handling.
   */
  @Event() valueMsg!: EventEmitter<UiMsg>;

  /** Watchers */

  @Watch('duration')
  onDurationChange() {
    this.setupAutoDismiss();
  }

  /** Public methods */

  /**
   * Show the notification with animation.
   */
  @Method()
  async show(): Promise<void> {
    if (this.isVisible) return;

    this.isAnimating = true;
    this.isVisible = true;
    
    // Allow animation to complete
    setTimeout(() => {
      this.isAnimating = false;
    }, 300);

    // Emit valueMsg event for consistency with other components
    this.valueMsg.emit({
      payload: true, // true indicates notification is shown
      prev: false,
      ts: Date.now(),
      source: this.el?.id || 'ui-notification',
      ok: true,
      meta: {
        action: 'show',
        message: this.message,
        type: this.type
      }
    });

    this.setupAutoDismiss();
  }

  /**
   * Dismiss the notification with animation.
   * @param method - How the notification was dismissed
   */
  @Method()
  async dismiss(method: 'auto' | 'manual' | 'programmatic' = 'programmatic'): Promise<void> {
    if (!this.isVisible) return;

    this.clearAutoDismiss();
    this.isAnimating = true;

    // Emit valueMsg event for consistency with other components
    this.valueMsg.emit({
      payload: false, // false indicates notification is dismissed
      prev: true,
      ts: Date.now(),
      source: this.el?.id || 'ui-notification',
      ok: true,
      meta: {
        action: 'dismiss',
        method: method,
        message: this.message,
        type: this.type
      }
    });

    // Emit close event
    this.notificationClose.emit({
      message: this.message,
      type: this.type,
      dismissMethod: method,
      timestamp: Date.now()
    });

    // Start exit animation
    setTimeout(() => {
      this.isVisible = false;
      this.isAnimating = false;
    }, 300);
  }

  /**
   * Toggle the notification visibility.
   */
  @Method()
  async toggle(): Promise<void> {
    if (this.isVisible) {
      await this.dismiss('programmatic');
    } else {
      await this.show();
    }
  }

  /** Lifecycle methods */

  componentWillLoad() {
    // Auto-show on load - initialize state before first render to avoid warnings
    if (!this.isVisible) {
      this.isVisible = true;
      this.isAnimating = true;
      
      // Setup auto-dismiss after showing
      if (this.duration > 0) {
        this.setupAutoDismiss();
      }
      
      // Schedule animation completion
      setTimeout(() => {
        this.isAnimating = false;
      }, 300);
    }
  }

  componentDidLoad() {
    // Emit valueMsg event for consistency with other components (no state changes)
    if (this.isVisible) {
      this.valueMsg.emit({
        payload: true, // true indicates notification is shown
        prev: false,
        ts: Date.now(),
        source: this.el?.id || 'ui-notification',
        ok: true,
        meta: {
          action: 'auto-show',
          message: this.message,
          type: this.type
        }
      });
    }
  }

  disconnectedCallback() {
    this.clearAutoDismiss();
  }

  /** Private methods */

  private setupAutoDismiss(): void {
    this.clearAutoDismiss();
    
    if (this.duration > 0) {
      this.dismissTimer = window.setTimeout(() => {
        this.dismiss('auto');
      }, this.duration);
    }
  }

  private clearAutoDismiss(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = undefined;
    }
  }

  private handleCloseClick = (): void => {
    this.dismiss('manual');
  };

  private getTypeConfig() {
    const configs = {
      info: {
        color: 'blue',
        bgClass: 'bg-blue-50 border-blue-200',
        textClass: 'text-blue-800',
        iconClass: 'text-blue-400',
        darkBgClass: 'bg-blue-900/20 border-blue-700',
        darkTextClass: 'text-blue-200',
        darkIconClass: 'text-blue-400',
        icon: 'info'
      },
      success: {
        color: 'green',
        bgClass: 'bg-green-50 border-green-200',
        textClass: 'text-green-800',
        iconClass: 'text-green-400',
        darkBgClass: 'bg-green-900/20 border-green-700',
        darkTextClass: 'text-green-200',
        darkIconClass: 'text-green-400',
        icon: 'check'
      },
      warning: {
        color: 'orange',
        bgClass: 'bg-orange-50 border-orange-200',
        textClass: 'text-orange-800',
        iconClass: 'text-orange-400',
        darkBgClass: 'bg-orange-900/20 border-orange-700',
        darkTextClass: 'text-orange-200',
        darkIconClass: 'text-orange-400',
        icon: 'warning'
      },
      error: {
        color: 'red',
        bgClass: 'bg-red-50 border-red-200',
        textClass: 'text-red-800',
        iconClass: 'text-red-400',
        darkBgClass: 'bg-red-900/20 border-red-700',
        darkTextClass: 'text-red-200',
        darkIconClass: 'text-red-400',
        icon: 'error'
      }
    };

    return configs[this.type] || configs.info;
  }

  private renderIcon(iconType: string, classes: string): any {
    const baseProps = {
      class: `w-5 h-5 ${classes}`,
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24'
    };

    switch (iconType) {
      case 'info':
        return (
          <svg {...baseProps}>
            <circle cx="12" cy="12" r="10" stroke-width="2"></circle>
            <path d="M12 16l0-4" stroke-width="2" stroke-linecap="round"></path>
            <path d="M12 8l.01 0" stroke-width="2" stroke-linecap="round"></path>
          </svg>
        );
      case 'check':
        return (
          <svg {...baseProps}>
            <circle cx="12" cy="12" r="10" stroke-width="2"></circle>
            <path d="M9 12l2 2 4-4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        );
      case 'warning':
        return (
          <svg {...baseProps}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke-width="2"></path>
            <line x1="12" y1="9" x2="12" y2="13" stroke-width="2" stroke-linecap="round"></line>
            <line x1="12" y1="17" x2="12.01" y2="17" stroke-width="2" stroke-linecap="round"></line>
          </svg>
        );
      case 'error':
        return (
          <svg {...baseProps}>
            <circle cx="12" cy="12" r="10" stroke-width="2"></circle>
            <line x1="15" y1="9" x2="9" y2="15" stroke-width="2" stroke-linecap="round"></line>
            <line x1="9" y1="9" x2="15" y2="15" stroke-width="2" stroke-linecap="round"></line>
          </svg>
        );
      default:
        return null;
    }
  }

  private renderCloseButton(): any {
    if (!this.showCloseButton) return null;

    const typeConfig = this.getTypeConfig();
    const buttonClass = this.dark ? typeConfig.darkIconClass : typeConfig.iconClass;

    return (
      <button
        class={`ml-auto pl-3 ${buttonClass} hover:opacity-75 transition-opacity`}
        onClick={this.handleCloseClick}
        aria-label="Close notification"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    );
  }

  render() {
    if (!this.isVisible && !this.isAnimating) {
      return null;
    }

    const typeConfig = this.getTypeConfig();
    
    // Base classes
    let containerClasses = 'notification-container border rounded-lg p-4 shadow-lg transition-all duration-300 ease-in-out';
    
    // Theme-specific styling
    if (this.dark) {
      containerClasses += ` ${typeConfig.darkBgClass} ${typeConfig.darkTextClass}`;
    } else {
      containerClasses += ` ${typeConfig.bgClass} ${typeConfig.textClass}`;
    }

    // Animation classes
    if (this.isAnimating && this.isVisible) {
      containerClasses += ' notification-enter';
    } else if (this.isAnimating && !this.isVisible) {
      containerClasses += ' notification-exit';
    } else if (this.isVisible) {
      containerClasses += ' notification-visible';
    }

    const iconClasses = this.dark ? typeConfig.darkIconClass : typeConfig.iconClass;

    return (
      <div class={containerClasses} role="alert" aria-live="polite">
        <div class="flex items-start">
          {/* Icon */}
          {this.showIcon && (
            <div class="flex-shrink-0 mr-3">
              {this.renderIcon(typeConfig.icon, iconClasses)}
            </div>
          )}

          {/* Message */}
          <div class="flex-1 font-medium">
            {this.message}
          </div>

          {/* Close button */}
          {this.renderCloseButton()}
        </div>

        {/* Progress bar for auto-dismiss */}
        {this.duration > 0 && this.isVisible && !this.isAnimating && (
          <div class="mt-2 h-1 bg-black/10 rounded-full overflow-hidden">
            <div 
              class={`h-full bg-current opacity-30 notification-progress`}
              style={{ animationDuration: `${this.duration}ms` }}
            ></div>
          </div>
        )}
      </div>
    );
  }
}
