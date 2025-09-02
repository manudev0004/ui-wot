# ui-number-picker



<!-- Auto Generated Below -->


## Overview

Number picker component with various visual styles, TD integration and customizable range.
Supports increment/decrement buttons with Thing Description integration for IoT devices.

## Properties

| Property          | Attribute           | Description                                                                                                                                                                 | Type                                    | Default     |
| ----------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------- |
| `color`           | `color`             | Color theme variant.                                                                                                                                                        | `"neutral" \| "primary" \| "secondary"` | `'primary'` |
| `connected`       | `connected`         | Connection state for readonly mode                                                                                                                                          | `boolean`                               | `true`      |
| `dark`            | `dark`              | Enable dark theme for the component. When true, uses light text on dark backgrounds.                                                                                        | `boolean`                               | `false`     |
| `disabled`        | `disabled`          | Whether the number picker is disabled (cannot be interacted with).                                                                                                          | `boolean`                               | `false`     |
| `keyboard`        | `keyboard`          | Enable keyboard navigation (Arrow keys). Default: true                                                                                                                      | `boolean`                               | `true`      |
| `label`           | `label`             | Text label displayed above the number picker.                                                                                                                               | `string`                                | `undefined` |
| `max`             | `max`               | Maximum allowed value.                                                                                                                                                      | `number`                                | `100`       |
| `min`             | `min`               | Minimum allowed value.                                                                                                                                                      | `number`                                | `0`         |
| `readonly`        | `readonly`          | Whether the number picker is read-only (displays value but cannot be changed).                                                                                              | `boolean`                               | `false`     |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp when true                                                                                                                                       | `boolean`                               | `false`     |
| `step`            | `step`              | Step increment/decrement amount.                                                                                                                                            | `number`                                | `1`         |
| `value`           | `value`             | Current numeric value of the number picker.                                                                                                                                 | `number`                                | `0`         |
| `variant`         | `variant`           | Visual style variant of the number picker. - minimal: Clean buttons with subtle background (default) - outlined: Buttons with border outline - filled: Solid filled buttons | `"filled" \| "minimal" \| "outlined"`   | `'minimal'` |


## Events

| Event      | Description                                                 | Type                         |
| ---------- | ----------------------------------------------------------- | ---------------------------- |
| `valueMsg` | Primary event emitted when the number picker value changes. | `CustomEvent<UiMsg<number>>` |


## Methods

### `getValue(includeMetadata?: boolean) => Promise<number | { value: number; lastUpdated?: number; status: string; error?: string; }>`

Get the current number picker value with optional metadata.

#### Parameters

| Name              | Type      | Description                                 |
| ----------------- | --------- | ------------------------------------------- |
| `includeMetadata` | `boolean` | - Include last updated timestamp and status |

#### Returns

Type: `Promise<number | { value: number; lastUpdated?: number; status: string; error?: string; }>`

Promise that resolves to the current value or value with metadata

### `setStatus(status: "idle" | "loading" | "success" | "error", errorMessage?: string) => Promise<void>`

Set operation status for external status management.

#### Parameters

| Name           | Type                                          | Description                                                 |
| -------------- | --------------------------------------------- | ----------------------------------------------------------- |
| `status`       | `"error" \| "loading" \| "success" \| "idle"` | - The status to set ('idle', 'loading', 'success', 'error') |
| `errorMessage` | `string`                                      | - Optional error message for error status                   |

#### Returns

Type: `Promise<void>`

Promise<void>

### `setValue(value: number, options?: { writeOperation?: () => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; customStatus?: "loading" | "success" | "error"; errorMessage?: string; _isRevert?: boolean; }) => Promise<boolean>`

Set the number picker value with automatic device communication and status management.
Values are automatically clamped to the min/max range and adjusted to step increments.

#### Parameters

| Name      | Type                                                                                                                                                                                                                                                 | Description                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `value`   | `number`                                                                                                                                                                                                                                             | - The numeric value to set (will be clamped and stepped) |
| `options` | `{ writeOperation?: () => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; customStatus?: "error" \| "loading" \| "success"; errorMessage?: string; _isRevert?: boolean; }` | - Configuration options for the operation                |

#### Returns

Type: `Promise<boolean>`

Promise<boolean> - true if successful, false if failed

### `setValueSilent(value: number) => Promise<void>`

Set value programmatically without triggering events (for external updates).
Values are automatically clamped to the min/max range.

#### Parameters

| Name    | Type     | Description                         |
| ------- | -------- | ----------------------------------- |
| `value` | `number` | - The numeric value to set silently |

#### Returns

Type: `Promise<void>`

Promise<void>

### `triggerReadPulse() => Promise<void>`

Trigger a read pulse indicator for readonly mode when data is actually fetched.
Shows a visual pulse animation to indicate fresh data.

#### Returns

Type: `Promise<void>`

Promise<void>


## Shadow Parts

| Part                    | Description |
| ----------------------- | ----------- |
| `"container"`           |             |
| `"decrement-button"`    |             |
| `"increment-button"`    |             |
| `"interactive-wrapper"` |             |
| `"label"`               |             |
| `"readonly-indicator"`  |             |
| `"readonly-pulse"`      |             |
| `"value-display"`       |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
