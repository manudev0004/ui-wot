# 🎛️ UI Components Detailed Guide

## Table of Contents
1. [Overview](#overview)
2. [UI Slider Component](#ui-slider-component)
3. [UI Toggle Component](#ui-toggle-component)
4. [Error Handling & Edge Cases](#error-handling--edge-cases)
5. [Performance Considerations](#performance-considerations)
6. [Accessibility Features](#accessibility-features)
7. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides a comprehensive explanation of the UI Slider and UI Toggle components, built with Stencil.js for Web of Things (WoT) applications. Both components support Web of Things Thing Description (TD) binding, accessibility, theming, and multiple variants.

### Core Technologies
- **Stencil.js**: Web component compiler
- **TypeScript**: Type-safe JavaScript
- **CSS Custom Properties**: For theming
- **Web of Things**: IoT device integration
- **Shadow DOM**: Encapsulated styling

---

## 🎚️ UI Slider Component

### Component Architecture

```tsx
@Component({
  tag: 'ui-slider',
  styleUrl: 'ui-slider.css',
  shadow: true,
})
```

**Explanation:**
- `tag: 'ui-slider'`: Creates a custom HTML element `<ui-slider>`
- `styleUrl`: Links the CSS file for styling
- `shadow: true`: Enables Shadow DOM for style encapsulation

### Properties (Props) Explained

#### Core Props
```tsx
@Prop() variant: 'default' | 'primary' | 'secondary' | 'accent' = 'default';
```
**Purpose**: Defines visual style variants
**Child Terms**: Like choosing different themes for your slider (blue, gray, orange)
**Technical**: Uses union types for type safety, prevents invalid variant names

```tsx
@Prop() value?: number;
@Prop() min: number = 0;
@Prop() max: number = 100;
@Prop() step: number = 1;
```
**Purpose**: Control the slider's numeric behavior
**Child Terms**: 
- `value`: Current position of the slider (like volume level)
- `min/max`: Lowest and highest numbers you can pick
- `step`: How much it jumps each time (like 1, 2, 3 or 5, 10, 15)

#### Web of Things Integration
```tsx
@Prop() tdProperty?: TDSliderProperty;

export interface TDSliderProperty {
  name: string;
  read?: () => Promise<number> | number;
  write?: (value: number) => Promise<void> | void;
}
```
**Purpose**: Connects slider to IoT devices
**Child Terms**: Like connecting your slider to a smart thermostat
**Technical**: 
- `read()`: Gets current value from device
- `write()`: Sends new value to device
- Optional methods (?) for flexible implementation

### State Management

```tsx
@State() currentValue: number = 0;
@State() isDragging: boolean = false;
```
**Purpose**: Internal component state
**Child Terms**: Like the slider's memory of where it is and if someone is moving it
**Technical**: `@State()` triggers re-renders when values change

### Event Handling

#### Mouse/Touch Events
```tsx
private handleMouseDown = (event: MouseEvent) => {
  if (this.disabled) return;
  
  event.preventDefault();
  this.isDragging = true;
  
  const newValue = this.getValueFromPosition(event.clientX);
  this.updateValue(newValue);

  document.addEventListener('mousemove', this.handleMouseMove);
  document.addEventListener('mouseup', this.handleMouseUp);
};
```

**Detailed Breakdown:**

1. **Disabled Check**: `if (this.disabled) return;`
   - **Purpose**: Prevents interaction when disabled
   - **Child Terms**: Like a broken button that doesn't work

2. **Prevent Default**: `event.preventDefault();`
   - **Purpose**: Stops browser's default behavior (like text selection)
   - **Technical**: Prevents unwanted side effects during drag

3. **State Update**: `this.isDragging = true;`
   - **Purpose**: Tracks that user is currently dragging
   - **Child Terms**: Like remembering "someone is moving the slider"

4. **Position Calculation**: `const newValue = this.getValueFromPosition(event.clientX);`
   - **Purpose**: Converts mouse position to slider value
   - **Technical**: `clientX` is horizontal mouse position in pixels

5. **Global Event Listeners**:
   ```tsx
   document.addEventListener('mousemove', this.handleMouseMove);
   document.addEventListener('mouseup', this.handleMouseUp);
   ```
   - **Purpose**: Track mouse movement outside the slider
   - **Child Terms**: Like following your finger even if it goes outside the slider
   - **Technical**: Attached to document to capture events anywhere on page

#### Position to Value Conversion
```tsx
private getValueFromPosition(clientX: number): number {
  if (!this.sliderRef) return this.currentValue;

  const rect = this.sliderRef.getBoundingClientRect();
  const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return this.min + (this.max - this.min) * percentage;
}
```

**Mathematical Breakdown:**

1. **Null Check**: `if (!this.sliderRef) return this.currentValue;`
   - **Purpose**: Safety check if slider element doesn't exist
   - **Error Prevention**: Avoids crashes

2. **Element Bounds**: `const rect = this.sliderRef.getBoundingClientRect();`
   - **Purpose**: Gets slider's position and size on screen
   - **Returns**: Object with left, top, width, height properties

3. **Percentage Calculation**: 
   ```tsx
   const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
   ```
   - **Formula**: `(mouse_position - slider_start) / slider_width`
   - **Clamping**: `Math.max(0, Math.min(1, ...))` keeps result between 0 and 1
   - **Child Terms**: Like figuring out what fraction of the slider you clicked

4. **Value Mapping**: 
   ```tsx
   return this.min + (this.max - this.min) * percentage;
   ```
   - **Formula**: `minimum + (maximum - minimum) × percentage`
   - **Example**: If min=0, max=100, percentage=0.5 → 0 + (100-0) × 0.5 = 50

#### Value Clamping and Stepping
```tsx
private clampValue(value: number): number {
  const clamped = Math.max(this.min, Math.min(this.max, value));
  return Math.round(clamped / this.step) * this.step;
}
```

**Step-by-Step Logic:**

1. **Range Clamping**: `Math.max(this.min, Math.min(this.max, value))`
   - **Purpose**: Ensures value stays within min-max bounds
   - **Example**: If min=0, max=100, value=150 → result=100

2. **Step Alignment**: `Math.round(clamped / this.step) * this.step`
   - **Purpose**: Rounds to nearest step increment
   - **Example**: If step=5, value=23 → 23/5=4.6 → round(4.6)=5 → 5×5=25

### Keyboard Navigation
```tsx
private handleKeyDown = (event: KeyboardEvent) => {
  if (this.disabled) return;

  let newValue = this.currentValue;
  const largeStep = (this.max - this.min) / 10;

  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowUp':
      newValue = this.currentValue + this.step;
      break;
    case 'ArrowLeft':
    case 'ArrowDown':
      newValue = this.currentValue - this.step;
      break;
    case 'PageUp':
      newValue = this.currentValue + largeStep;
      break;
    case 'PageDown':
      newValue = this.currentValue - largeStep;
      break;
    case 'Home':
      newValue = this.min;
      break;
    case 'End':
      newValue = this.max;
      break;
    default:
      return; // Don't handle other keys
  }

  event.preventDefault();
  this.updateValue(newValue);
};
```

**Keyboard Controls:**
- **Arrow Keys**: Small increments (±step)
- **Page Up/Down**: Large increments (±10% of range)
- **Home/End**: Jump to minimum/maximum
- **Large Step Calculation**: `(max - min) / 10` creates 10% jumps

### CSS Styling Deep Dive

#### CSS Custom Properties (Variables)
```css
:host {
  --ui-slider-track-color: var(--ui-slider-track-color-default, #e5e7eb);
  --ui-slider-fill-color: var(--ui-slider-fill-color-default, #3b82f6);
  --ui-slider-thumb-color: var(--ui-slider-thumb-color-default, #ffffff);
  --ui-slider-thumb-border: var(--ui-slider-thumb-border-default, 2px solid #3b82f6);
  --ui-slider-shadow: var(--ui-slider-shadow-default, 0 2px 4px rgba(0, 0, 0, 0.1));
}
```

**CSS Variable Syntax Explained:**
- `var(--custom-property, fallback-value)`
- **Purpose**: Allows external theming while providing defaults
- **Child Terms**: Like having backup colors if the main ones aren't set

#### Track Styling
```css
.ui-slider__track {
  position: relative;
  width: 100%;
  height: var(--ui-slider-height);
  background: var(--ui-slider-track-color);
  border-radius: calc(var(--ui-slider-height) / 2);
  overflow: hidden;
}
```

**Property Explanations:**
- `position: relative`: Creates positioning context for child elements
- `border-radius: calc(...)`: Makes perfectly rounded ends (half of height)
- `overflow: hidden`: Clips fill element within track bounds

#### Fill Element
```css
.ui-slider__fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--ui-slider-fill-color);
  border-radius: inherit;
  transition: var(--ui-slider-transition);
}
```

**Dynamic Width**: Set via JavaScript
```tsx
const trackStyle = {
  width: `${percentage}%`,
};
```
**Purpose**: Width changes based on slider value to show progress

#### Thumb Positioning
```css
.ui-slider__thumb {
  position: absolute;
  top: 50%;
  width: var(--ui-slider-thumb-size);
  height: var(--ui-slider-thumb-size);
  background: var(--ui-slider-thumb-color);
  border: var(--ui-slider-thumb-border);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: grab;
}
```

**Transform Explanation:**
- `translate(-50%, -50%)`: Centers thumb on its position
- **Why needed**: Without this, thumb's left edge would be at the position
- **Child Terms**: Like centering a sticker on a line

**Dynamic Position**: Set via JavaScript
```tsx
const thumbStyle = {
  left: `${percentage}%`,
};
```

#### Hover and Drag States
```css
.ui-slider__thumb:hover {
  transform: translate(-50%, -50%) scale(1.1);
}

.ui-slider--dragging .ui-slider__thumb {
  cursor: grabbing;
  transform: translate(-50%, -50%) scale(1.2);
}
```

**Scale Transform**: Makes thumb larger on interaction
- `scale(1.1)`: 10% larger on hover
- `scale(1.2)`: 20% larger when dragging
- **Cursor**: `grab` vs `grabbing` for visual feedback

---

## 🔘 UI Toggle Component

### Component Structure

#### Boolean State Management
```tsx
@State() isChecked: boolean = false;

@Prop() checked?: boolean;
@Prop() value?: boolean;
```

**Dual Property Support:**
- Both `checked` and `value` props for flexibility
- Internal `isChecked` state for component control
- **Child Terms**: Like having two different names for the same thing

#### State Synchronization
```tsx
@Watch('checked')
watchChecked(newValue: boolean | undefined) {
  if (newValue !== undefined) {
    this.isChecked = newValue;
  }
}

@Watch('value')
watchValue(newValue: boolean | undefined) {
  if (newValue !== undefined) {
    this.isChecked = newValue;
  }
}
```

**Watcher Functions:**
- **Purpose**: Keep internal state synchronized with props
- **Undefined Check**: Prevents overwriting with null/undefined values
- **Technical**: Stencil automatically calls these when props change

### Toggle Interaction Logic
```tsx
private async handleToggle() {
  if (this.disabled) return;

  const newValue = !this.isChecked;
  this.isChecked = newValue;

  // Emit toggle event
  this.toggle.emit(newValue);

  // Write to TD property if available
  if (this.tdProperty?.write) {
    try {
      await this.tdProperty.write(newValue);
    } catch (error) {
      console.warn('Failed to write TD property:', error);
      // Revert state on write failure
      this.isChecked = !newValue;
    }
  }
}
```

**Error Handling Logic:**
1. **Optimistic Update**: Change UI immediately
2. **External Write**: Try to update connected device
3. **Error Recovery**: Revert UI if device update fails
4. **User Feedback**: Console warning for debugging

### Variant System

#### Default Variant
```css
.ui-toggle {
  width: var(--ui-toggle-width);
  height: var(--ui-toggle-height);
  background: var(--ui-toggle-bg);
  border-radius: calc(var(--ui-toggle-height) / 2);
}
```
**Design**: Standard iOS-style toggle switch

#### Square Variant
```css
.ui-toggle--square {
  --ui-toggle-width: 50px;
  --ui-toggle-height: 30px;
  background: linear-gradient(145deg, #f0f0f0, #d0d0d0);
  border: 2px solid #c0c0c0;
  border-radius: 6px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}
```
**Design Features:**
- **Linear Gradient**: Creates 3D appearance
- **Inset Shadow**: Gives pressed/recessed look
- **Square Corners**: Different from default rounded style

#### Checkbox Variant
```css
.ui-toggle--checkbox {
  --ui-toggle-width: 32px;
  --ui-toggle-height: 32px;
  background: #ffffff;
  border: 2px solid #d1d5db;
  border-radius: 6px;
}

.ui-toggle--checkbox .ui-toggle__thumb::before {
  content: '✕';
  display: block;
  line-height: 1;
}

.ui-toggle--checkbox.ui-toggle--checked .ui-toggle__thumb::before {
  content: '✓';
}
```
**Icon System:**
- **CSS Content**: Uses `::before` pseudo-element for icons
- **Dynamic Content**: Changes ✕ to ✓ based on state
- **No Movement**: Thumb doesn't slide, only icon changes

#### Apple Variant (Advanced)
```css
.ui-toggle--apple .ui-toggle__track::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #f59e0b;
  border-radius: inherit;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
}

.ui-toggle--apple.ui-toggle--checked .ui-toggle__track::before {
  transform: scaleX(1);
}
```
**Animation Breakdown:**
1. **Pseudo-element**: Creates background fill effect
2. **Transform Origin**: Animation starts from left edge
3. **ScaleX**: Stretches from 0% to 100% width
4. **Smooth Transition**: 0.3s ease animation

#### Rocker Variant (Vertical)
```css
.ui-toggle--rocker {
  --ui-toggle-width: 22px;
  --ui-toggle-height: 44px;
}

.ui-toggle--rocker .ui-toggle__thumb {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 50%;
}

.ui-toggle--rocker.ui-toggle--checked .ui-toggle__thumb {
  top: 50%;
}
```
**Vertical Design:**
- **Dimensions**: Taller than wide (44px × 22px)
- **Thumb Movement**: Top-to-bottom instead of left-to-right
- **Real-world Analogy**: Like a wall light switch

---

## 🚨 Error Handling & Edge Cases

### Input Validation

#### Slider Value Validation
```tsx
private clampValue(value: number): number {
  // Handle NaN values
  if (isNaN(value)) {
    console.warn('Invalid slider value (NaN), using minimum value');
    return this.min;
  }
  
  // Handle infinite values
  if (!isFinite(value)) {
    console.warn('Invalid slider value (infinite), using minimum value');
    return this.min;
  }
  
  const clamped = Math.max(this.min, Math.min(this.max, value));
  return Math.round(clamped / this.step) * this.step;
}
```

#### Prop Validation
```tsx
async componentWillLoad() {
  // Validate min/max relationship
  if (this.min >= this.max) {
    console.error('Slider min value must be less than max value');
    this.max = this.min + 100; // Set reasonable default
  }
  
  // Validate step value
  if (this.step <= 0) {
    console.warn('Slider step must be positive, using default value 1');
    this.step = 1;
  }
  
  // Initialize value
  if (this.value !== undefined) {
    this.currentValue = this.clampValue(this.value);
  } else {
    this.currentValue = this.clampValue(this.min);
  }
}
```

### DOM Safety

#### Element Reference Checks
```tsx
private getValueFromPosition(clientX: number): number {
  if (!this.sliderRef) {
    console.warn('Slider element reference not available');
    return this.currentValue;
  }
  
  const rect = this.sliderRef.getBoundingClientRect();
  
  // Check if element has valid dimensions
  if (rect.width === 0) {
    console.warn('Slider has no width, cannot calculate position');
    return this.currentValue;
  }
  
  const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return this.min + (this.max - this.min) * percentage;
}
```

### Memory Leak Prevention

#### Event Listener Cleanup
```tsx
disconnectedCallback() {
  // Clean up global event listeners
  document.removeEventListener('mousemove', this.handleMouseMove);
  document.removeEventListener('mouseup', this.handleMouseUp);
  document.removeEventListener('touchmove', this.handleTouchMove);
  document.removeEventListener('touchend', this.handleTouchEnd);
}
```

**Why This Matters:**
- **Memory Leaks**: Unremoved listeners keep component in memory
- **Performance**: Reduces unnecessary event processing
- **Browser Support**: Some browsers don't auto-cleanup

### Network Error Handling (WoT Integration)

#### Robust TD Property Operations
```tsx
private async initializeFromTD() {
  if (!this.tdProperty?.read) return;
  
  try {
    const tdValue = await Promise.race([
      this.tdProperty.read(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
    ]);
    
    if (typeof tdValue === 'number' && isFinite(tdValue)) {
      this.currentValue = this.clampValue(tdValue);
    } else {
      console.warn('Invalid TD property value received:', tdValue);
    }
  } catch (error) {
    console.error('Failed to read TD property:', error);
    // Don't update value on read failure
  }
}

private async updateValue(newValue: number) {
  const clampedValue = this.clampValue(newValue);
  
  if (clampedValue === this.currentValue) return;

  // Store previous value for rollback
  const previousValue = this.currentValue;
  this.currentValue = clampedValue;

  // Emit change event immediately (optimistic update)
  this.change.emit(this.currentValue);

  // Attempt TD write with retry logic
  if (this.tdProperty?.write) {
    let retries = 3;
    while (retries > 0) {
      try {
        await this.tdProperty.write(this.currentValue);
        break; // Success, exit retry loop
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error('Failed to write TD property after 3 attempts:', error);
          // Rollback on final failure
          this.currentValue = previousValue;
          this.change.emit(this.currentValue);
        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }
}
```

---

## ⚡ Performance Considerations

### Efficient Event Handling

#### Throttled Updates
```tsx
private lastUpdateTime = 0;
private readonly updateThreshold = 16; // ~60fps

private handleMouseMove = (event: MouseEvent) => {
  if (!this.isDragging) return;
  
  const now = Date.now();
  if (now - this.lastUpdateTime < this.updateThreshold) {
    return; // Skip update to maintain 60fps
  }
  
  this.lastUpdateTime = now;
  const newValue = this.getValueFromPosition(event.clientX);
  this.updateValue(newValue);
};
```

### CSS Performance

#### Hardware Acceleration
```css
.ui-slider__thumb {
  /* Force hardware acceleration */
  transform: translate(-50%, -50%) translateZ(0);
  will-change: transform;
}

.ui-slider--dragging .ui-slider__thumb {
  /* Optimize for dragging */
  will-change: transform;
}
```

#### Efficient Transitions
```css
.ui-slider__fill,
.ui-slider__thumb {
  /* Only animate specific properties */
  transition: transform 0.2s ease-in-out, width 0.2s ease-in-out;
  /* Avoid animating expensive properties like box-shadow */
}
```

---

## ♿ Accessibility Features

### ARIA Implementation

#### Slider ARIA
```tsx
<div
  class={classes}
  role="slider"
  aria-valuemin={this.min}
  aria-valuemax={this.max}
  aria-valuenow={this.currentValue}
  aria-valuetext={this.currentValue.toString()}
  aria-label={this.label || 'Slider'}
  aria-disabled={this.disabled.toString()}
  tabindex={this.disabled ? -1 : 0}
>
```

**ARIA Properties Explained:**
- `role="slider"`: Tells screen readers it's a slider control
- `aria-valuemin/max`: Announces the range
- `aria-valuenow`: Current value
- `aria-valuetext`: Human-readable value (useful for formatted values)
- `aria-label`: Accessible name
- `aria-disabled`: State information
- `tabindex`: Keyboard focusability

#### Toggle ARIA
```tsx
<div
  class={classes}
  role="switch"
  aria-checked={this.isChecked.toString()}
  aria-disabled={this.disabled.toString()}
  tabindex={this.disabled ? -1 : 0}
>
```

### Keyboard Navigation

#### Focus Management
```css
.ui-slider:focus-visible {
  outline: 2px solid var(--ui-slider-fill-color);
  outline-offset: 2px;
  border-radius: 4px;
}
```
**Focus-visible**: Only shows outline when navigating via keyboard

### High Contrast Support
```css
@media (prefers-contrast: high) {
  .ui-slider__track {
    border: 1px solid currentColor;
  }
  
  .ui-slider__thumb {
    border: 3px solid currentColor;
    box-shadow: 0 0 0 1px white inset;
  }
}
```

### Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  .ui-slider__fill,
  .ui-slider__thumb {
    transition: none;
  }
}
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Slider Not Responsive
**Symptoms**: Slider doesn't respond to clicks/drags
**Possible Causes**:
- Element has no width (`display: none`, `width: 0`)
- Z-index issues with overlapping elements
- Event listeners not properly attached

**Debug Steps**:
```tsx
// Add debugging to getBoundingClientRect
const rect = this.sliderRef.getBoundingClientRect();
console.log('Slider dimensions:', rect);

// Check if element is visible
if (rect.width === 0 || rect.height === 0) {
  console.error('Slider element has no dimensions');
}
```

#### 2. Value Jumps Unexpectedly
**Symptoms**: Slider value jumps to unexpected positions
**Possible Causes**:
- Incorrect step calculations
- Race conditions in async updates
- Invalid min/max/step values

**Debug Solution**:
```tsx
private clampValue(value: number): number {
  console.log('Clamping value:', { input: value, min: this.min, max: this.max, step: this.step });
  
  const clamped = Math.max(this.min, Math.min(this.max, value));
  const stepped = Math.round(clamped / this.step) * this.step;
  
  console.log('Clamped result:', { clamped, stepped });
  return stepped;
}
```

#### 3. Memory Leaks
**Symptoms**: Browser gets slower over time
**Cause**: Event listeners not cleaned up
**Solution**: Always implement cleanup
```tsx
disconnectedCallback() {
  // Remove all global listeners
  this.cleanupEventListeners();
}
```

#### 4. WoT Connection Issues
**Symptoms**: Component doesn't sync with devices
**Debug Approach**:
```tsx
private async initializeFromTD() {
  console.log('Attempting TD initialization:', this.tdProperty);
  
  if (!this.tdProperty?.read) {
    console.log('No TD read function available');
    return;
  }
  
  try {
    const tdValue = await this.tdProperty.read();
    console.log('TD value received:', tdValue, typeof tdValue);
    
    if (typeof tdValue === 'number') {
      this.currentValue = this.clampValue(tdValue);
      console.log('TD value applied:', this.currentValue);
    }
  } catch (error) {
    console.error('TD read failed:', error);
  }
}
```

### Performance Debugging

#### Monitor Update Frequency
```tsx
private updateCount = 0;
private lastLog = Date.now();

private updateValue(newValue: number) {
  this.updateCount++;
  
  const now = Date.now();
  if (now - this.lastLog > 1000) {
    console.log(`Updates per second: ${this.updateCount}`);
    this.updateCount = 0;
    this.lastLog = now;
  }
  
  // ... rest of update logic
}
```

#### CSS Performance Monitoring
```css
/* Add to development builds */
.ui-slider__thumb {
  /* Highlight repaints in dev tools */
  outline: 1px solid red;
}
```

### Browser Compatibility

#### Touch Event Support
```tsx
// Feature detection
private supportsTouchEvents(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Conditional event binding
componentDidLoad() {
  if (this.supportsTouchEvents()) {
    this.sliderRef.addEventListener('touchstart', this.handleTouchStart);
  }
}
```

#### CSS Custom Property Fallbacks
```css
:host {
  /* Always provide fallbacks */
  --ui-slider-track-color: var(--ui-slider-track-color-default, #e5e7eb);
  
  /* For older browsers */
  background: #e5e7eb; /* Fallback */
  background: var(--ui-slider-track-color); /* Modern */
}
```

---

## 📚 Best Practices Summary

### Development Guidelines

1. **Always validate inputs** - Check for NaN, infinity, invalid ranges
2. **Handle async operations gracefully** - Use try-catch, timeouts, retries
3. **Clean up resources** - Remove event listeners, clear timeouts
4. **Provide meaningful defaults** - Component should work without configuration
5. **Support accessibility** - ARIA labels, keyboard navigation, high contrast
6. **Performance first** - Throttle updates, use hardware acceleration
7. **Error recovery** - Fail gracefully, provide user feedback
8. **Type safety** - Use TypeScript interfaces for all props and methods

### Testing Considerations

```tsx
// Example unit test structure
describe('UiSlider', () => {
  it('should clamp values within min-max range', () => {
    const slider = new UiSlider();
    slider.min = 0;
    slider.max = 100;
    slider.step = 1;
    
    expect(slider.clampValue(150)).toBe(100);
    expect(slider.clampValue(-50)).toBe(0);
  });
  
  it('should handle invalid step values', () => {
    const slider = new UiSlider();
    slider.step = 0; // Invalid
    
    // Should use default step
    expect(slider.step).toBe(1);
  });
});
```

This comprehensive guide covers all aspects of the UI components. Feel free to reference specific sections when working with these components or troubleshooting issues!
