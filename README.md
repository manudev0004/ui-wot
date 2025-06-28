<h1>
  <picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/ui-wot_for_dark_bg.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/ui-wot.svg">
  <img title="ThingWeb ui-wot" alt="Thingweb ui-wot logo" src="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/ui-wot.svg" width="300">
</picture>
</h1>

> **Build modern, reusable UI components for IoT applications using Web of Things (WoT) standards**

[![Built With Stencil](https://img.shields.io/badge/-Built%20With%20Stencil-16161d.svg?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjIuMSwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA1MTIgNTEyOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI%2BCjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI%2BCgkuc3Qwe2ZpbGw6I0ZGRkZGRjt9Cjwvc3R5bGU%2BCjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00MjQuNywzNzMuOWMwLDM3LjYtNTUuMSw2OC42LTkyLjcsNjguNkgxODAuNGMtMzcuOSwwLTkyLjctMzAuNy05Mi43LTY4LjZ2LTMuNmgzMzYuOVYzNzMuOXoiLz4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTQyNC43LDI5Mi4xSDE4MC40Yy0zNy42LDAtOTIuNy0zMS05Mi43LTY4LjZ2LTMuNkgzMzJjMzcuNiwwLDkyLjcsMzEsOTIuNyw2OC42VjI5Mi4xeiIvPgo8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNDI0LjcsMTQxLjdIODcuN3YtMy42YzAtMzcuNiw1NC44LTY4LjYsOTIuNy02OC42SDMzMmMzNy45LDAsOTIuNywzMC43LDkyLjcsNjguNlYxNDEuN3oiLz4KPC9zdmc%2BCg%3D%3D&colorA=16161d&style=flat-square)](https://stenciljs.com)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0.1-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-EPL%202.0%20%7C%20W3C-blue.svg)](LICENSE.md)

## 🎯 **Purpose & Vision**

**Eclipse ThingWeb UI-WoT** is a comprehensive toolkit for building user interfaces for IoT applications that comply with **W3C Web of Things (WoT)** standards. This project provides:

- ✅ **Framework-agnostic** web components built with StencilJS
- ✅ **Reusable UI patterns** specifically designed for IoT dashboards and device interfaces
- ✅ **Type-safe** TypeScript components with comprehensive testing
- ✅ **Generator tools** for creating UIs from W3C Thing Descriptions
- ✅ **Modern development** workflow with Vite and React integration

## 🚀 **Tech Stack**

### **Core Technologies**

- **[StencilJS](https://stenciljs.com/)** `^4.27.1` - Compile-time framework for building standards-compliant Web Components
- **[React](https://reactjs.org/)** `^18.3.1` - Modern UI library for building interactive interfaces
- **[TypeScript](https://www.typescriptlang.org/)** `~5.6.2` - Type-safe JavaScript with enhanced developer experience
- **[Vite](https://vitejs.dev/)** `^6.0.1` - Fast build tool and development server

### **Development & Testing**

- **[Jest](https://jestjs.io/)** `^29.7.0` - Unit testing framework
- **[Puppeteer](https://pptr.dev/)** `^24.3.0` - E2E testing and browser automation
- **[ESLint](https://eslint.org/)** `^9.15.0` - Code linting and quality assurance

### **Architecture**

- **Monorepo** structure with Yarn/npm workspaces
- **Shadow DOM** encapsulation for component isolation
- **Multiple build targets** (ESM, CJS, UMD) for maximum compatibility
- **Lazy loading** support for optimal performance

## 📦 **Packages**

### **@thingweb/ui-wot-components**

Standalone web components library built with StencilJS that can be used in any framework or vanilla JavaScript application.

### **@thingweb/ui-wot-generator**

React-based showcase and generator application demonstrating component usage and providing tools for creating UIs from Thing Descriptions.

## 🛠️ **Setup & Installation**

### **Prerequisites**

- Node.js >= 18.0.0
- npm >= 9.0.0 or Yarn >= 1.22.0

### **Clone & Install**

```bash
git clone https://github.com/eclipse-thingweb/ui-wot.git
cd ui-wot
npm install
```

### **Development**

```bash
# Start component development server
cd packages/components
npm run start

# Start generator app development server
cd packages/generator
npm run dev
```

### **Build**

```bash
# Build all packages
npm run build

# Build specific package
cd packages/components && npm run build
cd packages/generator && npm run build
```

## 🎯 **Three Ways to Use UI-WoT**

### **1. 🧩 Individual Components**

Use specific components directly in your application without importing the entire library.

#### **Installation**

```bash
npm install @thingweb/ui-wot-components
```

#### **Usage in React**

```tsx
import { defineCustomElements } from "@thingweb/ui-wot-components/loader";
import "@thingweb/ui-wot-components/dist/components/ui-heading";

// Register custom elements
defineCustomElements();

function App() {
  return (
    <div>
      <ui-heading text="My IoT Dashboard"></ui-heading>
    </div>
  );
}
```

#### **Usage in Vanilla HTML/JS**

```html
<!DOCTYPE html>
<html>
  <head>
    <script
      type="module"
      src="https://unpkg.com/@thingweb/ui-wot-components/dist/ui-wot-components/ui-wot-components.esm.js"
    ></script>
  </head>
  <body>
    <ui-heading text="Device Status"></ui-heading>
    <my-component first="Sensor" last="Data"></my-component>
  </body>
</html>
```

#### **Usage in Vue.js**

```vue
<template>
  <div>
    <ui-heading :text="title"></ui-heading>
  </div>
</template>

<script>
import { defineCustomElements } from "@thingweb/ui-wot-components/loader";

export default {
  mounted() {
    defineCustomElements();
  },
  data() {
    return {
      title: "IoT Control Panel",
    };
  },
};
</script>
```

---

### **2. 📚 Component Library**

Import and use the entire component library with helper functions and utilities.

#### **Installation**

```bash
npm install @thingweb/ui-wot-components
```

#### **Full Library Import**

```tsx
import { defineCustomElements } from "@thingweb/ui-wot-components/loader";
import { renderHeading, format } from "@thingweb/ui-wot-components";

// Initialize all components
defineCustomElements();

function IoTDashboard() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Use helper functions
      renderHeading("Smart Home Dashboard", containerRef.current);
    }
  }, []);

  return (
    <div>
      <div ref={containerRef}></div>
      <my-component first="Temperature" middle="Sensor" last="Module" />
    </div>
  );
}
```

#### **Available Components**

- `<ui-heading>` - Customizable heading component for IoT interfaces
- `<my-component>` - Example component showing name formatting
- More components coming soon...

#### **Helper Functions**

```typescript
import { format, renderHeading } from "@thingweb/ui-wot-components";

// Format names/labels
const deviceName = format("Temperature", "Sensor", "v2.1");

// Programmatically render components
renderHeading("Device Status", document.getElementById("header"));
```

---

### **3. 🎛️ UI Generator Dashboard**

Use the React-based generator application as a starting point for building comprehensive IoT dashboards.

#### **Quick Start**

```bash
# Clone the repository
git clone https://github.com/eclipse-thingweb/ui-wot.git
cd ui-wot

# Install dependencies
npm install

# Start the generator dashboard
cd packages/generator
npm run dev
```

#### **Features**

- 🎨 **Component Showcase** - Interactive preview of all available components
- 🔧 **Live Configuration** - Real-time component property editing
- 📱 **Responsive Design** - Mobile-friendly interface layouts
- 🎭 **Theme Support** - Light/dark mode compatibility
- 📊 **Dashboard Templates** - Pre-built layouts for common IoT scenarios

#### **Creating Your Own Dashboard**

```tsx
// packages/generator/src/App.tsx
import { useEffect, useRef } from "react";
import { renderHeading } from "ui-wot-components";
import { defineCustomElements } from "ui-wot-components/loader";
import "./App.css";

function MyIoTDashboard() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    defineCustomElements();
    if (containerRef.current) {
      renderHeading("My Smart Factory Dashboard", containerRef.current);
    }
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div ref={containerRef}></div>
        <p>Real-time monitoring and control</p>
      </header>

      <main className="dashboard-grid">
        <section className="device-status">
          <ui-heading text="Device Status"></ui-heading>
          {/* Add your IoT device components here */}
        </section>

        <section className="sensor-data">
          <ui-heading text="Sensor Readings"></ui-heading>
          {/* Add sensor data visualization */}
        </section>

        <section className="controls">
          <ui-heading text="Device Controls"></ui-heading>
          {/* Add device control components */}
        </section>
      </main>
    </div>
  );
}

export default MyIoTDashboard;
```

#### **Customization**

- Modify `src/App.css` for custom styling
- Add new components to `src/components/`
- Configure build settings in `vite.config.ts`
- Extend TypeScript definitions in `src/custom-elements.d.ts`

## 🧪 **Testing**

```bash
# Run component tests
cd packages/components
npm run test

# Run tests in watch mode
npm run test.watch

# Run E2E tests
npm run test
```

## 📖 **Documentation**

- **[Architecture Guide](./ARCHITECTURE.md)** - Detailed technical architecture
- **[Component Documentation](./packages/components/README.md)** - Component API reference
- **[Generator Guide](./packages/generator/README.md)** - Dashboard generator documentation
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute to the project

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md).

## 📄 **License**

This project is dual-licensed under:

- **[Eclipse Public License 2.0](https://www.eclipse.org/legal/epl-2.0/)**
- **[W3C Software Notice and Document License (2015-05-13)](https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document)**

## 🔐 **Security**

For security vulnerabilities, please see our [Security Policy](./SECURITY.md).

## 🌟 **Acknowledgments**

Part of the [Eclipse ThingWeb](https://thingweb.io/) project, supporting the standardization and implementation of W3C Web of Things specifications.
