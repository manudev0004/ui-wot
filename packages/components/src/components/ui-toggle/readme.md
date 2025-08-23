# ui-toggle



<!-- Auto Generated Below -->


> **[DEPRECATED]** The following events are deprecated, use valueMsg instead

## Overview

Advanced toggle switch component with reactive state management and multiple visual styles.
Provides accessibility features, flexible event handling, and beautiful UI variants.

## Properties

| Property    | Attribute   | Description                                                                                                                           | Type                                                   | Default     |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------- |
| `color`     | `color`     | Color theme variant.                                                                                                                  | `"neutral" \| "primary" \| "secondary"`                | `'primary'` |
| `connected` | `connected` | Connection state (readonly)                                                                                                           | `boolean`                                              | `true`      |
| `dark`      | `dark`      | Enable dark theme for the component. When true, uses light text on dark backgrounds.                                                  | `boolean`                                              | `false`     |
| `disabled`  | `disabled`  | Whether the toggle is disabled (cannot be interacted with).                                                                           | `boolean`                                              | `false`     |
| `keyboard`  | `keyboard`  | Enable keyboard navigation (Space and Enter keys). Default: true                                                                      | `boolean`                                              | `true`      |
| `label`     | `label`     | Text label displayed next to the toggle.                                                                                              | `string`                                               | `undefined` |
| `mode`      | `mode`      | Legacy mode prop for backward compatibility with older demos. Accepts 'read' to indicate read-only mode, 'readwrite' for interactive. | `"read" \| "readwrite"`                                | `undefined` |
| `readonly`  | `readonly`  | Whether the toggle is read-only (displays value but cannot be changed).                                                               | `boolean`                                              | `false`     |
| `value`     | `value`     | Current boolean value of the toggle.                                                                                                  | `boolean`                                              | `false`     |
| `variant`   | `variant`   | Visual style variant of the toggle.                                                                                                   | `"apple" \| "circle" \| "cross" \| "neon" \| "square"` | `'circle'`  |


## Events

| Event      | Description                                                                                        | Type                          |
| ---------- | -------------------------------------------------------------------------------------------------- | ----------------------------- |
| `valueMsg` | Primary event emitted when the toggle value changes. Use this event for all value change handling. | `CustomEvent<UiMsg<boolean>>` |


## Methods

### `finishWriteOperation(success: boolean, errorMsg?: string) => Promise<void>`



#### Parameters

| Name       | Type      | Description |
| ---------- | --------- | ----------- |
| `success`  | `boolean` |             |
| `errorMsg` | `string`  |             |

#### Returns

Type: `Promise<void>`



### `getValue() => Promise<boolean>`

Get the current toggle value.

#### Returns

Type: `Promise<boolean>`

Promise that resolves to the current boolean value

### `markReadUpdate() => Promise<void>`



#### Returns

Type: `Promise<void>`



### `setValue(value: boolean) => Promise<boolean>`

Set the toggle value programmatically.

#### Parameters

| Name    | Type      | Description             |
| ------- | --------- | ----------------------- |
| `value` | `boolean` | - The new boolean value |

#### Returns

Type: `Promise<boolean>`

Promise that resolves to true if successful

### `startWriteOperation() => Promise<void>`

Expose status methods as component methods so they exist on the element instance

#### Returns

Type: `Promise<void>`




## Shadow Parts

| Part                   | Description |
| ---------------------- | ----------- |
| `"container"`          |             |
| `"control"`            |             |
| `"label"`              |             |
| `"readonly-indicator"` |             |
| `"thumb"`              |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
