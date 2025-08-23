import { UiMsg } from '../utils/types';

// Lazy references for node-wot modules to avoid static top-level imports that
// significantly increase build time and bundle processing during Stencil builds.
let Servient: any = undefined;
let HttpClientFactory: any = undefined;
let WebSocketClientFactory: any = undefined;

/**
 * Thing Description interface - compatible with WoT TD standard
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
 * Property element interface from WoT
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
 * Action element interface from WoT
 */
export interface ActionElement {
  description?: string;
  input?: any;
  output?: any;
  forms?: Form[];
  [key: string]: any;
}

/**
 * Event element interface from WoT
 */
export interface EventElement {
  description?: string;
  data?: any;
  forms?: Form[];
  [key: string]: any;
}

/**
 * Form interface from WoT
 */
export interface Form {
  href: string;
  contentType?: string;
  op?: string | string[];
  [key: string]: any;
}

/**
 * Security scheme interface from WoT
 */
export interface SecurityScheme {
  scheme: string;
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
 * WoT Consumed Thing interface simplified for node-wot
 */
export interface ConsumedThing {
  getThingDescription(): ThingDescription;
  readProperty(propertyName: string, options?: any): Promise<any>;
  writeProperty(propertyName: string, value: any, options?: any): Promise<void>;
  observeProperty(propertyName: string, listener: (value: any) => void, errorListener?: (error: Error) => void, options?: any): Promise<Subscription>;
  invokeAction(actionName: string, parameter?: any, options?: any): Promise<any>;
}

/**
 * Configuration for WoT service using node-wot exclusively
 */
export interface WoTServiceConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** HTTP client configuration */
  http?: {
    allowSelfSigned?: boolean;
    proxy?: string; // Will be converted to HttpProxyConfig
  };
  /** WebSocket client configuration */
  ws?: {
    allowSelfSigned?: boolean;
  };
  /** Custom servient instance (advanced users) */
  servient?: any;
}

/**
 * WoT Service using Eclipse Thingweb node-wot exclusively
 * 
 * This service leverages node-wot for all TD handling and device communication.
 * No custom fallback implementations - requires node-wot dependencies.
 */
export class WoTService {
  private servient: any;
  private wot: any = null; // WoT instance from node-wot
  private consumedThings = new Map<string, ConsumedThing>();
  private subscriptions = new Map<string, any>(); // Use any for subscription compatibility
  private config: Required<Omit<WoTServiceConfig, 'servient'>> & { servient?: any };
  private eventTarget = new EventTarget();
  private isInitialized = false;

  constructor(config: WoTServiceConfig = {}) {
    this.config = {
      debug: false,
      timeout: 10000,
      http: {},
      ws: {},
      ...config
    };

    // Use provided servient or create new one
    this.servient = config.servient || new Servient();
    this.initializeServient();
  }

  /**
   * Initialize the node-wot servient with protocol bindings
   */
  private async initializeServient(): Promise<void> {
    try {
      // Dynamically load node-wot modules to avoid heavy top-level bundling work
      if (!Servient) {
        try {
          const core = require('@node-wot/core');
          Servient = core.Servient;
        } catch (err) {
          throw new Error('Failed to require @node-wot/core: ' + err.message);
        }
      }

      // Create servient instance if not provided
      if (!this.servient) {
        this.servient = this.config.servient || new Servient();
      }

      // HTTP binding
      try {
        const httpBinding = require('@node-wot/binding-http');
        HttpClientFactory = httpBinding.HttpClientFactory;
        const httpClientFactory = new HttpClientFactory({
          allowSelfSigned: this.config.http?.allowSelfSigned || false,
          proxy: this.config.http?.proxy ? { href: this.config.http?.proxy } : undefined
        });
        this.servient.addClientFactory(httpClientFactory);
        this.log('HTTP client factory added');
      } catch (err) {
        throw new Error('HTTP binding is required but not available. Install @node-wot/binding-http');
      }

      // Optional WebSocket binding
      try {
        const wsBinding = require('@node-wot/binding-websockets');
        WebSocketClientFactory = wsBinding.WebSocketClientFactory;
        if (WebSocketClientFactory) {
          const wsClientFactory = new WebSocketClientFactory({
            allowSelfSigned: this.config.ws?.allowSelfSigned || false
          });
          this.servient.addClientFactory(wsClientFactory);
          this.log('WebSocket client factory added');
        }
      } catch (err) {
        // optional - don't block initialization
        this.log('WebSocket binding not available (optional): ' + (err?.message || err));
      }

      // Start the servient
      this.wot = await this.servient.start();
      this.isInitialized = true;
      
      this.log('node-wot Servient initialized successfully');
      this.emit('servientReady', { timestamp: Date.now() });

    } catch (error) {
      this.log('Failed to initialize node-wot servient:', error);
      throw new Error(`WoT Service initialization failed: ${error.message}. Ensure @node-wot/core and @node-wot/binding-http are installed.`);
    }
  }

  /**
   * Ensure servient is ready before operations
   */
  private async ensureReady(): Promise<void> {
    if (!this.isInitialized || !this.wot) {
      await this.initializeServient();
    }
  }

  /**
   * Consume a Thing Description using node-wot exclusively
   * 
   * @param thingId - Unique identifier for the thing
   * @param tdSource - TD URL, TD object, or TD string
   */
  async consumeThing(thingId: string, tdSource: string | ThingDescription): Promise<ConsumedThing> {
    await this.ensureReady();

    if (!this.wot) {
      throw new Error('WoT runtime not available. Ensure node-wot is properly initialized.');
    }

    try {
      let td: ThingDescription;

      // Handle different TD source types using node-wot
      if (typeof tdSource === 'string') {
        if (tdSource.startsWith('http')) {
          // Let node-wot handle TD fetching
          td = await this.fetchThingDescription(tdSource);
        } else {
          // Parse TD from JSON string
          try {
            td = JSON.parse(tdSource);
          } catch (parseError) {
            throw new Error(`Invalid TD JSON: ${parseError.message}`);
          }
        }
      } else {
        // Use provided TD object
        td = tdSource;
      }

      // Validate TD structure
      this.validateThingDescription(td);

      // Consume the thing using node-wot
      const nodeWoTThing = await this.wot.consume(td);
      
      // Wrap the node-wot thing to match our interface
      const consumedThing = this.wrapNodeWoTThing(nodeWoTThing);
      
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
   * Fetch Thing Description from URL using node-wot helpers
   */
  private async fetchThingDescription(url: string): Promise<ThingDescription> {
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const td = await response.json();
      return td as ThingDescription; // Type assertion to avoid conflicts
    } catch (error) {
      throw new Error(`Failed to fetch TD from ${url}: ${error.message}`);
    }
  }

  /**
   * Validate Thing Description structure
   */
  private validateThingDescription(td: any): void {
    if (!td || typeof td !== 'object') {
      throw new Error('Thing Description must be an object');
    }

    if (!td['@context']) {
      throw new Error('Thing Description must have @context');
    }

    if (!td.title) {
      throw new Error('Thing Description must have a title');
    }

    if (!td.id && !td['@id']) {
      throw new Error('Thing Description must have an id or @id');
    }
  }

  /**
   * Wrap node-wot ConsumedThing to match our interface
   */
  private wrapNodeWoTThing(nodeWoTThing: any): ConsumedThing {
    return {
      getThingDescription: () => nodeWoTThing.getThingDescription() as ThingDescription,
      
      readProperty: async (propertyName: string, options?: any) => {
        const result = await nodeWoTThing.readProperty(propertyName, options);
        return typeof result.value === 'function' ? await result.value() : result;
      },
      
      writeProperty: async (propertyName: string, value: any, options?: any) => {
        await nodeWoTThing.writeProperty(propertyName, value, options);
      },
      
      observeProperty: async (propertyName: string, listener: (value: any) => void, errorListener?: (error: Error) => void, options?: any) => {
        const subscription = await nodeWoTThing.observeProperty(
          propertyName,
          async (data: any) => {
            const value = typeof data.value === 'function' ? await data.value() : data;
            listener(value);
          },
          errorListener,
          options
        );
        return subscription as Subscription;
      },
      
      invokeAction: async (actionName: string, parameter?: any, options?: any) => {
        const result = await nodeWoTThing.invokeAction(actionName, parameter, options);
        return typeof result.value === 'function' ? await result.value() : result;
      }
    };
  }

  /**
   * Get a consumed thing by ID
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
   * Read a property using node-wot with UiMsg wrapper
   */
  async readProperty(thingId: string, propertyName: string, options?: any): Promise<UiMsg<any>> {
    const startTime = Date.now();

    try {
      const thing = this.getConsumedThing(thingId);
      if (!thing) {
        throw new Error(`Thing not consumed: ${thingId}`);
      }

      const value = await thing.readProperty(propertyName, options);
      
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
          implementation: 'node-wot'
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
          implementation: 'node-wot'
        }
      };

      this.emit('propertyReadError', msg);
      throw error;
    }
  }

  /**
   * Write a property using node-wot with UiMsg wrapper
   */
  async writeProperty(thingId: string, propertyName: string, value: any, options?: any): Promise<UiMsg<any>> {
    const startTime = Date.now();

    try {
      const thing = this.getConsumedThing(thingId);
      if (!thing) {
        throw new Error(`Thing not consumed: ${thingId}`);
      }

      // Check if property is writable using TD
      const td = thing.getThingDescription();
      const property = td.properties?.[propertyName];
      if (property?.readOnly) {
        throw new Error(`Property is read-only: ${propertyName}`);
      }

      await thing.writeProperty(propertyName, value, options);

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
          implementation: 'node-wot'
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
          implementation: 'node-wot'
        }
      };

      this.emit('propertyWriteError', msg);
      throw error;
    }
  }

  /**
   * Observe a property using node-wot exclusively
   */
  async observeProperty(
    thingId: string,
    propertyName: string,
    callback: (msg: UiMsg<any>) => void,
    options?: any
  ): Promise<() => void> {
    try {
      const thing = this.getConsumedThing(thingId);
      if (!thing) {
        throw new Error(`Thing not consumed: ${thingId}`);
      }

      // Check if property is observable
      const td = thing.getThingDescription();
      const property = td.properties?.[propertyName];
      if (!property?.observable) {
        throw new Error(`Property is not observable: ${propertyName}`);
      }

      // Use node-wot's native observation
      const subscription = await thing.observeProperty(
        propertyName,
        (value: any) => {
          try {
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
                implementation: 'node-wot'
              }
            };
            callback(msg);
            this.emit('propertyObserved', msg);
          } catch (valueError) {
            const msg: UiMsg<any> = {
              payload: null,
              ts: Date.now(),
              source: `${thingId}.${propertyName}`,
              ok: false,
              error: {
                code: 'VALUE_EXTRACTION_ERROR',
                message: valueError.message
              },
              meta: {
                operation: 'observe',
                method: 'native',
                thingId,
                propertyName,
                implementation: 'node-wot'
              }
            };
            callback(msg);
            this.emit('propertyObserveError', msg);
          }
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
              implementation: 'node-wot'
            }
          };
          callback(msg);
          this.emit('propertyObserveError', msg);
        },
        options
      );

      const subscriptionKey = `${thingId}.${propertyName}`;
      this.subscriptions.set(subscriptionKey, subscription);

      this.log(`Started native observation for ${subscriptionKey}`);

      return async () => {
        await subscription.stop();
        this.subscriptions.delete(subscriptionKey);
        this.log(`Stopped observation for ${subscriptionKey}`);
      };

    } catch (error) {
      this.log(`Observation setup failed for ${thingId}.${propertyName}:`, error);
      throw error;
    }
  }

  /**
   * Invoke an action using node-wot
   */
  async invokeAction(thingId: string, actionName: string, params?: any, options?: any): Promise<UiMsg<any>> {
    const startTime = Date.now();

    try {
      const thing = this.getConsumedThing(thingId);
      if (!thing) {
        throw new Error(`Thing not found: ${thingId}`);
      }

      const value = await thing.invokeAction(actionName, params, options);

      const msg: UiMsg<any> = {
        payload: value,
        ts: Date.now(),
        source: `${thingId}.${actionName}`,
        ok: true,
        meta: {
          operation: 'action',
          latency: Date.now() - startTime,
          thingId,
          actionName,
          params,
          implementation: 'node-wot'
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
          implementation: 'node-wot'
        }
      };

      this.emit('actionError', msg);
      throw error;
    }
  }

  /**
   * Get Thing Description for a consumed thing
   */
  getThingDescription(thingId: string): ThingDescription | undefined {
    const thing = this.getConsumedThing(thingId);
    return thing?.getThingDescription();
  }

  /**
   * Get property capabilities from TD
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
      canRead: true, // All properties are readable by default in WoT
      canWrite: !property.readOnly,
      canObserve: !!property.observable
    };
  }

  /**
   * Get connection health status using node-wot
   */
  async getHealthStatus(): Promise<{ [thingId: string]: 'connected' | 'error' | 'unknown' }> {
    const status: { [thingId: string]: 'connected' | 'error' | 'unknown' } = {};

    for (const [thingId, thing] of this.consumedThings) {
      try {
        const td = thing.getThingDescription();
        const properties = Object.keys(td.properties || {});
        
        if (properties.length > 0) {
          // Try to read the first available property
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
   * Shutdown the service and clean up resources
   */
  async shutdown(): Promise<void> {
    // Stop all subscriptions using node-wot
    for (const [key, subscription] of this.subscriptions) {
      try {
        await subscription.stop();
        this.log(`Stopped subscription: ${key}`);
      } catch (error) {
        this.log(`Error stopping subscription ${key}:`, error);
      }
    }
    this.subscriptions.clear();

    // Shutdown the servient
    if (this.isInitialized && this.servient) {
      try {
        await this.servient.shutdown();
        this.isInitialized = false;
        this.wot = null;
        this.log('node-wot Servient shutdown completed');
      } catch (error) {
        this.log('Error shutting down servient:', error);
      }
    }

    this.consumedThings.clear();
    this.emit('serviceShutdown', { timestamp: Date.now() });
  }

  /**
   * Listen to WoT service events
   */
  addEventListener(type: string, listener: (event: CustomEvent) => void): void {
    this.eventTarget.addEventListener(type, listener as EventListener);
  }

  /**
   * Remove event listener
   */
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
 * Create a WoT service instance using node-wot exclusively
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
