# ui-notification



<!-- Auto Generated Below -->


## Overview

A versatile notification component designed for WoT device control.

It has various features, multiple visual styles, status and last updated timestamps.

## Properties

| Property          | Attribute           | Description                                                                                                                                                                                  | Type                                          | Default  |
| ----------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | -------- |
| `dark`            | `dark`              | Enable dark mode theme styling when true                                                                                                                                                     | `boolean`                                     | `false`  |
| `duration`        | `duration`          | Duration in milliseconds before auto-dismiss (Set to 0 to disable auto-dismiss)                                                                                                              | `number`                                      | `3000`   |
| `message`         | `message`           | The message text to display in the notification                                                                                                                                              | `string`                                      | `''`     |
| `showCloseButton` | `show-close-button` | Whether to show a close button                                                                                                                                                               | `boolean`                                     | `true`   |
| `showIcon`        | `show-icon`         | Whether to show an icon based on the notification type                                                                                                                                       | `boolean`                                     | `true`   |
| `type`            | `type`              | Type of notification affecting styling and icons. - info: General information (blue) - success: Success messages (green)  - warning: Warning messages (orange) - error: Error messages (red) | `"error" \| "info" \| "success" \| "warning"` | `'info'` |


## Events

| Event               | Description                                                                                                                                                        | Type                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `notificationClose` | Emitted when the notification is closed/dismissed. Contains information about how it was closed (auto, manual, programmatic).                                      | `CustomEvent<{ message: string; type: string; dismissMethod: "auto" \| "manual" \| "programmatic"; timestamp: number; }>` |
| `valueMsg`          | Emitted when notification value/state changes through user interaction or method calls. Contains the new value, previous value, timestamp, and source information. | `CustomEvent<UiMsg<any>>`                                                                                                 |


## Methods

### `dismiss(method?: "auto" | "manual" | "programmatic") => Promise<void>`

This method dismisses the notification with animation.

Use this for external control or programmatic dismissal.
Perfect for coordinated UI updates or external triggers.

#### Parameters

| Name     | Type                                   | Description                          |
| -------- | -------------------------------------- | ------------------------------------ |
| `method` | `"auto" \| "manual" \| "programmatic"` | - How the notification was dismissed |

#### Returns

Type: `Promise<void>`



### `getValue(includeMetadata?: boolean) => Promise<boolean | { value: boolean; message: string; type: string; duration: number; }>`

Gets the current notification visibility with optional metadata.

#### Parameters

| Name              | Type      | Description                                                  |
| ----------------- | --------- | ------------------------------------------------------------ |
| `includeMetadata` | `boolean` | - Whether to include status, timestamp and other information |

#### Returns

Type: `Promise<boolean | { value: boolean; message: string; type: string; duration: number; }>`

Current visibility or detailed metadata object

### `show() => Promise<void>`

Shows the notification with optional device communication api and other options.

This is the primary method for displaying notifications programmatically.
It supports smooth animations and consistent event emission.

#### Returns

Type: `Promise<void>`

Promise resolving to void when animation completes

### `toggle() => Promise<void>`

(Advance) to toggle the notification visibility.

Useful when managing notification state externally and you want to show/hide conditionally.

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
