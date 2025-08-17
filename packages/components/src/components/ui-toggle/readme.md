# ui-toggle



<!-- Auto Generated Below -->


## Overview

Advanced toggle switch component with reactive state management, validation, and TD integration support.
Provides multiple visual styles, accessibility features, and flexible event handling.

## Properties

| Property       | Attribute       | Description                                                                                                                                                                                                                                                                                                                                                                  | Type                                                                                        | Default       |
| -------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------- |
| `autoSync`     | `auto-sync`     | Auto-sync hint: if present and true or a number (milliseconds) a page-level wiring script may set up polling/observe. Stored as attribute (string) when used in HTML. Parsed by page wiring utilities. Component itself does not start any network activity.                                                                                                                 | `boolean \| number \| string`                                                               | `undefined`   |
| `color`        | `color`         | Color scheme to match thingsweb webpage                                                                                                                                                                                                                                                                                                                                      | `"neutral" \| "primary" \| "secondary"`                                                     | `'primary'`   |
| `debounce`     | `debounce`      | Debounce delay in milliseconds for value change events. Prevents rapid firing of events during quick toggles. Default: 100ms                                                                                                                                                                                                                                                 | `number`                                                                                    | `100`         |
| `debug`        | `debug`         | Enable debug logging for development. Gate console output when true.                                                                                                                                                                                                                                                                                                         | `boolean`                                                                                   | `false`       |
| `keyboard`     | `keyboard`      | Enable keyboard navigation (Space and Enter keys). Default: true                                                                                                                                                                                                                                                                                                             | `boolean`                                                                                   | `true`        |
| `label`        | `label`         | Optional text label, to display text left to the toggle. When given, clicking the label will also toggle the switch.                                                                                                                                                                                                                                                         | `string`                                                                                    | `undefined`   |
| `mirror`       | `mirror`        | Mirror selector(s) to link other components (page wiring utility may use this). Example: mirror="#otherToggle" or mirror="#a,#b"                                                                                                                                                                                                                                             | `string`                                                                                    | `undefined`   |
| `mode`         | `mode`          | Device interaction mode. - read: Only read from device (display current state, no user interaction) - write: Only write to device (control device but don't sync state) - readwrite: Read and write (full synchronization) - default                                                                                                                                         | `"read" \| "readwrite" \| "write"`                                                          | `'readwrite'` |
| `reactive`     | `reactive`      | Enable automatic state reflection from external value changes. When true, the component will automatically update its visual state when value prop changes. Default: true                                                                                                                                                                                                    | `boolean`                                                                                   | `true`        |
| `shortLabel`   | `short-label`   | Short label for compact UI (accessibility + compact representations).                                                                                                                                                                                                                                                                                                        | `string`                                                                                    | `undefined`   |
| `state`        | `state`         | Current state of the toggle. - active: Toggle is on/active - disabled: Toggle cannot be clicked or interacted with - default: Toggle is off/inactive (default)                                                                                                                                                                                                               | `"active" \| "default" \| "disabled"`                                                       | `'default'`   |
| `syncInterval` | `sync-interval` | Auto-sync interval in milliseconds for read mode. When set, the component will emit 'sync-request' events at this interval. External systems can listen to this event to update the value prop. Default: 0 (disabled)                                                                                                                                                        | `number`                                                                                    | `0`           |
| `tdProperty`   | `td-property`   | Declarative TD property name. Page scripts may use this to auto-wire this element to a TD property. Example: td-property="bool" NOTE: Component does not perform any network operations. This is a lightweight hint only.                                                                                                                                                    | `string`                                                                                    | `undefined`   |
| `tdUrl`        | `td-url`        | Lightweight hint to the TD base URL for page-level wiring. Component does not perform network requests. Example: td-url="http://plugfest.thingweb.io/http-data-schema-thing"                                                                                                                                                                                                 | `string`                                                                                    | `undefined`   |
| `theme`        | `theme`         | Theme for the component.                                                                                                                                                                                                                                                                                                                                                     | `"dark" \| "light"`                                                                         | `'light'`     |
| `validator`    | `validator`     | Custom validation function name for value changes. The function should be available on window object and return boolean.                                                                                                                                                                                                                                                     | `string`                                                                                    | `undefined`   |
| `validatorFn`  | `validator-fn`  | Typed validator callback. Preferred over the string `validator` lookup. Accepts sync or async functions. If provided, it will be called first.                                                                                                                                                                                                                               | `(newValue: boolean, currentValue: boolean, label?: string) => boolean \| Promise<boolean>` | `undefined`   |
| `value`        | `value`         | Local value for the toggle. Accepts boolean or string values (string will be parsed). This is the primary way to control the toggle state externally.                                                                                                                                                                                                                        | `boolean \| string`                                                                         | `undefined`   |
| `valueSource`  | `value-source`  | Compact source descriptor. Format: "<scheme>://<identifier>". Examples:  - js://myApp.state.lightOn  (read JS path from window safely)  - td://bool                 (map to TD property 'bool', page helper wires)  - el://#otherToggle         (mirror another component by selector) NOTE: component does not resolve network or perform eval; this is a declarative hint. | `string`                                                                                    | `undefined`   |
| `variant`      | `variant`       | Visual style variant of the toggle. - circle: Common pill-shaped toggle (default) - square: Rectangular toggle with square thumb - apple: iOS-style switch (bigger size, rounded edges) - cross: Shows × when off, ✓ when on with red background when off and green when on - neon: Glowing effect when active                                                               | `"apple" \| "circle" \| "cross" \| "neon" \| "square"`                                      | `'circle'`    |
| `writeOn`      | `write-on`      | Write behavior hint for page wiring: 'auto'\|'manual'\|'none' - auto: component suggests writes when user interacts (default) - manual: component will require external explicit writes - none: component is purely read-only from the page wiring perspective                                                                                                               | `"auto" \| "manual" \| "none"`                                                              | `'auto'`      |


## Events

| Event             | Description                                                             | Type                                                                                     |
| ----------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `beforeChange`    | Event emitted before value changes (can be prevented)                   | `CustomEvent<{ currentValue: boolean; newValue: boolean; preventDefault: () => void; }>` |
| `ready`           | Event emitted after component is ready and initialized                  | `CustomEvent<{ value: boolean; mode: string; }>`                                         |
| `syncRequest`     | Event emitted to request sync in read mode (for external data fetching) | `CustomEvent<{ mode: string; label?: string; }>`                                         |
| `toggle`          | Legacy event emitted when toggle state changes                          | `CustomEvent<UiToggleToggleEvent>`                                                       |
| `validationError` | Event emitted when validation fails                                     | `CustomEvent<{ value: boolean; message: string; }>`                                      |
| `valueChange`     | Standardized valueChange event for value-driven integrations            | `CustomEvent<UiToggleValueChange>`                                                       |


## Methods

### `applyExternalValue(value: boolean | string) => Promise<boolean>`

Apply an external value to this component (will go through validation and emit events).

#### Parameters

| Name    | Type                | Description |
| ------- | ------------------- | ----------- |
| `value` | `string \| boolean` |             |

#### Returns

Type: `Promise<boolean>`



### `observeLocal(fn: (value: boolean) => void) => Promise<void>`

Public method: register a local observer function to be called when the value changes.
Useful for page-level wiring utilities.

#### Parameters

| Name | Type                       | Description |
| ---- | -------------------------- | ----------- |
| `fn` | `(value: boolean) => void` |             |

#### Returns

Type: `Promise<void>`



### `stopObservingLocal() => Promise<void>`

Stop all registered local observers

#### Returns

Type: `Promise<void>`




## Shadow Parts

| Part                   | Description |
| ---------------------- | ----------- |
| `"container"`          |             |
| `"control"`            |             |
| `"label"`              |             |
| `"readonly-indicator"` |             |
| `"sync-indicator"`     |             |
| `"thumb"`              |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
