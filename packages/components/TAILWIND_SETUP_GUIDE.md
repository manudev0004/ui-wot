# Tailwind CSS Integration Guide for Stencil Components

This guide provides step-by-step instructions to integrate Tailwind CSS v3 with Stencil components. Follow these exact steps to avoid version conflicts and ensure proper functionality.

## 🚨 Important Notes

- **Use Tailwind CSS v3.4.17 exactly** - v4 has breaking changes and conflicts
- **Avoid mixing v3 and v4 packages** - this causes build failures
- **Use `@stencil-community/postcss`** - the official `@stencil/postcss` is deprecated

## 📦 Step 1: Install Dependencies

```bash
# Navigate to your components directory
cd packages/components

# Install exact versions to avoid conflicts
npm install tailwindcss@3.4.17 @stencil-community/postcss autoprefixer postcss-import --save-dev --save-exact
```

**⚠️ Critical:** Use `--save-exact` to prevent version drift that causes conflicts.

## ⚙️ Step 2: Create Tailwind Configuration

Create `tailwind.config.js` in your components root directory:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## 🔧 Step 3: Configure Stencil PostCSS Integration

Update your `stencil.config.ts`:

```typescript
import { Config } from '@stencil/core';
import { postcss } from '@stencil-community/postcss';
import autoprefixer from 'autoprefixer';

export const config: Config = {
  namespace: 'ui-wot-components', // Your namespace
  plugins: [
    postcss({
      plugins: [
        require("postcss-import"),
        require("tailwindcss")("./tailwind.config.js"),
        autoprefixer()
      ]
    })
  ],
  outputTargets: [
    // ... your existing output targets
  ],
  // ... rest of your config
};
```

## 🎨 Step 4: Add Tailwind Directives to Component CSS Files

For **each component** that uses Tailwind, add these directives at the top of the `.css` file:

```css
/* src/components/your-component/your-component.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Your custom component styles go here */
:host {
  display: block;
}
```

## 📝 Step 5: Create Components with Tailwind Classes

### Example Component Structure

```typescript
// src/components/ui-example/ui-example.tsx
import { Component, Prop, h } from '@stencil/core';

@Component({
  tag: 'ui-example',
  styleUrl: 'ui-example.css',
  shadow: true, // Important for CSS encapsulation
})
export class UiExample {
  @Prop() title: string = 'Example Title';

  render() {
    return (
      <div class="bg-indigo-500 text-white p-6 rounded-lg shadow-lg">
        <h1 class="text-2xl font-bold mb-4">{this.title}</h1>
        <p class="text-indigo-100">This component uses Tailwind CSS!</p>
      </div>
    );
  }
}
```

```css
/* src/components/ui-example/ui-example.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom styles can be added here */
:host {
  display: block;
  margin: 1rem 0;
}
```

## 🔍 Step 6: Verify Installation

### Check Package.json Dependencies

Your `package.json` should include:

```json
{
  "devDependencies": {
    "@stencil-community/postcss": "^2.2.0",
    "@stencil/core": "^4.27.1",
    "autoprefixer": "^10.4.21",
    "postcss-import": "^16.1.1",
    "tailwindcss": "3.4.17"
  }
}
```

### Test Build

```bash
# Build the project
npm run build

# Start development server
npm start
```

### Verify in Browser

- Open `http://localhost:3333`
- Check that Tailwind classes are applied (colors, spacing, fonts)
- Inspect element styles to confirm Tailwind CSS is loaded

## 🐛 Troubleshooting

### Issue: Tailwind Classes Not Working

**Symptoms:** Classes like `text-blue-800`, `font-bold` have no effect

**Solution:**
1. Check you're using exact Tailwind CSS v3.4.17
2. Verify no v4 packages are installed:
   ```bash
   npm list | grep tailwind
   # Should only show: tailwindcss@3.4.17
   ```
3. Remove any conflicting packages:
   ```bash
   npm uninstall @tailwindcss/postcss
   ```

### Issue: PostCSS Plugin Errors

**Error:** `It looks like you're trying to use tailwindcss directly as a PostCSS plugin`

**Solution:**
- Ensure you're using `@stencil-community/postcss` not `@stencil/postcss`
- Use the correct require syntax: `require("tailwindcss")("./tailwind.config.js")`

### Issue: CSS Directives Not Recognized

**Error:** `Unknown at rule @tailwind`

**Solution:** This is normal in the editor. The directives are processed during build time.

## 📁 File Structure Example

```
packages/components/
├── tailwind.config.js
├── stencil.config.ts
├── package.json
└── src/
    ├── components/
    │   ├── ui-example/
    │   │   ├── ui-example.tsx
    │   │   ├── ui-example.css
    │   │   └── readme.md
    │   └── ui-heading/
    │       ├── ui-heading.tsx
    │       ├── ui-heading.css
    │       └── readme.md
    └── index.html
```

## 🎯 Best Practices

### 1. Shadow DOM Components
Always use `shadow: true` for proper style encapsulation:

```typescript
@Component({
  tag: 'my-component',
  styleUrl: 'my-component.css',
  shadow: true, // ← Important!
})
```

### 2. Component-Specific CSS
Each component should have its own CSS file with Tailwind directives:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Component-specific styles */
```

### 3. Utility-First Approach
Prefer Tailwind utility classes over custom CSS:

```typescript
// ✅ Good
<div class="bg-blue-500 text-white p-4 rounded-lg">

// ❌ Avoid
<div class="custom-blue-box">
```

### 4. Responsive Design
Use Tailwind's responsive utilities:

```typescript
<div class="text-sm md:text-base lg:text-lg">
  Responsive text
</div>
```

## 🚀 Quick Setup Script

Save this as `setup-tailwind.sh` for quick setup:

```bash
#!/bin/bash
echo "🚀 Setting up Tailwind CSS for Stencil..."

# Install dependencies
npm install tailwindcss@3.4.17 @stencil-community/postcss autoprefixer postcss-import --save-dev --save-exact

# Create Tailwind config
cat > tailwind.config.js << EOF
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

echo "✅ Tailwind CSS setup complete!"
echo "📝 Next steps:"
echo "1. Update your stencil.config.ts with PostCSS plugin"
echo "2. Add @tailwind directives to component CSS files"
echo "3. Run 'npm run build' to test"
```

## 📚 Additional Resources

- [Tailwind CSS v3 Documentation](https://tailwindcss.com/docs)
- [Stencil Components Guide](https://stenciljs.com/docs/component)
- [Stencil Community PostCSS Plugin](https://github.com/stencil-community/stencil-postcss)

## ✅ Checklist

Before considering setup complete:

- [ ] Tailwind CSS v3.4.17 installed (exact version)
- [ ] No v4 packages installed
- [ ] `@stencil-community/postcss` configured in `stencil.config.ts`
- [ ] `tailwind.config.js` created with correct content paths
- [ ] Components have `@tailwind` directives in CSS files
- [ ] Components use `shadow: true`
- [ ] Build completes successfully
- [ ] Tailwind classes work in browser
- [ ] Development server runs without errors

---

**⚡ Pro Tip:** Keep this guide handy and follow it exactly in other branches to avoid the version conflicts and setup issues we encountered!
