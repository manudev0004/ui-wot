# WoT Dynamic UI Generator

A React-based application that dynamically generates user interfaces from Web of Things (WoT) Thing Descriptions (TD).

## Features

- **TD Input**: Load Thing Descriptions from URLs or files (JSON/JSON-LD)
- **Affordance Selection**: Choose which properties, actions, and events to include
- **Dynamic Component Generation**: Automatically maps TD affordances to appropriate UI components
- **Drag & Drop Canvas**: Arrange, resize, and configure components
- **Component Variants**: Switch between different visual styles for each component
- **Real-time Interaction**: Mock WoT interactions for testing and demonstration

## Available UI Components

The application uses the following Stencil components from the `@thingweb/ui-wot-components` package:

- **ui-button**: For actions
- **ui-toggle**: For boolean properties
- **ui-slider**: For numeric properties with min/max ranges
- **ui-number-picker**: For numeric properties
- **ui-text**: For string properties and general text
- **ui-calendar**: For date/time properties
- **ui-checkbox**: For boolean selections
- **ui-heading**: For titles and headers

## Component Mapping Logic

The application automatically suggests appropriate components based on TD schemas:

### Properties
- `boolean` → `ui-toggle`
- `number/integer` with min/max → `ui-slider`
- `number/integer` without range → `ui-number-picker`
- `string` with date format → `ui-calendar`
- `string` (default) → `ui-text`

### Actions
- All actions → `ui-button`

### Events
- All events → `ui-text` (for displaying event data)

## Usage Flow

1. **Home Page**: Click the "+" button to start
2. **TD Input**: 
   - Enter a TD URL or 
   - Drag & drop a TD file (JSON/JSON-LD)
3. **Affordance Selection**: 
   - Review parsed affordances
   - Select which ones to include in the UI
   - See suggested component types
4. **Component Canvas**: 
   - Drag components around
   - Resize components
   - Edit component variants
   - Remove unwanted components
   - Start over with "New TD"

## Sample Thing Description

A sample TD is included at `/public/sample-td.json` for testing. You can use this URL in the TD input:
```
http://localhost:5173/sample-td.json
```

## Development

### Dependencies Used

- **@node-wot/browser-bundle**: WoT runtime for browsers
- **react-router-dom**: Routing between application views
- **react-grid-layout**: Drag and drop grid layout system
- **react-dropzone**: File upload with drag & drop
- **wot-thing-description-types**: TypeScript types for TD

### Project Structure

```
src/
├── components/          # Reusable React components (if any)
├── context/            # React Context for state management
├── pages/              # Main application pages
├── services/           # WoT service and TD parsing
├── types/              # TypeScript type definitions
├── App.tsx             # Main application component
└── main.tsx            # Application entry point
```

### Running the Application

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` to use the application.

### Building for Production

```bash
npm run build
```

## Notes

- The current implementation uses mock WoT interactions for demonstration
- In a production environment, you would replace the mock WoT service with actual node-wot bindings
- Component variants can be extended by modifying the `getAvailableVariants` method in `wotService.ts`
- The grid layout is responsive and adapts to different screen sizes
