# ui-checkbox



<!-- Auto Generated Below -->


## Overview

Checkbox component with consistent styling to match the design system.

## Properties

| Property   | Attribute  | Description                           | Type                                    | Default      |
| ---------- | ---------- | ------------------------------------- | --------------------------------------- | ------------ |
| `checked`  | `checked`  | Whether the checkbox is checked.      | `boolean`                               | `false`      |
| `color`    | `color`    | Color scheme to match design system.  | `"neutral" \| "primary" \| "secondary"` | `'primary'`  |
| `disabled` | `disabled` | Disabled state                        | `boolean`                               | `false`      |
| `keyboard` | `keyboard` | Keyboard interaction                  | `boolean`                               | `true`       |
| `label`    | `label`    | Label text                            | `string`                                | `'Checkbox'` |
| `mode`     | `mode`     | Legacy mode mapping                   | `"read" \| "readwrite"`                 | `undefined`  |
| `readonly` | `readonly` | Readonly mode                         | `boolean`                               | `false`      |
| `state`    | `state`    | Current state of the checkbox.        | `"active" \| "default" \| "disabled"`   | `'default'`  |
| `theme`    | `theme`    | Theme for the component.              | `"dark" \| "light"`                     | `'light'`    |
| `variant`  | `variant`  | Visual style variant of the checkbox. | `"filled" \| "minimal" \| "outlined"`   | `'outlined'` |


## Events

| Event            | Description                                    | Type                                    |
| ---------------- | ---------------------------------------------- | --------------------------------------- |
| `checkboxChange` | Event emitted when checkbox state changes.     | `CustomEvent<UiCheckboxCheckboxChange>` |
| `valueChange`    | Standardized valueChange event (boolean value) | `CustomEvent<UiCheckboxValueChange>`    |
| `valueMsg`       | Unified UiMsg event                            | `CustomEvent<UiMsg<boolean>>`           |


## Shadow Parts

| Part        | Description |
| ----------- | ----------- |
| `"control"` |             |
| `"label"`   |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
