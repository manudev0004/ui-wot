# ui-text



<!-- Auto Generated Below -->


## Overview

Simple text component for displaying and editing text data.
Supports single-line input and multi-line textarea with Thing Description integration.

## Properties

| Property        | Attribute        | Description                                                                                                        | Type                                    | Default     |
| --------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | ----------- |
| `changeHandler` | `change-handler` | Custom callback function name for value changes.                                                                   | `string`                                | `undefined` |
| `color`         | `color`          | Color scheme to match design system.                                                                               | `"neutral" \| "primary" \| "secondary"` | `'primary'` |
| `label`         | `label`          | Optional text label for the component.                                                                             | `string`                                | `undefined` |
| `maxLength`     | `max-length`     | Maximum length for text input (edit mode only).                                                                    | `number`                                | `undefined` |
| `placeholder`   | `placeholder`    | Placeholder text for edit mode.                                                                                    | `string`                                | `undefined` |
| `rows`          | `rows`           | Number of rows for multi-line text area.                                                                           | `number`                                | `4`         |
| `state`         | `state`          | Current state of the text component.                                                                               | `"active" \| "default" \| "disabled"`   | `'default'` |
| `tdUrl`         | `td-url`         | Thing Description URL for property control.                                                                        | `string`                                | `undefined` |
| `textType`      | `text-type`      | Type of text field. - single: Single-line text field - multi: Multi-line text area                                 | `"multi" \| "single"`                   | `'single'`  |
| `theme`         | `theme`          | Theme for the component.                                                                                           | `"dark" \| "light"`                     | `'light'`   |
| `value`         | `value`          | Text value content.                                                                                                | `string`                                | `''`        |
| `variant`       | `variant`        | Visual style variant of the text component. - display: Read-only text display - edit: Editable text input/textarea | `"display" \| "edit"`                   | `'display'` |


## Events

| Event        | Description                            | Type                              |
| ------------ | -------------------------------------- | --------------------------------- |
| `textChange` | Event emitted when text value changes. | `CustomEvent<{ value: string; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
