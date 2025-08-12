# ui-number-picker



<!-- Auto Generated Below -->


## Overview

Number picker component with increment/decrement buttons for numeric input.
Pure UI component focused on user interaction and value management.

## Properties

| Property   | Attribute  | Description                                                                                                                                                                 | Type                                    | Default     |
| ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------- |
| `color`    | `color`    | Color scheme to match thingsweb webpage                                                                                                                                     | `"neutral" \| "primary" \| "secondary"` | `'primary'` |
| `disabled` | `disabled` | Whether the number picker is disabled.                                                                                                                                      | `boolean`                               | `false`     |
| `label`    | `label`    | Optional text label, to display above the number picker.                                                                                                                    | `string`                                | `undefined` |
| `max`      | `max`      | Maximum allowed value.                                                                                                                                                      | `number`                                | `100`       |
| `min`      | `min`      | Minimum allowed value.                                                                                                                                                      | `number`                                | `0`         |
| `step`     | `step`     | Step increment/decrement amount.                                                                                                                                            | `number`                                | `1`         |
| `theme`    | `theme`    | Theme for the component.                                                                                                                                                    | `"dark" \| "light"`                     | `'light'`   |
| `value`    | `value`    | Current value of the number picker.                                                                                                                                         | `number`                                | `0`         |
| `variant`  | `variant`  | Visual style variant of the number picker. - minimal: Clean buttons with subtle background (default) - outlined: Buttons with border outline - filled: Solid filled buttons | `"filled" \| "minimal" \| "outlined"`   | `'minimal'` |


## Events

| Event         | Description                      | Type                                              |
| ------------- | -------------------------------- | ------------------------------------------------- |
| `valueChange` | Event emitted when value changes | `CustomEvent<{ value: number; label?: string; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
