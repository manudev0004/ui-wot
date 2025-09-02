# ui-toggle



<!-- Auto Generated Below -->


## Overview

Toggle switch component with reactive state management and multiple visual styles.
Designed for Web of Things (WoT) applications with built-in IoT device integration,
optimistic updates, error handling, and real-time status indicators.

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

| Event      | Description                                                                                                            | Type                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `valueMsg` | Primary event emitted when the toggle value changes. Use this event for all value change handling in IoT applications. | `CustomEvent<UiMsg<boolean>>` |


## Methods

### `getValue(includeMetadata?: boolean) => Promise<boolean | { value: boolean; lastUpdated?: number; status: string; error?: string; }>`

Get the current toggle value with optional metadata.
Use this method to read the current state and optionally get additional information.

#### Parameters

| Name              | Type      | Description                                               |
| ----------------- | --------- | --------------------------------------------------------- |
| `includeMetadata` | `boolean` | - Whether to include additional metadata (default: false) |

#### Returns

Type: `Promise<boolean | { value: boolean; lastUpdated?: number; status: string; error?: string; }>`

Promise<boolean | MetadataResult> - Current value or object with metadata

### `setStatus(status: "idle" | "loading" | "success" | "error", errorMessage?: string) => Promise<void>`

Set operation status for external status management.
Use this method to manually control the visual status indicators
when managing device communication externally.

#### Parameters

| Name           | Type                                          | Description                                                 |
| -------------- | --------------------------------------------- | ----------------------------------------------------------- |
| `status`       | `"error" \| "loading" \| "success" \| "idle"` | - The status to set ('idle', 'loading', 'success', 'error') |
| `errorMessage` | `string`                                      | - Optional error message for error status                   |

#### Returns

Type: `Promise<void>`

Promise<void>

### `setValue(value: boolean, options?: { writeOperation?: () => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; customStatus?: "loading" | "success" | "error"; errorMessage?: string; _isRevert?: boolean; }) => Promise<boolean>`

Set the toggle value with automatic device communication and status management.
This is the primary method for interacting with the toggle component.

#### Parameters

| Name      | Type                                                                                                                                                                                                                                                 | Description                                         |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `value`   | `boolean`                                                                                                                                                                                                                                            | - The boolean value to set (true = on, false = off) |
| `options` | `{ writeOperation?: () => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; customStatus?: "error" \| "loading" \| "success"; errorMessage?: string; _isRevert?: boolean; }` | - Configuration options for the operation           |

#### Returns

Type: `Promise<boolean>`

Promise<boolean> - true if successful, false if failed

### `setValueSilent(value: boolean) => Promise<void>`

Set value programmatically without triggering events (for external updates).
Use this method when updating the toggle from external data sources
to prevent event loops and maintain proper state synchronization.

#### Parameters

| Name    | Type      | Description                         |
| ------- | --------- | ----------------------------------- |
| `value` | `boolean` | - The boolean value to set silently |

#### Returns

Type: `Promise<void>`

Promise<void>

### `triggerReadPulse() => Promise<void>`

Trigger a read pulse indicator for readonly mode when data is actually fetched.
Use this method to provide visual feedback when refreshing data from external sources
like IoT devices, APIs, or real-time data streams.

#### Returns

Type: `Promise<void>`

Promise<void>


## Shadow Parts

| Part                       | Description |
| -------------------------- | ----------- |
| `"container"`              |             |
| `"control"`                |             |
| `"label"`                  |             |
| `"readonly-indicator"`     |             |
| `"readonly-pulse-sibling"` |             |
| `"thumb"`                  |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
