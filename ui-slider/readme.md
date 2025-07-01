# ui-slider



<!-- Auto Generated Below -->


## Overview

UI Slider Component

A customizable range slider component with WoT TD binding support.
Supports variants, theming, accessibility, and lazy loading.

## Properties

| Property     | Attribute     | Description                                       | Type                                                | Default     |
| ------------ | ------------- | ------------------------------------------------- | --------------------------------------------------- | ----------- |
| `disabled`   | `disabled`    | Disabled state                                    | `boolean`                                           | `false`     |
| `label`      | `label`       | Label for accessibility                           | `string`                                            | `undefined` |
| `max`        | `max`         | Maximum value                                     | `number`                                            | `100`       |
| `min`        | `min`         | Minimum value                                     | `number`                                            | `0`         |
| `step`       | `step`        | Step increment                                    | `number`                                            | `1`         |
| `tdProperty` | `td-property` | TD Property binding for Web of Things integration | `TDSliderProperty`                                  | `undefined` |
| `value`      | `value`       | Current value of the slider                       | `number`                                            | `undefined` |
| `variant`    | `variant`     | Variant style for the slider                      | `"accent" \| "default" \| "primary" \| "secondary"` | `'default'` |


## Events

| Event    | Description                             | Type                  |
| -------- | --------------------------------------- | --------------------- |
| `change` | Event emitted when slider value changes | `CustomEvent<number>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
