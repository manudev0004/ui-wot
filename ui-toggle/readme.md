# ui-toggle



<!-- Auto Generated Below -->


## Overview

UI Toggle Component

A customizable toggle switch component with WoT TD binding support.
Supports variants, theming, accessibility, and lazy loading.

## Properties

| Property     | Attribute     | Description                                       | Type                                                | Default     |
| ------------ | ------------- | ------------------------------------------------- | --------------------------------------------------- | ----------- |
| `checked`    | `checked`     | Initial checked state or controlled value         | `boolean`                                           | `undefined` |
| `disabled`   | `disabled`    | Disabled state                                    | `boolean`                                           | `false`     |
| `tdProperty` | `td-property` | TD Property binding for Web of Things integration | `TDProperty`                                        | `undefined` |
| `value`      | `value`       | Initial value (alias for checked for consistency) | `boolean`                                           | `undefined` |
| `variant`    | `variant`     | Variant style for the toggle                      | `"accent" \| "default" \| "primary" \| "secondary"` | `'default'` |


## Events

| Event    | Description                             | Type                   |
| -------- | --------------------------------------- | ---------------------- |
| `toggle` | Event emitted when toggle state changes | `CustomEvent<boolean>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
