# ui-button



<!-- Auto Generated Below -->


## Overview

Button component with various visual styles, matching the ui-number-picker design family.
Supports the same variants, colors, and themes as the number picker.

## Properties

| Property          | Attribute           | Description                                                                                                                                                       | Type                                    | Default     |
| ----------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------- |
| `color`           | `color`             | Color scheme to match thingsweb webpage                                                                                                                           | `"neutral" \| "primary" \| "secondary"` | `'primary'` |
| `dark`            | `dark`              | Dark theme variant.                                                                                                                                               | `boolean`                               | `false`     |
| `disabled`        | `disabled`          | Whether the component is disabled (cannot be interacted with).                                                                                                    | `boolean`                               | `false`     |
| `keyboard`        | `keyboard`          | Enable keyboard navigation.                                                                                                                                       | `boolean`                               | `true`      |
| `label`           | `label`             | Button text label.                                                                                                                                                | `string`                                | `'Button'`  |
| `readonly`        | `readonly`          | Whether the component is read-only (displays value but cannot be changed).                                                                                        | `boolean`                               | `false`     |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp below the component.                                                                                                                  | `boolean`                               | `false`     |
| `variant`         | `variant`           | Visual style variant of the button. - minimal: Clean button with subtle background (default) - outlined: Button with border outline - filled: Solid filled button | `"filled" \| "minimal" \| "outlined"`   | `'minimal'` |


## Events

| Event         | Description                                                                                           | Type                         |
| ------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------- |
| `buttonClick` | Event emitted when button is clicked                                                                  | `CustomEvent<UiButtonClick>` |
| `valueMsg`    | Primary event emitted when the component value changes. Use this event for all value change handling. | `CustomEvent<UiMsg<string>>` |


## Methods

### `getValue() => Promise<string>`

Get current button value (its label)

#### Returns

Type: `Promise<string>`



### `setStatus(status: "idle" | "loading" | "success" | "error", message?: string) => Promise<void>`

Manually set operation status

#### Parameters

| Name      | Type                                          | Description |
| --------- | --------------------------------------------- | ----------- |
| `status`  | `"idle" \| "loading" \| "success" \| "error"` |             |
| `message` | `string`                                      |             |

#### Returns

Type: `Promise<void>`



### `setValue(value: string, options?: { writeOperation?: () => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; customStatus?: "loading" | "success" | "error"; errorMessage?: string; _isRevert?: boolean; }) => Promise<boolean>`

Consolidated setValue method with automatic Promise-based status management

#### Parameters

| Name      | Type                                                                                                                                                                                                                                                 | Description |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `value`   | `string`                                                                                                                                                                                                                                             |             |
| `options` | `{ writeOperation?: () => Promise<any>; readOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; customStatus?: "loading" \| "success" \| "error"; errorMessage?: string; _isRevert?: boolean; }` |             |

#### Returns

Type: `Promise<boolean>`



### `setValueSilent(value: string) => Promise<boolean>`

Set value silently without triggering events or status changes

#### Parameters

| Name    | Type     | Description |
| ------- | -------- | ----------- |
| `value` | `string` |             |

#### Returns

Type: `Promise<boolean>`



### `triggerReadPulse() => Promise<void>`

Trigger visual read pulse (brief animation)

#### Returns

Type: `Promise<void>`




## Shadow Parts

| Part          | Description |
| ------------- | ----------- |
| `"button"`    |             |
| `"container"` |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
