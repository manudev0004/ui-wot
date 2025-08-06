# ui-text



<!-- Auto Generated Below -->


## Overview

Comprehensive text component for displaying and editing text data.
Supports single-line input, multi-line textarea, structured text with syntax highlighting,
expandable content, and Thing Description integration.

## Properties

| Property        | Attribute        | Description                                                                                                                                                                                                                            | Type                                                        | Default          |
| --------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------- |
| `changeHandler` | `change-handler` | Custom callback function name for value changes.                                                                                                                                                                                       | `string`                                                    | `undefined`      |
| `color`         | `color`          | Color scheme to match design system.                                                                                                                                                                                                   | `"neutral" \| "primary" \| "secondary"`                     | `'primary'`      |
| `expandable`    | `expandable`     | Enable expandable/collapsible display for long text.                                                                                                                                                                                   | `boolean`                                                   | `false`          |
| `label`         | `label`          | Optional text label for the component.                                                                                                                                                                                                 | `string`                                                    | `undefined`      |
| `maxHeight`     | `max-height`     | Maximum height before showing expand/collapse controls (in pixels).                                                                                                                                                                    | `number`                                                    | `200`            |
| `maxLength`     | `max-length`     | Maximum length for text input (edit mode only).                                                                                                                                                                                        | `number`                                                    | `undefined`      |
| `placeholder`   | `placeholder`    | Placeholder text for edit mode.                                                                                                                                                                                                        | `string`                                                    | `undefined`      |
| `resizable`     | `resizable`      | Whether the text area should be resizable (edit mode only).                                                                                                                                                                            | `boolean`                                                   | `false`          |
| `rows`          | `rows`           | Number of rows for multi-line text area.                                                                                                                                                                                               | `number`                                                    | `4`              |
| `state`         | `state`          | Current state of the text component.                                                                                                                                                                                                   | `"active" \| "default" \| "disabled"`                       | `'default'`      |
| `structure`     | `structure`      | Structure type for syntax highlighting in display mode. - unstructured: Plain text (default) - json: JSON syntax highlighting - yaml: YAML syntax highlighting - xml: XML syntax highlighting - markdown: Markdown syntax highlighting | `"json" \| "markdown" \| "unstructured" \| "xml" \| "yaml"` | `'unstructured'` |
| `tdUrl`         | `td-url`         | Thing Description URL for property control.                                                                                                                                                                                            | `string`                                                    | `undefined`      |
| `textType`      | `text-type`      | Type of text field. - single: Single-line text field - multi: Multi-line text area                                                                                                                                                     | `"multi" \| "single"`                                       | `'single'`       |
| `theme`         | `theme`          | Theme for the component.                                                                                                                                                                                                               | `"dark" \| "light"`                                         | `'light'`        |
| `value`         | `value`          | Text value content.                                                                                                                                                                                                                    | `string`                                                    | `''`             |
| `variant`       | `variant`        | Visual style variant of the text component. - display: Read-only text display - edit: Editable text input/textarea                                                                                                                     | `"display" \| "edit"`                                       | `'display'`      |


## Events

| Event        | Description                            | Type                              |
| ------------ | -------------------------------------- | --------------------------------- |
| `textChange` | Event emitted when text value changes. | `CustomEvent<{ value: string; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
