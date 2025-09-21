import { Component, Prop, State, Element, h, Method } from '@stencil/core';
import { StatusIndicator, OperationStatus } from '../../utils/status-indicator';

/**
 * Auto-generates an editor for a TD object-type property and persists the full
 * object on Save. Designed to behave like other UI components with consistent
 * status and last-updated indicators, while sub-fields operate in local-edit mode.
 *
 * Usage: Map boolean/number/integer/string fields to child inputs (ui-toggle,
 * ui-slider, ui-number-picker, ui-text). Child fields do not perform device writes;
 * only the parent Save writes the entire object, avoiding partial updates.
 */

@Component({
  tag: 'ui-object',
  styleUrl: 'ui-object.css',
  shadow: true,
})
export class UiObject {
  @Element() el!: HTMLElement;

  // ============================== COMPONENT PROPERTIES ==============================

  /** Visual style for the editor container */
  @Prop() variant: 'outlined' | 'filled' = 'outlined';
  @Prop() disabled: boolean = false;
  @Prop() readonly: boolean = false;
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';
  @Prop() showLastUpdated: boolean = false;
  @Prop() showStatus: boolean = true;
  /** Enable dark mode theme styling when true */
  @Prop() dark: boolean = false;

  /** Optional label shown above the editor */
  @Prop() label?: string;

  // ============================== COMPONENT STATE ==============================
  @State() private fields: Array<{ name: string; type: string; minimum?: number; maximum?: number }> = [];
  @State() private value: any = {};
  @State() private editing: any = {};
  @State() private operationStatus: OperationStatus = 'idle';
  @State() private lastError = '';
  @State() private lastUpdatedTs?: number;
  /** Internal state counter for timestamp re-rendering */
  @State() private timestampCounter: number = 0;

  // ============================== PRIVATE PROPERTIES ==============================
  /** Stored write operation provided by connector; executed on Save */
  private storedWriteOperation?: (value: any) => Promise<any>;
  private boundElements: WeakSet<Element> = new WeakSet();
  private timestampUpdateTimer?: number;

  // ============================== LIFECYCLE METHODS ==============================
  /** No TD wiring here; connector will call setValue(). */
  async componentWillLoad() {
    if (this.showLastUpdated) this.startTimestampUpdater();
  }

  /** Bind local write-ops once children are rendered */
  componentDidLoad() {
    // Ensure subfields operate in local-edit mode (no device writes per-field)
    this.ensureLocalWriteOps();
  }

  /** Re-bind local write-ops for newly rendered children */
  componentDidRender() {
    // In case fields render later, bind write ops once per element
    this.ensureLocalWriteOps();
  }

  disconnectedCallback() {
    // nothing to cleanup: connector owns observe/poll lifecycles
    this.stopTimestampUpdater();
  }

  // ============================== PUBLIC METHODS ==============================

  /** Set the object value (from connector) and optionally bind device write op. */
  @Method()
  async setValue(
    value: any,
    options?: {
      writeOperation?: (value: any) => Promise<any>;
      readOperation?: () => Promise<any>;
      optimistic?: boolean;
      _isRevert?: boolean;
    },
  ): Promise<boolean> {
    // Clear error on fresh attempt
    if (this.operationStatus === 'error' && !options?._isRevert) {
      StatusIndicator.applyStatus(this as any, 'idle');
    }

    // Bind write operation for Save (setup phase)
    if (options?.writeOperation && !options._isRevert) {
      this.storedWriteOperation = options.writeOperation;
      StatusIndicator.applyStatus(this as any, 'loading');
      try {
        this.updateFromValue(value);
        StatusIndicator.applyStatus(this as any, 'success');
        return true;
      } catch (e: any) {
        StatusIndicator.applyStatus(this as any, 'error', e?.message || 'Setup failed');
        return false;
      }
    }

    // Simple state update
    this.updateFromValue(value);
    return true;
  }

  /** Get current server value or metadata, mirroring other components. */
  @Method()
  async getValue(includeMetadata: boolean = false): Promise<any | { value: any; lastUpdated?: number; status: string; error?: string }> {
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

  /** Silent update from connector (observe/poll) without event emission. */
  @Method()
  async setValueSilent(value: any): Promise<void> {
    this.updateFromValue(value);
  }

  // removed isDirty; updateFromValue computes dirtiness based on previous value

  private onFieldChange = (name: string, newVal: any) => {
    this.editing = { ...this.editing, [name]: newVal };
  };

  @Method()
  async save(): Promise<boolean> {
    if (!this.storedWriteOperation) {
      this.setStatus('error', 'No operation configured - setup may have failed');
      return false;
    }
    try {
      this.setStatus('loading');
      const payload: any = {};
      if (this.fields.length === 0) {
        const source = this.editing && Object.keys(this.editing).length ? this.editing : this.value;
        if (source && typeof source === 'object') {
          for (const k of Object.keys(source)) payload[k] = (source as any)[k];
        }
      } else {
        // Coerce values according to derived field types to avoid server validation errors
        for (const f of this.fields) {
          const raw = (this.editing as any)[f.name];
          if (f.type === 'boolean') payload[f.name] = Boolean(raw);
          else if (f.type === 'integer') payload[f.name] = Number.isFinite(raw) ? Math.round(raw) : parseInt(String(raw), 10);
          else if (f.type === 'number') payload[f.name] = Number(raw);
          else payload[f.name] = typeof raw === 'undefined' || raw === null ? '' : String(raw);
        }
      }
      await this.storedWriteOperation(payload);
      this.value = { ...payload };
      this.setStatus('success');
      this.lastUpdatedTs = Date.now();
      return true;
    } catch (err: any) {
      this.setStatus('error', err?.message || String(err));
      return false;
    }
  }

  private setStatus(status: OperationStatus, message?: string) {
    StatusIndicator.applyStatus(this as any, status, message);
  }

  /** Merge inbound value and derive fields; if not dirty, sync editing */
  private updateFromValue(value: any) {
    const v = value && typeof value === 'object' ? value : {};
    const prev = this.value;
    const wasDirty = (() => {
      try {
        return JSON.stringify(prev) !== JSON.stringify(this.editing);
      } catch {
        return true;
      }
    })();
    this.value = v;
    // Derive fields from current value shape and JS types
    this.fields = Object.keys(v).map(name => {
      const t = typeof v[name];
      let type: string = t;
      if (t === 'number' && Number.isInteger(v[name])) type = 'integer';
      if (t === 'object') type = 'string'; // fallback to text for nested/unknown types
      return { name, type };
    });
    // If user hasn't edited (not dirty relative to previous value), sync editing to new value
    if (!wasDirty) this.editing = { ...v };
    this.lastUpdatedTs = Date.now();
    this.startTimestampUpdater();
  }

  // Bind a no-op writeOperation to child inputs so they don't error on interaction
  private async ensureLocalWriteOps() {
    const root = this.el.shadowRoot;
    if (!root) return;
    const elems = root.querySelectorAll('ui-toggle, ui-slider, ui-number-picker, ui-text');
    const tasks: Promise<any>[] = [];
    elems.forEach((el: any) => {
      if (this.boundElements.has(el)) return;
      this.boundElements.add(el);
      const tag = (el.tagName || '').toLowerCase();
      const noop = async () => {};
      try {
        if (tag === 'ui-toggle') {
          tasks.push(el.setValue(Boolean(el.value), { writeOperation: noop }));
        } else if (tag === 'ui-slider') {
          const v = typeof el.value === 'number' ? el.value : Number(el.value) || 0;
          tasks.push(el.setValue(v, { writeOperation: noop }));
        } else if (tag === 'ui-number-picker') {
          const v = typeof el.value === 'number' ? el.value : Number(el.value) || 0;
          tasks.push(el.setValue(v, { writeOperation: noop }));
        } else if (tag === 'ui-text') {
          tasks.push(el.setValue(String(el.value ?? ''), { writeOperation: noop }));
        }
      } catch {
        // ignore binding errors
      }
    });
    if (tasks.length) await Promise.allSettled(tasks);
  }

  /** Manages timestamp update timer for relative time display */
  private startTimestampUpdater() {
    this.stopTimestampUpdater();
    if (this.showLastUpdated) {
      this.timestampUpdateTimer = window.setInterval(() => this.timestampCounter++, 60000); //  Update every minute
    }
  }

  /** Stops the timestamp update timer */
  private stopTimestampUpdater() {
    if (this.timestampUpdateTimer) {
      clearInterval(this.timestampUpdateTimer);
      this.timestampUpdateTimer = undefined;
    }
  }

  /** Render a single sub-field using appropriate child component */
  private renderField(f: { name: string; type: string; minimum?: number; maximum?: number }) {
    const val = this.editing?.[f.name];
    const common = {
      'show-last-updated': false,
      'show-status': false,
      'disabled': this.disabled,
      'readonly': this.readonly,
      'color': this.color,
      'dark': this.dark,
    } as any;

    if (f.type === 'boolean') {
      return <ui-toggle {...common} value={!!val} onValueMsg={(e: CustomEvent<any>) => this.onFieldChange(f.name, e.detail?.newVal)} />;
    }

    if (f.type === 'integer') {
      const min = typeof f.minimum === 'number' ? f.minimum : 0;
      const max = typeof f.maximum === 'number' ? f.maximum : 100;
      const step = 1;
      return (
        <ui-number-picker
          {...common}
          min={String(min)}
          max={String(max)}
          step={String(step)}
          value={typeof val === 'number' ? val : min}
          onValueMsg={(e: CustomEvent<any>) => this.onFieldChange(f.name, e.detail?.newVal)}
        />
      );
    }

    if (f.type === 'number') {
      const min = typeof f.minimum === 'number' ? f.minimum : 0;
      const max = typeof f.maximum === 'number' ? f.maximum : 100;
      const step = 0.1;
      return (
        <ui-slider
          {...common}
          min={String(min)}
          max={String(max)}
          step={String(step)}
          value={typeof val === 'number' ? val : min}
          onValueMsg={(e: CustomEvent<any>) => this.onFieldChange(f.name, e.detail?.newVal)}
        />
      );
    }

    // default to text
    return (
      <ui-text
        {...common}
        mode="editable"
        value={typeof val === 'undefined' ? '' : String(val)}
        onValueMsg={(e: CustomEvent<any>) => this.onFieldChange(f.name, e.detail?.newVal)}
      />
    );
  }

  render() {
    return (
      <div class="w-full">
        {this.label && <label class={`header text-sm font-semibold mb-2 block ${this.dark ? 'text-neutral-light' : ''}`}>{this.label}</label>}
        <div class={`container ${this.variant === 'filled' ? 'bg-neutral-light border border-neutral rounded-lg p-4' : 'border border-neutral rounded-lg p-4'}`}>
          <div class="fields grid grid-cols-1 gap-3">
            {this.fields.map(f => (
              <div class="field flex flex-col gap-1.5">
                <div class={`field-label text-xs text-neutral ${this.dark ? 'text-neutral-light' : ''}`}>
                  {f.name} ({f.type})
                </div>
                {this.renderField(f)}
              </div>
            ))}
          </div>
          <div class="footer mt-3 flex items-center gap-4">
            <ui-button label="Save" variant="filled" onClick={() => this.save()}></ui-button>
            {this.showStatus && StatusIndicator.renderStatusBadge(this.operationStatus, this.lastError, h)}
          </div>
        </div>
        {this.showLastUpdated && (
          <div class="timestamp mt-2">{StatusIndicator.renderTimestamp(this.lastUpdatedTs ? new Date(this.lastUpdatedTs) : null, this.dark ? 'dark' : 'light', h)}</div>
        )}
      </div>
    );
  }
}
