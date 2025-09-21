/**
 * UI-WoT Component Factory and Integration Utilities
 *
 * This module provides utilities for creating, managing, and integrating
 * UI-WoT components with Web of Things (WoT) devices seamlessly.
 */

import { ComponentName, ComponentInitOptions, WotIntegrationOptions, UiMsg, OperationStatus } from '../types/component-interfaces';

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
  static async create<T extends ComponentName>(options: ComponentInitOptions<T>): Promise<HTMLElement> {
    const { name, props = {}, target, id, wot } = options;

    // Wait for component to be defined
    await customElements.whenDefined(name);

    // Create element
    const element = document.createElement(name as unknown as string) as HTMLElement;

    // Set ID if provided
    if (id) {
      (element as HTMLElement).id = id;
    }

    // Apply props
    Object.entries(props).forEach(([key, value]) => {
      (element as any)[key] = value;
    });

    // Attach to target if provided
    if (target) {
      const targetElement = typeof target === 'string' ? document.querySelector(target) : target;

      if (targetElement) {
        targetElement.appendChild(element as unknown as Node);
      }
    }

    // Setup WoT integration if provided
    if (wot) {
      await ComponentFactory.setupWotIntegration(element as HTMLElement, wot);
    }

    // Register component
    const elementId = (element as HTMLElement).id || `${name}-${Date.now()}`;
    ComponentFactory.registeredComponents.set(elementId, element as HTMLElement);

    return element;
  }

  /**
   * Gets a registered component by ID
   */
  static get(id: string): HTMLElement | null {
    const element = ComponentFactory.registeredComponents.get(id);
    return element || null;
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
  private static async setupWotIntegration<T extends ComponentName>(component: HTMLElement, wot: WotIntegrationOptions): Promise<void> {
    const tagName = component.tagName.toLowerCase() as unknown as T;

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
  private static async setupButtonWoT(button: HTMLElement, wot: WotIntegrationOptions): Promise<void> {
    if (wot.invokeAction) {
      await (button as any).setAction(async () => {
        return await wot.invokeAction!('execute');
      });
    }
  }

  /**
   * Setup WoT integration for boolean value components (toggle, checkbox)
   */
  private static async setupBooleanWoT(component: HTMLElement, wot: WotIntegrationOptions): Promise<void> {
    if (wot.writeProperty && wot.readProperty) {
      // Read initial value
      try {
        const initialValue = await wot.readProperty('value');
        await (component as any).setValue(initialValue, {
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
  private static async setupNumericWoT(component: HTMLElement, wot: WotIntegrationOptions): Promise<void> {
    if (wot.writeProperty && wot.readProperty) {
      // Read initial value
      try {
        const initialValue = await wot.readProperty('value');
        await (component as any).setValue(initialValue, {
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
  private static async setupStringWoT(component: HTMLElement, wot: WotIntegrationOptions): Promise<void> {
    if (wot.writeProperty && wot.readProperty) {
      // Read initial value
      try {
        const initialValue = await wot.readProperty('value');
        await (component as any).setValue(initialValue, {
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
  private static async setupFilePickerWoT(filePicker: HTMLElement, wot: WotIntegrationOptions): Promise<void> {
    if (wot.invokeAction && wot.writeProperty) {
      await (filePicker as any).setUpload(
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
  private static async setupEventWoT(eventComponent: HTMLElement, wot: WotIntegrationOptions): Promise<void> {
    if (wot.subscribeEvent) {
      await wot.subscribeEvent('dataChanged', (eventData: any) => {
        (eventComponent as any).addEvent(eventData);
      });
      await (eventComponent as any).startListening();
    }
  }

  /**
   * Setup WoT integration for notification components
   */
  private static async setupNotificationWoT(notification: HTMLElement, wot: WotIntegrationOptions): Promise<void> {
    if (wot.subscribeEvent) {
      await wot.subscribeEvent('alert', (_alertData: any) => {
        (notification as any).show();
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
   * Infer canRead/canWrite from TD flags and forms
   */
  private static analyzeCapabilities(property: any): { canRead: boolean; canWrite: boolean } {
    let canRead = true;
    let canWrite = true;
    if (!property) return { canRead, canWrite };

    if (property.readOnly === true) canWrite = false;
    if (property.writeOnly === true) canRead = false;

    if (Array.isArray(property.forms)) {
      const ops: string[] = [];
      for (const f of property.forms) {
        if (!f) continue;
        if (typeof f.op === 'string') ops.push(f.op);
        else if (Array.isArray(f.op)) ops.push(...f.op);
      }
      if (ops.length > 0) {
        const hasRead = ops.some(o => /readproperty/i.test(o));
        const hasWrite = ops.some(o => /writeproperty/i.test(o));
        // Only override if explicit ops provided
        canRead = hasRead;
        canWrite = hasWrite;
      }
    }

    return { canRead, canWrite };
  }
  /**
   * Maps a WoT property to the most appropriate UI component
   */
  static mapPropertyToComponent(property: any): {
    componentName: string;
    props: any;
  } | null {
    const { type, minimum, maximum, enum: enumValues } = property;
    const { canWrite } = this.analyzeCapabilities(property);
    const readOnly = !canWrite;

    switch (type) {
      case 'boolean':
        return {
          componentName: 'ui-toggle',
          props: {
            readonly: readOnly,
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
              mode: readOnly ? 'readonly' : 'editable',
            },
          };
        } else if (property.format === 'date-time' || property.format === 'date') {
          return {
            componentName: 'ui-calendar',
            props: {
              readonly: readOnly,
              includeTime: property.format === 'date-time',
            },
          };
        } else if (property.format === 'color') {
          return {
            componentName: 'ui-color-picker',
            props: {
              readonly: readOnly,
            },
          };
        } else {
          return {
            componentName: 'ui-text',
            props: {
              readonly: readOnly,
              mode: readOnly ? 'readonly' : 'editable',
            },
          };
        }

      case 'object':
        return {
          componentName: 'ui-object' as unknown as ComponentName,
          props: {
            readonly: readOnly,
          },
        };

      case 'array':
        // Represent arrays using text in structured mode
        return {
          componentName: 'ui-text',
          props: {
            readonly: readOnly,
            mode: 'structured',
            spellcheck: false,
          },
        };

      default:
        return null;
    }
  }

  /**
   * Maps a WoT action to the most appropriate UI component
   */
  static mapActionToComponent(action: any): {
    componentName: string;
    props: any;
  } | null {
    const { input } = action;

    if (input && input.type === 'object' && input.properties?.file) {
      // File upload action
      return {
        componentName: 'ui-file-picker',
        props: {
          accept: input.properties.file.contentMediaType || '*/*',
        },
      };
    } else {
      // Generic action button
      return {
        componentName: 'ui-button',
        props: {},
      };
    }
  }

  /**
   * Maps a WoT event to the most appropriate UI component
   */
  static mapEventToComponent(_event: any): {
    componentName: string;
    props: any;
  } | null {
    return {
      componentName: 'ui-event',
      props: {},
    };
  }

  /**
   * Returns all possible component mappings for a given event
   */
  static getAllPossibleComponentsForEvent(_event: any): Array<{
    componentName: string;
    props: any;
  }> {
    // Events can be displayed using ui-event or ui-notification
    return [
      {
        componentName: 'ui-event',
        props: {},
      },
      {
        componentName: 'ui-notification',
        props: {},
      },
    ];
  }

  /**
   * Returns all possible component mappings for a given property
   */
  static getAllPossibleComponents(property: any): Array<{
    componentName: string;
    props: any;
  }> {
    const { type, minimum, maximum, format } = property;
    const { canWrite } = this.analyzeCapabilities(property);
    const readOnly = !canWrite;
    const possibilities: Array<{ componentName: ComponentName; props: any }> = [];

    switch (type) {
      case 'boolean':
        // Boolean properties can use toggle or checkbox
        possibilities.push({
          componentName: 'ui-toggle',
          props: {
            readonly: readOnly,
          },
        });
        possibilities.push({
          componentName: 'ui-checkbox',
          props: {
            readonly: readOnly,
          },
        });
        break;

      case 'integer':
      case 'number':
        // For integers and numbers, always provide both slider and number picker options
        // but prioritize slider when there's a reasonable range
        if (minimum !== undefined && maximum !== undefined) {
          // Always add slider for ranged values
          possibilities.push({
            componentName: 'ui-slider',
            props: {
              min: minimum,
              max: maximum,
              readonly: readOnly,
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
              includeTime: format === 'date-time',
            },
          });
        } else if (format === 'color') {
          possibilities.push({
            componentName: 'ui-color-picker',
            props: {
              readonly: readOnly,
            },
          });
        }

        // All string properties can use text input
        possibilities.push({
          componentName: 'ui-text',
          props: {
            readonly: readOnly,
            mode: readOnly ? 'readonly' : 'editable',
          },
        });
        break;

      case 'object':
        possibilities.push({
          componentName: 'ui-object' as unknown as ComponentName,
          props: {
            readonly: readOnly,
          },
        });
        break;

      case 'array':
        // Use text component in structured mode for arrays
        possibilities.push({
          componentName: 'ui-text',
          props: {
            readonly: readOnly,
            mode: 'structured',
            spellcheck: false,
          },
        });
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
