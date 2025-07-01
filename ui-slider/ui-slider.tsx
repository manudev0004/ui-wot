import { Component, Prop, State, Event, EventEmitter, h, Watch, Element } from '@stencil/core';

/**
 * TD Property interface for Web of Things binding
 */
export interface TDSliderProperty {
  name: string;
  read?: () => Promise<number> | number;
  write?: (value: number) => Promise<void> | void;
}

/**
 * UI Slider Component
 * 
 * A customizable range slider component with WoT TD binding support.
 * Supports variants, theming, accessibility, and lazy loading.
 */
@Component({
  tag: 'ui-slider',
  styleUrl: 'ui-slider.css',
  shadow: true,
})
export class UiSlider {
  @Element() hostElement: HTMLElement;

  /**
   * Variant style for the slider
   */
  @Prop() variant: 'default' | 'primary' | 'secondary' | 'accent' = 'default';

  /**
   * Current value of the slider
   */
  @Prop() value?: number;

  /**
   * Minimum value
   */
  @Prop() min: number = 0;

  /**
   * Maximum value
   */
  @Prop() max: number = 100;

  /**
   * Step increment
   */
  @Prop() step: number = 1;

  /**
   * Disabled state
   */
  @Prop() disabled: boolean = false;

  /**
   * Label for accessibility
   */
  @Prop() label?: string;

  /**
   * TD Property binding for Web of Things integration
   */
  @Prop() tdProperty?: TDSliderProperty;

  /**
   * Internal state for slider value
   */
  @State() currentValue: number = 0;

  /**
   * State for tracking drag interaction
   */
  @State() isDragging: boolean = false;

  /**
   * Event emitted when slider value changes
   */
  @Event() change: EventEmitter<number>;

  private sliderRef: HTMLDivElement;

  /**
   * Watch for changes in value prop to update internal state
   */
  @Watch('value')
  watchValue(newValue: number | undefined) {
    if (newValue !== undefined) {
      this.currentValue = this.clampValue(newValue);
    }
  }

  /**
   * Watch for changes in min/max to ensure value is within bounds
   */
  @Watch('min')
  @Watch('max')
  watchBounds() {
    this.currentValue = this.clampValue(this.currentValue);
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
    if (this.value !== undefined) {
      this.currentValue = this.clampValue(this.value);
    } else {
      this.currentValue = this.clampValue(this.min);
    }

    // Initialize from TD property if available
    await this.initializeFromTD();
  }

  /**
   * Initialize slider value from TD property
   */
  private async initializeFromTD() {
    if (this.tdProperty?.read) {
      try {
        const tdValue = await this.tdProperty.read();
        if (typeof tdValue === 'number') {
          this.currentValue = this.clampValue(tdValue);
        }
      } catch (error) {
        console.warn('Failed to read TD property:', error);
      }
    }
  }

  /**
   * Clamp value within min/max bounds and align to step
   */
  private clampValue(value: number): number {
    const clamped = Math.max(this.min, Math.min(this.max, value));
    return Math.round(clamped / this.step) * this.step;
  }

  /**
   * Calculate percentage for styling
   */
  private getPercentage(): number {
    return ((this.currentValue - this.min) / (this.max - this.min)) * 100;
  }

  /**
   * Update value and emit events
   */
  private async updateValue(newValue: number) {
    const clampedValue = this.clampValue(newValue);
    
    if (clampedValue === this.currentValue) return;

    this.currentValue = clampedValue;

    // Emit change event
    this.change.emit(this.currentValue);

    // Write to TD property if available
    if (this.tdProperty?.write) {
      try {
        await this.tdProperty.write(this.currentValue);
      } catch (error) {
        console.warn('Failed to write TD property:', error);
      }
    }
  }

  /**
   * Calculate value from mouse/touch position
   */
  private getValueFromPosition(clientX: number): number {
    if (!this.sliderRef) return this.currentValue;

    const rect = this.sliderRef.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return this.min + (this.max - this.min) * percentage;
  }

  /**
   * Handle mouse down
   */
  private handleMouseDown = (event: MouseEvent) => {
    if (this.disabled) return;

    event.preventDefault();
    this.isDragging = true;
    
    const newValue = this.getValueFromPosition(event.clientX);
    this.updateValue(newValue);

    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  };

  /**
   * Handle mouse move during drag
   */
  private handleMouseMove = (event: MouseEvent) => {
    if (!this.isDragging) return;

    const newValue = this.getValueFromPosition(event.clientX);
    this.updateValue(newValue);
  };

  /**
   * Handle mouse up
   */
  private handleMouseUp = () => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  };

  /**
   * Handle touch start
   */
  private handleTouchStart = (event: TouchEvent) => {
    if (this.disabled) return;

    event.preventDefault();
    this.isDragging = true;
    
    const touch = event.touches[0];
    const newValue = this.getValueFromPosition(touch.clientX);
    this.updateValue(newValue);

    document.addEventListener('touchmove', this.handleTouchMove);
    document.addEventListener('touchend', this.handleTouchEnd);
  };

  /**
   * Handle touch move during drag
   */
  private handleTouchMove = (event: TouchEvent) => {
    if (!this.isDragging) return;

    event.preventDefault();
    const touch = event.touches[0];
    const newValue = this.getValueFromPosition(touch.clientX);
    this.updateValue(newValue);
  };

  /**
   * Handle touch end
   */
  private handleTouchEnd = () => {
    this.isDragging = false;
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
  };

  /**
   * Handle keyboard interaction
   */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled) return;

    let newValue = this.currentValue;
    const largeStep = (this.max - this.min) / 10;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        newValue = this.currentValue + this.step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        newValue = this.currentValue - this.step;
        break;
      case 'PageUp':
        newValue = this.currentValue + largeStep;
        break;
      case 'PageDown':
        newValue = this.currentValue - largeStep;
        break;
      case 'Home':
        newValue = this.min;
        break;
      case 'End':
        newValue = this.max;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.updateValue(newValue);
  };

  /**
   * Cleanup event listeners on disconnect
   */
  disconnectedCallback() {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
  }

  render() {
    const percentage = this.getPercentage();
    
    const classes = {
      'ui-slider': true,
      [`ui-slider--${this.variant}`]: true,
      'ui-slider--disabled': this.disabled,
      'ui-slider--dragging': this.isDragging,
    };

    const trackStyle = {
      width: `${percentage}%`,
    };

    const thumbStyle = {
      left: `${percentage}%`,
    };

    return (
      <div class="ui-slider-container">
        {this.label && (
          <label class="ui-slider-label" htmlFor="slider">
            {this.label}
          </label>
        )}
        <div
          ref={(el) => (this.sliderRef = el)}
          class={classes}
          role="slider"
          aria-valuemin={this.min}
          aria-valuemax={this.max}
          aria-valuenow={this.currentValue}
          aria-valuetext={this.currentValue.toString()}
          aria-label={this.label || 'Slider'}
          aria-disabled={this.disabled.toString()}
          tabindex={this.disabled ? -1 : 0}
          onMouseDown={this.handleMouseDown}
          onTouchStart={this.handleTouchStart}
          onKeyDown={this.handleKeyDown}
        >
          <div class="ui-slider__track">
            <div class="ui-slider__fill" style={trackStyle}></div>
          </div>
          <div class="ui-slider__thumb" style={thumbStyle}></div>
        </div>
        <div class="ui-slider-value">{this.currentValue}</div>
      </div>
    );
  }
}
