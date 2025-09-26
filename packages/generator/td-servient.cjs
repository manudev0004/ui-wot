const http = require('http');
const { Servient } = require('@node-wot/core');
const { HttpServer } = require('@node-wot/binding-http');

const WOT_HTTP_PORT = process.env.WOT_HTTP_PORT ? Number(process.env.WOT_HTTP_PORT) : 8089;
const API_PORT = process.env.TD_HOST_API_PORT ? Number(process.env.TD_HOST_API_PORT) : 8088;

function slugifyTitle(title) {
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

function ensureNoSec(td) {
  if (!td.security && !td.securityDefinitions) {
    td.securityDefinitions = { nosec_sc: { scheme: 'nosec' } };
    td.security = ['nosec_sc'];
  }
}

function attachGenericHandlers(thing, td) {
  const store = new Map();
  const props = td.properties ? Object.keys(td.properties) : [];
  for (const p of props) {
    const def = td.properties[p] || {};
    const isReadOnly = def.readOnly === true;
    const isWriteOnly = def.writeOnly === true;

    // Initialize defaults so first reads succeed and UI has values
    if (!store.has(p)) {
      let initial;
      const t = def.type;
      if (t === 'boolean') initial = false;
      else if (t === 'integer' || t === 'number') initial = def.minimum ?? 0;
      else if (t === 'string') {
        if (def.format === 'date') initial = new Date().toISOString().split('T')[0];
        else if (def.format === 'time') initial = new Date().toTimeString().split(' ')[0];
        else if (def.format === 'date-time') initial = new Date().toISOString();
        else if (def.format === 'color') initial = '#3b82f6';
        else initial = '';
      } else if (t === 'array') initial = [];
      else if (t === 'object') initial = {};
      else initial = null;
      store.set(p, initial);
    }

    if (!isWriteOnly) {
      thing.setPropertyReadHandler(p, async () => store.get(p));
    }
    if (!isReadOnly) {
      thing.setPropertyWriteHandler(p, async val => {
        const v = await (val && typeof val.value === 'function' ? val.value() : val);
        store.set(p, v);
      });
    }
  }
  const acts = td.actions ? Object.keys(td.actions) : [];
  for (const a of acts) {
    thing.setActionHandler(a, async input => {
      const v = await (input && typeof input.value === 'function' ? input.value() : input);
      return v ?? null;
    });
  }
}

const registry = new Map(); 

async function main() {
  const wot = await startServient();

  const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    if (req.method === 'POST' && req.url === '/serve-td') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 5 * 1024 * 1024) req.destroy();
      });
      req.on('end', async () => {
        try {
          const raw = JSON.parse(body || '{}');
          const td = JSON.parse(JSON.stringify(raw)); // shallow clone
          if (!td || typeof td !== 'object') throw new Error('Invalid JSON');

          if (!td.title || typeof td.title !== 'string') td.title = 'UploadedThing';
          ensureNoSec(td);

          // sanitize TD to ExposedThingInit
          delete td['@context'];
          delete td['@type'];
          delete td['base'];
          delete td['securityDefinitions']; // enforce nosec
          delete td['security'];
          function stripForms(obj) {
            if (!obj || typeof obj !== 'object') return;
            if (Array.isArray(obj)) {
              obj.forEach(stripForms);
              return;
            }
            if (obj.forms) delete obj.forms;
            for (const k of Object.keys(obj)) stripForms(obj[k]);
          }
          // reapply security after strip
          stripForms(td);
          ensureNoSec(td);

          // Use a stable, safe title to ensure predictable path
          const slug = slugifyTitle(td.title);
          td.title = slug;

          const url = `http://localhost:${WOT_HTTP_PORT}/${slug}`;
          if (registry.has(slug)) {
            // Thing already exists; reuse it and return the same URL
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ url, title: slug, reused: true }));
            return;
          }

          const thing = await wot.produce(td);
          attachGenericHandlers(thing, td);
          await thing.expose();
          registry.set(slug, thing);

          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ url, title: slug }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: String(e && e.message ? e.message : e) }));
        }
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(API_PORT, '0.0.0.0', () => {
    console.log(`[td-host] API listening on http://localhost:${API_PORT}`);
    console.log(`[td-host] WoT HTTP binding on http://localhost:${WOT_HTTP_PORT}`);
  });
}

main().catch(e => {
  console.error('[td-host] fatal:', e);
  process.exit(1);
});
