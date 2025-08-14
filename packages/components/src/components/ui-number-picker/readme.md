# ui-number-picker



<!-- Auto Generated Below -->


## Overview

Number picker component with various visual styles, TD integration and customizable range.
Supports increment/decrement buttons with Thing Description integration for IoT devices.

## Properties

| Property  | Attribute | Description                                                                                                                                                                                                                     | Type                                    | Default       |
| --------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------- |
| `color`   | `color`   | Color scheme to match thingsweb webpage                                                                                                                                                                                         | `"neutral" \| "primary" \| "secondary"` | `'primary'`   |
| `label`   | `label`   | Optional text label, to display above the number picker.                                                                                                                                                                        | `string`                                | `undefined`   |
| `max`     | `max`     | Maximum allowed value.                                                                                                                                                                                                          | `number`                                | `100`         |
| `min`     | `min`     | Minimum allowed value.                                                                                                                                                                                                          | `number`                                | `0`           |
| `mode`    | `mode`    | Device interaction mode. - read: Only read from device (display current value, no interaction) - write: Only write to device (control device but don't sync state) - readwrite: Read and write (full synchronization) - default | `"read" \| "readwrite" \| "write"`      | `'readwrite'` |
| `state`   | `state`   | Current state of the number picker. - active: Number picker is enabled (default) - disabled: Number picker cannot be interacted with                                                                                            | `"active" \| "disabled"`                | `'active'`    |
| `step`    | `step`    | Step increment/decrement amount.                                                                                                                                                                                                | `number`                                | `1`           |
| `theme`   | `theme`   | Theme for the component.                                                                                                                                                                                                        | `"dark" \| "light"`                     | `'light'`     |
| `value`   | `value`   | Current value of the number picker (for local control mode). When no td-url is provided and value is set, this controls the picker state.                                                                                       | `number`                                | `0`           |
| `variant` | `variant` | Visual style variant of the number picker. - minimal: Clean buttons with subtle background (default) - outlined: Buttons with border outline - filled: Solid filled buttons                                                     | `"filled" \| "minimal" \| "outlined"`   | `'minimal'`   |


## Events

| Event         | Description                      | Type                                              |
| ------------- | -------------------------------- | ------------------------------------------------- |
| `valueChange` | Event emitted when value changes | `CustomEvent<{ value: number; label?: string; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
