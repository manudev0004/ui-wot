/**
 * Visual feedback utility for showing operation status in UI components
 * Unified system for consistent status indicators across all components
 */

export interface StatusIndicatorOptions {
  theme: 'light' | 'dark';
  size?: 'small' | 'medium' | 'large';
  position?: 'right' | 'inline-right' | 'top-right' | 'bottom-right' | 'center' | 'sibling-right';
}

export type OperationStatus = 'idle' | 'loading' | 'success' | 'error' | 'warning';

export class StatusIndicator {
  /**
   * Get inline styles for loading spinner animation
   */
  static getLoadingSpinnerStyle(): { [key: string]: string } {
    return {
      animation: 'spin 1s linear infinite'
    };
  }

  /**
   * Get SVG content for loading spinner
   */
  static getLoadingSpinnerSVG(theme: 'light' | 'dark'): string {
    const color = theme === 'dark' ? '#60a5fa' : '#3b82f6'; // blue-400 : blue-500
    const bgColor = theme === 'dark' ? '#374151' : '#e5e7eb'; // gray-700 : gray-200
    
    return `<svg class="w-4 h-4" viewBox="0 0 24 24" style="animation: spin 1s linear infinite;">
      <circle cx="12" cy="12" r="10" stroke="${bgColor}" stroke-width="4" fill="none" />
      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="${color}" />
    </svg>`;
  }

  /**
   * Get CSS keyframes for spinner animation (to be added to component styles)
   */
  static getSpinnerKeyframes(): string {
    return `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
  }

  /**
   * Get standard positioning classes for consistent right-aligned indicators
   */
  static getStandardClasses(): string {
  return 'absolute -right-6 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center transition-all duration-300';
  }

  /**
   * Get CSS classes for status indicator with unified positioning
   */
  static getStatusClasses(
    status: OperationStatus, 
    options: StatusIndicatorOptions
  ): string {
    const { theme, size = 'small', position = 'right' } = options;
    
  let baseClasses = 'absolute transition-all duration-300 flex items-center justify-center';
    
    // Size classes
    switch (size) {
      case 'small':
        baseClasses += ' w-4 h-4 text-xs';
        break;
      case 'medium':
        baseClasses += ' w-5 h-5 text-sm';
        break;
      case 'large':
        baseClasses += ' w-6 h-6 text-base';
        break;
    }
    
    // Position classes - standardized to right side with proper margin
    switch (position) {
      case 'right':
        baseClasses += ' -right-6 top-1/2 -translate-y-1/2';
        break;
      case 'inline-right':
        // Slightly closer to the host edge for inline usage (e.g., inside buttons)
        baseClasses += ' -right-4 top-1/2 -translate-y-1/2';
        break;
      case 'sibling-right':
        // Render as a normal inline sibling (no absolute positioning). Caller should place this next to the control inside a flex container.
  baseClasses = 'ml-2 flex items-center justify-center self-center transition-all duration-300';
        break;
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
    
    // Status-specific classes with unified colors
    switch (status) {
      case 'idle':
  return baseClasses + ' opacity-0';
      
      case 'loading':
  // Return empty content - we'll render SVG separately
  return baseClasses + ' opacity-100';
      
      case 'success':
        if (position === 'sibling-right') {
          baseClasses += ' rounded-full bg-green-500 text-white p-1';
        } else if (theme === 'dark') {
          baseClasses += ' rounded-full bg-green-400 text-gray-900';
        } else {
          baseClasses += ' rounded-full bg-green-500 text-white';
        }
        return baseClasses + ' opacity-100';
      
      case 'error':
        if (position === 'sibling-right') {
          baseClasses += ' rounded-full bg-red-500 text-white p-1';
        } else if (theme === 'dark') {
          baseClasses += ' rounded-full bg-red-400 text-gray-900';
        } else {
          baseClasses += ' rounded-full bg-red-500 text-white';
        }
        return baseClasses + ' opacity-100';
      
      case 'warning':
        if (position === 'sibling-right') {
          baseClasses += ' rounded-full bg-yellow-500 text-gray-900 p-1';
        } else if (theme === 'dark') {
          baseClasses += ' rounded-full bg-yellow-400 text-gray-900';
        } else {
          baseClasses += ' rounded-full bg-yellow-500 text-gray-900';
        }
        return baseClasses + ' opacity-100';
      
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
        return 'success'; // symbolic key - rendered as SVG in renderStatusBadge
      case 'error':
        return 'error'; // symbolic key
      case 'warning':
        return 'warning';
      case 'loading':
        return ''; // Spinner handled by CSS
      default:
        return '';
    }
  }

  /** Unified state transition utility (applies consistent auto clear semantics) */
  static applyStatus(target: any, status: OperationStatus, opts?: { errorMessage?: string; successClearMs?: number; errorClearMs?: number; idleClear?: boolean }) {
    if (!target) return;
    const { errorMessage, successClearMs = 1200, errorClearMs = 3000 } = opts || {};
    target.operationStatus = status;
    if (status === 'error') {
      target.lastError = errorMessage;
      if (errorClearMs > 0) setTimeout(() => { if (target.operationStatus === 'error') { target.operationStatus = 'idle'; target.lastError = undefined; } }, errorClearMs);
    } else if (status === 'success') {
      target.lastError = undefined;
      target.lastUpdatedTs = Date.now();
      if (successClearMs > 0) setTimeout(() => { if (target.operationStatus === 'success') target.operationStatus = 'idle'; }, successClearMs);
    } else if (status === 'idle') {
      target.lastError = undefined;
    }
  }

  /**
   * Format timestamp with detailed date/time and relative time
   */
  static formatTimestamp(date: Date): { full: string; relative: string } {
  const now = new Date();
  // Compute difference in ms (now - date). If date is in the future due to
  // minor clock skew or serialization issues, clamp to 0 so we don't show
  // misleading negative values that lead to "(Just Now)" for older items.
  let diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) diffMs = 0;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Full timestamp format
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
  // Use toLocaleString for a full date+time representation in user's locale
  const full = `Last updated: ${date.toLocaleString('en-US', options)}`;

    // Relative time
    let relative: string;
    if (diffMinutes < 1) {
      relative = '(Just Now)';
    } else if (diffMinutes < 60) {
      relative = `(${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago)`;
    } else if (diffHours < 24) {
      relative = `(${diffHours} hour${diffHours !== 1 ? 's' : ''} ago)`;
    } else if (diffDays < 7) {
      relative = `(${diffDays} day${diffDays !== 1 ? 's' : ''} ago)`;
    } else {
      relative = '(more than a week ago)';
    }

    return { full, relative };
  }

  /**
   * Get unified timestamp classes
   */
  static getTimestampClasses(theme: 'light' | 'dark'): { container: string; full: string; relative: string } {
  const baseText = (theme === 'dark' ? 'text-gray-400' : 'text-gray-500') + ' font-[\'Fira Mono\']';
  const relativeText = (theme === 'dark' ? 'text-gray-500' : 'text-gray-400') + ' italic font-[\'Fira Mono\']';
    
    return {
  container: 'mt-2 text-xs space-y-1 font-[\'Fira Mono\']',
      full: `${baseText}`,
      relative: `${relativeText} italic`
    };
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
   * Render complete status badge with consistent styling and positioning
   */
  static renderStatusBadge(
    status: OperationStatus, 
    theme: 'light' | 'dark', 
    error?: string,
    h?: any, // Stencil's h function
    options?: Partial<StatusIndicatorOptions>
  ): any {
    if (status === 'idle' || !h) return null;

    const mergedOptions: StatusIndicatorOptions = { theme, position: 'right', size: 'small', ...options } as StatusIndicatorOptions;
    const classes = this.getStatusClasses(status, mergedOptions);
    const tooltip = this.getStatusTooltip(status, error);

    if (status === 'loading') {
      return h('span', {
        class: classes,
        title: tooltip,
        innerHTML: this.getLoadingSpinnerSVG(theme)
      });
    }

    // Use SVG icons for consistent appearance (avoids font differences)
    let content: any = null;
    const symbolic = this.getStatusIcon(status);
    if (symbolic === 'success') {
      content = h('svg', {
        viewBox: '0 0 16 16',
        class: 'w-3 h-3',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '3',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      }, [
        h('path', { d: 'M3 8.5l3.5 3.5L13 5' })
      ]);
    } else if (symbolic === 'error') {
      content = h('svg', {
        viewBox: '0 0 16 16',
        class: 'w-3 h-3',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '3',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      }, [
        h('path', { d: 'M4 4l8 8' }),
        h('path', { d: 'M12 4l-8 8' })
      ]);
    } else if (symbolic === 'warning') {
      content = h('svg', {
        viewBox: '0 0 16 16',
        class: 'w-3 h-3',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      }, [
        h('path', { d: 'M8 3l6 10H2L8 3z' }),
        h('path', { d: 'M8 6v3' }),
        h('circle', { cx: '8', cy: '11.5', r: '0.75', fill: 'currentColor', stroke: 'none' })
      ]);
    }

    return h('span', { class: classes, title: tooltip }, content);
  }

  /**
   * Render timestamp with auto-updating relative time
   */
  static renderTimestamp(
    lastUpdated: Date | null,
    theme: 'light' | 'dark',
    h?: any // Stencil's h function
  ): any {
    if (!lastUpdated || !h) return null;

    const { full, relative } = this.formatTimestamp(lastUpdated);
    const timestampClasses = this.getTimestampClasses(theme);
    const monoStyle = { 'font-family': "var(--font-mono, 'Fira Mono', monospace)" };

    return h('div', { class: timestampClasses.container + ' timestamp', style: monoStyle }, [
      h('div', { class: timestampClasses.full + ' last-updated', style: monoStyle }, full),
      h('div', { class: timestampClasses.relative + ' relative-time', style: monoStyle }, relative)
    ]);
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
