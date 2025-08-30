# ui-text

A versatile text component with comprehensive styling options, multiple variants, and enhanced features.

## New Features

- **Theme Variations**: Choose from multiple theme presets (modern, elegant, soft, vibrant, sharp) with proper dark mode support.
- **Enhanced Line Numbers**: Improved line number visualization with different styles (simple, highlighted, bordered, floating).
- **Better Resizable Fields**: Configure resize direction (vertical, horizontal, both) with minimum and maximum height constraints.
- **Dark Mode Improvements**: Enhanced dark mode styling with theme-specific color variations.

## Examples

```html
<!-- Theme Variations -->
<ui-text themeVariant="modern" dark="true" value="Modern dark theme"></ui-text>
<ui-text themeVariant="elegant" value="Elegant light theme"></ui-text>
<ui-text themeVariant="vibrant" dark="true" value="Vibrant dark theme"></ui-text>

<!-- Enhanced Line Numbers -->
<ui-text textType="multi" showLineNumbers="true" lineNumberStyle="highlighted" value="Code with highlighted line numbers"></ui-text>
<ui-text textType="multi" showLineNumbers="true" lineNumberStyle="bordered" value="Code with bordered line numbers"></ui-text>
<ui-text textType="multi" showLineNumbers="true" lineNumberStyle="floating" value="Code with floating line numbers"></ui-text>

<!-- Resizable Fields -->
<ui-text textType="multi" resizable="true" resizeDirection="both" minHeight="100" maxHeight="400" value="Resizable in both directions"></ui-text>
<ui-text textType="multi" resizable="true" resizeDirection="vertical" minHeight="80" maxHeight="300" value="Vertically resizable"></ui-text>
```

<!-- Auto Generated Below -->


## Overview

Advanced text component with comprehensive styling, variants, and features.
Supports display, editing, structured content, and matches component family design.

## Properties

| Property          | Attribute           | Description                                                                                                                                                                                                                                                                                                                                                                                             | Type                                                                                            | Default          |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------- |
| `animated`        | `animated`          | Enable smooth animations and transitions                                                                                                                                                                                                                                                                                                                                                                | `boolean`                                                                                       | `true`           |
| `autoResize`      | `auto-resize`       | Auto-resize textarea to content (for multi-line text)                                                                                                                                                                                                                                                                                                                                                   | `boolean`                                                                                       | `false`          |
| `backgroundColor` | `background-color`  | Custom background color (hex, rgb, or color name)                                                                                                                                                                                                                                                                                                                                                       | `string`                                                                                        | `undefined`      |
| `borderColor`     | `border-color`      | Custom border color (hex, rgb, or color name)                                                                                                                                                                                                                                                                                                                                                           | `string`                                                                                        | `undefined`      |
| `borderRadius`    | `border-radius`     | Border radius preset or custom value                                                                                                                                                                                                                                                                                                                                                                    | `string`                                                                                        | `'medium'`       |
| `borderStyle`     | `border-style`      | Border style options for enhanced visual design                                                                                                                                                                                                                                                                                                                                                         | `"dashed" \| "dotted" \| "double" \| "groove" \| "inset" \| "outset" \| "ridge" \| "solid"`     | `'solid'`        |
| `borderWidth`     | `border-width`      | Border width in pixels (1-8)                                                                                                                                                                                                                                                                                                                                                                            | `number`                                                                                        | `2`              |
| `color`           | `color`             | Color scheme matching the component family palette. - primary: Main brand color (blue tones) - secondary: Accent color (green/teal tones)   - neutral: Grayscale for subtle integration - success: Green for positive content - warning: Orange for caution - danger: Red for errors or warnings                                                                                                        | `"danger" \| "neutral" \| "primary" \| "secondary" \| "success" \| "warning"`                   | `'primary'`      |
| `compact`         | `compact`           | Compact mode for dense layouts                                                                                                                                                                                                                                                                                                                                                                          | `boolean`                                                                                       | `false`          |
| `copyable`        | `copyable`          | Enable copy to clipboard button                                                                                                                                                                                                                                                                                                                                                                         | `boolean`                                                                                       | `false`          |
| `dark`            | `dark`              | Dark theme variant.                                                                                                                                                                                                                                                                                                                                                                                     | `boolean`                                                                                       | `false`          |
| `disabled`        | `disabled`          | Whether the component is disabled (cannot be interacted with).                                                                                                                                                                                                                                                                                                                                          | `boolean`                                                                                       | `false`          |
| `expandable`      | `expandable`        | Allow expanding/collapsing of text area with smooth animations                                                                                                                                                                                                                                                                                                                                          | `boolean`                                                                                       | `false`          |
| `keyboard`        | `keyboard`          | Enable keyboard navigation and shortcuts.                                                                                                                                                                                                                                                                                                                                                               | `boolean`                                                                                       | `true`           |
| `label`           | `label`             | Label for the text component with enhanced styling                                                                                                                                                                                                                                                                                                                                                      | `string`                                                                                        | `undefined`      |
| `language`        | `language`          | Programming language for syntax highlighting                                                                                                                                                                                                                                                                                                                                                            | `"css" \| "html" \| "javascript" \| "json" \| "markdown" \| "python" \| "typescript" \| "yaml"` | `'javascript'`   |
| `lineNumberStyle` | `line-number-style` | Line number style for better visualization                                                                                                                                                                                                                                                                                                                                                              | `"bordered" \| "floating" \| "highlighted" \| "simple"`                                         | `'simple'`       |
| `maxAutoHeight`   | `max-auto-height`   | Maximum height for auto-resize (pixels)                                                                                                                                                                                                                                                                                                                                                                 | `number`                                                                                        | `200`            |
| `maxHeight`       | `max-height`        | Maximum height when expanded (pixels) with responsive behavior                                                                                                                                                                                                                                                                                                                                          | `number`                                                                                        | `200`            |
| `maxLength`       | `max-length`        | Maximum character length with visual feedback                                                                                                                                                                                                                                                                                                                                                           | `number`                                                                                        | `undefined`      |
| `minHeight`       | `min-height`        | Minimum height for auto-resize (pixels)                                                                                                                                                                                                                                                                                                                                                                 | `number`                                                                                        | `40`             |
| `placeholder`     | `placeholder`       | Placeholder text for empty fields with enhanced styling                                                                                                                                                                                                                                                                                                                                                 | `string`                                                                                        | `undefined`      |
| `readonly`        | `readonly`          | Whether the component is read-only (displays value but cannot be changed).                                                                                                                                                                                                                                                                                                                              | `boolean`                                                                                       | `false`          |
| `resizable`       | `resizable`         | Allow manual resizing of text area (enhanced with constraints)                                                                                                                                                                                                                                                                                                                                          | `boolean`                                                                                       | `false`          |
| `resizeDirection` | `resize-direction`  | Direction in which the field can be resized                                                                                                                                                                                                                                                                                                                                                             | `"both" \| "horizontal" \| "none" \| "vertical"`                                                | `'vertical'`     |
| `resizeHandle`    | `resize-handle`     | Resize handle style for textareas                                                                                                                                                                                                                                                                                                                                                                       | `"classic" \| "minimal" \| "modern"`                                                            | `'modern'`       |
| `rows`            | `rows`              | Number of rows for multi-line text (enhanced with auto-resize)                                                                                                                                                                                                                                                                                                                                          | `number`                                                                                        | `4`              |
| `shadow`          | `shadow`            | Shadow intensity for depth effects                                                                                                                                                                                                                                                                                                                                                                      | `"glow" \| "heavy" \| "light" \| "medium" \| "none"`                                            | `'medium'`       |
| `showCharCount`   | `show-char-count`   | Show character count for text inputs                                                                                                                                                                                                                                                                                                                                                                    | `boolean`                                                                                       | `false`          |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp below the component.                                                                                                                                                                                                                                                                                                                                                        | `boolean`                                                                                       | `false`          |
| `showLineNumbers` | `show-line-numbers` | Show line numbers for multi-line text (code editor style)                                                                                                                                                                                                                                                                                                                                               | `boolean`                                                                                       | `false`          |
| `size`            | `size`              | Component size for different use cases. - small: Compact text for tight spaces - medium: Standard size (default) - large: Prominent text with larger typography                                                                                                                                                                                                                                         | `"large" \| "medium" \| "small"`                                                                | `'medium'`       |
| `spellCheck`      | `spell-check`       |                                                                                                                                                                                                                                                                                                                                                                                                         | `boolean`                                                                                       | `true`           |
| `structure`       | `structure`         | Content structure for syntax highlighting and formatting                                                                                                                                                                                                                                                                                                                                                | `"code" \| "json" \| "markdown" \| "unstructured" \| "xml" \| "yaml"`                           | `'unstructured'` |
| `syntaxHighlight` | `syntax-highlight`  | Enable syntax highlighting for code                                                                                                                                                                                                                                                                                                                                                                     | `boolean`                                                                                       | `false`          |
| `textColor`       | `text-color`        | Custom text color (hex, rgb, or color name)                                                                                                                                                                                                                                                                                                                                                             | `string`                                                                                        | `undefined`      |
| `textType`        | `text-type`         | Text input type - 'single' for single-line, 'multi' for multi-line                                                                                                                                                                                                                                                                                                                                      | `"multi" \| "single"`                                                                           | `'single'`       |
| `themeVariant`    | `theme-variant`     | Theme variation presets for quick styling changes                                                                                                                                                                                                                                                                                                                                                       | `"default" \| "elegant" \| "modern" \| "sharp" \| "soft" \| "vibrant"`                          | `'default'`      |
| `value`           | `value`             | Current text value                                                                                                                                                                                                                                                                                                                                                                                      | `string`                                                                                        | `''`             |
| `variant`         | `variant`           | Visual style variant matching component family design. - display: Read-only text display with subtle styling - edit: Editable input/textarea with interactive styling - minimal: Clean, borderless design with subtle hover effects - outlined: Border with transparent background, colored accents - filled: Solid background with contrasting text - elevated: Shadow and depth for prominent display | `"display" \| "edit" \| "elevated" \| "filled" \| "minimal" \| "outlined"`                      | `'display'`      |
| `wordWrap`        | `word-wrap`         | Enable word wrap for long lines                                                                                                                                                                                                                                                                                                                                                                         | `boolean`                                                                                       | `true`           |


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

### `setStatus(status: "idle" | "loading" | "success" | "error", message?: string) => Promise<void>`

Set the visual status of the text component (success, warning, error).

#### Parameters

| Name      | Type                                          | Description                    |
| --------- | --------------------------------------------- | ------------------------------ |
| `status`  | `"idle" \| "loading" \| "success" \| "error"` | - Status type or null to clear |
| `message` | `string`                                      | - Optional status message      |

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
