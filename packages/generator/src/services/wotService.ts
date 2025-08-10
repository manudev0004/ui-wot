import { ThingDescription } from 'wot-thing-description-types';
import { ParsedAffordance, TDSource } from '../types';

class WoTService {
  private servient: any;
  private things: Map<string, any> = new Map();

  constructor() {
    // For browser environment, we'll use a mock servient
    this.servient = {
      start: async () => {},
      addThing: async (td: ThingDescription) => this.createMockThing(td),
      shutdown: async () => {},
    };
  }

  async start() {
    console.log('WoT Service started in browser mode');
  }

  private createMockThing(td: ThingDescription) {
    // Create a mock thing for demonstration purposes
    const mockThing = {
      readProperty: async (propertyKey: string) => {
        console.log(`Reading property: ${propertyKey}`);
        // Return mock values based on property type
        const property = td.properties?.[propertyKey];
        if (property) {
          switch (property.type) {
            case 'boolean':
              return Math.random() > 0.5;
            case 'integer':
            case 'number':
              const min = property.minimum || 0;
              const max = property.maximum || 100;
              return Math.floor(Math.random() * (max - min + 1)) + min;
            case 'string':
              return `Mock value for ${propertyKey}`;
            default:
              return null;
          }
        }
        return null;
      },
      writeProperty: async (propertyKey: string, value: any) => {
        console.log(`Writing property ${propertyKey}:`, value);
        return value;
      },
      invokeAction: async (actionKey: string, input?: any) => {
        console.log(`Invoking action ${actionKey}:`, input);
        return { success: true, timestamp: new Date().toISOString() };
      },
      subscribeEvent: async (eventKey: string, callback: (data: any) => void) => {
        console.log(`Subscribed to event: ${eventKey}`);
        // Simulate periodic events for demo
        setTimeout(() => {
          callback({ 
            message: `Mock event from ${eventKey}`, 
            timestamp: new Date().toISOString() 
          });
        }, 2000);
      },
    };

    return mockThing;
  }

  async parseTDFromSource(source: TDSource): Promise<ThingDescription> {
    let tdContent: string;

    if (source.type === 'url') {
      const response = await fetch(source.content as string);
      if (!response.ok) {
        throw new Error(`Failed to fetch TD from URL: ${response.statusText}`);
      }
      tdContent = await response.text();
    } else {
      // File content
      const file = source.content as File;
      tdContent = await this.readFileAsText(file);
    }

    try {
      const td = JSON.parse(tdContent) as ThingDescription;
      this.validateTD(td);
      return td;
    } catch (error) {
      throw new Error(`Invalid Thing Description: ${error}`);
    }
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private validateTD(td: ThingDescription): void {
    if (!td['@context']) {
      throw new Error('Missing @context in Thing Description');
    }
    if (!td.title) {
      throw new Error('Missing title in Thing Description');
    }
  }

  async createThing(td: ThingDescription): Promise<any> {
    try {
      const thing = this.servient.addThing(td);
      
      if (td.id) {
        this.things.set(td.id, thing);
      }
      
      return thing;
    } catch (error) {
      console.error('Failed to create thing:', error);
      throw error;
    }
  }

  parseAffordances(td: ThingDescription): ParsedAffordance[] {
    const affordances: ParsedAffordance[] = [];

    // Parse properties
    if (td.properties) {
      Object.entries(td.properties).forEach(([key, property]) => {
        affordances.push({
          key,
          type: 'property',
          title: property.title || key,
          description: property.description,
          schema: property,
          forms: property.forms,
          suggestedComponent: this.suggestComponentForProperty(property),
          availableVariants: this.getAvailableVariants(this.suggestComponentForProperty(property))
        });
      });
    }

    // Parse actions
    if (td.actions) {
      Object.entries(td.actions).forEach(([key, action]) => {
        affordances.push({
          key,
          type: 'action',
          title: action.title || key,
          description: action.description,
          schema: action,
          forms: action.forms,
          suggestedComponent: this.suggestComponentForAction(action),
          availableVariants: this.getAvailableVariants(this.suggestComponentForAction(action))
        });
      });
    }

    // Parse events
    if (td.events) {
      Object.entries(td.events).forEach(([key, event]) => {
        affordances.push({
          key,
          type: 'event',
          title: event.title || key,
          description: event.description,
          schema: event,
          forms: event.forms,
          suggestedComponent: 'ui-text', // Events typically display text
          availableVariants: ['default']
        });
      });
    }

    return affordances;
  }

  private suggestComponentForProperty(property: any): string {
    if (!property.type) return 'ui-text';

    switch (property.type) {
      case 'boolean':
        return 'ui-toggle';
      case 'number':
      case 'integer':
        if (property.minimum !== undefined && property.maximum !== undefined) {
          return 'ui-slider';
        }
        return 'ui-number-picker';
      case 'string':
        if (property.format === 'date') {
          return 'ui-calendar';
        }
        return 'ui-text';
      default:
        return 'ui-text';
    }
  }

  private suggestComponentForAction(_action: any): string {
    // Actions are typically buttons
    return 'ui-button';
  }

  private getAvailableVariants(componentType: string): string[] {
    // Based on your Stencil components, return available variants
    const variantMap: Record<string, string[]> = {
      'ui-button': ['primary', 'secondary', 'danger'],
      'ui-toggle': ['default', 'switch'],
      'ui-slider': ['default', 'range'],
      'ui-text': ['default', 'multiline'],
      'ui-number-picker': ['default', 'stepper'],
      'ui-calendar': ['default', 'compact'],
      'ui-checkbox': ['default', 'switch'],
      'ui-heading': ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
    };

    return variantMap[componentType] || ['default'];
  }

  async interactWithProperty(thing: any, propertyKey: string, value?: any): Promise<any> {
    try {
      if (value !== undefined) {
        // Write property
        await thing.writeProperty(propertyKey, value);
        return value;
      } else {
        // Read property
        return await thing.readProperty(propertyKey);
      }
    } catch (error) {
      console.error(`Failed to interact with property ${propertyKey}:`, error);
      throw error;
    }
  }

  async invokeAction(thing: any, actionKey: string, input?: any): Promise<any> {
    try {
      return await thing.invokeAction(actionKey, input);
    } catch (error) {
      console.error(`Failed to invoke action ${actionKey}:`, error);
      throw error;
    }
  }

  async subscribeToEvent(thing: any, eventKey: string, callback: (data: any) => void): Promise<void> {
    try {
      await thing.subscribeEvent(eventKey, callback);
    } catch (error) {
      console.error(`Failed to subscribe to event ${eventKey}:`, error);
      throw error;
    }
  }

  getThing(thingId: string): any {
    return this.things.get(thingId);
  }

  async stop() {
    await this.servient.shutdown();
    this.things.clear();
    console.log('WoT Service stopped');
  }
}

export const wotService = new WoTService();
