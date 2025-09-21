# ui-checkbox



<!-- Auto Generated Below -->


## Overview

Advanced checkbox component with reactive state management and multiple visual styles.

## Properties

| Property          | Attribute           | Description                                                                                                                      | Type                                    | Default      |
| ----------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------ |
| `checked`         | `checked`           | Backwards-compatible `checked` attribute alias for `value`. Accepts attribute usage like `checked` or `checked="true"` in demos. | `boolean`                               | `undefined`  |
| `color`           | `color`             | Color theme variant.                                                                                                             | `"neutral" \| "primary" \| "secondary"` | `'primary'`  |
| `connected`       | `connected`         | Connection state for readonly mode                                                                                               | `boolean`                               | `true`       |
| `dark`            | `dark`              | Enable dark theme for the component. When true, uses light text on dark backgrounds.                                             | `boolean`                               | `false`      |
| `disabled`        | `disabled`          | Whether the checkbox is disabled (cannot be interacted with).                                                                    | `boolean`                               | `false`      |
| `keyboard`        | `keyboard`          | Enable keyboard navigation (Space and Enter keys). Default: true                                                                 | `boolean`                               | `true`       |
| `label`           | `label`             | Text label displayed next to the checkbox.                                                                                       | `string`                                | `undefined`  |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp when true                                                                                            | `boolean`                               | `true`       |
| `showStatus`      | `show-status`       | Show status badge when true                                                                                                      | `boolean`                               | `true`       |
| `value`           | `value`             | Current boolean value of the checkbox.                                                                                           | `boolean`                               | `false`      |
| `variant`         | `variant`           | Visual style variant of the checkbox.                                                                                            | `"filled" \| "minimal" \| "outlined"`   | `'outlined'` |


## Events

| Event      | Description                                            | Type                          |
| ---------- | ------------------------------------------------------ | ----------------------------- |
| `valueMsg` | Primary event emitted when the checkbox value changes. | `CustomEvent<UiMsg<boolean>>` |


## Methods

### `getValue(includeMetadata?: boolean) => Promise<boolean | { value: boolean; lastUpdated?: number; status: string; error?: string; }>`

Get the current checkbox value with optional metadata.

#### Parameters

| Name              | Type      | Description                                 |
| ----------------- | --------- | ------------------------------------------- |
| `includeMetadata` | `boolean` | - Include last updated timestamp and status |

#### Returns

Type: `Promise<boolean | { value: boolean; lastUpdated?: number; status: string; error?: string; }>`

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

### `setValue(value: boolean, options?: { writeOperation?: () => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; customStatus?: "loading" | "success" | "error"; errorMessage?: string; _isRevert?: boolean; }) => Promise<boolean>`

Set the checkbox value with automatic device communication and status management.

#### Parameters

| Name      | Type                                                                                                                                                                                                                                                 | Description                                                    |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `value`   | `boolean`                                                                                                                                                                                                                                            | - The boolean value to set (true = checked, false = unchecked) |
| `options` | `{ writeOperation?: () => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; customStatus?: "error" \| "loading" \| "success"; errorMessage?: string; _isRevert?: boolean; }` | - Configuration options for the operation                      |

#### Returns

Type: `Promise<boolean>`

Promise<boolean> - true if successful, false if failed

### `setValueSilent(value: boolean) => Promise<void>`

Set value programmatically without triggering events (for external updates).

#### Parameters

| Name    | Type      | Description                         |
| ------- | --------- | ----------------------------------- |
| `value` | `boolean` | - The boolean value to set silently |

#### Returns

Type: `Promise<void>`

Promise<void>

### `triggerReadPulse() => Promise<void>`

Trigger a read pulse indicator for readonly mode when data is actually fetched.
Note: Checkboxes don't support readonly mode, so this method is kept for API compatibility.

#### Returns

Type: `Promise<void>`

Promise<void>


## Shadow Parts

| Part          | Description |
| ------------- | ----------- |
| `"checkbox"`  |             |
| `"container"` |             |
| `"label"`     |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
