import { Component, Prop, State, h, Watch, Event, EventEmitter } from '@stencil/core';
import { DataHandler } from '../../utils/data-handler';

/**
 * Slider component with various features, multiple visual styles and TD integration.
 * Link a direct property URL for plug-and-play device control.
 * 
 * @example Basic Usage
 * ```html
 * <ui-slider variant="narrow" min="0" max="100" value="50" label="Brightness"></ui-slider>
 * ```
 * 
 * @example TD Integration
 * ```html
 * <ui-slider 
 *   td-url="http://plugfest.thingweb.io:80/http-data-schema-thing/properties/brightness"
 *   min="0" 
 *   max="100" 
 *   label="Device Brightness"
 *   enable-manual-control="true">
 * </ui-slider>
 * ```
 */
@Component({
  tag: 'ui-slider',
  styleUrl: 'ui-slider.css',
  shadow: true,
})
export class UiSlider {
  /**
   * Visual style variant of the slider.
   * - narrow: Thin slider track (default)
   * - wide: Thick slider track
   * - rainbow: Gradient color track
   * - neon: Glowing effect
   * - stepped: Shows step marks
   */
  @Prop() variant: 'narrow' | 'wide' | 'rainbow' | 'neon' | 'stepped' = 'narrow';

  /**
   * Orientation of the slider.
   * - horizontal: Left to right slider (default)
   * - vertical: Bottom to top slider
   */
  @Prop() orientation: 'horizontal' | 'vertical' = 'horizontal';

  /**
   * Current state of the slider.
   * - disabled: Slider cannot be clicked or interacted with
   * - default: Slider is interactive (default)
   */
  @Prop({ mutable: true }) state: 'disabled' | 'default' = 'default';

  /**
   * Theme for the component.
   */
  @Prop() theme: 'light' | 'dark' = 'light';

  /**
   * Color scheme to match thingsweb webpage 
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /**
   * Optional text label, to display text above the slider.
   */
  @Prop() label?: string;

  /**
   * Minimum value of the slider.
   */
  @Prop() min: number = 0;

  /**
   * Maximum value of the slider.
   */
  @Prop() max: number = 100;

  /**
   * Step increment for the slider.
   */
  @Prop() step: number = 1;

  /**
   * Current value of the slider.
   */
  @Prop({ mutable: true }) value: number = 0;

  /**
   * Shape of the slider thumb.
   * - circle: Round thumb (default)
   * - square: Square thumb
   * - arrow: Arrow-shaped thumb pointing right
   * - triangle: Triangle-shaped thumb
   * - diamond: Diamond-shaped thumb (<> style)
   */
  @Prop() thumbShape: 'circle' | 'square' | 'arrow' | 'triangle' | 'diamond' = 'circle';

  /**
   * Thing Description URL for device control.
   */
  @Prop() tdUrl?: string;

  /**
   * Enable manual control interface.
   */
  @Prop() enableManualControl: boolean = false;

  /** Current value */
  @State() currentValue: number = 0;

  /** Manual input value */
  @State() manualInputValue: string = '';

  /** Success feedback state */
  @State() showSuccess: boolean = false;

  /** Last error message */
  @State() errorMessage?: string;

  /** Event emitted when value changes */
  @Event() valueChange: EventEmitter<{ value: number }>;

  /** Watch for TD URL changes */
  @Watch('tdUrl')
  async watchTdUrl() {
    if (this.tdUrl) {
      await this.readDevice();
    }
  }

  /** Watch for value prop changes */
  @Watch('value')
  watchValue() {
    this.currentValue = this.value;
    this.manualInputValue = String(this.value);
  }

  /** Initialize component */
  async componentWillLoad() {
    this.currentValue = this.value;
    this.manualInputValue = String(this.value);
    if (this.tdUrl) {
      await this.readDevice();
    }
  }

  /** Read from TD device */
  private async readDevice() {
    if (!this.tdUrl) return;
    
    // Clear previous state
    this.showSuccess = false;
    this.errorMessage = undefined;
    
    const result = await DataHandler.readFromDevice(this.tdUrl);

    if (result.success && typeof result.value === 'number') {
      const clampedValue = Math.max(this.min, Math.min(this.max, result.value));
      this.currentValue = clampedValue;
      this.manualInputValue = String(clampedValue);
      this.showSuccess = true;
      
      // Clear success indicator after 3 seconds
      setTimeout(() => {
        this.showSuccess = false;
      }, 3000);
    } else {
      this.errorMessage = result.error || 'Failed to read slider value';
      
      // Clear error indicator after 8 seconds
      setTimeout(() => {
        this.errorMessage = undefined;
      }, 8000);
      
      console.warn('Device read failed:', result.error);
    }
  }

  /** Write to TD device */
  private async writeDevice(value: number): Promise<boolean> {
    if (!this.tdUrl) return true; // Local control, always succeeds
    
    // Clear previous state
    this.showSuccess = false;
    this.errorMessage = undefined;
    
    const result = await DataHandler.writeToDevice(this.tdUrl, value);

    if (result.success) {
      this.showSuccess = true;
      
      // Clear success indicator after 3 seconds
      setTimeout(() => {
        this.showSuccess = false;
      }, 3000);
      
      return true;
    } else {
      this.errorMessage = result.error || 'Failed to update slider value';
      
      // Clear error indicator after 8 seconds
      setTimeout(() => {
        this.errorMessage = undefined;
      }, 8000);
      
      console.warn('Device write failed:', result.error);
      return false;
    }
  }

  /** Handle slider value change */
  private async handleChange(event: Event) {
    if (this.state === 'disabled') return;

    const target = event.target as HTMLInputElement;
    const newValue = Number(target.value);
    
    const previousValue = this.currentValue;
    this.currentValue = newValue;
    this.manualInputValue = String(newValue);
    this.valueChange.emit({ value: newValue });

    // Update TD device if URL provided
    if (this.tdUrl) {
      const success = await this.writeDevice(newValue);
      if (!success) {
        // Revert to previous value on write failure
        this.currentValue = previousValue;
        this.manualInputValue = String(previousValue);
        // Force re-render by triggering a minimal DOM update
        const input = event.target as HTMLInputElement;
        input.value = String(previousValue);
      }
    }
  }

  /** Handle manual input */
  private handleManualInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    this.manualInputValue = target.value;
  };

  /** Handle manual submit */
  private handleManualSubmit = async (event: Event) => {
    event.preventDefault();
    if (this.state === 'disabled') return;

    const newValue = Number(this.manualInputValue);
    if (isNaN(newValue)) {
      this.manualInputValue = String(this.currentValue);
      return;
    }

    const clampedValue = Math.max(this.min, Math.min(this.max, newValue));
    const previousValue = this.currentValue;
    
    this.currentValue = clampedValue;
    this.manualInputValue = String(clampedValue);
    this.valueChange.emit({ value: clampedValue });

    // Update TD device if URL provided
    if (this.tdUrl) {
      const success = await this.writeDevice(clampedValue);
      if (!success) {
        // Revert to previous value on write failure
        this.currentValue = previousValue;
        this.manualInputValue = String(previousValue);
      }
    }
  };

  /** Handle keyboard navigation */
  private handleKeyDown = async (event: KeyboardEvent) => {
    if (this.state === 'disabled') return;

    let newValue = this.currentValue;
    
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        newValue = Math.min(this.max, this.currentValue + this.step);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        newValue = Math.max(this.min, this.currentValue - this.step);
        break;
      case 'Home':
        event.preventDefault();
        newValue = this.min;
        break;
      case 'End':
        event.preventDefault();
        newValue = this.max;
        break;
      case 'PageUp':
        event.preventDefault();
        newValue = Math.min(this.max, this.currentValue + this.step * 10);
        break;
      case 'PageDown':
        event.preventDefault();
        newValue = Math.max(this.min, this.currentValue - this.step * 10);
        break;
      default:
        return;
    }

    if (newValue !== this.currentValue) {
      const previousValue = this.currentValue;
      this.currentValue = newValue;
      this.manualInputValue = String(newValue);
      this.valueChange.emit({ value: newValue });
      
      if (this.tdUrl) {
        const success = await this.writeDevice(newValue);
        if (!success) {
          // Revert to previous value on write failure
          this.currentValue = previousValue;
          this.manualInputValue = String(previousValue);
        }
      }
    }
  };

  /** Get track styles */
  getTrackStyle() {
    const isDisabled = this.state === 'disabled';
    const percentage = ((this.currentValue - this.min) / (this.max - this.min)) * 100;

    let trackSize = 'h-2 w-full';
    let progressSize = 'h-2';
    
    if (this.orientation === 'vertical') {
      trackSize = 'w-2 h-64'; // Default height for vertical
      if (this.variant === 'wide') trackSize = 'w-4 h-64';
      if (this.variant === 'narrow') trackSize = 'w-1 h-64';
      progressSize = 'w-2';
      if (this.variant === 'wide') progressSize = 'w-4';
      if (this.variant === 'narrow') progressSize = 'w-1';
    } else {
      if (this.variant === 'wide') trackSize = 'h-4 w-full';
      if (this.variant === 'narrow') trackSize = 'h-1 w-full';
      if (this.variant === 'wide') progressSize = 'h-4';
      if (this.variant === 'narrow') progressSize = 'h-1';
    }

    let bgColor = 'bg-gray-300';
    let progressColor = this.getActiveColor();

    if (this.variant === 'rainbow') {
      if (this.orientation === 'vertical') {
        bgColor = 'bg-gradient-to-t from-red-500 via-yellow-500 via-green-500 to-blue-500';
      } else {
        bgColor = 'bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 to-blue-500';
      }
      progressColor = '';
    } else if (this.variant === 'neon') {
      bgColor = 'bg-gray-700';
      progressColor = this.getNeonColor();
    }

    const disabled = isDisabled ? 'opacity-50 cursor-not-allowed' : '';
    
    return {
      track: `relative ${trackSize} ${bgColor} rounded-full ${disabled}`,
      progress: `absolute ${progressColor} rounded-full transition-all duration-200`,
      progressSize,
      percentage
    };
  }

  /** Get thumb styles */
  getThumbStyle() {
    let size = 'w-5 h-5';
    let shape = 'rounded-full';
    
    if (this.thumbShape === 'square') {
      shape = 'rounded-sm';
    } else if (this.thumbShape === 'arrow') {
      size = 'w-8 h-6';
      shape = '';
    } else if (this.thumbShape === 'triangle' || this.thumbShape === 'diamond') {
      size = 'w-6 h-6';
      shape = '';
    }

    let bgColor = 'bg-white';
    const border = 'border border-gray-300';

    // For custom shapes, don't add background and border as they're handled by SVG
    if (this.thumbShape === 'arrow' || this.thumbShape === 'triangle' || this.thumbShape === 'diamond') {
      return `${size} cursor-pointer flex items-center justify-center`;
    }

    return `${size} ${shape} ${bgColor} ${border} cursor-pointer`;
  }

  /** Fetch current active color */
  getActiveColor() {
    if (this.color === 'secondary') return 'bg-secondary';
    if (this.color === 'neutral') return 'bg-gray-500';
    return 'bg-primary';
  }

  /** Fetch current neon color */
  getNeonColor() {
    return this.color === 'secondary' ? 'neon-secondary-track' : 'neon-primary-track';
  }

  /** Render step marks for stepped variant */
  renderStepMarks() {
    if (this.variant !== 'stepped') return null;

    const steps = [];
    const stepCount = (this.max - this.min) / this.step;
    
    for (let i = 0; i <= stepCount; i++) {
      const percentage = (i / stepCount) * 100;
      
      if (this.orientation === 'vertical') {
        steps.push(
          <div
            key={i}
            class="absolute h-0.5 w-3 bg-gray-400"
            style={{ 
              bottom: `${percentage}%`,
              left: '50%',
              transform: 'translateX(-50%) translateY(1px)'
            }}
          ></div>
        );
      } else {
        steps.push(
          <div
            key={i}
            class="absolute w-0.5 h-3 bg-gray-400"
            style={{ 
              left: `${percentage}%`,
              top: '50%',
              transform: 'translateX(-50%) translateY(-50%)'
            }}
          ></div>
        );
      }
    }

    return <div class="absolute inset-0 pointer-events-none">{steps}</div>;
  }

  /** Render custom thumb shapes */
  renderCustomThumb() {
    if (!['arrow', 'triangle', 'diamond'].includes(this.thumbShape)) return null;

    const thumbColor = this.variant === 'neon' ? '#ffffff' : '#ffffff';
    const strokeColor = '#374151';

    if (this.thumbShape === 'arrow') {
      return (
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Left pointing triangle */}
          <svg 
            width="12" 
            height="16" 
            viewBox="0 0 12 16" 
            class="absolute -translate-x-1.5"
          >
            <path 
              d="M8 3 L3 8 L8 13 Z" 
              fill={thumbColor} 
              stroke={strokeColor} 
              stroke-width="1"
            />
          </svg>
          {/* Right pointing triangle */}
          <svg 
            width="12" 
            height="16" 
            viewBox="0 0 12 16" 
            class="absolute translate-x-1.5"
          >
            <path 
              d="M4 3 L9 8 L4 13 Z" 
              fill={thumbColor} 
              stroke={strokeColor} 
              stroke-width="1"
            />
          </svg>
        </div>
      );
    }

    if (this.thumbShape === 'triangle') {
      return (
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 20 20" 
            class="absolute"
          >
            <path 
              d="M10 3 L17 15 L3 15 Z" 
              fill={thumbColor} 
              stroke={strokeColor} 
              stroke-width="1"
            />
          </svg>
        </div>
      );
    }

    if (this.thumbShape === 'diamond') {
      return (
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 20 20" 
            class="absolute"
          >
            <path 
              d="M2 10 L10 2 L18 10 L10 18 Z" 
              fill={thumbColor} 
              stroke={strokeColor} 
              stroke-width="1"
            />
          </svg>
        </div>
      );
    }

    return null;
  }

  /** Render final component */
  render() {
    const trackStyles = this.getTrackStyle();
    const thumbStyle = this.getThumbStyle();
    const isDisabled = this.state === 'disabled';
    const isVertical = this.orientation === 'vertical';
    const percent = ((this.currentValue - this.min) / (this.max - this.min)) * 100;

    return (
      <div class={isVertical ? 'flex flex-col items-center w-24 mx-2' : 'w-full'}>
        {this.label && (
          <label
            class={`block text-sm font-medium ${isVertical ? 'mb-4 text-center' : 'mb-4'} ${isDisabled ? 'text-gray-400' : ''} ${this.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
          >
            {this.label}
          </label>
        )}

        {/* Value labels for vertical - max at top */}
        {isVertical && (
          <div class={`text-xs mb-4 text-center ${this.theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
            <span>{this.max}</span>
          </div>
        )}

        {/* Slider Interface */}
        <div
          class={isVertical ? 'relative flex flex-col items-center justify-center' : 'relative'}
          style={isVertical ? {height: '16rem', width: '2rem'} : {}}
          tabIndex={isDisabled ? -1 : 0}
          onKeyDown={this.handleKeyDown}
          role="slider"
          aria-valuemin={this.min}
          aria-valuemax={this.max}
          aria-valuenow={this.currentValue}
          aria-disabled={isDisabled ? 'true' : 'false'}
        >
          {/* Success Indicator */}
          {this.showSuccess && (
            <div class="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 z-10">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 3L4.5 8.5L2 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          )}
          
          <div class={trackStyles.track}>
            {this.variant !== 'rainbow' && (
              <div
                class={trackStyles.progress}
                style={isVertical
                  ? {height: `${percent}%`, bottom: '0', left: '0', position: 'absolute'}
                  : {width: `${percent}%`}}
              ></div>
            )}
            {this.renderStepMarks()}
          </div>
          <input
            type="range"
            min={this.min}
            max={this.max}
            step={this.step}
            value={this.currentValue}
            disabled={isDisabled}
            class={`absolute inset-0 ${isVertical ? 'slider-vertical' : 'w-full h-full'} opacity-0 cursor-pointer z-10 ${isDisabled ? 'cursor-not-allowed' : ''}`}
            style={isVertical ? {writingMode: 'bt-lr', height: '100%', width: '100%'} : {}}
            onInput={(e) => this.handleChange(e)}
            onKeyDown={this.handleKeyDown}
            tabIndex={isDisabled ? -1 : 0}
          />
          <div
            class={`absolute ${isVertical ? 'left-1/2 -translate-x-1/2' : 'top-1/2 -translate-y-1/2 -translate-x-1/2'} ${thumbStyle} ${isDisabled ? 'opacity-50' : ''} pointer-events-none z-0`}
            style={isVertical
              ? {bottom: `calc(${percent}% - 0.5rem)`}
              : {left: `${percent}%`}}
          >
            {this.renderCustomThumb()}
          </div>
        </div>

        {/* Value labels for vertical - current value box and min at bottom */}
        {isVertical && (
          <div class={`flex flex-col items-center mt-6 space-y-4 text-xs ${this.theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
            <div class={`px-3 py-2 rounded-md text-center font-medium border min-w-12 ${this.theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'} shadow-sm`}>
              {this.currentValue}
            </div>
            <span class="mt-2">{this.min}</span>
          </div>
        )}

        {/* Horizontal value labels */}
        {!isVertical && (
          <div class={`flex justify-between text-xs mt-3 ${this.theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
            <span>{this.min}</span>
            <span>{this.currentValue}</span>
            <span>{this.max}</span>
          </div>
        )}

        {/* Manual Control Interface */}
        {this.enableManualControl && (
          <div class={`mt-4 p-3 border rounded-lg ${isVertical ? 'w-full max-w-xs' : ''} ${this.theme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}>
            <h4 class={`text-sm font-medium mb-2 ${this.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Manual Control</h4>
            <form onSubmit={this.handleManualSubmit} class="flex gap-2 items-center">
              <input
                type="number"
                min={this.min}
                max={this.max}
                step={this.step}
                value={this.manualInputValue}
                disabled={isDisabled}
                class={`flex-1 px-2 py-1 text-sm border rounded ${this.theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onInput={this.handleManualInput}
                placeholder="Enter value"
              />
              <button
                type="submit"
                disabled={isDisabled}
                class={`px-3 py-1 text-sm font-medium rounded transition-colors ${isDisabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary-dark'}`}
              >Set</button>
            </form>
          </div>
        )}
        
        {/* Error Message */}
        {this.errorMessage && (
          <div class="text-red-500 text-sm mt-2 px-2">
            {this.errorMessage}
          </div>
        )}
      </div>
    );
  }
}
