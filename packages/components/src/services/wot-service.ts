import { UiMsg } from '../utils/types';

/**
 * WoT Thing interface for consumed things
 */
export interface WoTThing {
  id: string;
  title?: string;
  description?: string;
  properties?: Record<string, any>;
  actions?: Record<string, any>;
  events?: Record<string, any>;
  readProperty(propertyName: string): Promise<any>;
  writeProperty(propertyName: string, value: any): Promise<void>;
  observeProperty?(propertyName: string, callback: (value: any) => void): Promise<() => void>;
  invokeAction?(actionName: string, params?: any): Promise<any>;
}

/**
 * Configuration for WoT service
 */
export interface WoTServiceConfig {
  /** Base URL for TD fetching */
  baseUrl?: string;
  /** Default timeout for operations in milliseconds */
  timeout?: number;
  /** Retry attempts for failed operations */
  retryAttempts?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom fetch function */
  customFetch?: typeof fetch;
}

/**
 * WoT Service for managing Thing Descriptions and device communication
 */
export class WoTService {
  private things = new Map<string, WoTThing>();
  private config: Required<WoTServiceConfig>;
  private eventTarget = new EventTarget();

  constructor(config: WoTServiceConfig = {}) {
    this.config = {
      baseUrl: '',
      timeout: 5000,
      retryAttempts: 3,
      debug: false,
      customFetch: fetch,
      ...config
    };
  }

  /**
   * Load a Thing Description and create a consumed thing
   */
  async loadThing(thingId: string, tdUrlOrTd: string | object): Promise<WoTThing> {
    try {
      let td: any;
      
      if (typeof tdUrlOrTd === 'string') {
        // Fetch TD from URL
        const response = await this.fetchWithTimeout(tdUrlOrTd);
        td = await response.json();
      } else {
        // Use provided TD object
        td = tdUrlOrTd;
      }

      // Create consumed thing
      const thing = this.createConsumedThing(thingId, td);
      this.things.set(thingId, thing);
      
      this.log(`Loaded thing: ${thingId}`, td);
      this.emit('thingLoaded', { thingId, td });
      
      return thing;
    } catch (error) {
      this.log(`Failed to load thing ${thingId}:`, error);
      throw new Error(`Failed to load thing ${thingId}: ${error.message}`);
    }
  }

  /**
   * Get a loaded thing by ID
   */
  getThing(thingId: string): WoTThing | undefined {
    return this.things.get(thingId);
  }

  /**
   * Get all loaded things
   */
  getAllThings(): Map<string, WoTThing> {
    return new Map(this.things);
  }

  /**
   * Read a property value with error handling and retries
   */
  async readProperty(thingId: string, propertyName: string): Promise<UiMsg<any>> {
    const startTime = Date.now();
    
    try {
      const thing = this.getThing(thingId);
      if (!thing) {
        throw new Error(`Thing not found: ${thingId}`);
      }

      const value = await this.withRetry(() => thing.readProperty(propertyName));
      
      const msg: UiMsg<any> = {
        payload: value,
        ts: Date.now(),
        source: `${thingId}.${propertyName}`,
        ok: true,
        meta: {
          operation: 'read',
          latency: Date.now() - startTime
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
          latency: Date.now() - startTime
        }
      };

      this.emit('propertyReadError', msg);
      throw error;
    }
  }

  /**
   * Write a property value with error handling and retries
   */
  async writeProperty(thingId: string, propertyName: string, value: any): Promise<UiMsg<any>> {
    const startTime = Date.now();
    
    try {
      const thing = this.getThing(thingId);
      if (!thing) {
        throw new Error(`Thing not found: ${thingId}`);
      }

      await this.withRetry(() => thing.writeProperty(propertyName, value));
      
      const msg: UiMsg<any> = {
        payload: value,
        ts: Date.now(),
        source: `${thingId}.${propertyName}`,
        ok: true,
        meta: {
          operation: 'write',
          latency: Date.now() - startTime
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
          latency: Date.now() - startTime
        }
      };

      this.emit('propertyWriteError', msg);
      throw error;
    }
  }

  /**
   * Observe a property with fallback to polling
   */
  async observeProperty(
    thingId: string, 
    propertyName: string, 
    callback: (msg: UiMsg<any>) => void,
    pollIntervalMs = 3000
  ): Promise<() => void> {
    const thing = this.getThing(thingId);
    if (!thing) {
      throw new Error(`Thing not found: ${thingId}`);
    }

    // Try native observation first
    if (thing.observeProperty) {
      try {
        const unsubscribe = await thing.observeProperty(propertyName, (value) => {
          const msg: UiMsg<any> = {
            payload: value,
            ts: Date.now(),
            source: `${thingId}.${propertyName}`,
            ok: true,
            meta: {
              operation: 'observe',
              method: 'native'
            }
          };
          callback(msg);
          this.emit('propertyObserved', msg);
        });
        
        this.log(`Started native observation for ${thingId}.${propertyName}`);
        return unsubscribe;
      } catch (error) {
        this.log(`Native observation failed for ${thingId}.${propertyName}, falling back to polling:`, error);
      }
    }

    // Fallback to polling
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
        setTimeout(poll, pollIntervalMs);
      }
    };

    // Start polling
    poll();
    this.log(`Started polling observation for ${thingId}.${propertyName} (${pollIntervalMs}ms)`);
    
    return () => {
      stopped = true;
      this.log(`Stopped observation for ${thingId}.${propertyName}`);
    };
  }

  /**
   * Invoke an action on a thing
   */
  async invokeAction(thingId: string, actionName: string, params?: any): Promise<UiMsg<any>> {
    const startTime = Date.now();
    
    try {
      const thing = this.getThing(thingId);
      if (!thing || !thing.invokeAction) {
        throw new Error(`Thing not found or actions not supported: ${thingId}`);
      }

      const result = await this.withRetry(() => thing.invokeAction!(actionName, params));
      
      const msg: UiMsg<any> = {
        payload: result,
        ts: Date.now(),
        source: `${thingId}.${actionName}`,
        ok: true,
        meta: {
          operation: 'action',
          latency: Date.now() - startTime,
          params
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
          params
        }
      };

      this.emit('actionError', msg);
      throw error;
    }
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
   * Get connection health status
   */
  async getHealthStatus(): Promise<{ [thingId: string]: 'connected' | 'error' | 'unknown' }> {
    const status: { [thingId: string]: 'connected' | 'error' | 'unknown' } = {};
    
    for (const [thingId, thing] of this.things) {
      try {
        // Try to read a property to test connectivity
        const properties = Object.keys(thing.properties || {});
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
   * Create a consumed thing from TD
   */
  private createConsumedThing(thingId: string, td: any): WoTThing {
    const baseUrl = td.base || this.config.baseUrl;
    const resolveUrl = this.resolveUrl.bind(this);
    const customFetch = this.config.customFetch;
    
    return {
      id: thingId,
      title: td.title,
      description: td.description,
      properties: td.properties,
      actions: td.actions,
      events: td.events,

      async readProperty(propertyName: string): Promise<any> {
        const property = td.properties?.[propertyName];
        if (!property) {
          throw new Error(`Property not found: ${propertyName}`);
        }

        const form = property.forms?.[0];
        if (!form) {
          throw new Error(`No form found for property: ${propertyName}`);
        }

        const url = resolveUrl(baseUrl, form.href);
        const response = await customFetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      },

      async writeProperty(propertyName: string, value: any): Promise<void> {
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

        const url = resolveUrl(baseUrl, form.href);
        const response = await customFetch(url, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(value)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      },

      async observeProperty(propertyName: string, _callback: (value: any) => void): Promise<() => void> {
        const property = td.properties?.[propertyName];
        if (!property?.observable) {
          throw new Error(`Property is not observable: ${propertyName}`);
        }

        // This is a simplified implementation - real WoT client would use WebSockets, SSE, etc.
        // For now, we just throw to trigger polling fallback
        throw new Error('Native observation not implemented - will fall back to polling');
      },

      async invokeAction(actionName: string, params?: any): Promise<any> {
        const action = td.actions?.[actionName];
        if (!action) {
          throw new Error(`Action not found: ${actionName}`);
        }

        const form = action.forms?.[0];
        if (!form) {
          throw new Error(`No form found for action: ${actionName}`);
        }

        const url = resolveUrl(baseUrl, form.href);
        const response = await customFetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: params ? JSON.stringify(params) : undefined
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      }
    };
  }

  /**
   * Resolve relative URLs against base URL
   */
  private resolveUrl(base: string, href: string): string {
    if (href.startsWith('http')) return href;
    if (!base) return href;
    return new URL(href, base).toString();
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await this.config.customFetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Retry wrapper for operations
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.log(`Attempt ${attempt}/${this.config.retryAttempts} failed:`, error);
        
        if (attempt < this.config.retryAttempts) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
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
 * Create a singleton WoT service instance
 */
export const wotService = new WoTService();
