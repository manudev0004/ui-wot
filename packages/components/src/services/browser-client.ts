// Browser-safe WoT client helpers using fetch and TD forms

type Thing = {
  readProperty: (name: string) => Promise<any>;
  writeProperty: (name: string, value: any) => Promise<any>;
  invokeAction: (name: string, input?: any) => Promise<any>;
  observeEvent: (name: string, handler: (data: any) => void, pollMs?: number) => () => void;
};

function resolveHref(base: string | undefined, tdUrl: string, href: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  const b = base || tdUrl;
  return new URL(href, b).toString();
}

function pickForm(forms: any[], desiredOp?: string) {
  if (!forms || forms.length === 0) return undefined;
  if (desiredOp) {
    const byOp = forms.find((f: any) => Array.isArray(f.op) ? f.op.includes(desiredOp) : f.op === desiredOp);
    if (byOp) return byOp;
  }
  return forms[0];
}

function methodFromForm(form: any, fallback: string) {
  const m = form?.['htv:methodName'] || form?.methodName || form?.method;
  return typeof m === 'string' ? m.toUpperCase() : fallback;
}

export function createHttpThing(td: any, tdUrl?: string): Thing {
  const base: string | undefined = td?.base;
  const tdUrlSafe = tdUrl || window.location.origin;

  const getPropForm = (name: string, desiredOp?: string) => {
    const forms = td?.properties?.[name]?.forms || [];
    const form = pickForm(forms, desiredOp);
    if (!form?.href) throw new Error(`No href for property ${name}`);
    return form;
  };
  const getActionForm = (name: string) => {
    const forms = td?.actions?.[name]?.forms || [];
    const form = pickForm(forms, 'invokeaction');
    if (!form?.href) throw new Error(`No href for action ${name}`);
    return form;
  };
  const getEventForm = (name: string) => {
    const forms = td?.events?.[name]?.forms || [];
    const form = pickForm(forms, 'subscribeevent');
    if (!form?.href) return undefined as any;
    return form as any;
  };

  return {
    async readProperty(name: string) {
      const form = getPropForm(name, 'readproperty');
      const url = resolveHref(base, tdUrlSafe, form.href);
      const method = methodFromForm(form, 'GET');
      console.log(`[readProperty] Reading ${name} from ${url} using ${method}`);
      const res = await fetch(url, { method });
      if (!res.ok) {
        console.error(`[readProperty] Read ${name} failed: ${res.status} ${res.statusText}`);
        throw new Error(`Read ${name} failed: ${res.status}`);
      }
      const result = await res.json();
      console.log(`[readProperty] Read ${name} success:`, result);
      return result;
    },
    async writeProperty(name: string, value: any) {
      const form = getPropForm(name, 'writeproperty');
      const url = resolveHref(base, tdUrlSafe, form.href);
      const method = methodFromForm(form, 'PUT');
      console.log(`[writeProperty] Writing ${name} to ${url} using ${method}, value:`, value);
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': form?.contentType || 'application/json' },
        body: JSON.stringify(value)
      });
      if (!res.ok) {
        console.error(`[writeProperty] Write ${name} failed: ${res.status} ${res.statusText}`);
        throw new Error(`Write ${name} failed: ${res.status}`);
      }
      console.log(`[writeProperty] Write ${name} success`);
      return true;
    },
    async invokeAction(name: string, input?: any) {
      const form = getActionForm(name);
      const url = resolveHref(base, tdUrlSafe, form.href);
      const method = methodFromForm(form, 'POST');
      console.log(`[invokeAction] Invoking ${name} at ${url} using ${method}, input:`, input);
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': form?.contentType || 'application/json' },
        body: input ? JSON.stringify(input) : undefined
      });
      if (!res.ok) {
        console.error(`[invokeAction] Invoke ${name} failed: ${res.status} ${res.statusText}`);
        throw new Error(`Invoke ${name} failed: ${res.status}`);
      }
      const result = await res.json();
      console.log(`[invokeAction] Invoke ${name} success:`, result);
      return result;
    },
    observeEvent(name: string, handler: (data: any) => void, pollMs = 3000) {
      const form = getEventForm(name);
      if (!form) {
        console.warn(`[observeEvent] No form for event ${name}; skipping observe`);
        return () => {};
      }
      const url = resolveHref(base, tdUrlSafe, form.href);
      let active = true;
      const tick = async () => {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (active) handler(data);
          }
        } catch {}
      };
      const id = setInterval(tick, pollMs);
      tick();
      return () => { active = false; clearInterval(id); };
    }
  };
}

export async function consumeFromUrl(tdUrl: string): Promise<Thing> {
  console.log(`[consumeFromUrl] Fetching TD from: ${tdUrl}`);
  const res = await fetch(tdUrl);
  if (!res.ok) throw new Error(`Failed to fetch TD: ${res.status}`);
  const td = await res.json();
  console.log(`[consumeFromUrl] TD fetched, creating thing. Properties:`, Object.keys(td.properties || {}));
  console.log(`[consumeFromUrl] Actions:`, Object.keys(td.actions || {}));
  console.log(`[consumeFromUrl] Events:`, Object.keys(td.events || {}));
  return createHttpThing(td, tdUrl);
}

export async function connectProperty(el: HTMLElement, tdUrl: string, propertyName: string, pollMs = 3000) {
  const comp: any = el;
  console.log(`[connectProperty] Starting binding for ${propertyName} on`, el.tagName);
  console.log(`[connectProperty] Component methods:`, {
    setValue: typeof comp.setValue,
    setValueSilent: typeof comp.setValueSilent,
    getValue: typeof comp.getValue
  });

  const thing = await consumeFromUrl(tdUrl);
  console.log(`[connectProperty] Thing created, reading initial value for ${propertyName}`);
  
  const initial = await thing.readProperty(propertyName);
  console.log(`[connectProperty] Initial value for ${propertyName}:`, initial);
  
  await comp.setValue(initial, {
    writeOperation: (v: any) => {
      console.log(`[connectProperty] Write operation called for ${propertyName} with value:`, v);
      return thing.writeProperty(propertyName, v);
    }
  });
  
  if (typeof comp.getValue === 'function') {
    const meta = await comp.getValue(true);
    console.log(`[connectProperty] Post-setValue metadata for ${propertyName}:`, meta);
  }
  
  const id = setInterval(async () => {
    try {
      const v = await thing.readProperty(propertyName);
      console.log(`[connectProperty] Polling update for ${propertyName}:`, v);
      if (typeof comp.setValueSilent === 'function') await comp.setValueSilent(v);
      else await comp.setValue(v);
    } catch (err) {
      console.warn(`[connectProperty] Polling error for ${propertyName}:`, err);
    }
  }, pollMs);
  
  console.log(`[connectProperty] Binding complete for ${propertyName}, polling every ${pollMs}ms`);
  return () => {
    console.log(`[connectProperty] Cleanup called for ${propertyName}`);
    clearInterval(id);
  };
}

export async function connectAction(buttonEl: HTMLElement, tdUrl: string, actionName: string) {
  const comp: any = buttonEl;
  console.log(`[connectAction] Starting binding for ${actionName} on`, buttonEl.tagName);
  console.log(`[connectAction] Component methods:`, {
    setAction: typeof comp.setAction
  });

  const thing = await consumeFromUrl(tdUrl);
  if (typeof comp.setAction === 'function') {
    await comp.setAction(async () => {
      console.log(`[connectAction] Invoking action ${actionName}`);
      const result = await thing.invokeAction(actionName);
      console.log(`[connectAction] Action ${actionName} result:`, result);
      return result;
    });
    console.log(`[connectAction] Action binding complete for ${actionName}`);
  } else {
    console.warn(`[connectAction] setAction method not found on component`);
  }
}

export async function connectEvent(eventEl: HTMLElement, tdUrl: string, eventName: string, pollMs = 3000) {
  const comp: any = eventEl;
  console.log(`[connectEvent] Starting binding for ${eventName} on`, eventEl.tagName);
  console.log(`[connectEvent] Component methods:`, {
    startListening: typeof comp.startListening,
    addEvent: typeof comp.addEvent
  });

  const thing = await consumeFromUrl(tdUrl);
  if (typeof comp.startListening === 'function') {
    await comp.startListening();
    console.log(`[connectEvent] Started listening for ${eventName}`);
  } else {
    console.warn(`[connectEvent] startListening method not found on component`);
  }

  const cleanup = thing.observeEvent(eventName, (data: any) => {
    console.log(`[connectEvent] Received event ${eventName}:`, data);
    if (typeof comp.addEvent === 'function') {
      comp.addEvent(data);
    } else {
      console.warn(`[connectEvent] addEvent method not found on component`);
    }
  }, pollMs);
  
  console.log(`[connectEvent] Event binding complete for ${eventName}, polling every ${pollMs}ms`);
  return cleanup;
}
