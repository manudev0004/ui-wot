# ui-button



<!-- Auto Generated Below -->


## Overview

Button component with various visual styles, matching the ui-number-picker design family.
Supports the same variants, colors, and themes as the number picker.

## Properties

| Property          | Attribute           | Description                                                                                                                                                       | Type                                    | Default      |
| ----------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------ |
| `color`           | `color`             | Color scheme to match thingsweb webpage                                                                                                                           | `"neutral" \| "primary" \| "secondary"` | `'primary'`  |
| `connected`       | `connected`         | Connection state for readonly mode                                                                                                                                | `boolean`                               | `true`       |
| `dark`            | `dark`              | Dark theme variant.                                                                                                                                               | `boolean`                               | `false`      |
| `disabled`        | `disabled`          | Whether the component is disabled (cannot be interacted with).                                                                                                    | `boolean`                               | `false`      |
| `keyboard`        | `keyboard`          | Enable keyboard navigation.                                                                                                                                       | `boolean`                               | `true`       |
| `label`           | `label`             | Button text label.                                                                                                                                                | `string`                                | `'Button'`   |
| `readonly`        | `readonly`          | Whether the component is read-only (displays value but cannot be changed).                                                                                        | `boolean`                               | `false`      |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp below the component.                                                                                                                  | `boolean`                               | `true`       |
| `variant`         | `variant`           | Visual style variant of the button. - minimal: Clean button with subtle background (default) - outlined: Button with border outline - filled: Solid filled button | `"filled" \| "minimal" \| "outlined"`   | `'outlined'` |


## Events

| Event      | Description                                                                                           | Type                         |
| ---------- | ----------------------------------------------------------------------------------------------------- | ---------------------------- |
| `valueMsg` | Primary event emitted when the component value changes. Use this event for all value change handling. | `CustomEvent<UiMsg<string>>` |


## Methods

### `getValue() => Promise<string>`

Get current button value (its label).

#### Returns

Type: `Promise<string>`

Promise<string> - The current button label/text

### `setStatus(status: "idle" | "loading" | "success" | "error", message?: string) => Promise<void>`

Manually set operation status for external status management.

#### Parameters

| Name      | Type                                          | Description                                                 |
| --------- | --------------------------------------------- | ----------------------------------------------------------- |
| `status`  | `"error" \| "loading" \| "success" \| "idle"` | - The status to set ('idle', 'loading', 'success', 'error') |
| `message` | `string`                                      | - Optional error message for error status                   |

#### Returns

Type: `Promise<void>`

Promise<void>

### `setValue(value: string, options?: { writeOperation?: () => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; customStatus?: "loading" | "success" | "error"; errorMessage?: string; _isRevert?: boolean; }) => Promise<boolean>`

Set the button value (label) with automatic operation management.
This method allows you to change the button text and optionally perform operations.

#### Parameters

| Name      | Type                                                                                                                                                                                                                                                 | Description                               |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `value`   | `string`                                                                                                                                                                                                                                             | - The string value to set as button label |
| `options` | `{ writeOperation?: () => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; customStatus?: "error" \| "loading" \| "success"; errorMessage?: string; _isRevert?: boolean; }` | - Configuration options for the operation |

#### Returns

Type: `Promise<boolean>`

Promise<boolean> - true if successful, false if failed

### `setValueSilent(value: string) => Promise<boolean>`

Set value silently without triggering events or status changes.
Use this for external updates that shouldn't trigger event listeners.

#### Parameters

| Name    | Type     | Description                               |
| ------- | -------- | ----------------------------------------- |
| `value` | `string` | - The string value to set as button label |

#### Returns

Type: `Promise<boolean>`

Promise<boolean> - Always returns true

### `triggerReadPulse() => Promise<void>`

Trigger visual read pulse (brief animation).
Provides visual feedback for data refresh or read operations.

#### Returns

Type: `Promise<void>`

Promise<void>


## Shadow Parts

| Part          | Description |
| ------------- | ----------- |
| `"button"`    |             |
| `"container"` |             |
| `"label"`     |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
