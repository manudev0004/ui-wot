# UI-WoT Generator

A React-based dashboard generator for Web of Things (WoT) components.

## Features

### Dashboard Management

#### Save Dashboard
- Save your current dashboard configuration including all components, layouts, and Thing Descriptions
- Add a custom name and description for easy identification
- Saved dashboards are stored in browser's local storage

#### Load Dashboard
- Browse and load previously saved dashboards
- Preview dashboard information including component count, TD count, and save date
- One-click loading restores the complete dashboard state

#### Export/Import Dashboard
- **Export**: Download dashboard as JSON file for backup or sharing
- **Import**: Upload JSON dashboard files to restore configurations
- Compatible with dashboards created on different devices/browsers

#### Hide Card Option
- Toggle card wrapper visibility for components
- Show only the component without borders and headers for cleaner layouts
- Configurable per component in the edit panel

### Usage

1. **Creating a Dashboard**: Add Thing Descriptions, select affordances, and configure components
2. **Saving**: Click "Save" button in the header, enter name and optional description
3. **Loading**: Click "Load" button to browse and restore saved dashboards
4. **Importing**: Click "Import" button to upload a dashboard JSON file
5. **Exporting**: In the Load dialog, click "Export" next to any saved dashboard

### Storage

- Dashboards are saved to browser's localStorage
- Each dashboard includes:
  - Component configurations and layouts
  - Thing Description information
  - Available affordances
  - Timestamp and metadata

### File Format

Dashboard files are JSON with the following structure:
```json
{
  "name": "Dashboard Name",
  "description": "Optional description",
  "version": "1.0.0",
  "timestamp": 1693737600000,
  "tdInfos": [...],
  "components": [...],
  "availableAffordances": [...]
}
```