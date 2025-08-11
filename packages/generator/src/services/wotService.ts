// Use browser-compatible imports
import '@node-wot/browser-bundle';
import { ThingDescription } from 'wot-thing-description-types';
import { ParsedAffordance, TDSource } from '../types';

declare global {
  const WoT: any;
}

class WoTService {
  private wot: any;
  private things: Map<string, any> = new Map();

  constructor() {
    // Will be initialized in start()
  }

  async start() {
    try {
      // Try to use global WoT from browser bundle
      if (typeof WoT !== 'undefined') {
        this.wot = WoT;
        console.log('WoT Service started with browser bundle');
      } else {
        throw new Error('WoT not available');
      }
    } catch (error) {
      console.warn('Failed to start WoT service, using mock mode:', error);
      this.initMockMode();
    }
  }

  private initMockMode() {
    this.wot = {
      consume: (td: ThingDescription) => this.createMockThing(td)
    };
  }

  private createMockThing(td: ThingDescription) {
    return {
      readProperty: async (propertyKey: string) => {
        const property = td.properties?.[propertyKey];
        if (property) {
          switch (property.type) {
            case 'boolean': return Math.random() > 0.5;
            case 'integer':
            case 'number':
              const min = property.minimum || 0;
              const max = property.maximum || 100;
              return Math.floor(Math.random() * (max - min + 1)) + min;
            case 'string': return `Mock value for ${propertyKey}`;
            default: return null;
          }
        }
        return null;
      },
      writeProperty: async (propertyKey: string, value: any) => {
        console.log(`Mock write ${propertyKey}:`, value);
        return value;
      },
      invokeAction: async (actionKey: string, input?: any) => {
        console.log(`Mock action ${actionKey}:`, input);
        return { result: 'success' };
      }
    };
  }

  async parseTDFromSource(source: TDSource): Promise<ThingDescription> {
    let tdContent: string;

    if (source.type === 'url') {
      const response = await fetch(source.content as string);
      if (!response.ok) {
        throw new Error(`Failed to fetch TD: ${response.statusText}`);
      }
      tdContent = await response.text();
    } else {
      tdContent = await this.readFileAsText(source.content as File);
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
      const thing = this.wot ? await this.wot.consume(td) : this.createMockThing(td);
      
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
          suggestedComponent: 'ui-button',
          availableVariants: ['minimal', 'outlined', 'filled']
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
          suggestedComponent: 'ui-text',
          availableVariants: ['minimal']
        });
      });
    }

    return affordances;
  }

  private suggestComponentForProperty(property: any): string {
    if (!property.type) return 'ui-text';

    // Boolean properties -> toggle
    if (property.type === 'boolean') {
      return 'ui-toggle';
    }

    // Numeric properties with min/max -> slider or number picker
    if (property.type === 'integer' || property.type === 'number') {
      if (property.minimum !== undefined && property.maximum !== undefined) {
        const range = property.maximum - property.minimum;
        if (range <= 1000) {
          return 'ui-slider';
        }
      }
      return 'ui-number-picker';
    }

    // String properties
    if (property.type === 'string') {
      if (property.format === 'date' || property.format === 'date-time') {
        return 'ui-calendar';
      }
      return 'ui-text';
    }

    return 'ui-text';
  }

  private getAvailableVariants(componentType: string): string[] {
    const variantMap: Record<string, string[]> = {
      'ui-button': ['minimal', 'outlined', 'filled'],
      'ui-toggle': ['circle', 'rounded', 'square'],
      'ui-slider': ['narrow', 'wide', 'rainbow', 'neon', 'stepped'],
      'ui-text': ['minimal', 'outlined', 'filled'],
      'ui-number-picker': ['minimal', 'outlined', 'filled'],
      'ui-calendar': ['minimal', 'outlined', 'filled'],
      'ui-checkbox': ['minimal', 'outlined', 'filled'],
      'ui-heading': ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
    };

    return variantMap[componentType] || ['minimal'];
  }

  async interactWithProperty(thing: any, propertyKey: string, value?: any): Promise<any> {
    try {
      if (value !== undefined) {
        return await thing.writeProperty(propertyKey, value);
      } else {
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

  getThing(thingId: string): any {
    return this.things.get(thingId);
  }

  async stop() {
    this.things.clear();
    console.log('WoT Service stopped');
  }
}

export const wotService = new WoTService();
