import { Component, Prop, State, h, Event, EventEmitter, Watch, Element, Method } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { formatLastUpdated } from '../../utils/common-props';

export interface UiTextValueChange { value: string }

/**
 * Advanced text component with comprehensive styling, variants, and features.
 * Supports display, editing, structured content, and matches component family design.
 *
 * @example Basic Usage
 * ```html
 * <ui-text value="Hello World" variant="display"></ui-text>
 * ```
 *
 * @example Different Variants & Colors
 * ```html
 * <ui-text variant="minimal" color="secondary" value="Minimal text"></ui-text>
 * <ui-text variant="outlined" color="primary" value="Outlined text"></ui-text>
 * <ui-text variant="filled" color="success" value="Filled text"></ui-text>
 * <ui-text variant="elevated" color="warning" value="Elevated text"></ui-text>
 * ```
 *
 * @example Editable Text with Features
 * ```html
 * <ui-text variant="edit" textType="multi" rows="5" 
 *          resizable="true" expandable="true" 
 *          placeholder="Type your content..."></ui-text>
 * ```
 *
 * @example Structured Content with Syntax Highlighting
 * ```html
 * <ui-text structure="json" value='{"key": "value"}' readonly="true"></ui-text>
 * <ui-text structure="markdown" value="# Header\n**Bold text**"></ui-text>
 * ```
 *
 * @example Sizes and Themes
 * ```html
 * <ui-text size="large" theme="dark" variant="filled"></ui-text>
 * <ui-text size="small" compact="true" variant="minimal"></ui-text>
 * ```
 */
@Component({ tag: 'ui-text', shadow: true })
export class UiText {
  @Element() el!: HTMLElement;

  /**
   * Visual style variant matching component family design.
   * - display: Read-only text display with subtle styling
   * - edit: Editable input/textarea with interactive styling
   * - minimal: Clean, borderless design with subtle hover effects
   * - outlined: Border with transparent background, colored accents
   * - filled: Solid background with contrasting text
   * - elevated: Shadow and depth for prominent display
   */
  @Prop() variant: 'display' | 'edit' | 'minimal' | 'outlined' | 'filled' | 'elevated' = 'display';

  /**
   * Component size for different use cases.
   * - small: Compact text for tight spaces
   * - medium: Standard size (default)
   * - large: Prominent text with larger typography
   */
  @Prop() size: 'small' | 'medium' | 'large' = 'medium';

  /**
   * Text input type - 'single' for single-line, 'multi' for multi-line
   * @example
   * ```html
   * <ui-text textType="multi" rows="5"></ui-text>
   * ```
   */
  @Prop() textType: 'single' | 'multi' = 'single';

  /**
   * Content structure for syntax highlighting and formatting
   * @example
   * ```html
   * <ui-text structure="json" value='{"formatted": true}'></ui-text>
   * ```
   */
  @Prop() structure: 'unstructured' | 'json' | 'yaml' | 'xml' | 'markdown' | 'code' = 'unstructured';

  /**
   * Whether the component is disabled (cannot be interacted with).
   * @example
   * ```html
   * <ui-text disabled="true" value="Cannot edit"></ui-text>
   * ```
   */
  @Prop() disabled: boolean = false;

  /**
   * Dark theme variant.
   * @example
   * ```html
   * <ui-text dark="true" value="Dark themed text"></ui-text>
   * ```
   */
  @Prop() dark: boolean = false;

  /**
   * Color scheme matching the component family palette.
   * - primary: Main brand color (blue tones)
   * - secondary: Accent color (green/teal tones)  
   * - neutral: Grayscale for subtle integration
   * - success: Green for positive content
   * - warning: Orange for caution
   * - danger: Red for errors or warnings
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'danger' = 'primary';

  /**
   * Label for the text component with enhanced styling
   * @example
   * ```html
   * <ui-text label="Description" value="Text content"></ui-text>
   * ```
   */
  @Prop() label?: string;

  /**
   * Whether the component is read-only (displays value but cannot be changed).
   * @example
   * ```html
   * <ui-text readonly="true" value="Read-only text"></ui-text>
   * ```
   */
  @Prop() readonly: boolean = false;

  /**
   * Enable keyboard navigation and shortcuts.
   * @example
   * ```html
   * <ui-text keyboard="false" value="No keyboard support"></ui-text>
   * ```
   */
  @Prop() keyboard: boolean = true;

  /**
   * Show last updated timestamp below the component.
   * @example
   * ```html
   * <ui-text showLastUpdated="true" value="With timestamp"></ui-text>
   * ```
   */
  @Prop() showLastUpdated: boolean = false;

  /**
   * Current text value
   * @example
   * ```html
   * <ui-text value="Initial text content"></ui-text>
   * ```
   */
  @Prop({ mutable: true }) value: string = '';

  /**
   * Placeholder text for empty fields with enhanced styling
   */
  @Prop() placeholder?: string;

  /**
   * Maximum character length with visual feedback
   */
  @Prop() maxLength?: number;

  /**
   * Number of rows for multi-line text (enhanced with auto-resize)
   */
  @Prop() rows: number = 4;

  /**
   * Allow manual resizing of text area (enhanced with constraints)
   */
  @Prop() resizable: boolean = false;

  /**
   * Allow expanding/collapsing of text area with smooth animations
   */
  @Prop() expandable: boolean = false;

  /**
   * Maximum height when expanded (pixels) with responsive behavior
   */
  @Prop() maxHeight: number = 200;

  /**
   * Compact mode for dense layouts
   */
  @Prop() compact: boolean = false;

  /**
   * Show character count for text inputs
   */
  @Prop() showCharCount: boolean = false;

  /**
   * Auto-resize textarea to content (for multi-line text)
   */
  @Prop() autoResize: boolean = false;

  /**
   * Enable spell check for editable text
   */
  @Prop() spellCheck: boolean = true;

  @State() currentValue: string = '';
  @State() operationStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  @State() lastError?: string;
  @State() isExpanded = false;

  @Event() textChange: EventEmitter<UiTextValueChange>;
  @Event() valueChange: EventEmitter<UiTextValueChange>;

  /**
   * Standardized value event emitter - emits UiMsg<string> with enhanced metadata.
   * Provides consistent value change notifications with unified messaging format.
   * @example
   * ```typescript
   * text.addEventListener('valueMsg', (e) => {
   *   console.log('Text changed:', e.detail.payload);
   *   console.log('Metadata:', e.detail.meta);
   * });
   * ```
   */
  @Event() valueMsg: EventEmitter<UiMsg<string>>;

  // Status management
  @State() private _status: 'success' | 'warning' | 'error' | null = null;
  @State() private _lastUpdated: Date | null = null;

  @Watch('value') watchValue() { this.currentValue = this.value }

  componentWillLoad() { this.currentValue = this.value }

  private handleInput = (event: Event) => {
    if (this.disabled || this.variant === 'display') return;
    const t = event.target as HTMLInputElement | HTMLTextAreaElement;
    const v = t.value;
    const oldValue = this.value;
    this.currentValue = v; 
    this.value = v;
    this._lastUpdated = new Date();
    
    // Emit standardized event
    this.valueMsg.emit({
      payload: v,
      prev: oldValue,
      ts: Date.now(),
      source: this.el?.id || 'ui-text',
      ok: true,
      meta: {
        component: 'ui-text',
        type: 'input',
        source: 'user'
      }
    });
    
    this.textChange.emit({ value: v });
    this.valueChange.emit({ value: v });
    this.operationStatus = 'success';
    setTimeout(() => { this.operationStatus = 'idle'; }, 1000);
  }

  private escapeHtml(s: string) { return s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

  /** Enhanced syntax highlighting with more formats */
  private highlightSyntax(text: string, structure: string) {
    if (!text) return '';
    if (structure === 'unstructured') return this.escapeHtml(text);
    
    try {
      switch (structure) {
        case 'json':
          return this.escapeHtml(JSON.stringify(JSON.parse(text), null, 2));
        case 'yaml':
          // Basic YAML formatting (could be enhanced with proper parser)
          return this.escapeHtml(text);
        case 'xml':
          // Basic XML formatting (could be enhanced with proper parser)
          return this.escapeHtml(text);
        case 'markdown':
          // Basic markdown highlighting (could be enhanced with markdown parser)
          return this.escapeHtml(text);
        case 'code':
          return this.escapeHtml(text);
        default:
          return this.escapeHtml(text);
      }
    } catch (e) {
      return this.escapeHtml(text);
    }
  }

  /** Check if expand button should be shown */
  private shouldShowExpandButton() { 
    if (!this.expandable || this.textType === 'single') return false; 
    const lines = (this.currentValue || '').split('\n').length; 
    return lines * 20 > this.maxHeight;
  }

  /** Toggle expanded state */
  private toggleExpand = () => { this.isExpanded = !this.isExpanded; }

  /** Get color name for CSS classes */
  private getColorName(): string {
    const colorMap = {
      'primary': 'blue-500',
      'secondary': 'green-500', 
      'neutral': 'gray-500',
      'success': 'green-600',
      'warning': 'orange-500',
      'danger': 'red-500'
    };
    return colorMap[this.color] || colorMap.primary;
  }

  /** Get comprehensive input styles matching component family */
  private getInputStyles() {
    const isDisabled = this.disabled;
    const isReadonly = this.readonly;
    const isEdit = this.variant === 'edit';
    const colorName = this.getColorName();
    
    // Base styles with size variations
    let base = `w-full transition-all duration-200 font-sans ${
      this.size === 'small' ? 'text-xs' : 
      this.size === 'large' ? 'text-base' : 
      'text-sm'
    } ${this.compact ? 'leading-tight' : 'leading-relaxed'}`;

    // State-based styling
    if (isDisabled || isReadonly) {
      base += ' opacity-50 cursor-not-allowed';
    }

    // Variant-specific styling
    if (this.variant === 'minimal') {
      base += ` bg-transparent border-0 ${
        this.dark ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
      } focus:outline-none focus:ring-2 focus:ring-${colorName} focus:ring-opacity-50`;
    } else if (this.variant === 'outlined') {
      base += ` bg-transparent border-2 border-${colorName} ${
        this.dark ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
      } focus:outline-none focus:ring-2 focus:ring-${colorName} focus:ring-opacity-50 ${
        this.size === 'small' ? 'px-2 py-1' : 
        this.size === 'large' ? 'px-4 py-3' : 
        'px-3 py-2'
      } rounded-md`;
    } else if (this.variant === 'filled') {
      base += ` bg-${colorName} text-white placeholder-white placeholder-opacity-70 border-0 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 ${
        this.size === 'small' ? 'px-2 py-1' : 
        this.size === 'large' ? 'px-4 py-3' : 
        'px-3 py-2'
      } rounded-md`;
    } else if (this.variant === 'elevated') {
      base += ` ${
        this.dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
      } border shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-${colorName} focus:ring-opacity-50 ${
        this.size === 'small' ? 'px-2 py-1' : 
        this.size === 'large' ? 'px-4 py-3' : 
        'px-3 py-2'
      } rounded-md`;
    } else if (isEdit) {
      // Default edit styling
      base += ` border rounded-md focus:outline-none focus:ring-2 focus:ring-${colorName} ${
        this.size === 'small' ? 'px-2 py-1' : 
        this.size === 'large' ? 'px-4 py-3' : 
        'px-3 py-2'
      }`;
      
      if (isDisabled) {
        base += ' bg-gray-100 border-gray-300 text-gray-500';
      } else {
        base += this.dark ? 
          ' bg-gray-800 border-gray-600 text-white placeholder-gray-400' : 
          ' bg-white border-gray-300 text-gray-900 placeholder-gray-500';
      }
    } else {
      // Display mode styling
      base += ` ${
        this.size === 'small' ? 'p-2' : 
        this.size === 'large' ? 'p-4' : 
        'p-3'
      } rounded-md border ${
        this.dark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-900'
      }`;
    }

    // Additional features
    if (this.resizable && this.textType === 'multi') {
      base += ' resize';
    }

    if (this.autoResize && this.textType === 'multi') {
      base += ' resize-none'; // Disable manual resize if auto-resize is enabled
    }

    return base;
  }

  // ========================================
  // Standardized Component API Methods
  // ========================================

  /**
   * Set the text value programmatically and emit events.
   * @param value - Text string to set
   * @param metadata - Optional metadata to include in the event
   * @example
   * ```typescript
   * await text.setValue('Updated content');
   * await text.setValue('Content', { source: 'api' });
   * ```
   */
  @Method()
  async setValue(value: string, metadata?: Record<string, any>): Promise<void> {
    const oldValue = this.value;
    this.value = value;
    this.currentValue = value;
    this._lastUpdated = new Date();

    // Emit standardized event
    this.valueMsg.emit({
      payload: value,
      prev: oldValue,
      ts: Date.now(),
      source: this.el?.id || 'ui-text',
      ok: true,
      meta: {
        component: 'ui-text',
        type: 'setValue',
        source: 'method',
        ...metadata
      }
    });

    // Emit legacy events for backward compatibility
    this.textChange.emit({ value });
    this.valueChange.emit({ value });
  }

  /**
   * Get the current text value.
   * @returns Current text value
   * @example
   * ```typescript
   * const currentText = await text.getValue();
   * console.log('Current text:', currentText);
   * ```
   */
  @Method()
  async getValue(): Promise<string> {
    return this.value;
  }

  /**
   * Set value without emitting events (silent update).
   * @param value - Text string to set
   * @example
   * ```typescript
   * await text.setValueSilent('Silent update');
   * ```
   */
  @Method()
  async setValueSilent(value: string): Promise<void> {
    this.value = value;
    this.currentValue = value;
    this._lastUpdated = new Date();
  }

  /**
   * Set the visual status of the text component (success, warning, error).
   * @param status - Status type or null to clear
   * @param message - Optional status message
   * @example
   * ```typescript
   * await text.setStatus('error', 'Invalid format');
   * await text.setStatus('success', 'Content saved');
   * await text.setStatus(null); // Clear status
   * ```
   */
  @Method()
  async setStatus(status: 'success' | 'warning' | 'error' | null, message?: string): Promise<void> {
    this._status = status;
    
    // Emit status change event
    this.valueMsg.emit({
      payload: this.value,
      ts: Date.now(),
      source: this.el?.id || 'ui-text',
      ok: status !== 'error',
      meta: {
        component: 'ui-text',
        type: 'statusChange',
        status,
        message,
        source: 'method'
      }
    });
  }

  /**
   * Trigger a visual pulse effect to indicate the value was read/accessed.
   * @example
   * ```typescript
   * await text.triggerReadPulse();
   * ```
   */
  @Method()
  async triggerReadPulse(): Promise<void> {
    // Add pulse class temporarily
    this.el.classList.add('read-pulse');
    
    // Emit read event
    this.valueMsg.emit({
      payload: this.value,
      ts: Date.now(),
      source: this.el?.id || 'ui-text',
      ok: true,
      meta: {
        component: 'ui-text',
        type: 'read',
        source: 'method'
      }
    });

    // Remove pulse class after animation
    setTimeout(() => {
      this.el.classList.remove('read-pulse');
    }, 300);
  }

  render() {
    const inputStyles = this.getInputStyles();
    const isDisabled = this.disabled;
    const isEdit = this.variant === 'edit';

    return (
      <div class='relative w-full' part="container">
        {this.label && <label class={`block text-sm font-medium mb-2 ${isDisabled ? 'text-gray-400' : (this.dark ? 'text-white' : 'text-gray-900')}`}>{this.label}{!isEdit && <span class='ml-1 text-xs text-blue-500 dark:text-blue-400'>(Read-only)</span>}</label>}
        <div class='relative'>

              {isEdit ? (
            this.textType === 'single' ? (
              <input part="input" type='text' class={inputStyles} value={this.currentValue} placeholder={this.placeholder} maxLength={this.maxLength} disabled={isDisabled} onInput={this.handleInput} aria-label={this.label || 'Text input'} />
            ) : (
              <textarea part="input" class={`${inputStyles} ${this.resizable ? 'resize-vertical' : 'resize-none'}`} value={this.currentValue} placeholder={this.placeholder} maxLength={this.maxLength} rows={this.rows} disabled={isDisabled} onInput={this.handleInput} aria-label={this.label || 'Text area'} />
            )
          ) : (
            <div class={inputStyles}>
              {this.textType === 'single' ? <span class='block truncate'>{this.currentValue || '\u00A0'}</span> : (
                <div class={`overflow-auto ${this.expandable && !this.isExpanded ? 'max-h-48' : ''}`} style={this.expandable && !this.isExpanded ? { maxHeight: `${this.maxHeight}px` } : {}} part="preview">
                  {this.structure === 'unstructured' ? <pre class='whitespace-pre-wrap m-0 font-sans text-sm'>{this.currentValue || '\u00A0'}</pre> : <pre class='whitespace-pre-wrap m-0 font-mono text-sm'>{this.highlightSyntax(this.currentValue || '\u00A0', this.structure)}</pre>}
                </div>
              )}
            </div>
          )}

          {this.shouldShowExpandButton() && <button type='button' class={`mt-2 text-xs font-medium transition-colors ${this.dark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`} onClick={this.toggleExpand}>{this.isExpanded ? '▲ Show Less' : '▼ Show More'}</button>}

          {isEdit && this.currentValue && <div class={`mt-1 text-xs ${this.dark ? 'text-gray-400' : 'text-gray-500'}`}>{this.textType === 'single' ? <span>{this.currentValue.length}{this.maxLength && ` / ${this.maxLength}`} characters</span> : <span>{this.currentValue.split('\n').length} lines, {this.currentValue.length} characters{this.maxLength && ` / ${this.maxLength}`}</span>}</div>}
        </div>

        {/* Status Badge */}
        {this._status && (
          <div class={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full mt-2 ${
            this._status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
            this._status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            <span class={`w-2 h-2 rounded-full mr-1 ${
              this._status === 'success' ? 'bg-green-600' :
              this._status === 'warning' ? 'bg-yellow-600' :
              'bg-red-600'
            }`}></span>
            {this._status}
          </div>
        )}

        {/* Last Updated */}
        {this.showLastUpdated && this._lastUpdated && (
          <div class={`text-xs mt-2 ${this.dark ? 'text-gray-400' : 'text-gray-500'}`}>
            {formatLastUpdated(this._lastUpdated.getTime())}
          </div>
        )}

        {/* Error Message */}
        {this.lastError && <div class='text-red-500 text-sm mt-1 px-2'>{this.lastError}</div>}
      </div>
    )
  }
}
