# text-display



<!-- Auto Generated Below -->


## Overview

TextDisplay component supports multiple variants for text-heavy data display and editing.
Provides field, area, structured, unstructured, and editable modes with consistent styling.

## Properties

| Property          | Attribute           | Description                                                                                                                                                                                                                                                          | Type                                                                | Default      |
| ----------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------ |
| `color`           | `color`             | Color theme variant.                                                                                                                                                                                                                                                 | `"neutral" \| "primary" \| "secondary"`                             | `'primary'`  |
| `connected`       | `connected`         | Connection state for readonly mode                                                                                                                                                                                                                                   | `boolean`                                                           | `true`       |
| `dark`            | `dark`              | Enable dark theme for the component. When true, uses light text on dark backgrounds.                                                                                                                                                                                 | `boolean`                                                           | `false`      |
| `disabled`        | `disabled`          | Whether the component is disabled (editable mode only).                                                                                                                                                                                                              | `boolean`                                                           | `false`      |
| `keyboard`        | `keyboard`          | Enable keyboard navigation for editable mode. Default: true                                                                                                                                                                                                          | `boolean`                                                           | `true`       |
| `label`           | `label`             | Text label displayed above the text display.                                                                                                                                                                                                                         | `string`                                                            | `undefined`  |
| `maxLength`       | `max-length`        | Maximum character limit (editable mode only).                                                                                                                                                                                                                        | `number`                                                            | `undefined`  |
| `maxRows`         | `max-rows`          | Maximum number of rows for area mode.                                                                                                                                                                                                                                | `number`                                                            | `10`         |
| `minRows`         | `min-rows`          | Minimum number of rows for area mode.                                                                                                                                                                                                                                | `number`                                                            | `3`          |
| `mode`            | `mode`              | Display mode for the text component. - field: One-line text display - area: Expandable text box (multi-line) - unstructured: Plain style, no highlighting - structured: Highlighted block (for JSON-like or formatted text) - editable: User can edit/write directly | `"area" \| "editable" \| "field" \| "structured" \| "unstructured"` | `'field'`    |
| `placeholder`     | `placeholder`       | Placeholder text shown when value is empty (editable mode only).                                                                                                                                                                                                     | `string`                                                            | `undefined`  |
| `readonly`        | `readonly`          | Whether the component is read-only.                                                                                                                                                                                                                                  | `boolean`                                                           | `false`      |
| `showCharCount`   | `show-char-count`   | Show character count (editable mode only).                                                                                                                                                                                                                           | `boolean`                                                           | `false`      |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp.                                                                                                                                                                                                                                         | `boolean`                                                           | `false`      |
| `showLineNumbers` | `show-line-numbers` | Show line numbers (area and structured modes).                                                                                                                                                                                                                       | `boolean`                                                           | `false`      |
| `showStatus`      | `show-status`       | Show status badge when true                                                                                                                                                                                                                                          | `boolean`                                                           | `true`       |
| `value`           | `value`             | Current text value of the component.                                                                                                                                                                                                                                 | `string`                                                            | `''`         |
| `variant`         | `variant`           | Visual style variant of the text display. - minimal: Text-only with subtle underline or accent - outlined: Border style applied (default) - filled: Background color applied                                                                                         | `"filled" \| "minimal" \| "outlined"`                               | `'outlined'` |


## Events

| Event      | Description                                                     | Type                         |
| ---------- | --------------------------------------------------------------- | ---------------------------- |
| `valueMsg` | Event emitted when the text value changes (editable mode only). | `CustomEvent<UiMsg<string>>` |


## Methods

### `focusInput() => Promise<void>`

Focus the input element (editable mode only).

#### Returns

Type: `Promise<void>`



### `getValue(includeMetadata?: boolean) => Promise<string | { value: string; lastUpdated?: number; status: string; error?: string; }>`

Get the current text value with optional metadata.

#### Parameters

| Name              | Type      | Description                                               |
| ----------------- | --------- | --------------------------------------------------------- |
| `includeMetadata` | `boolean` | - Whether to include additional metadata (default: false) |

#### Returns

Type: `Promise<string | { value: string; lastUpdated?: number; status: string; error?: string; }>`

Promise<string | MetadataResult> - Current value or object with metadata

### `setStatus(status: "idle" | "loading" | "success" | "error", errorMessage?: string) => Promise<void>`

Set operation status for external status management.
Use this method to manually control the visual status indicators
when managing operations externally.

#### Parameters

| Name           | Type                                          | Description                                                 |
| -------------- | --------------------------------------------- | ----------------------------------------------------------- |
| `status`       | `"error" \| "loading" \| "success" \| "idle"` | - The status to set ('idle', 'loading', 'success', 'error') |
| `errorMessage` | `string`                                      | - Optional error message for error status                   |

#### Returns

Type: `Promise<void>`

Promise<void>

### `setValue(value: string, options?: { writeOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; customStatus?: "loading" | "success" | "error"; errorMessage?: string; _isRevert?: boolean; }) => Promise<boolean>`

Set the text value and handle optional operations and status management.

#### Parameters

| Name      | Type                                                                                                                                                                                                             | Description                               |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `value`   | `string`                                                                                                                                                                                                         | - The string value to set                 |
| `options` | `{ writeOperation?: () => Promise<any>; optimistic?: boolean; autoRetry?: { attempts: number; delay: number; }; customStatus?: "error" \| "loading" \| "success"; errorMessage?: string; _isRevert?: boolean; }` | - Configuration options for the operation |

#### Returns

Type: `Promise<boolean>`

Promise<boolean> - true if successful, false if failed

### `setValueSilent(value: string) => Promise<void>`

Set value without triggering events (for external updates).
Use this method when updating from external data sources to prevent event loops.

#### Parameters

| Name    | Type     | Description                        |
| ------- | -------- | ---------------------------------- |
| `value` | `string` | - The string value to set silently |

#### Returns

Type: `Promise<void>`

Promise<void>


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
