import { WoTService } from './wot-service';
import { UiMsg } from '../utils/types';

/**
 * Property binding configuration
 */
export interface PropertyBinding {
  /** Thing ID */
  thingId: string;
  /** Property name */
  property: string;
  /** Target element selector or element reference */
  target: string | HTMLElement;
  /** Property to bind on target element */
  targetProperty?: string;
  /** Transform function for incoming values */
  transform?: (value: any) => any;
  /** Transform function for outgoing values */
  transformOut?: (value: any) => any;
  /** Observation interval for polling (ms) */
  observeInterval?: number;
  /** Enable two-way binding */
  twoWay?: boolean;
  /** Custom event name for updates */
  updateEvent?: string;
  /** Validation function */
  validate?: (value: any) => boolean | string;
  /** Error handler */
  onError?: (error: Error, binding: PropertyBinding) => void;
}

/**
 * Binding instance for tracking active bindings
 */
export interface ActiveBinding extends PropertyBinding {
  id: string;
  unsubscribe?: () => void;
  element?: HTMLElement;
}

/**
 * WoT Property Binder for declarative bindings between WoT properties and UI elements
 */
export class WoTBinder {
  private bindings = new Map<string, ActiveBinding>();
  private bindingCounter = 0;

  constructor(private wotService: WoTService) {}

  /**
   * Create a property binding
   */
  async bind(config: PropertyBinding): Promise<string> {
    const bindingId = `binding_${++this.bindingCounter}`;
    
    // Resolve target element
    const element = this.resolveElement(config.target);
    if (!element) {
      throw new Error(`Target element not found: ${config.target}`);
    }

    const binding: ActiveBinding = {
      ...config,
      id: bindingId,
      element,
      targetProperty: config.targetProperty || 'value'
    };

    try {
      // Start observation
      const unsubscribe = await this.wotService.observeProperty(
        config.thingId,
        config.property,
        (msg: UiMsg<any>) => this.handlePropertyUpdate(binding, msg),
        { interval: config.observeInterval }
      );

      binding.unsubscribe = unsubscribe;

      // Set up two-way binding if enabled
      if (config.twoWay) {
        this.setupTwoWayBinding(binding);
      }

      // Initial value fetch
      try {
        const initialMsg = await this.wotService.readProperty(config.thingId, config.property);
        this.handlePropertyUpdate(binding, initialMsg);
      } catch (error) {
        console.warn(`Failed to fetch initial value for ${config.thingId}.${config.property}:`, error);
      }

      this.bindings.set(bindingId, binding);
      return bindingId;

    } catch (error) {
      throw new Error(`Failed to create binding: ${error.message}`);
    }
  }

  /**
   * Remove a binding
   */
  unbind(bindingId: string): boolean {
    const binding = this.bindings.get(bindingId);
    if (!binding) return false;

    // Clean up observation
    if (binding.unsubscribe) {
      binding.unsubscribe();
    }

    // Remove event listeners
    if (binding.element && binding.twoWay) {
      const eventName = binding.updateEvent || this.getDefaultUpdateEvent(binding.element);
      const handler = (binding.element as any)._wotBindingHandler;
      if (handler) {
        binding.element.removeEventListener(eventName, handler);
        delete (binding.element as any)._wotBindingHandler;
      }
    }

    this.bindings.delete(bindingId);
    return true;
  }

  /**
   * Remove all bindings
   */
  unbindAll(): void {
    for (const bindingId of this.bindings.keys()) {
      this.unbind(bindingId);
    }
  }

  /**
   * Get active bindings
   */
  getBindings(): Map<string, ActiveBinding> {
    return new Map(this.bindings);
  }

  /**
   * Get bindings for a specific thing
   */
  getBindingsForThing(thingId: string): ActiveBinding[] {
    return Array.from(this.bindings.values()).filter(b => b.thingId === thingId);
  }

  /**
   * Bind multiple properties from a configuration object
   */
  async bindFromConfig(config: { [key: string]: PropertyBinding }): Promise<{ [key: string]: string }> {
    const results: { [key: string]: string } = {};
    
    for (const [key, binding] of Object.entries(config)) {
      try {
        results[key] = await this.bind(binding);
      } catch (error) {
        console.error(`Failed to bind ${key}:`, error);
        throw error;
      }
    }
    
    return results;
  }

  /**
   * Bind properties declaratively from HTML attributes
   */
  bindFromAttributes(container: HTMLElement = document.body): string[] {
    const bindingIds: string[] = [];
    const elements = container.querySelectorAll('[data-wot-bind]');
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i] as HTMLElement;
      try {
        const bindingConfig = this.parseBindingAttribute(element as HTMLElement);
        if (bindingConfig) {
          this.bind(bindingConfig).then(id => bindingIds.push(id));
        }
      } catch (error) {
        console.error('Failed to parse binding attribute:', error);
      }
    }
    
    return bindingIds;
  }

  /**
   * Handle property updates from WoT service
   */
  private handlePropertyUpdate(binding: ActiveBinding, msg: UiMsg<any>): void {
    try {
      if (!msg.ok) {
        if (binding.onError) {
          binding.onError(new Error(msg.error?.message || 'Property update failed'), binding);
        }
        return;
      }

      let value = msg.payload;

      // Apply transformation
      if (binding.transform) {
        value = binding.transform(value);
      }

      // Update target element
      this.updateElement(binding.element!, binding.targetProperty!, value);

    } catch (error) {
      if (binding.onError) {
        binding.onError(error as Error, binding);
      } else {
        console.error('Error handling property update:', error);
      }
    }
  }

  /**
   * Set up two-way binding for element changes
   */
  private setupTwoWayBinding(binding: ActiveBinding): void {
    if (!binding.element) return;

    const eventName = binding.updateEvent || this.getDefaultUpdateEvent(binding.element);
    
    const handler = async () => {
      try {
        let value = this.getElementValue(binding.element!, binding.targetProperty!);

        // Apply validation
        if (binding.validate) {
          const validation = binding.validate(value);
          if (validation !== true) {
            const message = typeof validation === 'string' ? validation : 'Validation failed';
            throw new Error(message);
          }
        }

        // Apply outbound transformation
        if (binding.transformOut) {
          value = binding.transformOut(value);
        }

        // Write to WoT property
        await this.wotService.writeProperty(binding.thingId, binding.property, value);

      } catch (error) {
        if (binding.onError) {
          binding.onError(error as Error, binding);
        } else {
          console.error('Error in two-way binding:', error);
        }
      }
    };

    // Store handler for cleanup
    (binding.element as any)._wotBindingHandler = handler;
    binding.element.addEventListener(eventName, handler);
  }

  /**
   * Resolve element from string selector or element reference
   */
  private resolveElement(target: string | HTMLElement): HTMLElement | null {
    if (typeof target === 'string') {
      return document.querySelector(target);
    }
    return target;
  }

  /**
   * Update element property/attribute
   */
  private updateElement(element: HTMLElement, property: string, value: any): void {
    if (property === 'textContent') {
      element.textContent = String(value);
    } else if (property === 'innerHTML') {
      element.innerHTML = String(value);
    } else if (property.startsWith('attr:')) {
      const attrName = property.substring(5);
      element.setAttribute(attrName, String(value));
    } else if (property in element) {
      (element as any)[property] = value;
    } else {
      element.setAttribute(property, String(value));
    }
  }

  /**
   * Get element value
   */
  private getElementValue(element: HTMLElement, property: string): any {
    if (property === 'textContent') {
      return element.textContent;
    } else if (property === 'innerHTML') {
      return element.innerHTML;
    } else if (property.startsWith('attr:')) {
      const attrName = property.substring(5);
      return element.getAttribute(attrName);
    } else if (property in element) {
      return (element as any)[property];
    } else {
      return element.getAttribute(property);
    }
  }

  /**
   * Get default update event for element type
   */
  private getDefaultUpdateEvent(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();
    
    switch (tagName) {
      case 'input':
        const inputType = (element as HTMLInputElement).type.toLowerCase();
        if (inputType === 'checkbox' || inputType === 'radio') {
          return 'change';
        }
        return 'input';
      case 'select':
      case 'textarea':
        return 'change';
      default:
        // Check for custom elements with uiChange event
        if (tagName.includes('-')) {
          return 'uiChange';
        }
        return 'input';
    }
  }

  /**
   * Parse data-wot-bind attribute
   */
  private parseBindingAttribute(element: HTMLElement): PropertyBinding | null {
    const bindAttr = element.getAttribute('data-wot-bind');
    if (!bindAttr) return null;

    try {
      // Support both JSON and shorthand formats
      if (bindAttr.startsWith('{')) {
        // JSON format: {"thingId": "device1", "property": "temperature"}
        const config = JSON.parse(bindAttr);
        return {
          target: element,
          ...config
        };
      } else {
        // Shorthand format: "device1.temperature"
        const [thingId, property] = bindAttr.split('.');
        if (!thingId || !property) {
          throw new Error('Invalid shorthand format. Expected: "thingId.property"');
        }
        
        return {
          thingId,
          property,
          target: element,
          twoWay: element.hasAttribute('data-wot-two-way'),
          observeInterval: element.hasAttribute('data-wot-interval') 
            ? parseInt(element.getAttribute('data-wot-interval')!) 
            : undefined
        };
      }
    } catch (error) {
      console.error('Failed to parse binding attribute:', bindAttr, error);
      return null;
    }
  }
}

/**
 * Create a default binder instance
 */
export function createBinder(wotService: WoTService): WoTBinder {
  return new WoTBinder(wotService);
}
