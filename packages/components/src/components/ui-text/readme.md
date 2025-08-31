# ui-text



<!-- Auto Generated Below -->


## Overview

Simple text component with essential styling and features.

## Properties

| Property          | Attribute           | Description                           | Type                                                             | Default     |
| ----------------- | ------------------- | ------------------------------------- | ---------------------------------------------------------------- | ----------- |
| `color`           | `color`             | Color scheme                          | `"danger" \| "primary" \| "secondary" \| "success" \| "warning"` | `'primary'` |
| `dark`            | `dark`              | Dark theme                            | `boolean`                                                        | `false`     |
| `disabled`        | `disabled`          | Disabled state                        | `boolean`                                                        | `false`     |
| `label`           | `label`             | Label for the text component          | `string`                                                         | `undefined` |
| `placeholder`     | `placeholder`       | Placeholder text                      | `string`                                                         | `undefined` |
| `readonly`        | `readonly`          | Read-only mode                        | `boolean`                                                        | `false`     |
| `resizable`       | `resizable`         | Allow resizing of text area           | `boolean`                                                        | `false`     |
| `rows`            | `rows`              | Number of rows for multi-line text    | `number`                                                         | `4`         |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp           | `boolean`                                                        | `false`     |
| `showLineNumbers` | `show-line-numbers` | Show line numbers for multi-line text | `boolean`                                                        | `false`     |
| `size`            | `size`              | Component size                        | `"large" \| "medium" \| "small"`                                 | `'medium'`  |
| `textType`        | `text-type`         | Text input type                       | `"multi" \| "single"`                                            | `'single'`  |
| `value`           | `value`             | Current text value                    | `string`                                                         | `''`        |
| `variant`         | `variant`           | Visual style variant                  | `"display" \| "edit" \| "filled" \| "outlined"`                  | `'display'` |


## Events

| Event      | Description | Type                         |
| ---------- | ----------- | ---------------------------- |
| `valueMsg` |             | `CustomEvent<UiMsg<string>>` |


## Methods

### `getValue() => Promise<string>`



#### Returns

Type: `Promise<string>`



### `setStatus(status: "idle" | "loading" | "success" | "error" | null, message?: string) => Promise<void>`

Sets the status indicator state

#### Parameters

| Name      | Type                                          | Description                                                     |
| --------- | --------------------------------------------- | --------------------------------------------------------------- |
| `status`  | `"idle" \| "loading" \| "success" \| "error"` | - The status to display ('idle', 'loading', 'success', 'error') |
| `message` | `string`                                      | - Optional message to display                                   |

#### Returns

Type: `Promise<void>`



### `setValue(value: string) => Promise<void>`



#### Parameters

| Name    | Type     | Description |
| ------- | -------- | ----------- |
| `value` | `string` |             |

#### Returns

Type: `Promise<void>`



### `setValueSilent(value: string) => Promise<void>`

Sets the value without triggering events (useful for TD integration)

#### Parameters

| Name    | Type     | Description        |
| ------- | -------- | ------------------ |
| `value` | `string` | - The value to set |

#### Returns

Type: `Promise<void>`



### `triggerReadPulse() => Promise<void>`

Triggers a read pulse indicator for readonly components

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
