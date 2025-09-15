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

  // disabled/readonly removed per simplification

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

  /** Reference to rendered content block for measuring wrapped lines */
  private contentRef?: HTMLElement;

  /** Inner content measurer (used when line numbers are shown) */
  private contentMeasureRef?: HTMLElement;

  /** Rendered line count after wrapping (for line numbers) */
  @State() private renderedLineCount: number = 0;

  /** Fold state for structured JSON (paths of folded nodes) */
  private foldedPaths: Set<string> = new Set();
  @State() private foldingTick: number = 0;

  /** Structured mode expand/collapse */
  // replaced with per-node folding

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
    // Recompute rendered line count on value changes
    this.scheduleLineCountUpdate();
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
    // Initial line count after first render
    this.scheduleLineCountUpdate();
    // Recalculate on window resize as container width may change
    window.addEventListener('resize', this.handleWindowResize, { passive: true });
  }

  disconnectedCallback() {
    this.stopTimestampUpdater();
    this.cleanupDebounceTimer();
    this.cleanupResizeObserver();
    window.removeEventListener('resize', this.handleWindowResize as any);
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

  /** Dynamic line calculation based on container size (rows for textarea/area) */
  private calculateDynamicLines(): number {
    if (!this.containerRef) return this.minRows;

    const containerHeight = this.containerRef.clientHeight;
    const lineHeight = 24; // ~1.5rem in pixels
    const padding = 24; // Top and bottom padding
    const availableHeight = Math.max(containerHeight - padding, lineHeight);
    const calculatedLines = Math.floor(availableHeight / lineHeight);

    return Math.max(this.minRows, Math.min(calculatedLines, this.maxRows));
  }

  /** Compute number of visually rendered lines based on content element height and line-height */
  private updateRenderedLineCount(): void {
    const el = (this.contentMeasureRef as HTMLElement) || (this.contentRef as HTMLElement) || undefined;
    if (!el) return;

    const cs = window.getComputedStyle(el);
    const fontSize = parseFloat(cs.fontSize || '16');
    let lineHeight = parseFloat(cs.lineHeight || '0');
    if (!lineHeight || Number.isNaN(lineHeight)) {
      // Fallback for 'normal'
      lineHeight = 1.5 * (fontSize || 16);
    }

    const height = el.scrollHeight || el.clientHeight;
    if (!height || !lineHeight) return;

    const count = Math.max(1, Math.ceil(height / lineHeight));
    if (count !== this.renderedLineCount) {
      this.renderedLineCount = count;
    }
  }

  private _pendingRaf: number = 0;
  private scheduleLineCountUpdate(): void {
    if (this._pendingRaf) return;
    this._pendingRaf = requestAnimationFrame(() => {
      this._pendingRaf = 0;
      this.updateRenderedLineCount();
    });
  }

  private handleWindowResize = (() => {
    let raf = 0;
    return () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        this.updateRenderedLineCount();
      });
    };
  })();

  /** Setup ResizeObserver for dynamic line calculation */
  private setupResizeObserver() {
    if (!window.ResizeObserver) return;

    this.resizeObserver = new ResizeObserver(() => {
      // Recompute visual lines only; avoid forcing extra re-renders
      this.updateRenderedLineCount();
    });

    if (this.containerRef) this.resizeObserver.observe(this.containerRef);
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
    if (this.mode !== 'editable') return;

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

  // Focus/blur handlers removed

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

    return classes;
  }

  private renderWithLineNumbers(content: any, isMonospace: boolean = false, fallbackText?: string): any {
    if (!this.showLineNumbers) return content;

    // Fallback in case measurement not ready
    const basis = typeof content === 'string' ? content : fallbackText || '';
    const fallbackCount = basis ? (basis.match(/\n/g) || []).length + 1 : 1;
    const total = this.renderedLineCount || fallbackCount;
    const numberFontClasses = isMonospace ? 'font-mono' : '';
    const contentFontClasses = isMonospace ? 'font-mono text-sm' : '';

    // Fix width to avoid feedback loop increasing wraps when count grows
    const lineNumberWidth = 4;

    return (
      <div class="flex leading-6">
        {/* Line numbers column */}
        <div
          class={`select-none border-r pr-2 mr-3 ${numberFontClasses} ${this.dark ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-gray-300'}`}
          style={{ width: `${lineNumberWidth}ch` }}
        >
          {Array.from({ length: total }).map((_, idx) => (
            <div key={idx} class="text-right">
              {idx + 1}
            </div>
          ))}
        </div>
        {/* Content column */}
        <div class={`flex-1 ${contentFontClasses}`}>
          <div class="whitespace-pre-wrap break-words" ref={el => (this.contentMeasureRef = el as HTMLElement)}>
            {content}
          </div>
        </div>
      </div>
    );
  }

  /** Folding helpers */
  private isFolded(path: string): boolean {
    return this.foldedPaths.has(path);
  }

  private toggleFold(path: string): void {
    const next = new Set(this.foldedPaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    this.foldedPaths = next;
    this.foldingTick++;
    this.scheduleLineCountUpdate();
  }

  private indentStr(level: number): string {
    return '  '.repeat(Math.max(0, level));
  }

  private span(cls: string, text: string) {
    return <span class={cls}>{text}</span>;
  }

  private fmtKey(key: string) {
    return this.span('text-blue-600 dark:text-blue-400', '"' + key + '"');
  }

  private fmtString(val: string) {
    return this.span('text-green-700 dark:text-green-400', '"' + val + '"');
  }

  private fmtNumber(n: number) {
    return this.span('text-amber-600 dark:text-amber-400', String(n));
  }

  private fmtBoolNull(v: boolean | null) {
    return this.span('text-purple-600 dark:text-purple-400', String(v));
  }

  private renderJsonValue(value: any, path: string, indent: number, isLast: boolean): any {
    const pieces: any[] = [];
    const indentText = this.indentStr(indent);

    const pushLine = (nodes: any[]) => {
      pieces.push(<>{nodes}</>);
      pieces.push('\n');
    };

    const toggle = (folded: boolean) => (
      <button class="inline-block text-xs mr-1 opacity-80 hover:opacity-100 select-none" onClick={() => this.toggleFold(path)} aria-label={folded ? 'Expand' : 'Collapse'}>
        {folded ? '+' : '−'}
      </button>
    );

    if (Array.isArray(value)) {
      const folded = this.isFolded(path);
      if (folded) {
        pushLine([indentText, toggle(true), '[...]', isLast ? '' : ',']);
        return pieces;
      }
      pushLine([indentText, toggle(false), '[']);
      const len = value.length;
      for (let i = 0; i < len; i++) {
        const childPath = path + '[' + i + ']';
        const child = value[i];
        const last = i === len - 1;
        if (typeof child === 'object' && child !== null) {
          pieces.push(this.renderJsonValue(child, childPath, indent + 1, last));
        } else {
          const lineNodes: any[] = [this.indentStr(indent + 1)];
          if (typeof child === 'string') lineNodes.push(this.fmtString(child));
          else if (typeof child === 'number') lineNodes.push(this.fmtNumber(child));
          else if (typeof child === 'boolean') lineNodes.push(this.fmtBoolNull(child));
          else if (child === null) lineNodes.push(this.fmtBoolNull(null));
          else lineNodes.push(String(child));
          lineNodes.push(last ? '' : ',');
          pushLine(lineNodes);
        }
      }
      pushLine([indentText, ']' + (isLast ? '' : ',')]);
      return pieces;
    }

    if (typeof value === 'object' && value !== null) {
      const folded = this.isFolded(path);
      if (folded) {
        pushLine([indentText, toggle(true), '{...}', isLast ? '' : ',']);
        return pieces;
      }
      pushLine([indentText, toggle(false), '{']);
      const entries = Object.entries(value);
      const len = entries.length;
      for (let i = 0; i < len; i++) {
        const [k, v] = entries[i];
        const childPath = path + '.' + k;
        const last = i === len - 1;
        if (typeof v === 'object' && v !== null) {
          // key line with nested structure rendered by recursion
          pieces.push(
            <>
              {this.indentStr(indent + 1)}
              {this.fmtKey(k)}
              {': '}
            </>,
          );
          pieces.push(this.renderJsonValue(v, childPath, indent + 1, last));
        } else {
          const lineNodes: any[] = [this.indentStr(indent + 1), this.fmtKey(k), ': '];
          if (typeof v === 'string') lineNodes.push(this.fmtString(v));
          else if (typeof v === 'number') lineNodes.push(this.fmtNumber(v));
          else if (typeof v === 'boolean') lineNodes.push(this.fmtBoolNull(v));
          else if (v === null) lineNodes.push(this.fmtBoolNull(null));
          else lineNodes.push(String(v));
          lineNodes.push(last ? '' : ',');
          pushLine(lineNodes);
        }
      }
      pushLine([indentText, '}' + (isLast ? '' : ',')]);
      return pieces;
    }

    // primitives
    const lineNodes: any[] = [indentText];
    if (typeof value === 'string') lineNodes.push(this.fmtString(value));
    else if (typeof value === 'number') lineNodes.push(this.fmtNumber(value));
    else if (typeof value === 'boolean') lineNodes.push(this.fmtBoolNull(value));
    else if (value === null) lineNodes.push(this.fmtBoolNull(null));
    else lineNodes.push(String(value));
    lineNodes.push(isLast ? '' : ',');
    pushLine(lineNodes);
    return pieces;
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
            onInput={this.handleChange}
            rows={dynamicRows}
            maxLength={this.maxLength}
            style={{
              height: '100%',
            }}
          ></textarea>
        );
      } else {
        return <input type="text" class={inputClasses} value={currentValue} placeholder={this.placeholder} onInput={this.handleChange} maxLength={this.maxLength} />;
      }
    }

    // For display-only modes
    switch (this.mode) {
      case 'field':
        return <span class="block">{this.value || this.placeholder}</span>;

      case 'area': {
        const contentText = this.value || this.placeholder || '';
        if (this.showLineNumbers) {
          return this.renderWithLineNumbers(contentText, false);
        }
        return (
          <div class="whitespace-pre-wrap break-words leading-6" style={{ height: '100%' }} ref={el => (this.contentRef = el as HTMLElement)}>
            {contentText}
          </div>
        );
      }

      case 'structured': {
        const raw = this.value || this.placeholder || '';
        try {
          const parsed = JSON.parse(raw);
          const prettyText = JSON.stringify(parsed, null, 2);
          const content = (
            <pre class="whitespace-pre-wrap break-words font-mono text-sm m-0 leading-6" ref={el => (this.contentRef = el as HTMLElement)}>
              {this.renderJsonValue(parsed, 'root', 0, true)}
            </pre>
          );
          if (this.showLineNumbers) {
            return this.renderWithLineNumbers(content, true, prettyText);
          }
          return content;
        } catch {
          // Not JSON - fallback to plain text
          if (this.showLineNumbers) return this.renderWithLineNumbers(String(raw), true, String(raw));
          return (
            <pre class="whitespace-pre-wrap break-words font-mono text-sm m-0 leading-6" ref={el => (this.contentRef = el as HTMLElement)}>
              {String(raw)}
            </pre>
          );
        }
      }

      case 'unstructured':
      default: {
        const contentText = this.value || this.placeholder || '';
        if (this.showLineNumbers) {
          return this.renderWithLineNumbers(contentText, false);
        }
        return (
          <div class="whitespace-pre-wrap break-words leading-6" ref={el => (this.contentRef = el as HTMLElement)}>
            {contentText}
          </div>
        );
      }
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
          <div class={`ui-text-container ${baseClasses}`} style={containerStyle} ref={el => (this.containerRef = el)} onTransitionEnd={() => this.scheduleLineCountUpdate()}>
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
