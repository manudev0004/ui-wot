# UI-WoT Components API

This document describes the API for UI-WoT Components, a library of Web Components designed to build user interfaces for IoT applications using Web of Things (WoT) standards.

## Table of Contents

- [What to do with the library](#what-to-do-with-the-library)
  - [Using UI-WoT Components](#using-ui-wot-components)
  - [Connecting Components to WoT Things](#connecting-components-to-wot-things)
  - [Working with Individual Components](#working-with-individual-components)
- [Services API](#services-api)
  - [initializeWot()](#initializewot)
  - [connectAll()](#connectall)
  - [connectProperty()](#connectproperty)
  - [connectAction()](#connectaction)
  - [connectEvent()](#connectevent)
- [Component APIs](#component-apis)
  - [Input Components](#input-components)
  - [Action Components](#action-components)
  - [Monitoring Components](#monitoring-components)
  - [Complex Data Components](#complex-data-components)
- [Component Lifecycle](#component-lifecycle)
- [Events and Messaging](#events-and-messaging)
- [Type Definitions](#type-definitions)

## What to do with the library

The main functionalities of UI-WoT Components are creating interactive UIs for WoT devices and providing seamless integration with Thing Descriptions. Components can be used standalone or connected to live WoT Things.

### Using UI-WoT Components

#### Prerequisites

- `npm install @thingweb/ui-wot-components` (when published)
- Include Node-WoT browser bundle for WoT functionality:
  ```html
  <script src="https://cdn.jsdelivr.net/npm/@node-wot/browser-bundle@latest/dist/wot-bundle.min.js"></script>
  ```

#### Load Components in HTML

```html
<script type="module" src="./build/ui-wot-components.esm.js"></script>
```

#### Load Components in Framework

```javascript
// Import individual components
import { defineCustomElement } from '@thingweb/ui-wot-components/components/ui-toggle';
import { defineCustomElement as UiSlider } from '@thingweb/ui-wot-components/components/ui-slider';

// Define custom elements
defineCustomElement();
UiSlider();
```

#### Use Components in HTML

```html
<!-- Basic usage -->
<ui-toggle label="Device Power" show-status="true"></ui-toggle>
<ui-slider label="Brightness" min="0" max="100"></ui-slider>
<ui-button label="Start Process"></ui-button>

<!-- With WoT integration -->
<ui-toggle td-property="powerState" label="Power" show-last-updated="true"></ui-toggle>
<ui-slider td-property="brightness" td-strategy="observe" label="Brightness"></ui-slider>
<ui-button td-action="restart" label="Restart Device"></ui-button>
```

### Connecting Components to WoT Things

#### Initialize WoT Runtime

```javascript
import { initializeWot } from '@thingweb/ui-wot-components/services';

// Initialize WoT runtime
await initializeWot();
```

#### Connect All Components Automatically

```javascript
import { connectAll } from '@thingweb/ui-wot-components/services';

// Connect all components with td-* attributes
const cleanups = await connectAll({
  baseUrl: 'http://my-device.local/td',
  container: document, // optional, defaults to document
});

// Later, cleanup connections
cleanups.forEach(cleanup => cleanup());
```

#### Manual Component Connection

```javascript
import { connectProperty, connectAction } from '@thingweb/ui-wot-components/services';

// Wait for components to be defined
await customElements.whenDefined('ui-toggle');
await customElements.whenDefined('ui-button');

// Get component references
const toggle = document.getElementById('power-toggle');
const button = document.getElementById('restart-btn');

// Connect to WoT Thing
const cleanup1 = await connectProperty(toggle, {
  baseUrl: 'http://device.local/td',
  name: 'powerState',
  strategy: 'observe',
});

await connectAction(button, {
  baseUrl: 'http://device.local/td',
  name: 'restart',
});
```

### Working with Individual Components

#### Set Component Values

```javascript
const toggle = document.querySelector('ui-toggle');

// Set value with write operation
await toggle.setValue(true, {
  writeOperation: async value => {
    await thing.writeProperty('powerState', value);
  },
});

// Set value silently (no events)
await toggle.setValueSilent(false);
```

#### Get Component Values

```javascript
const slider = document.querySelector('ui-slider');

// Get current value
const currentValue = await slider.getValue();
console.log('Slider value:', currentValue);
```

#### Listen to Component Changes

```javascript
const colorPicker = document.querySelector('ui-color-picker');

colorPicker.addEventListener('uiChange', event => {
  console.log('Color changed:', event.detail.value);
  console.log('Previous value:', event.detail.previousValue);
});
```

## Services API

### initializeWot()

Initializes the WoT runtime using the Node-WoT browser bundle.

**Signature:**

```typescript
function initializeWot(options?: InitializeWotOptions): Promise<{ wot: any }>;
```

**Parameters:**

- `options.reuseExisting` (boolean, optional): Whether to reuse existing WoT instance. Default: `true`

**Returns:**

- Promise resolving to object with `wot` property containing the initialized WoT instance

**Example:**

```javascript
const { wot } = await initializeWot();
console.log('WoT initialized:', wot);
```

### connectAll()

Automatically discovers and connects all components with `td-*` attributes.

**Signature:**

```typescript
function connectAll(options: ConnectAllOptions): Promise<Cleanup[]>;
```

**Parameters:**

- `options.baseUrl` (string): Thing Description URL
- `options.container` (ParentNode, optional): Container to search for components. Default: `document`

**Returns:**

- Promise resolving to array of cleanup functions

**Example:**

```javascript
const cleanups = await connectAll({
  baseUrl: 'http://smart-home.local/td',
  container: document.getElementById('dashboard'),
});

// Cleanup all connections
window.addEventListener('beforeunload', () => {
  cleanups.forEach(cleanup => cleanup());
});
```

### connectProperty()

Connects a single component to a WoT Thing property.

**Signature:**

```typescript
function connectProperty(element: HTMLElement, options: ConnectPropertyOptions): Promise<Cleanup>;
```

**Parameters:**

- `element` (HTMLElement): The component element
- `options.baseUrl` (string): Thing Description URL
- `options.name` (string): Property name in TD
- `options.strategy` (ObserveStrategy, optional): Connection strategy ('observe', 'poll', 'auto')
- `options.pollMs` (number, optional): Polling interval in milliseconds. Default: 3000

**Returns:**

- Promise resolving to cleanup function

**Example:**

```javascript
const temperatureSensor = document.querySelector('#temp-display');
const cleanup = await connectProperty(temperatureSensor, {
  baseUrl: 'http://sensor.local/td',
  name: 'temperature',
  strategy: 'observe',
});
```

### connectAction()

Connects a button component to a WoT Thing action.

**Signature:**

```typescript
function connectAction(element: HTMLElement, options: ConnectActionOptions): Promise<void>;
```

**Parameters:**

- `element` (HTMLElement): The button component element
- `options.baseUrl` (string): Thing Description URL
- `options.name` (string): Action name in TD

**Example:**

```javascript
const calibrateBtn = document.querySelector('#calibrate-btn');
await connectAction(calibrateBtn, {
  baseUrl: 'http://sensor.local/td',
  name: 'calibrate',
});
```

### connectEvent()

Connects an event monitoring component to a WoT Thing event.

**Signature:**

```typescript
function connectEvent(element: HTMLElement, options: ConnectEventOptions): Promise<Cleanup>;
```

**Parameters:**

- `element` (HTMLElement): The event component element
- `options.baseUrl` (string): Thing Description URL
- `options.name` (string): Event name in TD

**Returns:**

- Promise resolving to cleanup function

**Example:**

```javascript
const alertMonitor = document.querySelector('#alert-monitor');
const cleanup = await connectEvent(alertMonitor, {
  baseUrl: 'http://device.local/td',
  name: 'alertTriggered',
});
```

## Component APIs

### Input Components

#### ui-toggle

Boolean property control with switch interface.

**Properties:**

- `value` (boolean): Current toggle state
- `label` (string): Display label
- `disabled` (boolean): Disable interaction
- `color` ('primary'|'secondary'|'neutral'): Theme color
- `showStatus` (boolean): Show status indicator
- `showLastUpdated` (boolean): Show timestamp

**Methods:**

```typescript
setValue(value: boolean, options?: { writeOperation?: (value: boolean) => Promise<void> }): Promise<void>
setValueSilent(value: boolean): Promise<void>
getValue(): Promise<boolean>
```

**Events:**

- `uiChange`: Emitted when value changes

**Example:**

```javascript
const toggle = document.querySelector('ui-toggle');
toggle.addEventListener('uiChange', e => {
  console.log('Toggle changed:', e.detail.value);
});
await toggle.setValue(true);
```

#### ui-slider

Numeric property control with range slider interface.

**Properties:**

- `value` (number): Current slider value
- `min` (number): Minimum value. Default: 0
- `max` (number): Maximum value. Default: 100
- `step` (number): Step increment. Default: 1
- `label` (string): Display label
- `disabled` (boolean): Disable interaction

**Methods:**

```typescript
setValue(value: number, options?: { writeOperation?: (value: number) => Promise<void> }): Promise<void>
setValueSilent(value: number): Promise<void>
getValue(): Promise<number>
```

**Example:**

```javascript
const slider = document.querySelector('ui-slider');
await slider.setValue(75, {
  writeOperation: async value => {
    await thing.writeProperty('brightness', value);
  },
});
```

#### ui-color-picker

Color selection with comprehensive format support.

**Properties:**

- `value` (string): Current color value
- `format` ('hex'|'rgb'|'rgba'|'hsl'|'hsla'): Output format. Default: 'hex'
- `label` (string): Display label
- `disabled` (boolean): Disable interaction

**Supported Input Formats:**

- Hex: `#FF0000`, `#f00`, `FF0000`
- RGB: `rgb(255, 0, 0)`, `255, 0, 0`
- HSL: `hsl(0, 100%, 50%)`
- CSS Named Colors: `red`, `blue`, `green`

**Methods:**

```typescript
setValue(value: string, options?: { writeOperation?: (value: string) => Promise<void> }): Promise<void>
setValueSilent(value: string): Promise<void>
getValue(): Promise<string>
```

**Example:**

```javascript
const colorPicker = document.querySelector('ui-color-picker');
await colorPicker.setValue('#ff0000', {
  writeOperation: async color => {
    await thing.writeProperty('ledColor', color);
  },
});
```

#### ui-calendar

Date/time selection with multiple format support.

**Properties:**

- `value` (string): Current date/time value (ISO format)
- `format` ('iso'|'epoch-ms'|'epoch-s'|'unix'|'rfc2822'): Output format
- `dateFormat` (string): Display date pattern. Default: 'dd/MM/yyyy'
- `includeTime` (boolean): Enable time selection
- `timeFormat` ('12'|'24'): Time format. Default: '12'

**Supported Input Formats:**

- ISO 8601: `2023-12-25T14:30:00.000Z`
- Unix Timestamps: `1703510400000` (ms), `1703510400` (s)
- RFC 2822: `Mon, 25 Dec 2023 14:30:00 GMT`
- Custom strings: `12/25/2023`, `25-Dec-2023`

**Methods:**

```typescript
setValue(value: string, options?: { writeOperation?: (value: string) => Promise<void> }): Promise<void>
setValueSilent(value: string): Promise<void>
getValue(): Promise<string>
```

**Example:**

```javascript
const calendar = document.querySelector('ui-calendar');
await calendar.setValue('2023-12-25T14:30:00.000Z', {
  writeOperation: async dateTime => {
    await thing.writeProperty('scheduledTime', dateTime);
  },
});
```

#### ui-text

String property input/display with editable/readonly modes.

**Properties:**

- `value` (string): Current text value
- `mode` ('editable'|'readonly'): Input mode. Default: 'editable'
- `multiline` (boolean): Enable multiline input
- `debounceMs` (number): Debounce delay for changes. Default: 500
- `label` (string): Display label

**Methods:**

```typescript
setValue(value: string, options?: { writeOperation?: (value: string) => Promise<void> }): Promise<void>
setValueSilent(value: string): Promise<void>
getValue(): Promise<string>
```

### Action Components

#### ui-button

WoT action invocation with status feedback.

**Properties:**

- `label` (string): Button text
- `disabled` (boolean): Disable button
- `variant` ('filled'|'outlined'): Visual style. Default: 'filled'
- `color` ('primary'|'secondary'|'neutral'): Theme color
- `showStatus` (boolean): Show status indicator

**Methods:**

```typescript
setAction(actionHandler: (input?: any) => Promise<any>): Promise<void>
invoke(input?: any): Promise<any>
```

**Events:**

- `uiAction`: Emitted when action is invoked

**Example:**

```javascript
const button = document.querySelector('ui-button');
await button.setAction(async () => {
  return await thing.invokeAction('restart');
});

button.addEventListener('uiAction', e => {
  console.log('Action result:', e.detail.result);
});
```

### Monitoring Components

#### ui-event

WoT event monitoring and display.

**Properties:**

- `label` (string): Display label
- `maxEvents` (number): Maximum events to display. Default: 10
- `showTimestamp` (boolean): Show event timestamps. Default: true
- `autoStart` (boolean): Auto-start listening. Default: false

**Methods:**

```typescript
startListening(): Promise<void>
stopListening(): Promise<void>
addEvent(eventData: any): Promise<void>
clearEvents(): Promise<void>
```

**Events:**

- `uiEvent`: Emitted when new event is received

**Example:**

```javascript
const eventMonitor = document.querySelector('ui-event');

// Manually add events
await eventMonitor.addEvent({
  type: 'temperature_alert',
  value: 85.2,
  timestamp: new Date().toISOString(),
});

// Listen for events
eventMonitor.addEventListener('uiEvent', e => {
  console.log('New event:', e.detail);
});
```

### Complex Data Components

#### ui-object

Complex object properties with dynamic form generation.

**Properties:**

- `value` (object): Current object value
- `schema` (object): JSON Schema for object structure
- `mode` ('editable'|'readonly'): Edit mode. Default: 'editable'
- `label` (string): Display label

**Methods:**

```typescript
setValue(value: object, options?: { writeOperation?: (value: object) => Promise<void> }): Promise<void>
setValueSilent(value: object): Promise<void>
getValue(): Promise<object>
setSchema(schema: object): Promise<void>
```

**Example:**

```javascript
const objectEditor = document.querySelector('ui-object');

// Set schema for dynamic form generation
await objectEditor.setSchema({
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number', minimum: 0, maximum: 150 },
    active: { type: 'boolean' },
  },
});

// Set object value
await objectEditor.setValue({
  name: 'Device Alpha',
  age: 5,
  active: true,
});
```

## Component Lifecycle

### Custom Element Definition

```javascript
// Define individual components
import { defineCustomElement } from '@thingweb/ui-wot-components/components/ui-toggle';
defineCustomElement();

// Wait for component to be defined
await customElements.whenDefined('ui-toggle');
```

### Component Ready State

```javascript
const component = document.querySelector('ui-toggle');

// Wait for component to be fully initialized
await component.componentOnReady();

// Now safe to interact with component
await component.setValue(true);
```

### Component Cleanup

```javascript
// Cleanup individual component connections
const cleanup = await connectProperty(element, options);
cleanup(); // Call to cleanup

// Cleanup all connections
const cleanups = await connectAll(options);
cleanups.forEach(cleanup => cleanup());
```

## Events and Messaging

### Standard Component Events

All components emit a standard `uiChange` event when their value changes:

```javascript
component.addEventListener('uiChange', event => {
  console.log('Component changed:', {
    value: event.detail.value,
    previousValue: event.detail.previousValue,
    timestamp: event.detail.timestamp,
    source: event.detail.source,
  });
});
```

### Action Events

Button components emit `uiAction` events when actions are invoked:

```javascript
button.addEventListener('uiAction', event => {
  console.log('Action invoked:', {
    result: event.detail.result,
    input: event.detail.input,
    duration: event.detail.duration,
  });
});
```

### Event Monitoring

Event components emit `uiEvent` when new WoT events are received:

```javascript
eventMonitor.addEventListener('uiEvent', event => {
  console.log('WoT event received:', {
    eventData: event.detail.eventData,
    eventName: event.detail.eventName,
    timestamp: event.detail.timestamp,
  });
});
```

## Type Definitions

### Core Types

```typescript
type ObserveStrategy = 'observe' | 'poll' | 'auto';
type Cleanup = () => void | Promise<void>;
type ComponentColor = 'primary' | 'secondary' | 'neutral';
type ComponentVariant = 'filled' | 'outlined';

interface UiMsg {
  value: any;
  previousValue?: any;
  timestamp: string;
  source: 'user' | 'wot' | 'system';
}
```

### Service Options

```typescript
interface InitializeWotOptions {
  reuseExisting?: boolean;
}

interface ConnectAllOptions {
  baseUrl: string;
  container?: ParentNode;
}

interface ConnectPropertyOptions {
  baseUrl: string;
  name: string;
  strategy?: ObserveStrategy;
  pollMs?: number;
}

interface ConnectActionOptions {
  baseUrl: string;
  name: string;
}

interface ConnectEventOptions {
  baseUrl: string;
  name: string;
}
```

### Component Base Interface

```typescript
interface UiComponent extends HTMLElement {
  // Component lifecycle
  componentOnReady(): Promise<void>;

  // Value management
  setValue(value: any, options?: SetValueOptions): Promise<void>;
  setValueSilent(value: any): Promise<void>;
  getValue(): Promise<any>;

  // Status and metadata
  showStatus?: boolean;
  showLastUpdated?: boolean;
  disabled?: boolean;
  label?: string;
  color?: ComponentColor;
  dark?: boolean;
}

interface SetValueOptions {
  writeOperation?: (value: any) => Promise<void>;
}
```

### Event Interfaces

```typescript
interface UiChangeEvent extends CustomEvent {
  detail: {
    value: any;
    previousValue?: any;
    timestamp: string;
    source: 'user' | 'wot' | 'system';
  };
}

interface UiActionEvent extends CustomEvent {
  detail: {
    result?: any;
    input?: any;
    duration: number;
    error?: Error;
  };
}

interface UiEventEvent extends CustomEvent {
  detail: {
    eventData: any;
    eventName: string;
    timestamp: string;
  };
}
```

---

For more examples and detailed usage patterns, see the [README.md](README.md) and individual component documentation in the `src/components/` directory.
