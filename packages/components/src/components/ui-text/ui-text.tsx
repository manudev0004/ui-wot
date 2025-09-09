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
   */
  @Prop() keyboard: boolean = true;

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
      /** Automatic write operation - component handles all status transitions */
      writeOperation?: () => Promise<any>;
      /** Apply change optimistically, revert on failure (default: true) */
      optimistic?: boolean;
      /** Auto-retry configuration for failed operations */
      autoRetry?: {
        attempts: number;
        delay: number;
      };
      /** Manual status override (for advanced uses) */
      customStatus?: 'loading' | 'success' | 'error';
      /** Error message for manual error status */
      errorMessage?: string;
      /** Internal flag to indicate this is a revert operation */
      _isRevert?: boolean;
    },
  ): Promise<boolean> {
    const prevValue = this.value;

    // Handle manual status override (backward compatibility)
    if (options?.customStatus) {
      if (options.customStatus === 'loading') {
        this.operationStatus = 'loading';
        return true;
      }
      if (options.customStatus === 'success') {
        this.operationStatus = 'success';
        setTimeout(() => {
          if (this.operationStatus === 'success') this.operationStatus = 'idle';
        }, 1200);
        this.value = value;
        this.lastUpdatedTs = Date.now();
        this.emitValueMsg(value, prevValue);
        return true;
      }
      if (options.customStatus === 'error') {
        this.operationStatus = 'error';
        this.lastError = options.errorMessage || 'Operation failed';
        return false;
      }
    }

    // Auto-clear error state when user tries again (unless this is a revert)
    if (this.operationStatus === 'error' && !options?._isRevert) {
      this.operationStatus = 'idle';
      this.lastError = undefined;
    }

    // Optimistic update (default: true)
    const optimistic = options?.optimistic !== false;
    if (optimistic && !options?._isRevert) {
      this.value = value;
      this.lastUpdatedTs = Date.now();
      this.emitValueMsg(value, prevValue);
    }

    // Handle Promise-based operations
    if (options?.writeOperation) {
      // Show loading state
      this.operationStatus = 'loading';

      try {
        await options.writeOperation();

        // Success - show success state and update value if not optimistic
        this.operationStatus = 'success';
        setTimeout(() => {
          if (this.operationStatus === 'success') this.operationStatus = 'idle';
        }, 1200);

        // If not optimistic, apply value now
        if (!optimistic) {
          this.value = value;
          this.lastUpdatedTs = Date.now();
          this.emitValueMsg(value, prevValue);
        }

        return true;
      } catch (error) {
        // Error - show error state and revert if optimistic
        this.operationStatus = 'error';
        this.lastError = error?.message || String(error) || 'Operation failed';

        if (optimistic && !options?._isRevert) {
          // Revert to previous value
          this.value = prevValue;
        }

        // Auto-retry logic
        if (options?.autoRetry && options.autoRetry.attempts > 0) {
          setTimeout(async () => {
            const retryOptions = {
              ...options,
              autoRetry: {
                attempts: options.autoRetry.attempts - 1,
                delay: options.autoRetry.delay,
              },
            };
            await this.setValue(value, retryOptions);
          }, options.autoRetry.delay);
        }

        return false;
      }
    }

    // Simple value setting (no operation)
    if (!options?.writeOperation) {
      this.value = value;
      this.lastUpdatedTs = Date.now();
      this.emitValueMsg(value, prevValue);
    }

    return true;
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
    this.suppressEvents = true;
    this.value = value;
    this.lastUpdatedTs = Date.now();
    this.suppressEvents = false;
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
    if (this.showLastUpdated) this.startTimestampUpdater();
  }

  disconnectedCallback() {
    this.stopTimestampUpdater();
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

  private handleChange = (event: Event): void => {
    if (this.mode !== 'editable' || this.readonly || this.disabled) return;

    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.setValue(target.value);
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
    return StatusIndicator.renderStatusBadge(this.operationStatus, this.dark ? 'dark' : 'light', this.lastError || '', h);
  }

  /** Render last updated timestamp */
  private renderLastUpdated() {
    if (!this.showLastUpdated || !this.lastUpdatedTs) return null;
    
    const theme = this.dark ? 'dark' : 'light';
    
    return StatusIndicator.renderTimestamp(new Date(this.lastUpdatedTs), theme, h);
  }

  /** Styling helpers */
  private getBaseClasses(): string {
    let classes = 'relative w-full transition-all duration-200 font-sans';

    // Variant-specific styling
    switch (this.variant) {
      case 'minimal':
        if (this.dark) {
          classes += ' border-b-2 border-gray-500 bg-transparent focus-within:border-blue-400';
        } else {
          classes += ' border-b-2 border-gray-300 bg-transparent focus-within:border-blue-500';
        }
        break;
      case 'outlined':
        if (this.dark) {
          classes += ' border-2 border-gray-600 bg-gray-800 text-white focus-within:border-blue-400 hover:border-gray-500';
        } else {
          classes += ' border-2 border-gray-300 bg-white text-gray-900 focus-within:border-blue-500 hover:border-gray-400';
        }
        break;
      case 'filled':
        if (this.dark) {
          classes += ' bg-gray-700 text-white border-2 border-gray-600 focus-within:border-blue-400';
        } else {
          classes += ' bg-gray-100 text-gray-900 border-2 border-gray-200 focus-within:border-blue-500';
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
        // Override background for structured mode to show it's code-like
        if (this.dark) {
          classes += ' !bg-gray-900 !border-gray-500';
        } else {
          classes += ' !bg-gray-50 !border-gray-400';
        }
        break;
      case 'unstructured':
        classes += ' rounded px-3 py-2 min-h-16';
        // Simpler styling for unstructured
        if (this.dark) {
          classes += ' !bg-transparent !border-gray-700';
        } else {
          classes += ' !bg-transparent !border-gray-200';
        }
        break;
      case 'editable':
        classes += ' rounded-md px-3 py-2 min-h-10 cursor-text';
        // Add focus ring for editable
        classes += ' focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-50';
        break;
    }

    if (this.disabled) {
      classes += ' opacity-50 cursor-not-allowed';
    }

    return classes;
  }

  private getInputClasses(): string {
    let classes = 'w-full bg-transparent border-0 outline-none resize-none font-inherit';
    
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
    
    return (
      <div class="flex">
        {/* Line numbers column */}
        <div class={`select-none border-r border-gray-300 pr-2 mr-3 text-xs ${isMonospace ? 'font-mono' : ''} ${this.dark ? 'text-gray-400 border-gray-600' : 'text-gray-500'}`}>
          {lines.map((_, index) => (
            <div key={index} class="text-right" style={{ minWidth: `${lineNumberWidth}ch` }}>
              {index + 1}
            </div>
          ))}
        </div>
        {/* Content column */}
        <div class="flex-1">
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

    // For editable mode, determine if we need single line or multi-line
    if (this.mode === 'editable') {
      const isMultiline = this.value.includes('\n') || (this.value.length > 60);
      
      if (isMultiline) {
        return (
          <textarea
            class={inputClasses}
            value={this.value}
            placeholder={this.placeholder}
            disabled={this.disabled || this.readonly}
            onInput={this.handleChange}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
            rows={this.minRows}
            maxLength={this.maxLength}
            style={{ minHeight: `${this.minRows * 1.5}rem`, maxHeight: `${this.maxRows * 1.5}rem` }}
          ></textarea>
        );
      } else {
        return (
          <input
            type="text"
            class={inputClasses}
            value={this.value}
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
        if (this.showLineNumbers) {
          return (
            <div class="whitespace-pre-wrap break-words">
              {this.renderWithLineNumbers(this.value || this.placeholder || '')}
            </div>
          );
        }
        return (
          <div class="whitespace-pre-wrap break-words">
            {this.value || this.placeholder}
          </div>
        );

      case 'structured':
        if (this.showLineNumbers) {
          return (
            <pre class="whitespace-pre-wrap break-words font-mono text-sm m-0">
              {this.renderWithLineNumbers(this.value || this.placeholder || '', true)}
            </pre>
          );
        }
        return (
          <pre class="whitespace-pre-wrap break-words font-mono text-sm m-0">
            {this.value || this.placeholder}
          </pre>
        );

      case 'unstructured':
      default:
        return (
          <div class="whitespace-pre-wrap break-words">
            {this.value || this.placeholder}
          </div>
        );
    }
  }

  render() {
    const baseClasses = this.getBaseClasses();

    return (
      <div class="w-full">
        {/* Label */}
        {this.label && (
          <label class={`block text-sm font-medium mb-2 ${this.dark ? 'text-gray-200' : 'text-gray-700'}`}>
            {this.label}
          </label>
        )}

        {/* Main container with status badge positioning similar to ui-toggle */}
        <div class="relative inline-flex items-center">
          <div class={baseClasses}>
            {this.renderContent()}
          </div>

          {/* Status badge - positioned to the right center after the text border, similar to other components */}
          <div class="ml-2 flex-shrink-0">
            {this.renderStatusBadge()}
          </div>
        </div>

        {/* Character count */}
        {this.mode === 'editable' && this.showCharCount && (
          <div class={`text-xs mt-1 text-right ${this.dark ? 'text-gray-400' : 'text-gray-500'}`}>
            {this.value.length}
            {this.maxLength && ` / ${this.maxLength}`}
          </div>
        )}

        {/* Last updated timestamp */}
        {this.renderLastUpdated()}

        {/* Error message */}
        {this.lastError && (
          <div class="text-xs mt-1 text-red-500">
            {this.lastError}
          </div>
        )}
      </div>
    );
  }
}
