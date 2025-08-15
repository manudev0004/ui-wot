# ui-button



<!-- Auto Generated Below -->


## Overview

Button component with various visual styles, matching the ui-number-picker design family.
Supports the same variants, colors, and themes as the number picker.

## Properties

| Property  | Attribute | Description                                                                                                                                                       | Type                                    | Default     |
| --------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------- |
| `color`   | `color`   | Color scheme to match thingsweb webpage                                                                                                                           | `"neutral" \| "primary" \| "secondary"` | `'primary'` |
| `label`   | `label`   | Button text label.                                                                                                                                                | `string`                                | `'Button'`  |
| `state`   | `state`   | Current state of the button. - active: Button is enabled (default) - disabled: Button cannot be interacted with                                                   | `"active" \| "disabled"`                | `'active'`  |
| `theme`   | `theme`   | Theme for the component.                                                                                                                                          | `"dark" \| "light"`                     | `'light'`   |
| `variant` | `variant` | Visual style variant of the button. - minimal: Clean button with subtle background (default) - outlined: Button with border outline - filled: Solid filled button | `"filled" \| "minimal" \| "outlined"`   | `'minimal'` |


## Events

| Event         | Description                          | Type                         |
| ------------- | ------------------------------------ | ---------------------------- |
| `buttonClick` | Event emitted when button is clicked | `CustomEvent<UiButtonClick>` |


## Shadow Parts

| Part                  | Description |
| --------------------- | ----------- |
| `"button"`            |             |
| `"container"`         |             |
| `"success-indicator"` |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
