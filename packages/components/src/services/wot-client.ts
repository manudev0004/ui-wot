/**
 * Lightweight Node-WoT client utilities for UI-WoT components.
 *
 * Tree-shakable named exports to keep bundles small.
 *
 * Usage (React):
 *
 * import { createWoTClient, consumeFromUrl } from '@thingweb/ui-wot-components/services';
 *
 * const client = await createWoTClient();
 * const thing = await consumeFromUrl(client, 'http://localhost:8080/counter/td');
 * await thing.writeProperty('enabled', true);
 *
 * // With a component (e.g., ui-toggle):
 * const toggle = document.querySelector('ui-toggle');
 * await bindProperty(toggle, thing, 'enabled');
 *
 * Usage (Angular/Vue): same APIs — they are framework-agnostic.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type WoTClient = {
  wot: any;
  stop: () => Promise<void> | void;
};

/**
 * Create a WoT client using Node-WoT if available; otherwise fall back to a no-op client.
 * This works in Node and in modern browsers with the Node-WoT browser bundle.
 *
 * - In browsers: if global `WoT` exists (e.g., from @node-wot/browser-bundle), it's used.
 * - In Node: tries to require '@node-wot/core' and '@node-wot/binding-http'.
 */
export async function createWoTClient(): Promise<WoTClient> {
  // Browser bundle present
  const g: any = globalThis as any;
  if (g.WoT) {
    const WoTGlobal = g.WoT;
    if (WoTGlobal.Core && WoTGlobal.Core.Servient && WoTGlobal.Http) {
      const servient = new WoTGlobal.Core.Servient();
      servient.addClientFactory(new WoTGlobal.Http.HttpClientFactory());
      const wot = await servient.start();
      return { wot, stop: async () => undefined };
    }
    if (typeof WoTGlobal.consume === 'function') {
      return { wot: WoTGlobal, stop: async () => undefined };
    }
  }

  // Try Node (dynamic require to avoid bundling in browser builds)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Core = require('@node-wot/core');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Http = require('@node-wot/binding-http');
    const servient = new Core.Servient();
    servient.addClientFactory(new Http.HttpClientFactory());
    const wot = await servient.start();
    return { wot, stop: async () => undefined };
  } catch {
    // Fallback no-op client
    const wot = { consume: (td: any) => createNoopThing(td) };
    return { wot, stop: async () => undefined };
  }
}

/** Consume a Thing Description directly from a URL. */
export async function consumeFromUrl(client: WoTClient, tdUrl: string): Promise<any> {
  const res = await fetch(tdUrl);
  if (!res.ok) throw new Error(`Failed to fetch TD: ${res.status} ${res.statusText}`);
  const td = await res.json();
  return client.wot.consume(td);
}

/** Consume a Thing from an already-parsed TD object. */
export async function consumeFromObject(client: WoTClient, td: any): Promise<any> {
  return client.wot.consume(td);
}

/** Simple registry for shared dashboard scenarios (single TD across multiple components). */
const registry = new Map<string, any>();

/** Register a Thing instance by a key (e.g., thing name). */
export function registerThing(key: string, thing: any): void {
  if (key) registry.set(key, thing);
}

/** Retrieve a Thing instance by key. */
export function getThing(key: string): any | undefined {
  return registry.get(key);
}

/** Read or write a property on a Thing. */
export async function property(thing: any, name: string, value?: any): Promise<any> {
  if (typeof value === 'undefined') return thing.readProperty(name);
  return thing.writeProperty(name, value);
}

/** Invoke an action on a Thing. */
export async function action(thing: any, name: string, input?: any): Promise<any> {
  return thing.invokeAction(name, input);
}

/**
 * Bind a UI component's value to a WoT property.
 * - Reads the property initially and every `pollMs`.
 * - Writes to the property when `change` events bubble from the element.
 *
 * The component must expose a standard `value` attribute and dispatch a `change` event
 * when the user changes it (common across UI-WoT components).
 *
 * Example:
 *
 * const client = await createWoTClient();
 * const thing = await consumeFromUrl(client, tdUrl);
 * const toggle = document.querySelector('ui-toggle');
 * await bindProperty(toggle, thing, 'enabled', { pollMs: 2000 });
 */
export type ObserveStrategy = 'observe' | 'poll' | 'auto';

/**
 * Bind a UI component's value to a WoT property using observation or polling.
 * - strategy:
 *   - 'observe': only use thing.observeProperty; throw if unavailable
 *   - 'poll': only polling with given pollMs (default ~3–5s)
 *   - 'auto' (default): try observe first, then fall back to polling
 * - Returns a stop() function to unsubscribe/clear timers. Ignoring the return is fine.
 */
export async function bindProperty(
  element: HTMLElement,
  thing: any,
  propertyName: string,
  opts?: { pollMs?: number; strategy?: ObserveStrategy }
): Promise<() => void> {
  const pollMs = opts?.pollMs ?? 3500;
  const strategy: ObserveStrategy = opts?.strategy ?? 'auto';

  let cleanupFns: Array<() => void> = [];

  const applyIncoming = (v: any) => {
    if (typeof v !== 'undefined') {
      element.setAttribute('value', String(v));
      // If component is readonly and supports pulse, trigger it
      if (element.hasAttribute('readonly')) {
        tryTriggerReadPulse(element);
      }
    }
  };

  // Initial read
  try {
    const current = await thing.readProperty(propertyName);
    applyIncoming(current);
  } catch {/* ignore */}

  const startPolling = () => {
    const timer = setInterval(async () => {
      if (!element.isConnected) return;
      try {
        const v = await thing.readProperty(propertyName);
        applyIncoming(v);
      } catch {/* ignore */}
    }, pollMs);
    cleanupFns.push(() => clearInterval(timer));
    return true;
  };

  const tryObserve = async (): Promise<boolean> => {
    try {
      if (typeof thing.observeProperty !== 'function') return false;
      // Some implementations return a subscription with unsubscribe/stop
      const listener = (data: any) => applyIncoming(resolveObservedValue(data));
      const subscription = await thing.observeProperty(propertyName, listener);
      if (subscription && typeof subscription.unsubscribe === 'function') {
        cleanupFns.push(() => subscription.unsubscribe());
      } else if (typeof thing.unobserveProperty === 'function') {
        cleanupFns.push(() => {
          try { thing.unobserveProperty(propertyName, listener); } catch {/* ignore */}
        });
      }
      return true;
    } catch {
      return false;
    }
  };

  // Strategy selection
  if (strategy === 'observe') {
    const ok = await tryObserve();
    if (!ok) throw new Error('observeProperty not available for this TD/property');
  } else if (strategy === 'poll') {
    startPolling();
  } else {
    const ok = await tryObserve();
    if (!ok) startPolling();
  }

  // Write on change
  const onChange = async () => {
    // Prefer property if present, else attribute
    // @ts-ignore
    const newVal = (element as any).value ?? element.getAttribute('value');
    try {
      await thing.writeProperty(propertyName, coerceValue(newVal));
    } catch {/* ignore */}
  };
  element.addEventListener('change', onChange);
  cleanupFns.push(() => element.removeEventListener('change', onChange));

  // Auto-cleanup when element is removed from DOM
  const obs = new MutationObserver(() => {
    if (!element.isConnected) {
      cleanupFns.forEach(fn => { try { fn(); } catch {/* ignore */} });
      cleanupFns = [];
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
  cleanupFns.push(() => obs.disconnect());

  return () => {
    cleanupFns.forEach(fn => { try { fn(); } catch {/* ignore */} });
    cleanupFns = [];
  };
}

/** Try to trigger the Stencil component's public read pulse method if present. */
export function tryTriggerReadPulse(element: HTMLElement): void {
  const anyEl: any = element as any;
  if (anyEl && typeof anyEl.triggerReadPulse === 'function') {
    try { anyEl.triggerReadPulse(); } catch {/* ignore */}
  }
}

/** Normalize observed values that may carry { value() } wrappers. */
function resolveObservedValue(data: any): any {
  try {
    if (data && typeof data.value === 'function') return data.value();
  } catch {/* ignore */}
  return data;
}

/**
 * Manually refresh a property's value once (useful with readonly components).
 * - Reads the property, applies it to the element's `value` attribute, then triggers the read pulse if available.
 * - This is a one-off read; for continuous updates use `bindProperty` with observe/poll.
 *
 * Example:
 * const thing = await quickConnect(tdUrl, 'device');
 * const num = document.querySelector('ui-number-picker');
 * await refreshProperty(num, thing, 'level');
 */
export async function refreshProperty(element: HTMLElement, thing: any, propertyName: string): Promise<void> {
  try {
    const v = await thing.readProperty(propertyName);
    if (typeof v !== 'undefined') {
      element.setAttribute('value', String(v));
      if (element.hasAttribute('readonly')) tryTriggerReadPulse(element);
    }
  } catch {/* ignore */}
}

function coerceValue(v: any): any {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === '' || v === null || typeof v === 'undefined') return v;
  const n = Number(v);
  return Number.isNaN(n) ? v : n;
}

function createNoopThing(_td: any) {
  return {
    readProperty: async (_k: string) => undefined,
    writeProperty: async (_k: string, val: any) => val,
    invokeAction: async (_k: string, _in?: any) => ({ result: 'noop' }),
  };
}

/**
 * Convenience helper for dashboards:
 * - Create client, consume TD, register it under `thingName` and return the Thing.
 *
 * Example:
 *
 * const thing = await quickConnect('http://host/coffee/td', 'coffee');
 * const btn = document.querySelector('ui-button');
 * btn.addEventListener('click', () => action(thing, 'brew'));
 */
export async function quickConnect(tdUrl: string, thingName: string): Promise<any> {
  const client = await createWoTClient();
  const thing = await consumeFromUrl(client, tdUrl);
  registerThing(thingName, thing);
  return thing;
}
