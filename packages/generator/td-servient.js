const http = require('http');
const { Servient } = require('@node-wot/core');
const { HttpServer } = require('@node-wot/binding-http');

const WOT_HTTP_PORT = process.env.WOT_HTTP_PORT ? Number(process.env.WOT_HTTP_PORT) : 8085;
const API_PORT = process.env.TD_HOST_API_PORT ? Number(process.env.TD_HOST_API_PORT) : 8086;

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
    thing.setPropertyReadHandler(p, async () => store.get(p));
    thing.setPropertyWriteHandler(p, async val => {
      const v = await (val && typeof val.value === 'function' ? val.value() : val);
      store.set(p, v);
    });
  }
  const acts = td.actions ? Object.keys(td.actions) : [];
  for (const a of acts) {
    thing.setActionHandler(a, async input => {
      const v = await (input && typeof input.value === 'function' ? input.value() : input);
      return v ?? null;
    });
  }
}

async function main() {
  const wot = await startServient();

  const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
          delete td['securityDefinitions']; // will be reattached via ensureNoSec
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

          const thing = await wot.produce(td);
          attachGenericHandlers(thing, td);
          await thing.expose();

          const url = `http://localhost:${WOT_HTTP_PORT}/${slug}`;
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
