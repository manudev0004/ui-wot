/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Browser helpers for wiring Web Components to a WoT Thing using the Node‑WoT browser bundle.
 *
 * Expectations:
 * - The Node‑WoT browser bundle exposes `window.WoT` (either a Servient constructor with HttpClientFactory
 *   or a direct `consume()` function).
 * - Functions here do not alter component public APIs. They only call existing methods like `setValue`,
 *   `setValueSilent`, `setAction`, `startListening`, and `addEvent` when present.
 *
 * Design:
 * - Keep external props untouched; update internal component state via provided methods.
 * - Properties support strategies: observe, poll, or auto. Default is no continuous updates.
 * - Events are started by the component via `startListening()`; this module wires WoT subscribe/unsubscribe.
 */

/** Cleanup callback for a connection (properties/events). */
type Cleanup = () => void | Promise<void>;

/** Continuous update strategies for properties. */
type ObserveStrategy = 'observe' | 'poll' | 'auto';

/** Options for initializing the global WoT instance. */
export type InitializeWotOptions = { reuseExisting?: boolean };

let sharedWot: any | null = null;
const thingCache = new Map<string, any>();

/**
 * Initialize and cache a WoT instance from the Node‑WoT browser bundle.
 * - If a Servient is available, start it with an Http client factory.
 * - Otherwise, if `consume()` exists directly, use that object as WoT.
 */
export async function initializeWot(options?: InitializeWotOptions): Promise<{ wot: any }> {
  const reuseExisting = options?.reuseExisting !== false;
  if (reuseExisting && sharedWot) return { wot: sharedWot };

  const wotGlobal: any = (window as any).WoT;
  if (!wotGlobal) {
    throw new Error('Node-WoT browser bundle not found. Include wot-bundle.min.js before using initializeWot().');
  }

  if (wotGlobal.Core && wotGlobal.Core.Servient && wotGlobal.Http && typeof wotGlobal.Core.Servient === 'function') {
    const servient = new wotGlobal.Core.Servient();
    servient.addClientFactory(new wotGlobal.Http.HttpClientFactory());
    sharedWot = await servient.start();
  } else if (typeof wotGlobal.consume === 'function') {
    sharedWot = wotGlobal;
  } else {
    throw new Error('Unsupported WoT global shape: expected Core.Servient + HttpClientFactory or consume().');
  }

  return { wot: sharedWot };
}

/** Alias for a common misspelling of `initializeWot`. */
export const initiliseWot = initializeWot;

/** Fetch and consume a Thing Description, with simple in-memory caching by URL. */
async function ensureThing(thingDescriptionUrl: string): Promise<any> {
  if (thingCache.has(thingDescriptionUrl)) return thingCache.get(thingDescriptionUrl);
  if (!sharedWot) await initializeWot();
  const response = await fetch(thingDescriptionUrl);
  if (!response.ok) throw new Error(`Failed to fetch TD: ${response.status} ${response.statusText}`);
  const td = await response.json();
  const thing = await (sharedWot as any).consume(td);
  thingCache.set(thingDescriptionUrl, thing);
  return thing;
}

/** Normalize Node‑WoT results that expose a `.value()` function. */
async function readOutputValue(output: any): Promise<any> {
  if (output && typeof output.value === 'function') return output.value();
  return output;
}

/** Get the first present attribute value from a list of attribute names. */
function getAttr(element: Element, ...names: string[]): string | null {
  for (const name of names) {
    const v = element.getAttribute(name);
    if (v != null) return v;
  }
  return null;
}

/** Parse a positive integer from a string; return undefined if invalid/non-positive. */
function parsePositiveInt(value?: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Connect a property element to a WoT Thing property.
 * - Sets initial value (if available) and wires a write operation.
 * - Optional continuous updates via observe, poll, or auto strategy.
 */
export async function connectProperty(element: HTMLElement, options: { baseUrl: string; name: string; observe?: boolean; strategy?: ObserveStrategy; pollMs?: number }): Promise<Cleanup> {
  const component: any = element as any;
  const { baseUrl: thingUrl, name: propertyName } = options;
  // Default: disabled continuous updates unless a strategy is provided.
  // Back-compat: if observe === false and no strategy is provided, fallback to 'poll'.
  const strategy: ObserveStrategy | undefined = options.strategy ?? (options.observe === false ? 'poll' : undefined);
  const pollMs = Number.isFinite(options.pollMs as any) && (options.pollMs as number) > 0 ? (options.pollMs as number) : 3000;
  const thing = await ensureThing(thingUrl);

  try {
    const initialOut = await thing.readProperty(propertyName);
    const initialValue = await readOutputValue(initialOut);
    await component.setValue?.(initialValue, { writeOperation: async (next: any) => thing.writeProperty(propertyName, next) });
  } catch (err) {
    console.warn('[ui-wot][connectProperty] initial read failed', { propertyName, error: String(err) });
    try {
      // Ensure write support even if the initial read fails
      await component.setValue?.({}, { writeOperation: async (next: any) => thing.writeProperty(propertyName, next) });
    } catch {}
  }

  const cleanups: Cleanup[] = [];
  const startObserve = async () => {
    const subscription = await thing.observeProperty(propertyName, async (data: any) => {
      const value = await readOutputValue(data);
      if (typeof component.setValueSilent === 'function') await component.setValueSilent(value);
      else await component.setValue?.(value);
    });
    cleanups.push(() => subscription?.unsubscribe?.());
    return true;
  };
  const startPoll = () => {
    const timerId = setInterval(async () => {
      try {
        const out = await thing.readProperty(propertyName);
        const value = await readOutputValue(out);
        if (typeof component.setValueSilent === 'function') await component.setValueSilent(value);
        else await component.setValue?.(value);
      } catch {
        // ignore transient poll errors
      }
    }, pollMs);
    cleanups.push(() => clearInterval(timerId));
  };

  if (strategy === 'observe') {
    if (typeof thing.observeProperty !== 'function') throw new Error('observeProperty not supported for ' + propertyName);
    await startObserve();
  } else if (strategy === 'poll') {
    startPoll();
  } else if (strategy === 'auto') {
    let isObserved = false;
    if (typeof thing.observeProperty === 'function') {
      try {
        isObserved = await startObserve();
      } catch {
        isObserved = false;
      }
    }
    if (!isObserved) startPoll();
  } else {
    // no continuous updates
  }

  return () => {
    for (const fn of cleanups) {
      try {
        fn();
      } catch {}
    }
  };
}

/** Wire a button-like component to invoke a WoT Thing action. */
export async function connectAction(element: HTMLElement, options: { baseUrl: string; name: string }): Promise<void> {
  const component: any = element as any;
  const { baseUrl: thingUrl, name: actionName } = options;
  const thing = await ensureThing(thingUrl);
  if (typeof component.setAction === 'function') {
    await component.setAction(async (input?: any) => thing.invokeAction(actionName, input));
  }
}

/**
 * Wire an event component to a WoT Thing event.
 * The component is expected to call `startListening()` / `stopListening()`; we hook those to manage subscriptions.
 */
export async function connectEvent(element: HTMLElement, options: { baseUrl: string; name: string }): Promise<Cleanup> {
  const component: any = element as any;
  const { baseUrl: thingUrl, name: eventName } = options;
  const thing = await ensureThing(thingUrl);

  let subscription: any | undefined;
  let isSubscribed = false;
  let isPaused = true;

  const onEvent = async (data: any) => {
    if (isPaused) return;
    const value = await readOutputValue(data);
    component.addEvent?.(value);
  };

  const subscribe = async () => {
    if (isSubscribed) return;
    if (typeof thing.subscribeEvent === 'function') {
      subscription = await thing.subscribeEvent(eventName, onEvent);
      isSubscribed = true;
    }
  };

  const unsubscribe = async () => {
    if (!isSubscribed) return;
    try {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        const ret = subscription.unsubscribe();
        if (ret && typeof (ret as Promise<any>).then === 'function') await ret;
      } else if (typeof (thing as any).unsubscribeEvent === 'function') {
        try {
          await (thing as any).unsubscribeEvent(eventName, onEvent);
        } catch {
          try {
            await (thing as any).unsubscribeEvent(eventName);
          } catch {
            // best-effort only
          }
        }
      } else if (typeof (thing as any).removeEventListener === 'function') {
        try {
          (thing as any).removeEventListener(eventName, onEvent);
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
    subscription = undefined;
    isSubscribed = false;
  };

  // Wrap component methods to control WoT subscription lifecycle.
  const originalStartListening = typeof component.startListening === 'function' ? component.startListening.bind(component) : undefined;
  const originalStopListening = typeof component.stopListening === 'function' ? component.stopListening.bind(component) : undefined;

  if (originalStopListening) {
    component.stopListening = async () => {
      await originalStopListening();
      isPaused = true;
    };
  }
  if (originalStartListening) {
    component.startListening = async () => {
      await originalStartListening();
      isPaused = false;
      await subscribe();
    };
  }

  // Do NOT auto-start; let the component/user trigger startListening.
  return () => {
    isPaused = true;
    void unsubscribe();
    if (originalStartListening) component.startListening = originalStartListening;
    if (originalStopListening) component.stopListening = originalStopListening;
  };
}

/**
 * Connect all matching UI elements within a container to a Thing at `baseUrl`.
 * - Properties: `[data-td-property] | [td-property] | [property]`
 * - Actions:    `[data-td-action] | [td-action] | [action]`
 * - Events:     `[data-td-event] | [td-event] | [event]`
 */
export async function connectAll(options: { baseUrl: string; container?: ParentNode }): Promise<Cleanup[]> {
  const searchRoot = options.container || document;
  const defaultThingUrl = options.baseUrl;
  const cleanups: Cleanup[] = [];

  // Properties
  const propertyElements = Array.from(searchRoot.querySelectorAll<HTMLElement>('[data-td-property],[td-property],[property]'));
  for (const element of propertyElements) {
    const propertyName = getAttr(element, 'data-td-property', 'td-property', 'property');
    if (!propertyName) continue;
    const thingUrl = getAttr(element, 'data-td-url', 'td-url', 'url') || defaultThingUrl;
    const anyElement: any = element as any;
    if (typeof anyElement.setValue === 'function' || typeof anyElement.setValueSilent === 'function') {
      try {
        const strategyAttr = getAttr(element, 'data-td-strategy', 'td-strategy', 'strategy') as ObserveStrategy | null;
        const pollMs = parsePositiveInt(getAttr(element, 'data-td-poll-ms', 'td-poll-ms', 'poll-ms'));
        const stop = await connectProperty(element, {
          baseUrl: thingUrl,
          name: propertyName,
          strategy: strategyAttr ?? undefined,
          pollMs,
        });
        if (stop) cleanups.push(stop);
      } catch (err) {
        console.warn('[ui-wot][connectAll] property wire failed', { propertyName, error: String(err) });
      }
    }
  }

  // Actions
  const actionElements = Array.from(searchRoot.querySelectorAll<HTMLElement>('[data-td-action],[td-action],[action]'));
  for (const element of actionElements) {
    const actionName = getAttr(element, 'data-td-action', 'td-action', 'action');
    if (!actionName) continue;
    const anyElement: any = element as any;
    if (typeof anyElement.setAction === 'function') {
      try {
        const thingUrl = getAttr(element, 'data-td-url', 'td-url', 'url') || defaultThingUrl;
        await connectAction(element, { baseUrl: thingUrl, name: actionName });
      } catch {}
    }
  }

  // Events
  const eventElements = Array.from(searchRoot.querySelectorAll<HTMLElement>('[data-td-event],[td-event],[event]'));
  for (const element of eventElements) {
    const eventName = getAttr(element, 'data-td-event', 'td-event', 'event');
    if (!eventName) continue;
    const anyElement: any = element as any;
    if (typeof anyElement.startListening === 'function' && typeof anyElement.addEvent === 'function') {
      try {
        const thingUrl = getAttr(element, 'data-td-url', 'td-url', 'url') || defaultThingUrl;
        const stop = await connectEvent(element, { baseUrl: thingUrl, name: eventName });
        if (stop) cleanups.push(stop);
      } catch {}
    }
  }

  return cleanups;
}
