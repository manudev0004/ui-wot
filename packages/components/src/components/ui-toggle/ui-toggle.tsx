import { Component, Prop, State, h, Event, EventEmitter, Watch, Element, Method } from '@stencil/core';

export interface UiToggleToggleEvent { active: boolean }
export interface UiToggleValueChange { value: boolean; label?: string }

/**
 * Advanced toggle switch component with reactive state management, validation, and TD integration support.
 * Provides multiple visual styles, accessibility features, and flexible event handling.
 *
 * @example Basic Usage
 * ```html
 * <ui-toggle variant="circle" value="true" label="Light"></ui-toggle>
 * ```
 *
 * @example Reactive Value Binding (auto-updates when value changes)
 * ```html
 * <ui-toggle 
 *   id="device-toggle"
 *   value="false" 
 *   reactive="true"
 *   label="Smart Device"
 *   debounce="200">
 * </ui-toggle>
 * ```
 *
 * @example Read-Only Mode with Auto-Sync
 * ```html
 * <ui-toggle
 *   mode="read"
 *   syncInterval="1000"
 *   label="Sensor Status"
 *   reactive="true">
 * </ui-toggle>
 * ```
 *
 * @example With Validation
 * ```html
 * <ui-toggle
 *   value="false"
 *   validator="myValidationFunction"
 *   label="Critical System">
 * </ui-toggle>
 * ```
 *
 * @example JavaScript Integration
 * ```javascript
 * const toggle = document.querySelector('ui-toggle');
 * 
 * // Listen for value changes
 * toggle.addEventListener('valueChange', (e) => {
 *   console.log('New value:', e.detail.value);
 *   console.log('Label:', e.detail.label);
 * });
 * 
 * // Listen for sync requests (read mode)
 * toggle.addEventListener('syncRequest', async (e) => {
 *   const newValue = await fetchDeviceState();
 *   toggle.value = newValue;
 * });
 * 
 * // Programmatically set value
 * await toggle.setValue(true);
 * 
 * // Get current value
 * const currentValue = await toggle.getValue();
 * 
 * // Custom validation function
 * window.myValidationFunction = function(newValue, currentValue, label) {
 *   if (label === 'Critical System' && newValue === true) {
 *     return confirm('Are you sure you want to enable the critical system?');
 *   }
 *   return true;
 * };
 * ```
 *
 * @example Event Prevention
 * ```javascript
 * toggle.addEventListener('beforeChange', (e) => {
 *   if (someCondition) {
 *     e.detail.preventDefault(); // Prevent the change
 *   }
 * });
 * ```
 */
@Component({
  tag: 'ui-toggle',
  styleUrl: 'ui-toggle.css',
  shadow: true,
})
export class UiToggle {
  @Element() hostElement: HTMLElement;
  /**
   * Visual style variant of the toggle.
   * - circle: Common pill-shaped toggle (default)
   * - square: Rectangular toggle with square thumb
   * - apple: iOS-style switch (bigger size, rounded edges)
   * - cross: Shows × when off, ✓ when on with red background when off and green when on
   * - neon: Glowing effect when active
   */
  @Prop() variant: 'circle' | 'square' | 'apple' | 'cross' | 'neon' = 'circle';

  /**
   * Current state of the toggle.
   * - active: Toggle is on/active
   * - disabled: Toggle cannot be clicked or interacted with
   * - default: Toggle is off/inactive (default)
   */
  @Prop({ mutable: true }) state: 'active' | 'disabled' | 'default' = 'default';

  /**
   * Enable dark theme for the component.
   * When true, uses light text on dark backgrounds.
   */
  @Prop() dark: boolean = false;

  /**
   * Color scheme to match thingsweb webpage
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /**
   * Optional text label, to display text left to the toggle.
   * When given, clicking the label will also toggle the switch.
   */
  @Prop() label?: string;

  /**
   * Direct URL of TD boolean properties to auto connect and interact with the device.
   * @example
   * ```
   * td-url="http://plugfest.thingweb.io:80/http-data-schema-thing/properties/bool"
   * ```
   */
  // TD integration removed: use events for external device I/O

  /**
   * Current value for local control mode (true/false, on/off, 1/0).
   * When no td-url is provided and value is set, this controls the toggle state.
   * @example "true", "false", "on", "off", "1", "0"
   */
  /**
   * Local value for the toggle. Accepts boolean or string values (string will be parsed).
   * This is the primary way to control the toggle state externally.
   */
  @Prop({ mutable: true }) value?: boolean | string;

  /**
   * Enable automatic state reflection from external value changes.
   * When true, the component will automatically update its visual state when value prop changes.
   * Default: true
   */
  @Prop() reactive: boolean = true;

  /**
   * Debounce delay in milliseconds for value change events.
   * Prevents rapid firing of events during quick toggles.
   * Default: 100ms
   */
  @Prop() debounce: number = 100;

  /**
   * Enable keyboard navigation (Space and Enter keys).
   * Default: true
   */
  @Prop() keyboard: boolean = true;

  /**
   * Device interaction mode.
   * - read: Only read from device (display current state, no user interaction)
   * - write: Only write to device (control device but don't sync state)
   * - readwrite: Read and write (full synchronization) - default
   */
  @Prop() mode: 'read' | 'write' | 'readwrite' = 'readwrite';

  /**
   * Auto-sync interval in milliseconds for read mode.
   * When set, the component will emit 'syncRequest' events at this interval.
   * External systems can listen to this event to update the value prop.
   * Set to 0 to disable auto-sync. Default: 0 (disabled)
   */
  @Prop({ reflect: true }) syncInterval: number = 0;

  /**
   * Declarative TD property name. Page scripts may use this to auto-wire this element to a TD property.
   * Example: tdProperty="bool"
   * NOTE: Component does not perform any network operations. This is a lightweight hint only.
   */
  @Prop({ reflect: true }) tdProperty?: string;

  /**
   * Lightweight hint to the TD base URL for page-level wiring. Component does not perform network requests.
   * Example: tdUrl="http://plugfest.thingweb.io/http-data-schema-thing"
   */
  @Prop({ reflect: true }) tdUrl?: string;

  /**
   * Enable debug logging for development. Gate console output when true.
   */
  @Prop() debug: boolean = false;

  /** Internal state tracking if toggle is on/off */
  @State() isActive: boolean = false;

  /** Internal state for tracking if component is initialized */
  @State() isInitialized: boolean = false;
  @Prop({ reflect: true }) mirror?: string;

  /** Timer reference for debouncing */
  private debounceTimer?: number;

  /** Timer reference for sync interval */
  private syncTimer?: number;
  
  /** Guards for propagation to avoid infinite mirror loops */
  private propagationToken: WeakSet<HTMLElement> = new WeakSet();

  /** Local observers registered via observeLocal */
  private localObservers: Array<(value: boolean) => void> = [];

  /** Legacy event emitted when toggle state changes */
  @Event() toggle: EventEmitter<UiToggleToggleEvent>;

  /** Standardized valueChange event for value-driven integrations */
  @Event() valueChange: EventEmitter<UiToggleValueChange>;

  /** Event emitted to request sync in read mode (for external data fetching) */
  @Event() syncRequest: EventEmitter<{ mode: string; label?: string }>;

  /** Event emitted before value changes (can be prevented) */
  @Event() beforeChange: EventEmitter<{ currentValue: boolean; newValue: boolean; preventDefault: () => void }>;

  /** Event emitted after component is ready and initialized */
  @Event() ready: EventEmitter<{ value: boolean; mode: string }>;

  /**
   * Public method: register a local observer function to be called when the value changes.
   * Useful for page-level wiring utilities.
   */
  @Method()
  async observeLocal(fn: (value: boolean) => void) {
    if (typeof fn === 'function') this.localObservers.push(fn);
  }

  /** Stop all registered local observers */
  @Method()
  async stopObservingLocal() {
    this.localObservers.length = 0;
  }

  /** Apply an external value to this component (will go through validation and emit events). */
  @Method()
  async applyExternalValue(value: boolean | string) {
  // Treat as external-origin update so internal handlers can distinguish source
  return this.setValue(value, true, true);
  }

  /** Watch for value prop changes */
  // Keep watching `value` only to reflect external prop changes
  // (watch decorator not needed here unless explicit reactive handling is required)

  /** Initialize component */
  async componentWillLoad() {
    // Initialize from value prop or default to false
    if (this.value !== undefined) {
      this.isActive = this.parseValue(this.value);
    } else {
      this.isActive = this.state === 'active';
    }
    
    this.isInitialized = true;
  }

  /** Component loaded - set up sync interval if needed */
  componentDidLoad() {
    // Set up sync interval for read mode
    if (this.mode === 'read' && this.syncInterval > 0) {
      this.syncTimer = window.setInterval(() => {
        this.syncRequest.emit({ mode: this.mode, label: this.label });
      }, this.syncInterval);
    }

    // Emit ready event
    this.ready.emit({ value: this.isActive, mode: this.mode });

  // If mirror attribute explicitly present and equals '' or 'parent', auto-subscribe to nearest
  // ancestor ui-toggle so this element mirrors its parent's value without page JS wiring.
    try {
      const hasAttr = !!this.hostElement?.hasAttribute && this.hostElement.hasAttribute('mirror');
      const m = (this.mirror || '').trim();
      if (hasAttr && (m === '' || m === 'parent')) {
        const ancestor = this.hostElement ? (this.hostElement.parentElement ? this.hostElement.parentElement.closest('ui-toggle') : null) : null;
        if (ancestor && ancestor !== this.hostElement) {
          const handler = (ev: Event) => {
            const detail = (ev as CustomEvent)?.detail;
            const val = detail?.value ?? (ancestor as any).value ?? false;
            if (typeof this.applyExternalValue === 'function') {
              this.applyExternalValue(val);
            } else {
              this.value = val;
            }
          };
          ancestor.addEventListener('valueChange', handler);
          ancestor.addEventListener('value-change', handler);
          (this as any).__mirrorParent = ancestor;
          (this as any).__mirrorParentHandler = handler;
        }
      }
    } catch (e) {
      if (this.debug) console.warn('parent mirror setup failed', e);
    }

    // If mirror attribute is provided as selector(s) (e.g. "#id" or ".class"), subscribe to
    // those source elements' valueChange events so this element mirrors them.
    try {
      const hasAttr = !!this.hostElement?.hasAttribute && this.hostElement.hasAttribute('mirror');
      const m = (this.mirror || '').trim();
      if (hasAttr && m && m !== 'parent') {
        // parse selectors
        const selectors = m.split(',').map(s => s.trim()).filter(Boolean);
        const sources: Array<any> = [];
        selectors.forEach(sel => {
          try {
            const nodes = Array.from(document.querySelectorAll(sel));
            nodes.forEach(node => {
              if (node === this.hostElement) return;
              const handler = (ev: Event) => {
                const detail = (ev as CustomEvent)?.detail;
                const val = detail?.value ?? (node as any).value ?? false;
                if (typeof this.applyExternalValue === 'function') this.applyExternalValue(val);
                else this.value = val;
              };
              node.addEventListener('valueChange', handler);
              node.addEventListener('value-change', handler);
              sources.push({ node, handler });
            });
          } catch (e) {
            if (this.debug) console.warn('mirror selector subscribe failed', sel, e);
          }
        });
        if (sources.length) (this as any).__mirrorSources = sources;
      }
    } catch (e) { if (this.debug) console.warn('mirror subscribe failed', e); }
  }

  /** Cleanup timers on disconnect */
  disconnectedCallback() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    // remove any parent-mirror listeners
    try {
      const parent = (this as any).__mirrorParent as HTMLElement | undefined;
      const handler = (this as any).__mirrorParentHandler as EventListener | undefined;
      if (parent && handler) {
        parent.removeEventListener('valueChange', handler);
        parent.removeEventListener('value-change', handler);
      }
    } catch (e) { /* ignore */ }
    // remove any selector-based mirror sources
    try {
      const sources = (this as any).__mirrorSources as Array<any> | undefined;
      if (sources && sources.length) {
        sources.forEach(s => {
          try {
            s.node.removeEventListener('valueChange', s.handler);
            s.node.removeEventListener('value-change', s.handler);
          } catch (e) {}
        });
      }
    } catch (e) { /* ignore */ }
  }

  /** Watch for value prop changes and update state if reactive is enabled */
  @Watch('value')
  watchValue(newVal: boolean | string | undefined) {
    if (!this.reactive || !this.isInitialized) return;
    
    if (newVal === undefined) return;
    
    const newActiveState = this.parseValue(newVal);
    if (this.isActive !== newActiveState) {
      if (this.debug) console.log(`[${this.label || 'ui-toggle'}] Value updated:`, this.isActive, '->', newActiveState);
      this.isActive = newActiveState;
      
      // Notify local observers
      this.localObservers.forEach(fn => {
        try { fn(this.isActive); } catch (e) { if (this.debug) console.warn('observer error', e); }
      });

      // Emit events for external listeners
      this.emitChangeEvents(this.isActive, true);
      // Announce state change for screen readers
      const announcer = this.hostElement?.querySelector('.sr-announcer') as HTMLElement | null;
      if (announcer) announcer.textContent = `${this.label || 'Toggle'} is now ${this.isActive ? 'on' : 'off'}`;
    }
  }

  /** Watch for state prop changes */
  @Watch('state')
  watchState(newState: 'active' | 'disabled' | 'default') {
    if (!this.reactive || !this.isInitialized) return;
    
    if (newState === 'active' && !this.isActive) {
      this.isActive = true;
      this.emitChangeEvents(this.isActive, true);
    } else if (newState === 'default' && this.isActive) {
      this.isActive = false;
      this.emitChangeEvents(this.isActive, true);
    }
  }

  /** Parse value (string or boolean) to boolean */
  private parseValue(value: string | boolean | undefined): boolean {
    if (value === undefined) return false;
    if (typeof value === 'boolean') return value;
    
    const lowerValue = value.toLowerCase();
    return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'on' || lowerValue === 'yes';
  }

  /** Validate value change using custom validator if provided */
  private validateChange(_newValue: boolean): boolean {
    // No validation by default - simplified component
    return true;
  }

  /** Emit change events with debouncing */
  private emitChangeEvents(newValue: boolean, isExternal: boolean = false) {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set debounced emission
    this.debounceTimer = window.setTimeout(() => {
      // Update value prop if not from external source
      if (!isExternal && this.value !== undefined) {
        this.value = newValue;
      }

      // Emit events
      // Preferred kebab-case event names
      this.valueChange.emit({ value: newValue, label: this.label });
      this.toggle.emit({ active: newValue });

      // Also dispatch DOM CustomEvents with kebab-case names for consumers that use addEventListener('value-change')
      try {
        const detail = { value: newValue, label: this.label };
        this.hostElement?.dispatchEvent(new CustomEvent('value-change', { detail, bubbles: true }));
        this.hostElement?.dispatchEvent(new CustomEvent('toggle-change', { detail: { active: newValue }, bubbles: true }));
      } catch (e) {
        if (this.debug) console.warn('Dispatch kebab-case events failed', e);
      }
      // After emitting events, propagate to mirror targets if configured. We avoid propagation
      // when this host was recently marked in the propagationToken to prevent echo loops.
      if (this.mirror) {
        const host = this.hostElement as HTMLElement | undefined;
        const hasFunc = this.propagationToken && typeof (this.propagationToken as any).has === 'function';
        const isMarked = host && hasFunc ? (this.propagationToken as any).has(host) : false;
        if (!isMarked) {
          this.propagateMirror(newValue);
        }
      }
    }, this.debounce);
  }

  /** Propagate the value to mirror targets specified by `this.mirror` */
  private propagateMirror(value: boolean) {
    if (!this.mirror) return;
    const selectors = this.mirror.split(',').map(s => s.trim()).filter(Boolean);
    selectors.forEach(sel => {
      try {
        const nodes = Array.from(document.querySelectorAll(sel));
        nodes.forEach((node) => {
          // Skip self
          if (node === this.hostElement) return;

          // Mark target to avoid it re-propagating back
          try { this.propagationToken.add(node as HTMLElement); } catch (e) {}

          const anyNode: any = node;
          if (typeof anyNode.applyExternalValue === 'function') {
            try { anyNode.applyExternalValue(value); } catch (e) { if (this.debug) console.warn('mirror applyExternalValue failed', e); }
          } else {
            try { (node as any).value = value; } catch (e) {}
            try { (node as Element).setAttribute('value', String(value)); } catch (e) {}
          }

          // Unmark after short delay to allow the target to process without propagating back
          setTimeout(() => {
            try { this.propagationToken.delete(node as HTMLElement); } catch (e) {}
          }, 50);
        });
      } catch (e) {
        if (this.debug) console.warn('mirror propagation failed for selector', sel, e);
      }
    });
  }

  // Device read/write helpers removed; keep UI-only behavior and `mode` prop for visual differences

  /** Toggle click handler with enhanced features */
  private async handleToggle() {
    if (this.state === 'disabled') return;

    // Don't allow interaction in read-only mode
    if (this.mode === 'read') {
      return;
    }

    const newActive = !this.isActive;

    // Validate change if validator is provided
    if (!this.validateChange(newActive)) {
      return;
    }

    // Emit beforeChange event with prevention capability
    let changeBlocked = false;
    const beforeChangeEvent = {
      currentValue: this.isActive,
      newValue: newActive,
      preventDefault: () => { changeBlocked = true; }
    };
    
    this.beforeChange.emit(beforeChangeEvent);
    
    // If change was prevented, don't proceed
    if (changeBlocked) {
      return;
    }

  // Update state
  this.isActive = newActive;
  if (this.debug) console.log('handleToggle -> newActive', newActive);

    // Emit change events with debouncing
    this.emitChangeEvents(newActive, false);
  }

  /** Handle keyboard input to toggle switch state */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (!this.keyboard) return;
    
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.handleToggle();
    }
  };

  /** Public method to programmatically set value */
  async setValue(value: boolean | string, emitEvents: boolean = true, isExternal: boolean = false): Promise<boolean> {
    const newValue = this.parseValue(value);
    
    if (!this.validateChange(newValue)) {
      return false;
    }

    this.isActive = newValue;
    this.value = newValue;
    this.state = newValue ? 'active' : 'default';
    
    if (emitEvents) {
      this.emitChangeEvents(newValue, isExternal);
    }
    
    return true;
  }

  /** Public method to get current value */
  async getValue(): Promise<boolean> {
    return this.isActive;
  }

  /** Public method to force sync request (useful for read mode) */
  async requestSync(): Promise<void> {
    this.syncRequest.emit({ mode: this.mode, label: this.label });
  }

  /** Fetch current toggle background style */
  getToggleStyle() {
    const isDisabled = this.state === 'disabled';
    const isActive = this.isActive;

    // Bigger sixe for apple variant
    const size = this.variant === 'apple' ? 'w-11 h-7' : 'w-12 h-6';

    // Different shapes of thumb
    let shape = 'rounded-full';
    if (this.variant === 'square') shape = 'rounded-md';
    if (this.variant === 'apple') shape = 'rounded-full shadow-inner border-2 border-gray-500';

    // Background color
    let bgColor = 'bg-gray-300';

    if (this.color === 'neutral') {
      bgColor = isActive ? 'bg-gray-500' : 'bg-gray-300';
    } else if (this.variant === 'cross') {
      bgColor = isActive ? this.getActiveColor() : 'bg-red-500';
    } else if (this.variant === 'apple') {
      bgColor = isActive ? 'bg-green-500' : 'bg-gray-700';
    } else if (this.variant === 'neon') {
      bgColor = isActive ? this.getNeonColor() : 'neon-red';
    } else if (isActive) {
      bgColor = this.getActiveColor();
    }

    const disabled = isDisabled ? 'disabled-state' : '';
    const base = 'relative inline-block cursor-pointer transition-all duration-300 ease-in-out';

    return `${base} ${size} ${shape} ${bgColor} ${disabled}`.trim();
  }

  /** Fetch current active color */
  getActiveColor() {
    if (this.color === 'secondary') return 'bg-secondary';
    if (this.color === 'neutral') return 'bg-gray-500';
    return 'bg-primary';
  }

  /** Fetch current neon color */
  getNeonColor() {
    return this.color === 'secondary' ? 'neon-secondary' : 'neon-primary';
  }

  /** Fetch current thumb style */
  getThumbStyle() {
    const isActive = this.isActive;

    // Apple variant
    if (this.variant === 'apple') {
      const baseStyle = 'absolute w-6 h-6 bg-white transition-all duration-200 ease-in-out shadow-md rounded-full top-0 left-0';
      const movement = isActive ? 'translate-x-4' : 'translate-x-0';
      return `${baseStyle} ${movement}`;
    }

    // Standard thumb
    const baseStyle = 'absolute w-4 h-4 bg-white transition-transform duration-300 ease-in-out shadow-sm';
    const shape = this.variant === 'square' ? 'rounded-sm' : 'rounded-full';

    let position = 'top-1 left-1';
    if (this.variant === 'neon') {
      position = 'top-0.5 left-1';
    }

    const movement = isActive ? 'translate-x-6' : 'translate-x-0';

    return `${baseStyle} ${shape} ${position} ${movement}`;
  }

  /** Tick and cross icons for cross variant */
  showCrossIcons() {
    if (this.variant !== 'cross') return null;

    const isActive = this.isActive;

    return (
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        {!isActive ? (
          <div class="absolute top-0 right-0 w-6 h-6 flex items-center justify-center">
            <span class="text-white text-xl font-bold">×</span>
          </div>
        ) : (
          <div class="absolute top-0 left-0 w-6 h-6 flex items-center justify-center">
            <span class="text-white text-lg font-bold">✓</span>
          </div>
        )}
      </div>
    );
  }

  /** Render final component */
  render() {
    const toggleStyle = this.getToggleStyle();
    const thumbStyle = this.getThumbStyle();
    const isDisabled = this.state === 'disabled';
    const isReadOnly = this.mode === 'read';
    const canInteract = !isDisabled && !isReadOnly;
    
    // Enhanced tooltips
    let hoverTitle = '';
    if (isReadOnly) {
      hoverTitle = 'Read-only mode - Value reflects device state';
    } else if (isDisabled) {
      hoverTitle = 'Toggle is disabled';
    } else {
      hoverTitle = `Click to ${this.isActive ? 'turn off' : 'turn on'}${this.label ? ` ${this.label}` : ''}`;
    }

    return (
      <div class="inline-flex items-center space-x-3" part="container">
  {/* Screen reader announcer for state changes */}
  <span class="sr-only sr-announcer" aria-live="polite" style={{position: 'absolute', left: '-9999px'}}></span>
        {this.label && (
          <label
            class={`select-none mr-2 ${
              !canInteract 
                ? 'cursor-not-allowed text-gray-400' 
                : 'cursor-pointer hover:text-opacity-80'
            } ${
              this.dark ? 'text-white' : 'text-gray-900'
            } transition-colors duration-200`}
            onClick={() => canInteract && this.handleToggle()}
            title={hoverTitle}
            part="label"
            id={`${this.hostElement?.id || 'ui-toggle'}-label`}
          >
            {this.label}
            {/* Add visual indicator for read-only mode */}
            {isReadOnly && (
              <span class="ml-1 text-xs opacity-60" title="Read-only">📖</span>
            )}
          </label>
        )}

        {isReadOnly ? (
          // Enhanced read-only indicator with pulse animation when active
          <span 
            class={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 ${
              this.isActive 
                ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' 
                : 'bg-red-500 shadow-lg shadow-red-500/50'
            }`} 
            title={`${hoverTitle} - Current state: ${this.isActive ? 'ON' : 'OFF'}`}
            part="readonly-indicator"
          >
            {/* Add icon to indicate status */}
            <span class="text-white text-xs font-bold">
              {this.isActive ? '●' : '○'}
            </span>
          </span>
        ) : (
          <span
            class={`${toggleStyle} ${
              canInteract 
                ? 'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary' 
                : ''
            } transition-all duration-200`}
            role="switch"
            aria-checked={this.isActive ? 'true' : 'false'}
            aria-disabled={isDisabled ? 'true' : 'false'}
            aria-label={this.label || `Toggle switch ${this.isActive ? 'on' : 'off'}`}
            tabIndex={canInteract ? 0 : -1}
            onClick={() => canInteract && this.handleToggle()}
            onKeyDown={this.handleKeyDown}
            title={hoverTitle}
            part="control"
          >
            <span class={thumbStyle} part="thumb"></span>
            {this.showCrossIcons()}
          </span>
        )}

        {/* Show sync indicator when sync is active */}
        {this.mode === 'read' && this.syncInterval > 0 && (
          <span 
            class="ml-2 w-2 h-2 bg-blue-500 rounded-full animate-ping" 
            title={`Auto-sync every ${this.syncInterval}ms`}
            part="sync-indicator"
          ></span>
        )}
      </div>
    );
  }
}
