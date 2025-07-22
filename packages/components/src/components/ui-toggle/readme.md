# ui-toggle



<!-- Auto Generated Below -->


## Overview

Modern, accessible toggle switch with multiple visual styles and IoT integration.
Simply provide a direct property URL for plug-and-play device control.

## Properties

| Property  | Attribute | Description                                                                                                                                                                                                                                                   | Type                                                   | Default     |
| --------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------- |
| `color`   | `color`   | Color scheme for the toggle appearance. - primary: Teal/green professional color - secondary: Pink/purple accent color - neutral: Grayscale minimal appearance                                                                                                | `"neutral" \| "primary" \| "secondary"`                | `'primary'` |
| `label`   | `label`   | Optional text label displayed next to the toggle. When provided, clicking the label will also toggle the switch.                                                                                                                                              | `string`                                               | `undefined` |
| `state`   | `state`   | Current state of the toggle. - active: Toggle is on/active (default) - disabled: Toggle cannot be interacted with                                                                                                                                             | `"active" \| "disabled"`                               | `'active'`  |
| `tdUrl`   | `td-url`  | Direct URL to the device property for IoT integration. Provide the complete property URL for automatic device control.                                                                                                                                        | `string`                                               | `undefined` |
| `theme`   | `theme`   | Visual theme for the component. - light: Bright colors suitable for light backgrounds - dark: Muted colors suitable for dark backgrounds                                                                                                                      | `"dark" \| "light"`                                    | `'light'`   |
| `variant` | `variant` | Visual style variant of the toggle switch. - circle: Standard pill-shaped toggle (default) - square: Rectangular toggle with square thumb - apple: iOS-style switch with inner shadow - cross: Shows × when off, ✓ when on - neon: Glowing effect when active | `"apple" \| "circle" \| "cross" \| "neon" \| "square"` | `'circle'`  |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
