# ui-button



<!-- Auto Generated Below -->


## Overview

Button component with various visual styles, matching the ui-number-picker design family.
Supports the same variants, colors, and themes as the number picker.

## Properties

| Property   | Attribute  | Description                                                                                                                                                       | Type                                    | Default     |
| ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------- |
| `color`    | `color`    | Color scheme to match thingsweb webpage                                                                                                                           | `"neutral" \| "primary" \| "secondary"` | `'primary'` |
| `disabled` | `disabled` | Whether the component is disabled (cannot be interacted with).                                                                                                    | `boolean`                               | `false`     |
| `keyboard` | `keyboard` | Enable keyboard navigation. Default: true                                                                                                                         | `boolean`                               | `true`      |
| `label`    | `label`    | Button text label.                                                                                                                                                | `string`                                | `'Button'`  |
| `mode`     | `mode`     | Legacy mode prop for backward compatibility with older demos. Accepts 'read' to indicate read-only mode, 'readwrite' for interactive.                             | `"read" \| "readwrite"`                 | `undefined` |
| `readonly` | `readonly` | Whether the component is read-only (displays value but cannot be changed).                                                                                        | `boolean`                               | `false`     |
| `state`    | `state`    | Current state of the button. - active: Button is enabled (default) - disabled: Button cannot be interacted with                                                   | `"active" \| "disabled"`                | `'active'`  |
| `theme`    | `theme`    | Theme for the component.                                                                                                                                          | `"dark" \| "light"`                     | `'light'`   |
| `variant`  | `variant`  | Visual style variant of the button. - minimal: Clean button with subtle background (default) - outlined: Button with border outline - filled: Solid filled button | `"filled" \| "minimal" \| "outlined"`   | `'minimal'` |


## Events

| Event         | Description                                                                                           | Type                         |
| ------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------- |
| `buttonClick` | Event emitted when button is clicked                                                                  | `CustomEvent<UiButtonClick>` |
| `valueMsg`    | Primary event emitted when the component value changes. Use this event for all value change handling. | `CustomEvent<UiMsg<string>>` |


## Methods

### `getValue() => Promise<string>`



#### Returns

Type: `Promise<string>`



### `setValue(value: string) => Promise<boolean>`

Implement base class abstract methods

#### Parameters

| Name    | Type     | Description |
| ------- | -------- | ----------- |
| `value` | `string` |             |

#### Returns

Type: `Promise<boolean>`




## Shadow Parts

| Part                 | Description |
| -------------------- | ----------- |
| `"button"`           |             |
| `"container"`        |             |
| `"status-indicator"` |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
