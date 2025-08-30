/**
 * Base Component Class for UI-WoT Components
 * Provides common functionality and patterns for all components
 */

import { Element, State, Watch } from '@stencil/core';
import { emitValueMsg, ValueMessage, EmitOptions } from './event-system';
import { ComponentStatusManager, getStatusManager, onComponentDisconnected } from './status-lifecycle';

/**
 * Common component interface
 */
export interface ComponentConfig {
  /** Component name for identification */
  name: string;
  /** Enable auto-emit on value changes */
  autoEmit?: boolean;
  /** Default debounce delay for emissions */
  defaultDebounce?: number;
  /** Enable status management */
  enableStatusManager?: boolean;
}

/**
 * Base component mixin
 * Provides common functionality that can be mixed into Stencil components
 */
export class UIComponentBase {
  @Element() el!: HTMLElement;
  
  @State() protected componentStatus: string = 'idle';
  
  protected config: ComponentConfig;
  private statusManager?: ComponentStatusManager;
  private isConnected = false;
  
  constructor(config: ComponentConfig) {
    this.config = {
      autoEmit: true,
      defaultDebounce: 0,
      enableStatusManager: true,
      ...config
    };
  }
  
  /**
   * Component lifecycle - connected
   */
  connectedCallback(): void {
    this.isConnected = true;
    
    // Initialize status manager if enabled
    if (this.config.enableStatusManager) {
      this.statusManager = getStatusManager(this.el, this.config.name);
    }
    
    // Add component class for CSS targeting
    this.el.classList.add('ui-component', `ui-${this.config.name}`);
    
    // Set component attributes
    this.el.setAttribute('data-ui-component', this.config.name);
    this.el.setAttribute('data-ui-version', '1.0.0');
    
    this.onConnected();
  }
  
  /**
   * Component lifecycle - disconnected
   */
  disconnectedCallback(): void {
    this.isConnected = false;
    
    // Cleanup status manager
    if (this.statusManager) {
      onComponentDisconnected(this.el);
    }
    
    this.onDisconnected();
  }
  
  /**
   * Override in child components for custom connection logic
   */
  protected onConnected(): void {
    // Override in child classes
  }
  
  /**
   * Override in child components for custom disconnection logic
   */
  protected onDisconnected(): void {
    // Override in child classes
  }
  
  /**
   * Emit a value change event
   */
  protected emitValue(value: any, options: EmitOptions = {}): ValueMessage {
    const emitOptions: EmitOptions = {
      debounce: this.config.defaultDebounce,
      ...options
    };
    
    return emitValueMsg(this.el, this.config.name, value, emitOptions);
  }
  
  /**
   * Set success status
   */
  protected setSuccess(message: string, autoClear = 3000): void {
    this.statusManager?.setSuccess({ message, autoClear });
    this.componentStatus = 'success';
  }
  
  /**
   * Set error status
   */
  protected setError(message: string, autoClear?: number): void {
    this.statusManager?.setError({ message, autoClear });
    this.componentStatus = 'error';
  }
  
  /**
   * Set warning status
   */
  protected setWarning(message: string, autoClear = 5000): void {
    this.statusManager?.setWarning({ message, autoClear });
    this.componentStatus = 'warning';
  }
  
  /**
   * Set info status
   */
  protected setInfo(message: string, autoClear = 4000): void {
    this.statusManager?.setInfo({ message, autoClear });
    this.componentStatus = 'info';
  }
  
  /**
   * Clear status
   */
  protected clearStatus(): void {
    this.statusManager?.clear();
    this.componentStatus = 'idle';
  }
  
  /**
   * Get current status
   */
  protected getStatus() {
    return this.statusManager?.getStatus();
  }
  
  /**
   * Check if component has active status
   */
  protected hasActiveStatus(): boolean {
    return this.statusManager?.hasActiveStatus() ?? false;
  }
  
  /**
   * Watch for status changes and update component state
   */
  @Watch('componentStatus')
  statusChangedHandler(newStatus: string): void {
    this.el.setAttribute('data-status', newStatus);
    this.onStatusChanged(newStatus);
  }
  
  /**
   * Override in child components for custom status change handling
   */
  protected onStatusChanged(_status: string): void {
    // Override in child classes
  }
  
  /**
   * Utility to add CSS classes conditionally
   */
  protected getCssClasses(baseClasses: string, conditionalClasses: Record<string, boolean> = {}): string {
    const classes = [baseClasses];
    
    Object.entries(conditionalClasses).forEach(([className, condition]) => {
      if (condition) {
        classes.push(className);
      }
    });
    
    return classes.join(' ');
  }
  
  /**
   * Utility to validate component props
   */
  protected validateProps(rules: Record<string, (value: any) => boolean | string>): boolean {
    for (const [propName, validator] of Object.entries(rules)) {
      const value = (this as any)[propName];
      const result = validator(value);
      
      if (typeof result === 'string') {
        this.setError(`Invalid ${propName}: ${result}`);
        return false;
      } else if (!result) {
        this.setError(`Invalid ${propName} value`);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Utility for handling async operations with status feedback
   */
  protected async withStatus<T>(
    operation: () => Promise<T>,
    loadingMessage = 'Processing...',
    successMessage = 'Operation completed',
    errorMessage = 'Operation failed'
  ): Promise<T | null> {
    try {
      this.setInfo(loadingMessage, 0); // No auto-clear for loading
      const result = await operation();
      this.setSuccess(successMessage);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : errorMessage;
      this.setError(errorMsg);
      return null;
    }
  }
  
  /**
   * Utility to debounce method calls
   */
  protected debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }
  
  /**
   * Utility to throttle method calls
   */
  protected throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func.apply(this, args);
      }
    };
  }
  
  /**
   * Check if component is connected to DOM
   */
  protected get connected(): boolean {
    return this.isConnected;
  }
  
  /**
   * Get component configuration
   */
  protected get componentConfig(): ComponentConfig {
    return this.config;
  }
}

/**
 * Validation utilities
 */
export const validators = {
  required: (value: any) => value != null && value !== '',
  minLength: (min: number) => (value: string) => value && value.length >= min,
  maxLength: (max: number) => (value: string) => !value || value.length <= max,
  pattern: (regex: RegExp) => (value: string) => !value || regex.test(value),
  min: (min: number) => (value: number) => typeof value === 'number' && value >= min,
  max: (max: number) => (value: number) => typeof value === 'number' && value <= max,
  range: (min: number, max: number) => (value: number) => 
    typeof value === 'number' && value >= min && value <= max,
  email: (value: string) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  url: (value: string) => !value || /^https?:\/\/.+/.test(value),
  number: (value: any) => !isNaN(Number(value)),
  integer: (value: any) => Number.isInteger(Number(value)),
  boolean: (value: any) => typeof value === 'boolean'
};

/**
 * Common CSS class utilities
 */
export const cssClasses = {
  base: 'ui-component',
  states: {
    loading: 'ui-loading',
    disabled: 'ui-disabled',
    focused: 'ui-focused',
    invalid: 'ui-invalid',
    valid: 'ui-valid'
  },
  status: {
    success: 'ui-status-success',
    error: 'ui-status-error',
    warning: 'ui-status-warning',
    info: 'ui-status-info',
    idle: 'ui-status-idle'
  },
  sizes: {
    xs: 'ui-size-xs',
    sm: 'ui-size-sm',
    md: 'ui-size-md',
    lg: 'ui-size-lg',
    xl: 'ui-size-xl'
  },
  variants: {
    primary: 'ui-variant-primary',
    secondary: 'ui-variant-secondary',
    outline: 'ui-variant-outline',
    ghost: 'ui-variant-ghost'
  }
};
