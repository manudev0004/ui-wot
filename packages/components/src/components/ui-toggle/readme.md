# ui-toggle



<!-- Auto Generated Below -->


## Overview

UI Toggle Component

## Properties

| Property        | Attribute        | Description                                                                                                                                                                                        | Type                                                   | Default     |
| --------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------- |
| `color`         | `color`          | Color scheme for the toggle appearance                                                                                                                                                             | `"neutral" \| "primary" \| "secondary"`                | `'primary'` |
| `label`         | `label`          | Optional text label displayed next to the toggle                                                                                                                                                   | `string`                                               | `undefined` |
| `propertyName`  | `property-name`  | Name of the boolean property in the Thing Description to control                                                                                                                                   | `string`                                               | `'switch'`  |
| `state`         | `state`          | Current operational state of the toggle                                                                                                                                                            | `"active" \| "default" \| "disabled"`                  | `'default'` |
| `tdUrl`         | `td-url`         | Thing Description URL for plug-and-play IoT integration                                                                                                                                            | `string`                                               | `undefined` |
| `theme`         | `theme`          | Visual theme for the component                                                                                                                                                                     | `"dark" \| "light"`                                    | `'light'`   |
| `thingProperty` | `thing-property` | <span style="color:red">**[DEPRECATED]**</span> Use td-url prop for simpler plug-and-play integration<br/><br/>Connect to IoT devices and services via Thing Web (deprecated - use td-url instead) | `ThingProperty`                                        | `undefined` |
| `variant`       | `variant`        | Visual style variant of the toggle switch                                                                                                                                                          | `"apple" \| "circle" \| "cross" \| "neon" \| "square"` | `'circle'`  |


## Events

| Event    | Description                                    | Type                                               |
| -------- | ---------------------------------------------- | -------------------------------------------------- |
| `toggle` | Custom event emitted when toggle state changes | `CustomEvent<{ active: boolean; state: string; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
