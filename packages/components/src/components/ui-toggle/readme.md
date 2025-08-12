# ui-toggle



<!-- Auto Generated Below -->


## Overview

Toggle switch component with various features and multiple visual styles.

## Properties

| Property        | Attribute        | Description                                                                                                                                                                                                                                                                                                    | Type                                                   | Default     |
| --------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------- |
| `changeHandler` | `change-handler` | Function name to call when toggle state changes (for local control). User defines this function in their code, component will invoke it.                                                                                                                                                                       | `string`                                               | `undefined` |
| `color`         | `color`          | Color scheme                                                                                                                                                                                                                                                                                                   | `"neutral" \| "primary" \| "secondary"`                | `'primary'` |
| `disabled`      | `disabled`       | Whether the toggle is disabled                                                                                                                                                                                                                                                                                 | `boolean`                                              | `false`     |
| `label`         | `label`          | Optional text label, to display text left to the toggle. When given, clicking the label will also toggle the switch.                                                                                                                                                                                           | `string`                                               | `undefined` |
| `state`         | `state`          | Current state of the toggle. - active: Toggle is on/active - disabled: Toggle cannot be clicked or interacted with - default: Toggle is off/inactive (default)                                                                                                                                                 | `"active" \| "default" \| "disabled"`                  | `'default'` |
| `theme`         | `theme`          | Theme for the component.                                                                                                                                                                                                                                                                                       | `"dark" \| "light"`                                    | `'light'`   |
| `value`         | `value`          | Current value for local control mode (true/false, on/off, 1/0).                                                                                                                                                                                                                                                | `string`                                               | `undefined` |
| `variant`       | `variant`        | Visual style variant of the toggle. - circle: Common pill-shaped toggle (default) - square: Rectangular toggle with square thumb - apple: iOS-style switch (bigger size, rounded edges) - cross: Shows × when off, ✓ when on with red background when off and green when on - neon: Glowing effect when active | `"apple" \| "circle" \| "cross" \| "neon" \| "square"` | `'circle'`  |


## Events

| Event    | Description                             | Type                                |
| -------- | --------------------------------------- | ----------------------------------- |
| `toggle` | Event emitted when toggle state changes | `CustomEvent<{ active: boolean; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
