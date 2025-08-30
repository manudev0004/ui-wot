import { Component, Prop, State, h, Event, EventEmitter, Watch, Element, Method } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { StatusIndicator } from '../../utils/status-indicator';

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
 * <ui-text size="large" dark="true" variant="filled"></ui-text>
 * <ui-text size="small" compact="true" variant="minimal"></ui-text>
 * ```
 * 
 * @example Theme Variations
 * ```html
 * <ui-text themeVariant="modern" dark="true"></ui-text>
 * <ui-text themeVariant="elegant" dark="false"></ui-text>
 * <ui-text themeVariant="soft" dark="true"></ui-text>
 * <ui-text themeVariant="vibrant" dark="false"></ui-text>
 * ```
 * 
 * @example Line Numbers & Resizable Fields
 * ```html
 * <ui-text textType="multi" showLineNumbers="true" lineNumberStyle="highlighted"></ui-text>
 * <ui-text textType="multi" resizable="true" resizeDirection="both" minHeight="100" maxHeight="400"></ui-text>
 * ```
 * 
 * @example Line Numbers & Resizable Fields
 * ```html
 * <ui-text textType="multi" showLineNumbers="true" lineNumberStyle="highlighted"></ui-text>
 * <ui-text textType="multi" resizable="true" resizeDirection="both" minHeight="100" maxHeight="400"></ui-text>
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
   * Show line numbers for multi-line text (code editor style)
   * @example
   * ```html
   * <ui-text textType="multi" showLineNumbers="true"></ui-text>
   * ```
   */
  @Prop() showLineNumbers: boolean = false;

  /**
   * Line number style for better visualization
   * @example
   * ```html
   * <ui-text textType="multi" showLineNumbers="true" lineNumberStyle="highlighted"></ui-text>
   * ```
   */
  @Prop() lineNumberStyle: 'simple' | 'highlighted' | 'bordered' | 'floating' = 'simple';

  /**
   * Theme variation presets for quick styling changes
   * @example
   * ```html
   * <ui-text themeVariant="modern" dark="true"></ui-text>
   * ```
   */
  @Prop() themeVariant: 'default' | 'modern' | 'elegant' | 'soft' | 'vibrant' | 'sharp' = 'default';

  /**
   * Direction in which the field can be resized
   * @example
   * ```html
   * <ui-text resizable="true" resizeDirection="both"></ui-text>
   * ```
   */
  @Prop() resizeDirection: 'vertical' | 'horizontal' | 'both' | 'none' = 'vertical';

  /**
   * Enable syntax highlighting for code
   * @example
   * ```html
   * <ui-text variant="code" syntaxHighlight="true" language="javascript"></ui-text>
   * ```
   */
  @Prop() syntaxHighlight: boolean = false;

  /**
   * Programming language for syntax highlighting
   * @example
   * ```html
   * <ui-text syntaxHighlight="true" language="python"></ui-text>
   * ```
   */
  @Prop() language: 'javascript' | 'typescript' | 'python' | 'json' | 'html' | 'css' | 'yaml' | 'markdown' = 'javascript';

  /**
   * Enable word wrap for long lines
   * @example
   * ```html
   * <ui-text textType="multi" wordWrap="true"></ui-text>
   * ```
   */
  @Prop() wordWrap: boolean = true;

  /**
   * Enable copy to clipboard button
   * @example
   * ```html
   * <ui-text copyable="true" value="Copy this text"></ui-text>
   * ```
   */
  @Prop() copyable: boolean = false;

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
   * Border style options for enhanced visual design
   * @example
   * ```html
   * <ui-text borderStyle="dashed" borderWidth="2" borderColor="#ff6b6b"></ui-text>
   * ```
   */
  @Prop() borderStyle: 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset' = 'solid';

  /**
   * Border width in pixels (1-8)
   * @example
   * ```html
   * <ui-text borderWidth="3" variant="outlined"></ui-text>
   * ```
   */
  @Prop() borderWidth: number = 2;

  /**
   * Custom border color (hex, rgb, or color name)
   * @example
   * ```html
   * <ui-text borderColor="#ff6b6b" variant="outlined"></ui-text>
   * ```
   */
  @Prop() borderColor?: string;

  /**
   * Custom background color (hex, rgb, or color name)
   * @example
   * ```html
   * <ui-text backgroundColor="linear-gradient(45deg, #ff6b6b, #4ecdc4)" variant="filled"></ui-text>
   * ```
   */
  @Prop() backgroundColor?: string;

  /**
   * Custom text color (hex, rgb, or color name)
   * @example
   * ```html
   * <ui-text textColor="#ffffff" backgroundColor="#333333"></ui-text>
   * ```
   */
  @Prop() textColor?: string;

  /**
   * Border radius preset or custom value
   * @example
   * ```html
   * <ui-text borderRadius="round" variant="outlined"></ui-text>
   * <ui-text borderRadius="12px" variant="filled"></ui-text>
   * ```
   */
  @Prop() borderRadius: 'none' | 'small' | 'medium' | 'large' | 'round' | 'full' | string = 'medium';

  /**
   * Shadow intensity for depth effects
   * @example
   * ```html
   * <ui-text shadow="heavy" variant="elevated"></ui-text>
   * ```
   */
  @Prop() shadow: 'none' | 'light' | 'medium' | 'heavy' | 'glow' = 'medium';

  /**
   * Enable smooth animations and transitions
   * @example
   * ```html
   * <ui-text animated="true" variant="filled"></ui-text>
   * ```
   */
  @Prop() animated: boolean = true;

  /**
   * Resize handle style for textareas
   * @example
   * ```html
   * <ui-text resizeHandle="modern" resizable="true"></ui-text>
   * ```
   */
  @Prop() resizeHandle: 'classic' | 'modern' | 'minimal' = 'modern';

  /**
   * Minimum height for auto-resize (pixels)
   * @example
   * ```html
   * <ui-text autoResize="true" minHeight="100"></ui-text>
   * ```
   */
  @Prop() minHeight: number = 40;

  /**
   * Maximum height for auto-resize (pixels)
   * @example
   * ```html
   * <ui-text autoResize="true" maxAutoHeight="300"></ui-text>
   * ```
   */
  @Prop() maxAutoHeight: number = 200;
  @Prop() spellCheck: boolean = true;

  @State() currentValue: string = '';
  @State() operationStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  @State() lastError?: string;
  @State() lastUpdatedTs?: number;
  @State() timestampUpdateTimer?: number;
  @State() private timestampCounter = 0;
  @State() isExpanded = false;
  @State() private lineCount: number = 1;
  @State() private currentLine: number = 1;
  @State() private currentColumn: number = 1;
  @State() private isFocused: boolean = false;

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

  // Element reference for cursor position tracking
  private inputRef?: HTMLInputElement | HTMLTextAreaElement;

  @Watch('value') watchValue() { this.currentValue = this.value }

  componentWillLoad() { 
    this.currentValue = this.value;
    this.updateLineCount();
    
    // Initialize timestamp auto-update timer if showLastUpdated is enabled
    if (this.showLastUpdated && this.lastUpdatedTs) {
      this.timestampUpdateTimer = window.setInterval(() => {
        // Force re-render to update relative timestamp
        this.timestampCounter++;
      }, 30000); // Update every 30 seconds
    }
  }

  disconnectedCallback() {
    if (this.timestampUpdateTimer) {
      clearInterval(this.timestampUpdateTimer);
    }
  }

  /** Update line count for line numbers display */
  private updateLineCount() {
    this.lineCount = (this.currentValue || '').split('\n').length;
  }

  /** Handle cursor position tracking */
  private updateCursorPosition = (event?: Event) => {
    const target = this.inputRef || (event?.target as HTMLTextAreaElement);
    if (target && 'selectionStart' in target) {
      const lines = target.value.substr(0, target.selectionStart).split('\n');
      this.currentLine = lines.length;
      this.currentColumn = lines[lines.length - 1].length + 1;
    }
  }

  /** Handle focus events */
  private handleFocus = () => {
    this.isFocused = true;
  }

  /** Handle blur events */
  private handleBlur = () => {
    this.isFocused = false;
  }

  /** Copy text to clipboard */
  private copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(this.currentValue);
      // Unified success handling
      StatusIndicator.applyStatus(this, 'success');
    } catch (err) {
      // Unified error handling
      StatusIndicator.applyStatus(this, 'error', { errorMessage: 'Failed to copy to clipboard' });
    }
  }

  private handleInput = (event: Event) => {
    if (this.disabled || this.variant === 'display') return;

    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (!target) return;

    const oldValue = this.currentValue;
    const v = target.value;

    this.currentValue = v;
    this.value = v;
    this.lastUpdatedTs = Date.now();
    this.updateLineCount();
    this.updateCursorPosition(event);

    // Emit unified value message
    this.valueMsg.emit({
      payload: v,
      prev: oldValue,
      ts: Date.now(),
      source: this.el?.id || 'ui-text',
      ok: true,
      meta: {
        component: 'ui-text',
        type: 'input',
        source: 'user',
        lineCount: this.lineCount,
        characterCount: v.length
      }
    });

    // Legacy events
    this.textChange.emit({ value: v });
    this.valueChange.emit({ value: v });

    // Unified success status feedback
    StatusIndicator.applyStatus(this, 'success');
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

  /** Apply syntax highlighting based on language */
  private applySyntaxHighlighting(text: string, language: string = 'javascript'): string {
    if (!this.syntaxHighlight || !text) return this.escapeHtml(text);

    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        return this.highlightJavaScript(text);
      case 'typescript':
      case 'ts':
        return this.highlightTypeScript(text);
      case 'python':
      case 'py':
        return this.highlightPython(text);
      case 'json':
        return this.highlightJSON(text);
      case 'css':
        return this.highlightCSS(text);
      case 'html':
        return this.highlightHTML(text);
      default:
        return this.escapeHtml(text);
    }
  }

  private highlightJavaScript(text: string): string {
    let highlighted = this.escapeHtml(text);
    
    // Keywords
    highlighted = highlighted.replace(/\b(const|let|var|function|class|if|else|for|while|do|switch|case|break|continue|return|try|catch|finally|throw|new|this|super|extends|import|export|from|default|async|await)\b/g, 
      '<span class="text-blue-600 dark:text-blue-400 font-semibold">$1</span>');
    
    // Strings
    highlighted = highlighted.replace(/(['"`])(?:(?!\1)[^\\]|\\.)*\1/g, 
      '<span class="text-green-600 dark:text-green-400">$&</span>');
    
    // Numbers
    highlighted = highlighted.replace(/\b\d+\.?\d*\b/g, 
      '<span class="text-orange-600 dark:text-orange-400">$&</span>');
    
    // Comments
    highlighted = highlighted.replace(/\/\/.*$/gm, 
      '<span class="text-gray-500 dark:text-gray-400 italic">$&</span>');
    highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, 
      '<span class="text-gray-500 dark:text-gray-400 italic">$&</span>');
    
    return highlighted;
  }

  private highlightTypeScript(text: string): string {
    let highlighted = this.highlightJavaScript(text);
    
    // TypeScript specific keywords
    highlighted = highlighted.replace(/\b(interface|type|enum|public|private|protected|readonly|static|abstract|implements|namespace)\b/g, 
      '<span class="text-purple-600 dark:text-purple-400 font-semibold">$1</span>');
    
    return highlighted;
  }

  private highlightPython(text: string): string {
    let highlighted = this.escapeHtml(text);
    
    // Keywords
    highlighted = highlighted.replace(/\b(def|class|if|elif|else|for|while|try|except|finally|with|as|import|from|return|yield|lambda|and|or|not|in|is|True|False|None)\b/g, 
      '<span class="text-blue-600 dark:text-blue-400 font-semibold">$1</span>');
    
    // Strings
    highlighted = highlighted.replace(/(['"])(?:(?!\1)[^\\]|\\.)*\1/g, 
      '<span class="text-green-600 dark:text-green-400">$&</span>');
    
    // Comments
    highlighted = highlighted.replace(/#.*$/gm, 
      '<span class="text-gray-500 dark:text-gray-400 italic">$&</span>');
    
    return highlighted;
  }

  private highlightJSON(text: string): string {
    try {
      const parsed = JSON.parse(text);
      let formatted = JSON.stringify(parsed, null, 2);
      
      // Highlight strings
      formatted = formatted.replace(/"([^"\\]|\\.)*"/g, 
        '<span class="text-green-600 dark:text-green-400">$&</span>');
      
      // Highlight numbers
      formatted = formatted.replace(/:\s*(-?\d+\.?\d*)/g, 
        ': <span class="text-orange-600 dark:text-orange-400">$1</span>');
      
      // Highlight booleans and null
      formatted = formatted.replace(/:\s*(true|false|null)/g, 
        ': <span class="text-blue-600 dark:text-blue-400">$1</span>');
      
      return formatted;
    } catch (e) {
      return this.escapeHtml(text);
    }
  }

  private highlightCSS(text: string): string {
    let highlighted = this.escapeHtml(text);
    
    // Selectors
    highlighted = highlighted.replace(/^([.#]?[\w-]+)(?=\s*{)/gm, 
      '<span class="text-blue-600 dark:text-blue-400 font-semibold">$1</span>');
    
    // Properties
    highlighted = highlighted.replace(/(\w+)(\s*:)/g, 
      '<span class="text-purple-600 dark:text-purple-400">$1</span>$2');
    
    // Values
    highlighted = highlighted.replace(/(:\s*)([^;]+)/g, 
      '$1<span class="text-green-600 dark:text-green-400">$2</span>');
    
    return highlighted;
  }

  private highlightHTML(text: string): string {
    let highlighted = this.escapeHtml(text);
    
    // Tags
    highlighted = highlighted.replace(/&lt;(\/?[\w-]+)([^&]*?)&gt;/g, 
      '<span class="text-blue-600 dark:text-blue-400">&lt;$1</span><span class="text-green-600 dark:text-green-400">$2</span><span class="text-blue-600 dark:text-blue-400">&gt;</span>');
    
    return highlighted;
  }

  /** Check if expand button should be shown */
  private shouldShowExpandButton() { 
    if (!this.expandable || this.textType === 'single') return false; 
    const lines = (this.currentValue || '').split('\n').length; 
    return lines * 20 > this.maxHeight;
  }

  /** Toggle expanded state */
  private toggleExpand = () => { this.isExpanded = !this.isExpanded; }

  /** Get enhanced color classes with custom color support and theme variants */
  private getColorClasses() {
    // Theme variant presets override standard colors
    if (this.themeVariant !== 'default') {
      // Create theme presets for different visual styles
      switch (this.themeVariant) {
        case 'modern':
          return {
            border: this.dark ? 'border-indigo-500' : 'border-indigo-400',
            bg: this.dark ? 'bg-indigo-900' : 'bg-indigo-50',
            focus: 'focus:ring-indigo-500',
            text: this.dark ? 'text-indigo-200' : 'text-indigo-900',
            customBg: '',
            customBorder: '',
            customText: ''
          };
        case 'elegant':
          return {
            border: this.dark ? 'border-purple-500' : 'border-purple-300',
            bg: this.dark ? 'bg-purple-900' : 'bg-purple-50',
            focus: 'focus:ring-purple-500',
            text: this.dark ? 'text-purple-200' : 'text-purple-900',
            customBg: '',
            customBorder: '',
            customText: ''
          };
        case 'soft':
          return {
            border: this.dark ? 'border-teal-500' : 'border-teal-300',
            bg: this.dark ? 'bg-teal-900' : 'bg-teal-50',
            focus: 'focus:ring-teal-500',
            text: this.dark ? 'text-teal-200' : 'text-teal-900',
            customBg: '',
            customBorder: '',
            customText: ''
          };
        case 'vibrant':
          return {
            border: this.dark ? 'border-pink-600' : 'border-pink-400',
            bg: this.dark ? 'bg-pink-900' : 'bg-pink-50',
            focus: 'focus:ring-pink-500',
            text: this.dark ? 'text-pink-200' : 'text-pink-900',
            customBg: '',
            customBorder: '',
            customText: ''
          };
        case 'sharp':
          return {
            border: this.dark ? 'border-amber-500' : 'border-amber-400',
            bg: this.dark ? 'bg-amber-900' : 'bg-amber-50',
            focus: 'focus:ring-amber-500',
            text: this.dark ? 'text-amber-200' : 'text-amber-900',
            customBg: '',
            customBorder: '',
            customText: ''
          };
      }
    }

    // Custom colors take precedence over standard colors
    if (this.borderColor || this.backgroundColor || this.textColor) {
      return {
        border: this.borderColor ? `border-[${this.borderColor}]` : this.dark ? 'border-gray-600' : 'border-gray-300',
        bg: this.backgroundColor ? '' : this.dark ? 'bg-gray-800' : 'bg-gray-100',
        focus: this.dark ? 'focus:ring-blue-400' : 'focus:ring-blue-500',
        text: this.textColor ? `text-[${this.textColor}]` : this.dark ? 'text-gray-100' : 'text-gray-900',
        customBg: this.backgroundColor || '',
        customBorder: this.borderColor || '',
        customText: this.textColor || ''
      };
    }

    // Standard color schemes with dark mode support
    switch (this.color) {
      case 'secondary':
        return {
          border: this.dark ? 'border-green-600' : 'border-green-500',
          bg: this.dark ? 'bg-green-800' : 'bg-green-500',
          focus: this.dark ? 'focus:ring-green-400' : 'focus:ring-green-500',
          text: this.dark ? 'text-green-200' : 'text-green-500',
          customBg: '',
          customBorder: '',
          customText: ''
        };
      case 'neutral':
        return {
          border: this.dark ? 'border-gray-600' : 'border-gray-500',
          bg: this.dark ? 'bg-gray-700' : 'bg-gray-500',
          focus: this.dark ? 'focus:ring-gray-400' : 'focus:ring-gray-500',
          text: this.dark ? 'text-gray-200' : 'text-gray-500',
          customBg: '',
          customBorder: '',
          customText: ''
        };
      case 'success':
        return {
          border: this.dark ? 'border-green-700' : 'border-green-600',
          bg: this.dark ? 'bg-green-800' : 'bg-green-600',
          focus: this.dark ? 'focus:ring-green-500' : 'focus:ring-green-600',
          text: this.dark ? 'text-green-200' : 'text-green-600',
          customBg: '',
          customBorder: '',
          customText: ''
        };
      case 'warning':
        return {
          border: this.dark ? 'border-orange-600' : 'border-orange-500',
          bg: this.dark ? 'bg-orange-800' : 'bg-orange-500',
          focus: this.dark ? 'focus:ring-orange-400' : 'focus:ring-orange-500',
          text: this.dark ? 'text-orange-200' : 'text-orange-500',
          customBg: '',
          customBorder: '',
          customText: ''
        };
      case 'danger':
        return {
          border: this.dark ? 'border-red-600' : 'border-red-500',
          bg: this.dark ? 'bg-red-800' : 'bg-red-500',
          focus: this.dark ? 'focus:ring-red-400' : 'focus:ring-red-500',
          text: this.dark ? 'text-red-200' : 'text-red-500',
          customBg: '',
          customBorder: '',
          customText: ''
        };
      default: // primary
        return {
          border: this.dark ? 'border-blue-600' : 'border-blue-500',
          bg: this.dark ? 'bg-blue-800' : 'bg-blue-500',
          focus: this.dark ? 'focus:ring-blue-400' : 'focus:ring-blue-500',
          text: this.dark ? 'text-blue-200' : 'text-blue-500',
          customBg: '',
          customBorder: '',
          customText: ''
        };
    }
  }

  /** Get comprehensive input styles matching component family */
  private getInputStyles() {
    const isDisabled = this.disabled;
    const isReadonly = this.readonly;
    const isEdit = this.variant === 'edit';
    const colors = this.getColorClasses();
    
    // Base styles with size variations
    let base = `w-full transition-all duration-300 font-sans ${
      this.size === 'small' ? 'text-xs' : 
      this.size === 'large' ? 'text-lg' : 
      'text-sm'
    } ${this.compact ? 'leading-tight' : 'leading-relaxed'}`;

    // Enhanced resizing styles with direction support
    if (this.resizable && this.textType === 'multi') {
      // Handle resize direction
      switch (this.resizeDirection) {
        case 'vertical':
          base += ' resize-y';
          break;
        case 'horizontal':
          base += ' resize-x';
          break;
        case 'both':
          base += ' resize';
          break;
        case 'none':
          base += ' resize-none';
          break;
        default:
          base += ' resize-y';
      }
      
      // Apply resize handle style
      switch (this.resizeHandle) {
        case 'classic':
          base += ' classic-resize-handle';
          break;
        case 'modern':
          base += ' modern-resize-handle rounded-br-lg';
          break;
        case 'minimal':
          base += ' minimal-resize-handle';
          break;
        default:
          base += '';
      }
    } else if (this.textType === 'multi') {
      base += ' resize-none';
    }

    // State-based styling
    if (isDisabled || isReadonly) {
      base += ' opacity-60 cursor-not-allowed';
    }

    // Variant-specific styling with enhanced visual differences and borders
    if (this.variant === 'minimal') {
      // Minimal: Clean, borderless with subtle underline and hover effects
      base += ` bg-transparent border-0 border-b-2 border-gray-300 ${
        this.dark ? 'text-gray-100 placeholder-gray-500 border-gray-600' : 'text-gray-800 placeholder-gray-400'
      } focus:outline-none focus:border-b-3 ${colors.border.replace('border-', 'focus:border-b-')} ${
        this.size === 'small' ? 'px-2 py-2' : 
        this.size === 'large' ? 'px-3 py-4' : 
        'px-2 py-3'
      } hover:${this.dark ? 'bg-gray-800/30' : 'bg-gray-50/80'} rounded-t-lg transition-all duration-200 hover:border-b-3`;
    } else if (this.variant === 'outlined') {
      // Outlined: Bold, colorful borders with enhanced focus states
      const borderWidth = Math.max(1, Math.min(4, this.borderWidth));
      base += ` bg-transparent border-${borderWidth} ${colors.border} ${
        this.borderStyle === 'dashed' ? 'border-dashed' : 
        this.borderStyle === 'dotted' ? 'border-dotted' : 'border-solid'
      } ${
        this.dark ? 'text-gray-100 placeholder-gray-400 hover:bg-gray-800/50' : 'text-gray-900 placeholder-gray-500 hover:bg-gray-50/80'
      } focus:outline-none focus:ring-4 ${colors.focus} focus:ring-opacity-30 focus:border-opacity-100 ${
        this.size === 'small' ? 'px-3 py-2' : 
        this.size === 'large' ? 'px-5 py-4' : 
        'px-4 py-3'
      } rounded-xl shadow-sm hover:shadow-lg transform hover:scale-[1.01] transition-all duration-200`;
    } else if (this.variant === 'filled') {
      // Filled: Solid background with contrasting text and subtle borders
      base += ` ${colors.bg} border-2 border-transparent ${
        this.dark ? 'text-white' : 'text-white'
      } placeholder-white/80 focus:outline-none focus:ring-4 focus:ring-white/40 focus:shadow-xl ${
        this.size === 'small' ? 'px-3 py-2' : 
        this.size === 'large' ? 'px-5 py-4' : 
        'px-4 py-3'
      } rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] hover:-translate-y-1 font-medium transition-all duration-300`;
    } else if (this.variant === 'elevated') {
      // Elevated: Prominent shadow, depth, and premium borders
      base += ` ${
        this.dark ? 'bg-gray-700 border-gray-500 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
      } border-2 ${this.getShadowClasses()} focus:outline-none focus:ring-4 ${colors.focus} focus:ring-opacity-25 focus:shadow-2xl ${
        this.size === 'small' ? 'px-4 py-3' : 
        this.size === 'large' ? 'px-6 py-5' : 
        'px-5 py-4'
      } rounded-2xl transform hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm`;
    } else if (isEdit) {
      // Default edit styling - enhanced standard input with border customization
      const borderWidth = Math.max(1, Math.min(3, this.borderWidth));
      base += ` border-${borderWidth} ${
        this.borderStyle === 'dashed' ? 'border-dashed' : 
        this.borderStyle === 'dotted' ? 'border-dotted' : 'border-solid'
      } rounded-lg focus:outline-none focus:ring-3 ${colors.focus} focus:ring-opacity-30 ${
        this.size === 'small' ? 'px-3 py-2' : 
        this.size === 'large' ? 'px-4 py-3' : 
        'px-3 py-2'
      } transition-all duration-200 shadow-sm hover:shadow-md`;
      
      if (isDisabled) {
        base += ` bg-gray-100 border-gray-300 text-gray-500 ${this.dark ? 'dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400' : ''}`;
      } else {
        base += this.dark ? 
          ' bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400 hover:bg-gray-750 hover:border-gray-500' : 
          ' bg-white border-gray-300 text-gray-900 placeholder-gray-500 hover:bg-gray-50 hover:border-gray-400';
      }
    } else {
      // Display mode styling - enhanced read-only appearance with beautiful borders
      base += ` ${
        this.size === 'small' ? 'p-3' : 
        this.size === 'large' ? 'p-5' : 
        'p-4'
      } rounded-xl border-2 font-medium ${
        this.dark ? 'bg-gray-800/90 border-gray-600 text-gray-100' : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300 text-gray-900'
      } shadow-inner backdrop-blur-sm ${this.getShadowClasses()} hover:shadow-lg transition-all duration-200`;
    }

    return base;
  }

  /** Get shadow classes */
  private getShadowClasses() {
    switch (this.shadow) {
      case 'none': return '';
      case 'light': return 'shadow-sm';
      case 'medium': return 'shadow-md';
      case 'heavy': return 'shadow-xl';
      case 'glow': return 'shadow-2xl shadow-blue-500/25';
      default: return 'shadow-md';
    }
  }

  /** Get enhanced label styles for each variant */
  private getLabelStyles() {
    const isDisabled = this.disabled;
    const colors = this.getColorClasses();
    
    let labelClass = `block font-medium mb-3 transition-all duration-300 ${
      this.size === 'small' ? 'text-xs' : 
      this.size === 'large' ? 'text-base' : 
      'text-sm'
    }`;

    if (isDisabled) {
      labelClass += ' opacity-60 cursor-not-allowed';
    }

    // Variant-specific label styling
    switch (this.variant) {
      case 'minimal':
        labelClass += ` ${this.dark ? 'text-gray-300' : 'text-gray-700'} font-normal`;
        break;
      case 'outlined':
        labelClass += ` ${colors.text} font-semibold`;
        break;
      case 'filled':
        labelClass += ` ${colors.text} font-bold`;
        break;
      case 'elevated':
        labelClass += ` ${this.dark ? 'text-gray-200' : 'text-gray-800'} font-semibold tracking-wide`;
        break;
      default:
        labelClass += ` ${this.dark ? 'text-gray-200' : 'text-gray-900'}`;
    }

    return labelClass;
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
    this.lastUpdatedTs = Date.now();

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
    this.lastUpdatedTs = Date.now();
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
  async setStatus(status: 'idle' | 'loading' | 'success' | 'error', message?: string): Promise<void> {
    StatusIndicator.applyStatus(this, status, { errorMessage: message });
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
    const labelStyles = this.getLabelStyles();
    const isDisabled = this.disabled;
    const isEdit = this.variant === 'edit';

    return (
      <div class='relative w-full max-w-lg mx-auto' part="container">
        {this.label && (
          <label class={labelStyles}>
            {this.label}
            {!isEdit && (
              <span class={`ml-2 text-xs px-2 py-1 rounded-full ${
                this.dark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-600'
              } font-normal`}>
                Read-only
              </span>
            )}
          </label>
        )}
        <div class='relative'>

          {/* Main input/display area */}
          {isEdit ? (
            <div class="relative flex">
              {/* Line numbers for multiline with showLineNumbers and enhanced styling */}
              {this.textType === 'multi' && this.showLineNumbers && (
                <div class={`flex-shrink-0 px-2 py-2 border-r text-xs font-mono leading-relaxed ${
                  this.lineNumberStyle === 'floating' ? 'absolute left-0 z-10 h-full opacity-90' : ''
                } ${
                  this.dark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-500'
                } ${
                  this.lineNumberStyle === 'highlighted' ? (this.dark ? 'bg-gray-750' : 'bg-gray-50') : ''
                } ${
                  this.lineNumberStyle === 'bordered' ? `border-r-2 ${this.dark ? 'border-gray-600' : 'border-gray-400'}` : ''
                } ${
                  this.lineNumberStyle === 'floating' ? `rounded-l ${this.dark ? 'bg-gray-900' : 'bg-white'} shadow-md` : ''
                }`}>
                  {Array.from({ length: Math.max(this.lineCount, 1) }, (_, i) => (
                    <div key={i + 1} class={`
                      ${i + 1 === this.currentLine ? 
                        (this.lineNumberStyle === 'highlighted' ? 
                          `font-bold ${this.dark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}` : 
                        this.lineNumberStyle === 'bordered' ? 
                          `font-bold border-l-4 pl-1 -ml-1 ${this.dark ? 'border-blue-500 text-blue-300' : 'border-blue-500 text-blue-700'}` : 
                        this.lineNumberStyle === 'floating' ? 
                          `font-bold ${this.dark ? 'text-blue-300' : 'text-blue-700'}` : 
                          `font-bold ${this.dark ? 'text-blue-400' : 'text-blue-600'}`
                        ) : ''
                      } 
                      ${this.lineNumberStyle === 'highlighted' ? (i % 2 === 0 ? 'bg-opacity-10 bg-blue-500' : '') : ''}
                      ${this.lineNumberStyle === 'bordered' ? 'border-b border-opacity-20 border-gray-500' : ''}
                    `}>
                      {i + 1}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Input area */}
              <div class="flex-1 relative">
                {this.textType === 'single' ? (
                  <input 
                    ref={el => this.inputRef = el}
                    part="input" 
                    type='text' 
                    class={inputStyles} 
                    value={this.currentValue} 
                    placeholder={this.placeholder} 
                    maxLength={this.maxLength} 
                    disabled={isDisabled} 
                    onInput={this.handleInput}
                    onFocus={this.handleFocus}
                    onBlur={this.handleBlur}
                    onClick={this.updateCursorPosition}
                    onKeyUp={this.updateCursorPosition}
                    aria-label={this.label || 'Text input'} 
                  />
                ) : (
                  <textarea 
                    ref={el => this.inputRef = el}
                    part="input" 
                    class={`${inputStyles} ${
                      this.resizable ? 
                        (this.resizeDirection === 'vertical' ? 'resize-y' : 
                         this.resizeDirection === 'horizontal' ? 'resize-x' : 
                         this.resizeDirection === 'both' ? 'resize' : 'resize-none') : 
                        'resize-none'
                    } ${this.showLineNumbers ? 'pl-2' : ''}`} 
                    value={this.currentValue} 
                    placeholder={this.placeholder} 
                    maxLength={this.maxLength} 
                    rows={this.rows} 
                    disabled={isDisabled} 
                    onInput={this.handleInput}
                    onFocus={this.handleFocus}
                    onBlur={this.handleBlur}
                    onClick={this.updateCursorPosition}
                    onKeyUp={this.updateCursorPosition}
                    style={{
                      whiteSpace: this.wordWrap ? 'pre-wrap' : 'pre', 
                      wordWrap: this.wordWrap ? 'break-word' : 'normal',
                      minHeight: this.resizable ? `${this.minHeight}px` : undefined,
                      maxHeight: this.resizable ? `${this.maxAutoHeight}px` : undefined
                    }}
                    aria-label={this.label || 'Text area'} 
                  />
                )}
                
                {/* Copy button for copyable content */}
                {this.copyable && this.currentValue && (
                  <button
                    type="button"
                    class={`absolute top-2 right-2 p-1 rounded text-xs transition-colors ${
                      this.dark 
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800'
                    }`}
                    onClick={this.copyToClipboard}
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div class={inputStyles}>
              {this.textType === 'single' ? (
                <span class='block truncate'>{this.currentValue || '\u00A0'}</span>
              ) : (
                <div class="relative">
                  {/* Line numbers for display mode with enhanced styling */}
                  {this.showLineNumbers && (
                    <div class="flex">
                      <div class={`flex-shrink-0 px-2 py-2 border-r text-xs font-mono leading-relaxed ${
                        this.lineNumberStyle === 'floating' ? 'absolute left-0 z-10 h-full opacity-90' : ''
                      } ${
                        this.dark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-500'
                      } ${
                        this.lineNumberStyle === 'highlighted' ? (this.dark ? 'bg-gray-750' : 'bg-gray-50') : ''
                      } ${
                        this.lineNumberStyle === 'bordered' ? `border-r-2 ${this.dark ? 'border-gray-600' : 'border-gray-400'}` : ''
                      } ${
                        this.lineNumberStyle === 'floating' ? `rounded-l ${this.dark ? 'bg-gray-900' : 'bg-white'} shadow-md` : ''
                      } line-numbers`}>
                        {Array.from({ length: Math.max((this.currentValue || '').split('\n').length, 1) }, (_, i) => (
                          <div key={i + 1} class={`
                            ${this.lineNumberStyle === 'highlighted' && i % 2 === 0 ? 'line-number-highlighted' : ''}
                            ${this.lineNumberStyle === 'bordered' ? 'border-b border-opacity-20 border-gray-500' : ''}
                          `}>{i + 1}</div>
                        ))}
                      </div>
                      <div class={`flex-1 px-2 ${this.lineNumberStyle === 'floating' ? 'pl-8' : ''}`}>
                        <div class={`overflow-auto ${this.expandable && !this.isExpanded ? 'max-h-48' : ''}`} 
                             style={{
                               maxHeight: this.expandable && !this.isExpanded ? `${this.maxHeight}px` : undefined,
                               minHeight: this.resizable ? `${this.minHeight}px` : undefined
                             }} 
                             part="preview">
                          {this.syntaxHighlight ? (
                            <pre 
                              class='whitespace-pre-wrap m-0 font-mono text-sm leading-relaxed'
                              innerHTML={this.applySyntaxHighlighting(this.currentValue || '\u00A0', this.language)}
                            ></pre>
                          ) : this.structure === 'unstructured' ? (
                            <pre class='whitespace-pre-wrap m-0 font-sans text-sm leading-relaxed'>{this.currentValue || '\u00A0'}</pre>
                          ) : (
                            <pre class='whitespace-pre-wrap m-0 font-mono text-sm leading-relaxed'>{this.highlightSyntax(this.currentValue || '\u00A0', this.structure)}</pre>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {!this.showLineNumbers && (
                    <div class={`overflow-auto ${this.expandable && !this.isExpanded ? 'max-h-48' : ''}`} 
                         style={this.expandable && !this.isExpanded ? { maxHeight: `${this.maxHeight}px` } : {}} 
                         part="preview">
                      {this.syntaxHighlight ? (
                        <pre 
                          class='whitespace-pre-wrap m-0 font-mono text-sm'
                          innerHTML={this.applySyntaxHighlighting(this.currentValue || '\u00A0', this.language)}
                        ></pre>
                      ) : this.structure === 'unstructured' ? (
                        <pre class='whitespace-pre-wrap m-0 font-sans text-sm'>{this.currentValue || '\u00A0'}</pre>
                      ) : (
                        <pre class='whitespace-pre-wrap m-0 font-mono text-sm'>{this.highlightSyntax(this.currentValue || '\u00A0', this.structure)}</pre>
                      )}
                    </div>
                  )}
                  
                  {/* Copy button for display mode */}
                  {this.copyable && this.currentValue && (
                    <button
                      type="button"
                      class={`absolute top-2 right-2 p-1 rounded text-xs transition-colors ${
                        this.dark 
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white' 
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800'
                      }`}
                      onClick={this.copyToClipboard}
                      title="Copy to clipboard"
                    >
                      📋
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {this.shouldShowExpandButton() && (
            <button 
              type='button' 
              class={`mt-2 text-xs font-medium transition-colors ${
                this.dark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
              }`} 
              onClick={this.toggleExpand}
            >
              {this.isExpanded ? '▲ Show Less' : '▼ Show More'}
            </button>
          )}

          {/* Enhanced character/line info with cursor position */}
          {isEdit && this.currentValue && (
            <div class={`mt-1 text-xs flex justify-between items-center ${this.dark ? 'text-gray-400' : 'text-gray-500'}`}>
              <div>
                {this.textType === 'single' ? (
                  <span>{this.currentValue.length}{this.maxLength && ` / ${this.maxLength}`} characters</span>
                ) : (
                  <span>{this.lineCount} lines, {this.currentValue.length} characters{this.maxLength && ` / ${this.maxLength}`}</span>
                )}
              </div>
              {this.textType === 'multi' && this.isFocused && (
                <div class="text-xs">
                  Ln {this.currentLine}, Col {this.currentColumn}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Unified Status Indicators - Right aligned */}
        <div class="flex justify-between items-start mt-2">
          <div class="flex-1"></div>
          <div class="flex flex-col items-end gap-1">
            {StatusIndicator.renderStatusBadge(this.operationStatus, this.dark ? 'dark' : 'light', this.lastError, h)}
            {this.showLastUpdated && StatusIndicator.renderTimestamp(this.lastUpdatedTs ? new Date(this.lastUpdatedTs) : null, this.dark ? 'dark' : 'light', h)}
          </div>
        </div>
      </div>
    );
  }
}
