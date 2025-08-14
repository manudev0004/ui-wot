# ui-toggle



<!-- Auto Generated Below -->


## Overview

Toogle switch component with various fetueres, multiple visual styles and TD integration.
Link a direct property URL for plug-and-play device control.

## Properties

| Property  | Attribute | Description                                                                                                                                                                                                                                                                                                    | Type                                                   | Default       |
| --------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------- |
| `color`   | `color`   | Color scheme to match thingsweb webpage                                                                                                                                                                                                                                                                        | `"neutral" \| "primary" \| "secondary"`                | `'primary'`   |
| `label`   | `label`   | Optional text label, to display text left to the toggle. When given, clicking the label will also toggle the switch.                                                                                                                                                                                           | `string`                                               | `undefined`   |
| `mode`    | `mode`    | Device interaction mode. - read: Only read from device (display current state as colored circle) - write: Only write to device (control device but don't sync state) - readwrite: Read and write (full synchronization) - default                                                                              | `"read" \| "readwrite" \| "write"`                     | `'readwrite'` |
| `state`   | `state`   | Current state of the toggle. - active: Toggle is on/active - disabled: Toggle cannot be clicked or interacted with - default: Toggle is off/inactive (default)                                                                                                                                                 | `"active" \| "default" \| "disabled"`                  | `'default'`   |
| `theme`   | `theme`   | Theme for the component.                                                                                                                                                                                                                                                                                       | `"dark" \| "light"`                                    | `'light'`     |
| `value`   | `value`   | Local value for the toggle. Accepts boolean or string values (string will be parsed).                                                                                                                                                                                                                          | `boolean \| string`                                    | `undefined`   |
| `variant` | `variant` | Visual style variant of the toggle. - circle: Common pill-shaped toggle (default) - square: Rectangular toggle with square thumb - apple: iOS-style switch (bigger size, rounded edges) - cross: Shows × when off, ✓ when on with red background when off and green when on - neon: Glowing effect when active | `"apple" \| "circle" \| "cross" \| "neon" \| "square"` | `'circle'`    |


## Events

| Event         | Description                                                  | Type                               |
| ------------- | ------------------------------------------------------------ | ---------------------------------- |
| `toggle`      | Legacy event emitted when toggle state changes               | `CustomEvent<UiToggleToggleEvent>` |
| `valueChange` | Standardized valueChange event for value-driven integrations | `CustomEvent<UiToggleValueChange>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
