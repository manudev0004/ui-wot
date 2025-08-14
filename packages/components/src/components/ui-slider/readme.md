# ui-slider



<!-- Auto Generated Below -->


## Overview

Slider component with various features, multiple visual styles and TD integration.
Link a direct property URL for plug-and-play device control.

## Properties

| Property              | Attribute               | Description                                                                                                                                                                                               | Type                                                         | Default        |
| --------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------- |
| `color`               | `color`                 | Color scheme to match thingsweb webpage                                                                                                                                                                   | `"neutral" \| "primary" \| "secondary"`                      | `'primary'`    |
| `enableManualControl` | `enable-manual-control` | Enable manual control interface.                                                                                                                                                                          | `boolean`                                                    | `false`        |
| `label`               | `label`                 | Optional text label, to display text above the slider.                                                                                                                                                    | `string`                                                     | `undefined`    |
| `max`                 | `max`                   | Maximum value of the slider.                                                                                                                                                                              | `number`                                                     | `100`          |
| `min`                 | `min`                   | Minimum value of the slider.                                                                                                                                                                              | `number`                                                     | `0`            |
| `orientation`         | `orientation`           | Orientation of the slider. - horizontal: Left to right slider (default) - vertical: Bottom to top slider                                                                                                  | `"horizontal" \| "vertical"`                                 | `'horizontal'` |
| `state`               | `state`                 | Current state of the slider. - disabled: Slider cannot be clicked or interacted with - default: Slider is interactive (default)                                                                           | `"default" \| "disabled"`                                    | `'default'`    |
| `step`                | `step`                  | Step increment for the slider.                                                                                                                                                                            | `number`                                                     | `1`            |
| `theme`               | `theme`                 | Theme for the component.                                                                                                                                                                                  | `"dark" \| "light"`                                          | `'light'`      |
| `thumbShape`          | `thumb-shape`           | Shape of the slider thumb. - circle: Round thumb (default) - square: Square thumb - arrow: Arrow-shaped thumb pointing right - triangle: Triangle-shaped thumb - diamond: Diamond-shaped thumb (<> style) | `"arrow" \| "circle" \| "diamond" \| "square" \| "triangle"` | `'circle'`     |
| `value`               | `value`                 | Current value of the slider.                                                                                                                                                                              | `number`                                                     | `0`            |
| `variant`             | `variant`               | Visual style variant of the slider. - narrow: Thin slider track (default) - wide: Thick slider track - rainbow: Gradient color track - neon: Glowing effect - stepped: Shows step marks                   | `"narrow" \| "neon" \| "rainbow" \| "stepped" \| "wide"`     | `'narrow'`     |


## Events

| Event         | Description                      | Type                               |
| ------------- | -------------------------------- | ---------------------------------- |
| `valueChange` | Event emitted when value changes | `CustomEvent<UiSliderValueChange>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
