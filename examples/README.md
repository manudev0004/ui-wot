# WoT UI Components - Examples

This directory contains example files showing how to use the WoT UI Components.

## Files

- `index.html` - Full demo with all components and features
- `simple.html` - Minimal example showing basic usage

## Quick Start

Open any HTML file in a web browser. No installation required.

## Usage Options

### Local Build Files
```html
<script type="module" src="./build/ui-wot-components.esm.js"></script>
```

### Basic Example
```html
<!DOCTYPE html>
<html>
<head>
  <script type="module" src="./build/ui-wot-components.esm.js"></script>
</head>
<body>
  <ui-number-picker value="5" label="Count"></ui-number-picker>
  <ui-toggle label="Enable"></ui-toggle>
</body>
</html>
```

## IoT Device Integration

Connect to devices using Thing Description URLs:

```html
<ui-number-picker 
  td-url="http://device.local/temperature"
  protocol="http"
  label="Temperature">
</ui-number-picker>
```

## Custom Callbacks

Handle value changes with custom functions:

```html
<script>
window.myHandler = function(data) {
  console.log('New value:', data.value);
};
</script>

<ui-number-picker on-change="myHandler"></ui-number-picker>
```
<script type="module" src="https://unpkg.com/@thingweb/ui-wot-components@latest/dist/ui-wot-components/ui-wot-components.esm.js"></script>

<!-- Fallback for older browsers -->
<script nomodule src="https://unpkg.com/@thingweb/ui-wot-components@latest/dist/ui-wot-components/ui-wot-components.js"></script>
```

## 🎯 Use Cases

Perfect for:
- **Developers**: Quick component reference and testing
- **Designers**: Visual style guide and design system overview  
- **Stakeholders**: Live demo without technical setup
- **Documentation**: Interactive examples for documentation sites
- **Integration**: Copy-paste code snippets for your projects

## 🔧 Integration Examples

Each component example includes:
- Live interactive component
- Copy-ready HTML code
- JavaScript callback examples
- Thing Description integration patterns

## 📱 Device Testing

The examples include real Thing Description integrations that connect to:
- HTTP REST APIs
- CoAP endpoints
- MQTT brokers

Test with actual IoT devices by updating the `td-url` attributes in the examples.

## 🎨 Customization

All components support:
- **Themes**: Light and dark modes
- **Colors**: Primary, secondary, neutral schemes
- **Variants**: Different visual styles
- **States**: Active, disabled, read-only
- **Constraints**: Min/max values, step increments

## 📖 Documentation

For full API documentation and advanced usage, see the main project README at the repository root.
