# ui-checkbox



<!-- Auto Generated Below -->


## Overview

Advanced checkbox component with reactive state management and multiple visual styles.

## Properties

| Property          | Attribute           | Description                                                                          | Type                                    | Default      |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------ | --------------------------------------- | ------------ |
| `color`           | `color`             | Color theme variant.                                                                 | `"neutral" \| "primary" \| "secondary"` | `'primary'`  |
| `dark`            | `dark`              | Enable dark theme for the component. When true, uses light text on dark backgrounds. | `boolean`                               | `false`      |
| `disabled`        | `disabled`          | Whether the checkbox is disabled (cannot be interacted with).                        | `boolean`                               | `false`      |
| `keyboard`        | `keyboard`          | Enable keyboard navigation (Space and Enter keys). Default: true                     | `boolean`                               | `true`       |
| `label`           | `label`             | Text label displayed next to the checkbox.                                           | `string`                                | `undefined`  |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp when true                                                | `boolean`                               | `true`       |
| `value`           | `value`             | Current boolean value of the checkbox.                                               | `boolean`                               | `false`      |
| `variant`         | `variant`           | Visual style variant of the checkbox.                                                | `"filled" \| "minimal" \| "outlined"`   | `'outlined'` |


## Events

| Event      | Description                                            | Type                          |
| ---------- | ------------------------------------------------------ | ----------------------------- |
| `valueMsg` | Primary event emitted when the checkbox value changes. | `CustomEvent<UiMsg<boolean>>` |


## Methods

### `getValue(includeMetadata?: boolean) => Promise<boolean | { value: boolean; lastUpdated?: number; status: string; error?: string; }>`

Get the current checkbox value with optional metadata

#### Parameters

| Name              | Type      | Description                                 |
| ----------------- | --------- | ------------------------------------------- |
| `includeMetadata` | `boolean` | - Include last updated timestamp and status |

#### Returns

Type: `Promise<boolean | { value: boolean; lastUpdated?: number; status: string; error?: string; }>`

Promise that resolves to the current value or value with metadata

### `setStatus(status: "idle" | "loading" | "success" | "error", errorMessage?: string) => Promise<void>`

Set operation status for external status management

#### Parameters

| Name           | Type                                          | Description |
| -------------- | --------------------------------------------- | ----------- |
| `status`       | `"idle" \| "loading" \| "success" \| "error"` |             |
| `errorMessage` | `string`                                      |             |

#### Returns

Type: `Promise<void>`



### `setValue(value: boolean, options?: { writeOperation?: () => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; customStatus?: "loading" | "success" | "error"; errorMessage?: string; _isRevert?: boolean; }) => Promise<boolean>`

Consolidated setValue method with automatic Promise-based status management

#### Parameters

| Name      | Type                                                                                                                                                                                                                                                 | Description |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `value`   | `boolean`                                                                                                                                                                                                                                            |             |
| `options` | `{ writeOperation?: () => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; customStatus?: "loading" \| "success" \| "error"; errorMessage?: string; _isRevert?: boolean; }` |             |

#### Returns

Type: `Promise<boolean>`



### `setValueSilent(value: boolean) => Promise<void>`

Set value programmatically without triggering events (for external updates)

#### Parameters

| Name    | Type      | Description |
| ------- | --------- | ----------- |
| `value` | `boolean` |             |

#### Returns

Type: `Promise<void>`



### `triggerReadPulse() => Promise<void>`

Trigger a read pulse indicator for readonly mode when data is actually fetched

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
