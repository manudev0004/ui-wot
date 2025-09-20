import express from 'express';
import cors from 'cors';
import corePkg from '@node-wot/core';
import httpBindingPkg from '@node-wot/binding-http';

const { Servient, Helpers } = corePkg;
const { HttpClientFactory } = httpBindingPkg;

const TD_URL = process.env.TD_URL || 'http://localhost:8080/testthing';
const PORT = parseInt(process.env.PORT || '3001', 10);

const app = express();
app.use(cors());
app.use(express.json());

const servient = new Servient();
servient.addClientFactory(new HttpClientFactory());
const helpers = new Helpers(servient);

let WoTGlobal;
let thing;
let tdCache;

async function ensureThing() {
  if (!WoTGlobal) {
    WoTGlobal = await servient.start();
  }
  if (!tdCache) {
    tdCache = await helpers.fetch(TD_URL);
  }
  if (!thing) {
    thing = await WoTGlobal.consume(tdCache);
  }
  return thing;
}

app.get('/api/td', async (req, res) => {
  try {
    await ensureThing();
    res.json(tdCache);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/properties/:name', async (req, res) => {
  try {
    const t = await ensureThing();
    const name = req.params.name;
    const val = await t.readProperty(name);
    const v = typeof val?.value === 'function' ? await val.value() : val;
    res.json({ value: v });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.put('/api/properties/:name', async (req, res) => {
  try {
    const t = await ensureThing();
    const name = req.params.name;
    const { value } = req.body;
    await t.writeProperty(name, value);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/actions/:name', async (req, res) => {
  try {
    const t = await ensureThing();
    const name = req.params.name;
    const input = req.body?.input;
    const result = await t.invokeAction(name, input);
    const r = typeof result?.value === 'function' ? await result.value() : result;
    res.json({ result: r });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Server-Sent Events for WoT events
app.get('/api/events/:name', async (req, res) => {
  let sseStarted = false;
  let closed = false;
  let sub;
  try {
    const t = await ensureThing();
    const name = req.params.name;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    sseStarted = true;

    sub = await t.subscribeEvent(name, async (data) => {
      if (closed) return;
      const v = typeof data?.value === 'function' ? await data.value() : data;
      res.write(`data: ${JSON.stringify(v)}\n\n`);
    });

    req.on('close', () => {
      closed = true;
      try { sub?.unsubscribe?.(); } catch {}
      try { res.end(); } catch {}
    });
  } catch (e) {
    if (sseStarted) {
      try {
        res.write(`event: error\ndata: ${JSON.stringify(String(e))}\n\n`);
      } catch {}
      try { res.end(); } catch {}
    } else {
      if (!res.headersSent) {
        res.status(500).json({ error: String(e) });
      }
    }
  }
});

app.listen(PORT, () => {
  console.log(`WoT backend listening on http://localhost:${PORT}`);
  console.log(`Consuming TD from ${TD_URL}`);
});
