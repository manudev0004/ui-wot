type Cleanup = () => void | Promise<void>;

type BackendOpts = {
  baseUrl: string;
  name: string;
};

type ConnectAllBackendOptions = {
  baseUrl: string;
  container?: ParentNode;
};

function joinUrl(base: string, path: string): string {
  if (!base) return path;
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}

async function getJSON<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  return res.json();
}

async function putJSON<T = any>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${url} failed: ${res.status} ${res.statusText}`);
  return res.json();
}

async function postJSON<T = any>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function connectPropertyBackend(el: HTMLElement, opts: BackendOpts): Promise<Cleanup> {
  const anyEl: any = el as any;
  const url = joinUrl(opts.baseUrl, `/properties/${encodeURIComponent(opts.name)}`);
  try {
    const data = await getJSON<{ value: any }>(url);
    await anyEl.setValue?.(data?.value, {
      writeOperation: async (v: any) => {
        const result = await putJSON<{ value: any }>(url, { value: v });
        return result?.value;
      },
    });
  } catch (err) {
    console.warn('[connectPropertyBackend] initial bind failed:', err);
  }
  return () => {};
}

export async function connectActionBackend(el: HTMLElement, opts: BackendOpts): Promise<void> {
  const anyEl: any = el as any;
  const url = joinUrl(opts.baseUrl, `/actions/${encodeURIComponent(opts.name)}`);
  if (typeof anyEl.setAction === 'function') {
    await anyEl.setAction(async (input?: any) => {
      const res = await postJSON<{ result: any }>(url, { input });
      return res?.result;
    });
  }
}

export async function connectEventSSE(el: HTMLElement, opts: BackendOpts): Promise<Cleanup> {
  const anyEl: any = el as any;
  if (typeof anyEl.startListening === 'function') await anyEl.startListening();
  const url = joinUrl(opts.baseUrl, `/events/${encodeURIComponent(opts.name)}`);
  const es = new EventSource(url);
  const onMsg = (ev: MessageEvent) => {
    try {
      const data = ev.data ? JSON.parse(ev.data) : undefined;
      anyEl.addEvent?.(data);
    } catch (e) {
      console.warn('[connectEventSSE] invalid event data:', e);
    }
  };
  const onErr = (e: any) => {
    console.warn('[connectEventSSE] event source error:', e);
  };
  es.addEventListener('message', onMsg);
  es.addEventListener('error', onErr as any);
  return () => {
    es.removeEventListener('message', onMsg);
    es.removeEventListener('error', onErr as any);
    es.close();
  };
}

export async function connectAllBackend(options: ConnectAllBackendOptions): Promise<Cleanup[]> {
  const root: ParentNode = options.container || document;
  const cleanups: Cleanup[] = [];

  const propEls = Array.from(root.querySelectorAll<HTMLElement>('[data-td-property]'));
  for (const el of propEls) {
    const name = el.getAttribute('data-td-property');
    if (!name) continue;
    const anyEl: any = el as any;
    if (typeof anyEl.setValue === 'function' || typeof anyEl.setValueSilent === 'function') {
      try {
        const stop = await connectPropertyBackend(el, { baseUrl: options.baseUrl, name });
        if (stop) cleanups.push(stop);
      } catch (e) {
        console.warn('[connectAllBackend] Property bind failed for', name, e);
      }
    }
  }

  const actionEls = Array.from(root.querySelectorAll<HTMLElement>('[data-td-action]'));
  for (const el of actionEls) {
    const name = el.getAttribute('data-td-action');
    if (!name) continue;
    const anyEl: any = el as any;
    if (typeof anyEl.setAction === 'function') {
      try {
        await connectActionBackend(el, { baseUrl: options.baseUrl, name });
      } catch (e) {
        console.warn('[connectAllBackend] Action bind failed for', name, e);
      }
    }
  }

  const eventEls = Array.from(root.querySelectorAll<HTMLElement>('[data-td-event]'));
  for (const el of eventEls) {
    const name = el.getAttribute('data-td-event');
    if (!name) continue;
    const anyEl: any = el as any;
    if (typeof anyEl.startListening === 'function' && typeof anyEl.addEvent === 'function') {
      try {
        const stop = await connectEventSSE(el, { baseUrl: options.baseUrl, name });
        if (stop) cleanups.push(stop);
      } catch (e) {
        console.warn('[connectAllBackend] Event bind failed for', name, e);
      }
    }
  }

  return cleanups;
}
