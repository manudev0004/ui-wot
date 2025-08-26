# ui-toggle



<!-- Auto Generated Below -->


## Overview

Advanced toggle switch component with reactive state management and multiple visual styles.

## Properties

| Property          | Attribute           | Description                                                                          | Type                                                   | Default     |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ | ----------- |
| `color`           | `color`             | Color theme variant.                                                                 | `"neutral" \| "primary" \| "secondary"`                | `'primary'` |
| `connected`       | `connected`         | Connection state for readonly mode                                                   | `boolean`                                              | `true`      |
| `dark`            | `dark`              | Enable dark theme for the component. When true, uses light text on dark backgrounds. | `boolean`                                              | `false`     |
| `disabled`        | `disabled`          | Whether the toggle is disabled (cannot be interacted with).                          | `boolean`                                              | `false`     |
| `keyboard`        | `keyboard`          | Enable keyboard navigation (Space and Enter keys). Default: true                     | `boolean`                                              | `true`      |
| `label`           | `label`             | Text label displayed next to the toggle.                                             | `string`                                               | `undefined` |
| `readonly`        | `readonly`          | Whether the toggle is read-only (displays value but cannot be changed).              | `boolean`                                              | `false`     |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp when true                                                | `boolean`                                              | `false`     |
| `value`           | `value`             | Current boolean value of the toggle.                                                 | `boolean`                                              | `false`     |
| `variant`         | `variant`           | Visual style variant of the toggle.                                                  | `"apple" \| "circle" \| "cross" \| "neon" \| "square"` | `'circle'`  |


## Events

| Event      | Description                                          | Type                          |
| ---------- | ---------------------------------------------------- | ----------------------------- |
| `valueMsg` | Primary event emitted when the toggle value changes. | `CustomEvent<UiMsg<boolean>>` |


## Methods

### `getValue(includeMetadata?: boolean) => Promise<boolean | { value: boolean; lastUpdated?: number; status: string; error?: string; }>`

Get the current toggle value with optional metadata

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




## Shadow Parts

| Part                   | Description |
| ---------------------- | ----------- |
| `"container"`          |             |
| `"control"`            |             |
| `"label"`              |             |
| `"last-updated"`       |             |
| `"readonly-indicator"` |             |
| `"thumb"`              |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
