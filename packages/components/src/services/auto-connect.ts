// Auto-connect helpers: prefer Node-WoT (global WoT) when available, else fallback to browser client
// Node-WoT only: rely on global WoT (browser bundle) or Servient when available

type Cleanup = () => void | Promise<void>;

function hasGlobalWoT(): boolean {
  const g: any = globalThis as any;
  return !!(g && g.WoT && (typeof g.WoT.consume === 'function' || (g.WoT.Core && g.WoT.Core.Servient)));
}

async function consumeWithGlobalWoT(tdUrl: string) {
  const g: any = globalThis as any;
  // Fetch TD ourselves; many WoT bundles expect a TD object
  const res = await fetch(tdUrl);
  if (!res.ok) throw new Error(`Failed to fetch TD: ${res.status} ${res.statusText}`);
  const td = await res.json();

  if (g.WoT && typeof g.WoT.consume === 'function') {
    console.log('[auto-connect] Using global WoT.consume');
    return g.WoT.consume(td);
  }
  if (g.WoT && g.WoT.Core && g.WoT.Core.Servient && g.WoT.Http) {
    console.log('[auto-connect] Using global WoT.Core.Servient + HttpClientFactory');
    const servient = new g.WoT.Core.Servient();
    servient.addClientFactory(new g.WoT.Http.HttpClientFactory());
    const wot = await servient.start();
    return wot.consume(td);
  }
  throw new Error('Global WoT found but no usable consume method');
}

async function autoConsume(tdUrl: string) {
  if (!hasGlobalWoT()) {
    throw new Error('[auto-connect] Node-WoT not available. Include the @node-wot browser bundle to provide global WoT.');
  }
  return await consumeWithGlobalWoT(tdUrl);
}

export async function connectPropertyAuto(el: HTMLElement, tdUrl: string, propertyName: string): Promise<Cleanup> {
  const anyEl: any = el as any;
  const thing: any = await autoConsume(tdUrl);
  try {
    const initial = await thing.readProperty(propertyName);
    await anyEl.setValue(initial, {
      writeOperation: (v: any) => thing.writeProperty(propertyName, v)
    });
  } catch (err) {
    console.warn('[connectPropertyAuto] initial read/set failed:', err);
  }
  // Prefer observeProperty if provided by Thing
  if (typeof thing.observeProperty === 'function') {
    try {
      const sub = await thing.observeProperty(propertyName, async (data: any) => {
        const v = typeof data?.value === 'function' ? await data.value() : data;
        if (typeof anyEl.setValueSilent === 'function') await anyEl.setValueSilent(v);
        else await anyEl.setValue(v);
      });
      return () => sub?.unsubscribe?.();
    } catch (e) {
      console.warn('[connectPropertyAuto] observeProperty failed:', e);
    }
  }
  // If observeProperty is unavailable, do not poll (Node-WoT only requirement)
  return () => {};
}

export async function connectActionAuto(buttonEl: HTMLElement, tdUrl: string, actionName: string): Promise<void> {
  const anyEl: any = buttonEl as any;
  const thing: any = await autoConsume(tdUrl);
  if (typeof anyEl.setAction === 'function') {
    await anyEl.setAction(async (input?: any) => thing.invokeAction(actionName, input));
  }
}

export async function connectEventAuto(eventEl: HTMLElement, tdUrl: string, eventName: string): Promise<Cleanup> {
  const anyEl: any = eventEl as any;
  const thing: any = await autoConsume(tdUrl);
  if (typeof anyEl.startListening === 'function') await anyEl.startListening();
  if (typeof thing.subscribeEvent === 'function') {
    const sub = await thing.subscribeEvent(eventName, (data: any) => anyEl.addEvent?.(data));
    return () => sub?.unsubscribe?.();
  }
  console.warn('[connectEventAuto] subscribeEvent not available on Thing for', eventName);
  return () => {};
}

export type ConnectAllOptions = {
  container?: ParentNode;
  pollMs?: number;
};

/**
 * One-liner: auto connect all components inside a container using data attributes.
 * - ui-toggle/ui-slider/ui-text: use data-td-property
 * - ui-button: use data-td-action
 * - ui-event: use data-td-event
 */
export async function connectAllAuto(tdUrl: string, options?: ConnectAllOptions): Promise<Cleanup[]> {
  const root: ParentNode = options?.container || document;
  const cleanups: Cleanup[] = [];

  const propEls = Array.from(root.querySelectorAll<HTMLElement>('[data-td-property]'));
  console.log('[connectAllAuto] Found property elements:', propEls.length, propEls.map(el => `${el.tagName}[data-td-property=${el.getAttribute('data-td-property')}]`));
  for (const el of propEls) {
    const name = el.getAttribute('data-td-property')!;
    const anyEl: any = el as any;
    if (typeof anyEl.setValue === 'function' || typeof anyEl.setValueSilent === 'function') {
      try {
  const stop = await connectPropertyAuto(el, tdUrl, name);
        cleanups.push(stop);
      } catch (e) {
        console.warn('[connectAllAuto] Property bind failed for', name, e);
      }
    } else {
      console.warn('[connectAllAuto] Skipping element without setValue API:', el.tagName, el);
    }
  }

  const actionEls = Array.from(root.querySelectorAll<HTMLElement>('[data-td-action]'));
  console.log('[connectAllAuto] Found action elements:', actionEls.length, actionEls.map(el => `${el.tagName}[data-td-action=${el.getAttribute('data-td-action')}]`));
  for (const el of actionEls) {
    const name = el.getAttribute('data-td-action')!;
    const anyEl: any = el as any;
    if (typeof anyEl.setAction === 'function') {
      try {
        await connectActionAuto(el, tdUrl, name);
      } catch (e) {
        console.warn('[connectAllAuto] Action bind failed for', name, e);
      }
    } else {
      console.warn('[connectAllAuto] Skipping element without setAction API:', el.tagName, el);
    }
  }

  const eventEls = Array.from(root.querySelectorAll<HTMLElement>('[data-td-event]'));
  console.log('[connectAllAuto] Found event elements:', eventEls.length, eventEls.map(el => `${el.tagName}[data-td-event=${el.getAttribute('data-td-event')}]`));
  for (const el of eventEls) {
    const name = el.getAttribute('data-td-event')!;
    const anyEl: any = el as any;
    if (typeof anyEl.startListening === 'function' && typeof anyEl.addEvent === 'function') {
      try {
  const stop = await connectEventAuto(el, tdUrl, name);
        if (stop) cleanups.push(stop);
      } catch (e) {
        console.warn('[connectAllAuto] Event bind failed for', name, e);
      }
    } else {
      console.warn('[connectAllAuto] Skipping element without event APIs:', el.tagName, el);
    }
  }

  return cleanups;
}
