/**
 * UI-WoT Component Factory and Integration Utilities
 *
 * This module provides utilities for creating, managing, and integrating
 * UI-WoT components with Web of Things (WoT) devices seamlessly.
 */

import { ComponentName, ComponentInstance, ComponentInitOptions, WotIntegrationOptions, UiMsg, OperationStatus } from '../types/component-interfaces';

// ============================================================================
// COMPONENT FACTORY
// ============================================================================

/**
 * Factory class for creating and managing UI-WoT components
 */
export class ComponentFactory {
  private static registeredComponents = new Map<string, HTMLElement>();

  /**
   * Creates a new UI-WoT component instance
   */
  static async create<T extends ComponentName>(options: ComponentInitOptions<T>): Promise<ComponentInstance<T>> {
    const { name, props = {}, target, id, wot } = options;

    // Wait for component to be defined
    await customElements.whenDefined(name);

    // Create element
    const element = document.createElement(name) as ComponentInstance<T>;

    // Set ID if provided
    if (id) {
      element.id = id;
    }

    // Apply props
    Object.entries(props).forEach(([key, value]) => {
      (element as any)[key] = value;
    });

    // Attach to target if provided
    if (target) {
      const targetElement = typeof target === 'string' ? document.querySelector(target) : target;

      if (targetElement) {
        targetElement.appendChild(element);
      }
    }

    // Setup WoT integration if provided
    if (wot) {
      await ComponentFactory.setupWotIntegration(element, wot);
    }

    // Register component
    const elementId = element.id || `${name}-${Date.now()}`;
    ComponentFactory.registeredComponents.set(elementId, element);

    return element;
  }

  /**
   * Gets a registered component by ID
   */
  static get<T extends ComponentName>(id: string): ComponentInstance<T> | null {
    const element = ComponentFactory.registeredComponents.get(id);
    return (element as ComponentInstance<T>) || null;
  }

  /**
   * Removes a component from the registry and DOM
   */
  static destroy(id: string): boolean {
    const element = ComponentFactory.registeredComponents.get(id);
    if (element) {
      element.remove();
      ComponentFactory.registeredComponents.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Sets up WoT integration for a component
   */
  private static async setupWotIntegration<T extends ComponentName>(component: ComponentInstance<T>, wot: WotIntegrationOptions): Promise<void> {
    const tagName = component.tagName.toLowerCase() as T;

    // Setup based on component type
    switch (tagName) {
      case 'ui-button':
        await ComponentFactory.setupButtonWoT(component as any, wot);
        break;

      case 'ui-toggle':
      case 'ui-checkbox':
        await ComponentFactory.setupBooleanWoT(component as any, wot);
        break;

      case 'ui-slider':
      case 'ui-number-picker':
        await ComponentFactory.setupNumericWoT(component as any, wot);
        break;

      case 'ui-text':
      case 'ui-calendar':
      case 'ui-color-picker':
        await ComponentFactory.setupStringWoT(component as any, wot);
        break;

      case 'ui-file-picker':
        await ComponentFactory.setupFilePickerWoT(component as any, wot);
        break;

      case 'ui-event':
        await ComponentFactory.setupEventWoT(component as any, wot);
        break;

      case 'ui-notification':
        await ComponentFactory.setupNotificationWoT(component as any, wot);
        break;
    }
  }

  /**
   * Setup WoT integration for button components
   */
  private static async setupButtonWoT(button: ComponentInstance<'ui-button'>, wot: WotIntegrationOptions): Promise<void> {
    if (wot.invokeAction) {
      await button.setAction(async () => {
        return await wot.invokeAction!('execute');
      });
    }
  }

  /**
   * Setup WoT integration for boolean value components (toggle, checkbox)
   */
  private static async setupBooleanWoT(component: ComponentInstance<'ui-toggle'> | ComponentInstance<'ui-checkbox'>, wot: WotIntegrationOptions): Promise<void> {
    if (wot.writeProperty && wot.readProperty) {
      // Read initial value
      try {
        const initialValue = await wot.readProperty('value');
        await component.setValue(initialValue, {
          writeOperation: async (value: boolean) => {
            await wot.writeProperty!('value', value);
          },
        });
      } catch (error) {
        console.warn('Failed to read initial value:', error);
      }
    }
  }

  /**
   * Setup WoT integration for numeric value components (slider, number-picker)
   */
  private static async setupNumericWoT(component: ComponentInstance<'ui-slider'> | ComponentInstance<'ui-number-picker'>, wot: WotIntegrationOptions): Promise<void> {
    if (wot.writeProperty && wot.readProperty) {
      // Read initial value
      try {
        const initialValue = await wot.readProperty('value');
        await component.setValue(initialValue, {
          writeOperation: async (value: number) => {
            await wot.writeProperty!('value', value);
          },
        });
      } catch (error) {
        console.warn('Failed to read initial value:', error);
      }
    }
  }

  /**
   * Setup WoT integration for string value components (text, calendar, color-picker)
   */
  private static async setupStringWoT(
    component: ComponentInstance<'ui-text'> | ComponentInstance<'ui-calendar'> | ComponentInstance<'ui-color-picker'>,
    wot: WotIntegrationOptions,
  ): Promise<void> {
    if (wot.writeProperty && wot.readProperty) {
      // Read initial value
      try {
        const initialValue = await wot.readProperty('value');
        await component.setValue(initialValue, {
          writeOperation: async (value: string) => {
            await wot.writeProperty!('value', value);
          },
        });
      } catch (error) {
        console.warn('Failed to read initial value:', error);
      }
    }
  }

  /**
   * Setup WoT integration for file picker components
   */
  private static async setupFilePickerWoT(filePicker: ComponentInstance<'ui-file-picker'>, wot: WotIntegrationOptions): Promise<void> {
    if (wot.invokeAction && wot.writeProperty) {
      await filePicker.setUpload(
        async (fileData: any) => {
          return await wot.invokeAction!('uploadFile', fileData);
        },
        {
          propertyName: 'selectedFile',
          writeProperty: async (prop: string, value: any) => {
            await wot.writeProperty!(prop, value);
          },
        },
      );
    }
  }

  /**
   * Setup WoT integration for event components
   */
  private static async setupEventWoT(eventComponent: ComponentInstance<'ui-event'>, wot: WotIntegrationOptions): Promise<void> {
    if (wot.subscribeEvent) {
      await wot.subscribeEvent('dataChanged', (eventData: any) => {
        eventComponent.addEvent(eventData);
      });
      await eventComponent.startListening();
    }
  }

  /**
   * Setup WoT integration for notification components
   */
  private static async setupNotificationWoT(notification: ComponentInstance<'ui-notification'>, wot: WotIntegrationOptions): Promise<void> {
    if (wot.subscribeEvent) {
      await wot.subscribeEvent('alert', (_alertData: any) => {
        notification.show();
      });
    }
  }
}

// ============================================================================
// COMPONENT MAPPER
// ============================================================================

/**
 * Maps WoT Thing Description affordances to appropriate UI components
 */
export class ComponentMapper {
  /**
   * Maps a WoT property to the most appropriate UI component
   */
  static mapPropertyToComponent(property: any): {
    componentName: ComponentName;
    props: any;
  } | null {
    const { type, minimum, maximum, enum: enumValues, readOnly } = property;

    switch (type) {
      case 'boolean':
        return {
          componentName: 'ui-toggle',
          props: {
            readonly: readOnly,
            variant: 'outlined',
            showStatus: true,
          },
        };

      case 'integer':
      case 'number':
        if (minimum !== undefined && maximum !== undefined) {
          const range = maximum - minimum;
          // For integers, prefer slider for reasonable ranges
          if (type === 'integer' && range <= 100) {
            return {
              componentName: 'ui-slider',
              props: {
                min: minimum,
                max: maximum,
                readonly: readOnly,
                variant: 'outlined',
                showStatus: true,
                showMinMax: true,
                step: 1,
              },
            };
          } else if (type === 'number' && range <= 1000) {
            // For numbers, use slider for reasonable ranges
            return {
              componentName: 'ui-slider',
              props: {
                min: minimum,
                max: maximum,
                readonly: readOnly,
                variant: 'outlined',
                showStatus: true,
                showMinMax: true,
              },
            };
          } else {
            // For large ranges, prefer number picker
            return {
              componentName: 'ui-number-picker',
              props: {
                min: minimum,
                max: maximum,
                readonly: readOnly,
                variant: 'outlined',
                showStatus: true,
                precision: type === 'integer' ? 0 : undefined,
              },
            };
          }
        } else {
          // Use number picker for open-ended values
          return {
            componentName: 'ui-number-picker',
            props: {
              min: minimum,
              max: maximum,
              readonly: readOnly,
              variant: 'outlined',
              showStatus: true,
              precision: type === 'integer' ? 0 : undefined,
            },
          };
        }

      case 'string':
        if (enumValues && enumValues.length > 0) {
          // Could map to a select component (not implemented yet)
          return {
            componentName: 'ui-text',
            props: {
              readonly: readOnly,
              variant: 'outlined',
              showStatus: true,
            },
          };
        } else if (property.format === 'date-time') {
          return {
            componentName: 'ui-calendar',
            props: {
              readonly: readOnly,
              variant: 'outlined',
              showStatus: true,
              includeTime: true,
            },
          };
        } else if (property.format === 'color') {
          return {
            componentName: 'ui-color-picker',
            props: {
              readonly: readOnly,
              variant: 'outlined',
              showStatus: true,
            },
          };
        } else {
          return {
            componentName: 'ui-text',
            props: {
              readonly: readOnly,
              variant: 'outlined',
              showStatus: true,
            },
          };
        }

      default:
        return null;
    }
  }

  /**
   * Maps a WoT action to the most appropriate UI component
   */
  static mapActionToComponent(action: any): {
    componentName: ComponentName;
    props: any;
  } | null {
    const { input } = action;

    if (input && input.type === 'object' && input.properties?.file) {
      // File upload action
      return {
        componentName: 'ui-file-picker',
        props: {
          variant: 'outlined',
          showStatus: true,
          accept: input.properties.file.contentMediaType || '*/*',
        },
      };
    } else {
      // Generic action button
      return {
        componentName: 'ui-button',
        props: {
          variant: 'outlined',
          showStatus: true,
          label: action.title || 'Execute',
        },
      };
    }
  }

  /**
   * Maps a WoT event to the most appropriate UI component
   */
  static mapEventToComponent(_event: any): {
    componentName: ComponentName;
    props: any;
  } | null {
    return {
      componentName: 'ui-event',
      props: {
        showStatus: true,
        maxEvents: 50,
        showTimestamps: true,
        autoScroll: true,
      },
    };
  }

  /**
   * Returns all possible component mappings for a given event
   */
  static getAllPossibleComponentsForEvent(_event: any): Array<{
    componentName: ComponentName;
    props: any;
  }> {
    // Events can be displayed using ui-event or ui-notification
    return [
      {
        componentName: 'ui-event',
        props: {
          showStatus: true,
          maxEvents: 50,
          showTimestamps: true,
          autoScroll: true,
        },
      },
      {
        componentName: 'ui-notification',
        props: {
          type: 'info',
          showStatus: true,
          duration: 5000,
        },
      },
    ];
  }

  /**
   * Returns all possible component mappings for a given property
   */
  static getAllPossibleComponents(property: any): Array<{
    componentName: ComponentName;
    props: any;
  }> {
    const { type, minimum, maximum, format, readOnly } = property;
    const possibilities: Array<{ componentName: ComponentName; props: any }> = [];

    switch (type) {
      case 'boolean':
        // Boolean properties can use toggle or checkbox
        possibilities.push({
          componentName: 'ui-toggle',
          props: {
            readonly: readOnly,
            variant: 'outlined',
            showStatus: true,
          },
        });
        possibilities.push({
          componentName: 'ui-checkbox',
          props: {
            readonly: readOnly,
            variant: 'outlined',
            showStatus: true,
          },
        });
        break;

      case 'integer':
      case 'number':
        // For integers and numbers, always provide both slider and number picker options
        // but prioritize slider when there's a reasonable range
        if (minimum !== undefined && maximum !== undefined) {
          const range = maximum - minimum;
          // Always add slider for ranged values
          possibilities.push({
            componentName: 'ui-slider',
            props: {
              min: minimum,
              max: maximum,
              readonly: readOnly,
              variant: 'outlined',
              showStatus: true,
              showMinMax: true,
              step: type === 'integer' ? 1 : undefined,
            },
          });
        }

        // Always add number picker as an option
        possibilities.push({
          componentName: 'ui-number-picker',
          props: {
            min: minimum,
            max: maximum,
            readonly: readOnly,
            variant: 'outlined',
            showStatus: true,
            precision: type === 'integer' ? 0 : undefined,
          },
        });
        break;

      case 'string':
        // String properties have multiple options based on format
        if (format === 'date-time' || format === 'date') {
          possibilities.push({
            componentName: 'ui-calendar',
            props: {
              readonly: readOnly,
              variant: 'outlined',
              showStatus: true,
              includeTime: format === 'date-time',
            },
          });
        } else if (format === 'color') {
          possibilities.push({
            componentName: 'ui-color-picker',
            props: {
              readonly: readOnly,
              variant: 'outlined',
              showStatus: true,
            },
          });
        }

        // All string properties can use text input
        possibilities.push({
          componentName: 'ui-text',
          props: {
            readonly: readOnly,
            variant: 'outlined',
            showStatus: true,
          },
        });
        break;

      case 'array':
        // Array properties might be used for file uploads
        if (format === 'binary' || property.contentMediaType) {
          possibilities.push({
            componentName: 'ui-file-picker',
            props: {
              variant: 'outlined',
              showStatus: true,
              accept: property.contentMediaType || '*/*',
              multiple: true,
            },
          });
        }
        break;
    }

    return possibilities;
  }
}

// ============================================================================
// INTEGRATION HELPERS
// ============================================================================

/**
 * Utility functions for component integration
 */
export class IntegrationHelpers {
  /**
   * Waits for all specified components to be defined
   */
  static async waitForComponents(componentNames: ComponentName[]): Promise<void> {
    await Promise.all(componentNames.map(name => customElements.whenDefined(name)));
  }

  /**
   * Sets up event listeners for component communication
   */
  static setupComponentCommunication(sourceComponent: HTMLElement, targetComponent: HTMLElement, eventType: string = 'valueMsg'): () => void {
    const handler = (event: CustomEvent<UiMsg>) => {
      console.log(`Component communication: ${sourceComponent.tagName} -> ${targetComponent.tagName}`, event.detail);

      // Forward the event to the target component if it has a setValue method
      if ('setValue' in targetComponent && typeof targetComponent.setValue === 'function') {
        (targetComponent as any).setValue(event.detail.newVal);
      }
    };

    sourceComponent.addEventListener(eventType, handler as EventListener);

    // Return cleanup function
    return () => {
      sourceComponent.removeEventListener(eventType, handler as EventListener);
    };
  }

  /**
   * Creates a synchronized group of components that share the same value
   */
  static createSynchronizedGroup(components: HTMLElement[]): () => void {
    const cleanupFunctions: (() => void)[] = [];

    components.forEach((component, index) => {
      components.forEach((otherComponent, otherIndex) => {
        if (index !== otherIndex) {
          const cleanup = IntegrationHelpers.setupComponentCommunication(component, otherComponent);
          cleanupFunctions.push(cleanup);
        }
      });
    });

    // Return cleanup function for the entire group
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }

  /**
   * Applies a theme to all components in a container
   */
  static applyTheme(
    container: HTMLElement,
    theme: {
      dark?: boolean;
      color?: 'primary' | 'secondary' | 'neutral';
      variant?: 'minimal' | 'outlined' | 'filled';
    },
  ): void {
    const components = container.querySelectorAll('[class*="ui-"]');

    components.forEach(component => {
      Object.entries(theme).forEach(([key, value]) => {
        if (key in component) {
          (component as any)[key] = value;
        }
      });
    });
  }

  /**
   * Validates component configuration against WoT Thing Description
   */
  static validateComponentConfig(componentName: ComponentName, props: any, tdAffordance: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation rules
    if (componentName.includes('ui-slider') || componentName.includes('ui-number-picker')) {
      if (props.min !== undefined && props.max !== undefined && props.min >= props.max) {
        errors.push('Minimum value must be less than maximum value');
      }

      if (tdAffordance.minimum !== undefined && props.min < tdAffordance.minimum) {
        errors.push(`Minimum value ${props.min} is below Thing Description minimum ${tdAffordance.minimum}`);
      }

      if (tdAffordance.maximum !== undefined && props.max > tdAffordance.maximum) {
        errors.push(`Maximum value ${props.max} is above Thing Description maximum ${tdAffordance.maximum}`);
      }
    }

    if (componentName === 'ui-text' && tdAffordance.maxLength !== undefined && props.maxLength > tdAffordance.maxLength) {
      errors.push(`Max length ${props.maxLength} exceeds Thing Description max length ${tdAffordance.maxLength}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Creates a status monitor for multiple components
   */
  static createStatusMonitor(components: HTMLElement[]): {
    getStatus: () => Record<string, OperationStatus>;
    onStatusChange: (callback: (statuses: Record<string, OperationStatus>) => void) => () => void;
  } {
    const statusCallbacks: ((statuses: Record<string, OperationStatus>) => void)[] = [];

    const getStatus = (): Record<string, OperationStatus> => {
      const statuses: Record<string, OperationStatus> = {};

      components.forEach(component => {
        const id = component.id || component.tagName.toLowerCase();
        if ('operationStatus' in component) {
          statuses[id] = (component as any).operationStatus;
        }
      });

      return statuses;
    };

    const onStatusChange = (callback: (statuses: Record<string, OperationStatus>) => void) => {
      statusCallbacks.push(callback);

      // Setup observers for each component
      const observers = components.map(component => {
        const observer = new MutationObserver(() => {
          const statuses = getStatus();
          statusCallbacks.forEach(cb => cb(statuses));
        });

        observer.observe(component, {
          attributes: true,
          attributeFilter: ['operation-status'],
        });

        return observer;
      });

      // Return cleanup function
      return () => {
        observers.forEach(observer => observer.disconnect());
        const index = statusCallbacks.indexOf(callback);
        if (index > -1) {
          statusCallbacks.splice(index, 1);
        }
      };
    };

    return { getStatus, onStatusChange };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Classes are exported at their definitions above
