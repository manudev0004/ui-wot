# Simple Guide: Fixing ui-toggle and Building Better Components

This guide explains how to clean up the toggle component and build a better component library that works everywhere.

---

## The Big Picture Problem

The `ui-toggle` component has grown messy. It tries to do too many things:
- Handle network requests to devices
- Manage its own syncing and polling  
- Mirror values to other components
- Support too many visual styles
- Mix up disabled/active/value states

**Solution**: Make components simple and focused. Move complex stuff outside.

---

## What's Wrong with Current Toggle

### Too Many Props (17 total!)
Most of these should go:

❌ **Remove These:**
- `state` - confusing, use `disabled` + `value` instead
- `dark` - use global themes instead
- `reactive` - always sync when value changes
- `debounce` - handle this outside the component
- `keyboard` - always support keyboard (accessibility rule)
- `mode` - move to wrapper components
- `syncInterval` - polling belongs outside
- `tdProperty` / `tdUrl` - device stuff belongs outside
- `debug` - use global debug flag
- `mirror` - replace with better binding system
- `color` - merge with `variant`

✅ **Keep These (6 total):**
- `value` - the actual on/off state
- `disabled` - can't click it
- `readonly` - shows state but can't change it  
- `variant` - visual style (primary, secondary, etc)
- `size` - small, medium, large
- `label` - text next to toggle

### Too Complicated Inside
The component has:
- Multiple event systems
- Complex mirroring logic
- Network request handling
- String parsing for values
- Timer management

**Fix**: Keep only the visual toggle behavior. Everything else moves outside.

---

## Simple New Design

### Clean Props
```html
<ui-toggle 
  value="true"
  disabled
  variant="primary" 
  size="md"
  label="Living Room Light">
</ui-toggle>
```

### One Event Type
Instead of multiple events, use one standard format:
```javascript
// Old way - confusing
toggle.addEventListener('valueChange', ...)
toggle.addEventListener('toggle', ...)

// New way - simple
toggle.addEventListener('valueMsg', (e) => {
  console.log(e.detail.payload); // true/false
  console.log(e.detail.prev);    // previous value
  console.log(e.detail.ts);      // timestamp
})
```

### Simple Methods
```javascript
await toggle.setValue(true);   // set value
const value = await toggle.getValue(); // get value
```

---

## Move Complex Stuff Outside

### Device Communication
**Old**: Toggle talks to devices directly
**New**: Separate helper handles all device communication

```javascript
// New way - one helper for all components
const binder = new DeviceBinder();
binder.bind('#light-toggle', 'http://device/properties/on');
```

### Visual Feedback  
**Old**: Each component handles success/error differently
**New**: Wrapper adds consistent feedback

```html
<ui-property-card property="on" thing-id="light-1">
  <ui-toggle slot="control" value="false"></ui-toggle>
</ui-property-card>
```

### Theming
**Old**: Each component has `dark` prop
**New**: Global theme system

```css
[data-theme="dark"] {
  --ui-bg: #1a1a1a;
  --ui-text: #ffffff;
}
```

---

## Better Architecture (Building Blocks)

### Layer 1: Basic Controls (ui-toggle, ui-slider, etc)
- Only handle user clicks and visual display
- No network requests
- No complex state management
- Small and fast

### Layer 2: Smart Wrappers (ui-property-card, etc)
- Add labels, descriptions, status indicators
- Handle device communication
- Show success/error feedback
- Connect to Thing Descriptions

### Layer 3: Layout & Pages (ui-dashboard, etc)  
- Arrange multiple controls
- Handle routing and navigation
- Manage overall app state

### Layer 4: Automation (ui-rule-builder, etc)
- Create if/then rules
- Schedule actions
- Handle complex workflows

---

## Works Everywhere (Multi-Platform)

### Web (HTML/JavaScript)
```html
<script type="module" src="https://cdn.ui-wot.com/components.js"></script>
<ui-toggle value="true" label="Light"></ui-toggle>
```

### React
```jsx
import { UiToggle } from '@ui-wot/react';
<UiToggle value={true} label="Light" onValueMsg={handleChange} />
```

### Vue
```vue
<ui-toggle :value="true" label="Light" @value-msg="handleChange" />
```

### Angular
```html
<ui-toggle [value]="true" label="Light" (valueMsg)="handleChange($event)"></ui-toggle>
```

### Python (Jupyter)
```python
from ui_wot import Toggle
Toggle(value=True, label="Light").display()
```

---

## Easy Migration Path

### Step 1: Add New Events (Keep Old Ones)
```javascript
// Component emits both old and new events
this.valueChange.emit({value: newValue});  // old
this.valueMsg.emit({payload: newValue, ts: Date.now()}); // new
```

### Step 2: Update Documentation
Show new way, mark old way as deprecated.

### Step 3: Provide Helper Scripts
```javascript
// Auto-convert old props to new props
convertLegacyProps(element);
```

### Step 4: Remove Old Stuff (Later)
After people have time to update, remove deprecated features.

---

## Benefits of This Approach

### For Developers
- Smaller components = faster loading
- Consistent patterns across all components
- Easy to test individual pieces
- Works with any framework

### For Users  
- More reliable (less can break)
- Better accessibility (simpler focus management)
- Consistent look and feel
- Better performance

### For Maintainers
- Less code to maintain per component
- Shared utilities reduce duplication
- Clear separation of concerns
- Easier to add new features

---

## Quick Wins (Do These First)

1. **Add new event format** alongside old events
2. **Remove string parsing** - only accept boolean values
3. **Simplify class generation** - precompute style classes
4. **Remove internal timers** - move debouncing outside
5. **Extract device communication** to separate helper

---

## Example: Before vs After

### Before (Complex)
```html
<ui-toggle 
  td-url="http://device/properties/on"
  state="active"
  dark="true"
  reactive="true"
  debounce="200"
  sync-interval="5000"
  mirror="#other-toggle"
  mode="readwrite"
  debug="true">
</ui-toggle>
```

### After (Simple)
```html
<!-- Simple component -->
<ui-toggle value="true" variant="primary" label="Light"></ui-toggle>

<!-- Smart wrapper (optional) -->
<ui-property-card 
  thing-id="living-room" 
  property="light"
  data-theme="dark">
  <ui-toggle slot="control" value="true" label="Light"></ui-toggle>
</ui-property-card>

<!-- Binding helper (JavaScript) -->
<script>
  binder.connect('#light-toggle', 'http://device/properties/on');
</script>
```

---

## Size Goals

- **Basic toggle**: Under 2KB (tiny!)
- **With feedback**: Under 3KB  
- **Smart wrapper**: Under 5KB
- **Full dashboard**: Under 20KB

Compare to current toggle: probably 8KB+ with all features.

---

## Common Questions

**Q: Won't this break existing code?**
A: We'll keep old features working during transition period.

**Q: Isn't this more complex for simple use cases?**  
A: No - basic usage becomes simpler. Complex features are optional.

**Q: How do I migrate my existing toggles?**
A: Start with new components, gradually update old ones using helper scripts.

**Q: Will performance be better?**
A: Yes - smaller components load faster and use less memory.

---

## Next Steps

1. Create the simplified toggle component
2. Build the device communication helper
3. Create wrapper components for common patterns  
4. Update documentation with examples
5. Test with real applications

The goal is making web components that are simple to use but powerful when combined together.
