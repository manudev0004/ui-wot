// import '@node-wot/browser-bundle';
import { ParsedAffordance, TDSource } from '../types';

class WoTService {
  private wot: any;
  private things: Map<string, any> = new Map();

  constructor() {}

  async start() {
    try {
      // Use the browser bundle WoT implementation directly
      const globalWoT = (globalThis as any).WoT;
      if (typeof globalWoT !== 'undefined') {
        // Check if WoT has the expected structure from @node-wot/browser-bundle
        if (globalWoT.Core && globalWoT.Core.Servient && globalWoT.Http) {
          // Use the proper WoT browser bundle pattern
          const servient = new globalWoT.Core.Servient();
          servient.addClientFactory(new globalWoT.Http.HttpClientFactory());
          this.wot = await servient.start();
          console.log('WoT Service started with browser bundle');
        } else if (typeof globalWoT.consume === 'function') {
          // Direct WoT object with consume method
          this.wot = globalWoT;
          console.log('WoT Service started with direct WoT object');
        } else {
          // WoT object exists but doesn't have expected API
          console.warn('WoT object found but API structure unexpected, using no-op mode');
          this.initNoopMode();
        }
      } else {
        // Do not attempt to start real WoT in this environment.
        // Use a lightweight no-op implementation so the rest of the app can operate
        // without attempting network connections or producing noisy logs.
        this.initNoopMode();
      }
    } catch (error) {
      // If anything unexpected happens, fall back silently to noop mode
      console.warn('Failed to initialize WoT, using no-op mode:', error);
      this.initNoopMode();
    }
  }
  private initNoopMode() {
    this.wot = {
      // consume returns a lightweight no-op thing instance
      consume: (td: any) => this.createNoopThing(td),
    };
  }

  private createNoopThing(_td: any) {
    return {
      // readProperty returns undefined (no real data)
      readProperty: async (_propertyKey: string) => {
        return undefined;
      },
      // writeProperty resolves to the provided value but performs no network calls
      writeProperty: async (_propertyKey: string, value: any) => {
        return value;
      },
      // invokeAction resolves with a neutral result
      invokeAction: async (_actionKey: string, _input?: any) => {
        return { result: 'noop' };
      },
    };
  }

  async parseTDFromSource(source: TDSource): Promise<any> {
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
      const td = JSON.parse(tdContent) as any;
      this.validateTD(td);
      return td;
    } catch (error) {
      throw new Error(`Invalid Thing Description: ${error}`);
    }
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private validateTD(td: any): void {
    if (!td['@context']) {
      throw new Error('Missing @context in Thing Description');
    }
    if (!td.title) {
      throw new Error('Missing title in Thing Description');
    }
  }

  async createThing(td: any): Promise<any> {
    try {
      const thing = this.wot ? await this.wot.consume(td) : this.createNoopThing(td);

      if (td.id) {
        this.things.set(td.id, thing);
      }

      return thing;
    } catch (error) {
      console.error('Failed to create thing:', error);
      throw error;
    }
  }

  // Allow external code to register a thing under a custom key (for example, tdInfo.id)
  registerThing(key: string, thing: any) {
    try {
      if (key && thing) {
        // Always keep a local registry for generator pages to look up by arbitrary keys
        this.things.set(key, thing);

        // If the library exposes an API to register aliases, prefer using it in future.
        // Currently the components library does not provide a register/alias API.
      }
    } catch (err) {
      console.error('Failed to register thing:', err);
    }
  }

  parseAffordances(td: any): ParsedAffordance[] {
    const affordances: ParsedAffordance[] = [];

    // Parse properties
    if (td.properties) {
      Object.entries(td.properties).forEach(([key, property]: [string, any]) => {
        affordances.push({
          key,
          type: 'property',
          title: property.title || key,
          description: property.description,
          schema: property,
          forms: property.forms,
          suggestedComponent: this.suggestComponentForProperty(property),
          availableVariants: this.getAvailableVariants(this.suggestComponentForProperty(property)),
          // Provide a list of possible components (e.g., slider and number-picker for numeric types)
          possibleComponents: this.getPossibleComponentsForProperty(property),
        });
      });
    }

    // Parse actions
    if (td.actions) {
      Object.entries(td.actions).forEach(([key, action]: [string, any]) => {
        affordances.push({
          key,
          type: 'action',
          title: action.title || key,
          description: action.description,
          schema: action,
          forms: action.forms,
          suggestedComponent: 'ui-button',
          availableVariants: ['minimal', 'outlined', 'filled'],
          possibleComponents: ['ui-button'],
        });
      });
    }

    // Parse events
    if (td.events) {
      Object.entries(td.events).forEach(([key, event]: [string, any]) => {
        affordances.push({
          key,
          type: 'event',
          title: event.title || key,
          description: event.description,
          schema: event,
          forms: event.forms,
          suggestedComponent: 'ui-text',
          availableVariants: ['minimal'],
          possibleComponents: ['ui-text'],
        });
      });
    }

    return affordances;
  }

  private suggestComponentForProperty(property: any): string {
    if (!property.type) return 'ui-text';
    if (property.type === 'boolean') {
      return 'ui-toggle';
    }

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
      'ui-heading': ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    };

    return variantMap[componentType] || ['minimal'];
  }

  // Return possible components for a property based on its type and schema
  private getPossibleComponentsForProperty(property: any): string[] {
    if (!property.type) return ['ui-text'];
    if (property.type === 'boolean') return ['ui-toggle', 'ui-checkbox'];
    if (property.type === 'integer' || property.type === 'number') {
      // For numeric properties, allow slider and number-picker
      return ['ui-slider', 'ui-number-picker'];
    }
    if (property.type === 'string') {
      if (property.format === 'date' || property.format === 'date-time') return ['ui-calendar', 'ui-text'];
      return ['ui-text'];
    }
    return ['ui-text'];
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
    // Prefer local registry first
    const local = this.things.get(thingId);
    if (local) return local;

    return undefined;
  }

  async stop() {
    this.things.clear();
    console.log('WoT Service stopped');
  }
}

export const wotService = new WoTService();
