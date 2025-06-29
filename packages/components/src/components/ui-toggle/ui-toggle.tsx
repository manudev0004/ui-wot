import { Component, Prop, State, Event, EventEmitter, h, Watch } from '@stencil/core';

/**
 * TD Property interface for Web of Things binding
 */
export interface TDProperty {
  name: string;
  read?: () => Promise<boolean> | boolean;
  write?: (value: boolean) => Promise<void> | void;
}

/**
 * UI Toggle Component
 * 
 * A customizable toggle switch component with WoT TD binding support.
 * Supports variants, theming, accessibility, and lazy loading.
 */
@Component({
  tag: 'ui-toggle',
  styleUrl: 'ui-toggle.css',
  shadow: true,
})
export class UiToggle {
  /**
   * Variant style for the toggle
   */
  @Prop() variant: 'default' | 'primary' | 'secondary' | 'accent' = 'default';

  /**
   * Initial checked state or controlled value
   */
  @Prop() checked?: boolean;

  /**
   * Initial value (alias for checked for consistency)
   */
  @Prop() value?: boolean;

  /**
   * Disabled state
   */
  @Prop() disabled: boolean = false;

  /**
   * TD Property binding for Web of Things integration
   */
  @Prop() tdProperty?: TDProperty;

  /**
   * Internal state for toggle value
   */
  @State() isChecked: boolean = false;

  /**
   * Event emitted when toggle state changes
   */
  @Event() toggle: EventEmitter<boolean>;

  /**
   * Watch for changes in checked prop to update internal state
   */
  @Watch('checked')
  watchChecked(newValue: boolean | undefined) {
    if (newValue !== undefined) {
      this.isChecked = newValue;
    }
  }

  /**
   * Watch for changes in value prop to update internal state
   */
  @Watch('value')
  watchValue(newValue: boolean | undefined) {
    if (newValue !== undefined) {
      this.isChecked = newValue;
    }
  }

  /**
   * Watch for changes in tdProperty to initialize from TD
   */
  @Watch('tdProperty')
  async watchTdProperty() {
    await this.initializeFromTD();
  }

  /**
   * Component lifecycle - initialize state and TD binding
   */
  async componentWillLoad() {
    // Initialize from props
    if (this.checked !== undefined) {
      this.isChecked = this.checked;
    } else if (this.value !== undefined) {
      this.isChecked = this.value;
    }

    // Initialize from TD property if available
    await this.initializeFromTD();
  }

  /**
   * Initialize toggle state from TD property
   */
  private async initializeFromTD() {
    if (this.tdProperty?.read) {
      try {
        const tdValue = await this.tdProperty.read();
        if (typeof tdValue === 'boolean') {
          this.isChecked = tdValue;
        }
      } catch (error) {
        console.warn('Failed to read TD property:', error);
      }
    }
  }

  /**
   * Handle toggle interaction
   */
  private async handleToggle() {
    if (this.disabled) return;

    const newValue = !this.isChecked;
    this.isChecked = newValue;

    // Emit toggle event
    this.toggle.emit(newValue);

    // Write to TD property if available
    if (this.tdProperty?.write) {
      try {
        await this.tdProperty.write(newValue);
      } catch (error) {
        console.warn('Failed to write TD property:', error);
        // Revert state on write failure
        this.isChecked = !newValue;
      }
    }
  }

  /**
   * Handle keyboard interaction
   */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.handleToggle();
    }
  };

  render() {
    const classes = {
      'ui-toggle': true,
      [`ui-toggle--${this.variant}`]: true,
      'ui-toggle--checked': this.isChecked,
      'ui-toggle--disabled': this.disabled,
    };

    return (
      <div
        class={classes}
        role="switch"
        aria-checked={this.isChecked.toString()}
        aria-disabled={this.disabled.toString()}
        tabindex={this.disabled ? -1 : 0}
        onClick={() => this.handleToggle()}
        onKeyDown={this.handleKeyDown}
      >
        <div class="ui-toggle__track">
          <div class="ui-toggle__thumb"></div>
        </div>
      </div>
    );
  }
}
