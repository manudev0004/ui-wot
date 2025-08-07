# ui-calendar



<!-- Auto Generated Below -->


## Overview

Calendar component for date-time selection with various visual styles and TD integration.
Link a direct property URL for plug-and-play device control.

## Properties

| Property      | Attribute      | Description                                                                                                                                   | Type                                    | Default     |
| ------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------- |
| `color`       | `color`        | Color scheme to match thingsweb webpage                                                                                                       | `"neutral" \| "primary" \| "secondary"` | `'primary'` |
| `includeTime` | `include-time` | Include time picker alongside date picker.                                                                                                    | `boolean`                               | `false`     |
| `label`       | `label`        | Optional text label for the calendar.                                                                                                         | `string`                                | `undefined` |
| `maxDate`     | `max-date`     | Maximum selectable date (ISO string).                                                                                                         | `string`                                | `undefined` |
| `minDate`     | `min-date`     | Minimum selectable date (ISO string).                                                                                                         | `string`                                | `undefined` |
| `state`       | `state`        | Current state of the calendar. - disabled: Calendar cannot be interacted with - default: Calendar is interactive (default)                    | `"default" \| "disabled"`               | `'default'` |
| `tdUrl`       | `td-url`       | Thing Description URL for device control.                                                                                                     | `string`                                | `undefined` |
| `theme`       | `theme`        | Theme for the component.                                                                                                                      | `"dark" \| "light"`                     | `'light'`   |
| `value`       | `value`        | Current selected date-time value (ISO string).                                                                                                | `string`                                | `undefined` |
| `variant`     | `variant`      | Visual style variant of the calendar. - minimal: Clean minimal design (default) - outlined: Border with background - filled: Solid background | `"filled" \| "minimal" \| "outlined"`   | `'minimal'` |


## Events

| Event        | Description                     | Type                              |
| ------------ | ------------------------------- | --------------------------------- |
| `dateChange` | Event emitted when date changes | `CustomEvent<{ value: string; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
