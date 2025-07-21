import { Component, Prop, State, Event, EventEmitter, h, Watch } from '@stencil/core';

/**
 * Simple interface for connecting toggles to IoT devices via Thing Web
 */
export interface ThingProperty {
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
   * Connect to IoT devices and services via Thing Web
   * @optional
   */
  @Prop() thingProperty?: ThingProperty;

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
   * Watch for Thing Property changes
   */
  @Watch('thingProperty')
  async watchThingProperty() {
    await this.initializeFromThing();
  }

  /**
   * Initialize component before first render
   */
  async componentWillLoad() {
    this.isActive = this.state === 'active';
    await this.initializeFromThing();
  }

  /**
   * Read initial state from connected IoT device
   */
  private async initializeFromThing() {
    if (this.thingProperty?.read) {
      try {
        const value = await this.thingProperty.read();
        if (typeof value === 'boolean') {
          this.isActive = value;
          this.state = value ? 'active' : 'default';
        }
      } catch (error) {
        console.warn('Failed to read from IoT device:', error);
      }
    }
  }

  /**
   * Handle user click/tap on the toggle
   */
  private async handleToggle() {
    if (this.state === 'disabled') return;

    const newActive = !this.isActive;
    this.isActive = newActive;
    this.state = newActive ? 'active' : 'default';

    // Notify listeners of the change
    this.toggle.emit({ 
      active: newActive, 
      state: this.state 
    });

    // Update connected IoT device if available
    if (this.thingProperty?.write) {
      try {
        await this.thingProperty.write(newActive);
      } catch (error) {
        console.warn('Failed to write to IoT device:', error);
        // Revert on failure
        this.isActive = !newActive;
        this.state = !newActive ? 'active' : 'default';
      }
    }
  }

  /**
   * Handle keyboard navigation (Space and Enter keys)
   */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.handleToggle();
    }
  };

  /**
   * Gets all CSS classes for the toggle background using Tailwind utilities
   * @private
   * @returns {string} Combined CSS classes for the toggle container
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

    // Color scheme based on current state and variant
    let backgroundColorClass = 'bg-neutral-light'; // default inactive state
    
    if (this.color === 'neutral') {
      backgroundColorClass = isActive ? 'bg-gray-500' : 'bg-gray-300';
    } else if (this.variant === 'cross') {
      backgroundColorClass = isActive ? this.getActiveColor() : 'bg-red-500';
    } else if (this.variant === 'apple') {
      backgroundColorClass = isActive ? 'bg-green-500' : 'bg-gray-700';
    } else if (this.variant === 'neon') {
      backgroundColorClass = isActive ? this.getNeonColor() : 'neon-red';
    } else if (isActive) {
      backgroundColorClass = this.getActiveColor();
    }

    const disabledClass = isDisabled ? 'disabled-state' : '';

    return `${baseClasses} ${shapeClass} ${backgroundColorClass} ${disabledClass}`.trim();
  }

  /**
   * Gets the active color class based on color scheme
   * @private
   * @returns {string} CSS class for active state
   */
  private getActiveColor(): string {
    switch (this.color) {
      case 'secondary': return 'bg-secondary';
      case 'neutral': return 'bg-gray-500';
      default: return 'bg-primary';
    }
  }

  /**
   * Gets the neon color class based on color scheme
   * @private
   * @returns {string} CSS class for neon variant active state
   */
  private getNeonColor(): string {
    return this.color === 'secondary' ? 'neon-secondary' : 'neon-primary';
  }

  /**
   * Gets all CSS classes for the toggle thumb using Tailwind utilities
   * @private
   * @returns {string} Combined CSS classes for the movable thumb element
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
   * Renders special icons (✓ and ×) for the cross variant
   * @private
   * @returns {JSX.Element | null} Icon content or null for other variants
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
