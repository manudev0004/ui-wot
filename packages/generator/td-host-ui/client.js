(() => {
  const API_BASE = location.origin.replace(/:\d+$/, `:${8088}`);

  const el = id => document.getElementById(id);
  const status = el('status');

  async function postTD(td) {
    const resp = await fetch(`${API_BASE}/serve-td`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(td),
    });
    if (!resp.ok) throw new Error(`TD host error: ${resp.status}`);
    return resp.json();
  }

  function affordancesFromTD(td) {
    const props = Object.entries(td.properties || {}).map(([name, def]) => ({ kind: 'property', name, def }));
    const acts = Object.entries(td.actions || {}).map(([name, def]) => ({ kind: 'action', name, def }));
    const evts = Object.entries(td.events || {}).map(([name, def]) => ({ kind: 'event', name, def }));
    return { props, acts, evts };
  }

  function inputForSchema(def) {
    const t = def.type || (def.items && 'array') || (def.properties && 'object') || 'string';
    const input = document.createElement('input');
    input.placeholder = t;
    input.style.width = '100%';
    if (t === 'number' || t === 'integer') input.type = 'number';
    else if (t === 'boolean') input.type = 'checkbox';
    else input.type = 'text';
    return input;
  }

  function renderThing({ url, title, td }) {
    el('thing').style.display = 'block';
    el('thing-title').textContent = title;
    el('thing-url').textContent = url;
    el('td-json').textContent = JSON.stringify(td, null, 2);

    const { props, acts, evts } = affordancesFromTD(td);

    const propsWrap = el('prop-list');
    propsWrap.innerHTML = '';
    props.forEach(({ name, def }) => {
      const row = document.createElement('div');
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '160px 1fr auto auto';
      row.style.gap = '8px';
      row.style.alignItems = 'center';

      const label = document.createElement('div');
      label.textContent = name;
      const out = document.createElement('code');
      out.textContent = '-';
      const input = inputForSchema(def);
      const btnRead = document.createElement('button');
      btnRead.textContent = 'Read';
      const btnWrite = document.createElement('button');
      btnWrite.textContent = 'Write';

      btnRead.onclick = async () => {
        out.textContent = '...';
        try {
          const r = await fetch(`${url}/properties/${name}`);
          out.textContent = r.ok ? JSON.stringify(await r.json()) : `ERR ${r.status}`;
        } catch (e) {
          out.textContent = 'ERR';
        }
      };

      btnWrite.onclick = async () => {
        try {
          let val;
          if (input.type === 'checkbox') val = input.checked;
          else if (input.type === 'number') val = Number(input.value);
          else val = input.value;
          const r = await fetch(`${url}/properties/${name}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(val) });
          status.textContent = r.ok ? 'Wrote value' : `Write failed ${r.status}`;
        } catch (e) {
          status.textContent = 'Write error';
        }
      };

      row.append(label, out, input, btnRead, btnWrite);
      propsWrap.appendChild(row);
    });

    const actsWrap = el('act-list');
    actsWrap.innerHTML = '';
    acts.forEach(({ name, def }) => {
      const row = document.createElement('div');
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '160px 1fr auto';
      row.style.gap = '8px';
      row.style.alignItems = 'center';

      const label = document.createElement('div');
      label.textContent = name;
      const input = inputForSchema(def?.input || {});
      const btn = document.createElement('button');
      btn.textContent = 'Invoke';
      btn.onclick = async () => {
        try {
          let val;
          if (input.type === 'checkbox') val = input.checked;
          else if (input.type === 'number') val = Number(input.value);
          else if (input.value.trim().length) {
            try {
              val = JSON.parse(input.value);
            } catch {
              val = input.value;
            }
          }
          const r = await fetch(`${url}/actions/${name}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: val === undefined ? null : JSON.stringify(val),
          });
          status.textContent = r.ok ? 'Invoked action' : `Invoke failed ${r.status}`;
        } catch (e) {
          status.textContent = 'Invoke error';
        }
      };

      row.append(label, input, btn);
      actsWrap.appendChild(row);
    });

    const evtsWrap = el('evt-list');
    evtsWrap.innerHTML = '';
    evts.forEach(({ name }) => {
      const row = document.createElement('div');
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '160px auto';
      row.style.gap = '8px';
      row.style.alignItems = 'center';

      const label = document.createElement('div');
      label.textContent = name;
      const out = document.createElement('div');
      out.className = 'small muted';
      out.textContent = '(listening...)';
      row.append(label, out);
      evtsWrap.appendChild(row);

      // Subscribe via SSE
      try {
        const sse = new EventSource(`${url}/events/${name}`);
        sse.onmessage = ev => {
          out.textContent = ev.data;
        };
        sse.onerror = () => {
          out.textContent = 'Event error';
        };
      } catch (e) {
        out.textContent = 'Event not supported';
      }
    });
  }

  el('btn-upload').onclick = async () => {
    const file = el('td-file').files[0];
    if (!file) return;
    try {
      status.textContent = 'Uploading...';
      const td = JSON.parse(await file.text());
      const resp = await postTD(td);
      resp.td = td;
      renderThing(resp);
      status.textContent = 'Thing hosted.';
    } catch (e) {
      status.textContent = 'Upload failed';
    }
  };

  el('btn-fetch').onclick = async () => {
    const url = el('td-url').value.trim();
    if (!url) return;
    try {
      status.textContent = 'Fetching...';
      const td = await (await fetch(url)).json();
      const resp = await postTD(td);
      resp.td = td;
      renderThing(resp);
      status.textContent = 'Thing hosted.';
    } catch (e) {
      status.textContent = 'Fetch failed';
    }
  };
})();
