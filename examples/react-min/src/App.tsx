import { useEffect } from 'react';
import { connect } from '@thingweb/ui-wot-components/services';

const TD_URL = 'http://localhost:8080/testthing';

export default function App() {
  useEffect(() => {
    (async () => {
      try {
        await connect({ baseUrl: TD_URL, container: document });
      } catch (err) {
        alert('Failed to load TD or initialize WoT. See console for details.');
      }
    })();
  }, []);

  return (
    <div>
      <h2>UI‑WoT Demo</h2>
        <div style={{ maxWidth: 300, margin: '20px', padding: 20 }}>
          <ui-toggle td-property="bool" td-strategy="poll" label="Toggle" show-last-updated="true" show-status="true"></ui-toggle>
          <ui-slider td-property="int" label="Slider" min="0" max="100" step="1" show-last-updated="true" show-status="true"></ui-slider>
          <ui-event td-event="on-bool" label="Events" show-last-updated="true"></ui-event>
        </div>
      </div>
  );
}
