# Tailwind CSS Integration Guide

This guide explains how to use Tailwind CSS with Stencil components in the UI-WOT project.

## Setup Complete ✅

The following setup has already been completed:

1. **Dependencies Installed:**
   ```bash
   npm install tailwindcss @stencil-community/postcss @tailwindcss/postcss autoprefixer postcss-import --save-dev
   ```

2. **Tailwind Configuration:** `tailwind.config.js`
   ```javascript
   module.exports = {
     content: ['./src/**/*.{ts,tsx,html}'],
     theme: {
       extend: {},
     },
     plugins: [],
   }
   ```

3. **Stencil Configuration:** `stencil.config.ts`
   ```typescript
   import { Config } from '@stencil/core';
   import { postcss } from '@stencil-community/postcss';
   import autoprefixer from 'autoprefixer';

   export const config: Config = {
     // ...
     plugins: [
       postcss({
         plugins: [
           require("postcss-import"),
           require("@tailwindcss/postcss"),
           autoprefixer()
         ]
       })
     ],
     // ...
   }
   ```

## Creating Tailwind-Enabled Components

### 1. Component Structure

Each Stencil component that uses Tailwind should include the Tailwind directives in its CSS file:

```css
/* component.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Your custom styles here */
```

### 2. Using Tailwind Classes

In your component's TSX file, use Tailwind utility classes:

```tsx
import { Component, h } from '@stencil/core';

@Component({
  tag: 'my-component',
  styleUrl: 'my-component.css',
  shadow: true, // Important for shadow DOM styling
})
export class MyComponent {
  render() {
    return (
      <div class="bg-blue-500 text-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
        <h1 class="text-xl font-bold mb-2">Hello Tailwind!</h1>
        <p class="text-blue-100">This component uses Tailwind utilities.</p>
      </div>
    );
  }
}
```

## Example Components

### 1. Simple Tailwind Component
- **File:** `src/components/tailwind-component/`
- **Features:** Basic Tailwind utilities, shadow DOM styling
- **Usage:** `<tailwind-component></tailwind-component>`

### 2. Enhanced Heading Component
- **File:** `src/components/ui-heading/`
- **Features:** Combines existing functionality with Tailwind styling
- **Usage:** `<ui-heading text="My Title"></ui-heading>`

### 3. Advanced Card Component
- **File:** `src/components/ui-card/`
- **Features:** Multiple variants, responsive design, hover effects
- **Usage:** 
  ```html
  <ui-card title="Card Title" subtitle="Subtitle" variant="gradient">
    <p>Content goes here</p>
  </ui-card>
  ```

## Best Practices

### 1. Shadow DOM Considerations
- Always include Tailwind directives in component CSS files for shadow DOM components
- Use `shadow: true` in your component decorator for proper style encapsulation

### 2. Utility-First Approach
- Use Tailwind utility classes directly in your JSX
- Create component variants using conditional classes
- Leverage Tailwind's responsive utilities (`sm:`, `md:`, `lg:`, etc.)

### 3. Custom Styles
- Use `@apply` directive for common patterns:
  ```css
  .btn {
    @apply px-4 py-2 rounded-md font-medium transition-colors duration-200;
  }
  ```

### 4. Configuration Customization
- Extend the Tailwind config for project-specific colors, fonts, etc.:
  ```javascript
  module.exports = {
    theme: {
      extend: {
        colors: {
          'brand-blue': '#1e40af',
          'brand-green': '#10b981',
        }
      },
    },
  }
  ```

## Development Workflow

1. **Start Development Server:**
   ```bash
   npm start
   ```

2. **Build for Production:**
   ```bash
   npm run build
   ```

3. **View Components:**
   - Open `http://localhost:3333` to see the component demo
   - The Tailwind section shows all example components

## Troubleshooting

### CSS Errors in Editor
- The `@tailwind` directives may show as errors in your editor - this is normal
- The PostCSS plugin processes these during build time

### Classes Not Working
- Ensure the class names are included in the Tailwind `content` configuration
- Check that the CSS file includes the Tailwind directives
- Verify the component uses `shadow: true` for proper styling

### Build Issues
- Make sure all dependencies are installed
- Check that the Stencil config includes the PostCSS plugin correctly
- Ensure you're using `@tailwindcss/postcss` instead of the old `tailwindcss` plugin

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Stencil Components Documentation](https://stenciljs.com/docs/component)
- [PostCSS Plugin Documentation](https://github.com/stencil-community/stencil-postcss)
