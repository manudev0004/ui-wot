import { Component, Prop, State, h, Event, EventEmitter, Watch } from '@stencil/core';
import { DataHandler } from '../../utils/data-handler';

/**
 * Comprehensive text component for displaying and editing text data.
 * Supports single-line input, multi-line textarea, structured text with syntax highlighting,
 * expandable content, and Thing Description integration.
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
 * @example Structured Text with Highlighting
 * ```html
 * <ui-text
 *   variant="display"
 *   text-type="multi"
 *   structure="json"
 *   value='{"key": "value"}'>
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
   * Structure type for syntax highlighting in display mode.
   * - unstructured: Plain text (default)
   * - json: JSON syntax highlighting
   * - yaml: YAML syntax highlighting
   * - xml: XML syntax highlighting
   * - markdown: Markdown syntax highlighting
   */
  @Prop() structure: 'unstructured' | 'json' | 'yaml' | 'xml' | 'markdown' = 'unstructured';

  /**
   * Whether the text area should be resizable (edit mode only).
   */
  @Prop() resizable: boolean = false;

  /**
   * Enable expandable/collapsible display for long text.
   */
  @Prop() expandable: boolean = false;

  /**
   * Maximum height before showing expand/collapse controls (in pixels).
   */
  @Prop() maxHeight: number = 200;

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
   * Success feedback state.
   */
  @State() showSuccess: boolean = false;

  /**
   * Last error message.
   */
  @State() errorMessage?: string;

  /**
   * Whether expandable text is currently expanded.
   */
  @State() isExpanded: boolean = false;

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

    // Clear previous state
    this.showSuccess = false;
    this.errorMessage = undefined;

    const result = await DataHandler.readFromDevice(this.tdUrl);

    if (result.success && typeof result.value === 'string') {
      this.currentValue = result.value;
      this.value = result.value;
      this.showSuccess = true;

      // Clear success indicator after 3 seconds
      setTimeout(() => {
        this.showSuccess = false;
      }, 3000);
    } else {
      this.errorMessage = result.error || 'Failed to read text value';

      // Clear error indicator after 8 seconds
      setTimeout(() => {
        this.errorMessage = undefined;
      }, 8000);

      console.warn('Text read failed:', result.error);
    }
  }

  private async writeToDevice(value: string): Promise<boolean> {
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
      this.errorMessage = result.error || 'Failed to update text value';

      // Clear error indicator after 8 seconds
      setTimeout(() => {
        this.errorMessage = undefined;
      }, 8000);

      console.warn('Text write failed:', result.error);
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

  private highlightSyntax(text: string, structure: string): string {
    if (structure === 'unstructured' || !text) {
      return text;
    }

    try {
      switch (structure) {
        case 'json':
          return this.highlightJson(text);
        case 'yaml':
          return this.highlightYaml(text);
        case 'xml':
          return this.highlightXml(text);
        case 'markdown':
          return this.highlightMarkdown(text);
        default:
          return text;
      }
    } catch (error) {
      console.warn('Syntax highlighting failed:', error);
      return text;
    }
  }

  private highlightJson(text: string): string {
    // Basic JSON highlighting
    return text
      .replace(/"([^"]+)":/g, '<span style="color: #0066cc; font-weight: 500;">"$1"</span>:')
      .replace(/:\s*"([^"]+)"/g, ': <span style="color: #008000;">"$1"</span>')
      .replace(/:\s*(\d+(?:\.\d+)?)/g, ': <span style="color: #ff6600;">$1</span>')
      .replace(/:\s*(true|false|null)/g, ': <span style="color: #cc0066;">$1</span>')
      .replace(/([{}[\],])/g, '<span style="color: #666;">$1</span>');
  }

  private highlightYaml(text: string): string {
    // Basic YAML highlighting
    return text
      .replace(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*):(?=\s|$)/gm, '$1<span style="color: #0066cc; font-weight: 500;">$2</span>:')
      .replace(/:\s*'([^']+)'/g, ': <span style="color: #008000;">\'$1\'</span>')
      .replace(/:\s*"([^"]+)"/g, ': <span style="color: #008000;">"$1"</span>')
      .replace(/:\s*(\d+(?:\.\d+)?)/g, ': <span style="color: #ff6600;">$1</span>')
      .replace(/:\s*(true|false|null|enabled|disabled)/g, ': <span style="color: #cc0066;">$1</span>')
      .replace(/^\s*#.*$/gm, '<span style="color: #999; font-style: italic;">$&</span>');
  }

  private highlightXml(text: string): string {
    // Basic XML highlighting
    return text
      .replace(
        /(&lt;\/?)([a-zA-Z0-9_-]+)([^&]*?)(&gt;)/g,
        '<span style="color: #666;">$1</span><span style="color: #0066cc; font-weight: 500;">$2</span><span style="color: #cc0066;">$3</span><span style="color: #666;">$4</span>',
      )
      .replace(
        /(<\/?)([a-zA-Z0-9_-]+)([^>]*?)(>)/g,
        '<span style="color: #666;">$1</span><span style="color: #0066cc; font-weight: 500;">$2</span><span style="color: #cc0066;">$3</span><span style="color: #666;">$4</span>',
      )
      .replace(/([a-zA-Z0-9_-]+)="([^"]+)"/g, '<span style="color: #cc0066;">$1</span>=<span style="color: #008000;">"$2"</span>');
  }

  private highlightMarkdown(text: string): string {
    // Basic Markdown highlighting
    return text
      .replace(/^(#{1,6})\s+(.+)$/gm, '<span style="color: #0066cc; font-weight: bold;">$1</span> <span style="color: #333; font-weight: 600;">$2</span>')
      .replace(/\*\*([^*]+)\*\*/g, '<span style="font-weight: bold; color: #333;">$1</span>')
      .replace(/\*([^*]+)\*/g, '<span style="font-style: italic; color: #666;">$1</span>')
      .replace(/`([^`]+)`/g, '<span style="background: #f5f5f5; color: #cc0066; padding: 1px 3px; border-radius: 3px; font-family: monospace;">$1</span>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span style="color: #0066cc; text-decoration: underline;">$1</span>')
      .replace(/^(\s*[-*+]|\s*\d+\.)\s+/gm, '<span style="color: #666; font-weight: 500;">$1</span> ')
      .replace(/^>\s+(.+)$/gm, '<span style="border-left: 3px solid #ddd; padding-left: 8px; color: #666; font-style: italic;">$1</span>');
  }

  private shouldShowExpandButton(): boolean {
    if (!this.expandable || this.textType === 'single') return false;

    // Check if content exceeds maxHeight (rough estimation)
    const lines = this.currentValue.split('\n').length;
    const estimatedHeight = lines * 20; // Rough estimation of line height
    return estimatedHeight > this.maxHeight;
  }

  private toggleExpand = () => {
    this.isExpanded = !this.isExpanded;
  };

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
            {!isEdit && <span class="ml-1 text-xs text-blue-500 dark:text-blue-400">(Read-only)</span>}
          </label>
        )}

        <div class="relative">
          {/* Success Indicator */}
          {this.showSuccess && (
            <div class="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 z-10">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 3L4.5 8.5L2 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
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
                class={`${inputStyles} ${this.resizable ? 'resize-vertical' : 'resize-none'}`}
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
                <div
                  class={`overflow-auto ${this.expandable && !this.isExpanded ? 'max-h-48' : ''}`}
                  style={this.expandable && !this.isExpanded ? { maxHeight: `${this.maxHeight}px` } : {}}
                >
                  {this.structure === 'unstructured' ? (
                    <pre class="whitespace-pre-wrap m-0 font-sans text-sm">{this.currentValue || '\u00A0'}</pre>
                  ) : (
                    <pre class="whitespace-pre-wrap m-0 font-mono text-sm" innerHTML={this.highlightSyntax(this.currentValue || '\u00A0', this.structure)}></pre>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Expand/Collapse Button */}
          {this.shouldShowExpandButton() && (
            <button
              type="button"
              class={`mt-2 text-xs font-medium transition-colors ${this.theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
              onClick={this.toggleExpand}
            >
              {this.isExpanded ? '▲ Show Less' : '▼ Show More'}
            </button>
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

        {/* Error Message */}
        {this.errorMessage && <div class="text-red-500 text-sm mt-1 px-2">{this.errorMessage}</div>}
      </div>
    );
  }
}
