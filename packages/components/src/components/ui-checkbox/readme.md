# ui-checkbox

A checkbox component with various visual styles, consistent with the component family design system.

## Basic Usage

```html
<ui-checkbox label="Accept Terms"></ui-checkbox>
```

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `variant` | `'minimal' \| 'outlined' \| 'filled'` | `'outlined'` | Visual style variant |
| `state` | `'disabled' \| 'default' \| 'active'` | `'default'` | Current state |
| `theme` | `'light' \| 'dark'` | `'light'` | Theme |
| `color` | `'primary' \| 'secondary' \| 'neutral'` | `'primary'` | Color scheme |
| `label` | `string` | - | Text label |
| `checked` | `boolean` | `false` | Whether checked |
| `onChange` | `string` | - | Custom function name to call on change |

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `change` | `{ checked: boolean }` | Emitted when checkbox state changes |

## Examples

### Variants

```html
<ui-checkbox variant="minimal" label="Minimal Style"></ui-checkbox>
<ui-checkbox variant="outlined" label="Outlined Style"></ui-checkbox>
<ui-checkbox variant="filled" label="Filled Style"></ui-checkbox>
```

### Colors

```html
<ui-checkbox color="primary" label="Primary Color"></ui-checkbox>
<ui-checkbox color="secondary" label="Secondary Color"></ui-checkbox>
<ui-checkbox color="neutral" label="Neutral Color"></ui-checkbox>
```

### States

```html
<ui-checkbox state="default" label="Default State"></ui-checkbox>
<ui-checkbox state="active" label="Active State"></ui-checkbox>
<ui-checkbox state="disabled" label="Disabled State"></ui-checkbox>
```

### Custom Handler

```html
<ui-checkbox on-change="handleCheckboxChange" label="Custom Handler"></ui-checkbox>

<script>
window.handleCheckboxChange = function(data) {
  console.log('Checkbox changed:', data.checked);
};
</script>
```

## Accessibility

- Full keyboard navigation support (Space/Enter to toggle)
- ARIA attributes for screen readers
- Focus management
- High contrast support
