# ui-event



<!-- Auto Generated Below -->


## Overview

Event listener component for subscribing to and publishing WoT events.
Provides real-time event handling with filtering, buffering, and visual feedback.

## Properties

| Property           | Attribute           | Description                                     | Type                                           | Default      |
| ------------------ | ------------------- | ----------------------------------------------- | ---------------------------------------------- | ------------ |
| `autoPublish`      | `auto-publish`      | Auto-publish mode for publishers                | `boolean`                                      | `false`      |
| `color`            | `color`             | Color theme                                     | `"neutral" \| "primary" \| "secondary"`        | `'primary'`  |
| `connected`        | `connected`         | Connection status indicator                     | `boolean`                                      | `false`      |
| `dark`             | `dark`              | Dark mode support                               | `boolean`                                      | `false`      |
| `disabled`         | `disabled`          | Whether the component is disabled               | `boolean`                                      | `false`      |
| `enableFiltering`  | `enable-filtering`  | Enable event filtering                          | `boolean`                                      | `false`      |
| `eventName`        | `event-name`        | Event name to subscribe to or publish           | `string`                                       | `undefined`  |
| `filterExpression` | `filter-expression` | Filter expression (JSONPath or simple property) | `string`                                       | `undefined`  |
| `keyboard`         | `keyboard`          | Enable keyboard interactions                    | `boolean`                                      | `true`       |
| `label`            | `label`             | Display label for the component                 | `string`                                       | `undefined`  |
| `maxEvents`        | `max-events`        | Maximum number of events to keep in history     | `number`                                       | `50`         |
| `mode`             | `mode`              | Component mode: listener or publisher           | `"bidirectional" \| "listener" \| "publisher"` | `'listener'` |
| `payloadTemplate`  | `payload-template`  | Event payload template for publishing           | `string`                                       | `undefined`  |
| `readonly`         | `readonly`          | Whether component is in readonly mode           | `boolean`                                      | `false`      |
| `showLastUpdated`  | `show-last-updated` | Show last updated timestamp                     | `boolean`                                      | `false`      |
| `showTimestamp`    | `show-timestamp`    | Show event timestamps                           | `boolean`                                      | `true`       |
| `variant`          | `variant`           | Visual style variant                            | `"filled" \| "minimal" \| "outlined"`          | `'outlined'` |


## Events

| Event            | Description                                         | Type                      |
| ---------------- | --------------------------------------------------- | ------------------------- |
| `eventPublished` | Emitted when an event is published (publisher mode) | `CustomEvent<UiMsg<any>>` |
| `eventReceived`  | Emitted when an event is received (listener mode)   | `CustomEvent<UiMsg<any>>` |
| `valueMsg`       | Standard value message event                        | `CustomEvent<UiMsg<any>>` |


## Methods

### `clearEvents() => Promise<void>`

Clear event history

#### Returns

Type: `Promise<void>`



### `getEventHistory() => Promise<Array<any>>`

Get event history

#### Returns

Type: `Promise<any[]>`



### `publishEvent(payload: any, options?: { eventName?: string; }) => Promise<void>`

Publish an event

#### Parameters

| Name      | Type                      | Description |
| --------- | ------------------------- | ----------- |
| `payload` | `any`                     |             |
| `options` | `{ eventName?: string; }` |             |

#### Returns

Type: `Promise<void>`



### `setEventFilter(filterFn: (event: any) => boolean) => Promise<void>`

Set event filter function

#### Parameters

| Name       | Type                      | Description |
| ---------- | ------------------------- | ----------- |
| `filterFn` | `(event: any) => boolean` |             |

#### Returns

Type: `Promise<void>`



### `setStatus(status: "idle" | "loading" | "success" | "error", errorMessage?: string) => Promise<void>`

Set component status

#### Parameters

| Name           | Type                                          | Description |
| -------------- | --------------------------------------------- | ----------- |
| `status`       | `"error" \| "loading" \| "success" \| "idle"` |             |
| `errorMessage` | `string`                                      |             |

#### Returns

Type: `Promise<void>`



### `startListening() => Promise<void>`

Start listening for events

#### Returns

Type: `Promise<void>`



### `stopListening() => Promise<void>`

Stop listening for events

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
