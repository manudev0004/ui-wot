/* eslint-disable @typescript-eslint/no-explicit-any */

// Simple, strict Node-WoT helpers: require the browser bundle (window.WoT)
// No dynamic loading, no polling fallbacks — Node-WoT only.

type Cleanup = () => void | Promise<void>;

type ObserveStrategy = 'observe' | 'poll' | 'auto';

export type InitializeWotOptions = { reuseExisting?: boolean };

let sharedWot: any | null = null;
const thingCache = new Map<string, any>();

export async function initializeWot(options?: InitializeWotOptions): Promise<{ wot: any }> {
  const reuse = options?.reuseExisting !== false;
  if (reuse && sharedWot) return { wot: sharedWot };

  const WoTGlobal: any = (window as any).WoT;
  if (!WoTGlobal) {
    throw new Error('Node-WoT browser bundle not found. Include wot-bundle.min.js before using initializeWot().');
  }

  if (WoTGlobal.Core && WoTGlobal.Core.Servient && WoTGlobal.Http && typeof WoTGlobal.Core.Servient === 'function') {
    const servient = new WoTGlobal.Core.Servient();
    servient.addClientFactory(new WoTGlobal.Http.HttpClientFactory());
    sharedWot = await servient.start();
  } else if (typeof WoTGlobal.consume === 'function') {
    sharedWot = WoTGlobal;
  } else {
    throw new Error('Unsupported WoT global shape: expected Core.Servient + HttpClientFactory or consume().');
  }

  return { wot: sharedWot };
}

// Alias for misspelling tolerance
export const initiliseWot = initializeWot;

async function ensureThing(tdUrl: string): Promise<any> {
  if (thingCache.has(tdUrl)) return thingCache.get(tdUrl);
  if (!sharedWot) await initializeWot();
  const res = await fetch(tdUrl);
  if (!res.ok) throw new Error(`Failed to fetch TD: ${res.status} ${res.statusText}`);
  const td = await res.json();
  const thing = await (sharedWot as any).consume(td);
  thingCache.set(tdUrl, thing);
  return thing;
}

async function readOutputValue(output: any): Promise<any> {
  if (output && typeof output.value === 'function') return output.value();
  return output;
}

export async function connectProperty(el: HTMLElement, opts: { baseUrl: string; name: string; observe?: boolean; strategy?: ObserveStrategy; pollMs?: number }): Promise<Cleanup> {
  const comp: any = el as any;
  const { baseUrl, name } = opts;
  // Default: disabled (no continuous updates) unless strategy is provided.
  // Legacy support: if observe === false and no strategy, use 'poll'.
  const strategy: ObserveStrategy | undefined = opts.strategy ?? (opts.observe === false ? 'poll' : undefined);
  const pollMs = Number.isFinite(opts.pollMs as any) && (opts.pollMs as number) > 0 ? (opts.pollMs as number) : 3000;
  const thing = await ensureThing(baseUrl);

  try {
    const initialOut = await thing.readProperty(name);
    const initial = await readOutputValue(initialOut);
    await comp.setValue?.(initial, { writeOperation: async (v: any) => thing.writeProperty(name, v) });
  } catch (e) {
    console.warn('[ui-wot][connectProperty] initial read failed', { name, error: String(e) });
    try {
      // Still set the writeOperation so UI can Save even if initial read failed
      await comp.setValue?.({}, { writeOperation: async (v: any) => thing.writeProperty(name, v) });
    } catch {}
  }

  const cleanups: Cleanup[] = [];
  const doObserve = async () => {
    const sub = await thing.observeProperty(name, async (data: any) => {
      const v = await readOutputValue(data);
      if (typeof comp.setValueSilent === 'function') await comp.setValueSilent(v);
      else await comp.setValue?.(v);
    });
    cleanups.push(() => sub?.unsubscribe?.());
    return true;
  };
  const doPoll = () => {
    const id = setInterval(async () => {
      try {
        const out = await thing.readProperty(name);
        const v = await readOutputValue(out);
        if (typeof comp.setValueSilent === 'function') await comp.setValueSilent(v);
        else await comp.setValue?.(v);
      } catch {
        /* ignore poll errors */
      }
    }, pollMs);
    cleanups.push(() => clearInterval(id));
  };

  if (strategy === 'observe') {
    if (typeof thing.observeProperty !== 'function') throw new Error('observeProperty not supported for ' + name);
    await doObserve();
  } else if (strategy === 'poll') {
    doPoll();
  } else if (strategy === 'auto') {
    let observed = false;
    if (typeof thing.observeProperty === 'function') {
      try {
        observed = await doObserve();
      } catch {
        observed = false;
      }
    }
    if (!observed) doPoll();
  } else {
    // strategy disabled/undefined: no observe/poll
  }

  return () => {
    cleanups.forEach(fn => {
      try {
        fn();
      } catch {}
    });
  };
}

export async function connectAction(el: HTMLElement, opts: { baseUrl: string; name: string }): Promise<void> {
  const comp: any = el as any;
  const { baseUrl, name } = opts;
  const thing = await ensureThing(baseUrl);
  if (typeof comp.setAction === 'function') {
    await comp.setAction(async (input?: any) => thing.invokeAction(name, input));
  }
}

export async function connectEvent(el: HTMLElement, opts: { baseUrl: string; name: string }): Promise<Cleanup> {
  const comp: any = el as any;
  const { baseUrl, name } = opts;
  const thing = await ensureThing(baseUrl);
  const handler = async (data: any) => {
    if (paused) return;
    const v = await readOutputValue(data);
    comp.addEvent?.(v);
  };
  let sub: any | undefined;
  let subscribed = false;
  let paused = true;
  const subscribe = async () => {
    if (subscribed) return;
    if (typeof thing.subscribeEvent === 'function') {
      sub = await thing.subscribeEvent(name, handler);
      subscribed = true;
    }
  };
  const unsubscribe = async () => {
    if (!subscribed) return;
    try {
      if (sub && typeof sub.unsubscribe === 'function') {
        const ret = sub.unsubscribe();
        if (ret && typeof (ret as Promise<any>).then === 'function') await ret;
      } else if (typeof (thing as any).unsubscribeEvent === 'function') {
        // Try with (name, handler) first, then (name)
        try {
          await (thing as any).unsubscribeEvent(name, handler);
        } catch {
          try {
            await (thing as any).unsubscribeEvent(name);
          } catch {
            /* ignore */
          }
        }
      } else if (typeof (thing as any).removeEventListener === 'function') {
        try {
          (thing as any).removeEventListener(name, handler);
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
    sub = undefined;
    subscribed = false;
  };

  // Wrap component methods to control WoT subscription lifecycle.
  const origStart = typeof comp.startListening === 'function' ? comp.startListening.bind(comp) : undefined;
  const origStop = typeof comp.stopListening === 'function' ? comp.stopListening.bind(comp) : undefined;

  if (origStop) {
    comp.stopListening = async () => {
      await origStop();
      paused = true;
    };
  }
  if (origStart) {
    comp.startListening = async () => {
      await origStart();
      paused = false;
      await subscribe();
    };
  }

  // Do NOT auto-start; let the component/user trigger startListening.
  return () => {
    // best-effort cleanup
    paused = true;
    void unsubscribe();
    if (origStart) comp.startListening = origStart;
    if (origStop) comp.stopListening = origStop;
  };
}

export async function connectAll(opts: { baseUrl: string; container?: ParentNode }): Promise<Cleanup[]> {
  const root = opts.container || document;
  const tdUrl = opts.baseUrl;
  const cleanups: Cleanup[] = [];
  const propEls = Array.from(root.querySelectorAll<HTMLElement>('[data-td-property],[td-property],[property]'));
  for (const el of propEls) {
    const name = el.getAttribute('data-td-property') || el.getAttribute('td-property') || el.getAttribute('property');
    if (!name) continue;
    const perElUrl = el.getAttribute('data-td-url') || el.getAttribute('td-url') || el.getAttribute('url') || tdUrl;
    const anyEl: any = el as any;
    if (typeof anyEl.setValue === 'function' || typeof anyEl.setValueSilent === 'function') {
      try {
        const strategyAttr = (el.getAttribute('data-td-strategy') || el.getAttribute('td-strategy') || el.getAttribute('strategy')) as ObserveStrategy | null;
        const pollMsAttr = el.getAttribute('data-td-poll-ms') || el.getAttribute('td-poll-ms') || el.getAttribute('poll-ms');
        const pollMsParsed = pollMsAttr ? parseInt(pollMsAttr, 10) : undefined;
        const stop = await connectProperty(el, {
          baseUrl: perElUrl,
          name,
          strategy: strategyAttr ?? undefined,
          pollMs: Number.isFinite(pollMsParsed as any) && (pollMsParsed as number) > 0 ? pollMsParsed : undefined,
        });
        if (stop) cleanups.push(stop);
      } catch (e) {
        console.warn('[ui-wot][connectAll] property wire failed', { name, error: String(e) });
      }
    }
  }

  const actionEls = Array.from(root.querySelectorAll<HTMLElement>('[data-td-action],[td-action],[action]'));
  for (const el of actionEls) {
    const name = el.getAttribute('data-td-action') || el.getAttribute('td-action') || el.getAttribute('action');
    if (!name) continue;
    const anyEl: any = el as any;
    if (typeof anyEl.setAction === 'function') {
      try {
        const perElUrl = el.getAttribute('data-td-url') || el.getAttribute('td-url') || el.getAttribute('url') || tdUrl;
        await connectAction(el, { baseUrl: perElUrl, name });
      } catch {}
    }
  }

  const eventEls = Array.from(root.querySelectorAll<HTMLElement>('[data-td-event],[td-event],[event]'));
  for (const el of eventEls) {
    const name = el.getAttribute('data-td-event') || el.getAttribute('td-event') || el.getAttribute('event');
    if (!name) continue;
    const anyEl: any = el as any;
    if (typeof anyEl.startListening === 'function' && typeof anyEl.addEvent === 'function') {
      try {
        const perElUrl = el.getAttribute('data-td-url') || el.getAttribute('td-url') || el.getAttribute('url') || tdUrl;
        const stop = await connectEvent(el, { baseUrl: perElUrl, name });
        if (stop) cleanups.push(stop);
      } catch {}
    }
  }

  return cleanups;
}
