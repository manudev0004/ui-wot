/**
 * UI-WoT Component Integration Examples
 *
 * This file demonstrates how to use the component factory and integration
 * utilities for seamless WoT device control.
 */

import { ComponentFactory, ComponentMapper, IntegrationHelpers } from './component-integration';
import { ComponentName, WotIntegrationOptions } from '../types/component-interfaces';

// ============================================================================
// BASIC COMPONENT CREATION EXAMPLES
// ============================================================================

/**
 * Example: Creating components programmatically
 */
export async function createBasicComponents() {
  // Create a toggle component
  const toggle = await ComponentFactory.create({
    name: 'ui-toggle',
    id: 'device-toggle',
    target: '#controls-container',
    props: {
      label: 'Device Power',
      variant: 'outlined',
      color: 'primary',
      showStatus: true,
      showLastUpdated: true,
    },
  });

  // Create a slider component
  const slider = await ComponentFactory.create({
    name: 'ui-slider',
    id: 'device-slider',
    target: '#controls-container',
    props: {
      label: 'Temperature',
      min: 0,
      max: 100,
      step: 1,
      unit: '°C',
      variant: 'outlined',
      color: 'secondary',
      showStatus: true,
      showMinMax: true,
    },
  });

  // Create a button component
  const button = await ComponentFactory.create({
    name: 'ui-button',
    id: 'execute-button',
    target: '#controls-container',
    props: {
      label: 'Execute Action',
      variant: 'filled',
      color: 'primary',
      showStatus: true,
    },
  });

  return { toggle, slider, button };
}

// ============================================================================
// WOT INTEGRATION EXAMPLES
// ============================================================================

/**
 * Example: Integrating components with WoT Thing
 */
export async function createWoTIntegratedComponents(thing: any) {
  // Define WoT integration options
  const wotOptions: WotIntegrationOptions = {
    writeProperty: async (propertyName: string, value: any) => {
      await thing.writeProperty(propertyName, value);
    },
    readProperty: async (propertyName: string) => {
      const result = await thing.readProperty(propertyName);
      return await result.value();
    },
    invokeAction: async (actionName: string, input?: any) => {
      return await thing.invokeAction(actionName, input);
    },
    subscribeEvent: async (eventName: string, listener: (data: any) => void) => {
      await thing.subscribeEvent(eventName, listener);
    },
  };

  // Create toggle connected to device power property
  const powerToggle = await ComponentFactory.create({
    name: 'ui-toggle',
    id: 'power-toggle',
    target: '#device-controls',
    wot: wotOptions,
    props: {
      label: 'Device Power',
      variant: 'outlined',
      color: 'primary',
      showStatus: true,
    },
  });

  // Create slider connected to temperature property
  const tempSlider = await ComponentFactory.create({
    name: 'ui-slider',
    id: 'temp-slider',
    target: '#device-controls',
    wot: wotOptions,
    props: {
      label: 'Target Temperature',
      min: 15,
      max: 30,
      step: 0.5,
      unit: '°C',
      variant: 'outlined',
      color: 'secondary',
      showStatus: true,
    },
  });

  // Create button for executing actions
  const actionButton = await ComponentFactory.create({
    name: 'ui-button',
    id: 'action-button',
    target: '#device-controls',
    wot: wotOptions,
    props: {
      label: 'Start Cycle',
      variant: 'filled',
      color: 'primary',
      showStatus: true,
    },
  });

  return { powerToggle, tempSlider, actionButton };
}

// ============================================================================
// AUTOMATED COMPONENT MAPPING FROM THING DESCRIPTION
// ============================================================================

/**
 * Example: Automatically create components from Thing Description
 */
export async function createComponentsFromTD(thingDescription: any, thing: any) {
  const components: HTMLElement[] = [];
  const container = document.getElementById('auto-generated-controls');

  if (!container) {
    throw new Error('Container element not found');
  }

  // Define WoT integration options
  const wotOptions: WotIntegrationOptions = {
    writeProperty: async (propertyName: string, value: any) => {
      await thing.writeProperty(propertyName, value);
    },
    readProperty: async (propertyName: string) => {
      const result = await thing.readProperty(propertyName);
      return await result.value();
    },
    invokeAction: async (actionName: string, input?: any) => {
      return await thing.invokeAction(actionName, input);
    },
    subscribeEvent: async (eventName: string, listener: (data: any) => void) => {
      await thing.subscribeEvent(eventName, listener);
    },
  };

  // Map properties to components
  if (thingDescription.properties) {
    for (const [propertyName, property] of Object.entries(thingDescription.properties)) {
      const mapping = ComponentMapper.mapPropertyToComponent(property as any);

      if (mapping) {
        const component = await ComponentFactory.create({
          name: mapping.componentName,
          id: `prop-${propertyName}`,
          target: container,
          wot: wotOptions,
          props: {
            ...mapping.props,
            label: (property as any).title || propertyName,
          },
        });

        components.push(component);
      }
    }
  }

  // Map actions to components
  if (thingDescription.actions) {
    for (const [actionName, action] of Object.entries(thingDescription.actions)) {
      const mapping = ComponentMapper.mapActionToComponent(action as any);

      if (mapping) {
        const component = await ComponentFactory.create({
          name: mapping.componentName,
          id: `action-${actionName}`,
          target: container,
          wot: wotOptions,
          props: {
            ...mapping.props,
            label: (action as any).title || actionName,
          },
        });

        components.push(component);
      }
    }
  }

  // Map events to components
  if (thingDescription.events) {
    for (const [eventName, event] of Object.entries(thingDescription.events)) {
      const mapping = ComponentMapper.mapEventToComponent(event as any);

      if (mapping) {
        const component = await ComponentFactory.create({
          name: mapping.componentName,
          id: `event-${eventName}`,
          target: container,
          wot: wotOptions,
          props: {
            ...mapping.props,
            label: (event as any).title || eventName,
          },
        });

        components.push(component);
      }
    }
  }

  return components;
}

// ============================================================================
// COMPONENT SYNCHRONIZATION EXAMPLES
// ============================================================================

/**
 * Example: Creating synchronized component groups
 */
export async function createSynchronizedComponents() {
  // Create multiple toggle components that should stay in sync
  const toggle1 = await ComponentFactory.create({
    name: 'ui-toggle',
    id: 'sync-toggle-1',
    target: '#sync-group-1',
    props: {
      label: 'Master Control',
      variant: 'outlined',
      color: 'primary',
    },
  });

  const toggle2 = await ComponentFactory.create({
    name: 'ui-toggle',
    id: 'sync-toggle-2',
    target: '#sync-group-2',
    props: {
      label: 'Slave Control',
      variant: 'filled',
      color: 'secondary',
    },
  });

  const toggle3 = await ComponentFactory.create({
    name: 'ui-toggle',
    id: 'sync-toggle-3',
    target: '#sync-group-3',
    props: {
      label: 'Backup Control',
      variant: 'outlined',
      color: 'neutral',
    },
  });

  // Create synchronized group
  const cleanupSync = IntegrationHelpers.createSynchronizedGroup([toggle1, toggle2, toggle3]);

  return { components: [toggle1, toggle2, toggle3], cleanup: cleanupSync };
}

// ============================================================================
// STATUS MONITORING EXAMPLES
// ============================================================================

/**
 * Example: Monitoring component statuses
 */
export async function setupStatusMonitoring() {
  // Create some components for monitoring
  const components = await Promise.all([
    ComponentFactory.create({
      name: 'ui-toggle',
      id: 'monitored-toggle',
      target: '#monitoring-area',
      props: { label: 'Monitored Toggle' },
    }),
    ComponentFactory.create({
      name: 'ui-slider',
      id: 'monitored-slider',
      target: '#monitoring-area',
      props: { label: 'Monitored Slider', min: 0, max: 100 },
    }),
    ComponentFactory.create({
      name: 'ui-button',
      id: 'monitored-button',
      target: '#monitoring-area',
      props: { label: 'Monitored Button' },
    }),
  ]);

  // Setup status monitoring
  const monitor = IntegrationHelpers.createStatusMonitor(components);

  // Listen for status changes
  const cleanupStatusListener = monitor.onStatusChange(statuses => {
    console.log('Component statuses updated:', statuses);

    // Update UI with status information
    Object.entries(statuses).forEach(([componentId, status]) => {
      const statusElement = document.getElementById(`${componentId}-status`);
      if (statusElement) {
        statusElement.textContent = status;
        statusElement.className = `status ${status}`;
      }
    });
  });

  // Get current status
  const currentStatuses = monitor.getStatus();
  console.log('Current component statuses:', currentStatuses);

  return { components, monitor, cleanup: cleanupStatusListener };
}

// ============================================================================
// THEME APPLICATION EXAMPLES
// ============================================================================

/**
 * Example: Applying themes to component groups
 */
export async function setupThemingExample() {
  // Create container with components
  const container = document.getElementById('themed-container');
  if (!container) {
    throw new Error('Themed container not found');
  }

  // Create various components
  await Promise.all([
    ComponentFactory.create({
      name: 'ui-toggle',
      target: container,
      props: { label: 'Theme Toggle' },
    }),
    ComponentFactory.create({
      name: 'ui-slider',
      target: container,
      props: { label: 'Theme Slider', min: 0, max: 100 },
    }),
    ComponentFactory.create({
      name: 'ui-button',
      target: container,
      props: { label: 'Theme Button' },
    }),
    ComponentFactory.create({
      name: 'ui-text',
      target: container,
      props: { label: 'Theme Text' },
    }),
  ]);

  // Apply light theme
  function applyLightTheme() {
    IntegrationHelpers.applyTheme(container, {
      dark: false,
      color: 'primary',
      variant: 'outlined',
    });
  }

  // Apply dark theme
  function applyDarkTheme() {
    IntegrationHelpers.applyTheme(container, {
      dark: true,
      color: 'secondary',
      variant: 'filled',
    });
  }

  // Apply neutral theme
  function applyNeutralTheme() {
    IntegrationHelpers.applyTheme(container, {
      dark: false,
      color: 'neutral',
      variant: 'minimal',
    });
  }

  return { applyLightTheme, applyDarkTheme, applyNeutralTheme };
}

// ============================================================================
// ERROR HANDLING AND VALIDATION EXAMPLES
// ============================================================================

/**
 * Example: Component validation and error handling
 */
export async function setupValidationExample(thingDescription: any) {
  const errors: string[] = [];

  // Validate slider configuration against TD
  const sliderValidation = IntegrationHelpers.validateComponentConfig(
    'ui-slider',
    { min: -10, max: 50, step: 1 },
    thingDescription.properties?.temperature || { minimum: 0, maximum: 100 },
  );

  if (!sliderValidation.valid) {
    errors.push(...sliderValidation.errors);
  }

  // Validate text component configuration
  const textValidation = IntegrationHelpers.validateComponentConfig('ui-text', { maxLength: 200 }, thingDescription.properties?.description || { maxLength: 100 });

  if (!textValidation.valid) {
    errors.push(...textValidation.errors);
  }

  if (errors.length > 0) {
    console.error('Component validation errors:', errors);

    // Show validation errors in notification
    const notification = await ComponentFactory.create({
      name: 'ui-notification',
      target: '#error-notifications',
      props: {
        type: 'error',
        message: `Validation errors: ${errors.join(', ')}`,
        duration: 5000,
        showIcon: true,
        showCloseButton: true,
      },
    });

    await notification.show();
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// COMPLETE DASHBOARD EXAMPLE
// ============================================================================

/**
 * Example: Creating a complete dashboard with all features
 */
export async function createCompleteDashboard(thingDescription: any, thing: any) {
  // Wait for all components to be defined
  await IntegrationHelpers.waitForComponents(['ui-toggle', 'ui-slider', 'ui-button', 'ui-text', 'ui-calendar', 'ui-color-picker', 'ui-file-picker', 'ui-event', 'ui-notification']);

  // Create main container
  const dashboard = document.getElementById('dashboard-container');
  if (!dashboard) {
    throw new Error('Dashboard container not found');
  }

  // Auto-generate components from Thing Description
  const autoComponents = await createComponentsFromTD(thingDescription, thing);

  // Create custom status monitoring
  const monitor = IntegrationHelpers.createStatusMonitor(autoComponents);

  // Setup theme switching
  const themeControls = await setupThemingExample();

  // Setup validation
  const validation = await setupValidationExample(thingDescription);

  // Create notification system for errors and status updates
  const errorNotification = await ComponentFactory.create({
    name: 'ui-notification',
    id: 'error-notification',
    target: dashboard,
    props: {
      type: 'error',
      showIcon: true,
      showCloseButton: true,
      duration: 0, // Manual dismiss
    },
  });

  const successNotification = await ComponentFactory.create({
    name: 'ui-notification',
    id: 'success-notification',
    target: dashboard,
    props: {
      type: 'success',
      showIcon: true,
      showCloseButton: true,
      duration: 3000,
    },
  });

  // Monitor for errors and show notifications
  const cleanupErrorMonitoring = monitor.onStatusChange(statuses => {
    const hasErrors = Object.values(statuses).some(status => status === 'error');
    const hasSuccess = Object.values(statuses).some(status => status === 'success');

    if (hasErrors) {
      errorNotification.show();
    }
    if (hasSuccess) {
      successNotification.show();
    }
  });

  return {
    components: autoComponents,
    monitor,
    themeControls,
    validation,
    notifications: { errorNotification, successNotification },
    cleanup: cleanupErrorMonitoring,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  createBasicComponents,
  createWoTIntegratedComponents,
  createComponentsFromTD,
  createSynchronizedComponents,
  setupStatusMonitoring,
  setupThemingExample,
  setupValidationExample,
  createCompleteDashboard,
};
