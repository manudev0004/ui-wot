import { Component, Prop, State, h, Event, EventEmitter, Watch } from '@stencil/core';
import { DataHandler } from '../../utils/data-handler';
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator';

/**
 * Simple text component for displaying and editing text data.
 * Supports single-line input and multi-line textarea with Thing Description integration.
 * 
 * @example Basic Text Display
 * ```html
 * <ui-text variant="display" value="Hello World"></ui-text>
 * ```
 * 
 * @example Single-line Text Input
 * ```html
 * <ui-text variant="edit" value="Enter text" label="Name"></ui-text>
 * ```
 * 
 * @example Multi-line Text Area
 * ```html
 * <ui-text 
 *   variant="edit" 
 *   text-type="multi" 
 *   value="Line 1\nLine 2" 
 *   label="Description">
 * </ui-text>
 * ```
 * 
 * @example TD Integration
 * ```html
 * <ui-text 
 *   td-url="http://device.local/properties/name"
 *   variant="edit"
 *   label="Device Name">
 * </ui-text>
 * ```
 */
@Component({
  tag: 'ui-text',
  shadow: true,
})
export class UiText {
  /**
   * Visual style variant of the text component.
   * - display: Read-only text display
   * - edit: Editable text input/textarea
   */
  @Prop() variant: 'display' | 'edit' = 'display';

  /**
   * Type of text field.
   * - single: Single-line text field
   * - multi: Multi-line text area
   */
  @Prop() textType: 'single' | 'multi' = 'single';

  /**
   * Current state of the text component.
   */
  @Prop({ mutable: true }) state: 'disabled' | 'active' | 'default' = 'default';

  /**
   * Theme for the component.
   */
  @Prop() theme: 'light' | 'dark' = 'light';

  /**
   * Color scheme to match design system.
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /**
   * Optional text label for the component.
   */
  @Prop() label?: string;

  /**
   * Text value content.
   */
  @Prop({ mutable: true }) value: string = '';

  /**
   * Placeholder text for edit mode.
   */
  @Prop() placeholder?: string;

  /**
   * Maximum length for text input (edit mode only).
   */
  @Prop() maxLength?: number;

  /**
   * Number of rows for multi-line text area.
   */
  @Prop() rows: number = 4;

  /**
   * Thing Description URL for property control.
   */
  @Prop() tdUrl?: string;

  /**
   * Custom callback function name for value changes.
   */
  @Prop() changeHandler?: string;

  /**
   * Internal state for text value.
   */
  @State() currentValue: string = '';

  /**
   * Operation status for user feedback.
   */
  @State() operationStatus: OperationStatus = 'idle';

  /**
   * Last error message.
   */
  @State() lastError?: string;

  /**
   * Event emitted when text value changes.
   */
  @Event() textChange: EventEmitter<{ value: string }>;

  /** Watch for value prop changes */
  @Watch('value')
  watchValue() {
    this.currentValue = this.value;
  }

  /** Watch for TD URL changes */
  @Watch('tdUrl')
  async watchTdUrl() {
    if (this.tdUrl) {
      await this.readFromDevice();
    }
  }

  componentWillLoad() {
    this.currentValue = this.value;
    
    // Initialize from TD if URL provided
    if (this.tdUrl) {
      this.readFromDevice();
    }
  }

  private async readFromDevice() {
    if (!this.tdUrl) return;
    
    this.operationStatus = 'loading';
    
    const result = await DataHandler.readFromDevice(this.tdUrl, {
      expectedValueType: 'string',
      retryCount: 2,
      timeout: 5000
    });

    if (result.success && typeof result.value === 'string') {
      this.currentValue = result.value;
      this.value = result.value;
      this.operationStatus = 'success';
      this.lastError = undefined;
      
      // Clear success indicator after 2 seconds
      setTimeout(() => {
        this.operationStatus = 'idle';
      }, 2000);
    } else {
      this.operationStatus = 'error';
      this.lastError = DataHandler.getErrorMessage(result);
      
      // Clear error indicator after 5 seconds
      setTimeout(() => {
        this.operationStatus = 'idle';
        this.lastError = undefined;
      }, 5000);
      
      console.warn('Text read failed:', this.lastError);
    }
  }

  private async writeToDevice(value: string): Promise<boolean> {
    if (!this.tdUrl) return true; // Local control, always succeeds
    
    this.operationStatus = 'loading';
    
    const result = await DataHandler.writeToDevice(this.tdUrl, value, {
      retryCount: 2,
      timeout: 5000
    });

    if (result.success) {
      this.operationStatus = 'success';
      this.lastError = undefined;
      
      // Clear success indicator after 2 seconds
      setTimeout(() => {
        this.operationStatus = 'idle';
      }, 2000);
      
      return true;
    } else {
      this.operationStatus = 'error';
      this.lastError = DataHandler.getErrorMessage(result);
      
      // Clear error indicator after 5 seconds
      setTimeout(() => {
        this.operationStatus = 'idle';
        this.lastError = undefined;
      }, 5000);
      
      console.warn('Text write failed:', this.lastError);
      return false;
    }
  }

  private handleInput = async (event: Event) => {
    if (this.state === 'disabled' || this.variant === 'display') return;

    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const newValue = target.value;
    const previousValue = this.currentValue;

    this.currentValue = newValue;
    this.value = newValue;
    
    // Emit the change event
    this.textChange.emit({ value: newValue });

    // Call custom callback if provided
    if (this.changeHandler && typeof (window as any)[this.changeHandler] === 'function') {
      (window as any)[this.changeHandler]({ value: newValue });
    }

    // Update device if TD URL provided
    if (this.tdUrl) {
      const success = await this.writeToDevice(newValue);
      if (!success) {
        // Revert to previous value on write failure
        this.currentValue = previousValue;
        this.value = previousValue;
        target.value = previousValue;
        
        // Re-emit with reverted value
        this.textChange.emit({ value: previousValue });
        if (this.changeHandler && typeof (window as any)[this.changeHandler] === 'function') {
          (window as any)[this.changeHandler]({ value: previousValue });
        }
      }
    }
  };

  private getContainerStyles() {
    let baseClasses = 'relative w-full';
    
    if (this.textType === 'multi') {
      baseClasses += ' min-h-24';
    }

    return baseClasses;
  }

  private getInputStyles() {
    const isDisabled = this.state === 'disabled';
    const isEdit = this.variant === 'edit';
    
    let baseClasses = 'w-full transition-all duration-200 font-sans text-sm';
    
    // Base styling
    if (isEdit) {
      baseClasses += ' border rounded-md px-3 py-2 focus:outline-none focus:ring-2';
      
      if (isDisabled) {
        baseClasses += ' bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed';
      } else {
        // Theme and color-specific styles for edit mode
        if (this.theme === 'dark') {
          baseClasses += ' bg-gray-800 border-gray-600 text-white placeholder-gray-400';
          baseClasses += this.getColorClasses();
        } else {
          baseClasses += ' bg-white border-gray-300 text-gray-900 placeholder-gray-500';
          baseClasses += this.getColorClasses();
        }
      }
    } else {
      // Display mode styling
      baseClasses += ' p-3 rounded-md border';
      
      if (this.theme === 'dark') {
        baseClasses += ' bg-gray-800 border-gray-600 text-gray-100';
      } else {
        baseClasses += ' bg-gray-50 border-gray-200 text-gray-900';
      }
    }

    return baseClasses;
  }

  private getColorClasses(): string {
    switch (this.color) {
      case 'primary':
        return ' hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500/20';
      case 'secondary':
        return ' hover:border-purple-400 focus:border-purple-500 focus:ring-purple-500/20';
      case 'neutral':
        return ' hover:border-gray-400 focus:border-gray-500 focus:ring-gray-500/20';
      default:
        return ' hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500/20';
    }
  }

  private getLabelStyles() {
    const isDisabled = this.state === 'disabled';
    
    let classes = 'block text-sm font-medium mb-2';
    
    if (isDisabled) {
      classes += ' text-gray-400';
    } else {
      classes += this.theme === 'dark' ? ' text-white' : ' text-gray-900';
    }

    return classes;
  }

  render() {
    const containerStyles = this.getContainerStyles();
    const inputStyles = this.getInputStyles();
    const labelStyles = this.getLabelStyles();
    const isDisabled = this.state === 'disabled';
    const isEdit = this.variant === 'edit';

    return (
      <div class={containerStyles}>
        {this.label && (
          <label class={labelStyles}>
            {this.label}
            {!isEdit && (
              <span class="ml-1 text-xs text-blue-500 dark:text-blue-400">(Read-only)</span>
            )}
          </label>
        )}

        <div class="relative">
          {/* Status Indicator */}
          {this.tdUrl && this.operationStatus !== 'idle' && (
            <div
              class={StatusIndicator.getStatusClasses(this.operationStatus, {
                theme: this.theme,
                size: 'small',
                position: 'top-right'
              })}
              title={StatusIndicator.getStatusTooltip(this.operationStatus, this.lastError)}
              role="status"
              aria-label={StatusIndicator.getStatusTooltip(this.operationStatus, this.lastError)}
            >
              {StatusIndicator.getStatusIcon(this.operationStatus)}
            </div>
          )}

          {/* Text Input/Display */}
          {isEdit ? (
            // Edit Mode
            this.textType === 'single' ? (
              <input
                type="text"
                class={inputStyles}
                value={this.currentValue}
                placeholder={this.placeholder}
                maxLength={this.maxLength}
                disabled={isDisabled}
                onInput={this.handleInput}
                aria-label={this.label || 'Text input'}
              />
            ) : (
              <textarea
                class={`${inputStyles} resize-vertical`}
                value={this.currentValue}
                placeholder={this.placeholder}
                maxLength={this.maxLength}
                rows={this.rows}
                disabled={isDisabled}
                onInput={this.handleInput}
                aria-label={this.label || 'Text area'}
              ></textarea>
            )
          ) : (
            // Display Mode
            <div class={inputStyles}>
              {this.textType === 'single' ? (
                <span class="block truncate">{this.currentValue || '\u00A0'}</span>
              ) : (
                <pre class="whitespace-pre-wrap m-0 font-sans text-sm overflow-auto">
                  {this.currentValue || '\u00A0'}
                </pre>
              )}
            </div>
          )}

          {/* Character/Line Count for Edit Mode */}
          {isEdit && this.currentValue && (
            <div class={`mt-1 text-xs ${this.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {this.textType === 'single' ? (
                <span>
                  {this.currentValue.length}
                  {this.maxLength && ` / ${this.maxLength}`} characters
                </span>
              ) : (
                <span>
                  {this.currentValue.split('\n').length} lines, {this.currentValue.length} characters
                  {this.maxLength && ` / ${this.maxLength}`}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}
