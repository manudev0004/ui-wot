/**
 * Visual feedback Badges for showing operation status in UI components
 */

export interface StatusIndicatorOptions {
  theme: 'light' | 'dark';
  position?: 'right' | 'sibling-right';
}

export type OperationStatus = 'idle' | 'loading' | 'success' | 'error';

export class StatusIndicator {
  /**
   * SVG content for loading spinner
   */
  static getLoadingSpinnerSVG(): string {
    return `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" style="animation: spin 1s linear infinite;">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25" />
      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
    </svg>`;
  }

  /**
   * CSS classes for status indicator with positioning
   */
  static getStatusClasses(status: OperationStatus, options: StatusIndicatorOptions): string {
    const { position = 'right' } = options;

    const baseClasses =
      position === 'sibling-right'
        ? 'ml-2 inline-flex items-center justify-center self-center w-5 h-5 min-w-[1.25rem]'
        : 'w-4 h-4 flex items-center justify-center absolute -right-6 top-1/2 -translate-y-1/2 pointer-events-none';

    const statusClasses = {
  idle: 'opacity-0',
  loading: 'opacity-100',
  success: 'opacity-100 rounded-full bg-green-500 text-white',
  error: 'opacity-100 rounded-full bg-red-500 text-white',
    };

    return `${baseClasses} transition-all duration-300 ${statusClasses[status] || 'opacity-0'}`;
  }

  /** Unified state transition utility with consistent auto clear */
  static applyStatus(target: any, status: OperationStatus, opts?: { errorMessage?: string; successClearMs?: number; errorClearMs?: number; idleClear?: boolean }) {
    if (!target) return;
    const { errorMessage, successClearMs = 1200, errorClearMs = 3000 } = opts || {};
    target.operationStatus = status;
    if (status === 'error') {
      target.lastError = errorMessage;
      if (errorClearMs > 0)
        setTimeout(() => {
          if (target.operationStatus === 'error') {
            target.operationStatus = 'idle';
            target.lastError = undefined;
          }
        }, errorClearMs);
    } else if (status === 'success') {
      target.lastError = undefined;
      target.lastUpdatedTs = Date.now();
      if (successClearMs > 0)
        setTimeout(() => {
          if (target.operationStatus === 'success') target.operationStatus = 'idle';
        }, successClearMs);
    } else if (status === 'idle') {
      target.lastError = undefined;
    }
  }

  /**
   * Format timestamp with relative time
   */
  static formatTimestamp(date: Date): { full: string; relative: string } {
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    const full = `Last updated: ${date.toLocaleString()}`;

    let relative: string;
    if (diffMinutes < 1) relative = '(Just Now)';
    else if (diffMinutes < 60) relative = `(${diffMinutes}m ago)`;
    else if (diffHours < 24) relative = `(${diffHours}h ago)`;
    else if (diffDays < 7) relative = `(${diffDays}d ago)`;
    else relative = '(1w+ ago)';

    return { full, relative };
  }

  /**
   *Timestamp classes
   */
  static getTimestampClasses(theme: 'light' | 'dark'): string {
    return `mt-2 text-xs font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`;
  }

  /**
   * Tooltip text for statuses
   */
  static getStatusTooltip(status: OperationStatus, error?: string): string {
    const tooltips = {
      success: 'Operation completed successfully',
      error: error || 'Operation failed',
      loading: 'Operation in progress...',
      idle: '',
    };
    return tooltips[status] || '';
  }

  /**
   * Render complete status badge with simplified styling
   */
  static renderStatusBadge(
    status: OperationStatus,
    theme: 'light' | 'dark',
    error?: string,
    h?: any, // Stencil's h function
    options?: Partial<StatusIndicatorOptions>,
  ): any {
    if (status === 'idle' || !h) return null;

    const mergedOptions: StatusIndicatorOptions = { theme, position: 'right', ...options } as StatusIndicatorOptions;
    const classes = this.getStatusClasses(status, mergedOptions);
    const tooltip = this.getStatusTooltip(status, error);

    if (status === 'loading') {
      return h('span', {
        class: classes,
        title: tooltip,
        innerHTML: this.getLoadingSpinnerSVG(),
      });
    }

    // SVG icons gennreation based on the status of the operation
    let content: any = null;
    if (status === 'success') {
      content = h(
        'svg',
        {
          'viewBox': '0 0 16 16',
          'class': 'w-3 h-3',
          'fill': 'none',
          'stroke': 'currentColor',
          'stroke-width': '3',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        },
        [h('path', { d: 'M3 8.5l3.5 3.5L13 5' })],
      );
    } else if (status === 'error') {
      content = h(
        'svg',
        {
          'viewBox': '0 0 16 16',
          'class': 'w-3 h-3',
          'fill': 'none',
          'stroke': 'currentColor',
          'stroke-width': '3',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        },
        [h('path', { d: 'M4 4l8 8' }), h('path', { d: 'M12 4l-8 8' })],
      );
    }

    return h('span', { class: classes, title: tooltip }, content);
  }

  /**
   * Render timestamp with auto-updating relative time
   */
  static renderTimestamp(
    lastUpdated: Date | null,
    theme: 'light' | 'dark',
    h?: any, // Stencil's h function
  ): any {
    if (!lastUpdated || !h) return null;

    const { full, relative } = this.formatTimestamp(lastUpdated);
    const timestampClasses = this.getTimestampClasses(theme);
    const monoStyle = { 'font-family': 'var(--font-mono)' };

    return h('div', { class: `${timestampClasses} timestamp space-y-1`, style: monoStyle }, [
      h('div', { class: 'last-updated', style: monoStyle }, full),
      h('div', { class: 'relative-time italic opacity-75', style: monoStyle }, relative),
    ]);
  }
}
