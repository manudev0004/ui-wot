/**
 * Visual feedback utility for showing operation status in UI components
 */

export interface StatusIndicatorOptions {
  theme: 'light' | 'dark';
  size?: 'small' | 'medium' | 'large';
  position?: 'top-right' | 'bottom-right' | 'center';
}

export type OperationStatus = 'idle' | 'loading' | 'success' | 'error' | 'warning';

export class StatusIndicator {
  /**
   * Get CSS classes for status indicator
   */
  static getStatusClasses(
    status: OperationStatus, 
    options: StatusIndicatorOptions
  ): string {
    const { theme, size = 'small', position = 'top-right' } = options;
    
    let baseClasses = 'absolute transition-all duration-300 flex items-center justify-center';
    
    // Size classes
    switch (size) {
      case 'small':
        baseClasses += ' w-3 h-3 text-xs';
        break;
      case 'medium':
        baseClasses += ' w-4 h-4 text-sm';
        break;
      case 'large':
        baseClasses += ' w-5 h-5 text-base';
        break;
    }
    
    // Position classes
    switch (position) {
      case 'top-right':
        baseClasses += ' -top-1 -right-1';
        break;
      case 'bottom-right':
        baseClasses += ' -bottom-1 -right-1';
        break;
      case 'center':
        baseClasses += ' top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
        break;
    }
    
    // Status-specific classes
    switch (status) {
      case 'idle':
        return baseClasses + ' opacity-0';
      
      case 'loading':
        baseClasses += ' rounded-full animate-spin border-2 border-transparent';
        if (theme === 'dark') {
          baseClasses += ' border-t-gray-300';
        } else {
          baseClasses += ' border-t-gray-600';
        }
        return baseClasses;
      
      case 'success':
        baseClasses += ' rounded-full bg-green-500 text-white opacity-100';
        return baseClasses;
      
      case 'error':
        baseClasses += ' rounded-full bg-red-500 text-white opacity-100';
        return baseClasses;
      
      case 'warning':
        baseClasses += ' rounded-full bg-yellow-500 text-gray-900 opacity-100';
        return baseClasses;
      
      default:
        return baseClasses + ' opacity-0';
    }
  }

  /**
   * Get appropriate icon for status
   */
  static getStatusIcon(status: OperationStatus): string {
    switch (status) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '!';
      case 'loading':
        return ''; // Spinner handled by CSS
      default:
        return '';
    }
  }

  /**
   * Get tooltip text for status
   */
  static getStatusTooltip(status: OperationStatus, error?: string): string {
    switch (status) {
      case 'success':
        return 'Operation completed successfully';
      case 'error':
        return error || 'Operation failed';
      case 'warning':
        return 'Operation completed with warnings';
      case 'loading':
        return 'Operation in progress...';
      default:
        return '';
    }
  }

  /**
   * Get status indicator configuration object
   */
  static getIndicatorConfig(
    status: OperationStatus, 
    options: StatusIndicatorOptions,
    error?: string
  ): { classes: string; icon: string; tooltip: string } | null {
    if (status === 'idle') return null;

    const classes = this.getStatusClasses(status, options);
    const icon = this.getStatusIcon(status);
    const tooltip = this.getStatusTooltip(status, error);

    return { classes, icon, tooltip };
  }
}

/**
 * Mixin for components to add status indicator functionality
 */
export interface StatusIndicatorMixin {
  operationStatus: OperationStatus;
  lastError?: string;
  
  setStatus(status: OperationStatus, error?: string): void;
  clearStatus(delay?: number): void;
  showSuccessStatus(delay?: number): void;
  showErrorStatus(error: string, delay?: number): void;
}

export function createStatusMixin(): Partial<StatusIndicatorMixin> {
  return {
    operationStatus: 'idle' as OperationStatus,
    lastError: undefined,

    setStatus(status: OperationStatus, error?: string) {
      this.operationStatus = status;
      this.lastError = error;
    },

    clearStatus(delay: number = 2000) {
      setTimeout(() => {
        this.operationStatus = 'idle';
        this.lastError = undefined;
      }, delay);
    },

    showSuccessStatus(delay: number = 2000) {
      this.setStatus('success');
      this.clearStatus(delay);
    },

    showErrorStatus(error: string, delay: number = 5000) {
      this.setStatus('error', error);
      this.clearStatus(delay);
    }
  };
}
