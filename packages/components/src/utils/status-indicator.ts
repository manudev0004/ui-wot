/**
 * Visual Badges for feedback, It shows operation status in UI components
 */

export type OperationStatus = 'idle' | 'loading' | 'success' | 'error';

export class StatusIndicator {
  /** CSS classes for status indicator with fixed position to reserves space */
  static getStatusClasses(status: OperationStatus): string {
    const base = 'ml-2 inline-flex items-center justify-center self-center w-5 h-5 min-w-[1.25rem] transition-all duration-300';

    if (status === 'idle') return `${base} opacity-0`;
    if (status === 'loading') return `${base} opacity-100`;
    if (status === 'success') return `${base} opacity-100 rounded-full bg-green-500 text-white`;
    if (status === 'error') return `${base} opacity-100 rounded-full bg-red-500 text-white`;

    return `${base} opacity-0`;
  }

  /** Apply status with auto-clear timers */
  static applyStatus(target: any, status: OperationStatus, errorMessage?: string) {
    if (!target) return;

    target.operationStatus = status;

    if (status === 'error') {
      target.lastError = errorMessage;
      setTimeout(() => {
        if (target.operationStatus === 'error') {
          target.operationStatus = 'idle';
          target.lastError = undefined;
        }
      }, 3000);
    } else if (status === 'success') {
      target.lastError = undefined;
      target.lastUpdatedTs = Date.now();
      setTimeout(() => {
        if (target.operationStatus === 'success') target.operationStatus = 'idle';
      }, 1200);
    } else if (status === 'idle') {
      target.lastError = undefined;
    }
  }

  /** Format timestamp and relative time for last updated */
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

  /** Complete render of status badge */
  static renderStatusBadge(status: OperationStatus, error?: string, h?: any): any {
    if (!h) return null;
    const classes = this.getStatusClasses(status);

    if (status === 'loading') {
      return h('span', { class: classes, title: 'Operation in progress...', innerHTML: this.loadingSVG() });
    }

    if (status === 'success') {
      return h('span', { class: classes, title: 'Operation completed successfully' }, this.successSVG(h));
    }

    if (status === 'error') {
      return h('span', { class: classes, title: error || 'Operation failed' }, this.errorSVG(h));
    }
    // Return empty span to reserve space and prevent layout shift
    return h('span', { class: classes, title: '' });
  }

  /** Render timestamp with auto-updating relative time */
  static renderTimestamp(lastUpdated: Date | null, theme: 'light' | 'dark', h?: any): any {
    if (!h) return null;

    const classes = `mt-2 text-xs font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`;

    if (lastUpdated) {
      const { full, relative } = this.formatTimestamp(lastUpdated);
      return h('div', { class: `${classes} timestamp space-y-1` }, [h('div', { class: 'last-updated' }, full), h('div', { class: 'relative-time italic opacity-75' }, relative)]);
    }
    // No timestamp: render invisible placeholders to reserve space and prevent layout shift
    const sample = this.formatTimestamp(new Date());
    return h('div', { class: `${classes} timestamp space-y-1` }, [
      h('div', { 'class': 'last-updated opacity-0', 'aria-hidden': 'true' }, sample.full),
      h('div', { 'class': 'relative-time italic opacity-0', 'aria-hidden': 'true' }, sample.relative),
    ]);
  }

  // ====================== SVG Icons =====================

  /** Success checkmark SVG */
  private static successSVG(h: any): any {
    return h(
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
  }

  /** Error cross mark SVG */
  private static errorSVG(h: any): any {
    return h(
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

  /** Loading spinner SVG */
  private static loadingSVG(): string {
    return `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" style="animation: spin 1s linear infinite;">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25" />
      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
    </svg>`;
  }
}
