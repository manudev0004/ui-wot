import { Component, Prop, State, h, Event, EventEmitter, Element, Watch, Method } from '@stencil/core';
import { StatusIndicator, type OperationStatus } from '../../utils/status-indicator';
import { UiMsg } from '../../utils/types';

export interface UiButtonClick { label: string }

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
 * @example Custom Click Handler
 * ```html
 * <ui-button on-click="handleButtonClick" label="Custom Handler"></ui-button>
 * ```
 *
 * @example Event Handling
 * ```javascript
 * window.handleButtonClick = function(data) {
 *   console.log('Button clicked:', data.label);
 *   // Your custom logic here
 * };
 * ```
 */
@Component({
  tag: 'ui-button',
  styleUrl: 'ui-button.css',
  shadow: true,
})
export class UiButton {
  @Element() hostElement!: HTMLElement;

  /**
   * Visual style variant of the button.
   * - minimal: Clean button with subtle background (default)
   * - outlined: Button with border outline
   * - filled: Solid filled button
   */
  @Prop() variant: 'minimal' | 'outlined' | 'filled' = 'minimal';

  /**
   * Current state of the button.
   * - active: Button is enabled (default)
   * - disabled: Button cannot be interacted with
   */
  @Prop({ mutable: true }) state: 'active' | 'disabled' = 'active';

  /**
   * Theme for the component.
   */
  @Prop() theme: 'light' | 'dark' = 'light';

  /**
   * Color scheme to match thingsweb webpage
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /**
   * Button text label.
   */
  @Prop() label: string = 'Button';

  /**
   * Whether the component is disabled (cannot be interacted with).
   */
  @Prop() disabled: boolean = false;

  /**
   * Whether the component is read-only (displays value but cannot be changed).
   */
  @Prop() readonly: boolean = false;

  /**
   * Legacy mode prop for backward compatibility with older demos.
   * Accepts 'read' to indicate read-only mode, 'readwrite' for interactive.
   */
  @Prop() mode?: 'read' | 'readwrite';

  /**
   * Enable keyboard navigation.
   * Default: true
   */
  @Prop() keyboard: boolean = true;

  /** Internal state for tracking if component is initialized */
  @State() isInitialized: boolean = false;

  /**
   * Primary event emitted when the component value changes.
   * Use this event for all value change handling.
   */
  @Event() valueMsg!: EventEmitter<UiMsg<string>>;

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

  /** Unified status indicator state */
  @State() operationStatus: OperationStatus = 'idle';
  @State() lastError?: string;

  /** Event emitted when button is clicked */
  @Event() buttonClick: EventEmitter<UiButtonClick>;

  /** Implement base class abstract methods */
  @Method()
  async setValue(value: string): Promise<boolean> {
    if (this.state === 'disabled') return false;
    this.label = value;
    this.emitValueMsg(value);
    return true;
  }

  @Method()
  async getValue(): Promise<string> {
    return this.label;
  }

  /** Override disabled prop to sync with state */
  componentWillLoad() {
    // Simple mode handling - if mode is 'read', set readonly to true
    if (this.mode === 'read') {
      this.readonly = true;
    }
    this.isInitialized = true;
    
    // Sync state with disabled prop
    if (this.disabled) {
      this.state = 'disabled';
    }
  }

  /** Watch for mode prop changes and update readonly state */
  @Watch('mode')
  protected watchMode(newValue: 'read' | 'readwrite' | undefined) {
    // Simple mode handling
    if (newValue === 'read') {
      this.readonly = true;
    } else if (newValue === 'readwrite') {
      this.readonly = false;
    }
  }

  /** Emit the unified UiMsg event */
  private emitValueMsg(value: string, prevValue?: string) {
    const msg: UiMsg<string> = {
      payload: value,
      prev: prevValue,
      ts: Date.now(),
      source: this.hostElement?.id || 'ui-button',
      ok: true
    };
    this.valueMsg.emit(msg);
  }

  /** Check if component can be interacted with */
  private get canInteract(): boolean {
    return !this.disabled && !this.readonly;
  }

  /** Handle button click */
  private handleClick = async () => {
    if (this.state === 'disabled' || !this.canInteract) return;

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
    // Emit click event for parent to handle
    this.buttonClick.emit({
      label: this.label,
    });

  // Local-only: consumers should listen to `buttonClick` for custom behavior.
  }

  /** Handle keyboard input */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.state === 'disabled' || !this.canInteract || !this.keyboard) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleClick();
    }
  };

  /** Get button style classes */
  private getButtonStyle(): string {
    const isDisabled = this.state === 'disabled';

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
        if (this.theme === 'dark') {
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

        if (this.theme === 'dark') {
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
        if (this.theme === 'dark') {
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
    const isDisabled = this.state === 'disabled';
    const indicator = StatusIndicator.getIndicatorConfig(this.operationStatus, { theme: this.theme === 'dark' ? 'dark' : 'light', size: 'small', position: 'top-right' }, this.lastError);

    return (
      <div class="relative" part="container" role="group" aria-label={this.label || 'Button'}>
        {indicator && <div class={indicator.classes} title={indicator.tooltip} part="status-indicator">{indicator.icon}</div>}

  <button class={this.getButtonStyle()} onClick={this.handleClick} onKeyDown={this.handleKeyDown} disabled={isDisabled} aria-label={this.label} part="button" aria-pressed={isDisabled ? 'false' : undefined}>
          {this.label}
        </button>
      </div>
    );
  }
}
