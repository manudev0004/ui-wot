import { Component, Prop, State, Event, EventEmitter, h, Watch } from '@stencil/core';

/**
 * TD Property interface for Web of Things binding
 * @interface TDProperty
 * @description Defines the contract for Web of Things Thing Description property binding
 */
export interface TDProperty {
  name: string;
  read?: () => Promise<boolean> | boolean;
  write?: (value: boolean) => Promise<void> | void;
}

/**
 * UI Toggle Component
 * @component
 * @description A modern, accessible toggle switch with multiple visual styles and themes.
 * Perfect for forms, settings panels, and IoT device controls.
 * Features smooth animations and Web of Things integration.
 * @example
 * <ui-toggle variant="circle" state="active" label="Enable notifications"></ui-toggle>
 */
@Component({
  tag: 'ui-toggle',
  styleUrl: 'ui-toggle.css',
  shadow: true,
})
export class UiToggle {
  /**
   * Visual style variant of the toggle switch
   * @type {'circle' | 'square' | 'apple' | 'cross' | 'neon'}
   * @default 'circle'
   * @description
   * - circle: Standard pill-shaped toggle (default)
   * - square: Rectangular toggle with square thumb
   * - apple: iOS-style switch with inner shadow
   * - cross: Shows × when off, ✓ when on
   * - neon: Glowing effect when active
   */
  @Prop() variant: 'circle' | 'square' | 'apple' | 'cross' | 'neon' = 'circle';

  /**
   * Current operational state of the toggle
   * @type {'default' | 'active' | 'disabled'}
   * @default 'default'
   * @description
   * - default: Toggle is off/inactive
   * - active: Toggle is on/active  
   * - disabled: Toggle cannot be interacted with
   */
  @Prop({ mutable: true }) state: 'default' | 'active' | 'disabled' = 'default';

  /**
   * Visual theme for the component
   * @type {'light' | 'dark'}
   * @default 'light'
   * @description
   * - light: Bright colors suitable for light backgrounds
   * - dark: Muted colors suitable for dark backgrounds
   */
  @Prop() theme: 'light' | 'dark' = 'light';

  /**
   * Color scheme for the toggle appearance
   * @type {'primary' | 'secondary' | 'neutral'}
   * @default 'primary'
   * @description
   * - primary: Teal/green professional color
   * - secondary: Pink/purple accent color
   * - neutral: Grayscale minimal appearance
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /**
   * Optional text label displayed next to the toggle
   * @type {string}
   * @optional
   * @description When provided, clicking the label will also toggle the switch
   */
  @Prop() label?: string;



  /**
   * Web of Things Thing Description property binding
   * @type {TDProperty}
   * @optional
   * @description Enables automatic synchronization with IoT devices and services
   * Provides read/write methods for remote device integration
   */
  @Prop() tdProperty?: TDProperty;

  /**
   * Internal reactive state tracking whether toggle is active
   * @type {boolean}
   * @default false
   * @description Automatically updates when props change or user interacts with toggle
   */
  @State() isActive: boolean = false;

  /**
   * Custom event emitted when toggle state changes
   * @event toggle
   * @type {EventEmitter<{ active: boolean; state: string }>}
   * @description Contains both boolean active state and string state name
   * Use this to react to user interactions and state changes
   */
  @Event() toggle: EventEmitter<{ active: boolean; state: string }>;

  /**
   * Reactive watcher for TD Property changes
   * @description Re-initializes connection when tdProperty binding changes
   */
  @Watch('tdProperty')
  async watchTdProperty() {
    await this.initializeFromTD();
  }

  /**
   * Component lifecycle hook - runs before component renders
   * @lifecycle
   * @description Handles initial state setup and TD property initialization
   */
  async componentWillLoad() {
    /** Initialize internal state based on current state prop */
    this.isActive = this.state === 'active';

    /** Initialize from TD property if available */
    await this.initializeFromTD();
  }



  /**
   * Initializes toggle state from Web of Things TD property
   * @private
   * @async
   * @description Attempts to read current value from connected IoT device
   */
  private async initializeFromTD() {
    if (this.tdProperty?.read) {
      try {
        const tdValue = await this.tdProperty.read();
        if (typeof tdValue === 'boolean') {
          this.isActive = tdValue;
          this.state = tdValue ? 'active' : 'default';
        }
      } catch (error) {
        console.warn('Failed to read TD property:', error);
      }
    }
  }

  /**
   * Handles toggle click/tap interaction
   * @private
   * @async
   * @description Updates internal state and emits change event
   * Attempts to write to TD property if configured
   */
  private async handleToggle() {
    if (this.state === 'disabled') return;

    const newActive = !this.isActive;
    this.isActive = newActive;
    this.state = newActive ? 'active' : 'default';

    /** Emit toggle event with both boolean and state */
    this.toggle.emit({ 
      active: newActive, 
      state: this.state 
    });

    /** Write to TD property if available */
    if (this.tdProperty?.write) {
      try {
        await this.tdProperty.write(newActive);
      } catch (error) {
        console.warn('Failed to write TD property:', error);
        /** Revert state on write failure */
        this.isActive = !newActive;
        this.state = !newActive ? 'active' : 'default';
      }
    }
  }

  /**
   * Handles keyboard accessibility (Space and Enter keys)
   * @private
   * @param {KeyboardEvent} event - The keyboard event
   * @description Provides keyboard alternative to mouse/touch interaction
   */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.handleToggle();
    }
  };

  /**
   * Gets simplified color classes based on color scheme
   * @private
   * @returns {object} Object containing CSS classes for inactive, active, and thumb colors
   * @description Returns CSS classes for inactive, active, and thumb colors
   */
  private getColorClasses() {
    // Special handling for neon variant
    if (this.variant === 'neon' && this.state === 'active') {
      const neonClass = this.color === 'secondary' ? 'neon-secondary' : 'neon-primary';
      return {
        inactive: 'bg-neutral-light',
        active: neonClass,
        thumb: 'bg-white'
      };
    }

    const colorMap = {
      primary: this.theme === 'dark' 
        ? { inactive: 'bg-neutral-dark', active: 'bg-primary-dark', thumb: 'bg-white' }
        : { inactive: 'bg-neutral-light', active: 'bg-primary', thumb: 'bg-white' },
      secondary: { 
        inactive: 'bg-neutral-light', 
        active: 'bg-secondary', 
        thumb: 'bg-white' 
      },
      neutral: { 
        inactive: 'bg-neutral-light', 
        active: 'bg-neutral', 
        thumb: 'bg-white' 
      }
    };
    return colorMap[this.color];
  }

  /**
   * Gets CSS classes for the specific toggle variant
   * @private
   * @returns {string} Combined CSS classes for the variant
   * @description Includes base styling and variant-specific appearance
   */
  private getVariantClasses() {
    const baseClasses = 'relative inline-block cursor-pointer transition-all duration-300 ease-in-out';
    
    if (this.state === 'disabled') {
      const variantMap = {
        circle: 'rounded-full',
        square: 'rounded-md',
        apple: 'rounded-full shadow-inner',
        cross: 'rounded-lg border-2',
        neon: 'rounded-full'
      };
      return `${baseClasses} disabled-state ${variantMap[this.variant]}`;
    }

    const variantMap = {
      circle: 'rounded-full',
      square: 'rounded-md',
      apple: 'rounded-full shadow-inner',
      cross: 'rounded-lg border-2',
      neon: 'rounded-full'
    };

    return `${baseClasses} ${variantMap[this.variant]}`;
  }

  /**
   * Gets size classes for different toggle variants
   * @private
   * @returns {string} CSS classes for width and height
   * @description Each variant has optimized dimensions for best visual appearance
   */
  private getSizeClasses() {
    const sizeMap = {
      circle: 'w-12 h-6',
      square: 'w-12 h-6', 
      apple: 'w-14 h-8',
      cross: 'w-12 h-6',
      neon: 'w-12 h-6'
    };
    return sizeMap[this.variant];
  }

  /**
   * Builds thumb/knob styling classes with proper positioning
   * @private
   * @returns {string} Combined CSS classes for the thumb element
   * @description Handles the sliding animation when toggle state changes
   */
  private getThumbClasses() {
    const colors = this.getColorClasses();
    const baseThumbClasses = `absolute top-1 left-1 transition-transform duration-300 ease-in-out ${colors.thumb} shadow-sm`;
    
    const thumbSizeMap = {
      circle: 'w-4 h-4 rounded-full',
      square: 'w-4 h-4 rounded-sm',
      apple: 'w-6 h-6 rounded-full',
      cross: 'w-4 h-4 rounded-sm',
      neon: 'w-4 h-4 rounded-full'
    };

    const thumbPosition = this.state === 'active' ? 'translate-x-6' : 'translate-x-0';

    return `${baseThumbClasses} ${thumbSizeMap[this.variant]} ${thumbPosition}`;
  }

  /**
   * Renders special content for the cross variant
   * @private
   * @returns {JSX.Element | null} JSX element for cross symbols or null
   * @description Shows × symbol when inactive, ✓ when active
   */
  private renderCrossContent() {
    if (this.variant !== 'cross') return null;
    
    return (
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        {this.state === 'default' ? (
          <span class="text-neutral text-lg font-bold">×</span>
        ) : (
          <span class="text-white text-sm">✓</span>
        )}
      </div>
    );
  }

  /**
   * Builds inline styles for the label text
   * @private
   * @returns {object} Inline styles object for the label
   * @description Handles disabled state styling
   */
  private getLabelStyles() {
    return {
      color: this.state === 'disabled' ? '#9ca3af' : 'inherit',
      cursor: this.state === 'disabled' ? 'not-allowed' : 'pointer'
    };
  }

  /**
   * Renders the toggle component with all styling and interactions
   * @returns {JSX.Element} Complete toggle component JSX
   * @description Combines variant styling, color scheme, and custom overrides
   * Includes accessibility attributes and keyboard event handling
   */
  render() {
    const colors = this.getColorClasses();
    const toggleClasses = `
      ${this.getVariantClasses()}
      ${this.getSizeClasses()}
      ${this.state === 'active' ? colors.active : colors.inactive}
    `.trim();

    const thumbClasses = this.getThumbClasses();
    const isDisabled = this.state === 'disabled';

    return (
      <div class="inline-flex items-center space-x-2">
        <span
          class={toggleClasses}
          role="switch"
          aria-checked={this.state === 'active' ? 'true' : 'false'}
          aria-disabled={isDisabled ? 'true' : 'false'}
          tabindex={isDisabled ? -1 : 0}
          onClick={() => !isDisabled && this.handleToggle()}
          onKeyDown={this.handleKeyDown}
        >
          <span class={thumbClasses}></span>
          {this.renderCrossContent()}
        </span>
        {this.label && (
          <label
            class={`select-none ml-3 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            style={this.getLabelStyles()}
            onClick={() => !isDisabled && this.handleToggle()}
          >
            {this.label}
          </label>
        )}
        <slot></slot>
      </div>
    );
  }
}
