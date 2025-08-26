# ui-text



<!-- Auto Generated Below -->


## Overview

Advanced text component with comprehensive styling, variants, and features.
Supports display, editing, structured content, and matches component family design.

## Properties

| Property          | Attribute           | Description                                                                                                                                                                                                                                                                                                                                                                                             | Type                                                                          | Default          |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------- |
| `autoResize`      | `auto-resize`       | Auto-resize textarea to content (for multi-line text)                                                                                                                                                                                                                                                                                                                                                   | `boolean`                                                                     | `false`          |
| `color`           | `color`             | Color scheme matching the component family palette. - primary: Main brand color (blue tones) - secondary: Accent color (green/teal tones)   - neutral: Grayscale for subtle integration - success: Green for positive content - warning: Orange for caution - danger: Red for errors or warnings                                                                                                        | `"danger" \| "neutral" \| "primary" \| "secondary" \| "success" \| "warning"` | `'primary'`      |
| `compact`         | `compact`           | Compact mode for dense layouts                                                                                                                                                                                                                                                                                                                                                                          | `boolean`                                                                     | `false`          |
| `dark`            | `dark`              | Dark theme variant.                                                                                                                                                                                                                                                                                                                                                                                     | `boolean`                                                                     | `false`          |
| `disabled`        | `disabled`          | Whether the component is disabled (cannot be interacted with).                                                                                                                                                                                                                                                                                                                                          | `boolean`                                                                     | `false`          |
| `expandable`      | `expandable`        | Allow expanding/collapsing of text area with smooth animations                                                                                                                                                                                                                                                                                                                                          | `boolean`                                                                     | `false`          |
| `keyboard`        | `keyboard`          | Enable keyboard navigation and shortcuts.                                                                                                                                                                                                                                                                                                                                                               | `boolean`                                                                     | `true`           |
| `label`           | `label`             | Label for the text component with enhanced styling                                                                                                                                                                                                                                                                                                                                                      | `string`                                                                      | `undefined`      |
| `maxHeight`       | `max-height`        | Maximum height when expanded (pixels) with responsive behavior                                                                                                                                                                                                                                                                                                                                          | `number`                                                                      | `200`            |
| `maxLength`       | `max-length`        | Maximum character length with visual feedback                                                                                                                                                                                                                                                                                                                                                           | `number`                                                                      | `undefined`      |
| `placeholder`     | `placeholder`       | Placeholder text for empty fields with enhanced styling                                                                                                                                                                                                                                                                                                                                                 | `string`                                                                      | `undefined`      |
| `readonly`        | `readonly`          | Whether the component is read-only (displays value but cannot be changed).                                                                                                                                                                                                                                                                                                                              | `boolean`                                                                     | `false`          |
| `resizable`       | `resizable`         | Allow manual resizing of text area (enhanced with constraints)                                                                                                                                                                                                                                                                                                                                          | `boolean`                                                                     | `false`          |
| `rows`            | `rows`              | Number of rows for multi-line text (enhanced with auto-resize)                                                                                                                                                                                                                                                                                                                                          | `number`                                                                      | `4`              |
| `showCharCount`   | `show-char-count`   | Show character count for text inputs                                                                                                                                                                                                                                                                                                                                                                    | `boolean`                                                                     | `false`          |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp below the component.                                                                                                                                                                                                                                                                                                                                                        | `boolean`                                                                     | `false`          |
| `size`            | `size`              | Component size for different use cases. - small: Compact text for tight spaces - medium: Standard size (default) - large: Prominent text with larger typography                                                                                                                                                                                                                                         | `"large" \| "medium" \| "small"`                                              | `'medium'`       |
| `spellCheck`      | `spell-check`       | Enable spell check for editable text                                                                                                                                                                                                                                                                                                                                                                    | `boolean`                                                                     | `true`           |
| `structure`       | `structure`         | Content structure for syntax highlighting and formatting                                                                                                                                                                                                                                                                                                                                                | `"code" \| "json" \| "markdown" \| "unstructured" \| "xml" \| "yaml"`         | `'unstructured'` |
| `textType`        | `text-type`         | Text input type - 'single' for single-line, 'multi' for multi-line                                                                                                                                                                                                                                                                                                                                      | `"multi" \| "single"`                                                         | `'single'`       |
| `value`           | `value`             | Current text value                                                                                                                                                                                                                                                                                                                                                                                      | `string`                                                                      | `''`             |
| `variant`         | `variant`           | Visual style variant matching component family design. - display: Read-only text display with subtle styling - edit: Editable input/textarea with interactive styling - minimal: Clean, borderless design with subtle hover effects - outlined: Border with transparent background, colored accents - filled: Solid background with contrasting text - elevated: Shadow and depth for prominent display | `"display" \| "edit" \| "elevated" \| "filled" \| "minimal" \| "outlined"`    | `'display'`      |


## Events

| Event         | Description                                                                                                                                                  | Type                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| `textChange`  |                                                                                                                                                              | `CustomEvent<UiTextValueChange>` |
| `valueChange` |                                                                                                                                                              | `CustomEvent<UiTextValueChange>` |
| `valueMsg`    | Standardized value event emitter - emits UiMsg<string> with enhanced metadata. Provides consistent value change notifications with unified messaging format. | `CustomEvent<UiMsg<string>>`     |


## Methods

### `getValue() => Promise<string>`

Get the current text value.

#### Returns

Type: `Promise<string>`

Current text value

### `setStatus(status: "success" | "warning" | "error" | null, message?: string) => Promise<void>`

Set the visual status of the text component (success, warning, error).

#### Parameters

| Name      | Type                                | Description                    |
| --------- | ----------------------------------- | ------------------------------ |
| `status`  | `"success" \| "error" \| "warning"` | - Status type or null to clear |
| `message` | `string`                            | - Optional status message      |

#### Returns

Type: `Promise<void>`



### `setValue(value: string, metadata?: Record<string, any>) => Promise<void>`

Set the text value programmatically and emit events.

#### Parameters

| Name       | Type                    | Description                                 |
| ---------- | ----------------------- | ------------------------------------------- |
| `value`    | `string`                | - Text string to set                        |
| `metadata` | `{ [x: string]: any; }` | - Optional metadata to include in the event |

#### Returns

Type: `Promise<void>`



### `setValueSilent(value: string) => Promise<void>`

Set value without emitting events (silent update).

#### Parameters

| Name    | Type     | Description          |
| ------- | -------- | -------------------- |
| `value` | `string` | - Text string to set |

#### Returns

Type: `Promise<void>`



### `triggerReadPulse() => Promise<void>`

Trigger a visual pulse effect to indicate the value was read/accessed.

#### Returns

Type: `Promise<void>`




## Shadow Parts

| Part          | Description |
| ------------- | ----------- |
| `"container"` |             |
| `"input"`     |             |
| `"preview"`   |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
