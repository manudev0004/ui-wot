import { h } from '@stencil/core';
import { UiMsg } from './types';
import { 
  handleLegacyMode,
  AccessibilityHelpers,
  createKeyboardHandler
} from './common-props';

/**
 * Mixin function to add common UI component functionality
 * Use this instead of class inheritance since Stencil components cannot extend base classes
 */
export function applyUiComponentMixin<T>(component: any, componentName: string) {
  // utility to convert class string to object map (required by h() type expectations)
  const cls = (str: string) => str.split(/\s+/).filter(Boolean).reduce((a,c)=>{a[c]=true; return a;}, {} as Record<string, boolean>);
  // Add common properties and methods to the component
  
  // Handle legacy mode compatibility
  const originalComponentWillLoad = component.componentWillLoad;
  component.componentWillLoad = function() {
    // Support legacy `mode="read"` used across the demos/docs
    // Only modify if readonly prop is mutable or create internal state
    const shouldBeReadonly = handleLegacyMode(this.readonly || false, this.mode);
    if (this.readonly !== shouldBeReadonly) {
      // Create internal readonly state if prop is immutable
      this._internalReadonly = shouldBeReadonly;
    }
    this.isInitialized = true;
    
    // Call original componentWillLoad if it exists
    if (originalComponentWillLoad) {
      originalComponentWillLoad.call(this);
    }
  };

  // Add common methods
  component.emitValueMsg = function(value: T, prevValue?: T) {
    const msg: UiMsg<T> = {
      payload: value,
      prev: prevValue,
      ts: Date.now(),
      source: this.hostElement?.id || componentName,
      ok: true
    };
    this.valueMsg.emit(msg);
  };

  component.getCanInteract = function(): boolean {
    const effectiveReadonly = this._internalReadonly !== undefined ? this._internalReadonly : this.readonly;
    return !this.disabled && !effectiveReadonly;
  };

  // Provide unified getter for effective readonly (used by external code if needed)
  component.getEffectiveReadonly = function(): boolean {
    return this._internalReadonly !== undefined ? this._internalReadonly : !!this.readonly;
  };

  component.generateAriaLabel = function(value: T, isActive?: boolean): string {
    return AccessibilityHelpers.generateAriaLabel(
      componentName,
      value,
      this.label,
      isActive
    );
  };

  component.generateTooltip = function(action: string): string {
    return AccessibilityHelpers.generateTooltip(
      this.readonly,
      this.disabled,
      action,
      this.label
    );
  };

  component.createKeyboardHandler = function(onActivate: () => void) {
    return createKeyboardHandler(
      this.disabled,
      this.readonly,
      this.keyboard,
      onActivate
    );
  };

  component.getLabelClasses = function(): string {
    const canInteract = this.getCanInteract();
    // Support either `dark` boolean prop or `theme` prop with value 'dark'
    const isDark = (typeof this.dark !== 'undefined' ? this.dark : undefined) || this.theme === 'dark';
    return `select-none mr-2 transition-colors duration-200 ${
      !canInteract
        ? 'cursor-not-allowed text-gray-400'
        : 'cursor-pointer hover:text-opacity-80'
    } ${
      isDark ? 'text-white' : 'text-gray-900'
    }`;
  };

  component.renderLabel = function(onClick?: () => void) {
    return h('slot', { name: 'label' }, [
      this.label && h('label', {
        className: this.getLabelClasses(),
        onClick: () => this.getCanInteract() && onClick?.(),
        title: this.generateTooltip('Click to interact'),
        part: 'label',
        id: `${this.hostElement?.id || componentName}-label`
      }, this.label)
    ]);
  };

  // --- Status / operation helpers (optional use by components) ---
  component.startWriteOperation = function() {
    if (typeof this.operationStatus === 'undefined') return; // component not using status state
    this.operationStatus = 'loading';
  };

  component.finishWriteOperation = function(success: boolean, errorMsg?: string) {
    if (typeof this.operationStatus === 'undefined') return;
    this.operationStatus = success ? 'success' : 'error';
    this.lastError = success ? undefined : (errorMsg || 'Operation failed');
    const clearDelay = success ? 1200 : 2000;
    setTimeout(() => { if (this.operationStatus === (success ? 'success' : 'error')) this.operationStatus = 'idle'; }, clearDelay);
  };

  component.markReadUpdate = function() {
    // markReadUpdate(success?) - success === false indicates read error
    const success = arguments.length > 0 ? arguments[0] : true;
    // Provide a readStatus field: 'ok' | 'error' | 'trying'
    try {
      if (typeof this.readPulseTs === 'undefined') this.readPulseTs = Date.now();
      this.readPulseTs = Date.now();
      this.readStatus = success === false ? 'error' : 'ok';
    } catch (e) {
      // no-op
    }
  };

  component.renderStatusBadge = function() {
    // Requires component to declare @State() operationStatus / readPulseTs and optionally @Prop() connected
    const effectiveReadonly = this._internalReadonly !== undefined ? this._internalReadonly : this.readonly;
    const isReadonly = !!effectiveReadonly;
    const connected = this.connected !== false; // default true
    const size = 'w-3 h-3';
  const baseWrapper = { class: cls('relative inline-flex items-center justify-center mr-1 select-none') };

    // Debug logging
    console.log(`[${componentName}] renderStatusBadge: readonly=${isReadonly}, operationStatus=${this.operationStatus}, readPulseTs=${this.readPulseTs}`);

    if (isReadonly) {
      if (!connected) {
        console.log(`[${componentName}] Rendering disconnected badge`);
        return h('span', { ...baseWrapper, part: 'status-disconnected' }, [
          h('span', { class: cls(`${size} rounded-full bg-red-500`), style: { width: '.75rem', height: '.75rem', display: 'inline-block', backgroundColor: '#ef4444' } })
        ]);
      }
      // prefer explicit readStatus if present
      const status = this.readStatus || (this.readPulseTs && (Date.now() - this.readPulseTs < 1200) ? 'ok' : 'idle');
      if (status === 'ok') {
        // continuous subtle blue ping to indicate fresh/healthy read
        console.log(`[${componentName}] Rendering read OK badge`);
        return h('span', { ...baseWrapper, part: 'status-read-pulse' }, [
          h('span', { class: cls(`absolute inline-flex rounded-full bg-blue-400 opacity-75 ${size} animate-ping`), style: { width: '.75rem', height: '.75rem', backgroundColor: '#60a5fa', opacity: '0.75', position: 'absolute' } }),
          h('span', { class: cls(`${size} rounded-full bg-blue-500`), style: { width: '.75rem', height: '.75rem', display: 'inline-block', backgroundColor: '#3b82f6' } })
        ]);
      }
      if (status === 'error') {
        console.log(`[${componentName}] Rendering read error badge`);
        // red blinking error
        return h('span', { ...baseWrapper, part: 'status-read-error' }, [
          h('span', { class: cls(`inline-flex items-center justify-center rounded-full bg-red-500 text-white ${size}`), style: { width: '.75rem', height: '.75rem', backgroundColor: '#ef4444', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.2s ease-in-out infinite' } })
        ]);
      }
      return null;
    }

    // Write mode badges (interactive)
    // If in write mode but not connected, show a disconnected/error badge as well
    if (!isReadonly && !connected) {
      console.log(`[${componentName}] Rendering disconnected (write-mode) badge`);
      return h('span', { ...baseWrapper, part: 'status-error', title: 'Disconnected', style: { marginLeft: '8px' } }, [
        h('span', { class: cls(`${size} inline-flex items-center justify-center rounded-full bg-red-500 text-white`), style: { width: '16px', height: '16px', borderRadius: '9999px', backgroundColor: '#ef4444', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', lineHeight: '16px' }, innerHTML: '×' })
      ]);
    }

    switch (this.operationStatus) {
      case 'loading':
        console.log(`[${componentName}] Rendering loading badge`);
        return h('span', { ...baseWrapper, part: 'status-loading', title: 'Sending...' }, [
          h('span', { class: cls(`${size} rounded-full border-2 border-current border-t-transparent animate-spin text-primary`), style: { width: '.75rem', height: '.75rem', borderRadius: '9999px', border: '2px solid currentColor', borderTopColor: 'transparent' } })
        ]);
      case 'success':
        console.log(`[${componentName}] Rendering success badge`);
        return h('span', { ...baseWrapper, part: 'status-success', title: 'Sent', style: { marginLeft: '8px' } }, [
          h('span', { class: cls(`${size} rounded-full bg-green-500 inline-flex items-center justify-center`), style: { width: '16px', height: '16px', borderRadius: '9999px', backgroundColor: '#22c55e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '800', lineHeight: '16px' }, innerHTML: '✓' })
        ]);
      case 'error':
        console.log(`[${componentName}] Rendering error badge`);
        return h('span', { ...baseWrapper, part: 'status-error', title: this.lastError || 'Error', style: { marginLeft: '8px' } }, [
          h('span', { class: cls(`${size} inline-flex items-center justify-center rounded-full bg-red-500 text-white`), style: { width: '16px', height: '16px', borderRadius: '9999px', backgroundColor: '#ef4444', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', lineHeight: '16px' }, innerHTML: '×' })
        ]);
      default:
        return null;
    }
  };  // Add mode watcher
  component.watchMode = function(newValue: 'read' | 'readwrite' | undefined) {
    const shouldBeReadonly = handleLegacyMode(this.readonly, newValue);
    this._internalReadonly = shouldBeReadonly;
  };

  return component;
}

/**
 * Decorator function to apply the UI component mixin
 * Usage: @UiComponentMixin('component-name')
 */
export function UiComponentMixin<T>(componentName: string) {
  return function(target: any) {
    return applyUiComponentMixin<T>(target, componentName);
  };
}
