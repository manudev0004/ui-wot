// Runtime implementation of WoTService. Keep type-only imports minimal here.
import type { ConsumedThing, WoTServiceConfig } from './wot-service';

// Runtime implementation of WoTService. This file contains the node-wot dependent
// logic and should only be imported explicitly by applications that need the
// runtime. Keeping it separate prevents the build from type-checking or bundling
// node-only modules into the web components.

let Servient: any = undefined;
let HttpClientFactory: any = undefined;
let WebSocketClientFactory: any = undefined;

export class WoTService {
  private servient: any;
  private wot: any = null; // WoT instance from node-wot
  private consumedThings = new Map<string, ConsumedThing>();
  private subscriptions = new Map<string, any>();
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

  private async initializeServient(): Promise<void> {
    try {
      if (!Servient) {
        try {
          const core = require('@node-wot/core');
          Servient = core.Servient;
        } catch (err) {
          throw new Error('Failed to require @node-wot/core: ' + err.message);
        }
      }

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
        this.log('WebSocket binding not available (optional): ' + (err?.message || err));
      }

      this.wot = await this.servient.start();
      this.isInitialized = true;
      this.log('node-wot Servient initialized successfully');
      this.emit('servientReady', { timestamp: Date.now() });

    } catch (error) {
      this.log('Failed to initialize node-wot servient:', error);
      throw new Error(`WoT Service initialization failed: ${error.message}. Ensure @node-wot/core and @node-wot/binding-http are installed.`);
    }
  }

  private async ensureReady(): Promise<void> {
    if (!this.isInitialized || !this.wot) {
      await this.initializeServient();
    }
  }
  /**
   * Consume a Thing Description using node-wot exclusively
   */
  async consumeThing(thingId: string, tdSource: string | any): Promise<any> {
    await this.ensureReady();

    if (!this.wot) {
      throw new Error('WoT runtime not available. Ensure node-wot is properly initialized.');
    }

    try {
      let td: any;

      if (typeof tdSource === 'string') {
        if (tdSource.startsWith('http')) {
          td = await this.fetchThingDescription(tdSource);
        } else {
          try {
            td = JSON.parse(tdSource);
          } catch (parseError) {
            throw new Error(`Invalid TD JSON: ${parseError.message}`);
          }
        }
      } else {
        td = tdSource;
      }

      this.validateThingDescription(td);

      const nodeWoTThing = await this.wot.consume(td);
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

  private async fetchThingDescription(url: string): Promise<any> {
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const td = await response.json();
      return td;
    } catch (error) {
      throw new Error(`Failed to fetch TD from ${url}: ${error.message}`);
    }
  }

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

  private wrapNodeWoTThing(nodeWoTThing: any): any {
    return {
      getThingDescription: () => nodeWoTThing.getThingDescription(),
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
        return subscription;
      },
      invokeAction: async (actionName: string, parameter?: any, options?: any) => {
        const result = await nodeWoTThing.invokeAction(actionName, parameter, options);
        return typeof result.value === 'function' ? await result.value() : result;
      }
    };
  }

  getConsumedThing(thingId: string): any {
    return this.consumedThings.get(thingId);
  }

  getAllConsumedThings(): Map<string, any> {
    return new Map(this.consumedThings);
  }

  async readProperty(thingId: string, propertyName: string, options?: any): Promise<any> {
    const startTime = Date.now();

    try {
      const thing = this.getConsumedThing(thingId);
      if (!thing) throw new Error(`Thing not consumed: ${thingId}`);

      const value = await thing.readProperty(propertyName, options);
      const msg = { payload: value, ts: Date.now(), source: `${thingId}.${propertyName}`, ok: true, meta: { operation: 'read', latency: Date.now() - startTime, thingId, propertyName, implementation: 'node-wot' } };
      this.emit('propertyRead', msg);
      return msg;
    } catch (error) {
      const msg = { payload: null, ts: Date.now(), source: `${thingId}.${propertyName}`, ok: false, error: { code: 'READ_FAILED', message: error.message }, meta: { operation: 'read', latency: Date.now() - startTime, thingId, propertyName, implementation: 'node-wot' } };
      this.emit('propertyReadError', msg);
      throw error;
    }
  }

  async writeProperty(thingId: string, propertyName: string, value: any, options?: any): Promise<any> {
    const startTime = Date.now();

    try {
      const thing = this.getConsumedThing(thingId);
      if (!thing) throw new Error(`Thing not consumed: ${thingId}`);
      const td = thing.getThingDescription();
      const property = td.properties?.[propertyName];
      if (property?.readOnly) throw new Error(`Property is read-only: ${propertyName}`);
      await thing.writeProperty(propertyName, value, options);
      const msg = { payload: value, ts: Date.now(), source: `${thingId}.${propertyName}`, ok: true, meta: { operation: 'write', latency: Date.now() - startTime, thingId, propertyName, implementation: 'node-wot' } };
      this.emit('propertyWritten', msg);
      return msg;
    } catch (error) {
      const msg = { payload: value, ts: Date.now(), source: `${thingId}.${propertyName}`, ok: false, error: { code: 'WRITE_FAILED', message: error.message }, meta: { operation: 'write', latency: Date.now() - startTime, thingId, propertyName, implementation: 'node-wot' } };
      this.emit('propertyWriteError', msg);
      throw error;
    }
  }

  async observeProperty(thingId: string, propertyName: string, callback: (msg: any) => void, options?: any): Promise<() => void> {
    try {
      const thing = this.getConsumedThing(thingId);
      if (!thing) throw new Error(`Thing not consumed: ${thingId}`);
      const td = thing.getThingDescription();
      const property = td.properties?.[propertyName];
      if (!property?.observable) throw new Error(`Property is not observable: ${propertyName}`);

      const subscription = await thing.observeProperty(
        propertyName,
        (value: any) => {
          try {
            const msg = { payload: value, ts: Date.now(), source: `${thingId}.${propertyName}`, ok: true, meta: { operation: 'observe', method: 'native', thingId, propertyName, implementation: 'node-wot' } };
            callback(msg);
            this.emit('propertyObserved', msg);
          } catch (valueError) {
            const msg = { payload: null, ts: Date.now(), source: `${thingId}.${propertyName}`, ok: false, error: { code: 'VALUE_EXTRACTION_ERROR', message: valueError.message }, meta: { operation: 'observe', method: 'native', thingId, propertyName, implementation: 'node-wot' } };
            callback(msg);
            this.emit('propertyObserveError', msg);
          }
        },
        (error: Error) => {
          const msg = { payload: null, ts: Date.now(), source: `${thingId}.${propertyName}`, ok: false, error: { code: 'OBSERVE_ERROR', message: error.message }, meta: { operation: 'observe', method: 'native', thingId, propertyName, implementation: 'node-wot' } };
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

  async invokeAction(thingId: string, actionName: string, params?: any, options?: any): Promise<any> {
    const startTime = Date.now();
    try {
      const thing = this.getConsumedThing(thingId);
      if (!thing) throw new Error(`Thing not found: ${thingId}`);
      const value = await thing.invokeAction(actionName, params, options);
      const msg = { payload: value, ts: Date.now(), source: `${thingId}.${actionName}`, ok: true, meta: { operation: 'action', latency: Date.now() - startTime, thingId, actionName, params, implementation: 'node-wot' } };
      this.emit('actionInvoked', msg);
      return msg;
    } catch (error) {
      const msg = { payload: null, ts: Date.now(), source: `${thingId}.${actionName}`, ok: false, error: { code: 'ACTION_FAILED', message: error.message }, meta: { operation: 'action', latency: Date.now() - startTime, thingId, actionName, params, implementation: 'node-wot' } };
      this.emit('actionError', msg);
      throw error;
    }
  }

  getThingDescription(thingId: string): any {
    const thing = this.getConsumedThing(thingId);
    return thing?.getThingDescription();
  }

  getPropertyCapabilities(thingId: string, propertyName: string) {
    const td = this.getThingDescription(thingId);
    if (!td?.properties?.[propertyName]) return { canRead: false, canWrite: false, canObserve: false };
    const property = td.properties[propertyName];
    return { canRead: true, canWrite: !property.readOnly, canObserve: !!property.observable };
  }

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

  async shutdown(): Promise<void> {
    for (const [key, subscription] of this.subscriptions) {
      try { await subscription.stop(); this.log(`Stopped subscription: ${key}`); } catch (error) { this.log(`Error stopping subscription ${key}:`, error); }
    }
    this.subscriptions.clear();
    if (this.isInitialized && this.servient) {
      try { await this.servient.shutdown(); this.isInitialized = false; this.wot = null; this.log('node-wot Servient shutdown completed'); } catch (error) { this.log('Error shutting down servient:', error); }
    }
    this.consumedThings.clear();
    this.emit('serviceShutdown', { timestamp: Date.now() });
  }

  addEventListener(type: string, listener: (event: CustomEvent) => void): void { this.eventTarget.addEventListener(type, listener as EventListener); }
  removeEventListener(type: string, listener: (event: CustomEvent) => void): void { this.eventTarget.removeEventListener(type, listener as EventListener); }
  private emit(type: string, detail: any): void { const event = new CustomEvent(type, { detail }); this.eventTarget.dispatchEvent(event); }
  private log(...args: any[]): void { if (this.config.debug) { console.log('[WoTService]', ...args); } }
}

export function createWoTService(config?: WoTServiceConfig): WoTService {
  return new WoTService(config);
}

export const wotService = createWoTService({ debug: true });
