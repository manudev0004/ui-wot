# UI Toggle Component - Complete Code Documentation

This document provides a detailed line-by-line explanation of the UI Toggle component, covering both the TypeScript implementation and CSS styling.

## Table of Contents
1. [TypeScript Component (ui-toggle.tsx)](#typescript-component)
2. [CSS Styling (ui-toggle.css)](#css-styling)
3. [Usage Examples](#usage-examples)
4. [Thing Web Integration](#thing-web-integration)

---

## TypeScript Component (ui-toggle.tsx)

### Imports and Interfaces

```typescript
import { Component, Prop, State, Event, EventEmitter, h, Watch } from '@stencil/core';
```
**Explanation:** Imports core Stencil decorators and utilities:
- `Component`: Decorator to define a Stencil component
- `Prop`: Decorator for component properties (inputs)
- `State`: Decorator for internal reactive state
- `Event`: Decorator for custom events
- `EventEmitter`: Class for emitting custom events
- `h`: JSX factory function for creating virtual DOM
- `Watch`: Decorator to watch property changes

```typescript
export interface ThingProperty {
  name: string;
  href: string;
  type?: string;
}
```
**Explanation:** Defines a TypeScript interface for Thing Description properties:
- `name`: Human-readable name of the property
- `href`: URL endpoint for the property
- `type`: Optional data type (e.g., 'boolean')

### Component Declaration

```typescript
@Component({
  tag: 'ui-toggle',
  styleUrl: 'ui-toggle.css',
  shadow: true,
})
```
**Explanation:** Stencil component decorator configuration:
- `tag`: The custom HTML element name (`<ui-toggle>`)
- `styleUrl`: Path to the CSS file for styling
- `shadow`: Enables Shadow DOM encapsulation for style isolation

```typescript
export class UiToggle {
```
**Explanation:** Defines the main component class that will be compiled to a web component.

### Component Properties (@Prop)

```typescript
@Prop() variant: 'circle' | 'square' | 'apple' | 'cross' | 'neon' = 'circle';
```
**Explanation:** Defines the visual variant property:
- `@Prop()`: Makes it a component attribute/property
- Type union restricts to 5 specific variants
- Default value is 'circle'
- Controls the overall appearance and behavior

```typescript
@Prop({ mutable: true }) state: 'default' | 'active' | 'disabled' = 'default';
```
**Explanation:** Defines the toggle state:
- `mutable: true`: Component can internally modify this prop
- Three possible states for different behaviors
- Default is 'default' (inactive/off state)

```typescript
@Prop() theme: 'light' | 'dark' = 'light';
```
**Explanation:** Controls the color theme for different backgrounds:
- Light theme for bright backgrounds
- Dark theme for dark backgrounds
- Affects color calculations and visibility

```typescript
@Prop() color: 'primary' | 'secondary' | 'neutral' = 'primary';
```
**Explanation:** Sets the color scheme:
- `primary`: Teal/green professional color
- `secondary`: Pink/purple accent color  
- `neutral`: Grayscale minimal appearance

```typescript
@Prop() label?: string;
```
**Explanation:** Optional text label:
- `?` makes it optional
- When provided, displays next to toggle
- Clicking label also triggers toggle

```typescript
@Prop() tdUrl?: string;
```
**Explanation:** **NEW PLUG-AND-PLAY FEATURE** - Thing Description URL:
- Optional URL pointing to a Thing Description JSON
- Enables automatic IoT device discovery and connection
- Makes integration as simple as providing a URL

```typescript
@Prop() propertyName: string = 'switch';
```
**Explanation:** Specifies which boolean property to control:
- Default is 'switch' (common IoT property name)
- Can be customized for different devices (e.g., 'power', 'state', 'on')
- Must be a boolean property in the Thing Description

```typescript
@Prop() thingProperty?: ThingProperty;
```
**Explanation:** Legacy property for backward compatibility:
- Marked as deprecated in favor of `td-url`
- Provides manual property configuration
- Will show console warnings when used

### Component State (@State)

```typescript
@State() isActive: boolean = false;
```
**Explanation:** Internal reactive state tracking if toggle is on:
- `@State()`: Causes re-render when changed
- Boolean value for simple on/off tracking
- Updates automatically from props and user interaction

```typescript
@State() thingDescription: any = null;
```
**Explanation:** Cached Thing Description data:
- Stores the fetched TD JSON object
- Used to extract property information
- `any` type for flexibility with different TD structures

```typescript
@State() thingBaseUrl: string = '';
```
**Explanation:** Base URL extracted from TD URL:
- Used to build full URLs for property operations
- Extracted from the protocol and host of the TD URL
- Handles both absolute and relative property URLs

### Custom Events (@Event)

```typescript
@Event() toggle: EventEmitter<{ active: boolean; state: string }>;
```
**Explanation:** Custom event emitted on state changes:
- `@Event()`: Creates a custom DOM event
- Emits an object with both boolean and string state
- Allows parent components to react to changes

### Property Watchers (@Watch)

```typescript
@Watch('tdUrl')
async watchTdUrl() {
  await this.loadThingDescription();
}
```
**Explanation:** Reacts to TD URL changes:
- `@Watch('tdUrl')`: Triggers when tdUrl prop changes
- Automatically reloads Thing Description
- Enables dynamic device switching

```typescript
@Watch('propertyName')
async watchPropertyName() {
  if (this.thingDescription) {
    await this.readFromThing();
  }
}
```
**Explanation:** Reacts to property name changes:
- Only acts if TD is already loaded
- Re-reads current state from new property
- Enables dynamic property switching

```typescript
@Watch('thingProperty')
async watchThingProperty() {
  console.warn('thingProperty is deprecated. Use td-url instead for better integration.');
}
```
**Explanation:** Handles legacy property watching:
- Shows deprecation warning
- Encourages migration to new td-url approach

### Lifecycle Methods

```typescript
async componentWillLoad() {
  this.isActive = this.state === 'active';
  if (this.tdUrl) {
    await this.loadThingDescription();
  }
}
```
**Explanation:** Component initialization before first render:
- Sets initial active state from prop
- Loads Thing Description if TD URL provided
- Ensures component is ready with correct state

### Thing Web Integration Methods

```typescript
private async loadThingDescription() {
  if (!this.tdUrl) return;

  try {
    console.log(`Loading Thing Description from: ${this.tdUrl}`);
    const response = await fetch(this.tdUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch TD: ${response.status} ${response.statusText}`);
    }

    this.thingDescription = await response.json();
    
    // Extract base URL from TD URL (remove any trailing paths)
    const url = new URL(this.tdUrl);
    this.thingBaseUrl = `${url.protocol}//${url.host}`;
    
    console.log(`Thing Description loaded successfully for: ${this.thingDescription.title || 'Unknown Thing'}`);
    console.log(`Base URL: ${this.thingBaseUrl}`);

    // Read initial state
    await this.readFromThing();
  } catch (error) {
    console.error('Failed to load Thing Description:', error);
    console.error(`Make sure the TD URL is accessible: ${this.tdUrl}`);
  }
}
```
**Explanation:** **CORE PLUG-AND-PLAY FUNCTIONALITY**:
- Line 1-2: Guard clause - exit if no TD URL provided
- Line 4-5: Log the loading attempt for debugging
- Line 6-10: Fetch the TD JSON with error handling
- Line 12: Parse JSON response into state
- Line 14-16: Extract base URL for building property URLs
- Line 18-19: Log success with Thing name
- Line 21-22: Automatically read initial state
- Line 23-26: Comprehensive error handling with helpful messages

```typescript
private async readFromThing() {
  if (!this.thingDescription || !this.thingBaseUrl) return;

  try {
    const property = this.thingDescription.properties?.[this.propertyName];
    if (!property) {
      console.warn(`Property '${this.propertyName}' not found in Thing Description`);
      return;
    }

    const form = property.forms?.[0];
    if (!form?.href) {
      console.warn(`No form href found for property '${this.propertyName}'`);
      return;
    }

    // Build full URL for the property
    const propertyUrl = form.href.startsWith('http') 
      ? form.href 
      : `${this.thingBaseUrl}${form.href}`;

    console.log(`Reading from: ${propertyUrl}`);
    const response = await fetch(propertyUrl);
    
    if (response.ok) {
      const value = await response.json();
      const booleanValue = typeof value === 'boolean' ? value : Boolean(value);
      
      this.isActive = booleanValue;
      this.state = booleanValue ? 'active' : 'default';
      console.log(`Read value: ${booleanValue} for property '${this.propertyName}'`);
    }
  } catch (error) {
    console.warn('Failed to read from IoT device:', error);
  }
}
```
**Explanation:** Reads current value from IoT device:
- Line 2: Guard clauses ensure TD and base URL are available
- Line 5: Extract specific property from TD properties object
- Line 6-9: Validate property exists with helpful error message
- Line 11-15: Get the first form (interaction affordance) for the property
- Line 17-20: Build complete URL, handling both absolute and relative URLs
- Line 22-24: Perform HTTP GET request to read current value
- Line 26-31: Parse response, ensure boolean type, update component state
- Line 32-34: Comprehensive error handling

```typescript
private async writeToThing(value: boolean) {
  if (!this.thingDescription || !this.thingBaseUrl) return;

  try {
    const property = this.thingDescription.properties?.[this.propertyName];
    if (!property) {
      console.warn(`Property '${this.propertyName}' not found in Thing Description`);
      return;
    }

    // Look for a writable form (PUT method or no method specified)
    const writeForm = property.forms?.find((form: any) => 
      !form.op || form.op.includes('writeproperty') || form.op.includes('readproperty')
    );

    if (!writeForm?.href) {
      console.warn(`No writable form found for property '${this.propertyName}'`);
      return;
    }

    // Build full URL for writing
    const propertyUrl = writeForm.href.startsWith('http') 
      ? writeForm.href 
      : `${this.thingBaseUrl}${writeForm.href}`;

    console.log(`Writing ${value} to: ${propertyUrl}`);
    
    const response = await fetch(propertyUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(value),
    });

    if (response.ok) {
      console.log(`Successfully wrote ${value} to property '${this.propertyName}'`);
    } else {
      throw new Error(`Write failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.warn('Failed to write to IoT device:', error);
    throw error; // Re-throw to allow caller to handle reversion
  }
}
```
**Explanation:** Writes new value to IoT device:
- Line 2: Guard clauses for required data
- Line 5-9: Extract and validate target property
- Line 12-14: Find writable form supporting 'writeproperty' operation
- Line 16-19: Validate writable form exists
- Line 21-24: Build complete URL for writing
- Line 26: Log write operation for debugging
- Line 28-34: HTTP PUT request with JSON payload
- Line 36-40: Success handling and error throwing for caller

### User Interaction Methods

```typescript
private async handleToggle() {
  if (this.state === 'disabled') return;

  const newActive = !this.isActive;
  this.isActive = newActive;
  this.state = newActive ? 'active' : 'default';

  // Notify listeners of the change
  this.toggle.emit({ 
    active: newActive, 
    state: this.state 
  });

  // Update connected IoT device if TD URL is provided
  if (this.tdUrl && this.thingDescription) {
    try {
      await this.writeToThing(newActive);
    } catch (error) {
      console.warn('Failed to write to IoT device, reverting state:', error);
      // Revert on failure
      this.isActive = !newActive;
      this.state = !newActive ? 'active' : 'default';
    }
  }

  // Legacy support for thingProperty (deprecated)
  if (this.thingProperty) {
    console.warn('thingProperty is deprecated. Please use td-url prop instead.');
  }
}
```
**Explanation:** Handles user clicks and toggles:
- Line 2: Ignore clicks when disabled
- Line 4-6: Toggle state and update internal tracking
- Line 8-12: Emit custom event for external listeners
- Line 14-24: Write to IoT device if connected, with automatic reversion on failure
- Line 26-28: Deprecation warning for old property system

```typescript
private handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    this.handleToggle();
  }
};
```
**Explanation:** Keyboard accessibility:
- Arrow function to preserve 'this' context
- Responds to Space and Enter keys
- Prevents default browser behavior
- Delegates to main toggle handler

### Styling Methods

```typescript
private getToggleClasses() {
  const isDisabled = this.state === 'disabled';
  const isActive = this.state === 'active';
  
  // Size based on variant - Apple variant is bigger for iOS feel
  const baseClasses = this.variant === 'apple' 
    ? 'relative inline-block cursor-pointer transition-all duration-200 ease-in-out w-11 h-7' 
    : 'relative inline-block cursor-pointer transition-all duration-300 ease-in-out w-12 h-6';

  // Shape based on variant - use Tailwind classes
  let shapeClass = 'rounded-full'; // default for circle/neon/cross
  if (this.variant === 'square') shapeClass = 'rounded-md';
  if (this.variant === 'apple') shapeClass = 'rounded-full shadow-inner border-2 border-gray-500';

  // Color scheme based on current state and variant
  let backgroundColorClass = 'bg-neutral-light'; // default inactive state
  
  if (this.color === 'neutral') {
    backgroundColorClass = isActive ? 'bg-gray-500' : 'bg-gray-300';
  } else if (this.variant === 'cross') {
    backgroundColorClass = isActive ? this.getActiveColor() : 'bg-red-500';
  } else if (this.variant === 'apple') {
    backgroundColorClass = isActive ? 'bg-green-500' : 'bg-gray-700';
  } else if (this.variant === 'neon') {
    backgroundColorClass = isActive ? this.getNeonColor() : 'neon-red';
  } else if (isActive) {
    backgroundColorClass = this.getActiveColor();
  }

  const disabledClass = isDisabled ? 'disabled-state' : '';

  return `${baseClasses} ${shapeClass} ${backgroundColorClass} ${disabledClass}`.trim();
}
```
**Explanation:** Builds CSS classes for toggle container:
- Line 2-3: Calculate boolean states for easier logic
- Line 5-8: Set base classes with size variants (Apple is larger)
- Line 10-13: Determine shape based on variant
- Line 15-27: Complex color logic handling all combinations
- Line 29-31: Add disabled styling and combine all classes

```typescript
private getActiveColor(): string {
  switch (this.color) {
    case 'secondary': return 'bg-secondary';
    case 'neutral': return 'bg-gray-500';
    default: return 'bg-primary';
  }
}
```
**Explanation:** Helper method for active state colors:
- Simple switch statement for color mapping
- Returns appropriate CSS class for each color scheme
- Default case handles 'primary' color

```typescript
private getNeonColor(): string {
  return this.color === 'secondary' ? 'neon-secondary' : 'neon-primary';
}
```
**Explanation:** Helper method for neon variant colors:
- Ternary operator for simple binary choice
- Maps to custom neon CSS classes with glow effects

```typescript
private getThumbClasses() {
  const isActive = this.state === 'active';
  
  // Apple variant gets special styling for iOS feel
  if (this.variant === 'apple') {
    const baseClasses = 'absolute w-6 h-6 bg-white transition-all duration-200 ease-in-out shadow-md rounded-full';
    const positionClass = 'top-0 left-0';
    const translateClass = isActive ? 'translate-x-4' : 'translate-x-0';
    return `${baseClasses} ${positionClass} ${translateClass}`;
  }
  
  // Standard styling for other variants
  const baseClasses = 'absolute w-4 h-4 bg-white transition-transform duration-300 ease-in-out shadow-sm';
  
  // Shape based on variant
  const shapeClass = this.variant === 'square' ? 'rounded-sm' : 'rounded-full';
  
  // Position adjustment for neon variant - keep consistent alignment
  let positionClass = 'top-1 left-1'; // consistent position for all variants
  if (this.variant === 'neon') {
    positionClass = isActive ? 'top-0.5 left-0.5' : 'top-0.5 left-1';
  }
  
  const translateClass = isActive ? 'translate-x-6' : 'translate-x-0';
  
  return `${baseClasses} ${shapeClass} ${positionClass} ${translateClass}`;
}
```
**Explanation:** Builds CSS classes for the movable thumb:
- Line 2: State tracking for position
- Line 4-10: Special handling for Apple variant (larger, different positioning)
- Line 12: Base classes for standard variants
- Line 15: Shape variation for square variant
- Line 17-21: Position adjustments, especially for neon variant alignment
- Line 23-25: Translation for movement animation

```typescript
private renderCrossContent() {
  if (this.variant !== 'cross') return null;
  
  const isActive = this.state === 'active';
  
  return (
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
      {!isActive ? (
        // Cross (×) on right when off
        <div class="absolute top-0 right-0 w-6 h-6 flex items-center justify-center">
          <span class="text-white text-xl font-bold">×</span>
        </div>
      ) : (
        // Checkmark (✓) on left when on
        <div class="absolute top-0 left-0 w-6 h-6 flex items-center justify-center">
          <span class="text-white text-lg font-bold">✓</span>
        </div>
      )}
    </div>
  );
}
```
**Explanation:** Renders icons for cross variant:
- Line 2: Early return for other variants
- Line 4: State tracking for icon choice
- Line 6: Container with pointer events disabled (doesn't block clicks)
- Line 8-12: Cross (×) icon positioned on right when inactive
- Line 14-18: Checkmark (✓) icon positioned on left when active

### Render Method

```typescript
render() {
  const toggleClasses = this.getToggleClasses();
  const thumbClasses = this.getThumbClasses();
  const isDisabled = this.state === 'disabled';

  return (
    <div class="inline-flex items-center space-x-3">
      {this.label && (
        <label
          class={`select-none mr-2 ${isDisabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer'}`}
          onClick={() => !isDisabled && this.handleToggle()}
        >
          {this.label}
        </label>
      )}
      <span
        class={toggleClasses}
        role="switch"
        aria-checked={this.state === 'active' ? 'true' : 'false'}
        aria-disabled={isDisabled ? 'true' : 'false'}
        tabindex={isDisabled ? -1 : 0}
        onClick={() => !isDisabled && this.handleToggle()}
        onKeyDown={this.handleKeyDown}
      >
        <span class={thumbClasses}></span>
        {this.renderCrossContent()}
      </span>
    </div>
  );
}
```
**Explanation:** Main render method creating the DOM structure:
- Line 2-4: Calculate CSS classes and state
- Line 6: Container with flexbox layout
- Line 7-15: Optional label with click handling and disabled styling
- Line 16-22: Main toggle element with accessibility attributes
- Line 20: Keyboard support for accessibility
- Line 24-25: Thumb element and cross variant content

---

## CSS Styling (ui-toggle.css)

### Tailwind CSS Imports

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
**Explanation:** Imports Tailwind CSS layers:
- `base`: Reset styles and basic element styles
- `components`: Reusable component classes
- `utilities`: Utility classes for rapid development

### Component Documentation

```css
/**
 * UI Toggle Component Styles
 * Using Tailwind CSS utilities with custom color variables
 */
```
**Explanation:** Documentation header explaining the styling approach.

### Host Element and CSS Variables

```css
:host {
  /* Custom color scheme */
  --color-neutral: #7E807F;
  --color-neutral-light: #CACCCC;
  --color-neutral-dark: #4C4D4C;
  --color-white: #FFFFFF;
  --color-primary: #067362;
  --color-primary-dark: #33b8a4;
  --color-secondary: #B84A91;
  
  display: inline-block;
}
```
**Explanation:** Defines the host element styling:
- `:host`: Targets the custom element itself
- CSS custom properties for consistent theming
- Neutral colors: Gray scale for minimal appearance
- Primary: Teal/green professional color with dark variant
- Secondary: Pink/purple accent color
- `inline-block`: Allows the element to sit inline with text

### Custom Color Utility Classes

```css
/* Custom color utilities using CSS variables */
.bg-neutral-light { background-color: var(--color-neutral-light); }
.bg-neutral { background-color: var(--color-neutral); }
.bg-neutral-dark { background-color: var(--color-neutral-dark); }
.bg-primary { background-color: var(--color-primary); }
.bg-primary-dark { background-color: var(--color-primary-dark); }
.bg-secondary { background-color: var(--color-secondary); }

.text-neutral { color: var(--color-neutral); }
```
**Explanation:** Custom utility classes using CSS variables:
- Background color utilities for each defined color
- Text color utility for neutral text
- Uses `var()` function to reference CSS custom properties
- Provides consistent color application across the component

### Disabled State Styling

```css
/* Disabled state */
.disabled-state { 
  opacity: 0.5; 
  cursor: not-allowed !important;
  pointer-events: none;
}
```
**Explanation:** Styles for disabled toggle state:
- `opacity: 0.5`: Makes element appear faded/inactive
- `cursor: not-allowed`: Shows appropriate cursor on hover
- `pointer-events: none`: Prevents any mouse interactions
- `!important`: Ensures cursor style overrides other styles

### Neon Effect Styling

```css
/* Neon effects */
.neon-primary {
  background-color: var(--color-primary) !important;
  border: 2px solid var(--color-primary) !important;
  box-shadow: 
    0 0 5px rgba(6, 115, 98, 0.6),
    0 0 15px rgba(6, 115, 98, 0.5),
    0 0 25px rgba(6, 115, 98, 0.4),
    0 0 35px rgba(6, 115, 98, 0.2) !important;
  filter: brightness(1.1) saturate(1.2);
}
```
**Explanation:** Creates glowing neon effect for primary color:
- Background and border using primary color
- Multiple box-shadows create layered glow effect
- Each shadow has decreasing opacity for realistic glow
- Filter enhances brightness and saturation
- `!important` ensures neon styles override other classes

```css
.neon-secondary {
  background-color: var(--color-secondary) !important;
  border: 2px solid var(--color-secondary) !important;
  box-shadow: 
    0 0 5px rgba(184, 74, 145, 0.6),
    0 0 15px rgba(184, 74, 145, 0.5),
    0 0 25px rgba(184, 74, 145, 0.4),
    0 0 35px rgba(184, 74, 145, 0.2) !important;
  filter: brightness(1.1) saturate(1.2);
}
```
**Explanation:** Same neon effect pattern but for secondary (pink/purple) color.

```css
.neon-red {
  background-color: #ef4444 !important;
  border: 2px solid #ef4444 !important;
  box-shadow: 
    0 0 5px rgba(239, 68, 68, 0.6),
    0 0 15px rgba(239, 68, 68, 0.5),
    0 0 25px rgba(239, 68, 68, 0.4),
    0 0 35px rgba(239, 68, 68, 0.2) !important;
  filter: brightness(1.1) saturate(1.2);
}
```
**Explanation:** Red neon effect used for "off" state in neon and cross variants.

### Dark Mode Overrides

```css
/* Dark mode overrides */
.dark .bg-neutral-light { background-color: var(--color-neutral-dark); }
.dark .bg-neutral { background-color: var(--color-neutral); }
.dark .bg-neutral-dark { background-color: var(--color-neutral-light); }
.dark .bg-primary { background-color: var(--color-primary-dark); }
```
**Explanation:** Color adjustments for dark theme:
- Inverts neutral light/dark colors for better contrast
- Uses darker primary color variant
- Ensures visibility on dark backgrounds

```css
.dark .neon-primary {
  background-color: var(--color-primary-dark) !important;
  border-color: var(--color-primary-dark) !important;
  box-shadow: 
    0 0 5px rgba(51, 184, 164, 0.7),
    0 0 15px rgba(51, 184, 164, 0.6),
    0 0 25px rgba(51, 184, 164, 0.5),
    0 0 35px rgba(51, 184, 164, 0.3) !important;
  filter: brightness(1.2) saturate(1.3);
}
```
**Explanation:** Dark mode neon primary effect:
- Uses darker primary color variant
- Stronger glow effect (higher opacity values)
- Enhanced brightness and saturation for dark backgrounds

```css
.dark .neon-red {
  background-color: #f87171 !important;
  border-color: #f87171 !important;
  box-shadow: 
    0 0 5px rgba(248, 113, 113, 0.7),
    0 0 15px rgba(248, 113, 113, 0.6),
    0 0 25px rgba(248, 113, 113, 0.5),
    0 0 35px rgba(248, 113, 113, 0.3) !important;
  filter: brightness(1.2) saturate(1.3);
}
```
**Explanation:** Dark mode red neon effect with lighter red color and stronger glow.

---

## Usage Examples

### Basic Usage
```html
<!-- Simple toggle -->
<ui-toggle></ui-toggle>

<!-- With label -->
<ui-toggle label="Enable notifications"></ui-toggle>

<!-- Different variants -->
<ui-toggle variant="apple" color="secondary"></ui-toggle>
<ui-toggle variant="neon" color="primary"></ui-toggle>
```

### Plug-and-Play IoT Integration
```html
<!-- Smart lamp control -->
<ui-toggle 
  td-url="https://plugfest.thingweb.io/smart-lamp" 
  property-name="power"
  label="Smart Lamp"
  variant="neon">
</ui-toggle>

<!-- Local development -->
<ui-toggle 
  td-url="http://localhost:8080/my-device" 
  property-name="switch"
  label="My IoT Device">
</ui-toggle>
```

### Event Handling
```javascript
document.querySelector('ui-toggle').addEventListener('toggle', (event) => {
  console.log('Toggle changed:', event.detail.active);
  console.log('State:', event.detail.state);
});
```

---

## Thing Web Integration

The component automatically handles Thing Web integration when provided with a `td-url`:

1. **Fetches Thing Description** from the provided URL
2. **Parses the TD** to find the specified property
3. **Reads initial state** from the device
4. **Handles user interactions** by writing to the device
5. **Provides error handling** with console logging
6. **Supports both absolute and relative URLs** in Thing Descriptions

### Thing Description Structure Expected
```json
{
  "title": "My Smart Device",
  "properties": {
    "switch": {
      "type": "boolean",
      "forms": [{
        "href": "/properties/switch"
      }]
    }
  }
}
```

The component expects:
- A `properties` object containing the target property
- Each property having a `forms` array with at least one form
- Each form having an `href` for the property endpoint
- The property supporting both read (GET) and write (PUT) operations

This plug-and-play approach makes IoT integration as simple as providing a URL!
