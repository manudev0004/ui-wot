# ui-toggle



<!-- Auto Generated Below -->


## Overview

UI Toggle Component

## Properties

| Property     | Attribute     | Description                                      | Type                                                   | Default     |
| ------------ | ------------- | ------------------------------------------------ | ------------------------------------------------------ | ----------- |
| `color`      | `color`       | Color scheme for the toggle appearance           | `"neutral" \| "primary" \| "secondary"`                | `'primary'` |
| `label`      | `label`       | Optional text label displayed next to the toggle | `string`                                               | `undefined` |
| `state`      | `state`       | Current operational state of the toggle          | `"active" \| "default" \| "disabled"`                  | `'default'` |
| `tdProperty` | `td-property` | Web of Things Thing Description property binding | `TDProperty`                                           | `undefined` |
| `theme`      | `theme`       | Visual theme for the component                   | `"dark" \| "light"`                                    | `'light'`   |
| `variant`    | `variant`     | Visual style variant of the toggle switch        | `"apple" \| "circle" \| "cross" \| "neon" \| "square"` | `'circle'`  |


## Events

| Event    | Description                                    | Type                                               |
| -------- | ---------------------------------------------- | -------------------------------------------------- |
| `toggle` | Custom event emitted when toggle state changes | `CustomEvent<{ active: boolean; state: string; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
