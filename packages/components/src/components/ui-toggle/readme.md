# ui-toggle



<!-- Auto Generated Below -->


## Overview

Toogle switch component with various fetueres, multiple visual styles and TD integration.
Link a direct property URL for plug-and-play device control.

## Properties

| Property        | Attribute        | Description                                                                                                                                                                                                                                                                                                    | Type                                                   | Default       |
| --------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------- |
| `changeHandler` | `change-handler` | Function name to call when toggle state changes (for local control). User defines this function in their code, component will invoke it.                                                                                                                                                                       | `string`                                               | `undefined`   |
| `color`         | `color`          | Color scheme to match thingsweb webpage                                                                                                                                                                                                                                                                        | `"neutral" \| "primary" \| "secondary"`                | `'primary'`   |
| `label`         | `label`          | Optional text label, to display text left to the toggle. When given, clicking the label will also toggle the switch.                                                                                                                                                                                           | `string`                                               | `undefined`   |
| `mode`          | `mode`           | Device interaction mode. - read: Only read from device (display current state as colored circle) - write: Only write to device (control device but don't sync state) - readwrite: Read and write (full synchronization) - default                                                                              | `"read" \| "readwrite" \| "write"`                     | `'readwrite'` |
| `state`         | `state`          | Current state of the toggle. - active: Toggle is on/active - disabled: Toggle cannot be clicked or interacted with - default: Toggle is off/inactive (default)                                                                                                                                                 | `"active" \| "default" \| "disabled"`                  | `'default'`   |
| `tdUrl`         | `td-url`         | Direct URL of TD boolean properties to auto connect and interact with the device.                                                                                                                                                                                                                              | `string`                                               | `undefined`   |
| `theme`         | `theme`          | Theme for the component.                                                                                                                                                                                                                                                                                       | `"dark" \| "light"`                                    | `'light'`     |
| `value`         | `value`          | Current value for local control mode (true/false, on/off, 1/0). When no td-url is provided and value is set, this controls the toggle state.                                                                                                                                                                   | `string`                                               | `undefined`   |
| `variant`       | `variant`        | Visual style variant of the toggle. - circle: Common pill-shaped toggle (default) - square: Rectangular toggle with square thumb - apple: iOS-style switch (bigger size, rounded edges) - cross: Shows × when off, ✓ when on with red background when off and green when on - neon: Glowing effect when active | `"apple" \| "circle" \| "cross" \| "neon" \| "square"` | `'circle'`    |


## Events

| Event    | Description                             | Type                                |
| -------- | --------------------------------------- | ----------------------------------- |
| `toggle` | Event emitted when toggle state changes | `CustomEvent<{ active: boolean; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
