import { Component, Prop, State, h, Watch, Event, EventEmitter } from '@stencil/core';

export interface UiCalendarDateChange { value: string }
export interface UiCalendarValueChange { value: string }

/**
 * Calendar component for date-time selection with various visual styles and TD integration.
 * Link a direct property URL for plug-and-play device control.
 *
 * @example Basic Usage
 * ```html
 * <ui-calendar variant="outlined" color="primary" label="Select Date"></ui-calendar>
 * ```
 *
 * @example TD Integration
 * ```html
 * <ui-calendar
 *   td-url="http://device.local/properties/schedule"
 *   variant="filled"
 *   label="Device Schedule"
 *   include-time="true">
 * </ui-calendar>
 * ```
 */
@Component({
  tag: 'ui-calendar',
  styleUrl: 'ui-calendar.css',
  shadow: true,
})
export class UiCalendar {
  /**
   * Visual style variant of the calendar.
   * - minimal: Clean minimal design (default)
   * - outlined: Border with background
   * - filled: Solid background
   */
  @Prop() variant: 'minimal' | 'outlined' | 'filled' = 'minimal';

  /**
   * Current state of the calendar.
   * - disabled: Calendar cannot be interacted with
   * - default: Calendar is interactive (default)
   */
  @Prop({ mutable: true }) state: 'disabled' | 'default' = 'default';

  /**
   * Theme for the component.
   */
  @Prop() theme: 'light' | 'dark' = 'light';

  /**
   * Color scheme to match thingsweb webpage
   */
  @Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';

  /**
   * Optional text label for the calendar.
   */
  @Prop() label?: string;

  /**
   * Include time picker alongside date picker.
   */
  @Prop() includeTime: boolean = false;

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
      const focusable = Array.from(container.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled'));
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
      try { (this.previouslyFocused as HTMLElement).focus(); } catch (e) { /* ignore */ }
    } else if (this.inputEl) {
      try { this.inputEl.focus(); } catch (e) { /* ignore */ }
    }
  }

  private toggleOpen = () => {
    if (this.isOpen) this.closeCalendar(); else this.openCalendar();
  };

  /** Success feedback state */
  @State() showSuccess: boolean = false;

  /** Last error message */
  @State() errorMessage?: string;

  /** Event emitted when date changes */
  @Event() dateChange: EventEmitter<UiCalendarDateChange>;

  /** Standardized valueChange event for calendar */
  @Event() valueChange: EventEmitter<UiCalendarValueChange>;

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
  }

  /** Handle date selection */
  private async handleDateSelect(day: number) {
    if (this.state === 'disabled') return;

    const newDate = new Date(this.currentYear, this.currentMonth, day);

    // Preserve time if includeTime is enabled
    if (this.includeTime && this.selectedDate) {
      newDate.setHours(this.selectedDate.getHours());
      newDate.setMinutes(this.selectedDate.getMinutes());
    }

  this.selectedDate = newDate;
  this.value = newDate.toISOString();
  this.dateChange.emit({ value: this.value });
  this.valueChange.emit({ value: this.value });
    this.isOpen = false;

  // Local control only: external integrations should listen to the `dateChange` event.
  }

  /** Handle time change */
  private async handleTimeChange(event: Event) {
    if (this.state === 'disabled') return;

    const target = event.target as HTMLInputElement;
    const [hours, minutes] = target.value.split(':').map(Number);

    const newDate = new Date(this.selectedDate);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);

  this.selectedDate = newDate;
  this.value = newDate.toISOString();
    this.dateChange.emit({ value: this.value });

  // Local control only: external integrations should listen to the `dateChange` event.
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

  /** Get calendar styles */
  private getCalendarStyles() {
    const isDisabled = this.state === 'disabled';
    let containerClass = 'relative inline-block';
    let inputClass = `w-full px-3 py-2 text-sm border rounded-md transition-colors ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`;
    let calendarClass = `absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4 min-w-72`;

    // Theme styles
    if (this.theme === 'dark') {
      inputClass = inputClass.replace('bg-white', 'bg-gray-700').replace('border-gray-300', 'border-gray-600').replace('text-gray-900', 'text-white');
      calendarClass = calendarClass.replace('bg-white', 'bg-gray-800').replace('border-gray-300', 'border-gray-600');
    }

    // Variant styles
    if (this.variant === 'minimal') {
      inputClass += ` border-gray-300 bg-transparent ${this.theme === 'dark' ? 'text-white border-gray-600' : 'text-gray-900'}`;
    } else if (this.variant === 'outlined') {
      inputClass += ` border-2 bg-white ${this.theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-900'}`;
    } else if (this.variant === 'filled') {
      if (this.color === 'primary') {
        inputClass += ' bg-primary bg-opacity-10 border-primary text-primary';
      } else if (this.color === 'secondary') {
        inputClass += ' bg-secondary bg-opacity-10 border-secondary text-secondary';
      } else {
        inputClass += ' bg-gray-100 border-gray-400 text-gray-900';
      }
    }

    return { containerClass, inputClass, calendarClass };
  }

  /** Get active color class */
  private getActiveColor() {
    if (this.color === 'secondary') return 'bg-secondary text-white';
    if (this.color === 'neutral') return 'bg-gray-500 text-white';
    return 'bg-primary text-white';
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

  /** Render component */
  render() {
    const styles = this.getCalendarStyles();
    const isDisabled = this.state === 'disabled';
    const days = this.getDaysInMonth();
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div class={styles.containerClass}>
        {/* Label */}
        {this.label && (
          <label class={`block text-sm font-medium mb-2 ${isDisabled ? 'text-gray-400' : ''} ${this.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{this.label}</label>
        )}

        {/* Input Field */}
        <div class="relative">
          <input
            ref={el => (this.inputEl = el as HTMLInputElement)}
            type="text"
            readonly
            disabled={isDisabled}
            value={this.getDisplayValue()}
            class={styles.inputClass}
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

              <div class={`text-lg font-medium ${this.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
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
                <div class={`text-center text-xs font-medium py-2 ${this.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{day}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div class="grid grid-cols-7 gap-1">
              {days.map((day, index) => (
                <button
                  key={index}
                  class={`h-8 text-sm rounded transition-colors ${
                    day === null
                      ? ''
                      : day === this.selectedDate?.getDate() && this.currentMonth === this.selectedDate?.getMonth() && this.currentYear === this.selectedDate?.getFullYear()
                      ? this.getActiveColor()
                      : `hover:bg-gray-100 dark:hover:bg-gray-700 ${this.theme === 'dark' ? 'text-white' : 'text-gray-900'}`
                  }`}
                  disabled={day === null}
                  onClick={() => day && this.handleDateSelect(day)}
                >
                  {day}
                </button>
              ))}
            </div>

            {/* Time Picker */}
            {this.includeTime && (
              <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <label class={`block text-sm font-medium mb-2 ${this.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Time</label>
                <input
                  type="time"
                  class={`w-full px-3 py-2 text-sm border rounded-md ${
                    this.theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={this.selectedDate ? `${String(this.selectedDate.getHours()).padStart(2, '0')}:${String(this.selectedDate.getMinutes()).padStart(2, '0')}` : ''}
                  onInput={e => this.handleTimeChange(e)}
                />
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {this.errorMessage && <div class="text-red-500 text-sm mt-2">{this.errorMessage}</div>}

        {/* Click outside to close */}
        {this.isOpen && <div class="fixed inset-0 z-40" onClick={() => (this.isOpen = false)}></div>}
      </div>
    );
  }
}
