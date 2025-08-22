# UI-WoT Components Library

A comprehensive TypeScript library for building Web of Things (WoT) user interfaces with native Eclipse Thingweb node-wot integration and custom fallbacks.

## Features

🔧 **Eclipse Thingweb Integration**: Native support for @node-wot/core with automatic fallback to custom implementation  
🌊 **Tree-Shaking**: Modular exports for optimized bundle sizes  
🔄 **Real-time Observation**: Native WoT property observation with polling fallback  
📦 **Custom Elements**: Ready-to-use UI components for Thing properties  
🎯 **TypeScript First**: Full type safety with comprehensive interfaces  
⚡ **Auto-Binding**: Automatic UI binding to WoT device properties  
🔌 **Protocol Support**: HTTP/HTTPS with extensible protocol bindings  

# Installation

```bash
npm install @thingweb/ui-wot-components @node-wot/core
```

### Optional Dependencies

For enhanced functionality, install additional node-wot protocol bindings:

```bash
# HTTP binding (recommended)
npm install @node-wot/binding-http

# WebSocket binding
npm install @node-wot/binding-websockets
```

## Quick Start

### Basic Usage

```typescript
import { WoTService } from '@thingweb/ui-wot-components';

// Create a WoT service instance
const wotService = new WoTService({ debug: true });

// Consume a Thing Description
await wotService.consumeThing('myDevice', {
  "@context": "https://www.w3.org/2019/wot/td/v1",
  "id": "urn:dev:mydevice",
  "title": "My IoT Device",
  "properties": {
    "temperature": {
      "type": "number",
      "observable": true,
      "forms": [{ "href": "http://device.local/temperature" }]
    }
  }
});

// Read a property
const result = await wotService.readProperty('myDevice', 'temperature');
console.log(`Temperature: ${result.payload}°C`);

// Observe property changes
const stopObserving = await wotService.observeProperty(
  'myDevice', 
  'temperature',
  (msg) => console.log(`New temperature: ${msg.payload}°C`)
);
```

### Tree-Shaking Examples

Import only what you need for optimal bundle size:

```typescript
// Core service only
import { WoTService } from '@thingweb/ui-wot-components/services';

// Specific components
import { UiButton, UiSlider } from '@thingweb/ui-wot-components/components';

// Types only
import type { ThingDescription, ConsumedThing } from '@thingweb/ui-wot-components/types';
```

## Architecture

### Service Layer

The `WoTService` automatically detects and uses node-wot when available, falling back to a custom implementation:

```typescript
const config = {
  debug: true,
  timeout: 10000,
  preferNodeWoT: true // Use node-wot if available
};

const service = new WoTService(config);

// Check what implementation is being used
service.addEventListener('servientReady', (event) => {
  console.log('Using node-wot servient');
});
```

### Auto-Binding

Automatically bind WoT properties to UI elements:

```typescript
import { createBinder } from '@thingweb/ui-wot-components';

const binder = createBinder(wotService);

// Bind property to any element
await binder.bindProperty('myDevice', 'temperature', '#temp-display');

// Bind with custom options
await binder.bindProperty('myDevice', 'brightness', '#brightness-slider', {
  updateInterval: 1000,
  bidirectional: true // Enable writing back to device
});
```

### Custom Elements

Use pre-built WoT-aware components:

```html
<!-- Temperature display -->
<ui-text 
  thing-id="myDevice" 
  property="temperature"
  format="{value}°C">
</ui-text>

<!-- Brightness slider -->
<ui-slider 
  thing-id="myDevice" 
  property="brightness"
  min="0" 
  max="100">
</ui-slider>

<!-- Toggle switch -->
<ui-toggle 
  thing-id="myDevice" 
  property="power">
</ui-toggle>
```

## API Reference

### WoTService

The main service class for WoT device interaction.

#### Constructor

```typescript
new WoTService(config?: WoTServiceConfig)
```

**WoTServiceConfig:**
- `debug?: boolean` - Enable debug logging (default: false)
- `timeout?: number` - Request timeout in ms (default: 10000)
- `maxRetries?: number` - Max retry attempts (default: 3)
- `retryDelay?: number` - Retry delay in ms (default: 1000)
- `preferNodeWoT?: boolean` - Use node-wot if available (default: true)

#### Methods

**consumeThing(thingId: string, tdSource: string | ThingDescription): Promise&lt;ConsumedThing&gt;**

Consume a Thing Description from URL, JSON string, or object.

**readProperty(thingId: string, propertyName: string): Promise&lt;UiMsg&lt;any&gt;&gt;**

Read a property value with metadata.

**writeProperty(thingId: string, propertyName: string, value: any): Promise&lt;UiMsg&lt;any&gt;&gt;**

Write a property value.

**observeProperty(thingId: string, propertyName: string, callback: Function): Promise&lt;() =&gt; void&gt;**

Observe property changes. Returns a function to stop observation.

**invokeAction(thingId: string, actionName: string, params?: any): Promise&lt;UiMsg&lt;any&gt;&gt;**

Invoke a Thing action.

### UiMsg Interface

Standard message format for all operations:

```typescript
interface UiMsg<T> {
  payload: T;              // The actual value
  ts: number;              // Timestamp
  source: string;          // Source identifier
  ok: boolean;             // Success flag
  error?: {                // Error details
    code: string;
    message: string;
  };
  meta: {                  // Operation metadata
    operation: string;
    latency: number;
    thingId: string;
    propertyName?: string;
    implementation: 'node-wot' | 'custom';
  };
}
```

## Examples

### Real-time Dashboard

```typescript
import { WoTService, createBinder } from '@thingweb/ui-wot-components';

class IoTDashboard {
  private wotService = new WoTService({ debug: true });
  private binder = createBinder(this.wotService);

  async init() {
    // Add multiple devices
    await this.wotService.consumeThing('sensor1', 'http://sensor1.local/td');
    await this.wotService.consumeThing('actuator1', 'http://actuator1.local/td');

    // Auto-bind to UI
    await this.binder.bindProperty('sensor1', 'temperature', '#temp1');
    await this.binder.bindProperty('sensor1', 'humidity', '#humidity1');
    await this.binder.bindProperty('actuator1', 'brightness', '#brightness1', {
      bidirectional: true
    });

    // Health monitoring
    setInterval(async () => {
      const health = await this.wotService.getHealthStatus();
      this.updateHealthIndicators(health);
    }, 5000);
  }

  private updateHealthIndicators(health: Record<string, string>) {
    Object.entries(health).forEach(([thingId, status]) => {
      const indicator = document.querySelector(`#${thingId}-status`);
      if (indicator) {
        indicator.className = `status ${status}`;
        indicator.textContent = status;
      }
    });
  }
}

new IoTDashboard().init();
```

### Custom Property Observer

```typescript
import { WoTService } from '@thingweb/ui-wot-components';

class PropertyMonitor {
  private service = new WoTService();
  private observers = new Map<string, () => void>();

  async monitorProperty(thingId: string, property: string, element: HTMLElement) {
    // Stop existing observer
    const key = `${thingId}.${property}`;
    this.observers.get(key)?.();

    // Start new observation
    const stopObserver = await this.service.observeProperty(
      thingId,
      property,
      (msg) => {
        element.textContent = msg.payload;
        element.className = msg.ok ? 'value-success' : 'value-error';
        
        // Add timestamp
        element.setAttribute('data-last-update', new Date(msg.ts).toISOString());
        
        // Log performance
        if (msg.meta?.latency) {
          console.log(`${key} latency: ${msg.meta.latency}ms`);
        }
      }
    );

    this.observers.set(key, stopObserver);
  }

  cleanup() {
    this.observers.forEach(stop => stop());
    this.observers.clear();
  }
}
```

## Component Library

### Available Components

- **ui-button** - Actionable button for WoT actions
- **ui-text** - Text display for property values  
- **ui-heading** - Styled headings with WoT integration
- **ui-toggle** - Boolean property toggle switch
- **ui-slider** - Numeric property range input
- **ui-number-picker** - Numeric property input
- **ui-calendar** - Date/time property picker
- **ui-checkbox** - Boolean property checkbox

### Component Properties

All components support these common attributes:

- `thing-id` - ID of the consumed Thing
- `property` - Property name to bind to
- `readonly` - Make component read-only
- `update-interval` - Observation update interval (ms)

## Browser Support

- Modern browsers with ES2017+ support
- Custom Elements v1
- ES Modules
- TypeScript 4.0+

## Contributing

This library is part of the Eclipse Thingweb project. Contributions welcome!

## License

MIT License - see LICENSE file for details.

## Related Projects

- [Eclipse Thingweb](https://github.com/eclipse-thingweb/node-wot)
- [W3C Web of Things](https://www.w3.org/WoT/)
- [WoT Specification](https://www.w3.org/TR/wot-thing-description/)
