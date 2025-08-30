/**
 * Status Lifecycle Management for UI-WoT Components
 * Provides unified success/error handling with auto-clear functionality
 */

import { emitStatusMsg } from './event-system';

export type StatusType = 'success' | 'error' | 'warning' | 'info' | 'idle';

export interface StatusState {
  type: StatusType;
  message: string;
  timestamp: number;
  autoClears: boolean;
  clearDelay?: number;
}

export interface StatusOptions {
  /** Message to display */
  message: string;
  /** Auto-clear after delay (ms) */
  autoClear?: number;
  /** Emit status change event */
  emit?: boolean;
  /** Replace existing status or queue */
  replace?: boolean;
  /** Additional context for debugging */
  context?: Record<string, any>;
}

/**
 * Status manager for individual components
 */
export class ComponentStatusManager {
  private currentStatus: StatusState | null = null;
  private clearTimer: NodeJS.Timeout | null = null;
  private statusHistory: StatusState[] = [];
  private maxHistorySize = 10;
  
  constructor(
    private element: HTMLElement,
    private componentName: string
  ) {}
  
  /**
   * Set success status
   */
  setSuccess(options: StatusOptions): void {
    this.setStatus('success', options);
  }
  
  /**
   * Set error status
   */
  setError(options: StatusOptions): void {
    this.setStatus('error', options);
  }
  
  /**
   * Set warning status
   */
  setWarning(options: StatusOptions): void {
    this.setStatus('warning', options);
  }
  
  /**
   * Set info status
   */
  setInfo(options: StatusOptions): void {
    this.setStatus('info', options);
  }
  
  /**
   * Clear current status
   */
  clear(): void {
    if (this.clearTimer) {
      clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }
    
    const previousStatus = this.currentStatus;
    this.currentStatus = {
      type: 'idle',
      message: '',
      timestamp: Date.now(),
      autoClears: false
    };
    
    this.updateElementState();
    
    if (previousStatus && previousStatus.type !== 'idle') {
      emitStatusMsg(this.element, this.componentName, 'info', 'Status cleared');
    }
  }
  
  /**
   * Get current status
   */
  getStatus(): StatusState | null {
    return this.currentStatus;
  }
  
  /**
   * Get status history
   */
  getHistory(): StatusState[] {
    return [...this.statusHistory];
  }
  
  /**
   * Check if component has active status
   */
  hasActiveStatus(): boolean {
    return this.currentStatus?.type !== 'idle' && this.currentStatus?.type !== undefined;
  }
  
  /**
   * Check if component has specific status type
   */
  hasStatus(type: StatusType): boolean {
    return this.currentStatus?.type === type;
  }
  
  private setStatus(type: StatusType, options: StatusOptions): void {
    const {
      message,
      autoClear = type === 'success' ? 3000 : undefined,
      emit = true,
      replace = true,
      context = {}
    } = options;
    
    // Clear existing timer if replacing
    if (replace && this.clearTimer) {
      clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }
    
    // Create new status
    const newStatus: StatusState = {
      type,
      message,
      timestamp: Date.now(),
      autoClears: autoClear !== undefined,
      clearDelay: autoClear
    };
    
    // Update current status
    if (this.currentStatus) {
      this.addToHistory(this.currentStatus);
    }
    this.currentStatus = newStatus;
    
    // Update element state
    this.updateElementState();
    
    // Emit event if requested
    if (emit && type !== 'idle') {
      emitStatusMsg(this.element, this.componentName, type as 'success' | 'error' | 'warning' | 'info', message, {
        meta: {
          type: 'system',
          context: {
            autoClear,
            ...context
          }
        }
      });
    }
    
    // Set auto-clear timer
    if (autoClear) {
      this.clearTimer = setTimeout(() => {
        this.clear();
      }, autoClear);
    }
  }
  
  private addToHistory(status: StatusState): void {
    this.statusHistory.unshift(status);
    if (this.statusHistory.length > this.maxHistorySize) {
      this.statusHistory = this.statusHistory.slice(0, this.maxHistorySize);
    }
  }
  
  private updateElementState(): void {
    if (!this.currentStatus) return;
    
    // Remove all status classes
    this.element.classList.remove(
      'ui-status-success',
      'ui-status-error', 
      'ui-status-warning',
      'ui-status-info',
      'ui-status-idle'
    );
    
    // Add current status class
    this.element.classList.add(`ui-status-${this.currentStatus.type}`);
    
    // Set data attributes for CSS targeting
    this.element.setAttribute('data-status', this.currentStatus.type);
    this.element.setAttribute('data-status-message', this.currentStatus.message);
    
    // Set CSS custom properties for dynamic styling
    this.element.style.setProperty('--ui-status-type', this.currentStatus.type);
  }
}

/**
 * Global status manager registry
 */
class GlobalStatusManager {
  private managers = new Map<string, ComponentStatusManager>();
  
  /**
   * Get or create status manager for component
   */
  getManager(element: HTMLElement, componentName: string): ComponentStatusManager {
    const key = this.getElementKey(element);
    
    if (!this.managers.has(key)) {
      this.managers.set(key, new ComponentStatusManager(element, componentName));
    }
    
    return this.managers.get(key)!;
  }
  
  /**
   * Remove status manager for component
   */
  removeManager(element: HTMLElement): void {
    const key = this.getElementKey(element);
    const manager = this.managers.get(key);
    
    if (manager) {
      manager.clear();
      this.managers.delete(key);
    }
  }
  
  /**
   * Clear all statuses
   */
  clearAll(): void {
    this.managers.forEach(manager => manager.clear());
  }
  
  /**
   * Get all active statuses
   */
  getAllActive(): Array<{ element: HTMLElement; status: StatusState }> {
    const active: Array<{ element: HTMLElement; status: StatusState }> = [];
    
    this.managers.forEach((manager, key) => {
      const status = manager.getStatus();
      if (status && status.type !== 'idle') {
        const element = this.getElementFromKey(key);
        if (element) {
          active.push({ element, status });
        }
      }
    });
    
    return active;
  }
  
  private getElementKey(element: HTMLElement): string {
    // Use element ID if available, otherwise create unique identifier
    return element.id || `${element.tagName.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private getElementFromKey(key: string): HTMLElement | null {
    // Try to find element by ID first
    if (key.includes('-')) {
      const potentialId = key.split('-')[0];
      const element = document.getElementById(potentialId);
      if (element) return element;
    }
    
    return document.getElementById(key);
  }
}

// Global instance
const globalStatusManager = new GlobalStatusManager();

/**
 * Get status manager for component
 */
export function getStatusManager(element: HTMLElement, componentName: string): ComponentStatusManager {
  return globalStatusManager.getManager(element, componentName);
}

/**
 * Quick status utilities for components
 */
export function setSuccess(element: HTMLElement, componentName: string, options: StatusOptions): void {
  getStatusManager(element, componentName).setSuccess(options);
}

export function setError(element: HTMLElement, componentName: string, options: StatusOptions): void {
  getStatusManager(element, componentName).setError(options);
}

export function setWarning(element: HTMLElement, componentName: string, options: StatusOptions): void {
  getStatusManager(element, componentName).setWarning(options);
}

export function setInfo(element: HTMLElement, componentName: string, options: StatusOptions): void {
  getStatusManager(element, componentName).setInfo(options);
}

export function clearStatus(element: HTMLElement, componentName: string): void {
  getStatusManager(element, componentName).clear();
}

/**
 * Component lifecycle helpers
 */
export function onComponentDisconnected(element: HTMLElement): void {
  globalStatusManager.removeManager(element);
}

export function clearAllStatuses(): void {
  globalStatusManager.clearAll();
}

export function getAllActiveStatuses(): Array<{ element: HTMLElement; status: StatusState }> {
  return globalStatusManager.getAllActive();
}
