# ui-slider



<!-- Auto Generated Below -->


## Overview

Slider component with various visual styles for numeric input.
Pure UI component focused on user interaction and visual feedback.

## Properties

| Property              | Attribute               | Description                                                                                                                                                                                               | Type                                                         | Default        |
| --------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------- |
| `color`               | `color`                 | Color scheme to match thingsweb webpage                                                                                                                                                                   | `"neutral" \| "primary" \| "secondary"`                      | `'primary'`    |
| `disabled`            | `disabled`              | Whether the slider is disabled.                                                                                                                                                                           | `boolean`                                                    | `false`        |
| `enableManualControl` | `enable-manual-control` | Enable manual control interface.                                                                                                                                                                          | `boolean`                                                    | `false`        |
| `label`               | `label`                 | Optional text label, to display text above the slider.                                                                                                                                                    | `string`                                                     | `undefined`    |
| `max`                 | `max`                   | Maximum value of the slider.                                                                                                                                                                              | `number`                                                     | `100`          |
| `min`                 | `min`                   | Minimum value of the slider.                                                                                                                                                                              | `number`                                                     | `0`            |
| `orientation`         | `orientation`           | Orientation of the slider. - horizontal: Left to right slider (default) - vertical: Bottom to top slider                                                                                                  | `"horizontal" \| "vertical"`                                 | `'horizontal'` |
| `step`                | `step`                  | Step increment for the slider.                                                                                                                                                                            | `number`                                                     | `1`            |
| `theme`               | `theme`                 | Theme for the component.                                                                                                                                                                                  | `"dark" \| "light"`                                          | `'light'`      |
| `thumbShape`          | `thumb-shape`           | Shape of the slider thumb. - circle: Round thumb (default) - square: Square thumb - arrow: Arrow-shaped thumb pointing right - triangle: Triangle-shaped thumb - diamond: Diamond-shaped thumb (<> style) | `"arrow" \| "circle" \| "diamond" \| "square" \| "triangle"` | `'circle'`     |
| `value`               | `value`                 | Current value of the slider.                                                                                                                                                                              | `number`                                                     | `0`            |
| `variant`             | `variant`               | Visual style variant of the slider. - narrow: Thin slider track (default) - wide: Thick slider track - rainbow: Gradient color track - neon: Glowing effect - stepped: Shows step marks                   | `"narrow" \| "neon" \| "rainbow" \| "stepped" \| "wide"`     | `'narrow'`     |


## Events

| Event         | Description                             | Type                                              |
| ------------- | --------------------------------------- | ------------------------------------------------- |
| `slideEnd`    | Event emitted when user stops dragging  | `CustomEvent<{ value: number; label?: string; }>` |
| `slideStart`  | Event emitted when user starts dragging | `CustomEvent<{ value: number; label?: string; }>` |
| `valueChange` | Event emitted when value changes        | `CustomEvent<{ value: number; label?: string; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
