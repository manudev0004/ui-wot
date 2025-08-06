# Error Handling and Data Confirmation

This document describes the robust error handling, confirmation, and feedback features implemented across all UI-WoT components.

## Overview

All UI components now include comprehensive error handling for Thing Description (TD) operations with visual feedback, automatic retry mechanisms, and state reversion capabilities.

## Features

### 🛡️ Robust Error Handling

- **Automatic Retry**: Failed operations are automatically retried with exponential backoff (default: 2 retries)
- **Timeout Protection**: All operations timeout after 5 seconds to prevent hanging
- **Network Error Detection**: Distinguishes between network issues, device errors, and invalid responses
- **Graceful Degradation**: Components continue to work locally even when device communication fails

### ✅ Data Confirmation

- **Write Confirmation**: Write operations are confirmed by reading back the value from the device
- **Value Validation**: Received data is validated against expected types (number, boolean, string)
- **State Synchronization**: Component state automatically syncs with confirmed device state

### 🔄 State Management

- **Optimistic Updates**: UI updates immediately for responsive feel
- **Automatic Reversion**: Failed writes automatically revert to previous state
- **Consistent State**: Ensures UI always reflects actual device state

### 📊 Visual Feedback

- **Status Indicators**: Small icons show operation status (loading, success, error)
- **User-Friendly Messages**: Clear error descriptions with actionable information
- **Non-Intrusive**: Status indicators appear only when needed and auto-clear

## Status Indicators

### Icons
- 🔄 **Loading**: Spinning indicator during operations
- ✅ **Success**: Green checkmark for successful operations (auto-clears after 2s)
- ❌ **Error**: Red X for failed operations (auto-clears after 5s)
- ⚠️ **Warning**: Yellow exclamation for warnings

### Positioning
Status indicators appear as small overlays in the top-right corner of interactive components when TD URLs are provided.

## Error Types and Messages

### Network Errors
- **Connection Failed**: "Network connection failed - device may be offline"
- **Timeout**: "Request timeout after 5000ms"
- **DNS/Host**: "Device not found - check the URL"

### HTTP Status Errors
- **400 Bad Request**: "Invalid request - check the data format"
- **401 Unauthorized**: "Authentication required"
- **403 Forbidden**: "Access denied - insufficient permissions"
- **404 Not Found**: "Device not found - check the URL"
- **429 Too Many Requests**: "Too many requests - please wait before trying again"
- **500 Server Error**: "Device error - please try again later"
- **503 Service Unavailable**: "Device temporarily unavailable"

### Data Validation Errors
- **Type Mismatch**: "Expected number but received: string"
- **Invalid Boolean**: "Expected boolean but received: object"
- **Parse Error**: "Invalid JSON response from device"

## Component-Specific Implementation

### UI Slider
```html
<!-- With error handling -->
<ui-slider 
  td-url="http://device.local/properties/brightness"
  min="0" 
  max="100" 
  label="Brightness"
  variant="neon">
</ui-slider>
```

**Features:**
- Slider value reverts if write fails
- Manual input validation and error handling
- Keyboard navigation with error handling
- Visual status indicator during operations

### UI Number Picker
```html
<!-- With error handling -->
<ui-number-picker 
  td-url="http://device.local/properties/volume"
  label="Volume"
  protocol="http"
  mode="readwrite"
  min="0"
  max="100"
  change-handler="myNumberHandler">
</ui-number-picker>
```

**JavaScript Handler:**
```javascript
window.myNumberHandler = function(data) {
  console.log('Number changed:', data.value, 'Label:', data.label);
  // Your custom logic here
};
```

**Features:**
- Increment/decrement operations with automatic revert on failure
- Protocol-specific error handling (HTTP, CoAP, MQTT)
- Read-only mode with status indicators
- Value validation and bounds checking

### UI Button
```html
<!-- Action button with error handling -->
<ui-button 
  td-url="http://device.local/actions/power"
  action-data='{"state": "on"}'
  label="Power On"
  variant="filled"
  click-handler="myClickHandler">
</ui-button>
```

**JavaScript Handler:**
```javascript
window.myClickHandler = function(data) {
  console.log('Button clicked:', data.label);
  // Your custom logic here
};
```

**Features:**
- Action invocation with confirmation
- Flexible payload support (JSON string or primitive values)
- Visual feedback for action success/failure
- Non-blocking error handling

### UI Checkbox
```html
<!-- Checkbox with error handling -->
<ui-checkbox 
  td-url="http://device.local/properties/enabled"
  label="Device Enabled"
  variant="filled"
  change-handler="myCheckboxHandler">
</ui-checkbox>
```

**JavaScript Handler:**
```javascript
window.myCheckboxHandler = function(data) {
  console.log('Checkbox changed:', data.checked);
  // Your custom logic here
};
```

**Features:**
- Boolean value validation
- Automatic state reversion on write failure
- Visual feedback for state changes
- Read operations on component initialization

### UI Toggle
```html
<!-- Toggle with error handling -->
<ui-toggle 
  td-url="http://device.local/properties/power"
  label="Power"
  protocol="http"
  mode="readwrite"
  change-handler="myToggleHandler">
</ui-toggle>
```

**JavaScript Handler:**
```javascript
window.myToggleHandler = function(data) {
  console.log('Toggle state:', data.active, 'Value:', data.value);
  // Your custom logic here
};
```

**Features:**
- Multi-protocol support (HTTP, CoAP, MQTT)
- Mode-specific behavior (read, write, readwrite)
- State synchronization with device
- Protocol-specific error handling

## Configuration Options

### DataHandler Options
```typescript
interface DataOperationOptions {
  retryCount?: number;    // Default: 2
  timeout?: number;       // Default: 5000ms
  expectedValueType?: 'number' | 'boolean' | 'string' | 'any';
}
```

### Status Indicator Options
```typescript
interface StatusIndicatorOptions {
  theme: 'light' | 'dark';
  size?: 'small' | 'medium' | 'large';    // Default: 'small'
  position?: 'top-right' | 'bottom-right' | 'center';  // Default: 'top-right'
}
```

## Best Practices

### For Developers

1. **Always provide TD URLs** for components that need device integration
2. **Set appropriate timeouts** based on your device response times
3. **Handle edge cases** in your device implementations
4. **Test error scenarios** including network failures and invalid responses
5. **Monitor console logs** for detailed error information during development

### For Device Implementations

1. **Return consistent data types** for properties
2. **Implement proper HTTP status codes** for different error conditions
3. **Provide meaningful error messages** in response bodies
4. **Handle concurrent requests** gracefully
5. **Implement proper CORS headers** for web-based access

## Debugging

### Console Logging
All operations log detailed information to the browser console:
- Successful reads/writes with values
- Error details with context
- Retry attempts and outcomes
- Protocol-specific information

### Visual Debugging
- Hover over status indicators to see detailed error messages
- Check the network tab in browser dev tools for HTTP requests
- Monitor component state changes in Vue/React dev tools

## Migration Guide

### From Previous Versions
No breaking changes were introduced. Existing components will continue to work as before, but now include the new error handling features automatically when TD URLs are provided.

### Adding Error Handling to Existing Components
Simply add a `td-url` attribute to any component to enable error handling:

```html
<!-- Before -->
<ui-slider min="0" max="100" value="50"></ui-slider>

<!-- After -->
<ui-slider 
  td-url="http://device.local/properties/brightness"
  min="0" 
  max="100" 
  value="50">
</ui-slider>
```

## Testing Error Handling

### Test Scenarios
1. **Network Offline**: Disconnect network and test component behavior
2. **Invalid URLs**: Use non-existent hostnames or ports
3. **Invalid Responses**: Mock servers that return invalid data types
4. **Timeout Scenarios**: Servers with artificial delays > 5 seconds
5. **HTTP Error Codes**: Test various status codes (404, 500, etc.)

### Mock Testing Setup
```javascript
// Mock a failing device for testing
const mockFailingDevice = {
  url: "http://localhost:3001/failing-device",
  responses: {
    "/properties/test": { status: 500, body: "Internal Server Error" }
  }
};
```

## Performance Considerations

- **Minimal Overhead**: Error handling adds <1KB to component bundle size
- **Efficient Retries**: Exponential backoff prevents network flooding
- **Smart Caching**: Successful responses are cached briefly to reduce requests
- **Non-Blocking**: UI remains responsive during all operations
- **Memory Safe**: Automatic cleanup of timeouts and event listeners

---

This error handling system ensures robust, production-ready IoT device integration with excellent user experience and developer feedback.
