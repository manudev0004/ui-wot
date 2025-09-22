const http = require('http');
const fs = require('fs');
const path = require('path');
const { Servient } = require('@node-wot/core');
const { HttpServer } = require('@node-wot/binding-http');

const WOT_HTTP_PORT = process.env.WOT_HTTP_PORT ? Number(process.env.WOT_HTTP_PORT) : 8089;
const API_PORT = process.env.TD_HOST_API_PORT ? Number(process.env.TD_HOST_API_PORT) : 8088;

function createUrlSafeId(title) {
  return String(title || 'thing')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '');
}

async function startServient() {
  const servient = new Servient();
  servient.addServer(new HttpServer({ port: WOT_HTTP_PORT, address: '0.0.0.0' }));
  const wot = await servient.start();
  return wot;
}

function addNoSecurityScheme(thingDescription) {
  if (!thingDescription.security && !thingDescription.securityDefinitions) {
    thingDescription.securityDefinitions = { nosec_sc: { scheme: 'nosec' } };
    thingDescription.security = ['nosec_sc'];
  }
}

function attachGenericHandlers(exposedThing, thingDescription) {
  const propertyValueStore = new Map();
  // Expose store for simulators
  propertyStores.set(exposedThing, propertyValueStore);
  const propertyNames = thingDescription.properties ? Object.keys(thingDescription.properties) : [];
  for (const propertyName of propertyNames) {
    const propertyDef = thingDescription.properties[propertyName] || {};
    const isReadOnly = propertyDef.readOnly === true;
    const isWriteOnly = propertyDef.writeOnly === true;

    if (!isWriteOnly) {
      exposedThing.setPropertyReadHandler(propertyName, async () => propertyValueStore.get(propertyName));
    }
    if (!isReadOnly) {
      exposedThing.setPropertyWriteHandler(propertyName, async inputValue => {
        const resolvedValue = await (inputValue && typeof inputValue.value === 'function' ? inputValue.value() : inputValue);
        propertyValueStore.set(propertyName, resolvedValue);
      });
    }
  }
}

// In-memory stores per ExposedThing for simulation/state linkage
const propertyStores = new WeakMap();

function lowerFirst(s) {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

function numberInRange(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0;
  return min + Math.random() * (max - min);
}

async function setProp(exposedThing, name, value) {
  try {
    await exposedThing.writeProperty(name, value);
  } catch {}
  const store = propertyStores.get(exposedThing);
  if (store) store.set(name, value);
}

async function getProp(exposedThing, name) {
  const store = propertyStores.get(exposedThing);
  if (store && store.has(name)) return store.get(name);
  try {
    return await exposedThing.readProperty(name);
  } catch {
    return undefined;
  }
}

function startSimulation(exposedThing, td) {
  if (!td || typeof td !== 'object') return;
  const intervals = [];
  const props = td.properties || {};
  const acts = td.actions || {};
  const evts = td.events || {};

  // Initialize default property values and simulate readOnly sensors
  Object.entries(props).forEach(([name, def]) => {
    const type = def && typeof def === 'object' ? def.type : undefined;
    if (type === 'number' || type === 'integer') {
      const min = Number(def.minimum ?? 0);
      const max = Number(def.maximum ?? 100);
      const init = Number.isFinite(min) && Number.isFinite(max) ? (min + max) / 2 : 0;
      setProp(exposedThing, name, init);
      if (def.readOnly) {
        const iv = setInterval(async () => {
          const cur = Number(await getProp(exposedThing, name)) || init;
          const delta = (max > min ? max - min : 100) * 0.02 * (Math.random() * 2 - 1);
          let next = cur + delta;
          if (Number.isFinite(min) && next < min) next = min;
          if (Number.isFinite(max) && next > max) next = max;
          setProp(exposedThing, name, Math.round(next * 100) / 100);
        }, 1500);
        intervals.push(iv);
      }
    } else if (type === 'boolean') {
      setProp(exposedThing, name, !!def.default);
      if (def.readOnly && /motion|presence|detected/i.test(name)) {
        const iv = setInterval(async () => {
          const val = Math.random() > 0.8; // occasional true
          setProp(exposedThing, name, val);
        }, 5000);
        intervals.push(iv);
      }
    } else if (type === 'string') {
      if (def.default != null) setProp(exposedThing, name, String(def.default));
    }
  });

  // Heuristic action handlers: setXxx / toggleXxx
  const coveredActions = new Set();
  Object.keys(acts).forEach(actionName => {
    const setMatch = actionName.match(/^set([A-Z].*)$/);
    const toggleMatch = actionName.match(/^toggle([A-Z].*)$/);
    if (setMatch) {
      const propName = lowerFirst(setMatch[1]);
      if (props[propName]) {
        exposedThing.setActionHandler(actionName, async input => {
          const v = input && typeof input.value === 'function' ? await input.value() : input;
          await setProp(exposedThing, propName, v);
          return { ok: true };
        });
        coveredActions.add(actionName);
      }
    } else if (toggleMatch) {
      const propName = lowerFirst(toggleMatch[1]);
      if (props[propName] && (props[propName].type === 'boolean' || props[propName].type == null)) {
        exposedThing.setActionHandler(actionName, async () => {
          const cur = !!(await getProp(exposedThing, propName));
          await setProp(exposedThing, propName, !cur);
          return { ok: true, value: !cur };
        });
        coveredActions.add(actionName);
      }
    }
  });

  // Default action handlers for remaining actions: echo input, return ack
  Object.keys(acts).forEach(actionName => {
    if (coveredActions.has(actionName)) return;
    exposedThing.setActionHandler(actionName, async actionInput => {
      const resolvedInput = actionInput && typeof actionInput.value === 'function' ? await actionInput.value() : actionInput;
      return { ok: true, input: resolvedInput ?? null };
    });
  });

  // Event simulation: generic periodic events and threshold alerts
  Object.entries(evts).forEach(([name, def]) => {
    if (/motion/i.test(name)) {
      const iv = setInterval(() => {
        exposedThing.emitEvent(name, { timestamp: new Date().toISOString(), location: 'living-room' });
      }, 7000);
      intervals.push(iv);
    } else if (/temperature.?alert/i.test(name)) {
      const threshold = Number(def?.data?.properties?.threshold?.default ?? 50);
      const iv = setInterval(async () => {
        const temp = Number(await getProp(exposedThing, 'temperature'));
        if (Number.isFinite(temp) && temp > threshold) {
          exposedThing.emitEvent(name, { temperature: temp, threshold, ts: Date.now() });
        }
      }, 3000);
      intervals.push(iv);
    } else {
      // Generic heartbeat for other events
      const iv = setInterval(() => {
        exposedThing.emitEvent(name, { ts: Date.now() });
      }, 15000);
      intervals.push(iv);
    }
  });

  // Optional: store intervals for cleanup if needed later
  return () => intervals.forEach(clearInterval);
}

const thingRegistry = new Map();
async function main() {
  const wotRuntime = await startServient();

  const apiServer = http.createServer(async (request, response) => {
    // CORS
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Cache-Control, Last-Event-ID');
    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      return response.end();
    }

    // Serve static UI
    if (request.method === 'GET' && (request.url === '/' || request.url === '/index.html')) {
      try {
        const p = path.join(__dirname, 'td-host-ui', 'index.html');
        const html = fs.readFileSync(p);
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end(html);
      } catch (e) {
        response.writeHead(500, { 'Content-Type': 'text/plain' });
        response.end('TD Host UI missing.');
      }
      return;
    }
    if (request.method === 'GET' && request.url === '/client.js') {
      try {
        const p = path.join(__dirname, 'td-host-ui', 'client.js');
        const js = fs.readFileSync(p);
        response.writeHead(200, { 'Content-Type': 'application/javascript' });
        response.end(js);
      } catch (e) {
        response.writeHead(404, { 'Content-Type': 'text/plain' });
        response.end('client.js not found');
      }
      return;
    }

    // Simple proxy to WoT HTTP binding to avoid CORS issues; supports SSE
    if (request.url && request.url.startsWith('/proxy/')) {
      const targetPath = request.url.replace('/proxy', '');
      const targetUrl = `http://localhost:${WOT_HTTP_PORT}${targetPath}`;
      const target = new URL(targetUrl);

      const headers = { ...request.headers };
      delete headers['host'];
      const opts = {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname + (target.search || ''),
        method: request.method,
        headers,
      };
      const proxyReq = http.request(opts, proxyRes => {
        // Pipe status and headers, keep CORS
        const resHeaders = { ...proxyRes.headers, 'Access-Control-Allow-Origin': '*' };
        response.writeHead(proxyRes.statusCode || 200, resHeaders);
        proxyRes.pipe(response);
      });
      proxyReq.on('error', err => {
        response.writeHead(502, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: `Proxy error: ${String(err && err.message ? err.message : err)}` }));
      });
      // Pipe request body
      request.pipe(proxyReq);
      return;
    }

    if (request.method === 'POST' && request.url === '/serve-td') {
      let requestBody = '';
      request.on('data', chunk => {
        requestBody += chunk;
        if (requestBody.length > 5 * 1024 * 1024) request.destroy();
      });
      request.on('end', async () => {
        try {
          const uploadedData = JSON.parse(requestBody || '{}');
          const thingDescription = JSON.parse(JSON.stringify(uploadedData)); // shallow clone
          if (!thingDescription || typeof thingDescription !== 'object') throw new Error('Invalid JSON');

          if (!thingDescription.title || typeof thingDescription.title !== 'string') thingDescription.title = 'UploadedThing';
          addNoSecurityScheme(thingDescription);

          // sanitize TD to ExposedThingInit
          delete thingDescription['@context'];
          delete thingDescription['@type'];
          delete thingDescription['base'];
          delete thingDescription['securityDefinitions']; // will be reattached via addNoSecurityScheme
          delete thingDescription['security'];
          function removeWoTForms(objectToClean) {
            if (!objectToClean || typeof objectToClean !== 'object') return;
            if (Array.isArray(objectToClean)) {
              objectToClean.forEach(removeWoTForms);
              return;
            }
            if (objectToClean.forms) delete objectToClean.forms;
            for (const key of Object.keys(objectToClean)) removeWoTForms(objectToClean[key]);
          }
          // reapply security after strip
          removeWoTForms(thingDescription);
          addNoSecurityScheme(thingDescription);

          // Use a stable, safe title to ensure predictable path
          const urlSafeId = createUrlSafeId(thingDescription.title);
          thingDescription.title = urlSafeId;

          const thingUrl = `http://localhost:${WOT_HTTP_PORT}/${urlSafeId}`;
          if (thingRegistry.has(urlSafeId)) {
            // Thing already exists; reuse it and return the same URL
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ url: thingUrl, title: urlSafeId, reused: true }));
            return;
          }

          const exposedThing = await wotRuntime.produce(thingDescription);
          attachGenericHandlers(exposedThing, thingDescription);
          await exposedThing.expose();
          const stopSim = startSimulation(exposedThing, thingDescription);
          thingRegistry.set(urlSafeId, { exposedThing, stop: stopSim });

          response.writeHead(201, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ url: thingUrl, title: urlSafeId }));
        } catch (error) {
          response.writeHead(400, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ error: String(error && error.message ? error.message : error) }));
        }
      });
    } else {
      response.writeHead(404, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  apiServer.listen(API_PORT, '0.0.0.0', () => {
    console.log(`[td-host] API listening on http://localhost:${API_PORT}`);
    console.log(`[td-host] WoT HTTP binding on http://localhost:${WOT_HTTP_PORT}`);
  });
}

main().catch(e => {
  console.error('[td-host] fatal:', e);
  process.exit(1);
});
