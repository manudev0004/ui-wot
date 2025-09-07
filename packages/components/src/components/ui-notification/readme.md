# ui-notification



<!-- Auto Generated Below -->


## Overview

Notification component for displaying temporary event data with auto-dismiss functionality.
Supports multiple notification types with smooth animations and customizable duration.

## Properties

| Property          | Attribute           | Description                                                                                                                                                                                  | Type                                          | Default     |
| ----------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------- |
| `color`           | `color`             | Color theme variant.                                                                                                                                                                         | `"neutral" \| "primary" \| "secondary"`       | `'primary'` |
| `connected`       | `connected`         | Connection state for readonly mode                                                                                                                                                           | `boolean`                                     | `true`      |
| `customClass`     | `custom-class`      | Custom CSS classes to apply to the notification.                                                                                                                                             | `string`                                      | `undefined` |
| `dark`            | `dark`              | Enable dark theme for the component.                                                                                                                                                         | `boolean`                                     | `false`     |
| `disabled`        | `disabled`          | Whether the notification is disabled (cannot be interacted with).                                                                                                                            | `boolean`                                     | `false`     |
| `duration`        | `duration`          | Duration in milliseconds before auto-dismiss. Set to 0 to disable auto-dismiss. Default: 3000 (3 seconds)                                                                                    | `number`                                      | `3000`      |
| `label`           | `label`             | Text label displayed with the notification.                                                                                                                                                  | `string`                                      | `undefined` |
| `message`         | `message`           | The message text to display in the notification.                                                                                                                                             | `string`                                      | `''`        |
| `position`        | `position`          | Position of the notification (for styling purposes).                                                                                                                                         | `"bottom" \| "center" \| "top"`               | `'top'`     |
| `readonly`        | `readonly`          | Whether the notification is read-only (displays but cannot be dismissed manually).                                                                                                           | `boolean`                                     | `false`     |
| `showCloseButton` | `show-close-button` | Whether to show a close button. Default: true                                                                                                                                                | `boolean`                                     | `true`      |
| `showIcon`        | `show-icon`         | Whether to show an icon based on the notification type. Default: true                                                                                                                        | `boolean`                                     | `true`      |
| `showLastUpdated` | `show-last-updated` | Show last updated timestamp when true                                                                                                                                                        | `boolean`                                     | `false`     |
| `type`            | `type`              | Type of notification affecting styling and icons. - info: General information (blue) - success: Success messages (green)  - warning: Warning messages (orange) - error: Error messages (red) | `"error" \| "info" \| "success" \| "warning"` | `'info'`    |


## Events

| Event               | Description                                                                                                                   | Type                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `notificationClose` | Emitted when the notification is closed/dismissed. Contains information about how it was closed (auto, manual, programmatic). | `CustomEvent<{ message: string; type: string; dismissMethod: "auto" \| "manual" \| "programmatic"; timestamp: number; }>` |
| `valueMsg`          | Emitted when notification value/state changes. Compatible with other UI components for unified event handling.                | `CustomEvent<UiMsg<any>>`                                                                                                 |


## Methods

### `dismiss(method?: "auto" | "manual" | "programmatic") => Promise<void>`

Dismiss the notification with animation.

#### Parameters

| Name     | Type                                   | Description                          |
| -------- | -------------------------------------- | ------------------------------------ |
| `method` | `"auto" \| "manual" \| "programmatic"` | - How the notification was dismissed |

#### Returns

Type: `Promise<void>`



### `show() => Promise<void>`

Show the notification with animation.

#### Returns

Type: `Promise<void>`



### `toggle() => Promise<void>`

Toggle the notification visibility.

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
