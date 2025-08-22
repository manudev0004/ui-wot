/**
 * Advanced WoT Service Usage Examples
 * 
 * This file demonstrates comprehensive usage patterns for the UI-WoT library
 * including node-wot integration, custom implementations, and error handling.
 */

import { 
  WoTService, 
  createBinder, 
  type ThingDescription, 
  type UiMsg
} from '@thingweb/ui-wot-components';

// Example 1: Basic Device Connection
export async function basicDeviceExample() {
  console.log('=== Basic Device Connection ===');
  
  const wotService = new WoTService({ 
    debug: true,
    timeout: 5000 
  });

  // Example Thing Description for a smart lamp
  const lampTD: ThingDescription = {
    "@context": "https://www.w3.org/2019/wot/td/v1",
    "id": "urn:dev:smartlamp:001",
    "title": "Smart Lamp",
    "description": "A smart LED lamp with brightness and color control",
    "properties": {
      "brightness": {
        "type": "integer",
        "minimum": 0,
        "maximum": 100,
        "observable": true,
        "forms": [{ 
          "href": "http://smartlamp.local/properties/brightness",
          "op": ["readproperty", "writeproperty", "observeproperty"]
        }]
      },
      "power": {
        "type": "boolean",
        "observable": true,
        "forms": [{ 
          "href": "http://smartlamp.local/properties/power",
          "op": ["readproperty", "writeproperty", "observeproperty"]
        }]
      },
      "color": {
        "type": "object",
        "properties": {
          "r": { "type": "integer", "minimum": 0, "maximum": 255 },
          "g": { "type": "integer", "minimum": 0, "maximum": 255 },
          "b": { "type": "integer", "minimum": 0, "maximum": 255 }
        },
        "forms": [{ 
          "href": "http://smartlamp.local/properties/color",
          "op": ["readproperty", "writeproperty"]
        }]
      }
    },
    "actions": {
      "fadeIn": {
        "description": "Gradually increase brightness",
        "input": {
          "type": "object",
          "properties": {
            "duration": { "type": "integer", "minimum": 1000 }
          }
        },
        "forms": [{ 
          "href": "http://smartlamp.local/actions/fadeIn" 
        }]
      }
    }
  };

  try {
    // Consume the Thing Description
    await wotService.consumeThing('smartlamp', lampTD);
    console.log('✅ Smart lamp connected successfully');

    // Read current state
    const powerState = await wotService.readProperty('smartlamp', 'power');
    const brightness = await wotService.readProperty('smartlamp', 'brightness');
    
    console.log(`💡 Power: ${powerState.payload ? 'ON' : 'OFF'}`);
    console.log(`🔆 Brightness: ${brightness.payload}%`);
    console.log(`⚡ Implementation: ${brightness.meta?.implementation}`);

    // Control the lamp
    await wotService.writeProperty('smartlamp', 'power', true);
    await wotService.writeProperty('smartlamp', 'brightness', 75);
    
    console.log('✅ Lamp turned on and brightness set to 75%');

    // Invoke action
    const fadeResult = await wotService.invokeAction('smartlamp', 'fadeIn', { 
      duration: 3000 
    });
    console.log('✅ Fade-in action invoked:', fadeResult.payload);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example 2: Real-time Property Observation
export async function propertyObservationExample() {
  console.log('\n=== Property Observation ===');
  
  const wotService = new WoTService({ debug: true });

  // Sensor Thing Description
  const sensorTD: ThingDescription = {
    "@context": "https://www.w3.org/2019/wot/td/v1",
    "id": "urn:dev:sensor:001",
    "title": "Environmental Sensor",
    "properties": {
      "temperature": {
        "type": "number",
        "unit": "celsius",
        "observable": true,
        "forms": [{ 
          "href": "http://sensor.local/temperature",
          "op": ["readproperty", "observeproperty"]
        }]
      },
      "humidity": {
        "type": "number",
        "unit": "percent",
        "observable": true,
        "forms": [{ 
          "href": "http://sensor.local/humidity" 
        }]
      }
    }
  };

  try {
    await wotService.consumeThing('sensor', sensorTD);
    console.log('🌡️ Environmental sensor connected');

    // Observe temperature with detailed logging
    const stopTempObservation = await wotService.observeProperty(
      'sensor',
      'temperature',
      (msg: UiMsg<number>) => {
        const timestamp = new Date(msg.ts).toLocaleTimeString();
        const method = msg.meta?.method || 'unknown';
        const latency = msg.meta?.latency || 0;
        
        if (msg.ok) {
          console.log(`🌡️ [${timestamp}] Temperature: ${msg.payload}°C (${method}, ${latency}ms)`);
          
          // Temperature alerts
          if (msg.payload > 30) {
            console.log('🔥 High temperature alert!');
          } else if (msg.payload < 10) {
            console.log('🧊 Low temperature alert!');
          }
        } else {
          console.error(`❌ [${timestamp}] Temperature read failed: ${msg.error?.message}`);
        }
      }
    );

    // Observe humidity
    const stopHumidityObservation = await wotService.observeProperty(
      'sensor',
      'humidity',
      (msg: UiMsg<number>) => {
        if (msg.ok) {
          console.log(`💧 Humidity: ${msg.payload}%`);
        }
      }
    );

    // Let observations run for demo
    console.log('🔄 Observing properties for 30 seconds...');
    
    setTimeout(async () => {
      console.log('⏹️ Stopping observations...');
      await stopTempObservation();
      await stopHumidityObservation();
      console.log('✅ Observations stopped');
    }, 30000);

  } catch (error) {
    console.error('❌ Observation error:', error.message);
  }
}

// Example 3: Multi-Device Management
export async function multiDeviceExample() {
  console.log('\n=== Multi-Device Management ===');
  
  const wotService = new WoTService({ 
    debug: true,
    maxRetries: 3,
    retryDelay: 1000
  });

  // Multiple device Thing Descriptions
  const devices = [
    {
      id: 'thermostat',
      url: 'http://thermostat.local/td',
      td: {
        "@context": "https://www.w3.org/2019/wot/td/v1",
        "id": "urn:dev:thermostat:001",
        "title": "Smart Thermostat",
        "properties": {
          "targetTemperature": {
            "type": "number",
            "minimum": 16,
            "maximum": 30,
            "forms": [{ "href": "http://thermostat.local/target" }]
          },
          "currentTemperature": {
            "type": "number",
            "observable": true,
            "forms": [{ "href": "http://thermostat.local/current" }]
          }
        }
      }
    },
    {
      id: 'security',
      url: 'http://security.local/td',
      td: {
        "@context": "https://www.w3.org/2019/wot/td/v1",
        "id": "urn:dev:security:001",
        "title": "Security System",
        "properties": {
          "armed": {
            "type": "boolean",
            "forms": [{ "href": "http://security.local/armed" }]
          },
          "motionDetected": {
            "type": "boolean",
            "observable": true,
            "forms": [{ "href": "http://security.local/motion" }]
          }
        }
      }
    }
  ];

  const deviceStatuses: Record<string, string> = {};

  // Connect to all devices
  const connectionPromises = devices.map(async (device) => {
    try {
      await wotService.consumeThing(device.id, device.td);
      deviceStatuses[device.id] = 'connected';
      console.log(`✅ ${device.td.title} connected`);
      return device.id;
    } catch (error) {
      deviceStatuses[device.id] = 'error';
      console.error(`❌ Failed to connect ${device.td.title}: ${error.message}`);
      return null;
    }
  });

  const connectedDevices = (await Promise.all(connectionPromises))
    .filter(id => id !== null);

  console.log(`📊 Connected ${connectedDevices.length}/${devices.length} devices`);

  // Health monitoring
  const startHealthMonitoring = () => {
    const checkHealth = async () => {
      try {
        const health = await wotService.getHealthStatus();
        console.log('\n📡 Device Health Status:');
        
        Object.entries(health).forEach(([deviceId, status]) => {
          const emoji = status === 'connected' ? '🟢' : 
                       status === 'error' ? '🔴' : '🟡';
          console.log(`  ${emoji} ${deviceId}: ${status}`);
        });
        
      } catch (error) {
        console.error('❌ Health check failed:', error.message);
      }
    };

    // Check immediately and then every 10 seconds
    checkHealth();
    return setInterval(checkHealth, 10000);
  };

  const healthInterval = startHealthMonitoring();

  // Setup device-specific monitoring
  if (connectedDevices.includes('thermostat')) {
    await wotService.observeProperty('thermostat', 'currentTemperature', (msg) => {
      if (msg.ok) {
        console.log(`🌡️ Thermostat: ${msg.payload}°C`);
      }
    });
  }

  if (connectedDevices.includes('security')) {
    await wotService.observeProperty('security', 'motionDetected', (msg) => {
      if (msg.ok && msg.payload) {
        console.log('🚨 MOTION DETECTED! Security alert triggered');
      }
    });
  }

  // Cleanup after demo
  setTimeout(() => {
    clearInterval(healthInterval);
    console.log('🛑 Health monitoring stopped');
  }, 60000);
}

// Example 4: Auto-binding with UI Components
export async function autoBindingExample() {
  console.log('\n=== Auto-binding Example ===');
  
  const wotService = new WoTService({ debug: true });
  createBinder(wotService); // Initialize binder

  // Smart home dashboard TD
  const dashboardTD: ThingDescription = {
    "@context": "https://www.w3.org/2019/wot/td/v1",
    "id": "urn:dev:dashboard:001",
    "title": "Smart Home Dashboard",
    "properties": {
      "livingRoomTemp": {
        "type": "number",
        "observable": true,
        "forms": [{ "href": "http://dashboard.local/living-temp" }]
      },
      "outdoorLights": {
        "type": "boolean",
        "observable": true,
        "forms": [{ "href": "http://dashboard.local/outdoor-lights" }]
      },
      "musicVolume": {
        "type": "integer",
        "forms": [{ "href": "http://dashboard.local/music-volume" }]
      }
    }
  };

  try {
    await wotService.consumeThing('dashboard', dashboardTD);
    console.log('🏠 Smart home dashboard connected');

    // Auto-bind properties to hypothetical UI elements
    const bindings = [
      { property: 'livingRoomTemp', selector: '#temp-display', options: { format: '{value}°C' } },
      { property: 'outdoorLights', selector: '#lights-toggle', options: { bidirectional: true } },
      { property: 'musicVolume', selector: '#volume-slider', options: { bidirectional: true, updateInterval: 500 } }
    ];

    for (const binding of bindings) {
      try {
        // In a real scenario, these elements would exist in the DOM
        console.log(`🔗 Binding ${binding.property} to ${binding.selector}`);
        
        // Simulate binding (in real use, elements would be bound)
        const capabilities = wotService.getPropertyCapabilities('dashboard', binding.property);
        console.log(`   📋 Capabilities:`, capabilities);
        
        if (capabilities.canObserve) {
          console.log(`   👁️ Setting up observation for ${binding.property}`);
        }
        if (capabilities.canWrite && binding.options?.bidirectional) {
          console.log(`   ✏️ Enabling bidirectional binding for ${binding.property}`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to bind ${binding.property}:`, error.message);
      }
    }

    console.log('✅ All bindings configured successfully');

  } catch (error) {
    console.error('❌ Auto-binding setup failed:', error.message);
  }
}

// Example 5: Error Handling and Resilience
export async function errorHandlingExample() {
  console.log('\n=== Error Handling & Resilience ===');
  
  const wotService = new WoTService({ 
    debug: true,
    timeout: 3000,
    maxRetries: 3,
    retryDelay: 1000
  });

  // Test with potentially unreachable device
  const unreliableDeviceTD: ThingDescription = {
    "@context": "https://www.w3.org/2019/wot/td/v1",
    "id": "urn:dev:unreliable:001",
    "title": "Unreliable Device",
    "properties": {
      "status": {
        "type": "string",
        "forms": [{ "href": "http://unreliable-device.local/status" }]
      },
      "data": {
        "type": "number",
        "observable": true,
        "forms": [{ "href": "http://unreliable-device.local/data" }]
      }
    }
  };

  try {
    await wotService.consumeThing('unreliable', unreliableDeviceTD);
    console.log('📡 Attempting to connect to unreliable device...');

    // Test property reading with error handling
    const testProperty = async (propertyName: string) => {
      try {
        console.log(`🔍 Reading ${propertyName}...`);
        const result = await wotService.readProperty('unreliable', propertyName);
        
        if (result.ok) {
          console.log(`✅ ${propertyName}: ${result.payload}`);
        } else {
          console.log(`⚠️ ${propertyName} read failed: ${result.error?.message}`);
        }
        
      } catch (error) {
        console.error(`❌ ${propertyName} error: ${error.message}`);
      }
    };

    await testProperty('status');
    await testProperty('data');

    // Test observation with error recovery
    console.log('🔄 Setting up observation with error handling...');
    
    const stopObservation = await wotService.observeProperty(
      'unreliable',
      'data',
      (msg: UiMsg<number>) => {
        if (msg.ok) {
          console.log(`📊 Data received: ${msg.payload}`);
        } else {
          console.log(`⚠️ Observation error: ${msg.error?.message}`);
          
          // Implement custom error recovery logic here
          if (msg.error?.code === 'OBSERVE_ERROR') {
            console.log('🔄 Attempting to restart observation...');
            // Custom recovery logic would go here
          }
        }
      }
    );

    // Test observation for 15 seconds
    setTimeout(async () => {
      await stopObservation();
      console.log('⏹️ Observation stopped');
    }, 15000);

  } catch (error) {
    console.error('❌ Unreliable device test failed:', error.message);
    console.log('💡 This is expected behavior for demonstration purposes');
  }
}

// Example 6: Capability Detection and Adaptation
export async function capabilityDetectionExample() {
  console.log('\n=== Capability Detection ===');
  
  // Check if node-wot is available
  let nodeWoTAvailable = false;
  try {
    require('@node-wot/core');
    nodeWoTAvailable = true;
  } catch {
    nodeWoTAvailable = false;
  }
  
  console.log('📦 Node-WoT Available:', nodeWoTAvailable);
  
  const wotService = new WoTService({ debug: true });

  // Listen for service events
  wotService.addEventListener('servientReady', () => {
    console.log('✅ WoT Servient is ready (using node-wot)');
  });

  wotService.addEventListener('thingConsumed', (event) => {
    const { thingId, td } = event.detail;
    console.log(`📡 Thing consumed: ${thingId} (${td.title})`);
  });

  // Example Thing with various property types
  const mixedCapabilitiesTD: ThingDescription = {
    "@context": "https://www.w3.org/2019/wot/td/v1",
    "id": "urn:dev:mixed:001",
    "title": "Mixed Capabilities Device",
    "properties": {
      "readOnlyProperty": {
        "type": "string",
        "readOnly": true,
        "forms": [{ "href": "http://device.local/readonly" }]
      },
      "writeOnlyProperty": {
        "type": "number",
        "forms": [{ "href": "http://device.local/writeonly" }]
      },
      "observableProperty": {
        "type": "boolean",
        "observable": true,
        "forms": [{ "href": "http://device.local/observable" }]
      },
      "readWriteProperty": {
        "type": "integer",
        "forms": [{ "href": "http://device.local/readwrite" }]
      }
    }
  };

  try {
    await wotService.consumeThing('mixed', mixedCapabilitiesTD);
    
    // Analyze capabilities
    const properties = Object.keys(mixedCapabilitiesTD.properties!);
    console.log('\n📋 Property Capabilities Analysis:');
    
    properties.forEach(propName => {
      const capabilities = wotService.getPropertyCapabilities('mixed', propName);
      const property = mixedCapabilitiesTD.properties![propName];
      
      let mode = 'read-write';
      if (property.readOnly) mode = 'read-only';
      else if (!capabilities.canRead && capabilities.canWrite) mode = 'write-only';
      
      console.log(`  🔧 ${propName}:`);
      console.log(`     📖 Can Read: ${capabilities.canRead}`);
      console.log(`     ✏️ Can Write: ${capabilities.canWrite}`);
      console.log(`     👁️ Can Observe: ${capabilities.canObserve}`);
      console.log(`     🎯 Mode: ${mode}`);
    });

  } catch (error) {
    console.error('❌ Capability detection failed:', error.message);
  }
}

// Demo runner
export async function runAllExamples() {
  console.log('🚀 Starting UI-WoT Library Examples');
  console.log('=====================================\n');

  try {
    await basicDeviceExample();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await propertyObservationExample();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await multiDeviceExample();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await autoBindingExample();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await errorHandlingExample();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await capabilityDetectionExample();
    
    console.log('\n🎉 All examples completed successfully!');
    
  } catch (error) {
    console.error('💥 Example runner failed:', error);
  }
}

// Export for use in other modules
export default {
  basicDeviceExample,
  propertyObservationExample,
  multiDeviceExample,
  autoBindingExample,
  errorHandlingExample,
  capabilityDetectionExample,
  runAllExamples
};
