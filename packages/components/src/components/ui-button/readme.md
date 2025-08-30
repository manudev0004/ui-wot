# ui-button



<!-- Auto Generated Below -->


## Overview

Normalized Button Component
A button component following UI-WoT standards with centralized utilities

## Properties

| Property        | Attribute        | Description                                      | Type                                               | Default     |
| --------------- | ---------------- | ------------------------------------------------ | -------------------------------------------------- | ----------- |
| `autoStatus`    | `auto-status`    | Auto-manage status feedback for async operations | `boolean`                                          | `false`     |
| `debounceDelay` | `debounce-delay` | Debounce delay for rapid clicks (ms)             | `number`                                           | `150`       |
| `disabled`      | `disabled`       | Whether the button is disabled                   | `boolean`                                          | `false`     |
| `icon`          | `icon`           | Icon to display before label                     | `string`                                           | `undefined` |
| `iconEnd`       | `icon-end`       | Icon to display after label                      | `string`                                           | `undefined` |
| `label`         | `label`          | Button text label                                | `string`                                           | `'Button'`  |
| `loading`       | `loading`        | Whether the button is in loading state           | `boolean`                                          | `false`     |
| `size`          | `size`           | Size variant                                     | `"lg" \| "md" \| "sm" \| "xl" \| "xs"`             | `'md'`      |
| `type`          | `type`           | Button type for form submission                  | `"button" \| "reset" \| "submit"`                  | `'button'`  |
| `variant`       | `variant`        | Visual variant of the button                     | `"ghost" \| "outline" \| "primary" \| "secondary"` | `'primary'` |


## Events

| Event         | Description                                            | Type                         |
| ------------- | ------------------------------------------------------ | ---------------------------- |
| `buttonClick` | Event emitted when button is clicked                   | `CustomEvent<UiButtonClick>` |
| `valueMsg`    | Primary event emitted when the component value changes | `CustomEvent<ValueMessage>`  |


## Methods

### `performAction(action: () => Promise<any>, options?: { loadingMessage?: string; successMessage?: string; errorMessage?: string; }) => Promise<boolean>`

Perform async operation with automatic status management

#### Parameters

| Name      | Type                                                                           | Description |
| --------- | ------------------------------------------------------------------------------ | ----------- |
| `action`  | `() => Promise<any>`                                                           |             |
| `options` | `{ loadingMessage?: string; successMessage?: string; errorMessage?: string; }` |             |

#### Returns

Type: `Promise<boolean>`



### `setLoading(loading: boolean, message?: string) => Promise<void>`

Set loading state with optional message

#### Parameters

| Name      | Type      | Description |
| --------- | --------- | ----------- |
| `loading` | `boolean` |             |
| `message` | `string`  |             |

#### Returns

Type: `Promise<void>`



### `triggerClick() => Promise<void>`

Trigger button click programmatically

#### Returns

Type: `Promise<void>`




## Shadow Parts

| Part           | Description |
| -------------- | ----------- |
| `"button"`     |             |
| `"container"`  |             |
| `"icon-end"`   |             |
| `"icon-start"` |             |
| `"label"`      |             |
| `"spinner"`    |             |
| `"status"`     |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
