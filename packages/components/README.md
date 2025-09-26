<h1>
  <picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/ui-wot_for_dark_bg.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/ui-wot.svg">
  <img title="ThingWeb ui-wot" alt="Thingweb ui-wot logo" src="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/ui-wot.svg" width="300">
</picture>
</h1>

> Independent Web Components library for building user interfaces for IoT applications using **Web of Things (WoT)**. These components provide ready-to-use UI elements that can interact with Thing Descriptions and WoT-enabled devices.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage Patterns](#usage-patterns)
  - [1. Vanilla HTML with Node-WoT Browser Bundle](#1-vanilla-html-with-node-wot-browser-bundle)
  - [2. Framework Integration (React/Vue/Angular)](#2-framework-integration-reactvueangular)
- [Components Overview](#components-overview)
- [Services](#services)
- [Component Comparison](#component-comparison)
- [Documentation](#documentation)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

## Installation

Clone the repository and build the components:

```bash
git clone https://github.com/eclipse-thingweb/ui-wot.git
cd ui-wot
npm install
cd ui-wot/packages/components
npm run build
```

For vanilla HTML usage, you also need the Node-WoT browser bundle:

```html
<script src="https://cdn.jsdelivr.net/npm/@node-wot/browser-bundle@latest/dist/wot-bundle.min.js"></script>
```

## Quick Start

### Vanilla HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/@node-wot/browser-bundle@latest/dist/wot-bundle.min.js"></script>
    <script type="module" src="./build/ui-wot-components.esm.js"></script>
  </head>
  <body>
    <ui-toggle data-td-property="deviceStatus" label="Device Power" show-status="true"> </ui-toggle>
  </body>
</html>
```

### React/Framework

```jsx
import { defineCustomElement } from '@thingweb/ui-wot-components/components/ui-toggle';
import { initializeWot, connectAll } from '@thingweb/ui-wot-components/services';

// Define custom elements
defineCustomElement();

// Initialize WoT and connect components
useEffect(() => {
  (async () => {
    await customElements.whenDefined('ui-toggle');
    await initializeWot();
    await connectAll({ baseUrl: 'http://localhost:8080/device', container: document });
  })();
}, []);

return <ui-toggle data-td-property="status" label="Status" />;
```

## Usage Patterns

### 1. Vanilla HTML with Node-WoT Browser Bundle

For vanilla HTML applications, you need to include the Node-WoT browser bundle and manually define custom elements.

#### Setup

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- Required: Node-WoT browser bundle for WoT functionality -->
    <script src="https://cdn.jsdelivr.net/npm/@node-wot/browser-bundle@latest/dist/wot-bundle.min.js"></script>
    <!-- Load all components -->
    <script type="module" src="./build/ui-wot-components.esm.js"></script>
  </head>
  <body>
    <!-- Your components will go here -->
  </body>
</html>
```

#### Manual Component Connection

```html
<ui-toggle id="power-toggle" label="Device Power"></ui-toggle>
<ui-slider id="brightness" label="Brightness" min="0" max="100"></ui-slider>
<ui-button id="restart-btn" label="Restart Device"></ui-button>

<script>
  (async () => {
    // Wait for components to be defined
    await Promise.all(['ui-toggle', 'ui-slider', 'ui-button'].map(tag => customElements.whenDefined(tag)));

    // Initialize WoT and consume Thing Description
    const servient = new window.WoT.Core.Servient();
    servient.addClientFactory(new window.WoT.Http.HttpClientFactory());
    const wot = await servient.start();
    const td = await fetch('http://your-device/td').then(r => r.json());
    const thing = await wot.consume(td);

    // Connect components manually - wait for component ready
    const toggle = document.getElementById('power-toggle');
    await toggle.componentOnReady();
    const initialPower = await (await thing.readProperty('power')).value();
    await toggle.setValue(initialPower, {
      writeOperation: async value => await thing.writeProperty('power', value),
    });

    const button = document.getElementById('restart-btn');
    await button.componentOnReady();
    await button.setAction(async () => await thing.invokeAction('restart'));
  })();
</script>
```

#### Automatic Connection (Recommended)

```html
<!-- Use data-td-* attributes for automatic connection -->
<ui-toggle data-td-property="power" data-td-strategy="poll" label="Device Power" show-status="true"> </ui-toggle>

<ui-slider data-td-property="brightness" label="Brightness" min="0" max="100" show-last-updated="true"> </ui-slider>

<ui-button data-td-action="restart" label="Restart Device" show-status="true"> </ui-button>

<script>
  (async () => {
    // Wait for components to be defined
    const tags = ['ui-toggle', 'ui-slider', 'ui-button'];
    await Promise.all(tags.map(tag => customElements.whenDefined(tag)));

    // Initialize WoT and automatically connect all components
    await initializeWot();
    await connectAll({ baseUrl: 'http://your-device/td', container: document });
  })();
</script>
```

### 2. Framework Integration (React/Vue/Angular)

The components work seamlessly with modern frameworks. The library provides both components and services for complete WoT integration.

#### React Example (Complete Setup)

**main.tsx** - Define Custom Elements:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { defineCustomElement as UiToggle } from '@thingweb/ui-wot-components/components/ui-toggle';
import { defineCustomElement as UiSlider } from '@thingweb/ui-wot-components/components/ui-slider';
import { defineCustomElement as UiText } from '@thingweb/ui-wot-components/components/ui-text';
import { defineCustomElement as UiButton } from '@thingweb/ui-wot-components/components/ui-button';
import { defineCustomElement as UiEvent } from '@thingweb/ui-wot-components/components/ui-event';
import { defineCustomElement as UiObject } from '@thingweb/ui-wot-components/components/ui-object';
import App from './App';

UiToggle();
UiSlider();
UiText();
UiButton();
UiEvent();
UiObject();

createRoot(document.getElementById('root')!).render(<App />);
```

**index.html** - Include Node-WoT Bundle:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>UI-WoT React Example</title>
    <!-- Required: Node-WoT browser bundle -->
    <script src="https://cdn.jsdelivr.net/npm/@node-wot/browser-bundle@latest/dist/wot-bundle.min.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**App.tsx** - Use Components with Services:

```tsx
import { useEffect } from 'react';
import { initializeWot, connectAll } from '@thingweb/ui-wot-components/services';

const TD_URL = 'http://localhost:8080/testthing';

export default function App() {
  useEffect(() => {
    (async () => {
      // Wait for custom elements to be defined
      const tags = ['ui-toggle', 'ui-slider', 'ui-text', 'ui-button', 'ui-event', 'ui-object', 'ui-number-picker'];
      await Promise.all(tags.map(t => customElements.whenDefined(t)));

      // Initialize WoT and connect components
      await initializeWot();
      await connectAll({ baseUrl: TD_URL, container: document });
    })();
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '16px auto', padding: 16 }}>
      <h2>UI‑WoT React Demo</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div>
          <label>Toggle (bool)</label>
          <ui-toggle data-td-property="bool" strategy="poll" label="Toggle" show-last-updated="true" show-status="true"></ui-toggle>
        </div>
        <div>
          <label>Observable Status (string, observe)</label>
          <ui-text
            data-td-property="observableStatus"
            data-td-strategy="observe"
            label="Observable Status"
            mode="editable"
            debounce-ms="1000"
            show-last-updated="true"
            show-status="true"
          ></ui-text>
        </div>
        <div>
          <label>Slider (int)</label>
          <ui-slider data-td-property="int" label="Slider" min="0" max="100" step="1" show-last-updated="true" show-status="true"></ui-slider>
        </div>
        <div>
          <label>Action</label>
          <ui-button data-td-action="void-void" label="Invoke"></ui-button>
        </div>
        <div>
          <label>Event (on-bool)</label>
          <ui-event data-td-event="on-bool" label="Events" show-last-updated="true"></ui-event>
        </div>
      </div>
    </div>
  );
}
```

#### Vue.js Example

```vue
<template>
  <div>
    <ui-toggle data-td-property="status" label="Device Status" show-status="true"> </ui-toggle>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { defineCustomElement } from './path/to/ui-wot-components/components/ui-toggle';
import { initializeWot, connectAll } from './path/to/ui-wot-components/services';

// Define custom element
defineCustomElement();

onMounted(async () => {
  // Wait for component to be defined
  await customElements.whenDefined('ui-toggle');
  await initializeWot();
  await connectAll({ baseUrl: 'http://localhost:8080/device' });
});
</script>
```

## Components Overview

UI-WoT Components provides a complete set of Web Components for WoT interactions:

### Input Components

- **`<ui-toggle>`** - Boolean properties (on/off switches)
- **`<ui-slider>`** - Numeric properties with range controls
- **`<ui-number-picker>`** - Precise numeric input with increment/decrement
- **`<ui-text>`** - String properties with editable/readonly modes
- **`<ui-checkbox>`** - Boolean properties with checkbox styling
- **`<ui-color-picker>`** - Color value selection
- **`<ui-file-picker>`** - File upload and selection
- **`<ui-calendar>`** - Date/time selection

### Action Components

- **`<ui-button>`** - WoT action invocation with status feedback

### Monitoring Components

- **`<ui-event>`** - WoT event monitoring and display
- **`<ui-notification>`** - Status notifications and alerts

### Complex Data Components

- **`<ui-object>`** - Complex object properties with dynamic forms

### Generic Components

- **`<ui-heading>`** - Styled headings and labels

Each component supports:

- **Automatic WoT Integration** via `data-td-*` attributes
- **Manual Connection** via component methods
- **Status Indicators** (loading, success, error states)
- **Last Updated Timestamps**
- **Theme Support** (primary, secondary, neutral colors)
- **Dark Mode** compatibility

## Services

The services module provides utilities for WoT integration and component management.

### Core Services

#### `initializeWot()`

Initializes the WoT runtime using the Node-WoT browser bundle. Must be called before using any WoT features.

```javascript
import { initializeWot } from '@thingweb/ui-wot-components/services';

// Initialize WoT runtime
await initializeWot();
```

#### `connectAll(options)`

Automatically discovers and connects all components with `data-td-*` attributes to their corresponding WoT properties, actions, and events.

```javascript
import { connectAll } from '@thingweb/ui-wot-components/services';

// Connect all components to a Thing Description
await connectAll({
  baseUrl: 'http://device.local/td', // Thing Description URL
  container: document, // Container to search for components
  strategy: 'poll', // Default connection strategy
});
```

#### Individual Connection Utilities

For fine-grained control:

```javascript
import { connectProperty, connectAction, connectEvent } from './path/to/ui-wot-components/services';

// Wait for components to be defined before connecting
await customElements.whenDefined('ui-toggle');
await customElements.whenDefined('ui-button');
await customElements.whenDefined('ui-event');

// Connect individual component to specific WoT features
await connectProperty(component, 'temperature', thing);
await connectAction(button, 'restart', thing);
await connectEvent(monitor, 'alert', thing);
```

### How Services Work

The services are built on top of the **Node-WoT browser bundle** and provide:

1. **Automatic Discovery**: Scans the DOM for components with `data-td-*` attributes
2. **Thing Description Consumption**: Fetches and parses Thing Descriptions
3. **Protocol Handling**: Supports HTTP, WebSocket, and other WoT protocols
4. **State Management**: Manages component state synchronization with WoT properties
5. **Event Handling**: Sets up event subscriptions and property observations
6. **Error Handling**: Provides robust error handling and status reporting

**Requirements:**

- Node-WoT browser bundle must be included in the page
- Components must be defined before calling `connectAll()`
- Thing Descriptions must be accessible via HTTP/HTTPS

## Component Comparison

| Feature               | Toggle        | Slider        | Text         | Button  | Event            | Notification   |
| --------------------- | ------------- | ------------- | ------------ | ------- | ---------------- | -------------- |
| **Primary Use**       | Boolean props | Numeric props | String props | Actions | Event monitoring | Status display |
| **Data Types**        | `boolean`     | `number`      | `string`     | N/A     | Any              | Any            |
| **Interaction**       | Click         | Drag/Input    | Type/Edit    | Click   | Read-only        | Read-only      |
| **WoT Property**      | ✅            | ✅            | ✅           | ❌      | ❌               | ❌             |
| **WoT Action**        | ❌            | ❌            | ❌           | ✅      | ❌               | ❌             |
| **WoT Event**         | ❌            | ❌            | ❌           | ❌      | ✅               | ✅             |
| **Status Indicators** | ✅            | ✅            | ✅           | ✅      | ✅               | ✅             |
| **Last Updated**      | ✅            | ✅            | ✅           | ✅      | ✅               | ❌             |
| **Themes**            | ✅            | ✅            | ✅           | ✅      | ✅               | ✅             |
| **Dark Mode**         | ✅            | ✅            | ✅           | ✅      | ✅               | ✅             |

### Supported Data Formats

- **JSON Schema Types**: `boolean`, `number`, `integer`, `string`, `object`, `array`
- **WoT Data Schema**: Full support for WoT Thing Description data schemas
- **Custom Formats**: Date/time, color, file uploads
- **Complex Objects**: Nested objects with dynamic form generation

## Documentation

Comprehensive documentation is available in two formats:

### Component Documentation

Each component has detailed documentation with examples, API reference, and usage patterns:

- **Browse**: [Component Docs](./docs/components/README.md)
- **Individual Components**: Available in `src/components/<component-name>/readme.md`

### Services & Utilities Documentation

TypeDoc-generated API documentation for services and utilities:

- **Browse**: [Services & Utils API](./docs/typedoc/README.md)

### Regenerate Documentation

```bash
npm run docs
```

## Examples

- **[React Integration](../../react-example/)** - Complete React application example
- **[Vanilla HTML](./src/index.html)** - Simple HTML usage examples
- **[Component Showcase](./docs/components/)** - Individual component examples

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Generate documentation
npm run docs
```

## License

This project is licensed under both:

- [Eclipse Public License 2.0](https://www.eclipse.org/legal/epl-2.0/)
- [W3C Software License](https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document)

## Related Projects

- **[Eclipse Thingweb](https://github.com/eclipse-thingweb/thingweb)** - Reference implementation of W3C WoT
- **[Node-WoT](https://github.com/eclipse-thingweb/node-wot)** - JavaScript implementation of W3C WoT
- **[WoT Scripting API](https://w3c.github.io/wot-scripting-api/)** - W3C WoT Scripting API specification
