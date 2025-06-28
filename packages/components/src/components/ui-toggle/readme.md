# ui-toggle

A customizable toggle switch component with Web of Things (WoT) Thing Description (TD) binding support.

## Features

- **Variants & Theming**: Support for 'default', 'primary', 'secondary', 'accent' variants with CSS variable customization
- **State Management**: Internal state management with controlled/uncontrolled modes
- **Events**: Emits `toggle` event with boolean detail on state changes
- **TD Binding API**: Web of Things integration via `tdProperty` prop
- **Accessibility**: Full ARIA support with `role="switch"`
- **Styling**: Shadow DOM with scoped CSS and lazy loading support

## Usage

### Basic Usage

```html
<ui-toggle></ui-toggle>
<ui-toggle checked></ui-toggle>
<ui-toggle variant="primary"></ui-toggle>
```

### With Event Handling

```javascript
const toggle = document.querySelector('ui-toggle');
toggle.addEventListener('toggle', (event) => {
  console.log('Toggle state:', event.detail); // boolean
});
```

### With TD Binding

```javascript
const tdProperty = {
  name: 'lightSwitch',
  read: async () => {
    // Read current state from IoT device
    return await fetchDeviceState();
  },
  write: async (value) => {
    // Write new state to IoT device
    await updateDeviceState(value);
  }
};

const toggle = document.querySelector('ui-toggle');
toggle.tdProperty = tdProperty;
```

### Custom Theming

```css
ui-toggle {
  --ui-toggle-bg: #f3f4f6;
  --ui-toggle-bg-checked: #10b981;
  --ui-toggle-thumb-bg: #ffffff;
}
```

## Properties

| Property    | Attribute    | Type                                                | Default     | Description |
| ----------- | ------------ | --------------------------------------------------- | ----------- | ----------- |
| `checked`   | `checked`    | `boolean \| undefined`                              | `undefined` | Initial checked state |
| `disabled`  | `disabled`   | `boolean`                                           | `false`     | Disabled state |
| `tdProperty`| --           | `TDProperty \| undefined`                           | `undefined` | TD property binding |
| `value`     | `value`      | `boolean \| undefined`                              | `undefined` | Initial value (alias for checked) |
| `variant`   | `variant`    | `"accent" \| "default" \| "primary" \| "secondary"` | `"default"` | Variant style |

## Events

| Event    | Type                      | Description |
| -------- | ------------------------- | ----------- |
| `toggle` | `CustomEvent<boolean>`    | Emitted when toggle state changes |

## CSS Custom Properties

| Property                          | Default    | Description |
| --------------------------------- | ---------- | ----------- |
| `--ui-toggle-bg`                  | `#e5e7eb`  | Background color (unchecked) |
| `--ui-toggle-bg-checked`          | `#3b82f6`  | Background color (checked) |
| `--ui-toggle-thumb-bg`            | `#ffffff`  | Thumb background color |
| `--ui-toggle-border`              | `transparent` | Border color |
| `--ui-toggle-shadow`              | `0 2px 4px rgba(0, 0, 0, 0.1)` | Box shadow |
| `--ui-toggle-width`               | `48px`     | Toggle width |
| `--ui-toggle-height`              | `24px`     | Toggle height |
| `--ui-toggle-thumb-size`          | `20px`     | Thumb size |
| `--ui-toggle-transition`          | `all 0.2s ease-in-out` | Transition |

## TD Property Interface

```typescript
interface TDProperty {
  name: string;
  read?: () => Promise<boolean> | boolean;
  write?: (value: boolean) => Promise<void> | void;
}
```
