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

  /**
   * Gets all toggle classes using Tailwind utilities
   */
  private getToggleClasses() {
    const isDisabled = this.state === 'disabled';
    const isActive = this.state === 'active';
    
    // Size based on variant - Apple variant is bigger for iOS feel
    const baseClasses = this.variant === 'apple' 
      ? 'relative inline-block cursor-pointer transition-all duration-200 ease-in-out w-11 h-7' 
      : 'relative inline-block cursor-pointer transition-all duration-300 ease-in-out w-12 h-6';

    // Shape based on variant - use Tailwind classes
    let shapeClass = 'rounded-full'; // default for circle/neon/cross
    if (this.variant === 'square') shapeClass = 'rounded-md';
    if (this.variant === 'apple') shapeClass = 'rounded-full shadow-inner border-2 border-gray-500';

    // Color based on state and color scheme - mix Tailwind + custom
    let colorClass = this.color === 'neutral' ? 'bg-gray-300' : 'bg-neutral-light'; // neutral uses gray, others use custom
    if (this.variant === 'cross' && !isActive) {
      colorClass = 'bg-red-500'; // red background when cross variant is off
    } else if (this.variant === 'apple' && !isActive) {
      colorClass = 'bg-gray-700'; // dark grey for off (iOS style)
    } else if (this.variant === 'neon' && !isActive) {
      colorClass = 'neon-red'; // red neon effect when off
    } else if (isActive) {
      if (this.variant === 'neon') {
        colorClass = this.color === 'secondary' ? 'neon-secondary' : 'neon-primary';
      } else if (this.variant === 'apple') {
        colorClass = 'bg-green-500'; // iOS-style green when on
      } else {
        colorClass = this.color === 'secondary' ? 'bg-secondary' : 
                    this.color === 'neutral' ? 'bg-gray-500' : 'bg-primary';
      }
    }

    const disabledClass = isDisabled ? 'disabled-state' : '';

    return `${baseClasses} ${shapeClass} ${colorClass} ${disabledClass}`.trim();
  }

  /**
   * Gets thumb classes using Tailwind utilities
   */
  private getThumbClasses() {
    const isActive = this.state === 'active';
    
    // Apple variant gets special styling for iOS feel
    if (this.variant === 'apple') {
      const baseClasses = 'absolute w-6 h-6 bg-white transition-all duration-200 ease-in-out shadow-md rounded-full';
      // Move thumb up slightly and left flush for perfect vertical/horizontal centering
      const positionClass = 'top-0 left-0';
      const translateClass = isActive ? 'translate-x-4' : 'translate-x-0';
      return `${baseClasses} ${positionClass} ${translateClass}`;
    }
    
    // Standard styling for other variants
    const baseClasses = 'absolute w-4 h-4 bg-white transition-transform duration-300 ease-in-out shadow-sm';
    
    // Shape based on variant
    const shapeClass = this.variant === 'square' ? 'rounded-sm' : 'rounded-full';
    
    // Position adjustment for neon variant - keep consistent alignment
    let positionClass = 'top-1 left-1'; // consistent position for all variants
    if (this.variant === 'neon') {
      // Use same vertical positioning for both on/off to maintain alignment
      positionClass = isActive ? 'top-0.5 left-0.5' : 'top-0.5 left-1';
    }
    
    const translateClass = isActive ? 'translate-x-6' : 'translate-x-0';
    
    return `${baseClasses} ${shapeClass} ${positionClass} ${translateClass}`;
  }

  /**
   * Renders special content for the cross variant using Tailwind classes
   */
  private renderCrossContent() {
    if (this.variant !== 'cross') return null;
    
    const isActive = this.state === 'active';
    
    return (
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        {!isActive ? (
          // Cross (×) on right when off
          <div class="absolute top-0 right-0 w-6 h-6 flex items-center justify-center">
            <span class="text-white text-xl font-bold">×</span>
          </div>
        ) : (
          // Checkmark (✓) on left when on
          <div class="absolute top-0 left-0 w-6 h-6 flex items-center justify-center">
            <span class="text-white text-lg font-bold">✓</span>
          </div>
        )}
      </div>
    );
  }

  /**
   * Renders the toggle component with Tailwind CSS classes
   */
  render() {
    const toggleClasses = this.getToggleClasses();
    const thumbClasses = this.getThumbClasses();
    const isDisabled = this.state === 'disabled';

    return (
      <div class="inline-flex items-center space-x-3">
        {this.label && (
          <label
            class={`select-none mr-2 ${isDisabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer'}`}
            onClick={() => !isDisabled && this.handleToggle()}
          >
            {this.label}
          </label>
        )}
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
      </div>
    );
  }
}
