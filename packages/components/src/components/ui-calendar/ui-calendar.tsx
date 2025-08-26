import { Component, Prop, State, h, Watch, Event, EventEmitter, Method, Element } from '@stencil/core';
import { UiMsg } from '../../utils/types';
import { formatLastUpdated } from '../../utils/common-props';

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

  // Status management
  @State() private _status: 'success' | 'warning' | 'error' | null = null;
  @State() private _lastUpdated: Date | null = null;

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
    if (this.disabled) return;

    const newDate = new Date(this.currentYear, this.currentMonth, day);

    // Preserve time if includeTime is enabled
    if (this.includeTime && this.selectedDate) {
      newDate.setHours(this.selectedDate.getHours());
      newDate.setMinutes(this.selectedDate.getMinutes());
    }

  this.selectedDate = newDate;
  this.value = newDate.toISOString();
  
  // Emit standardized event
  this.valueMsg.emit({
    payload: this.value,
    prev: undefined, // Could store previous value if needed
    ts: Date.now(),
    source: this.el?.id || 'ui-calendar',
    ok: true,
    meta: {
      component: 'ui-calendar',
      type: 'dateSelect',
      source: 'user'
    }
  });
  
  this.dateChange.emit({ 
    value: this.value,
    date: this.selectedDate,
    formattedValue: this.getDisplayValue()
  });
  this.valueChange.emit({ 
    value: this.value,
    date: this.selectedDate,
    formattedValue: this.getDisplayValue()
  });
    this.isOpen = false;

  // Local control only: external integrations should listen to the `dateChange` event.
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
    payload: this.value,
    prev: undefined,
    ts: Date.now(),
    source: this.el?.id || 'ui-calendar',
    ok: true,
    meta: {
      component: 'ui-calendar',
      type: 'timeChange',
      source: 'user'
    }
  });
  
    this.dateChange.emit({ 
      value: this.value,
      date: this.selectedDate,
      formattedValue: this.getDisplayValue()
    });

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

  /** Get comprehensive calendar styles matching component family design */
  private getCalendarStyles() {
    const isDisabled = this.disabled;
    const isReadonly = this.readonly;
    const colorName = this.getColorName();
    
    // Base container styles
    let containerClass = `relative ${this.inline ? 'block' : 'inline-block'}`;
    
    // Enhanced input styles with family consistency
    let inputClass = `w-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
      this.size === 'small' ? 'px-2 py-1 text-xs' : 
      this.size === 'large' ? 'px-4 py-3 text-base' : 
      'px-3 py-2 text-sm'
    } ${isDisabled || isReadonly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`;

    // Calendar popup/inline styles with enhanced design
    let calendarClass = `${this.inline ? 'relative' : 'absolute top-full left-0 mt-1 z-50'} ${
      this.dark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
    } border rounded-lg shadow-lg p-4 ${
      this.size === 'small' ? 'min-w-64' : 
      this.size === 'large' ? 'min-w-80' : 
      'min-w-72'
    }`;

    // Variant-specific styling matching family design
    if (this.variant === 'minimal') {
      inputClass += ` bg-transparent border-0 ${
        this.dark ? 'text-white hover:bg-gray-800' : 'text-gray-900 hover:bg-gray-100'
      } focus:ring-${colorName}`;
    } else if (this.variant === 'outlined') {
      inputClass += ` border-2 bg-transparent border-${colorName} ${
        this.dark ? 'text-white hover:bg-gray-800' : 'text-gray-900 hover:bg-gray-50'
      } focus:ring-${colorName}`;
    } else if (this.variant === 'filled') {
      inputClass += ` bg-${colorName} text-white border-0 hover:bg-${colorName}-dark focus:ring-${colorName}`;
    } else if (this.variant === 'elevated') {
      inputClass += ` bg-white border border-gray-300 shadow-md hover:shadow-lg ${
        this.dark ? 'bg-gray-700 border-gray-600 text-white' : 'text-gray-900'
      } focus:ring-${colorName}`;
    }

    // Animation classes
    if (this.animation !== 'none') {
      calendarClass += ` ${
        this.animation === 'slide' ? 'transform transition-transform' :
        this.animation === 'fade' ? 'transition-opacity' :
        'transition-all transform'
      }`;
    }

    return { containerClass, inputClass, calendarClass };
  }

  /** Get color name for CSS classes */
  private getColorName(): string {
    const colorMap = {
      'primary': 'blue-500',
      'secondary': 'green-500', 
      'neutral': 'gray-500',
      'success': 'green-600',
      'warning': 'orange-500',
      'danger': 'red-500'
    };
    return colorMap[this.color] || colorMap.primary;
  }

  /** Get enhanced active color styling */
  private getActiveColor() {
    const colorName = this.getColorName();
    return `bg-${colorName} text-white hover:bg-${colorName.replace('500', '600')} transition-colors`;
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
   * Set the calendar value programmatically and emit events.
   * @param value - ISO date string to set
   * @param metadata - Optional metadata to include in the event
   * @example
   * ```typescript
   * await calendar.setValue('2023-12-25');
   * await calendar.setValue('2023-12-25T10:30:00', { source: 'api' });
   * ```
   */
  @Method()
  async setValue(value: string, metadata?: Record<string, any>): Promise<void> {
    const oldValue = this.value;
    this.value = value;
    
    if (value) {
      this.selectedDate = new Date(value);
      this.currentMonth = this.selectedDate.getMonth();
      this.currentYear = this.selectedDate.getFullYear();
    }

    this._lastUpdated = new Date();

    // Emit standardized event
    this.valueMsg.emit({
      payload: value,
      prev: oldValue,
      ts: Date.now(),
      source: this.el?.id || 'ui-calendar',
      ok: true,
      meta: {
        component: 'ui-calendar',
        type: 'setValue',
        source: 'method',
        ...metadata
      }
    });

    // Emit legacy events for backward compatibility
    this.dateChange.emit({ 
      value: value,
      date: this.selectedDate,
      formattedValue: this.getDisplayValue()
    });

    this.valueChange.emit({
      value: value,
      date: this.selectedDate,
      formattedValue: this.getDisplayValue()
    });
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
   * Set value without emitting events (silent update).
   * @param value - ISO date string to set
   * @example
   * ```typescript
   * await calendar.setValueSilent('2023-12-25');
   * ```
   */
  @Method()
  async setValueSilent(value: string): Promise<void> {
    this.value = value;
    
    if (value) {
      this.selectedDate = new Date(value);
      this.currentMonth = this.selectedDate.getMonth();
      this.currentYear = this.selectedDate.getFullYear();
    }

    this._lastUpdated = new Date();
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
  async setStatus(status: 'success' | 'warning' | 'error' | null, message?: string): Promise<void> {
    this._status = status;
    
    // Emit status change event
    this.valueMsg.emit({
      payload: this.value,
      ts: Date.now(),
      source: this.el?.id || 'ui-calendar',
      ok: status !== 'error',
      meta: {
        component: 'ui-calendar',
        type: 'statusChange',
        status,
        message,
        source: 'method'
      }
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
      payload: this.value,
      ts: Date.now(),
      source: this.el?.id || 'ui-calendar',
      ok: true,
      meta: {
        component: 'ui-calendar',
        type: 'read',
        source: 'method'
      }
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
        {this.label && (
          <label class={`block text-sm font-medium mb-2 ${isDisabled ? 'text-gray-400' : ''} ${this.dark ? 'text-white' : 'text-gray-900'}`}>{this.label}</label>
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
              {days.map((day, index) => (
                <button
                  key={index}
                  class={`h-8 text-sm rounded transition-colors ${
                    day === null
                      ? ''
                      : day === this.selectedDate?.getDate() && this.currentMonth === this.selectedDate?.getMonth() && this.currentYear === this.selectedDate?.getFullYear()
                      ? this.getActiveColor()
                      : `hover:bg-gray-100 dark:hover:bg-gray-700 ${this.dark ? 'text-white' : 'text-gray-900'}`
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
                <label class={`block text-sm font-medium mb-2 ${this.dark ? 'text-white' : 'text-gray-900'}`}>Time</label>
                <input
                  type="time"
                  class={`w-full px-3 py-2 text-sm border rounded-md ${
                    this.dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={this.selectedDate ? `${String(this.selectedDate.getHours()).padStart(2, '0')}:${String(this.selectedDate.getMinutes()).padStart(2, '0')}` : ''}
                  onInput={e => this.handleTimeChange(e)}
                />
              </div>
            )}
          </div>
        )}

        {/* Status Badge */}
        {this._status && (
          <div class={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full mt-2 ${
            this._status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
            this._status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            <span class={`w-2 h-2 rounded-full mr-1 ${
              this._status === 'success' ? 'bg-green-600' :
              this._status === 'warning' ? 'bg-yellow-600' :
              'bg-red-600'
            }`}></span>
            {this._status}
          </div>
        )}

        {/* Last Updated */}
        {this.showLastUpdated && this._lastUpdated && (
          <div class={`text-xs mt-2 ${this.dark ? 'text-gray-400' : 'text-gray-500'}`}>
            {formatLastUpdated(this._lastUpdated.getTime())}
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
