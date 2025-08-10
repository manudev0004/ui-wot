/**
 * In the browser, node-wot only works in client mode with limited binding support.
 * Supported bindings: HTTP / HTTPS / WebSockets
 *
 * After adding the following <script> tag to your HTML page:
 * <script src="https://cdn.jsdelivr.net/npm/@node-wot/browser-bundle@latest/dist/wot-bundle.min.js" defer></script>
 *
 * you can access all node-wot functionality / supported packages through the "WoT" global object.
 * Examples:
 * var servient = new WoT.Core.Servient();
 * var client = new WoT.Http.HttpClient();
 *
 **/

declare const window: any;

export interface WotResult {
  success: boolean;
  value?: any;
  error?: string;
}

export interface TdInfo {
  thingUrl: string;
  propertyName?: string;
  actionName?: string;
  eventName?: string;
  affordanceType: 'property' | 'action' | 'event' | 'thing';
}

export class WotService {
  private static servient: any;
  private static thingFactory: any;
  private static thingCache: Map<string, any> = new Map();
  private static isInitialized: boolean = false;

  static async initialize(): Promise<any> {
    if (!this.isInitialized) {
      try {
        // var servient = new WoT.Core.Servient();
        this.servient = new window.WoT.Core.Servient();
        this.servient.addClientFactory(new window.WoT.Http.HttpClientFactory());
        
        this.thingFactory = await this.servient.start();
        this.isInitialized = true;
      } catch (error) {
        throw error;
      }
    }
    return this.thingFactory;
  }

  /**
   * Parse TD URL to extract thing URL and affordance information
   */
  static parseTdUrl(url: string): TdInfo {
    // Handle property URLs: http://device.local/properties/temperature
    const propertyMatch = url.match(/^(.+)\/properties\/(.+)$/);
    if (propertyMatch) {
      return {
        thingUrl: propertyMatch[1],
        propertyName: propertyMatch[2],
        affordanceType: 'property'
      };
    }

    // Handle action URLs: http://device.local/actions/reboot
    const actionMatch = url.match(/^(.+)\/actions\/(.+)$/);
    if (actionMatch) {
      return {
        thingUrl: actionMatch[1],
        actionName: actionMatch[2],
        affordanceType: 'action'
      };
    }

    // Handle event URLs: http://device.local/events/motion
    const eventMatch = url.match(/^(.+)\/events\/(.+)$/);
    if (eventMatch) {
      return {
        thingUrl: eventMatch[1],
        eventName: eventMatch[2],
        affordanceType: 'event'
      };
    }

    // Fallback to full TD URL (when pointing to the TD itself)
    return {
      thingUrl: url,
      affordanceType: 'thing'
    };
  }

  /**
   * Consume a Thing Description - following official WoT consume pattern
   */
  static async consumeThing(thingUrl: string): Promise<any> {
    await this.initialize();

    if (this.thingCache.has(thingUrl)) {
      return this.thingCache.get(thingUrl);
    }

    try {
      // Official pattern: requestThingDescription then consume
      const tdInfo = this.parseTdUrl(thingUrl);
      const actualTdUrl = tdInfo.thingUrl;

      const td = await this.thingFactory.requestThingDescription(actualTdUrl);
      const thing = await this.thingFactory.consume(td);
      
      this.thingCache.set(actualTdUrl, thing);
      return thing;
    } catch (error) {
      throw new Error(`Failed to consume thing: ${error.message}`);
    }
  }

  /**
   * Read property - following official WoT readProperty pattern
   */
  static async readProperty(tdUrl: string, propertyName?: string): Promise<WotResult> {
    try {
      const tdInfo = this.parseTdUrl(tdUrl);
      const thing = await this.consumeThing(tdInfo.thingUrl);
      
      const propName = propertyName || tdInfo.propertyName;
      if (!propName) {
        throw new Error('Property name not specified and could not be extracted from URL');
      }

      // Official pattern: thing.readProperty(name).then(async (res) => res.value())
      const result = await thing.readProperty(propName);
      const value = await result.value();
      
      return {
        success: true,
        value: value
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to read property'
      };
    }
  }

  /**
   * Write property - following official WoT writeProperty pattern
   */
  static async writeProperty(tdUrl: string, value: any, propertyName?: string): Promise<WotResult> {
    try {
      const tdInfo = this.parseTdUrl(tdUrl);
      const thing = await this.consumeThing(tdInfo.thingUrl);
      
      const propName = propertyName || tdInfo.propertyName;
      if (!propName) {
        throw new Error('Property name not specified and could not be extracted from URL');
      }

      // Official pattern: thing.writeProperty(name, value)
      await thing.writeProperty(propName, value);
      
      return {
        success: true,
        value: value
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to write property'
      };
    }
  }

  /**
   * Invoke action - following official WoT invokeAction pattern
   */
  static async invokeAction(tdUrl: string, input?: any, actionName?: string): Promise<WotResult> {
    try {
      const tdInfo = this.parseTdUrl(tdUrl);
      const thing = await this.consumeThing(tdInfo.thingUrl);
      
      const actName = actionName || tdInfo.actionName;
      if (!actName) {
        throw new Error('Action name not specified and could not be extracted from URL');
      }

      // Official pattern: thing.invokeAction(name, input).then(async (res) => res.value())
      const result = await thing.invokeAction(actName, input);
      const value = result ? await result.value() : undefined;
      
      return {
        success: true,
        value: value
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to invoke action'
      };
    }
  }

  /**
   * Subscribe to event - following official WoT subscribeEvent pattern
   */
  static async subscribeEvent(tdUrl: string, callback: (data: any) => void, eventName?: string): Promise<WotResult> {
    try {
      const tdInfo = this.parseTdUrl(tdUrl);
      const thing = await this.consumeThing(tdInfo.thingUrl);
      
      const evtName = eventName || tdInfo.eventName;
      if (!evtName) {
        throw new Error('Event name not specified and could not be extracted from URL');
      }

      // Official pattern: thing.subscribeEvent(name, async function (data) { ... })
      const subscription = await thing.subscribeEvent(evtName, async function (data: any) {
        const value = await data.value();
        callback(value);
      });
      
      return {
        success: true,
        value: subscription
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to subscribe to event'
      };
    }
  }

  /**
   * Observe property changes - following official WoT observeProperty pattern
   */
  static async observeProperty(tdUrl: string, callback: (data: any) => void, propertyName?: string): Promise<WotResult> {
    try {
      const tdInfo = this.parseTdUrl(tdUrl);
      const thing = await this.consumeThing(tdInfo.thingUrl);
      
      const propName = propertyName || tdInfo.propertyName;
      if (!propName) {
        throw new Error('Property name not specified and could not be extracted from URL');
      }

      // Official pattern: thing.observeProperty(name, async function (data) { ... })
      const subscription = await thing.observeProperty(propName, async function (data: any) {
        const value = await data.value();
        callback(value);
      });
      
      return {
        success: true,
        value: subscription
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to observe property'
      };
    }
  }

  /**
   * Get Thing Description details - standard WoT getThingDescription pattern
   */
  static async getThingInfo(tdUrl: string): Promise<WotResult> {
    try {
      const tdInfo = this.parseTdUrl(tdUrl);
      const thing = await this.consumeThing(tdInfo.thingUrl);
      
      // Official pattern: thing.getThingDescription()
      const td = thing.getThingDescription();
      
      const info = {
        id: td.id,
        title: td.title,
        description: td.description,
        properties: Object.keys(td.properties || {}),
        actions: Object.keys(td.actions || {}),
        events: Object.keys(td.events || {}),
        security: td.security || [],
        base: td.base
      };
      
      return {
        success: true,
        value: info
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to get thing info'
      };
    }
  }

  /**
   * Clear the thing cache
   */
  static clearCache() {
    this.thingCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    return {
      size: this.thingCache.size,
      entries: Array.from(this.thingCache.keys())
    };
  }
}
