#!/usr/bin/env node

/**
 * Simple TestThing server for UI-WoT React demo
 * Provides a basic Thing Description and properties for testing
 * Run: node test-thing-server.js
 */

const http = require('http');
const url = require('url');

// Simple in-memory state
const state = {
  enabled: true,
  level: 50,
  name: 'TestThing Device',
  currentDate: new Date().toISOString().split('T')[0],
  currentTime: new Date().toTimeString().split(' ')[0],
  currentDateTime: new Date().toISOString(),
  currentColor: '#3b82f6',
  colorRgb: { r: 59, g: 130, b: 246 },
  selectedFile: null,
  fileList: [],
};

// Thing Description
const thingDescription = {
  '@context': ['https://www.w3.org/2019/wot/td/v1', 'https://www.w3.org/2022/wot/td/v1.1'],
  'id': 'urn:dev:testthing:1',
  'title': 'TestThing',
  'description': 'A simple test thing for UI-WoT React demo',
  'securityDefinitions': {
    nosec_sc: {
      scheme: 'nosec',
    },
  },
  'security': ['nosec_sc'],
  'base': 'http://localhost:8080/',
  'properties': {
    enabled: {
      type: 'boolean',
      title: 'Device Enabled',
      description: 'Whether the device is enabled',
      forms: [
        {
          href: 'properties/enabled',
          contentType: 'application/json',
        },
      ],
    },
    level: {
      type: 'integer',
      minimum: 0,
      maximum: 100,
      title: 'Power Level',
      description: 'Current power level percentage',
      forms: [
        {
          href: 'properties/level',
          contentType: 'application/json',
        },
      ],
    },
    name: {
      type: 'string',
      title: 'Device Name',
      description: 'Human-readable device name',
      forms: [
        {
          href: 'properties/name',
          contentType: 'application/json',
        },
      ],
    },
    currentDate: {
      type: 'string',
      format: 'date',
      title: 'Current Date',
      forms: [
        {
          href: 'properties/currentDate',
          contentType: 'application/json',
        },
      ],
    },
    currentTime: {
      type: 'string',
      format: 'time',
      title: 'Current Time',
      forms: [
        {
          href: 'properties/currentTime',
          contentType: 'application/json',
        },
      ],
    },
    currentDateTime: {
      type: 'string',
      format: 'date-time',
      title: 'Current DateTime',
      forms: [
        {
          href: 'properties/currentDateTime',
          contentType: 'application/json',
        },
      ],
    },
    currentColor: {
      type: 'string',
      title: 'Current Color',
      description: 'Color in hex format',
      forms: [
        {
          href: 'properties/currentColor',
          contentType: 'application/json',
        },
      ],
    },
    colorRgb: {
      type: 'object',
      title: 'RGB Color',
      properties: {
        r: { type: 'integer', minimum: 0, maximum: 255 },
        g: { type: 'integer', minimum: 0, maximum: 255 },
        b: { type: 'integer', minimum: 0, maximum: 255 },
      },
      forms: [
        {
          href: 'properties/colorRgb',
          contentType: 'application/json',
        },
      ],
    },
    selectedFile: {
      type: 'object',
      title: 'Selected File',
      forms: [
        {
          href: 'properties/selectedFile',
          contentType: 'application/json',
        },
      ],
    },
    fileList: {
      type: 'array',
      title: 'File List',
      forms: [
        {
          href: 'properties/fileList',
          contentType: 'application/json',
        },
      ],
    },
  },
  'actions': {
    'brew': {
      title: 'Brew Coffee',
      description: 'Start brewing coffee',
      output: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string' },
        },
      },
      forms: [
        {
          href: 'actions/brew',
          contentType: 'application/json',
        },
      ],
    },
    'upload-file': {
      title: 'Upload File',
      input: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          size: { type: 'integer' },
          type: { type: 'string' },
          content: { type: 'string' },
        },
      },
      forms: [
        {
          href: 'actions/upload-file',
          contentType: 'application/json',
        },
      ],
    },
    'clear-files': {
      title: 'Clear Files',
      forms: [
        {
          href: 'actions/clear-files',
          contentType: 'application/json',
        },
      ],
    },
    'convert-color': {
      title: 'Convert Color',
      input: {
        type: 'object',
        properties: {
          color: { type: 'string' },
          from: { type: 'string' },
          to: { type: 'string' },
        },
      },
      forms: [
        {
          href: 'actions/convert-color',
          contentType: 'application/json',
        },
      ],
    },
  },
  'events': {
    status: {
      title: 'Status Change',
      description: 'Emitted when device status changes',
      data: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          timestamp: { type: 'string' },
          level: { type: 'string' },
        },
      },
      forms: [
        {
          href: 'events/status',
          contentType: 'application/json',
        },
      ],
    },
  },
};

// Helper to set CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Helper to send JSON response
function sendJson(res, data, status = 200) {
  setCorsHeaders(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  console.log(`${method} ${path}`);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // Thing Description endpoint
  if (path === '/testthing' && method === 'GET') {
    sendJson(res, thingDescription);
    return;
  }

  // Property endpoints
  const propertyMatch = path.match(/^\/properties\/(.+)$/);
  if (propertyMatch) {
    const propName = propertyMatch[1];

    if (method === 'GET') {
      if (state.hasOwnProperty(propName)) {
        sendJson(res, state[propName]);
      } else {
        sendJson(res, { error: 'Property not found' }, 404);
      }
      return;
    }

    if (method === 'PUT') {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        try {
          const value = JSON.parse(body);
          if (state.hasOwnProperty(propName)) {
            state[propName] = value;
            console.log(`  Updated ${propName} = ${JSON.stringify(value)}`);
            sendJson(res, { success: true });
          } else {
            sendJson(res, { error: 'Property not found' }, 404);
          }
        } catch (err) {
          sendJson(res, { error: 'Invalid JSON' }, 400);
        }
      });
      return;
    }
  }

  // Action endpoints
  const actionMatch = path.match(/^\/actions\/(.+)$/);
  if (actionMatch && method === 'POST') {
    const actionName = actionMatch[1];

    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        const input = body ? JSON.parse(body) : {};

        switch (actionName) {
          case 'brew':
            console.log('  ☕ Brewing coffee...');
            sendJson(res, {
              status: 'brewing',
              timestamp: new Date().toISOString(),
              message: 'Coffee brewing started',
            });
            break;

          case 'upload-file':
            console.log(`  📁 File uploaded: ${input.name} (${input.size} bytes)`);
            sendJson(res, {
              status: 'uploaded',
              filename: input.name,
              size: input.size,
            });
            break;

          case 'clear-files':
            console.log('  🗑️ Files cleared');
            state.selectedFile = null;
            state.fileList = [];
            sendJson(res, { status: 'cleared' });
            break;

          case 'convert-color':
            console.log(`  🎨 Converting color: ${input.color} from ${input.from} to ${input.to}`);
            sendJson(res, {
              original: input.color,
              converted: input.to === 'rgb' ? { r: 255, g: 87, b: 34 } : '#ff5722',
            });
            break;

          default:
            sendJson(res, { error: 'Action not found' }, 404);
        }
      } catch (err) {
        sendJson(res, { error: 'Invalid JSON' }, 400);
      }
    });
    return;
  }

  // Event endpoints (WebSocket would be better, but this is a simple demo)
  if (path === '/events/status' && method === 'GET') {
    sendJson(res, {
      message: 'Device status normal',
      timestamp: new Date().toISOString(),
      level: 'info',
    });
    return;
  }

  // 404 for everything else
  sendJson(res, { error: 'Not found' }, 404);
});

// Start server
const PORT = 8080;
server.listen(PORT, () => {
  console.log('🌐 TestThing server running at http://localhost:8080');
  console.log('📋 Thing Description: http://localhost:8080/testthing');
  console.log('🔧 CORS enabled for browser requests');
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /testthing              - Thing Description');
  console.log('  GET  /properties/{name}      - Read property');
  console.log('  PUT  /properties/{name}      - Write property');
  console.log('  POST /actions/{name}         - Invoke action');
  console.log('  GET  /events/status          - Get status event');
  console.log('');
  console.log('Properties: enabled, level, name, currentDate, currentTime, currentDateTime, currentColor, colorRgb');
  console.log('Actions: brew, upload-file, clear-files, convert-color');
  console.log('Events: status');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down TestThing server...');
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});
