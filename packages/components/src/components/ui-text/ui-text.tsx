import { Component, Element, Prop, State, Event, EventEmitter, Method, Watch, h } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator';

/**
 * TextDisplay component supports multiple variants for text-heavy data display and editing.
 * Provides field, area, structured, unstructured, and editable modes with consistent styling.
 *
 * @example Basic Field Display
 * ```html
 * <ui-text mode="field" variant="outlined" value="Sample text" label="Name"></ui-text>
 * ```
 *
 * @example Multi-line Area
 * ```html
 * <ui-text mode="area" variant="filled" value="Long text content..." label="Description"></ui-text>
 * ```
 *
 * @example Structured Data Display
 * ```html
 * <ui-text mode="structured" variant="minimal" value='{"key": "value"}' label="JSON Data"></ui-text>
 * ```
 *
 * @example Editable Mode
 * ```html
 * <ui-text mode="editable" variant="outlined" value="Edit me" label="Notes" id="notes-field"></ui-text>
 * ```
 *
 * @example JavaScript Integration
 * ```javascript
 * const textDisplay = document.querySelector('#notes-field');
 *
 * // Listen for value changes in editable mode
 * textDisplay.addEventListener('valueMsg', (e) => {
 *   console.log('Text changed to:', e.detail.payload);
 * });
 *
 * // Set value programmatically
 * await textDisplay.setValue('New content');
 * ```
 */
@Component({
  tag: 'ui-text',
  styleUrl: 'ui-text.css',
  shadow: true,
})
export class UiText {
  @Element() el: HTMLElement;

  /** Component props */

  /**
   * Display mode for the text component.
   * - field: One-line text display
   * - area: Expandable text box (multi-line)
   * - unstructured: Plain style, no highlighting
   * - structured: Highlighted block (for JSON-like or formatted text)
   * - editable: User can edit/write directly
   */
  @Prop() mode: 'field' | 'area' | 'unstructured' | 'structured' | 'editable' = 'field';

  /**
   * Visual style variant of the text display.
   * - minimal: Text-only with subtle underline or accent
   * - outlined: Border style applied (default)
   * - filled: Background color applied
   */
  @Prop() variant: 'minimal' | 'outlined' | 'filled' = 'outlined';

  /**
   * Whether the component is disabled (editable mode only).
   */
  @Prop() disabled: boolean = false;

  /**
   * Color theme variant.
   * TODO: Review - may be irrelevant for text components, consider removal
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /**
   * Enable dark theme for the component.
   * When true, uses light text on dark backgrounds.
   */
  @Prop() dark: boolean = false;

  /**
   * Enable keyboard navigation for editable mode.
   * Default: true
   * TODO: Review - may be irrelevant since text inputs have native keyboard support
   */
  // @Prop() keyboard: boolean = true;

  /**
   * Show last updated timestamp.
   */
  @Prop() showLastUpdated: boolean = false;

  /**
   * Show status badge when true
   */
  @Prop() showStatus: boolean = true;

  /**
   * Current text value of the component.
   */
  @Prop({ mutable: true }) value: string = '';

  /**
   * Text label displayed above the text display.
   */
  @Prop() label?: string;

  /**
   * Placeholder text shown when value is empty (editable mode only).
   */
  @Prop() placeholder?: string;

  /**
   * Whether the component is read-only.
   */
  @Prop() readonly: boolean = false;

  /**
   * Maximum number of rows for area mode.
   */
  @Prop() maxRows: number = 10;

  /**
   * Minimum number of rows for area mode.
   */
  @Prop() minRows: number = 3;

  /**
   * Show character count (editable mode only).
   */
  @Prop() showCharCount: boolean = false;

  /**
   * Maximum character limit (editable mode only).
   */
  @Prop() maxLength?: number;

  /**
   * Show line numbers (area and structured modes).
   */
  @Prop() showLineNumbers: boolean = false;

  /**
   * Enable text area resizing (area and editable modes).
   */
  @Prop() resizable: boolean = true;

  /**
   * Debounce delay in milliseconds for editable mode updates (0 = disabled).
   * When enabled, reduces API calls by only sending updates after user stops typing.
   */
  @Prop() debounceMs: number = 0;

  /**
   * Show save button for explicit updates (editable mode only).
   * When true, changes are not sent until user clicks save.
   */
  @Prop() showSaveButton: boolean = false;

  /** Connection state for readonly mode */
  @Prop({ mutable: true }) connected: boolean = true;

  /** Component state */

  /** Internal state for tracking if component is initialized */
  private isInitialized: boolean = false;

  /** Flag to prevent various event loops when setting values programmatically */
  @State() private suppressEvents: boolean = false;

  /** Operation status for unified status indicators */
  @State() operationStatus: OperationStatus = 'idle';

  /** Last error message (if any) */
  @State() lastError?: string;

  /** Timestamp of last value update for showLastUpdated feature */
  @State() lastUpdatedTs?: number;

  /** Auto-updating timer for relative timestamps */
  @State() private timestampUpdateTimer?: number;

  /** Counter to trigger re-renders for timestamp updates - using state change to force re-render */
  @State() private timestampCounter: number = 0;

  /** Temporary value for debounced editing */
  @State() private tempValue: string = '';

  /** Flag to track if there are unsaved changes */
  @State() private hasUnsavedChanges: boolean = false;

  /** Stored write operation for user interaction */
  private storedWriteOperation?: (value: string) => Promise<any>;

  /** Debounce timer reference */
  private debounceTimer?: number;

  /** ResizeObserver for dynamic line calculation */
  private resizeObserver?: ResizeObserver;

  /** Reference to the container element for dynamic sizing */
  private containerRef?: HTMLElement;

  /** Helper method to update value and timestamps consistently */
  private updateValue(value: string, prevValue?: string, emitEvent: boolean = true): void {
    this.value = value;
    this.lastUpdatedTs = Date.now();

    if (emitEvent && !this.suppressEvents) {
      this.emitValueMsg(value, prevValue);
    }
  }

  /** Component events */

  /**
   * Event emitted when the text value changes (editable mode only).
   *
   * @example
   * ```javascript
   * textDisplay.addEventListener('valueMsg', (event) => {
   *   // event.detail contains:
   *   // - newVal: new value (string)
   *   // - prevVal: previous value
   *   // - source: component id
   *   // - ts: timestamp
   *
   *   console.log('New value:', event.detail.newVal);
   *
   *   // Example: Send to server
   *   fetch('/api/text', {
   *     method: 'POST',
   *     body: JSON.stringify({ text: event.detail.payload })
   *   });
   * });
   * ```
   */
  @Event() valueMsg: EventEmitter<UiMsg<string>>;

  /** Watchers */

  @Watch('value')
  watchValue(newVal: string, oldVal: string) {
    if (!this.isInitialized) return;
    if (newVal !== oldVal && !this.suppressEvents) {
      this.emitValueMsg(newVal, oldVal);
    }
  }

  /** Public methods */

  /**
   * Set the text value and handle optional operations and status management.
   *
   * @param value - The string value to set
   * @param options - Configuration options for the operation
   * @returns Promise<boolean> - true if successful, false if failed
   *
   * @example
   * ```javascript
   * // Basic usage
   * await textDisplay.setValue('New text content');
   *
   * // With external operation
   * await textDisplay.setValue('Updated text', {
   *   writeOperation: async () => {
   *     const response = await fetch('/api/text', {
   *       method: 'POST',
   *       body: JSON.stringify({ text: 'Updated text' })
   *     });
   *   },
   *   optimistic: true
   * });
   * ```
   */
  @Method()
  async setValue(
    value: string,
    options?: {
      writeOperation?: (value: string) => Promise<any>;
      readOperation?: () => Promise<any>;
      optimistic?: boolean;
      autoRetry?: { attempts: number; delay: number };
      _isRevert?: boolean;
    },
  ): Promise<boolean> {
    const prevValue = this.value;

    // Clear error state on new attempts
    if (this.operationStatus === 'error' && !options?._isRevert) {
      StatusIndicator.applyStatus(this, 'idle');
    }

    // SIMPLE CASE: Just set value without operations
    if (!options?.writeOperation && !options?.readOperation) {
      this.updateValue(value, prevValue);
      return true;
    }

    // SETUP CASE: Store writeOperation for user interaction
    if (options.writeOperation && !options._isRevert) {
      this.storedWriteOperation = options.writeOperation;
      this.updateValue(value, prevValue, false); // No event for setup
      return true;
    }

    // EXECUTION CASE: Execute operations immediately (internal calls)
    return this.executeOperation(value, prevValue, options);
  }

  /** Simplified operation execution */
  private async executeOperation(value: string, prevValue: string, options: any): Promise<boolean> {
    const optimistic = options?.optimistic !== false;

    // Optimistic update
    if (optimistic && !options?._isRevert) {
      this.updateValue(value, prevValue);
    }

    StatusIndicator.applyStatus(this, 'loading');

    try {
      // Execute the operation
      if (options.writeOperation) {
        await options.writeOperation(value);
      } else if (options.readOperation) {
        await options.readOperation();
      }

      // Success
      StatusIndicator.applyStatus(this, 'success');

      // Non-optimistic update
      if (!optimistic) {
        this.updateValue(value, prevValue);
      }

      return true;
    } catch (error) {
      // Error handling
      StatusIndicator.applyStatus(this, 'error', error?.message || String(error) || 'Operation failed');

      // Revert optimistic changes
      if (optimistic && !options?._isRevert) {
        this.updateValue(prevValue, value, false);
      }

      // Auto-retry
      if (options?.autoRetry && options.autoRetry.attempts > 0) {
        setTimeout(() => {
          this.setValue(value, {
            ...options,
            autoRetry: { ...options.autoRetry, attempts: options.autoRetry.attempts - 1 },
          });
        }, options.autoRetry.delay);
      }

      return false;
    }
  }

  /**
   * Get the current text value with optional metadata.
   *
   * @param includeMetadata - Whether to include additional metadata (default: false)
   * @returns Promise<string | MetadataResult> - Current value or object with metadata
   *
   * @example
   * ```javascript
   * // Basic usage
   * const text = await textDisplay.getValue();
   * console.log('Current text:', text);
   *
   * // With metadata
   * const result = await textDisplay.getValue(true);
   * console.log('Value:', result.value);
   * console.log('Last updated:', new Date(result.lastUpdated));
   * console.log('Status:', result.status);
   * ```
   */
  @Method()
  async getValue(includeMetadata: boolean = false): Promise<string | { value: string; lastUpdated?: number; status: string; error?: string }> {
    if (includeMetadata) {
      return {
        value: this.value,
        lastUpdated: this.lastUpdatedTs,
        status: this.operationStatus,
        error: this.lastError,
      };
    }
    return this.value;
  }

  /**
   * Set value without triggering events (for external updates).
   * Use this method when updating from external data sources to prevent event loops.
   *
   * @param value - The string value to set silently
   * @returns Promise<void>
   *
   * @example
   * ```javascript
   * // Basic silent update
   * await textDisplay.setValueSilent('Updated from server');
   *
   * // In real-time context (WebSocket)
   * websocket.onmessage = async (event) => {
   *   const data = JSON.parse(event.data);
   *   await textDisplay.setValueSilent(data.text);
   * };
   * ```
   */
  @Method()
  async setValueSilent(value: string): Promise<void> {
    this.updateValue(value, this.value, false); // Use helper with emitEvent=false
  }

  /**
   * Set operation status for external status management.
   * Use this method to manually control the visual status indicators
   * when managing operations externally.
   *
   * @param status - The status to set ('idle', 'loading', 'success', 'error')
   * @param errorMessage - Optional error message for error status
   * @returns Promise<void>
   *
   * @example
   * ```javascript
   * const textDisplay = document.querySelector('ui-text');
   *
   * // Show loading indicator
   * await textDisplay.setStatus('loading');
   *
   * try {
   *   await saveToServer();
   *   await textDisplay.setStatus('success');
   * } catch (error) {
   *   await textDisplay.setStatus('error', error.message);
   * }
   *
   * // Clear status indicator
   * await textDisplay.setStatus('idle');
   * ```
   */
  @Method()
  async setStatus(status: 'idle' | 'loading' | 'success' | 'error', errorMessage?: string): Promise<void> {
    StatusIndicator.applyStatus(this, status, errorMessage);
  }

  /**
   * Focus the input element (editable mode only).
   */
  @Method()
  async focusInput(): Promise<void> {
    const input = this.el.shadowRoot?.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement;
    if (input) {
      input.focus();
    }
  }

  /** Lifecycle methods */

  componentWillLoad() {
    this.isInitialized = true;
    this.tempValue = this.value;
    if (this.showLastUpdated) this.startTimestampUpdater();
  }

  componentDidLoad() {
    this.setupResizeObserver();
  }

  disconnectedCallback() {
    this.stopTimestampUpdater();
    this.cleanupDebounceTimer();
    this.cleanupResizeObserver();
  }

  /** Private methods */

  /** Event handling */
  private emitValueMsg(value: string, prevValue?: string) {
    if (this.suppressEvents) return;
    this.valueMsg.emit({
      newVal: value,
      prevVal: prevValue,
      ts: Date.now(),
      source: this.el?.id || 'ui-text',
      ok: true,
    });
  }

  /** Timestamp management */
  private startTimestampUpdater() {
    this.stopTimestampUpdater();
    this.timestampUpdateTimer = window.setInterval(() => this.timestampCounter++, 60000);
  }

  private stopTimestampUpdater() {
    if (this.timestampUpdateTimer) {
      clearInterval(this.timestampUpdateTimer);
      this.timestampUpdateTimer = undefined;
    }
  }

  /** Dynamic line calculation based on container size */
  private calculateDynamicLines(): number {
    if (!this.containerRef) return this.minRows;

    const containerHeight = this.containerRef.clientHeight;
    const lineHeight = 24; // ~1.5rem in pixels
    const padding = 24; // Top and bottom padding
    const availableHeight = Math.max(containerHeight - padding, lineHeight);
    const calculatedLines = Math.floor(availableHeight / lineHeight);

    return Math.max(this.minRows, Math.min(calculatedLines, this.maxRows));
  }

  /** Setup ResizeObserver for dynamic line calculation */
  private setupResizeObserver() {
    if (!window.ResizeObserver || this.mode !== 'area') return;

    this.resizeObserver = new ResizeObserver(() => {
      // Force re-render by updating a state variable
      this.timestampCounter = Date.now();
    });

    if (this.containerRef) {
      this.resizeObserver.observe(this.containerRef);
    }
  }

  /** Cleanup ResizeObserver */
  private cleanupResizeObserver() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }
  }

  /** Debounce helper methods */
  private cleanupDebounceTimer() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }

  private debouncedUpdate(value: string) {
    this.cleanupDebounceTimer();

    this.debounceTimer = window.setTimeout(() => {
      this.handleValueUpdate(value);
    }, this.debounceMs);
  }

  private async handleValueUpdate(value: string) {
    const prevValue = this.value;

    // Execute stored writeOperation if available
    if (this.storedWriteOperation) {
      StatusIndicator.applyStatus(this, 'loading');
      this.updateValue(value); // Optimistic update

      try {
        await this.storedWriteOperation(value);
        StatusIndicator.applyStatus(this, 'success');
        this.hasUnsavedChanges = false;
      } catch (error) {
        console.error('Write operation failed:', error);
        StatusIndicator.applyStatus(this, 'error', error?.message || 'Operation failed');
        this.updateValue(prevValue!, value, false); // Revert, no event
      }
    } else {
      // Simple value update without operations
      this.updateValue(value);
      this.hasUnsavedChanges = false;

      if (this.showStatus) {
        StatusIndicator.applyStatus(this, 'loading');
        setTimeout(() => StatusIndicator.applyStatus(this, 'success'), 100);
      }
    }
  }

  private handleChange = async (event: Event): Promise<void> => {
    if (this.mode !== 'editable' || this.readonly || this.disabled) return;

    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const newValue = target.value;

    // Update temp value immediately for UI responsiveness
    this.tempValue = newValue;
    this.hasUnsavedChanges = this.value !== newValue;

    // Handle save button mode - don't auto-save
    if (this.showSaveButton) {
      return;
    }

    // Handle debounced updates
    if (this.debounceMs > 0) {
      this.debouncedUpdate(newValue);
      return;
    }

    // Immediate update (original behavior)
    await this.handleValueUpdate(newValue);
  };

  /** Handle save button click */
  private handleSave = async (): Promise<void> => {
    if (!this.hasUnsavedChanges) return;
    await this.handleValueUpdate(this.tempValue);
  };

  private handleFocus = (): void => {
    // Focus handler - can be used for styling
  };

  private handleBlur = (): void => {
    // Blur handler - can be used for styling
  };

  /** Render status badge */
  private renderStatusBadge() {
    if (!this.showStatus || this.operationStatus === 'idle') return null;
    return StatusIndicator.renderStatusBadge(this.operationStatus, this.lastError || '', h);
  }

  /** Render last updated timestamp */
  private renderLastUpdated() {
    if (!this.showLastUpdated) return null;

    // render an invisible placeholder when lastUpdatedTs is missing.
    const lastUpdatedDate = this.lastUpdatedTs ? new Date(this.lastUpdatedTs) : null;
    return StatusIndicator.renderTimestamp(lastUpdatedDate, this.dark ? 'dark' : 'light', h);
  }

  /** Styling helpers */
  private getBaseClasses(): string {
    // Use inline-block for area+resizable so horizontal resize can change width
    const widthClass = this.mode === 'area' && this.resizable ? 'inline-block' : 'w-full';
    let classes = `relative ${widthClass} transition-all duration-200 font-sans`;

    // Variant-specific styling with CSS variables
    switch (this.variant) {
      case 'minimal':
        if (this.dark) {
          classes += ' border-b-2 border-gray-500 bg-transparent';
        } else {
          classes += ' border-b-2 border-gray-300 bg-transparent';
        }
        break;
      case 'outlined':
        if (this.dark) {
          classes += ' border-2 border-gray-600 bg-gray-800 text-white hover:border-gray-500';
        } else {
          classes += ' border-2 border-gray-300 bg-white text-gray-900 hover:border-gray-400';
        }
        break;
      case 'filled':
        if (this.dark) {
          classes += ' bg-gray-700 text-white border-2 border-gray-600';
        } else {
          classes += ' bg-gray-100 text-gray-900 border-2 border-gray-200';
        }
        break;
    }

    // Mode-specific styling with distinct visual differences
    switch (this.mode) {
      case 'field':
        classes += ' rounded-md px-3 py-2 min-h-10';
        break;
      case 'area':
        classes += ' rounded-lg px-4 py-3 min-h-24';
        break;
      case 'structured':
        classes += ' rounded-lg px-4 py-3 font-mono text-sm';
        // Gentle code-like background (non-important so color prop can override border)
        classes += this.dark ? ' bg-gray-900 border-gray-500' : ' bg-gray-50 border-gray-300';
        break;
      case 'unstructured':
        classes += ' rounded px-3 py-2 min-h-16';
        // Simpler styling for unstructured (non-important)
        classes += this.dark ? ' bg-transparent border-gray-700' : ' bg-transparent border-gray-200';
        break;
      case 'editable':
        classes += ' rounded-md px-3 py-2 min-h-10 cursor-text';
        break;
    }

    if (this.disabled) {
      classes += ' opacity-50 cursor-not-allowed';
    }

    return classes;
  }

  // Removed getActiveColor (no longer used after moving to static Tailwind tokens)

  /** Resolve color tokens from global CSS variables */
  private getColorTokens() {
    const map: Record<string, { base: string; light: string }> = {
      primary: { base: 'var(--color-primary)', light: 'var(--color-primary-light)' },
      secondary: { base: 'var(--color-secondary)', light: 'var(--color-secondary-light)' },
      neutral: { base: 'var(--color-neutral)', light: 'var(--color-neutral-light)' },
    };
    return map[this.color] || map.primary;
  }

  private getInputClasses(): string {
    let classes = 'w-full bg-transparent border-0 outline-none resize-none';

    if (this.mode === 'structured') {
      classes += ' font-mono text-sm';
    }

    if (this.disabled) {
      classes += ' cursor-not-allowed';
    }

    return classes;
  }

  private renderWithLineNumbers(content: string, isMonospace: boolean = false): any {
    if (!this.showLineNumbers) {
      return content;
    }

    const lines = content.split('\n');
    const lineNumberWidth = Math.max(2, String(lines.length).length);
    const lineHeight = '1.5';
    const numberFontClasses = isMonospace ? 'font-mono' : '';
    const contentFontClasses = isMonospace ? 'font-mono text-sm' : '';

    return (
      <div class="flex" style={{ lineHeight }}>
        {/* Line numbers column */}
        <div class={`select-none border-r border-gray-300 pr-2 mr-3 ${numberFontClasses} ${this.dark ? 'text-gray-400 border-gray-600' : 'text-gray-500'}`} style={{ lineHeight }}>
          {lines.map((_, index) => (
            <div key={index} class="text-right" style={{ minWidth: `${lineNumberWidth}ch` }}>
              {index + 1}
            </div>
          ))}
        </div>
        {/* Content column */}
        <div class={`flex-1 ${contentFontClasses}`} style={{ whiteSpace: 'pre-wrap', lineHeight }}>
          {lines.map((line, index) => (
            <div key={index}>
              {line || '\u00A0'} {/* Non-breaking space for empty lines */}
            </div>
          ))}
        </div>
      </div>
    );
  }

  private renderContent(): any {
    const inputClasses = this.getInputClasses();
    const dynamicRows = this.mode === 'area' ? this.calculateDynamicLines() : this.minRows;
    const currentValue = this.showSaveButton ? this.tempValue : this.value;

    // For editable mode, determine if we need single line or multi-line
    if (this.mode === 'editable') {
      const isMultiline = currentValue.includes('\n') || currentValue.length > 60;

      if (isMultiline) {
        return (
          <textarea
            class={inputClasses}
            value={currentValue}
            placeholder={this.placeholder}
            disabled={this.disabled || this.readonly}
            onInput={this.handleChange}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
            rows={dynamicRows}
            maxLength={this.maxLength}
            style={{
              height: '100%',
            }}
          ></textarea>
        );
      } else {
        return (
          <input
            type="text"
            class={inputClasses}
            value={currentValue}
            placeholder={this.placeholder}
            disabled={this.disabled || this.readonly}
            onInput={this.handleChange}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
            maxLength={this.maxLength}
          />
        );
      }
    }

    // For display-only modes
    switch (this.mode) {
      case 'field':
        return <span class="block">{this.value || this.placeholder}</span>;

      case 'area':
        return (
          <div class="whitespace-pre-wrap break-words" style={{ height: '100%' }}>
            {this.showLineNumbers ? this.renderWithLineNumbers(this.value || this.placeholder || '') : this.value || this.placeholder}
          </div>
        );

      case 'structured':
        if (this.showLineNumbers) {
          return <pre class="whitespace-pre-wrap break-words font-mono text-sm m-0">{this.renderWithLineNumbers(this.value || this.placeholder || '', true)}</pre>;
        }
        return <pre class="whitespace-pre-wrap break-words font-mono text-sm m-0">{this.value || this.placeholder}</pre>;

      case 'unstructured':
      default:
        return <div class="whitespace-pre-wrap break-words">{this.value || this.placeholder}</div>;
    }
  }

  render() {
    const baseClasses = this.getBaseClasses();
    // Apply resizable behavior to the bordered container so the whole box (including border) resizes
    const containerStyle: any = {};
    if (this.mode === 'area' && this.resizable) {
      containerStyle.resize = 'both';
      containerStyle.overflow = 'auto';
      containerStyle.minHeight = `${this.minRows * 1.5}rem`;
      containerStyle.maxHeight = `${this.maxRows * 1.5}rem`;
      containerStyle.minWidth = '240px';
      containerStyle.maxWidth = '100%';
    }

    // Apply color tokens to border/background based on variant
    const { base, light } = this.getColorTokens();
    // Expose a CSS variable for focus styles
    (containerStyle as any)['--ui-accent'] = base;
    if (this.variant === 'outlined' || this.variant === 'minimal') {
      containerStyle.borderColor = base;
    } else if (this.variant === 'filled') {
      containerStyle.backgroundColor = light;
      containerStyle.borderColor = base;
    }

    return (
      <div class="w-full">
        {/* Label */}
        {this.label && <label class={`block text-sm font-medium mb-2 ${this.dark ? 'text-gray-200' : 'text-gray-700'}`}>{this.label}</label>}

        {/* Main container with status badge positioning similar to ui-toggle */}
        <div class="relative inline-flex items-center w-full">
          <div class={`ui-text-container ${baseClasses}`} style={containerStyle} ref={el => (this.containerRef = el)}>
            {this.renderContent()}
          </div>

          {/* Status badge - positioned to the right center after the text border, similar to other components */}
          <div class="ml-2 flex-shrink-0">{this.renderStatusBadge()}</div>
        </div>

        {/* Save button for explicit save mode */}
        {this.mode === 'editable' && this.showSaveButton && (
          <div class="mt-2 flex gap-2">
            <button
              class="px-3 py-1 text-sm rounded transition-colors border"
              style={{
                backgroundColor: this.hasUnsavedChanges ? 'var(--color-primary)' : 'transparent',
                color: this.hasUnsavedChanges ? 'var(--color-primary-contrast, #fff)' : 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                cursor: this.hasUnsavedChanges ? 'pointer' : 'not-allowed',
                opacity: this.hasUnsavedChanges ? '1' : '0.6',
              }}
              disabled={!this.hasUnsavedChanges}
              onClick={this.handleSave}
            >
              Save
            </button>
            {this.hasUnsavedChanges && <span class="text-xs text-orange-500 self-center">Unsaved changes</span>}
          </div>
        )}

        {/* Character count */}
        {this.mode === 'editable' && this.showCharCount && (
          <div class={`text-xs mt-1 text-right ${this.dark ? 'text-gray-400' : 'text-gray-500'}`}>
            {(this.showSaveButton ? this.tempValue : this.value).length}
            {this.maxLength && ` / ${this.maxLength}`}
          </div>
        )}

        {/* Last updated timestamp */}
        {this.renderLastUpdated()}

        {/* Error message */}
        {this.lastError && <div class="text-xs mt-1 text-red-500">{this.lastError}</div>}
      </div>
    );
  }
}
