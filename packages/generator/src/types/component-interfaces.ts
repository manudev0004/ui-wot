/**
 * Comprehensive UI-WoT Component Interface Definitions
 *
 * This file contains TypeScript interfaces for all UI-WoT components,
 * including their props, methods, states, and events for seamless integration.
 *
 * Generated from component analysis - DO NOT EDIT MANUALLY
 */

// Common types used across components
export type OperationStatus = 'idle' | 'loading' | 'success' | 'error';
export type ColorTheme = 'primary' | 'secondary' | 'neutral';
export type ComponentVariant = 'minimal' | 'outlined' | 'filled';

// Standard message format for component events
export interface UiMsg<T = any> {
  newVal: T;
  prevVal?: T;
  ts: number;
  source: string;
  ok: boolean;
  meta?: Record<string, any>;
}

// Common props shared across multiple components
export interface BaseComponentProps {
  /** Enable dark mode theme styling */
  dark?: boolean;

  /** Disable user interaction */
  disabled?: boolean;

  /** Show last updated timestamp */
  showLastUpdated?: boolean;

  /** Show visual operation status indicators */
  showStatus?: boolean;

  /** Color theme for the component */
  color?: ColorTheme;
}

// Common state interface
export interface BaseComponentState {
  operationStatus: OperationStatus;
  lastError?: string;
  lastUpdatedTs?: number;
}

// Common methods interface
export interface BaseComponentMethods {
  setStatus(status: OperationStatus, errorMessage?: string): Promise<void>;
}

// ============================================================================
// UI-BUTTON COMPONENT
// ============================================================================

export interface UiButtonProps extends BaseComponentProps {
  /** Visual style variant */
  variant?: ComponentVariant;

  /** Text label displayed on the button */
  label?: string;

  /** Enable keyboard navigation */
  keyboard?: boolean;
}

export interface UiButtonState extends BaseComponentState {
  lastClickedTs?: number;
  timestampCounter: number;
}

export interface UiButtonMethods extends BaseComponentMethods {
  /** Sets the action to execute when button is clicked */
  setAction(actionFn?: () => Promise<any>): Promise<boolean>;
}

export interface UiButtonEvents {
  /** Emitted when button is clicked */
  clickMsg: CustomEvent<UiMsg<string>>;
}

// ============================================================================
// UI-TOGGLE COMPONENT
// ============================================================================

export interface UiToggleProps extends BaseComponentProps {
  /** Visual style variant */
  variant?: ComponentVariant;

  /** Current toggle state */
  value?: boolean;

  /** Text label displayed above the toggle */
  label?: string;

  /** Make component read-only */
  readonly?: boolean;

  /** Enable keyboard navigation */
  keyboard?: boolean;

  /** Connection state for readonly mode */
  connected?: boolean;
}

export interface UiToggleState extends BaseComponentState {
  isActive: boolean;
  timestampCounter: number;
  suppressEvents: boolean;
}

export interface UiToggleMethods extends BaseComponentMethods {
  /** Sets the toggle value with optional write operation */
  setValue(
    value: boolean,
    options?: {
      writeOperation?: (value: boolean) => Promise<any>;
      _isRevert?: boolean;
    },
  ): Promise<boolean>;

  /** Gets the current toggle value */
  getValue(includeMetadata?: boolean): Promise<
    | boolean
    | {
        value: boolean;
        lastUpdated?: number;
        status: string;
        error?: string;
      }
  >;

  /** Updates value silently without triggering events */
  setValueSilent(value: boolean): Promise<void>;

  /** Triggers a visual read pulse effect */
  triggerReadPulse(): Promise<void>;
}

export interface UiToggleEvents {
  /** Emitted when toggle value changes */
  valueMsg: CustomEvent<UiMsg<boolean>>;
}

// ============================================================================
// UI-SLIDER COMPONENT
// ============================================================================

export interface UiSliderProps extends BaseComponentProps {
  /** Visual style variant */
  variant?: ComponentVariant;

  /** Current slider value */
  value?: number;

  /** Minimum value */
  min?: number;

  /** Maximum value */
  max?: number;

  /** Step increment */
  step?: number;

  /** Text label displayed above the slider */
  label?: string;

  /** Make component read-only */
  readonly?: boolean;

  /** Enable keyboard navigation */
  keyboard?: boolean;

  /** Connection state for readonly mode */
  connected?: boolean;

  /** Number of decimal places to display */
  precision?: number;

  /** Show numeric input field */
  showInput?: boolean;

  /** Show min/max labels */
  showMinMax?: boolean;

  /** Unit text to display */
  unit?: string;
}

export interface UiSliderState extends BaseComponentState {
  currentValue: number;
  timestampCounter: number;
  suppressEvents: boolean;
  isDragging: boolean;
  showTooltip: boolean;
  tooltipPosition: number;
}

export interface UiSliderMethods extends BaseComponentMethods {
  /** Sets the slider value with optional write operation */
  setValue(
    value: number,
    options?: {
      writeOperation?: (value: number) => Promise<any>;
      _isRevert?: boolean;
    },
  ): Promise<boolean>;

  /** Gets the current slider value */
  getValue(includeMetadata?: boolean): Promise<
    | number
    | {
        value: number;
        lastUpdated?: number;
        status: string;
        error?: string;
      }
  >;

  /** Updates value silently without triggering events */
  setValueSilent(value: number): Promise<void>;

  /** Triggers a visual read pulse effect */
  triggerReadPulse(): Promise<void>;
}

export interface UiSliderEvents {
  /** Emitted when slider value changes */
  valueMsg: CustomEvent<UiMsg<number>>;
}

// ============================================================================
// UI-TEXT COMPONENT
// ============================================================================

export interface UiTextProps extends BaseComponentProps {
  /** Visual style variant */
  variant?: ComponentVariant;

  /** Current text value */
  value?: string;

  /** Text label displayed above the input */
  label?: string;

  /** Placeholder text */
  placeholder?: string;

  /** Input type */
  type?: 'text' | 'password' | 'email' | 'url' | 'search';

  /** Make component read-only */
  readonly?: boolean;

  /** Enable keyboard navigation */
  keyboard?: boolean;

  /** Maximum character length */
  maxLength?: number;

  /** Minimum character length */
  minLength?: number;

  /** Validation pattern */
  pattern?: string;

  /** Whether field is required */
  required?: boolean;

  /** Enable autocomplete */
  autocomplete?: string;

  /** Enable spellcheck */
  spellcheck?: boolean;
}

export interface UiTextState extends BaseComponentState {
  currentValue: string;
  timestampCounter: number;
  suppressEvents: boolean;
  isFocused: boolean;
  validationMessage: string;
}

export interface UiTextMethods extends BaseComponentMethods {
  /** Sets the text value with optional write operation */
  setValue(
    value: string,
    options?: {
      writeOperation?: (value: string) => Promise<any>;
      _isRevert?: boolean;
    },
  ): Promise<boolean>;

  /** Gets the current text value */
  getValue(includeMetadata?: boolean): Promise<
    | string
    | {
        value: string;
        lastUpdated?: number;
        status: string;
        error?: string;
      }
  >;

  /** Updates value silently without triggering events */
  setValueSilent(value: string): Promise<void>;

  /** Focus the input field */
  focusInput(): Promise<void>;
}

export interface UiTextEvents {
  /** Emitted when text value changes */
  valueMsg: CustomEvent<UiMsg<string>>;
}

// ============================================================================
// UI-NUMBER-PICKER COMPONENT
// ============================================================================

export interface UiNumberPickerProps extends BaseComponentProps {
  /** Visual style variant */
  variant?: ComponentVariant;

  /** Current numeric value */
  value?: number;

  /** Minimum value */
  min?: number;

  /** Maximum value */
  max?: number;

  /** Step increment */
  step?: number;

  /** Text label displayed above the picker */
  label?: string;

  /** Make component read-only */
  readonly?: boolean;

  /** Enable keyboard navigation */
  keyboard?: boolean;

  /** Connection state for readonly mode */
  connected?: boolean;

  /** Number of decimal places */
  precision?: number;

  /** Unit text to display */
  unit?: string;
}

export interface UiNumberPickerState extends BaseComponentState {
  currentValue: number;
  timestampCounter: number;
  suppressEvents: boolean;
  isFocused: boolean;
}

export interface UiNumberPickerMethods extends BaseComponentMethods {
  /** Sets the numeric value with optional write operation */
  setValue(
    value: number,
    options?: {
      writeOperation?: (value: number) => Promise<any>;
      _isRevert?: boolean;
    },
  ): Promise<boolean>;

  /** Gets the current numeric value */
  getValue(includeMetadata?: boolean): Promise<
    | number
    | {
        value: number;
        lastUpdated?: number;
        status: string;
        error?: string;
      }
  >;

  /** Updates value silently without triggering events */
  setValueSilent(value: number): Promise<void>;

  /** Triggers a visual read pulse effect */
  triggerReadPulse(): Promise<void>;
}

export interface UiNumberPickerEvents {
  /** Emitted when numeric value changes */
  valueMsg: CustomEvent<UiMsg<number>>;
}

// ============================================================================
// UI-CHECKBOX COMPONENT
// ============================================================================

export interface UiCheckboxProps extends BaseComponentProps {
  /** Visual style variant */
  variant?: ComponentVariant;

  /** Current checkbox state */
  value?: boolean;

  /** Text label displayed next to checkbox */
  label?: string;

  /** Make component read-only */
  readonly?: boolean;

  /** Enable keyboard navigation */
  keyboard?: boolean;
}

export interface UiCheckboxState extends BaseComponentState {
  isChecked: boolean;
  timestampCounter: number;
  suppressEvents: boolean;
}

export interface UiCheckboxMethods extends BaseComponentMethods {
  /** Sets the checkbox value with optional write operation */
  setValue(
    value: boolean,
    options?: {
      writeOperation?: (value: boolean) => Promise<any>;
      _isRevert?: boolean;
    },
  ): Promise<boolean>;

  /** Gets the current checkbox value */
  getValue(includeMetadata?: boolean): Promise<
    | boolean
    | {
        value: boolean;
        lastUpdated?: number;
        status: string;
        error?: string;
      }
  >;

  /** Updates value silently without triggering events */
  setValueSilent(value: boolean): Promise<void>;
}

export interface UiCheckboxEvents {
  /** Emitted when checkbox value changes */
  valueMsg: CustomEvent<UiMsg<boolean>>;
}

// ============================================================================
// UI-CALENDAR COMPONENT
// ============================================================================

export interface UiCalendarProps extends BaseComponentProps {
  /** Visual style variant */
  variant?: 'outlined' | 'filled';

  /** Current date-time value (ISO string) */
  value?: string;

  /** Text label displayed above the calendar */
  label?: string;

  /** Enable keyboard navigation */
  keyboard?: boolean;

  /** Connection state for readonly mode */
  connected?: boolean;

  /** Display calendar inline instead of as dropdown */
  inline?: boolean;

  /** Include time picker alongside date picker */
  includeTime?: boolean;

  /** Time format (12-hour or 24-hour) */
  timeFormat?: '12' | '24';

  /** Minimum date (ISO string) */
  minDate?: string;

  /** Maximum date (ISO string) */
  maxDate?: string;

  /** First day of week (0 = Sunday, 1 = Monday) */
  firstDayOfWeek?: number;

  /** Disabled dates (ISO strings) */
  disabledDates?: string[];

  /** Show week numbers */
  showWeekNumbers?: boolean;
}

export interface UiCalendarState extends BaseComponentState {
  selectedDate: Date;
  timestampCounter: number;
  suppressEvents: boolean;
  currentMonth: number;
  currentYear: number;
  isOpen: boolean;
  selectedHour: number;
  selectedMinute: number;
  isAM: boolean;
  showClockView: boolean;
}

export interface UiCalendarMethods extends BaseComponentMethods {
  /** Sets the calendar value with optional write operation */
  setValue(
    value: string,
    options?: {
      writeOperation?: (value: string) => Promise<any>;
    },
  ): Promise<any>;

  /** Gets the current calendar value */
  getValue(includeMetadata?: boolean): Promise<
    | string
    | undefined
    | {
        value: string | undefined;
        lastUpdated?: number;
        status: string;
        error?: string;
      }
  >;

  /** Updates value silently without triggering events */
  setValueSilent(value: string): Promise<void>;
}

export interface UiCalendarEvents {
  /** Emitted when calendar value changes */
  valueMsg: CustomEvent<UiMsg<string>>;
}

// ============================================================================
// UI-COLOR-PICKER COMPONENT
// ============================================================================

export interface UiColorPickerProps extends BaseComponentProps {
  /** Visual style variant */
  variant?: ComponentVariant;

  /** Current color value (hex format) */
  value?: string;

  /** Text label displayed above the picker */
  label?: string;

  /** Make component read-only */
  readonly?: boolean;

  /** Enable keyboard navigation */
  keyboard?: boolean;

  /** Color format for display and output */
  format?: 'hex' | 'rgb' | 'hsl';

  /** Show alpha/opacity control */
  showAlpha?: boolean;

  /** Predefined color palette */
  palette?: string[];

  /** Allow custom color input */
  allowCustom?: boolean;
}

export interface UiColorPickerState extends BaseComponentState {
  currentColor: string;
  timestampCounter: number;
  suppressEvents: boolean;
  isOpen: boolean;
  tempColor: string;
}

export interface UiColorPickerMethods extends BaseComponentMethods {
  /** Sets the color value with optional write operation */
  setValue(
    value: string,
    options?: {
      writeOperation?: (value: string) => Promise<any>;
      _isRevert?: boolean;
    },
  ): Promise<boolean>;

  /** Gets the current color value */
  getValue(includeMetadata?: boolean): Promise<
    | string
    | {
        value: string;
        lastUpdated?: number;
        status: string;
        error?: string;
      }
  >;

  /** Updates value silently without triggering events */
  setValueSilent(value: string): Promise<void>;
}

export interface UiColorPickerEvents {
  /** Emitted when color value changes */
  valueMsg: CustomEvent<UiMsg<string>>;
}

// ============================================================================
// UI-FILE-PICKER COMPONENT
// ============================================================================

export interface UiFilePickerProps extends BaseComponentProps {
  /** Text label displayed above the picker */
  label?: string;

  /** File type restrictions */
  accept?: string;

  /** Whether multiple files can be selected */
  multiple?: boolean;

  /** Maximum file size in bytes */
  maxSize?: number;

  /** Maximum number of files when multiple is true */
  maxFiles?: number;
}

export interface UiFilePickerState extends BaseComponentState {
  selectedFiles: File[];
  timestampCounter: number;
  suppressEvents: boolean;
  isDragOver: boolean;
}

export interface UiFilePickerMethods extends BaseComponentMethods {
  /** Sets the upload operation for file processing */
  setUpload(
    operation: (fileData: { name: string; size: number; type: string; content: string }) => Promise<any>,
    options?: {
      propertyName?: string;
      writeProperty?: (propertyName: string, value: any) => Promise<void>;
    },
  ): Promise<boolean>;

  /** Gets the currently selected files */
  getFiles(includeMetadata?: boolean): Promise<
    | File[]
    | {
        value: File[];
        lastUpdated?: number;
        status: string;
        error?: string;
      }
  >;

  /** Clears all selected files */
  clearFiles(): Promise<void>;
}

export interface UiFilePickerEvents {
  /** Emitted when files are selected */
  valueMsg: CustomEvent<UiMsg<File[]>>;
}

// ============================================================================
// UI-EVENT COMPONENT
// ============================================================================

export interface UiEventProps extends BaseComponentProps {
  /** Text label displayed above the event display */
  label?: string;

  /** Maximum number of events to display */
  maxEvents?: number;

  /** Whether to show timestamps for events */
  showTimestamps?: boolean;

  /** Whether to auto-scroll to latest events */
  autoScroll?: boolean;

  /** Event data format */
  eventFormat?: 'json' | 'text' | 'custom';
}

export interface UiEventState extends BaseComponentState {
  eventHistory: any[];
  timestampCounter: number;
  isListening: boolean;
  suppressEvents: boolean;
}

export interface UiEventMethods extends BaseComponentMethods {
  /** Starts listening for events */
  startListening(): Promise<void>;

  /** Stops listening for events */
  stopListening(): Promise<void>;

  /** Gets the event history */
  getEventHistory(includeMetadata?: boolean): Promise<
    | Array<any>
    | {
        value: Array<any>;
        lastUpdated?: number;
        status: string;
        error?: string;
      }
  >;

  /** Adds a new event to the history */
  addEvent(eventData: any, eventId?: string): Promise<void>;

  /** Clears all events */
  clearEvents(): Promise<void>;

  /** Checks if component is listening */
  isListening(): Promise<boolean>;

  /** Forces cleanup of resources */
  forceCleanup(): Promise<void>;
}

export interface UiEventEvents {
  /** Emitted when new events are received */
  eventMsg: CustomEvent<UiMsg<any>>;
}

// ============================================================================
// UI-NOTIFICATION COMPONENT
// ============================================================================

export interface UiNotificationProps extends BaseComponentProps {
  /** Type of notification affecting styling and icons */
  type?: 'info' | 'success' | 'warning' | 'error';

  /** The message text to display */
  message?: string;

  /** Duration in milliseconds before auto-dismiss (0 to disable) */
  duration?: number;

  /** Whether to show a close button */
  showCloseButton?: boolean;

  /** Whether to show an icon based on notification type */
  showIcon?: boolean;
}

export interface UiNotificationState extends BaseComponentState {
  isVisible: boolean;
  isAnimating: boolean;
  dismissTimer?: number;
}

export interface UiNotificationMethods {
  /** Shows the notification */
  show(): Promise<void>;

  /** Gets the current notification visibility */
  getValue(includeMetadata?: boolean): Promise<
    | boolean
    | {
        value: boolean;
        message: string;
        type: string;
        duration: number;
      }
  >;

  /** Dismisses the notification */
  dismiss(method?: 'auto' | 'manual' | 'programmatic'): Promise<void>;

  /** Toggles notification visibility */
  toggle(): Promise<void>;
}

export interface UiNotificationEvents {
  /** Emitted when notification is closed/dismissed */
  notificationClose: CustomEvent<{
    message: string;
    type: string;
    dismissMethod: 'auto' | 'manual' | 'programmatic';
    timestamp: number;
  }>;
}

// ============================================================================
// COMPONENT REGISTRY
// ============================================================================

/** Registry of all UI-WoT components with their interfaces */
export interface ComponentRegistry {
  'ui-button': {
    props: UiButtonProps;
    state: UiButtonState;
    methods: UiButtonMethods;
    events: UiButtonEvents;
  };
  'ui-toggle': {
    props: UiToggleProps;
    state: UiToggleState;
    methods: UiToggleMethods;
    events: UiToggleEvents;
  };
  'ui-slider': {
    props: UiSliderProps;
    state: UiSliderState;
    methods: UiSliderMethods;
    events: UiSliderEvents;
  };
  'ui-text': {
    props: UiTextProps;
    state: UiTextState;
    methods: UiTextMethods;
    events: UiTextEvents;
  };
  'ui-number-picker': {
    props: UiNumberPickerProps;
    state: UiNumberPickerState;
    methods: UiNumberPickerMethods;
    events: UiNumberPickerEvents;
  };
  'ui-checkbox': {
    props: UiCheckboxProps;
    state: UiCheckboxState;
    methods: UiCheckboxMethods;
    events: UiCheckboxEvents;
  };
  'ui-calendar': {
    props: UiCalendarProps;
    state: UiCalendarState;
    methods: UiCalendarMethods;
    events: UiCalendarEvents;
  };
  'ui-color-picker': {
    props: UiColorPickerProps;
    state: UiColorPickerState;
    methods: UiColorPickerMethods;
    events: UiColorPickerEvents;
  };
  'ui-file-picker': {
    props: UiFilePickerProps;
    state: UiFilePickerState;
    methods: UiFilePickerMethods;
    events: UiFilePickerEvents;
  };
  'ui-event': {
    props: UiEventProps;
    state: UiEventState;
    methods: UiEventMethods;
    events: UiEventEvents;
  };
  'ui-notification': {
    props: UiNotificationProps;
    state: UiNotificationState;
    methods: UiNotificationMethods;
    events: UiNotificationEvents;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/** Extract component name from registry */
export type ComponentName = keyof ComponentRegistry;

/** Extract props type for a specific component */
export type ComponentProps<T extends ComponentName> = ComponentRegistry[T]['props'];

/** Extract methods type for a specific component */
export type ComponentMethods<T extends ComponentName> = ComponentRegistry[T]['methods'];

/** Extract events type for a specific component */
export type ComponentEvents<T extends ComponentName> = ComponentRegistry[T]['events'];

/** Extract state type for a specific component */
export type ComponentState<T extends ComponentName> = ComponentRegistry[T]['state'];

/** Type for component instances with full interface */
export type ComponentInstance<T extends ComponentName> = ComponentProps<T> &
  ComponentMethods<T> &
  ComponentEvents<T> & {
    /** HTML element reference */
    el: HTMLElement;
  };

/** Common setValue method signature for value-based components */
export type SetValueMethod<T> = (
  value: T,
  options?: {
    writeOperation?: (value: T) => Promise<any>;
    _isRevert?: boolean;
  },
) => Promise<boolean>;

/** Common getValue method signature for value-based components */
export type GetValueMethod<T> = (includeMetadata?: boolean) => Promise<
  | T
  | {
      value: T;
      lastUpdated?: number;
      status: string;
      error?: string;
    }
>;

/** WoT integration options for components */
export interface WotIntegrationOptions<T = any> {
  /** Function to write property to WoT Thing */
  writeProperty?: (propertyName: string, value: T) => Promise<void>;

  /** Function to read property from WoT Thing */
  readProperty?: (propertyName: string) => Promise<T>;

  /** Function to invoke action on WoT Thing */
  invokeAction?: (actionName: string, input?: any) => Promise<any>;

  /** Function to subscribe to events on WoT Thing */
  subscribeEvent?: (eventName: string, listener: (data: any) => void) => Promise<void>;

  /** Function to unsubscribe from events */
  unsubscribeEvent?: (eventName: string) => Promise<void>;
}

/** Component initialization options */
export interface ComponentInitOptions<T extends ComponentName> {
  /** Component name */
  name: T;

  /** Initial props */
  props?: Partial<ComponentProps<T>>;

  /** WoT integration configuration */
  wot?: WotIntegrationOptions;

  /** Element to attach component to */
  target?: HTMLElement | string;

  /** Component ID */
  id?: string;
}
