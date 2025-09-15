import { Component, Prop, State, h, Watch, Event, EventEmitter, Method, Element } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { StatusIndicator } from '../../utils/status-indicator';

export interface UiCalendarDateChange {
  value: string;
  date: Date;
  formattedValue: string;
}

export interface UiCalendarValueChange {
  value: string;
  date: Date;
  formattedValue: string;
}

/**
 * Advanced calendar component with comprehensive styling, variants, and features.
 * Matches the design family of ui-button, ui-slider, and other components.
 *
 * @example Basic Usage
 * ```html
 * <ui-calendar variant="outlined" color="primary" label="Select Date"></ui-calendar>
 * ```
 *
 * @example Different Variants & Colors
 * ```html
 * <ui-calendar variant="minimal" color="secondary" label="Minimal Calendar"></ui-calendar>
 * <ui-calendar variant="filled" color="primary" label="Filled Calendar"></ui-calendar>
 * <ui-calendar variant="outlined" color="neutral" label="Outlined Calendar"></ui-calendar>
 * ```
 *
 * @example Sizes & Features
 * ```html
 * <ui-calendar size="large" include-time="true" label="Large with Time"></ui-calendar>
 * <ui-calendar size="small" inline="true" label="Small Inline"></ui-calendar>
 * ```
 *
 * @example Dark Theme
 * ```html
 * <ui-calendar theme="dark" variant="filled" color="primary"></ui-calendar>
 * ```
 */
@Component({
  tag: 'ui-calendar',
  styleUrl: 'ui-calendar.css',
  shadow: true,
})
export class UiCalendar {
  @Element() el!: HTMLElement;

  /**
   * Visual style variant matching component family design.
   * - minimal: Clean, borderless design with subtle hover effects
   * - outlined: Border with transparent background, colored accents
   * - filled: Solid background with contrasting text
   * - elevated: Shadow and depth for prominent display
   */
  @Prop() variant: 'minimal' | 'outlined' | 'filled' | 'elevated' = 'minimal';

  /**
   * Component size for different use cases.
   * - small: Compact calendar for tight spaces
   * - medium: Standard size (default)
   * - large: Prominent calendar with larger touch targets
   */
  @Prop() size: 'small' | 'medium' | 'large' = 'medium';

  /**
   * Whether the component is disabled (cannot be interacted with).
   * @example
   * ```html
   * <ui-calendar disabled="true" label="Cannot select"></ui-calendar>
   * ```
   */
  @Prop() disabled: boolean = false;

  /**
   * Dark theme variant.
   * @example
   * ```html
   * <ui-calendar dark="true" variant="filled"></ui-calendar>
   * ```
   */
  @Prop() dark: boolean = false;

  /**
   * Color scheme matching the component family palette.
   * - primary: Main brand color (blue tones)
   * - secondary: Accent color (green/teal tones)
   * - neutral: Grayscale for subtle integration
   * - success: Green for positive actions
   * - warning: Orange for caution
   * - danger: Red for destructive actions
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'danger' = 'primary';

  /**
   * Optional text label for the calendar with enhanced styling.
   * @example
   * ```html
   * <ui-calendar label="Select Date"></ui-calendar>
   * ```
   */
  @Prop() label?: string;

  /**
   * Whether the component is read-only (displays value but cannot be changed).
   * @example
   * ```html
   * <ui-calendar readonly="true" value="2023-12-25"></ui-calendar>
   * ```
   */
  @Prop() readonly: boolean = false;

  /**
   * Enable keyboard navigation and shortcuts.
   * @example
   * ```html
   * <ui-calendar keyboard="false"></ui-calendar>
   * ```
   */
  @Prop() keyboard: boolean = true;

  /**
   * Show last updated timestamp below the component.
   * @example
   * ```html
   * <ui-calendar showLastUpdated="true"></ui-calendar>
   * ```
   */
  @Prop() showLastUpdated: boolean = false;

  /**
   * Show status badge when true
   */
  @Prop() showStatus: boolean = true;

  /**
   * Display calendar inline instead of as dropdown popup.
   * Perfect for always-visible date selection.
   */
  @Prop() inline: boolean = false;

  /**
   * Include time picker alongside date picker.
   * Supports hour:minute selection with AM/PM or 24-hour format.
   */
  @Prop() includeTime: boolean = false;

  /**
   * Time format when includeTime is enabled.
   * - 12: 12-hour format with AM/PM
   * - 24: 24-hour format
   */
  @Prop() timeFormat: '12' | '24' = '12';

  /**
   * Show week numbers in calendar grid.
   */
  @Prop() showWeekNumbers: boolean = false;

  /**
   * First day of week (0 = Sunday, 1 = Monday).
   */
  @Prop() firstDayOfWeek: 0 | 1 = 0;

  /**
   * Show today button for quick navigation.
   */
  @Prop() showTodayButton: boolean = true;

  /**
   * Show clear button to reset selection.
   */
  @Prop() showClearButton: boolean = true;

  /**
   * Animation style for transitions.
   * - none: No animations
   * - slide: Slide transitions between months
   * - fade: Fade transitions
   * - bounce: Playful bounce effects
   */
  @Prop() animation: 'none' | 'slide' | 'fade' | 'bounce' = 'slide';

  /**
   * Current selected date-time value (ISO string).
   */
  @Prop({ mutable: true }) value?: string;

  /**
   * Minimum selectable date (ISO string).
   */
  @Prop() minDate?: string;

  /**
   * Maximum selectable date (ISO string).
   */
  @Prop() maxDate?: string;

  /** Connection state for readonly mode */
  @Prop({ mutable: true }) connected: boolean = true;

  /**
   * Thing Description URL for device control.
   */
  // TD integration removed: use events or external handlers instead

  /** Current selected date */
  @State() selectedDate: Date = new Date();

  /** Current view (month/year) */
  @State() currentMonth: number = new Date().getMonth();
  @State() currentYear: number = new Date().getFullYear();

  /** Calendar open state */
  @State() isOpen: boolean = false;

  /** Time picker state */
  @State() selectedHour: number = 12;
  @State() selectedMinute: number = 0;
  @State() isAM: boolean = true;
  @State() showClockView: boolean = false;

  private inputEl?: HTMLInputElement | null;
  private calendarEl?: HTMLElement | null;
  private previouslyFocused?: Element | null;

  private onDocumentKeyDown = (e: KeyboardEvent) => {
    if (!this.isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.closeCalendar();
      return;
    }

    if (e.key === 'Tab') {
      // trap focus inside the calendar when open
      const container = this.calendarEl;
      if (!container) return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(
        el => !el.hasAttribute('disabled'),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  private openCalendar() {
    this.previouslyFocused = document.activeElement;
    this.isOpen = true;
    // wait for calendar to render
    setTimeout(() => {
      const container = this.calendarEl;
      const first = container?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (first) first.focus();
      document.addEventListener('keydown', this.onDocumentKeyDown);
    }, 0);
  }

  private closeCalendar() {
    this.isOpen = false;
    document.removeEventListener('keydown', this.onDocumentKeyDown);
    if (this.previouslyFocused && (this.previouslyFocused as HTMLElement).focus) {
      try {
        (this.previouslyFocused as HTMLElement).focus();
      } catch (e) {
        /* ignore */
      }
    } else if (this.inputEl) {
      try {
        this.inputEl.focus();
      } catch (e) {
        /* ignore */
      }
    }
  }

  private toggleOpen = () => {
    if (this.isOpen) this.closeCalendar();
    else this.openCalendar();
  };

  /** Success feedback state */
  @State() showSuccess: boolean = false;

  /** Last error message */
  @State() errorMessage?: string;

  /** Event emitted when date changes */
  @Event() dateChange: EventEmitter<UiCalendarDateChange>;

  /** Standardized valueChange event for calendar */
  @Event() valueChange: EventEmitter<UiCalendarValueChange>;

  /**
   * Standardized value event emitter - emits UiMsg<string> with enhanced metadata.
   * Provides consistent value change notifications with unified messaging format.
   * @example
   * ```typescript
   * calendar.addEventListener('valueMsg', (e) => {
   *   console.log('Date changed:', e.detail.value);
   *   console.log('Metadata:', e.detail.metadata);
   * });
   * ```
   */
  @Event() valueMsg: EventEmitter<UiMsg<string>>;

  // Unified status indicator states
  @State() operationStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  @State() lastError?: string;
  @State() lastUpdatedTs?: number;
  @State() timestampUpdateTimer?: number;
  @State() private timestampCounter = 0;

  /** Stored write operation for user interaction */
  private storedWriteOperation?: (value: string) => Promise<any>;

  /** Helper method to update value and timestamps consistently */
  private updateValue(value: string, prevValue?: string, emitEvent: boolean = true): void {
    this.value = value;

    if (value) {
      this.selectedDate = new Date(value);
      this.currentMonth = this.selectedDate.getMonth();
      this.currentYear = this.selectedDate.getFullYear();
    }

    this.lastUpdatedTs = Date.now();

    if (emitEvent) {
      this.emitValueEvents(value, prevValue);
    }
  }

  /** Helper method to emit all value events consistently */
  private emitValueEvents(value: string, prevValue?: string): void {
    // Emit standardized event
    this.valueMsg.emit({
      newVal: value,
      prevVal: prevValue,
      ts: Date.now(),
      source: this.el?.id || 'ui-calendar',
      ok: true,
      meta: {
        component: 'ui-calendar',
        type: 'setValue',
        source: 'method',
      },
    });

    // Emit legacy events for backward compatibility
    this.dateChange.emit({
      value: value,
      date: this.selectedDate,
      formattedValue: this.getDisplayValue(),
    });

    this.valueChange.emit({
      value: value,
      date: this.selectedDate,
      formattedValue: this.getDisplayValue(),
    });
  }

  /** Watch for TD URL changes */
  // TD watcher removed

  /** Watch for value prop changes */
  @Watch('value')
  watchValue() {
    if (this.value) {
      this.selectedDate = new Date(this.value);
      this.currentMonth = this.selectedDate.getMonth();
      this.currentYear = this.selectedDate.getFullYear();
    }
  }

  /** Initialize component */
  async componentWillLoad() {
    if (this.value) {
      this.selectedDate = new Date(this.value);
      this.currentMonth = this.selectedDate.getMonth();
      this.currentYear = this.selectedDate.getFullYear();
    }

    // Initialize timestamp auto-update timer if showLastUpdated is enabled
    if (this.showLastUpdated && this.lastUpdatedTs) {
      this.timestampUpdateTimer = window.setInterval(() => {
        // Force re-render to update relative timestamp
        this.timestampCounter++;
      }, 60000); // Update every 60 seconds
    }
  }

  /** Cleanup component */
  disconnectedCallback() {
    if (this.timestampUpdateTimer) {
      clearInterval(this.timestampUpdateTimer);
    }
  }

  /** Handle date selection */
  private async handleDateSelect(day: number) {
    if (this.disabled) return;

    const newDate = new Date(this.currentYear, this.currentMonth, day);

    // Preserve time if includeTime is enabled
    if (this.includeTime && this.selectedDate) {
      newDate.setHours(this.selectedDate.getHours());
      newDate.setMinutes(this.selectedDate.getMinutes());
    }

    const prevValue = this.value;
    const newValue = newDate.toISOString();

    try {
      if (this.storedWriteOperation) {
        StatusIndicator.applyStatus(this, 'loading');
        this.updateValue(newValue, prevValue);
        await this.storedWriteOperation(newValue);
        StatusIndicator.applyStatus(this, 'success');
      } else {
        this.updateValue(newValue, prevValue);
      }

      this.isOpen = false;
    } catch (error) {
      console.error('handleDateSelect error for ui-calendar:', error);
      this.updateValue(prevValue!, newValue, false); // Revert on error
      StatusIndicator.applyStatus(this, 'error', 'Operation failed');
    }
  }

  /** Handle time change */
  private async handleTimeChange(event: Event) {
    if (this.disabled) return;

    const target = event.target as HTMLInputElement;
    const [hours, minutes] = target.value.split(':').map(Number);

    const newDate = new Date(this.selectedDate);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);

    this.selectedDate = newDate;
    this.value = newDate.toISOString();

    // Emit standardized event
    this.valueMsg.emit({
      newVal: this.value,
      prevVal: undefined,
      ts: Date.now(),
      source: this.el?.id || 'ui-calendar',
      ok: true,
      meta: {
        component: 'ui-calendar',
        type: 'timeChange',
        source: 'user',
      },
    });

    this.dateChange.emit({
      value: this.value,
      date: this.selectedDate,
      formattedValue: this.getDisplayValue(),
    });

    // Local control only: external integrations should listen to the `dateChange` event.
  }

  /** Clock interface methods */
  private updateTimeFromClock() {
    if (!this.selectedDate) this.selectedDate = new Date();

    const newDate = new Date(this.selectedDate);
    let hours = this.selectedHour;

    if (this.timeFormat === '12') {
      if (this.selectedHour === 12) {
        hours = this.isAM ? 0 : 12;
      } else {
        hours = this.isAM ? this.selectedHour : this.selectedHour + 12;
      }
    }

    newDate.setHours(hours);
    newDate.setMinutes(this.selectedMinute);

    this.selectedDate = newDate;
    this.value = newDate.toISOString();

    // Emit standardized event
    this.valueMsg.emit({
      newVal: this.value,
      prevVal: undefined,
      ts: Date.now(),
      source: this.el?.id || 'ui-calendar',
      ok: true,
      meta: {
        component: 'ui-calendar',
        type: 'clockChange',
        source: 'user',
      },
    });

    this.dateChange.emit({
      value: this.value,
      date: this.selectedDate,
      formattedValue: this.getDisplayValue(),
    });
  }

  private updateClockFromSelectedDate() {
    if (!this.selectedDate) return;

    const hours = this.selectedDate.getHours();
    const minutes = this.selectedDate.getMinutes();

    if (this.timeFormat === '12') {
      if (hours === 0) {
        this.selectedHour = 12;
        this.isAM = true;
      } else if (hours === 12) {
        this.selectedHour = 12;
        this.isAM = false;
      } else if (hours > 12) {
        this.selectedHour = hours - 12;
        this.isAM = false;
      } else {
        this.selectedHour = hours;
        this.isAM = true;
      }
    } else {
      this.selectedHour = hours;
    }

    this.selectedMinute = minutes;
  }

  private setHour(hour: number) {
    this.selectedHour = hour;
    this.updateTimeFromClock();
  }

  private setMinute(minute: number) {
    this.selectedMinute = minute;
    this.updateTimeFromClock();
  }

  private toggleAMPM() {
    this.isAM = !this.isAM;
    this.updateTimeFromClock();
  }

  private toggleClockView() {
    this.showClockView = !this.showClockView;
    if (this.showClockView) {
      this.updateClockFromSelectedDate();
    }
  }

  /** Navigate month */
  private navigateMonth(direction: number) {
    let newMonth = this.currentMonth + direction;
    let newYear = this.currentYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    this.currentMonth = newMonth;
    this.currentYear = newYear;
  }

  /** Get comprehensive calendar styles matching component family design */
  private getCalendarStyles() {
    const isDisabled = this.disabled;
    const isReadonly = this.readonly;
    const colorVars = this.getColorVars();

    // Base container styles
    let containerClass = `relative ${this.inline ? 'block' : 'inline-block'}`;

    // Enhanced input styles with family consistency
    let inputClass = `w-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
      this.size === 'small' ? 'px-2 py-1 text-xs' : this.size === 'large' ? 'px-4 py-3 text-base' : 'px-3 py-2 text-sm'
    } ${isDisabled || isReadonly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`;

    // Calendar popup/inline styles with enhanced design
    let calendarClass = `${this.inline ? 'relative' : 'absolute top-full left-0 mt-1 z-50'} ${
      this.dark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
    } border rounded-lg shadow-lg p-4 ${this.size === 'small' ? 'min-w-64' : this.size === 'large' ? 'min-w-80' : 'min-w-72'}`;

    // Inline styles for CSS variable colors
    let inputStyle: any = {};

    // Variant-specific styling matching family design
    if (this.variant === 'minimal') {
      inputClass += ` bg-transparent border-0 ${this.dark ? 'text-white hover:bg-gray-800' : 'text-gray-900 hover:bg-gray-100'}`;
      inputStyle.boxShadow = `0 0 0 2px ${colorVars.main}`;
    } else if (this.variant === 'outlined') {
      inputClass += ` border-2 bg-transparent ${this.dark ? 'text-white hover:bg-gray-800' : 'text-gray-900 hover:bg-gray-50'}`;
      inputStyle.borderColor = colorVars.main;
      inputStyle.boxShadow = `0 0 0 2px ${colorVars.main}`;
    } else if (this.variant === 'filled') {
      inputClass += ` text-white border-0 focus:ring-white`;
      inputStyle.backgroundColor = colorVars.main;
    } else if (this.variant === 'elevated') {
      inputClass += ` bg-white border border-gray-300 shadow-md hover:shadow-lg ${this.dark ? 'bg-gray-700 border-gray-600 text-white' : 'text-gray-900'}`;
      inputStyle.boxShadow = `0 0 0 2px ${colorVars.main}`;
    }

    // Animation classes
    if (this.animation !== 'none') {
      calendarClass += ` ${this.animation === 'slide' ? 'transform transition-transform' : this.animation === 'fade' ? 'transition-opacity' : 'transition-all transform'}`;
    }

    return { containerClass, inputClass, calendarClass, inputStyle };
  }

  /** Get CSS variable-based colors for components */
  private getColorVars() {
    switch (this.color) {
      case 'secondary':
        return {
          main: 'var(--color-secondary)',
          hover: 'var(--color-secondary-hover)',
          light: 'var(--color-secondary-light)',
        };
      case 'neutral':
        return {
          main: 'var(--color-neutral)',
          hover: 'var(--color-neutral-hover)',
          light: 'var(--color-neutral-light)',
        };
      case 'success':
        return {
          main: 'var(--color-success)',
          hover: 'var(--color-success)',
          light: 'var(--color-success)',
        };
      case 'warning':
        return {
          main: 'var(--color-warning)',
          hover: 'var(--color-warning)',
          light: 'var(--color-warning)',
        };
      case 'danger':
        return {
          main: 'var(--color-danger)',
          hover: 'var(--color-danger)',
          light: 'var(--color-danger)',
        };
      default: // primary
        return {
          main: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          light: 'var(--color-primary-light)',
        };
    }
  }

  /** Get enhanced active color styling with CSS variables */
  private getActiveColor() {
    const colorVars = this.getColorVars();
    return {
      backgroundColor: colorVars.main,
      color: 'white',
      transition: 'all 0.2s ease-in-out',
    };
  }

  /** Get days in month */
  private getDaysInMonth() {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  }

  /** Format display value */
  private getDisplayValue() {
    if (!this.selectedDate) return '';

    const date = this.selectedDate.toLocaleDateString();
    const time = this.includeTime ? this.selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    return this.includeTime ? `${date} ${time}` : date;
  }

  /** Get month name */
  private getMonthName() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[this.currentMonth];
  }

  // ========================================
  // Standardized Component API Methods
  // ========================================

  /**
   * Set the value programmatically with automatic operation handling
   * @param value - The date string value to set (ISO format)
   * @param writeOperation - Optional write function to call after value update
   */
  @Method()
  async setValue(value: string, writeOperation?: (value: string) => Promise<any>): Promise<any> {
    const prevValue = this.value;

    // Store operation for potential user interaction
    this.storedWriteOperation = writeOperation;

    try {
      StatusIndicator.applyStatus(this, 'loading');
      this.updateValue(value, prevValue);

      if (writeOperation) {
        const result = await writeOperation(value);
        StatusIndicator.applyStatus(this, 'success');
        return result;
      }

      StatusIndicator.applyStatus(this, 'idle');
    } catch (error) {
      console.error('setValue error for ui-calendar:', error);
      this.updateValue(prevValue!, prevValue, false); // Revert on error
      StatusIndicator.applyStatus(this, 'error', 'Operation failed');
      throw error;
    } finally {
      this.storedWriteOperation = undefined;
    }
  }

  /**
   * Get the current calendar value.
   * @returns Current date value as ISO string or undefined
   * @example
   * ```typescript
   * const currentDate = await calendar.getValue();
   * console.log('Selected date:', currentDate);
   * ```
   */
  @Method()
  async getValue(): Promise<string | undefined> {
    return this.value;
  }

  /**
   * Set the value silently without emitting events or status changes
   * @param value - The date string value to set (ISO format)
   */
  @Method()
  async setValueSilent(value: string): Promise<void> {
    this.updateValue(value, this.value, false);
  }

  /**
   * Set the visual status of the calendar (success, warning, error).
   * @param status - Status type or null to clear
   * @param message - Optional status message
   * @example
   * ```typescript
   * await calendar.setStatus('error', 'Invalid date selected');
   * await calendar.setStatus('success', 'Date saved successfully');
   * await calendar.setStatus(null); // Clear status
   * ```
   */
  @Method()
  async setStatus(status: 'idle' | 'loading' | 'success' | 'error', message?: string): Promise<void> {
    this.operationStatus = status;
    if (status === 'error' && message) {
      this.lastError = message;
    } else if (status !== 'error') {
      this.lastError = undefined;
    }

    if (status === 'success') {
      this.lastUpdatedTs = Date.now();
      // Auto-clear success status after short delay
      setTimeout(() => {
        if (this.operationStatus === 'success') {
          this.operationStatus = 'idle';
        }
      }, 1200);
    }

    // Emit status change event
    this.valueMsg.emit({
      newVal: this.value,
      ts: Date.now(),
      source: this.el?.id || 'ui-calendar',
      ok: status !== 'error',
      meta: {
        component: 'ui-calendar',
        type: 'statusChange',
        status,
        message,
        source: 'method',
      },
    });
  }

  /**
   * Trigger a visual pulse effect to indicate the value was read/accessed.
   * @example
   * ```typescript
   * await calendar.triggerReadPulse();
   * ```
   */
  @Method()
  async triggerReadPulse(): Promise<void> {
    // Add pulse class temporarily
    this.el.classList.add('read-pulse');

    // Emit read event
    this.valueMsg.emit({
      newVal: this.value,
      ts: Date.now(),
      source: this.el?.id || 'ui-calendar',
      ok: true,
      meta: {
        component: 'ui-calendar',
        type: 'read',
        source: 'method',
      },
    });

    // Remove pulse class after animation
    setTimeout(() => {
      this.el.classList.remove('read-pulse');
    }, 300);
  }

  /** Render component */
  render() {
    const styles = this.getCalendarStyles();
    const isDisabled = this.disabled;
    const days = this.getDaysInMonth();
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div class={styles.containerClass}>
        {/* Label */}
        {this.label && <label class={`block text-sm font-medium mb-2 ${isDisabled ? 'text-gray-400' : ''} ${this.dark ? 'text-white' : 'text-gray-900'}`}>{this.label}</label>}

        {/* Input Field */}
        <div class="relative">
          <input
            ref={el => (this.inputEl = el as HTMLInputElement)}
            type="text"
            readonly
            disabled={isDisabled}
            value={this.getDisplayValue()}
            class={styles.inputClass}
            style={styles.inputStyle}
            onClick={() => !isDisabled && this.toggleOpen()}
            placeholder={this.includeTime ? 'Select date and time' : 'Select date'}
            aria-haspopup="dialog"
            aria-expanded={this.isOpen ? 'true' : 'false'}
          />

          {/* Calendar Icon */}
          <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 0V2M12 0V2M2 4H14M2 2H14C15.1 2 16 2.9 16 4V14C16 15.1 15.1 16 14 16H2C0.9 16 0 15.1 0 14V4C0 2.9 0.9 2 2 2Z" fill="currentColor" opacity="0.6" />
            </svg>
          </div>

          {/* Success Indicator */}
          {this.showSuccess && (
            <div class="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 z-10">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 3L4.5 8.5L2 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
          )}
        </div>

        {/* Calendar Dropdown */}
        {this.isOpen && (
          <div ref={el => (this.calendarEl = el as HTMLElement)} class={styles.calendarClass} role="dialog" aria-modal="true">
            {/* Header */}
            <div class="flex items-center justify-between mb-4">
              <button class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => this.navigateMonth(-1)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>

              <div class={`text-lg font-medium ${this.dark ? 'text-white' : 'text-gray-900'}`}>
                {this.getMonthName()} {this.currentYear}
              </div>

              <button class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => this.navigateMonth(1)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>

            {/* Week Days */}
            <div class="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(day => (
                <div class={`text-center text-xs font-medium py-2 ${this.dark ? 'text-gray-400' : 'text-gray-500'}`}>{day}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div class="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                const isSelected =
                  day === this.selectedDate?.getDate() && this.currentMonth === this.selectedDate?.getMonth() && this.currentYear === this.selectedDate?.getFullYear();

                return (
                  <button
                    key={index}
                    class={`h-8 text-sm rounded transition-colors ${
                      day === null ? '' : isSelected ? 'text-white' : `hover:bg-gray-100 dark:hover:bg-gray-700 ${this.dark ? 'text-white' : 'text-gray-900'}`
                    }`}
                    style={day !== null && isSelected ? this.getActiveColor() : {}}
                    disabled={day === null}
                    onClick={() => day && this.handleDateSelect(day)}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Enhanced Time Picker with Clock Interface */}
            {this.includeTime && (
              <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div class="flex items-center justify-between mb-3">
                  <label class={`text-sm font-medium ${this.dark ? 'text-white' : 'text-gray-900'}`}>Time</label>
                  <button
                    type="button"
                    class={`px-2 py-1 text-xs rounded ${
                      this.showClockView ? 'bg-primary text-white' : this.dark ? 'bg-gray-600 text-white hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    onClick={() => this.toggleClockView()}
                  >
                    {this.showClockView ? '📝 Input' : '🕐 Clock'}
                  </button>
                </div>

                {this.showClockView ? (
                  /* Visual Clock Interface */
                  <div class="flex flex-col items-center space-y-4">
                    {/* Hour Selection */}
                    <div class="text-center">
                      <div class={`text-xs mb-2 ${this.dark ? 'text-gray-300' : 'text-gray-600'}`}>Hours</div>
                      <div class="grid grid-cols-4 gap-1 max-w-48">
                        {Array.from({ length: this.timeFormat === '12' ? 12 : 24 }, (_, i) => {
                          const hour = this.timeFormat === '12' ? i + 1 : i;
                          return (
                            <button
                              type="button"
                              class={`w-8 h-8 text-xs rounded-full transition-all ${
                                this.selectedHour === hour
                                  ? 'bg-primary text-white'
                                  : this.dark
                                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              onClick={() => this.setHour(hour)}
                            >
                              {hour.toString().padStart(2, '0')}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Minute Selection */}
                    <div class="text-center">
                      <div class={`text-xs mb-2 ${this.dark ? 'text-gray-300' : 'text-gray-600'}`}>Minutes</div>
                      <div class="grid grid-cols-6 gap-1 max-w-48">
                        {Array.from({ length: 12 }, (_, i) => {
                          const minute = i * 5;
                          return (
                            <button
                              type="button"
                              class={`w-8 h-8 text-xs rounded-full transition-all ${
                                this.selectedMinute === minute
                                  ? 'bg-primary text-white'
                                  : this.dark
                                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              onClick={() => this.setMinute(minute)}
                            >
                              {minute.toString().padStart(2, '0')}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* AM/PM Toggle for 12-hour format */}
                    {this.timeFormat === '12' && (
                      <div class="flex space-x-2">
                        <button
                          type="button"
                          class={`px-4 py-2 text-sm rounded transition-all ${
                            this.isAM ? 'bg-primary text-white' : this.dark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                          onClick={() => !this.isAM && this.toggleAMPM()}
                        >
                          AM
                        </button>
                        <button
                          type="button"
                          class={`px-4 py-2 text-sm rounded transition-all ${
                            !this.isAM ? 'bg-primary text-white' : this.dark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                          onClick={() => this.isAM && this.toggleAMPM()}
                        >
                          PM
                        </button>
                      </div>
                    )}

                    {/* Selected Time Display */}
                    <div class={`text-lg font-mono ${this.dark ? 'text-white' : 'text-gray-900'}`}>
                      {this.timeFormat === '12'
                        ? `${this.selectedHour.toString().padStart(2, '0')}:${this.selectedMinute.toString().padStart(2, '0')} ${this.isAM ? 'AM' : 'PM'}`
                        : `${this.selectedHour.toString().padStart(2, '0')}:${this.selectedMinute.toString().padStart(2, '0')}`}
                    </div>
                  </div>
                ) : (
                  /* Traditional Time Input */
                  <input
                    type="time"
                    class={`w-full px-3 py-2 text-sm border rounded-md ${this.dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    value={this.selectedDate ? `${String(this.selectedDate.getHours()).padStart(2, '0')}:${String(this.selectedDate.getMinutes()).padStart(2, '0')}` : ''}
                    onInput={e => this.handleTimeChange(e)}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Unified Status Indicators - Right aligned */}
        <div class="flex justify-between items-start mt-2">
          <div class="flex-1"></div>
          <div class="flex flex-col items-end gap-1">
            {this.showStatus && StatusIndicator.renderStatusBadge(this.operationStatus, this.lastError, h)}
            {this.showLastUpdated && StatusIndicator.renderTimestamp(this.lastUpdatedTs ? new Date(this.lastUpdatedTs) : null, this.dark ? 'dark' : 'light', h)}
          </div>
        </div>

        {/* Error Message */}
        {this.errorMessage && <div class="text-red-500 text-sm mt-2">{this.errorMessage}</div>}

        {/* Click outside to close */}
        {this.isOpen && <div class="fixed inset-0 z-40" onClick={() => (this.isOpen = false)}></div>}
      </div>
    );
  }
}
