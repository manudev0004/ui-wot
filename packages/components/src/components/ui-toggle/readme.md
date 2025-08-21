# ui-toggle



<!-- Auto Generated Below -->


## Overview

A clean, accessible boolean toggle switch component.

## Properties

| Property   | Attribute  | Description                                                             | Type                                                   | Default     |
| ---------- | ---------- | ----------------------------------------------------------------------- | ------------------------------------------------------ | ----------- |
| `color`    | `color`    | Color theme variant.                                                    | `"neutral" \| "primary" \| "secondary"`                | `'primary'` |
| `disabled` | `disabled` | Whether the toggle is disabled (cannot be interacted with).             | `boolean`                                              | `false`     |
| `label`    | `label`    | Text label displayed next to the toggle.                                | `string`                                               | `undefined` |
| `readonly` | `readonly` | Whether the toggle is read-only (displays value but cannot be changed). | `boolean`                                              | `false`     |
| `size`     | `size`     | Component size variant.                                                 | `"lg" \| "md" \| "sm"`                                 | `'md'`      |
| `value`    | `value`    | Current boolean value of the toggle.                                    | `boolean`                                              | `false`     |
| `variant`  | `variant`  | Visual style variant of the toggle.                                     | `"apple" \| "circle" \| "cross" \| "neon" \| "square"` | `'circle'`  |


## Events

| Event         | Description                                                                                        | Type                               |
| ------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `toggle`      | <span style="color:red">**[DEPRECATED]**</span> Use valueMsg instead<br/><br/>                     | `CustomEvent<UiToggleToggleEvent>` |
| `valueChange` | <span style="color:red">**[DEPRECATED]**</span> Use valueMsg instead<br/><br/>                     | `CustomEvent<UiToggleValueChange>` |
| `valueMsg`    | Primary event emitted when the toggle value changes. Use this event for all value change handling. | `CustomEvent<UiMsg<boolean>>`      |


## Methods

### `getValue() => Promise<boolean>`

Get the current toggle value.

#### Returns

Type: `Promise<boolean>`

Promise that resolves to the current boolean value

### `setValue(value: boolean) => Promise<boolean>`

Set the toggle value programmatically.

#### Parameters

| Name    | Type      | Description             |
| ------- | --------- | ----------------------- |
| `value` | `boolean` | - The new boolean value |

#### Returns

Type: `Promise<boolean>`

Promise that resolves to true if successful


## Slots

| Slot      | Description                                 |
| --------- | ------------------------------------------- |
| `"label"` | Custom label content (overrides label prop) |


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
