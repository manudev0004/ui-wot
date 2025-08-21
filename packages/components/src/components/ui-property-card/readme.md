# ui-property-card



<!-- Auto Generated Below -->


## Overview

Smart wrapper for TD properties that provides visual feedback, status indicators,
and handles the connection between UI controls and Thing Description properties.

## Properties

| Property              | Attribute               | Description                                                       | Type                                  | Default     |
| --------------------- | ----------------------- | ----------------------------------------------------------------- | ------------------------------------- | ----------- |
| `description`         | `description`           | Description text for the property                                 | `string`                              | `undefined` |
| `label`               | `label`                 | Display label for the property                                    | `string`                              | `undefined` |
| `property`            | `property`              | Property name from the Thing Description                          | `string`                              | `undefined` |
| `schema`              | `schema`                | Property schema from Thing Description (for capability detection) | `any`                                 | `undefined` |
| `showCapabilityBadge` | `show-capability-badge` | Show capability badge (read-only, write-only, etc.)               | `boolean`                             | `true`      |
| `showStatus`          | `show-status`           | Show status indicator (success, error, pending)                   | `boolean`                             | `true`      |
| `showTimestamp`       | `show-timestamp`        | Show last updated timestamp                                       | `boolean`                             | `true`      |
| `thingId`             | `thing-id`              | Thing ID this property belongs to                                 | `string`                              | `undefined` |
| `variant`             | `variant`               | Visual style variant                                              | `"compact" \| "default" \| "minimal"` | `'default'` |


## Events

| Event            | Description                                                              | Type                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `propertyAction` | Emitted when a control action should be performed (read, write, observe) | `CustomEvent<{ action: "read" \| "write" \| "observe" \| "unobserve"; thingId?: string; property?: string; value?: any; }>` |


## Methods

### `ackSuccess(message?: string) => Promise<void>`

Acknowledge a successful operation

#### Parameters

| Name      | Type     | Description |
| --------- | -------- | ----------- |
| `message` | `string` |             |

#### Returns

Type: `Promise<void>`



### `reportError(message: string) => Promise<void>`

Report an error

#### Parameters

| Name      | Type     | Description |
| --------- | -------- | ----------- |
| `message` | `string` |             |

#### Returns

Type: `Promise<void>`



### `setStatus(status: "idle" | "pending" | "success" | "error", message?: string, autoClearMs?: number) => Promise<void>`

Set the current status with optional auto-clear

#### Parameters

| Name          | Type                                          | Description |
| ------------- | --------------------------------------------- | ----------- |
| `status`      | `"error" \| "success" \| "idle" \| "pending"` |             |
| `message`     | `string`                                      |             |
| `autoClearMs` | `number`                                      |             |

#### Returns

Type: `Promise<void>`




## Slots

| Slot            | Description                                        |
| --------------- | -------------------------------------------------- |
| `"actions"`     | Action buttons (refresh, configure, etc.)          |
| `"control"`     | The control component (ui-toggle, ui-slider, etc.) |
| `"description"` | Additional description content                     |
| `"label"`       | Custom label content                               |


## Shadow Parts

| Part                 | Description |
| -------------------- | ----------- |
| `"actions"`          |             |
| `"body"`             |             |
| `"capability-badge"` |             |
| `"card"`             |             |
| `"description"`      |             |
| `"header"`           |             |
| `"label"`            |             |
| `"status"`           |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
