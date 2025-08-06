# ui-checkbox



<!-- Auto Generated Below -->


## Overview

Checkbox component with consistent styling to match the design system.

## Properties

| Property        | Attribute        | Description                                                                                                       | Type                                    | Default      |
| --------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------ |
| `changeHandler` | `change-handler` | Custom callback function name.                                                                                    | `string`                                | `undefined`  |
| `checked`       | `checked`        | Whether the checkbox is checked.                                                                                  | `boolean`                               | `false`      |
| `color`         | `color`          | Color scheme to match design system.                                                                              | `"neutral" \| "primary" \| "secondary"` | `'primary'`  |
| `label`         | `label`          | Optional text label for the checkbox.                                                                             | `string`                                | `undefined`  |
| `state`         | `state`          | Current state of the checkbox.                                                                                    | `"active" \| "default" \| "disabled"`   | `'default'`  |
| `tdUrl`         | `td-url`         | Thing Description URL for property control. When provided, checkbox will read/write boolean values to the device. | `string`                                | `undefined`  |
| `theme`         | `theme`          | Theme for the component.                                                                                          | `"dark" \| "light"`                     | `'light'`    |
| `variant`       | `variant`        | Visual style variant of the checkbox.                                                                             | `"filled" \| "minimal" \| "outlined"`   | `'outlined'` |


## Events

| Event            | Description                                | Type                                 |
| ---------------- | ------------------------------------------ | ------------------------------------ |
| `checkboxChange` | Event emitted when checkbox state changes. | `CustomEvent<{ checked: boolean; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
