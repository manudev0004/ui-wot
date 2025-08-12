# ui-button



<!-- Auto Generated Below -->


## Overview

Button component with various visual styles for user interactions.
Pure UI component focused on click events and visual feedback.

## Properties

| Property   | Attribute  | Description                                                                                                                                                       | Type                                    | Default     |
| ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------- |
| `color`    | `color`    | Color scheme to match thingsweb webpage                                                                                                                           | `"neutral" \| "primary" \| "secondary"` | `'primary'` |
| `disabled` | `disabled` | Whether the button is disabled.                                                                                                                                   | `boolean`                               | `false`     |
| `label`    | `label`    | Button text label.                                                                                                                                                | `string`                                | `'Button'`  |
| `theme`    | `theme`    | Theme for the component.                                                                                                                                          | `"dark" \| "light"`                     | `'light'`   |
| `variant`  | `variant`  | Visual style variant of the button. - minimal: Clean button with subtle background (default) - outlined: Button with border outline - filled: Solid filled button | `"filled" \| "minimal" \| "outlined"`   | `'minimal'` |


## Events

| Event         | Description                          | Type                                               |
| ------------- | ------------------------------------ | -------------------------------------------------- |
| `buttonClick` | Event emitted when button is clicked | `CustomEvent<{ label: string; timestamp: Date; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
