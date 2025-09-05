import { EventEmitter } from '@stencil/core';
import { UiMsg } from './types';

export type OperationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SetValueOptions {
  writeOperation?: () => Promise<any>;
  readOperation?: () => Promise<any>;
  optimistic?: boolean;
  autoRetry?: { attempts: number; delay: number };
  customStatus?: 'loading' | 'success' | 'error';
  errorMessage?: string;
  _isRevert?: boolean;
}

// State interface that components should implement
export interface UiComponentState {
  operationStatus: OperationStatus;
  lastError?: string;
  lastUpdatedTs?: number;
  timestampCounter: number;
  readPulseTs?: number;
  connected: boolean;
}

// Methods interface that components should implement
export interface UiComponentMethods<T> {
  getComponentTag(): string;
  updateInternalValue(value: T): void;
  getCurrentValue(): T;
}

/**
 * Utility functions for UI components - use composition instead of inheritance
 * This avoids Stencil decorator limitations while providing shared functionality
 */
export class UiComponentUtils {
  /**
   * Create initial state for UI components
   */
  static createState(): UiComponentState {
    return {
      operationStatus: 'idle',
      lastError: undefined,
      lastUpdatedTs: undefined,
      timestampCounter: 0,
      readPulseTs: undefined,
      connected: true
    };
  }

  /**
   * Set operation status with auto-clear logic
   */
  static setOperationStatus(
    component: any, // Component with UiComponentState properties
    status: OperationStatus, 
    error?: string
  ) {
    component.operationStatus = status;
    component.lastError = error;
    
    if (status === 'success') {
      component.lastUpdatedTs = Date.now();
      // Auto-clear success status
      setTimeout(() => {
        if (component.operationStatus === 'success') {
          component.operationStatus = 'idle';
        }
      }, 1200);
    } else if (status === 'error') {
      // Auto-clear error status  
      setTimeout(() => {
        if (component.operationStatus === 'error') {
          component.operationStatus = 'idle';
          component.lastError = undefined;
        }
      }, 3000);
    } else if (status === 'idle') {
      component.lastError = undefined;
    }
  }

  /**
   * Clear error state
   */
  static clearError(component: any) {
    if (component.operationStatus === 'error') {
      component.operationStatus = 'idle';
      component.lastError = undefined;
    }
  }

  /**
   * Emit value change event
   */
  static emitValueChange<T>(
    valueMsg: EventEmitter<UiMsg<T>>,
    componentTag: string,
    value: T, 
    prev?: T
  ) {
    valueMsg.emit({
      payload: value,
      prev,
      ts: Date.now(),
      source: componentTag,
      ok: true
    });
  }

  /**
   * Perform async operation with status management
   */
  static async performValueOperation<T>(
    component: any & UiComponentMethods<T>,
    value: T,
    valueMsg: EventEmitter<UiMsg<T>>,
    options?: SetValueOptions
  ): Promise<boolean> {
    // Handle manual status override (backward compatibility)
    if (options?.customStatus) {
      if (options.customStatus === 'loading') {
        this.setOperationStatus(component, 'loading');
        return true;
      }
      if (options.customStatus === 'success') {
        this.setOperationStatus(component, 'success');
        component.updateInternalValue(value);
        this.emitValueChange(valueMsg, component.getComponentTag(), value);
        return true;
      }
      if (options.customStatus === 'error') {
        this.setOperationStatus(component, 'error', options.errorMessage || 'Operation failed');
        return false;
      }
    }

    // Auto-clear any existing error
    this.clearError(component);
    
    if (!options?.writeOperation && !options?.readOperation) {
      return true;
    }
    
    const operation = options.writeOperation || options.readOperation;
    const optimistic = options.optimistic !== false;
    const prevValue = component.getCurrentValue();
    
    // Optimistic update
    if (optimistic && !options._isRevert) {
      component.updateInternalValue(value);
      component.lastUpdatedTs = Date.now();
      this.emitValueChange(valueMsg, component.getComponentTag(), value, prevValue);
    }
    
    // Show loading state
    this.setOperationStatus(component, 'loading');
    
    try {
      await operation();
      this.setOperationStatus(component, 'success');
      
      // Non-optimistic update
      if (!optimistic) {
        component.updateInternalValue(value);
        component.lastUpdatedTs = Date.now();
        this.emitValueChange(valueMsg, component.getComponentTag(), value, prevValue);
      }
      
      return true;
    } catch (error: any) {
      this.setOperationStatus(component, 'error', error?.message || String(error) || 'Operation failed');
      
      // Revert optimistic update on failure
      if (optimistic && !options._isRevert) {
        component.updateInternalValue(prevValue);
      }
      
      // Auto-retry logic
      if (options?.autoRetry && options.autoRetry.attempts > 0) {
        setTimeout(async () => {
          const retryOptions = {
            ...options,
            autoRetry: {
              attempts: options.autoRetry!.attempts - 1,
              delay: options.autoRetry!.delay
            }
          };
          await this.performValueOperation(component, value, valueMsg, retryOptions);
        }, options.autoRetry.delay);
      }
      
      return false;
    }
  }

  /**
   * Trigger read pulse for readonly components
   */
  static triggerReadPulse(component: any) {
    component.readPulseTs = Date.now();
    // Auto-hide pulse after animation
    setTimeout(() => {
      if (component.readPulseTs && Date.now() - component.readPulseTs >= 1500) {
        component.readPulseTs = undefined;
      }
    }, 1500);
  }

  /**
   * Start timestamp updater
   */
  static startTimestampUpdater(component: any): number {
    return window.setInterval(() => {
      component.timestampCounter++;
    }, 30000);
  }

  /**
   * Format relative timestamp
   */
  static formatTimestamp(timestamp?: number): string {
    if (!timestamp) return '';
    
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return '1w+ ago';
  }
}
