# 🌐 UI-WoT Components Library

A comprehensive Web of Things (WoT) UI component library built with StencilJS, featuring smart components, WoT services, and declarative property binding.

## 🚀 Features

- **🎛️ Web Components**: Framework-agnostic UI components with shadow DOM isolation
- **📡 WoT Integration**: Native support for W3C Thing Description and WoT protocols  
- **🔗 Smart Binding**: Declarative property binding with HTML attributes or programmatic API
- **📦 Tree Shaking**: Modular imports reduce bundle size by up to 75%
- **🎨 Smart Wrappers**: Property cards with status indicators and capability detection
- **⚡ Event System**: Unified UiMsg event format for consistent component communication
- **🔧 TypeScript**: Full type safety and IntelliSense support

## 📦 Installation

```bash
npm install @thingweb/ui-wot-components
```

## 🌟 Quick Start

### Basic Component Usage

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module" src="https://unpkg.com/@thingweb/ui-wot-components/dist/ui-wot-components/ui-wot-components.esm.js"></script>
</head>
<body>
  <ui-toggle label="Power" value="true"></ui-toggle>
  <ui-slider label="Brightness" value="75" min="0" max="100"></ui-slider>
  <ui-property-card label="Temperature" status="success">
    <ui-text slot="control" value="22.5°C" readonly></ui-text>
  </ui-property-card>
</body>
</html>
```

### Framework Integration

#### React/Next.js
```jsx
import { UiToggle, UiSlider } from '@thingweb/ui-wot-components/components';

function MyComponent() {
  const handleChange = (event) => {
    console.log('Value changed:', event.detail.payload);
  };

  return (
    <div>
      <UiToggle label="Power" onUiChange={handleChange} />
      <UiSlider label="Brightness" min={0} max={100} onUiChange={handleChange} />
    </div>
  );
}
```

#### Vue.js
```vue
<template>
  <div>
    <UiToggle label="Power" @uiChange="handleChange" />
    <UiSlider label="Brightness" :min="0" :max="100" @uiChange="handleChange" />
  </div>
</template>

<script>
import { UiToggle, UiSlider } from '@thingweb/ui-wot-components/components';

export default {
  components: { UiToggle, UiSlider },
  methods: {
    handleChange(event) {
      console.log('Value changed:', event.detail.payload);
    }
  }
}
</script>
```

#### Angular
```typescript
// app.module.ts
import { defineCustomElements } from '@thingweb/ui-wot-components/loader';

defineCustomElements();

// component.html
<ui-toggle label="Power" (uiChange)="handleChange($event)"></ui-toggle>
```

## 🎛️ Available Components

### Core Components
- **`<ui-toggle>`** - Boolean toggle switch
- **`<ui-slider>`** - Range slider input  
- **`<ui-number-picker>`** - Numeric input with increment/decrement
- **`<ui-button>`** - Action button with variants
- **`<ui-text>`** - Text input/display
- **`<ui-checkbox>`** - Checkbox input
- **`<ui-calendar>`** - Date/time picker

### Smart Components  
- **`<ui-property-card>`** - Intelligent wrapper with status, actions, and TD integration

## 📡 WoT Service Integration

### Setting up WoT Service

```typescript
import { WoTService } from '@thingweb/ui-wot-components/services';

const wot = new WoTService({
  baseUrl: 'http://localhost:8080',
  timeout: 5000,
  debug: true
});

// Load Thing Description
await wot.loadThing('myDevice', '/api/things/device1.jsonld');
// or
await wot.loadThing('myDevice', thingDescriptionObject);
```

### Reading/Writing Properties

```typescript
// Read property
const tempMsg = await wot.readProperty('myDevice', 'temperature');
console.log('Temperature:', tempMsg.payload); // 22.5

// Write property
await wot.writeProperty('myDevice', 'brightness', 80);

// Handle errors
try {
  await wot.writeProperty('myDevice', 'readOnlyProp', 100);
} catch (error) {
  console.error('Write failed:', error.message);
}
```

### Observing Properties

```typescript
// Start observation
const unsubscribe = await wot.observeProperty('myDevice', 'temperature', (msg) => {
  if (msg.ok) {
    console.log('New temperature:', msg.payload);
    document.getElementById('temp-display').textContent = `${msg.payload}°C`;
  }
});

// Stop observation later
unsubscribe();
```

## 🔗 Declarative Property Binding

### HTML Attribute Binding

```html
<!-- Simple binding -->
<ui-toggle data-wot-bind="device1.power" data-wot-two-way></ui-toggle>

<!-- With polling interval -->
<ui-slider 
  data-wot-bind="device1.brightness" 
  data-wot-two-way 
  data-wot-interval="1000">
</ui-slider>

<!-- JSON configuration -->
<ui-text data-wot-bind='{
  "thingId": "sensor", 
  "property": "temperature",
  "transform": "value => value + \"°C\""
}'></ui-text>
```

### Programmatic Binding

```typescript
import { createBinder } from '@thingweb/ui-wot-components/services';

const binder = createBinder(wotService);

// Basic binding
const bindingId = await binder.bind({
  thingId: 'device1',
  property: 'temperature',
  target: '#temperature-display',
  observeInterval: 2000
});

// Advanced binding with transforms and validation
await binder.bind({
  thingId: 'thermostat',
  property: 'setpoint',
  target: '#temp-slider',
  targetProperty: 'value',
  twoWay: true,
  transform: celsius => Math.round(celsius),
  transformOut: value => parseFloat(value),
  validate: value => value >= 10 && value <= 30,
  onError: (error, binding) => {
    console.error(`Binding error for ${binding.property}:`, error);
  }
});

// Cleanup
binder.unbind(bindingId);
```

### Batch Binding

```typescript
const bindings = await binder.bindFromConfig({
  power: {
    thingId: 'device1',
    property: 'power',
    target: '#power-toggle',
    twoWay: true
  },
  brightness: {
    thingId: 'device1', 
    property: 'brightness',
    target: '#brightness-slider',
    twoWay: true
  },
  status: {
    thingId: 'device1',
    property: 'status', 
    target: '#status-display',
    transform: status => status.toUpperCase()
  }
});
```

## 🎨 Smart Property Cards

Property cards provide intelligent wrappers with status indicators, action buttons, and automatic TD capability detection:

```html
<ui-property-card
  label="Smart Thermostat"
  description="Room temperature control"
  status="success"
  thing-id="thermostat"
  property-name="temperature"
  has-actions>
  
  <ui-number-picker 
    slot="control" 
    value="22" 
    min="10" 
    max="30"
    data-wot-bind="thermostat.setpoint"
    data-wot-two-way>
  </ui-number-picker>
  
  <ui-button slot="actions" variant="outline" size="sm">
    Schedule
  </ui-button>
</ui-property-card>
```

### Programmatic Property Cards

```typescript
const card = document.createElement('ui-property-card');
card.label = 'Temperature Sensor';
card.status = 'success';
card.thingId = 'sensor1';
card.propertyName = 'temperature';

// Auto-detects capabilities from Thing Description
card.addEventListener('capability-detected', (event) => {
  const { canRead, canWrite, canObserve } = event.detail;
  console.log('Sensor capabilities:', { canRead, canWrite, canObserve });
});
```

## 📊 Event System

All components emit standardized `UiMsg` events:

```typescript
interface UiMsg<T> {
  payload: T;           // The actual value
  prev?: T;            // Previous value (for change events)
  ts: number;          // Timestamp
  source: string;      // Event source identifier  
  ok: boolean;         // Success/error flag
  error?: {            // Error details if ok=false
    code: string;
    message: string;
  };
  meta?: any;          // Additional metadata
}
```

### Listening to Events

```typescript
// Component events
document.addEventListener('uiChange', (event) => {
  const msg = event.detail as UiMsg<any>;
  console.log(`${msg.source} changed:`, msg.payload);
});

// WoT service events  
wotService.addEventListener('propertyRead', (event) => {
  console.log('Property read:', event.detail);
});

wotService.addEventListener('propertyWritten', (event) => {
  console.log('Property written:', event.detail);
});
```

## 📦 Tree Shaking & Bundle Optimization

### Modular Imports (Recommended)

```typescript
// Import only what you need for optimal bundle size
import { UiToggle, UiSlider } from '@thingweb/ui-wot-components/components';
import { WoTService } from '@thingweb/ui-wot-components/services';
import { UiMsg } from '@thingweb/ui-wot-components/utils';
```

### Bundle Size Comparison

| Import Method | Bundle Size | Savings |
|---------------|-------------|---------|
| Full library  | ~180KB      | 0%      |
| Components only | ~45KB     | 75%     |
| Single component | ~15KB    | 92%     |

### Webpack Configuration

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    sideEffects: false, // Enable tree shaking
    usedExports: true
  }
};
```

## 🔧 Advanced Configuration

### Custom WoT Service

```typescript
class CustomWoTService extends WoTService {
  constructor() {
    super({
      customFetch: async (url, options) => {
        // Add authentication headers
        return fetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            'Authorization': 'Bearer ' + getAuthToken()
          }
        });
      },
      timeout: 10000,
      retryAttempts: 5
    });
  }
}
```

### Custom Transforms

```typescript
// Temperature conversion transform
const tempTransform = {
  toDisplay: (celsius) => `${celsius}°C (${Math.round(celsius * 9/5 + 32)}°F)`,
  fromInput: (input) => {
    const match = input.match(/(-?\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }
};

await binder.bind({
  thingId: 'sensor',
  property: 'temperature', 
  target: '#temp-input',
  transform: tempTransform.toDisplay,
  transformOut: tempTransform.fromInput
});
```

## 🧪 Testing

### Component Testing

```typescript
import { newSpecPage } from '@stencil/core/testing';
import { UiToggle } from '../ui-toggle';

describe('ui-toggle', () => {
  it('renders correctly', async () => {
    const page = await newSpecPage({
      components: [UiToggle],
      html: `<ui-toggle label="Test" value="true"></ui-toggle>`
    });
    
    expect(page.root).toEqualHtml(`
      <ui-toggle label="Test" value="true">
        <mock:shadow-root>
          <!-- component content -->
        </mock:shadow-root>
      </ui-toggle>
    `);
  });

  it('emits change events', async () => {
    const page = await newSpecPage({
      components: [UiToggle],
      html: `<ui-toggle></ui-toggle>`
    });

    const spy = jest.fn();
    page.root.addEventListener('uiChange', spy);
    
    await page.root.toggle();
    
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          payload: true,
          ok: true
        })
      })
    );
  });
});
```

### WoT Service Testing

```typescript
import { WoTService } from '@thingweb/ui-wot-components/services';

describe('WoTService', () => {
  let service: WoTService;
  
  beforeEach(() => {
    service = new WoTService({
      customFetch: jest.fn(),
      debug: false
    });
  });

  it('loads thing descriptions', async () => {
    const mockTD = { id: 'test', properties: { temp: { type: 'number' } } };
    
    await service.loadThing('test-thing', mockTD);
    
    const thing = service.getThing('test-thing');
    expect(thing).toBeDefined();
    expect(thing.id).toBe('test-thing');
  });
});
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and add tests
4. Run tests: `npm test`
5. Build: `npm run build`
6. Submit a pull request

## 📄 License

This project is licensed under the EPL-2.0 OR W3C-20150513 License.

## 🔗 Links

- [Web of Things (WoT) at W3C](https://www.w3.org/WoT/)
- [Thing Description Specification](https://www.w3.org/TR/wot-thing-description/)
- [StencilJS Documentation](https://stenciljs.com/)
- [GitHub Repository](https://github.com/eclipse-thingweb/ui-wot)

---

Built with ❤️ by the Eclipse Thingweb community
