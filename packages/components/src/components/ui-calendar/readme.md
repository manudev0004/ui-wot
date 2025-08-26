# ui-calendar



<!-- Auto Generated Below -->


## Overview

Advanced calendar component with comprehensive styling, variants, and features.
Matches the design family of ui-button, ui-slider, and other components.

## Properties

| Property          | Attribute           | Description                                                                                                                                                                                                                                                                                       | Type                                                                          | Default     |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------- |
| `animation`       | `animation`         | Animation style for transitions. - none: No animations - slide: Slide transitions between months - fade: Fade transitions   - bounce: Playful bounce effects                                                                                                                                      | `"bounce" \| "fade" \| "none" \| "slide"`                                     | `'slide'`   |
| `color`           | `color`             | Color scheme matching the component family palette. - primary: Main brand color (blue tones) - secondary: Accent color (green/teal tones)   - neutral: Grayscale for subtle integration - success: Green for positive actions - warning: Orange for caution - danger: Red for destructive actions | `"danger" \| "neutral" \| "primary" \| "secondary" \| "success" \| "warning"` | `'primary'` |
| `dark`            | `dark`              | Dark theme variant.                                                                                                                                                                                                                                                                               | `boolean`                                                                     | `false`     |
| `disabled`        | `disabled`          | Whether the component is disabled (cannot be interacted with).                                                                                                                                                                                                                                    | `boolean`                                                                     | `false`     |
| `firstDayOfWeek`  | `first-day-of-week` | First day of week (0 = Sunday, 1 = Monday).                                                                                                                                                                                                                                                       | `0 \| 1`                                                                      | `0`         |
| `includeTime`     | `include-time`      | Include time picker alongside date picker. Supports hour:minute selection with AM/PM or 24-hour format.                                                                                                                                                                                           | `boolean`                                                                     | `false`     |
| `inline`          | `inline`            | Display calendar inline instead of as dropdown popup. Perfect for always-visible date selection.                                                                                                                                                                                                  | `boolean`                                                                     | `false`     |
| `keyboard`        | `keyboard`          | Enable keyboard navigation and shortcuts.                                                                                                                                                                                                                                                         | `boolean`                                                                     | `true`      |
| `label`           | `label`             | Optional text label for the calendar with enhanced styling.                                                                                                                                                                                                                                       | `string`                                                                      | `undefined` |
| `maxDate`         | `max-date`          | Maximum selectable date (ISO string).                                                                                                                                                                                                                                                             | `string`                                                                      | `undefined` |
| `minDate`         | `min-date`          | Minimum selectable date (ISO string).                                                                                                                                                                                                                                                             | `string`                                                                      | `undefined` |
| `readonly`        | `readonly`          | Whether the component is read-only (displays value but cannot be changed).                                                                                                                                                                                                                        | `boolean`                                                                     | `false`     |
| `showClearButton` | `show-clear-button` | Show clear button to reset selection.                                                                                                                                                                                                                                                             | `boolean`                                                                     | `true`      |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp below the component.                                                                                                                                                                                                                                                  | `boolean`                                                                     | `false`     |
| `showTodayButton` | `show-today-button` | Show today button for quick navigation.                                                                                                                                                                                                                                                           | `boolean`                                                                     | `true`      |
| `showWeekNumbers` | `show-week-numbers` | Show week numbers in calendar grid.                                                                                                                                                                                                                                                               | `boolean`                                                                     | `false`     |
| `size`            | `size`              | Component size for different use cases. - small: Compact calendar for tight spaces - medium: Standard size (default) - large: Prominent calendar with larger touch targets                                                                                                                        | `"large" \| "medium" \| "small"`                                              | `'medium'`  |
| `timeFormat`      | `time-format`       | Time format when includeTime is enabled. - 12: 12-hour format with AM/PM - 24: 24-hour format                                                                                                                                                                                                     | `"12" \| "24"`                                                                | `'12'`      |
| `value`           | `value`             | Current selected date-time value (ISO string).                                                                                                                                                                                                                                                    | `string`                                                                      | `undefined` |
| `variant`         | `variant`           | Visual style variant matching component family design. - minimal: Clean, borderless design with subtle hover effects - outlined: Border with transparent background, colored accents - filled: Solid background with contrasting text - elevated: Shadow and depth for prominent display          | `"elevated" \| "filled" \| "minimal" \| "outlined"`                           | `'minimal'` |


## Events

| Event         | Description                                                                                                                                                  | Type                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| `dateChange`  | Event emitted when date changes                                                                                                                              | `CustomEvent<UiCalendarDateChange>`  |
| `valueChange` | Standardized valueChange event for calendar                                                                                                                  | `CustomEvent<UiCalendarValueChange>` |
| `valueMsg`    | Standardized value event emitter - emits UiMsg<string> with enhanced metadata. Provides consistent value change notifications with unified messaging format. | `CustomEvent<UiMsg<string>>`         |


## Methods

### `getValue() => Promise<string | undefined>`

Get the current calendar value.

#### Returns

Type: `Promise<string>`

Current date value as ISO string or undefined

### `setStatus(status: "success" | "warning" | "error" | null, message?: string) => Promise<void>`

Set the visual status of the calendar (success, warning, error).

#### Parameters

| Name      | Type                                | Description                    |
| --------- | ----------------------------------- | ------------------------------ |
| `status`  | `"success" \| "error" \| "warning"` | - Status type or null to clear |
| `message` | `string`                            | - Optional status message      |

#### Returns

Type: `Promise<void>`



### `setValue(value: string, metadata?: Record<string, any>) => Promise<void>`

Set the calendar value programmatically and emit events.

#### Parameters

| Name       | Type                    | Description                                 |
| ---------- | ----------------------- | ------------------------------------------- |
| `value`    | `string`                | - ISO date string to set                    |
| `metadata` | `{ [x: string]: any; }` | - Optional metadata to include in the event |

#### Returns

Type: `Promise<void>`



### `setValueSilent(value: string) => Promise<void>`

Set value without emitting events (silent update).

#### Parameters

| Name    | Type     | Description              |
| ------- | -------- | ------------------------ |
| `value` | `string` | - ISO date string to set |

#### Returns

Type: `Promise<void>`



### `triggerReadPulse() => Promise<void>`

Trigger a visual pulse effect to indicate the value was read/accessed.

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
