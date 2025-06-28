# ui-slider

A customizable range slider component with Web of Things (WoT) Thing Description (TD) binding support.

## Features

- **Variants & Theming**: Support for 'default', 'primary', 'secondary', 'accent' variants with CSS variable customization
- **State Management**: Internal state management with controlled/uncontrolled modes
- **Events**: Emits `change` event with numeric detail on value changes
- **TD Binding API**: Web of Things integration via `tdProperty` prop
- **Accessibility**: Full ARIA support with `role="slider"` and proper aria attributes
- **Interaction**: Mouse, touch, and keyboard support
- **Styling**: Shadow DOM with scoped CSS and lazy loading support

## Usage

### Basic Usage

```html
<ui-slider></ui-slider>
<ui-slider value="50" min="0" max="100"></ui-slider>
<ui-slider variant="primary" step="5"></ui-slider>
```

### With Label and Custom Range

```html
<ui-slider label="Volume" min="0" max="10" step="0.1" value="5"></ui-slider>
```

### With Event Handling

```javascript
const slider = document.querySelector('ui-slider');
slider.addEventListener('change', (event) => {
  console.log('Slider value:', event.detail); // number
});
```

### With TD Binding

```javascript
const tdProperty = {
  name: 'brightness',
  read: async () => {
    // Read current value from IoT device
    return await fetchDeviceBrightness();
  },
  write: async (value) => {
    // Write new value to IoT device
    await updateDeviceBrightness(value);
  }
};

const slider = document.querySelector('ui-slider');
slider.tdProperty = tdProperty;
```

### Custom Theming

```css
ui-slider {
  --ui-slider-track-color: #f3f4f6;
  --ui-slider-fill-color: #10b981;
  --ui-slider-thumb-color: #ffffff;
  --ui-slider-thumb-border: 2px solid #10b981;
}
```

## Properties

| Property     | Attribute    | Type                                                | Default     | Description |
| ------------ | ------------ | --------------------------------------------------- | ----------- | ----------- |
| `disabled`   | `disabled`   | `boolean`                                           | `false`     | Disabled state |
| `label`      | `label`      | `string \| undefined`                               | `undefined` | Label for accessibility |
| `max`        | `max`        | `number`                                            | `100`       | Maximum value |
| `min`        | `min`        | `number`                                            | `0`         | Minimum value |
| `step`       | `step`       | `number`                                            | `1`         | Step increment |
| `tdProperty` | --           | `TDSliderProperty \| undefined`                     | `undefined` | TD property binding |
| `value`      | `value`      | `number \| undefined`                               | `undefined` | Current value |
| `variant`    | `variant`    | `"accent" \| "default" \| "primary" \| "secondary"` | `"default"` | Variant style |

## Events

| Event    | Type                      | Description |
| -------- | ------------------------- | ----------- |
| `change` | `CustomEvent<number>`     | Emitted when slider value changes |

## Keyboard Interaction

| Key                    | Action |
| ---------------------- | ------ |
| `Arrow Right/Up`       | Increase by one step |
| `Arrow Left/Down`      | Decrease by one step |
| `Page Up`              | Increase by 10% of range |
| `Page Down`            | Decrease by 10% of range |
| `Home`                 | Set to minimum value |
| `End`                  | Set to maximum value |

## CSS Custom Properties

| Property                          | Default    | Description |
| --------------------------------- | ---------- | ----------- |
| `--ui-slider-track-color`         | `#e5e7eb`  | Track background color |
| `--ui-slider-fill-color`          | `#3b82f6`  | Fill color |
| `--ui-slider-thumb-color`         | `#ffffff`  | Thumb background color |
| `--ui-slider-thumb-border`        | `2px solid #3b82f6` | Thumb border |
| `--ui-slider-shadow`              | `0 2px 4px rgba(0, 0, 0, 0.1)` | Box shadow |
| `--ui-slider-height`              | `6px`      | Track height |
| `--ui-slider-thumb-size`          | `20px`     | Thumb size |
| `--ui-slider-container-height`    | `40px`     | Container height |
| `--ui-slider-transition`          | `all 0.2s ease-in-out` | Transition |

## TD Property Interface

```typescript
interface TDSliderProperty {
  name: string;
  read?: () => Promise<number> | number;
  write?: (value: number) => Promise<void> | void;
}
```

## Accessibility

The slider component follows WAI-ARIA guidelines:

- Uses `role="slider"`
- Provides `aria-valuemin`, `aria-valuemax`, `aria-valuenow`
- Supports keyboard navigation
- Includes proper focus management
- Respects `prefers-reduced-motion` and `prefers-contrast` settings
