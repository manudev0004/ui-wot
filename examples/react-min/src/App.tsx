import { useEffect } from 'react';
import { initializeWot, connectAll } from '@thingweb/ui-wot-components/services';

const TD_URL = 'http://localhost:8080/testthing';

export default function App() {
  useEffect(() => {
    (async () => {
      try {
        // Fetch TD up front to verify connectivity
        const res = await fetch(TD_URL);
        if (!res.ok) throw new Error(`TD fetch failed: ${res.status} ${res.statusText}`);
        const td = await res.json();
        console.log('[react-min] TD loaded:', {
          title: td.title,
          properties: Object.keys(td.properties || {}),
          actions: Object.keys(td.actions || {}),
          events: Object.keys(td.events || {}),
        });

        // Wait for custom elements to be defined
        const tags = ['ui-toggle', 'ui-slider', 'ui-text', 'ui-button', 'ui-event', 'ui-object-editor', 'ui-number-picker'];
        await Promise.all(tags.map(t => customElements.whenDefined(t)));

        // Initialize WoT (uses the Node-WoT browser bundle on window.WoT) and wire components
        await initializeWot();
        await connectAll({ baseUrl: TD_URL, container: document });
      } catch (err) {
        console.error('[react-min] Initialization error:', err);
        alert('Failed to load TD or initialize WoT. See console for details.');
      }
    })();
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '16px auto', padding: 16 }}>
      <h2>UI‑WoT Minimal React Demo</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div>
          <label>Toggle (bool)</label>
          <ui-toggle data-td-property="bool" strategy="poll" label="Toggle" show-last-updated="true" show-status="true"></ui-toggle>
        </div>
        <div>
          <label>Observable Status (string, observe)</label>
          <ui-text
            data-td-property="observableStatus"
            data-td-strategy="observe"
            label="Observable Status"
            mode="editable"
            debounce-ms="1000"
            show-last-updated="true"
            show-status="true"
          ></ui-text>
        </div>
        <div>
          <label>Slider (int)</label>
          <ui-slider data-td-property="int" label="Slider" min="0" max="100" step="1" show-last-updated="true" show-status="true"></ui-slider>
        </div>
        <div>
          <label>Text (string)</label>
          <ui-text data-td-property="string" label="Text" mode="editable" show-last-updated="true" show-status="true"></ui-text>
        </div>
        <div>
          <label>Action</label>
          <ui-button data-td-action="void-void" label="Invoke"></ui-button>
        </div>
        <div>
          <label>Event (on-bool)</label>
          <ui-event data-td-event="on-bool" label="Events" show-last-updated="true"></ui-event>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label>Object Property Editor (multiValue)</label>
          <ui-object-editor
            label="Multi-Value Editor"
            variant="outlined"
            color="primary"
            style={{ width: '50%' }}
            data-td-property="multiValue"
            show-last-updated="true"
            show-status="true"
          ></ui-object-editor>
        </div>
      </div>
    </div>
  );
}
