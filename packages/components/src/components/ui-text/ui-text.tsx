import { Component, Prop, State, h, Event, EventEmitter, Watch, Element, Method } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { StatusIndicator } from '../../utils/status-indicator';

/**
 * Simple text component with essential styling and features.
 *
 * @example Basic Usage
 * ```html
 * <ui-text value="Hello World" variant="display"></ui-text>
 * ```
 *
 * @example Editable Text
 * ```html
 * <ui-text variant="edit" textType="multi" rows="5" placeholder="Type your content..."></ui-text>
 * ```
 */
@Component({ 
  tag: 'ui-text', 
  styleUrl: 'ui-text.css',
  shadow: true 
})
export class UiText {
  @Element() el!: HTMLElement;

  // Essential Properties Only

  /**
   * Visual style variant
   */
  @Prop() variant: 'display' | 'edit' | 'outlined' | 'filled' = 'display';

  /**
   * Component size
   */
  @Prop() size: 'small' | 'medium' | 'large' = 'medium';

  /**
   * Text input type
   */
  @Prop() textType: 'single' | 'multi' = 'single';

  /**
   * Dark theme
   */
  @Prop() dark: boolean = false;

  /**
   * Show line numbers for multi-line text
   */
  @Prop() showLineNumbers: boolean = false;

  /**
   * Color scheme
   */
  @Prop() color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' = 'primary';

  /**
   * Label for the text component
   */
  @Prop() label?: string;

  /**
   * Read-only mode
   */
  @Prop() readonly: boolean = false;

  /**
   * Show last updated timestamp
   */
  @Prop() showLastUpdated: boolean = false;

  /**
   * Current text value
   */
  @Prop({ mutable: true }) value: string = '';

  /**
   * Placeholder text
   */
  @Prop() placeholder?: string;

  /**
   * Number of rows for multi-line text
   */
  @Prop() rows: number = 4;

  /**
   * Allow resizing of text area
   */
  @Prop() resizable: boolean = false;

  /**
   * Disabled state
   */
  @Prop() disabled: boolean = false;

  // State
  @State() currentValue: string = '';
  @State() operationStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  @State() lastError?: string;
  @State() lastUpdatedTs?: number;
  @State() isEditing: boolean = false;

  // Events
  @Event() valueMsg: EventEmitter<UiMsg<string>>;

  componentWillLoad() {
    this.currentValue = this.value;
  }

  @Watch('value')
  watchValue() {
    this.currentValue = this.value;
  }

  @Method()
  async setValue(value: string): Promise<void> {
    this.value = value;
    this.currentValue = value;
    this.lastUpdatedTs = Date.now();
  }

  @Method()
  async getValue(): Promise<string> {
    return this.currentValue;
  }

  private handleInput = (event: Event) => {
    if (this.readonly || this.disabled) return;
    
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.currentValue = target.value;
    this.isEditing = true;
  };

  private handleSave = () => {
    this.value = this.currentValue;
    this.lastUpdatedTs = Date.now();
    this.isEditing = false;
    
    const msg: UiMsg<string> = {
      payload: this.value,
      ts: Date.now(),
      source: this.el?.id || 'ui-text',
      ok: true,
    };
    this.valueMsg.emit(msg);
  };

  private handleCancel = () => {
    this.currentValue = this.value;
    this.isEditing = false;
  };

  private getContainerClasses(): string {
    const baseClasses = 'relative w-full';
    const sizeClasses = {
      small: 'text-sm',
      medium: 'text-base', 
      large: 'text-lg'
    };
    
    return `${baseClasses} ${sizeClasses[this.size]}`;
  }

  private getInputClasses(): string {
    // Base classes for all inputs
    const base = 'w-full transition-all duration-200 focus:outline-none';
    
    // Variant-specific styling - make them visually distinct
    const variantClasses = {
      display: this.dark 
        ? 'bg-transparent border-0 text-gray-100 cursor-default' 
        : 'bg-transparent border-0 text-gray-900 cursor-default',
      edit: this.dark
        ? 'bg-gray-800 border-2 border-gray-600 text-white px-3 py-2 rounded-md focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
        : 'bg-white border-2 border-gray-300 text-gray-900 px-3 py-2 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
      outlined: this.dark
        ? 'bg-transparent border-2 border-gray-500 text-white px-3 py-2 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
        : 'bg-transparent border-2 border-gray-400 text-gray-900 px-3 py-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
      filled: this.dark
        ? 'bg-gray-700 border-0 text-white px-4 py-3 rounded-xl shadow-inner'
        : 'bg-gray-100 border-0 text-gray-900 px-4 py-3 rounded-xl shadow-inner'
    };

    // Color-specific focus states using Tailwind colors
    const colorClasses = {
      primary: this.dark 
        ? 'focus:border-blue-400 focus:ring-blue-400/20' 
        : 'focus:border-blue-500 focus:ring-blue-500/20',
      secondary: this.dark 
        ? 'focus:border-emerald-400 focus:ring-emerald-400/20' 
        : 'focus:border-emerald-500 focus:ring-emerald-500/20',
      success: this.dark 
        ? 'focus:border-green-400 focus:ring-green-400/20' 
        : 'focus:border-green-500 focus:ring-green-500/20',
      warning: this.dark 
        ? 'focus:border-yellow-400 focus:ring-yellow-400/20' 
        : 'focus:border-yellow-500 focus:ring-yellow-500/20',
      danger: this.dark 
        ? 'focus:border-red-400 focus:ring-red-400/20' 
        : 'focus:border-red-500 focus:ring-red-500/20'
    };

    // Size-specific padding and text size
    const sizeClasses = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg'
    };

    // State classes
    const disabledClasses = this.disabled ? 'opacity-50 cursor-not-allowed' : '';
    const readonlyClasses = this.readonly ? 'cursor-default' : 'cursor-text';
    const resizeClasses = this.resizable && this.textType === 'multi' ? 'resize' : 'resize-none';

    // Apply color focus states only for edit and outlined variants
    const colorFocus = (this.variant === 'edit' || this.variant === 'outlined') ? colorClasses[this.color] : '';

    return `${base} ${variantClasses[this.variant]} ${sizeClasses[this.size]} ${colorFocus} ${disabledClasses} ${readonlyClasses} ${resizeClasses}`;
  }

  private renderLineNumbers(): any {
    if (!this.showLineNumbers || this.textType === 'single') return null;
    
    const lines = this.currentValue.split('\n');
    const lineCount = Math.max(lines.length, this.rows);
    
    return (
      <div class={`line-numbers absolute left-0 top-0 px-2 py-2 text-xs leading-relaxed select-none pointer-events-none ${
        this.dark ? 'text-gray-400 bg-gray-700' : 'text-gray-500 bg-gray-100'
      } border-r ${this.dark ? 'border-gray-600' : 'border-gray-300'}`}>
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i + 1}>{i + 1}</div>
        ))}
      </div>
    );
  }

  private renderInput(): any {
    const inputClasses = this.getInputClasses();
    const lineNumbersWidth = this.showLineNumbers ? 'pl-12' : '';
    
    if (this.textType === 'multi') {
      return (
        <div class="relative">
          {this.renderLineNumbers()}
          <textarea
            class={`${inputClasses} ${lineNumbersWidth}`}
            value={this.currentValue}
            placeholder={this.placeholder}
            rows={this.rows}
            disabled={this.disabled}
            readOnly={this.readonly}
            onInput={this.handleInput}
          />
        </div>
      );
    }

    return (
      <input
        type="text"
        class={inputClasses}
        value={this.currentValue}
        placeholder={this.placeholder}
        disabled={this.disabled}
        readOnly={this.readonly}
        onInput={this.handleInput}
      />
    );
  }

  private renderEditControls(): any {
    if (!this.isEditing || this.readonly || this.variant === 'display') return null;

    return (
      <div class="flex gap-2 mt-3">
        <button
          onClick={this.handleSave}
          class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          Save
        </button>
        <button
          onClick={this.handleCancel}
          class={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 ${
            this.dark 
              ? 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500/20' 
              : 'bg-gray-500 hover:bg-gray-600 text-white focus:ring-gray-500/20'
          }`}
        >
          Cancel
        </button>
      </div>
    );
  }

  render() {
    const containerClasses = this.getContainerClasses();

    return (
      <div class={containerClasses}>
        {/* Label */}
        {this.label && (
          <label class={`block text-sm font-medium mb-2 ${
            this.dark ? 'text-gray-200' : 'text-gray-700'
          }`}>
            {this.label}
          </label>
        )}

        {/* Input/Display */}
        {this.variant === 'display' && this.readonly ? (
          <div class={`p-4 rounded-lg ${
            this.dark 
              ? 'bg-gray-800 text-gray-100 border border-gray-700' 
              : 'bg-gray-50 text-gray-900 border border-gray-200'
          }`}>
            {this.value.split('\n').map((line, index) => (
              <div key={index} class="leading-relaxed">{line || '\u00A0'}</div>
            ))}
          </div>
        ) : (
          this.renderInput()
        )}

        {/* Edit Controls */}
        {this.renderEditControls()}

        {/* Status Indicator */}
        <div class="flex justify-between items-start mt-2">
          <div class="flex-1"></div>
          <div class="flex flex-col items-end gap-1">
            {this.operationStatus !== 'idle' && (
              <div>
                {StatusIndicator.renderStatusBadge(
                  this.operationStatus, 
                  this.dark ? 'dark' : 'light', 
                  this.lastError, 
                  h
                )}
              </div>
            )}
            {this.showLastUpdated && StatusIndicator.renderTimestamp(
              this.lastUpdatedTs ? new Date(this.lastUpdatedTs) : null, 
              this.dark ? 'dark' : 'light', 
              h
            )}
          </div>
        </div>
      </div>
    );
  }
}
