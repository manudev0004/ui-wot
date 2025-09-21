# ui-slider



<!-- Auto Generated Below -->


## Overview

Advanced slider component with reactive state management and multiple visual styles.

## Properties

| Property          | Attribute           | Description                                                                          | Type                                                         | Default        |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------ | -------------- |
| `color`           | `color`             | Color theme variant.                                                                 | `"neutral" \| "primary" \| "secondary"`                      | `'primary'`    |
| `connected`       | `connected`         | Connection state for readonly mode                                                   | `boolean`                                                    | `true`         |
| `dark`            | `dark`              | Enable dark theme for the component. When true, uses light text on dark backgrounds. | `boolean`                                                    | `false`        |
| `disabled`        | `disabled`          | Whether the slider is disabled (cannot be interacted with).                          | `boolean`                                                    | `false`        |
| `keyboard`        | `keyboard`          | Enable keyboard navigation (Arrow keys, Home, End, PageUp, PageDown). Default: true  | `boolean`                                                    | `true`         |
| `label`           | `label`             | Text label displayed above the slider.                                               | `string`                                                     | `undefined`    |
| `max`             | `max`               | Maximum value of the slider.                                                         | `number`                                                     | `100`          |
| `min`             | `min`               | Minimum value of the slider.                                                         | `number`                                                     | `0`            |
| `orientation`     | `orientation`       | Orientation of the slider.                                                           | `"horizontal" \| "vertical"`                                 | `'horizontal'` |
| `readonly`        | `readonly`          | Whether the slider is read-only (displays value but cannot be changed).              | `boolean`                                                    | `false`        |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp when true                                                | `boolean`                                                    | `false`        |
| `showStatus`      | `show-status`       | Show status badge when true                                                          | `boolean`                                                    | `true`         |
| `step`            | `step`              | Step increment for the slider.                                                       | `number`                                                     | `1`            |
| `thumbShape`      | `thumb-shape`       | Shape of the slider thumb.                                                           | `"arrow" \| "circle" \| "diamond" \| "square" \| "triangle"` | `'circle'`     |
| `value`           | `value`             | Current numeric value of the slider.                                                 | `number`                                                     | `0`            |
| `variant`         | `variant`           | Visual style variant of the slider.                                                  | `"narrow" \| "neon" \| "rainbow" \| "stepped" \| "wide"`     | `'narrow'`     |


## Events

| Event      | Description                                          | Type                         |
| ---------- | ---------------------------------------------------- | ---------------------------- |
| `valueMsg` | Primary event emitted when the slider value changes. | `CustomEvent<UiMsg<number>>` |


## Methods

### `getValue(includeMetadata?: boolean) => Promise<number | { value: number; lastUpdated?: number; status: string; error?: string; }>`

Get the current slider value with optional metadata.

#### Parameters

| Name              | Type      | Description                                             |
| ----------------- | --------- | ------------------------------------------------------- |
| `includeMetadata` | `boolean` | - Include last updated timestamp and status information |

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

Set the slider value with automatic device communication and status management.
Values are automatically clamped to the min/max range.

#### Parameters

| Name      | Type                                                                                                                                                                                                                                                 | Description                                                   |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `value`   | `number`                                                                                                                                                                                                                                             | - The numeric value to set (will be clamped to min/max range) |
| `options` | `{ writeOperation?: () => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; customStatus?: "error" \| "loading" \| "success"; errorMessage?: string; _isRevert?: boolean; }` | - Configuration options for the operation                     |

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
Provides visual feedback for data refresh operations.

#### Returns

Type: `Promise<void>`

Promise<void>


## Shadow Parts

| Part                   | Description |
| ---------------------- | ----------- |
| `"container"`          |             |
| `"label"`              |             |
| `"readonly-indicator"` |             |
| `"readonly-pulse"`     |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
