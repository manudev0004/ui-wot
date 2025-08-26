import { debug } from '../utils/common-props';
import { UiMsg } from '../utils/types';

// Simple WoT types
export interface ThingDescription {
  id: string;
  title?: string;
  '@context'?: any;
  '@type'?: string;
  properties?: { [key: string]: PropertyElement };
  actions?: { [key: string]: any };
  events?: { [key: string]: any };
  [key: string]: any;
}

export interface PropertyElement {
  title?: string;
  type?: string;
  description?: string;
  readOnly?: boolean;
  writeOnly?: boolean;
  observable?: boolean;
  forms?: any[];
  [key: string]: any;
}

export interface ConsumedThing {
  readProperty(name: string): Promise<any>;
  writeProperty(name: string, value: any): Promise<void>;
  observeProperty(name: string, callback: (value: any) => void): () => void;
  getThingDescription(): ThingDescription;
}

/**
 * Simplified WoT Service - Direct node-wot integration
 */
export class SimpleWoTService {
  private things = new Map<string, ConsumedThing>();
  private subscriptions = new Map<string, () => void>();

  /**
   * Load and consume a Thing Description
   */
  async loadThing(url: string): Promise<string> {
    try {
      debug('Loading TD from:', url);
      
      // Use node-wot browser bundle directly
      const WoT = (window as any).WoT;
      if (!WoT) {
        throw new Error('WoT not available. Include node-wot browser bundle.');
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch TD: ${response.status}`);
      }

      const td: ThingDescription = await response.json();
      const thing = await WoT.consume(td);
      
      this.things.set(td.id, thing);
      debug('Thing loaded:', td.id);
      
      return td.id;
    } catch (error) {
      debug('Error loading thing:', error);
      throw error;
    }
  }

  /**
   * Read property value
   */
  async readProperty(thingId: string, propertyName: string): Promise<UiMsg<any>> {
    try {
      const thing = this.things.get(thingId);
      if (!thing) {
        throw new Error(`Thing not found: ${thingId}`);
      }

      const value = await thing.readProperty(propertyName);
      debug('Property read:', thingId, propertyName, value);
      
      return {
        ok: true,
        payload: value,
        ts: Date.now(),
        source: `${thingId}.${propertyName}`
      };
    } catch (error) {
      debug('Error reading property:', error);
      return {
        ok: false,
        error: { message: error.message },
        payload: null,
        ts: Date.now(),
        source: `${thingId}.${propertyName}`
      };
    }
  }

  /**
   * Write property value
   */
  async writeProperty(thingId: string, propertyName: string, value: any): Promise<UiMsg<any>> {
    try {
      const thing = this.things.get(thingId);
      if (!thing) {
        throw new Error(`Thing not found: ${thingId}`);
      }

      await thing.writeProperty(propertyName, value);
      debug('Property written:', thingId, propertyName, value);
      
      return {
        ok: true,
        payload: value,
        ts: Date.now(),
        source: `${thingId}.${propertyName}`
      };
    } catch (error) {
      debug('Error writing property:', error);
      return {
        ok: false,
        error: { message: error.message },
        payload: value,
        ts: Date.now(),
        source: `${thingId}.${propertyName}`
      };
    }
  }

  /**
   * Observe property changes
   */
  async observeProperty(
    thingId: string, 
    propertyName: string, 
    callback: (msg: UiMsg<any>) => void
  ): Promise<() => void> {
    try {
      const thing = this.things.get(thingId);
      if (!thing) {
        throw new Error(`Thing not found: ${thingId}`);
      }

      const unsubscribe = thing.observeProperty(propertyName, (value) => {
        debug('Property observed:', thingId, propertyName, value);
        callback({
          ok: true,
          payload: value,
          ts: Date.now(),
          source: `${thingId}.${propertyName}`
        });
      });

      const subscriptionKey = `${thingId}.${propertyName}`;
      this.subscriptions.set(subscriptionKey, unsubscribe);
      
      return () => {
        unsubscribe();
        this.subscriptions.delete(subscriptionKey);
      };
    } catch (error) {
      debug('Error observing property:', error);
      callback({
        ok: false,
        error: { message: error.message },
        payload: null,
        ts: Date.now(),
        source: `${thingId}.${propertyName}`
      });
      return () => {}; // Empty cleanup function
    }
  }

  /**
   * Get Thing Description
   */
  getThingDescription(thingId: string): ThingDescription | null {
    const thing = this.things.get(thingId);
    return thing ? thing.getThingDescription() : null;
  }

  /**
   * Check if thing is loaded
   */
  hasThing(thingId: string): boolean {
    return this.things.has(thingId);
  }

  /**
   * Get all loaded things
   */
  getLoadedThings(): string[] {
    return Array.from(this.things.keys());
  }

  /**
   * Clean up all subscriptions
   */
  cleanup(): void {
    debug('Cleaning up subscriptions');
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
    this.things.clear();
  }
}

// Global instance
export const wotService = new SimpleWoTService();