import { Component, Prop, State, h, Watch, Event, EventEmitter } from '@stencil/core';

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
 * <ui-slider td-url="http://plugfest.thingweb.io:80/http-data-schema-thing/properties/int" min="0" max="100" label="Device Brightness"></ui-slider>
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
   * Direct URL of TD number/integer properties to auto connect and interact with the device.
   * @example
   * ```
   * td-url="http://plugfest.thingweb.io:80/http-data-schema-thing/properties/int"
   * ```
   */
  @Prop() tdUrl?: string;

  /** Internal state tracking current value */
  @State() currentValue: number = 0;

  /** Event emitted when slider value changes */
  @Event() valueChange: EventEmitter<{ value: number }>;

  /** Watch for TD URL changes and reconnect */
  @Watch('tdUrl')
  async watchTdUrl() {
    await this.readDeviceState();
  }

  /** Watch for value prop changes */
  @Watch('value')
  watchValue() {
    this.currentValue = this.value;
  }

  /** Initialize component */
  async componentWillLoad() {
    this.currentValue = this.value;
    if (this.tdUrl) {
      await this.readDeviceState();
    }
  }

  /** Read current state from device */
  private async readDeviceState() {
    if (!this.tdUrl) return;

    try {
      console.log(`Reading from: ${this.tdUrl}`);
      const response = await fetch(this.tdUrl);
      
      if (response.ok) {
        const value = await response.json();
        const numericValue = typeof value === 'number' ? value : Number(value);
        
        if (!isNaN(numericValue)) {
          this.currentValue = Math.max(this.min, Math.min(this.max, numericValue));
          console.log(`Read value: ${this.currentValue}`);
        }
      }
    } catch (error) {
      console.warn('Failed to read state:', error);
    }
  }

  /** Write new state to TD device */
  private async updateDevice(value: number) {
    if (!this.tdUrl) return;

    try {
      console.log(`Writing ${value} to: ${this.tdUrl}`);
      
      const response = await fetch(this.tdUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(value),
      });

      if (response.ok) {
        console.log(`Successfully wrote: ${value}`);
      } else {
        throw new Error(`Write failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to write:', error);
      throw error;
    }
  }

  /** Handle slider value change */
  private async handleChange(event: Event) {
    if (this.state === 'disabled') return;

    const target = event.target as HTMLInputElement;
    const newValue = Number(target.value);
    const oldValue = this.currentValue;
    
    this.currentValue = newValue;

    // Emit valueChange event
    this.valueChange.emit({ value: newValue });

    // Update device if connected
    if (this.tdUrl) {
      try {
        await this.updateDevice(newValue);
      } catch (error) {
        // Revert on failure
        this.currentValue = oldValue;
        target.value = String(oldValue);
        console.warn('Change failed, reverted value');
        // Emit revert event
        this.valueChange.emit({ value: oldValue });
      }
    }
  }

  /** Handle keyboard navigation */
  private handleKeyDown = (event: KeyboardEvent) => {
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
      this.currentValue = newValue;
      this.valueChange.emit({ value: newValue });
      
      // Update device if connected
      if (this.tdUrl) {
        this.updateDevice(newValue).catch(() => {
          // Revert on failure
          this.currentValue = this.currentValue;
        });
      }
    }
  };

  /** Get track styles */
  getTrackStyle() {
    const isDisabled = this.state === 'disabled';
    const percentage = ((this.currentValue - this.min) / (this.max - this.min)) * 100;

    let height = 'h-2';
    if (this.variant === 'wide') height = 'h-4';
    if (this.variant === 'narrow') height = 'h-1';

    let bgColor = 'bg-gray-300';
    let progressColor = this.getActiveColor();

    if (this.variant === 'rainbow') {
      bgColor = 'bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 to-blue-500';
      progressColor = '';
    } else if (this.variant === 'neon') {
      bgColor = 'bg-gray-700';
      progressColor = this.getNeonColor();
    }

    const disabled = isDisabled ? 'opacity-50 cursor-not-allowed' : '';
    
    return {
      track: `relative w-full ${height} ${bgColor} rounded-full ${disabled}`,
      progress: `absolute top-0 left-0 ${height} ${progressColor} rounded-full transition-all duration-200`,
      progressWidth: percentage
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
      steps.push(
        <div
          key={i}
          class="absolute w-0.5 h-2 bg-gray-400 transform -translate-x-0.5 top-0"
          style={{ left: `${percentage}%` }}
        ></div>
      );
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

    return (
      <div class="w-full">
        {this.label && (
          <label
            class={`block text-sm font-medium mb-4 ${isDisabled ? 'text-gray-400' : ''} ${this.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
          >
            {this.label}
          </label>
        )}
        <div 
          class="relative"
          tabindex={isDisabled ? -1 : 0}
          onKeyDown={this.handleKeyDown}
          role="slider"
          aria-valuemin={this.min}
          aria-valuemax={this.max}
          aria-valuenow={this.currentValue}
          aria-disabled={isDisabled ? 'true' : 'false'}
        >
          <div class={trackStyles.track}>
            {this.variant !== 'rainbow' && (
              <div 
                class={trackStyles.progress}
                style={{ width: `${trackStyles.progressWidth}%` }}
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
            class={`absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 ${isDisabled ? 'cursor-not-allowed' : ''}`}
            onInput={(e) => this.handleChange(e)}
            onKeyDown={this.handleKeyDown}
            tabindex={isDisabled ? -1 : 0}
          />
          <div
            class={`absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 ${thumbStyle} ${isDisabled ? 'opacity-50' : ''} pointer-events-none z-0`}
            style={{
              left: `${((this.currentValue - this.min) / (this.max - this.min)) * 100}%`
            }}
          >
            {this.renderCustomThumb()}
          </div>
        </div>
        <div class={`flex justify-between text-xs mt-3 ${this.theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
          <span>{this.min}</span>
          <span>{this.currentValue}</span>
          <span>{this.max}</span>
        </div>
      </div>
    );
  }
}
