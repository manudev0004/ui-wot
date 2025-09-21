# UI-WoT React Integration Demo

This example demonstrates the UI-WoT component library integrated with React, showcasing:

- **Node‑WoT integration in the browser** via a global `WoT` object
- **Tree-shakable WoT services** pattern from `@thingweb/ui-wot-components`
- **Auto-binding using Node‑WoT observe/subscribe**
- **Multiple UI components** connected to Thing properties
- **Real-time synchronization** between UI and WoT devices

## 🚀 Quick Start (Plug & Play)

### 1. Start the TestThing Server

```bash
# In one terminal
cd examples/react-min
node test-thing-server.js
```

This starts a simple WoT Thing server at `http://localhost:8080` with CORS enabled.

### 2. Provide Node‑WoT Browser Bundle

Place a Node‑WoT browser bundle at `public/vendor/wot-bundle.min.js` so `window.WoT` is available:

```bash
cd examples/react-min
mkdir -p public/vendor
# Copy or build a Node‑WoT browser bundle into this path
cp /path/to/wot-bundle.min.js public/vendor/
```

Vite will serve this at `/vendor/wot-bundle.min.js` (imported in `src/App.tsx`).

### 3. Start the React Demo

```bash
# In another terminal
cd examples/react-min
npm run dev
```

Open http://localhost:5173 in your browser.

### 4. Watch the Magic ✨

The React app automatically:

- Connects to the TestThing at localhost:8080
- Demonstrates tree-shakable imports from the component library
- Shows 5 different UI components bound to WoT properties
- Uses Node‑WoT observe/subscribe for real-time updates
- Provides developer controls for testing

## 🧪 What's Demonstrated

### Library Features

- Node‑WoT only auto-connect helpers: `connectAllAuto`, `connectPropertyAuto`, `connectActionAuto`, `connectEventAuto`
- Tree-shakable imports: `@thingweb/ui-wot-components/services`

### Components Showcased

- **ui-toggle** - Boolean property with observe/poll
- **ui-slider** - Numeric property with polling
- **ui-text** - String property with auto-binding
- **ui-button** - Action invocation
- **ui-event** - Event subscription display

### WoT Integration Patterns

- Property reading/writing with automatic type handling
- Action invocation with result display
- Event subscription via Node‑WoT
- Error handling and connection status
- Observe/subscribe (no polling fallback)

## 🛠️ Architecture

```
React App
├── Browser-safe WoT client               (Fetch-based utilities)
├── @thingweb/ui-wot-components          (Web Components + utils)
└── UI Components                         (Web Components via Stencil)
    ├── ui-toggle
    ├── ui-slider
    ├── ui-text
    ├── ui-button
    └── ui-event
```

## 📡 TestThing API

The included test server provides:

**Properties:**

- `enabled` (boolean) - Device enabled state
- `level` (0-100) - Power level percentage
- `name` (string) - Device name

**Actions:**

- `brew` - Start brewing coffee
- `upload-file` - File upload simulation
- `clear-files` - Clear file list
- `convert-color` - Color format conversion

**Events:**

- `on-bool`, `on-int`, etc. (see your TD)

## 🔧 Customization

To connect to your own WoT device:

1. Change `TD_URL` in `src/App.tsx`
2. Update property names in component bindings
3. Modify action handlers as needed

This demo requires a Node‑WoT browser bundle that sets `window.WoT`. Once included, provide a Thing Description URL and the components will auto-connect.

## 📚 Learn More

- [UI-WoT Documentation](../../docs/)
- [Node-WoT API](https://thingweb.io/docs/node-wot/API)
- [W3C WoT Thing Description](https://www.w3.org/TR/wot-thing-description/)
