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
  // Add common properties and methods to the component
  
  // Handle legacy mode compatibility
  const originalComponentWillLoad = component.componentWillLoad;
  component.componentWillLoad = function() {
    // Support legacy `mode="read"` used across the demos/docs
    this.readonly = handleLegacyMode(this.readonly || false, this.mode);
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
    return !this.disabled && !this.readonly;
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

  // Add mode watcher
  component.watchMode = function(newValue: 'read' | 'readwrite' | undefined) {
    this.readonly = handleLegacyMode(this.readonly, newValue);
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
