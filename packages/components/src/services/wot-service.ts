import { UiMsg } from '../utils/types';

// Runtime imports with fallbacks
let Servient: any;
let HttpClientFactory: any;

try {
  const nodeWoTCore = require('@node-wot/core');
  Servient = nodeWoTCore.Servient || nodeWoTCore.default;
  
  try {
    const httpBinding = require('@node-wot/binding-http');
    HttpClientFactory = httpBinding.HttpClientFactory;
  } catch {
    console.warn('HTTP binding not available');
  }
} catch (error) {
  console.warn('node-wot not available:', error);
}

/**
 * WoT Thing Description interface
 */
export interface ThingDescription {
  '@context'?: string | string[];
  '@type'?: string | string[];
  id?: string;
  title: string;
  description?: string;
  properties?: { [key: string]: PropertyElement };
  actions?: { [key: string]: ActionElement };
  events?: { [key: string]: EventElement };
  links?: any[];
  forms?: Form[];
  security?: string[];
  securityDefinitions?: { [key: string]: SecurityScheme };
  base?: string;
  [key: string]: any;
}

/**
 * Property element interface
 */
export interface PropertyElement {
  type?: string;
  description?: string;
  readOnly?: boolean;
  writeOnly?: boolean;
  observable?: boolean;
  forms?: Form[];
  [key: string]: any;
}

/**
 * Action element interface
 */
export interface ActionElement {
  description?: string;
  input?: any;
  output?: any;
  forms?: Form[];
  [key: string]: any;
}

/**
 * Event element interface
 */
export interface EventElement {
  description?: string;
  data?: any;
  forms?: Form[];
  [key: string]: any;
}

/**
 * Form interface
 */
export interface Form {
  href: string;
  contentType?: string;
  op?: string | string[];
  [key: string]: any;
}

/**
 * Security scheme interface
 */
export interface SecurityScheme {
  scheme: string;
  [key: string]: any;
}

/**
 * WoT Consumed Thing interface
 */
export interface ConsumedThing {
  getThingDescription(): ThingDescription;
  readProperty(propertyName: string): Promise<any>;
  writeProperty(propertyName: string, value: any): Promise<void>;
  observeProperty?(propertyName: string, listener: (value: any) => void, errorListener?: (error: Error) => void): Promise<Subscription>;
  invokeAction?(actionName: string, parameter?: any): Promise<any>;
  [key: string]: any;
}

/**
 * Subscription interface
 */
export interface Subscription {
  stop(): Promise<void>;
  [key: string]: any;
}

/**
 * Configuration for WoT service
 */
export interface WoTServiceConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retries for failed requests */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Use node-wot if available, otherwise fallback to custom implementation */
  preferNodeWoT?: boolean;
}

/**
 * WoT Service with node-wot integration and custom fallbacks
 * 
 * This service automatically uses node-wot when available and falls back 
 * to a custom implementation when node-wot is not available or fails.
 */
export class WoTService {
  private servient: any;
  private wot: any;
  private consumedThings = new Map<string, ConsumedThing>();
  private subscriptions = new Map<string, Subscription>();
  private config: Required<WoTServiceConfig>;
  private eventTarget = new EventTarget();
  private isInitialized = false;
  private useNodeWoT = false;

  constructor(config: WoTServiceConfig = {}) {
    this.config = {
      debug: false,
      timeout: 10000,
      maxRetries: 3,
      retryDelay: 1000,
      preferNodeWoT: true,
      ...config
    };

    // Check if node-wot is available and should be used
    this.useNodeWoT = !!Servient && this.config.preferNodeWoT;
    
    if (this.useNodeWoT) {
      this.initializeNodeWoT();
    } else {
      this.log('Using custom WoT implementation');
      this.isInitialized = true;
    }
  }

  /**
   * Initialize node-wot servient
   */
  private async initializeNodeWoT(): Promise<void> {
    try {
      this.servient = new Servient();
      
      // Add HTTP client factory if available
      if (HttpClientFactory) {
        this.servient.addClientFactory(new HttpClientFactory());
        this.log('HTTP client factory added');
      }

      this.wot = await this.servient.start();
      this.isInitialized = true;
      this.log('node-wot initialized successfully');
      this.emit('servientReady', { timestamp: Date.now() });

    } catch (error) {
      this.log('node-wot initialization failed, using custom implementation:', error);
      this.useNodeWoT = false;
      this.isInitialized = true;
    }
  }

  /**
   * Ensure service is ready
   */
  private async ensureReady(): Promise<void> {
    if (!this.isInitialized) {
      if (this.useNodeWoT) {
        await this.initializeNodeWoT();
      } else {
        this.isInitialized = true;
      }
    }
  }

  /**
   * Consume a Thing Description
   */
  async consumeThing(thingId: string, tdSource: string | ThingDescription): Promise<ConsumedThing> {
    await this.ensureReady();

    try {
      let td: ThingDescription;

      // Parse or fetch TD
      if (typeof tdSource === 'string') {
        if (tdSource.startsWith('http')) {
          const response = await fetch(tdSource);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          td = await response.json();
        } else {
          td = JSON.parse(tdSource);
        }
      } else {
        td = tdSource;
      }

      let consumedThing: ConsumedThing;

      if (this.useNodeWoT && this.wot) {
        // Use node-wot
        try {
          const nodeWoTThing = await this.wot.consume(td);
          consumedThing = this.wrapNodeWoTThing(nodeWoTThing);
        } catch (error) {
          this.log('node-wot consume failed, using custom implementation:', error);
          consumedThing = this.createCustomConsumedThing(td);
        }
      } else {
        // Use custom implementation
        consumedThing = this.createCustomConsumedThing(td);
      }

      this.consumedThings.set(thingId, consumedThing);
      this.log(`Successfully consumed thing: ${thingId} (${td.title || 'Unknown'})`);
      this.emit('thingConsumed', { thingId, td });

      return consumedThing;

    } catch (error) {
      this.log(`Failed to consume thing ${thingId}:`, error);
      throw new Error(`Failed to consume thing ${thingId}: ${error.message}`);
    }
  }

  /**
   * Wrap node-wot ConsumedThing to match our interface
   */
  private wrapNodeWoTThing(nodeWoTThing: any): ConsumedThing {
    return {
      getThingDescription: () => nodeWoTThing.getThingDescription(),
      
      readProperty: async (propertyName: string) => {
        const result = await nodeWoTThing.readProperty(propertyName);
        return typeof result.value === 'function' ? await result.value() : result;
      },
      
      writeProperty: async (propertyName: string, value: any) => {
        await nodeWoTThing.writeProperty(propertyName, value);
      },
      
      observeProperty: async (propertyName: string, listener: (value: any) => void, errorListener?: (error: Error) => void) => {
        const subscription = await nodeWoTThing.observeProperty(
          propertyName,
          async (data: any) => {
            const value = typeof data.value === 'function' ? await data.value() : data;
            listener(value);
          },
          errorListener
        );
        return subscription;
      },
      
      invokeAction: async (actionName: string, parameter?: any) => {
        const result = await nodeWoTThing.invokeAction(actionName, parameter);
        return typeof result.value === 'function' ? await result.value() : result;
      }
    };
  }

  /**
   * Create custom ConsumedThing implementation
   */
  private createCustomConsumedThing(td: ThingDescription): ConsumedThing {
    const baseUrl = td.base || '';

    const resolveUrl = (href: string): string => {
      if (href.startsWith('http')) return href;
      if (!baseUrl) return href;
      return new URL(href, baseUrl).toString();
    };

    return {
      getThingDescription: () => td,

      readProperty: async (propertyName: string): Promise<any> => {
        const property = td.properties?.[propertyName];
        if (!property) {
          throw new Error(`Property not found: ${propertyName}`);
        }

        const form = property.forms?.[0];
        if (!form) {
          throw new Error(`No form found for property: ${propertyName}`);
        }

        const url = resolveUrl(form.href);
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(this.config.timeout)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      },

      writeProperty: async (propertyName: string, value: any): Promise<void> => {
        const property = td.properties?.[propertyName];
        if (!property) {
          throw new Error(`Property not found: ${propertyName}`);
        }

        if (property.readOnly) {
          throw new Error(`Property is read-only: ${propertyName}`);
        }

        const form = property.forms?.[0];
        if (!form) {
          throw new Error(`No form found for property: ${propertyName}`);
        }

        const url = resolveUrl(form.href);
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(value),
          signal: AbortSignal.timeout(this.config.timeout)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      },

      observeProperty: async (propertyName: string, listener: (value: any) => void): Promise<Subscription> => {
        const property = td.properties?.[propertyName];
        if (!property?.observable) {
          throw new Error(`Property is not observable: ${propertyName}`);
        }

        // Simple polling implementation for custom fallback
        let stopped = false;
        const poll = async () => {
          if (stopped) return;
          try {
            const form = property.forms?.[0];
            if (form) {
              const url = resolveUrl(form.href);
              const response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(10000)
              });
              if (response.ok) {
                const value = await response.json();
                listener(value);
              }
            }
          } catch (error) {
            // Silent polling errors to avoid spam
          }
          if (!stopped) {
            setTimeout(poll, 3000);
          }
        };

        poll();

        return {
          stop: async () => {
            stopped = true;
          }
        };
      },

      invokeAction: async (actionName: string, params?: any): Promise<any> => {
        const action = td.actions?.[actionName];
        if (!action) {
          throw new Error(`Action not found: ${actionName}`);
        }

        const form = action.forms?.[0];
        if (!form) {
          throw new Error(`No form found for action: ${actionName}`);
        }

        const url = resolveUrl(form.href);
        const response = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: params ? JSON.stringify(params) : undefined,
          signal: AbortSignal.timeout(this.config.timeout)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      }
    };
  }

  /**
   * Get a consumed thing
   */
  getConsumedThing(thingId: string): ConsumedThing | undefined {
    return this.consumedThings.get(thingId);
  }

  /**
   * Get all consumed things
   */
  getAllConsumedThings(): Map<string, ConsumedThing> {
    return new Map(this.consumedThings);
  }

  /**
   * Read a property with UiMsg wrapper
   */
  async readProperty(thingId: string, propertyName: string): Promise<UiMsg<any>> {
    const startTime = Date.now();

    try {
      const thing = this.getConsumedThing(thingId);
      if (!thing) {
        throw new Error(`Thing not consumed: ${thingId}`);
      }

      const value = await thing.readProperty(propertyName);
      
      const msg: UiMsg<any> = {
        payload: value,
        ts: Date.now(),
        source: `${thingId}.${propertyName}`,
        ok: true,
        meta: {
          operation: 'read',
          latency: Date.now() - startTime,
          thingId,
          propertyName,
          implementation: this.useNodeWoT ? 'node-wot' : 'custom'
        }
      };

      this.emit('propertyRead', msg);
      return msg;

    } catch (error) {
      const msg: UiMsg<any> = {
        payload: null,
        ts: Date.now(),
        source: `${thingId}.${propertyName}`,
        ok: false,
        error: {
          code: 'READ_FAILED',
          message: error.message
        },
        meta: {
          operation: 'read',
          latency: Date.now() - startTime,
          thingId,
          propertyName,
          implementation: this.useNodeWoT ? 'node-wot' : 'custom'
        }
      };

      this.emit('propertyReadError', msg);
      throw error;
    }
  }

  /**
   * Write a property with UiMsg wrapper
   */
  async writeProperty(thingId: string, propertyName: string, value: any): Promise<UiMsg<any>> {
    const startTime = Date.now();

    try {
      const thing = this.getConsumedThing(thingId);
      if (!thing) {
        throw new Error(`Thing not consumed: ${thingId}`);
      }

      await thing.writeProperty(propertyName, value);

      const msg: UiMsg<any> = {
        payload: value,
        ts: Date.now(),
        source: `${thingId}.${propertyName}`,
        ok: true,
        meta: {
          operation: 'write',
          latency: Date.now() - startTime,
          thingId,
          propertyName,
          implementation: this.useNodeWoT ? 'node-wot' : 'custom'
        }
      };

      this.emit('propertyWritten', msg);
      return msg;

    } catch (error) {
      const msg: UiMsg<any> = {
        payload: value,
        ts: Date.now(),
        source: `${thingId}.${propertyName}`,
        ok: false,
        error: {
          code: 'WRITE_FAILED',
          message: error.message
        },
        meta: {
          operation: 'write',
          latency: Date.now() - startTime,
          thingId,
          propertyName,
          implementation: this.useNodeWoT ? 'node-wot' : 'custom'
        }
      };

      this.emit('propertyWriteError', msg);
      throw error;
    }
  }

  /**
   * Observe a property
   */
  async observeProperty(
    thingId: string,
    propertyName: string,
    callback: (msg: UiMsg<any>) => void,
    _pollIntervalMs?: number
  ): Promise<() => void> {
    try {
      const thing = this.getConsumedThing(thingId);
      if (!thing) {
        throw new Error(`Thing not consumed: ${thingId}`);
      }

      let subscription: Subscription;

      try {
        // Try native observation
        subscription = await thing.observeProperty!(
          propertyName,
          (value: any) => {
            const msg: UiMsg<any> = {
              payload: value,
              ts: Date.now(),
              source: `${thingId}.${propertyName}`,
              ok: true,
              meta: {
                operation: 'observe',
                method: 'native',
                thingId,
                propertyName,
                implementation: this.useNodeWoT ? 'node-wot' : 'custom'
              }
            };
            callback(msg);
            this.emit('propertyObserved', msg);
          },
          (error: Error) => {
            const msg: UiMsg<any> = {
              payload: null,
              ts: Date.now(),
              source: `${thingId}.${propertyName}`,
              ok: false,
              error: {
                code: 'OBSERVE_ERROR',
                message: error.message
              },
              meta: {
                operation: 'observe',
                method: 'native',
                thingId,
                propertyName,
                implementation: this.useNodeWoT ? 'node-wot' : 'custom'
              }
            };
            callback(msg);
            this.emit('propertyObserveError', msg);
          }
        );

        const subscriptionKey = `${thingId}.${propertyName}`;
        this.subscriptions.set(subscriptionKey, subscription);

        this.log(`Started observation for ${subscriptionKey}`);

        return async () => {
          await subscription.stop();
          this.subscriptions.delete(subscriptionKey);
          this.log(`Stopped observation for ${subscriptionKey}`);
        };

      } catch (error) {
        // Fallback to polling
        this.log(`Native observation failed, using polling for ${thingId}.${propertyName}`);
        return this.fallbackPolling(thingId, propertyName, callback, _pollIntervalMs || 3000);
      }

    } catch (error) {
      this.log(`Observation setup failed for ${thingId}.${propertyName}:`, error);
      throw error;
    }
  }

  /**
   * Fallback polling implementation
   */
  private fallbackPolling(
    thingId: string,
    propertyName: string,
    callback: (msg: UiMsg<any>) => void,
    intervalMs: number
  ): () => void {
    let stopped = false;

    const poll = async () => {
      if (stopped) return;

      try {
        const msg = await this.readProperty(thingId, propertyName);
        msg.meta = { ...msg.meta, method: 'polling' };
        callback(msg);
      } catch (error) {
        this.log(`Polling error for ${thingId}.${propertyName}:`, error);
      }

      if (!stopped) {
        setTimeout(poll, intervalMs);
      }
    };

    poll();
    this.log(`Started polling observation for ${thingId}.${propertyName} (${intervalMs}ms)`);

    return () => {
      stopped = true;
      this.log(`Stopped polling for ${thingId}.${propertyName}`);
    };
  }

  /**
   * Invoke an action
   */
  async invokeAction(thingId: string, actionName: string, params?: any): Promise<UiMsg<any>> {
    const startTime = Date.now();

    try {
      const thing = this.getConsumedThing(thingId);
      if (!thing || !thing.invokeAction) {
        throw new Error(`Thing not found or actions not supported: ${thingId}`);
      }

      const result = await thing.invokeAction(actionName, params);

      const msg: UiMsg<any> = {
        payload: result,
        ts: Date.now(),
        source: `${thingId}.${actionName}`,
        ok: true,
        meta: {
          operation: 'action',
          latency: Date.now() - startTime,
          thingId,
          actionName,
          params,
          implementation: this.useNodeWoT ? 'node-wot' : 'custom'
        }
      };

      this.emit('actionInvoked', msg);
      return msg;

    } catch (error) {
      const msg: UiMsg<any> = {
        payload: null,
        ts: Date.now(),
        source: `${thingId}.${actionName}`,
        ok: false,
        error: {
          code: 'ACTION_FAILED',
          message: error.message
        },
        meta: {
          operation: 'action',
          latency: Date.now() - startTime,
          thingId,
          actionName,
          params,
          implementation: this.useNodeWoT ? 'node-wot' : 'custom'
        }
      };

      this.emit('actionError', msg);
      throw error;
    }
  }

  /**
   * Get Thing Description
   */
  getThingDescription(thingId: string): ThingDescription | undefined {
    const thing = this.getConsumedThing(thingId);
    return thing?.getThingDescription();
  }

  /**
   * Get property capabilities
   */
  getPropertyCapabilities(thingId: string, propertyName: string): {
    canRead: boolean;
    canWrite: boolean;
    canObserve: boolean;
  } {
    const td = this.getThingDescription(thingId);
    if (!td?.properties?.[propertyName]) {
      return { canRead: false, canWrite: false, canObserve: false };
    }

    const property = td.properties[propertyName];
    return {
      canRead: true,
      canWrite: !property.readOnly,
      canObserve: !!property.observable
    };
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<{ [thingId: string]: 'connected' | 'error' | 'unknown' }> {
    const status: { [thingId: string]: 'connected' | 'error' | 'unknown' } = {};

    for (const [thingId, thing] of this.consumedThings) {
      try {
        const td = thing.getThingDescription();
        const properties = Object.keys(td.properties || {});
        
        if (properties.length > 0) {
          await thing.readProperty(properties[0]);
          status[thingId] = 'connected';
        } else {
          status[thingId] = 'unknown';
        }
      } catch (error) {
        status[thingId] = 'error';
      }
    }

    return status;
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    // Stop all subscriptions
    for (const [key, subscription] of this.subscriptions) {
      try {
        await subscription.stop();
        this.log(`Stopped subscription: ${key}`);
      } catch (error) {
        this.log(`Error stopping subscription ${key}:`, error);
      }
    }
    this.subscriptions.clear();

    // Shutdown servient if using node-wot
    if (this.useNodeWoT && this.servient) {
      try {
        await this.servient.shutdown();
        this.log('node-wot Servient shutdown completed');
      } catch (error) {
        this.log('Error shutting down servient:', error);
      }
    }

    this.isInitialized = false;
    this.consumedThings.clear();
    this.emit('serviceShutdown', { timestamp: Date.now() });
  }

  /**
   * Event listeners
   */
  addEventListener(type: string, listener: (event: CustomEvent) => void): void {
    this.eventTarget.addEventListener(type, listener as EventListener);
  }

  removeEventListener(type: string, listener: (event: CustomEvent) => void): void {
    this.eventTarget.removeEventListener(type, listener as EventListener);
  }

  /**
   * Emit events
   */
  private emit(type: string, detail: any): void {
    const event = new CustomEvent(type, { detail });
    this.eventTarget.dispatchEvent(event);
  }

  /**
   * Debug logging
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[WoTService]', ...args);
    }
  }
}

/**
 * Create a WoT service instance
 */
export function createWoTService(config?: WoTServiceConfig): WoTService {
  return new WoTService(config);
}

/**
 * Default WoT service instance
 */
export const wotService = createWoTService({ debug: true });

// Legacy exports for backward compatibility
export type WoTThing = ConsumedThing;
