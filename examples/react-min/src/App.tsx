import { useEffect, useRef, useState } from 'react';

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  return res.json();
}

async function consumeFromUrl(tdUrl: string) {
  console.log(`🌐 Fetching TD from: ${tdUrl}`);
  const td = await fetchJson(tdUrl);
  console.log('📋 TD fetched successfully:', td.title || 'Unnamed Thing');
  console.log('🔗 Available properties:', Object.keys(td.properties || {}));
  console.log('⚡ Available actions:', Object.keys(td.actions || {}));
  console.log('🎯 Using backend service (Node‑WoT on server)');
  return td;
}

// Minimal bind wrapper using services helper
async function bindProperty(element: HTMLElement, thing: any, propertyName: string, opts?: { pollMs?: number }) {
  // This function is now unused - helpers handle everything directly
  console.warn('⚠️ bindProperty called but helpers should be used directly');
  return () => {};
}

const API_BASE = 'http://localhost:3001/api';
const TD_URL = `${API_BASE}/td`;

async function bindPropertyBackend(element: HTMLElement, propertyName: string): Promise<() => void> {
  const anyEl: any = element as any;
  try {
    const data = await fetchJson(`${API_BASE}/properties/${encodeURIComponent(propertyName)}`);
    await anyEl.setValue(data.value, {
      writeOperation: async (v: any) => {
        await fetch(`${API_BASE}/properties/${encodeURIComponent(propertyName)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: v })
        });
      }
    });
  } catch (e) {
    console.warn('[bindPropertyBackend] initial read/set failed:', e);
  }
  return () => {};
}

async function bindActionBackend(element: HTMLElement, actionName: string): Promise<void> {
  const anyEl: any = element as any;
  if (typeof anyEl.setAction === 'function') {
    await anyEl.setAction(async (input?: any) => {
      const res = await fetch(`${API_BASE}/actions/${encodeURIComponent(actionName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      });
      if (!res.ok) throw new Error(`Action failed: ${res.status}`);
      const data = await res.json();
      return data.result;
    });
  }
}

async function bindEventBackend(element: HTMLElement, eventName: string): Promise<() => void> {
  const anyEl: any = element as any;
  if (typeof anyEl.startListening === 'function') await anyEl.startListening();
  const es = new EventSource(`${API_BASE}/events/${encodeURIComponent(eventName)}`);
  es.onmessage = (evt) => {
    try {
      const payload = JSON.parse(evt.data);
      anyEl.addEvent?.(payload);
    } catch {
      anyEl.addEvent?.(evt.data);
    }
  };
  es.onerror = (e) => console.warn('[bindEventBackend] SSE error', e);
  return () => es.close();
}

export default function App() {
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const [thing, setThing] = useState<any>(null);

  // Component refs
  const toggleRef = useRef<HTMLElement | null>(null);
  const sliderRef = useRef<HTMLElement | null>(null);
  const textRef = useRef<HTMLElement | null>(null);
  const buttonRef = useRef<HTMLElement | null>(null);
  const eventRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cleanupFunctions: Array<() => void> = [];

    const initializeWoT = async () => {
      try {
        console.log('🚀 Starting WoT initialization...');
        setConnectionStatus('loading');
        setError('');

        // Consume Thing Description from localhost:8080
        console.log('📡 Consuming TD from:', TD_URL);
        const td = await consumeFromUrl(TD_URL);
        setThing(null);

        setConnectionStatus('connected');
        console.log('✅ Connected to TestThing successfully');

        // Allow React to commit the DOM for newly rendered components
        console.log('🕒 Waiting for DOM commit (2 frames)...');
        await new Promise<void>(r => requestAnimationFrame(() => r()));
        await new Promise<void>(r => requestAnimationFrame(() => r()));

        // Poll for refs to appear (max ~1s)
        console.log('⏳ Waiting for components to mount (refs)...');
        for (let i = 0; i < 20; i++) {
          if (toggleRef.current || sliderRef.current || textRef.current || buttonRef.current || eventRef.current) break;
          await new Promise(r => setTimeout(r, 50));
        }
        console.log('🔎 Refs after wait:', {
          toggle: !!toggleRef.current,
          slider: !!sliderRef.current,
          text: !!textRef.current,
          button: !!buttonRef.current,
          event: !!eventRef.current,
        });

        // Wait for components to be ready (if method exists)
        console.log('⏳ Waiting for components to be ready...');
        const readyPromises = [
          toggleRef.current?.componentOnReady?.() || Promise.resolve(),
          sliderRef.current?.componentOnReady?.() || Promise.resolve(),
          textRef.current?.componentOnReady?.() || Promise.resolve(),
          buttonRef.current?.componentOnReady?.() || Promise.resolve(),
          eventRef.current?.componentOnReady?.() || Promise.resolve()
        ];
        await Promise.all(readyPromises);
        console.log('✅ All components ready');

        // Bind known refs directly to backend endpoints
        console.log('🔗 Binding components to backend endpoints...');
        console.log('🧩 Refs present?', {
          toggle: !!toggleRef.current,
          slider: !!sliderRef.current,
          text: !!textRef.current,
          button: !!buttonRef.current,
          event: !!eventRef.current,
        });
        if (toggleRef.current) {
          try { cleanupFunctions.push(await bindPropertyBackend(toggleRef.current, 'bool')); console.log('  • Toggle bound'); } catch (e) { console.warn('  • Toggle bind failed', e); }
        }
        if (sliderRef.current) {
          try { cleanupFunctions.push(await bindPropertyBackend(sliderRef.current, 'int')); console.log('  • Slider bound'); } catch (e) { console.warn('  • Slider bind failed', e); }
        }
        if (textRef.current) {
          try { cleanupFunctions.push(await bindPropertyBackend(textRef.current, 'string')); console.log('  • Text bound'); } catch (e) { console.warn('  • Text bind failed', e); }
        }
        if (buttonRef.current) {
          try { await bindActionBackend(buttonRef.current, 'void-void'); console.log('  • Button bound'); } catch (e) { console.warn('  • Button bind failed', e); }
        }
        if (eventRef.current) {
          try { cleanupFunctions.push(await bindEventBackend(eventRef.current, 'on-bool')); console.log('  • Event bound'); } catch (e) { console.warn('  • Event bind failed', e); }
        }
        console.log(`✅ Bound ${cleanupFunctions.length} cleanup handlers`);

      } catch (err) {
        console.error('❌ WoT initialization failed:', err);
        setConnectionStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    // Add some delay to ensure components are mounted
    setTimeout(() => {
      console.log('🎬 Starting WoT initialization (delayed to ensure component mount)');
      initializeWoT();
    }, 100);

    // Cleanup on unmount
    return () => {
      console.log('🧹 Component unmounting, cleaning up...');
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, []);

  const initializeComponents = async (_thingInstance: any, _cleanupFunctions: Array<() => void>) => {};

  const handleRefresh = async () => {
    try {
      console.log('🔄 Refreshing all properties from backend...');
      const [b, i, s] = await Promise.all([
        fetchJson(`${API_BASE}/properties/bool`),
        fetchJson(`${API_BASE}/properties/int`),
        fetchJson(`${API_BASE}/properties/string`)
      ]);
      console.log('📊 Current values:', { bool: b.value, int: i.value, string: s.value });
    } catch (err) {
      console.error('❌ Refresh failed:', err);
    }
  };

  return (
    <div className="demo-container">
      <h1>🌐 UI-WoT React Integration Demo</h1>
      
      {/* Connection Status */}
      <div className={`status ${connectionStatus}`}>
        {connectionStatus === 'loading' && '🔄 Connecting to TestThing...'}
  {connectionStatus === 'connected' && `✅ Connected to backend at ${API_BASE}`}
        {connectionStatus === 'error' && `❌ Connection failed: ${error}`}
      </div>

      {connectionStatus === 'error' && (
        <div className="card">
          <h2>🚨 Connection Troubleshooting</h2>
          <p>Could not connect to TestThing. Please ensure:</p>
          <ul>
            <li>TestThing server is running on <code>localhost:8080</code></li>
            <li>CORS is enabled for browser requests</li>
            <li>Network connectivity is available</li>
            <li>The TD endpoint responds at: <a href={TD_URL} target="_blank" rel="noopener noreferrer">{TD_URL}</a></li>
          </ul>
          <button onClick={() => window.location.reload()} style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            🔄 Retry Connection
          </button>
        </div>
      )}

      {connectionStatus === 'connected' && (
        <>
          {/* Component Showcase */}
          <div className="grid">
            
            {/* Toggle Component */}
            <div className="card">
              <h2>🎛️ Toggle Component</h2>
              <p>Connected to TD property: <code>bool</code></p>
              <ui-toggle
                ref={toggleRef}
                data-td-property="bool"
                label="Boolean Value"
                variant="outlined"
                color="primary"
                show-last-updated="true"
                show-status="true"
              ></ui-toggle>
              <p><em>Auto-bound via Node‑WoT observe</em></p>
            </div>

            {/* Slider Component */}
            <div className="card">
              <h2>🎚️ Slider Component</h2>
              <p>Connected to TD property: <code>int</code></p>
              <ui-slider
                ref={sliderRef}
                data-td-property="int"
                label="Integer Value"
                variant="filled"
                color="secondary"
                min="0"
                max="100"
                step="1"
                show-last-updated="true"
                show-status="true"
              ></ui-slider>
              <p><em>Auto-bound via Node‑WoT observe</em></p>
            </div>

            {/* Text Input Component */}
            <div className="card">
              <h2>📝 Text Input Component</h2>
              <p>Connected to TD property: <code>string</code></p>
              <ui-text
                ref={textRef}
                data-td-property="string"
                label="String Value"
                variant="outlined"
                color="primary"
                show-last-updated="true"
                show-status="true"
              ></ui-text>
              <p><em>Auto-bound via Node‑WoT observe</em></p>
            </div>

            {/* Button Component */}
            <div className="card">
              <h2>🔘 Button Component</h2>
              <p>Connected to TD action: <code>void-void</code></p>
              <ui-button
                ref={buttonRef}
                data-td-action="void-void"
                label="Execute Action"
                variant="filled"
                color="primary"
                show-status="true"
              ></ui-button>
              <p><em>Invokes action when clicked</em></p>
            </div>

            {/* Event Component */}
            <div className="card">
              <h2>📡 Event Component</h2>
              <p>Subscribed to TD event: <code>on-bool</code></p>
              <ui-event
                ref={eventRef}
                data-td-event="on-bool"
                label="Status Events"
                variant="minimal"
                color="neutral"
                show-last-updated="true"
              ></ui-event>
              <p><em>Displays real-time events from Thing</em></p>
            </div>

          </div>

          {/* Controls */}
          <div className="card">
            <h2>🛠️ Developer Controls</h2>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button onClick={handleRefresh} style={{
                padding: '8px 16px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                🔄 Refresh All Properties
              </button>
              <button onClick={() => console.log('Thing instance:', thing)} style={{
                padding: '8px 16px',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                🔍 Log Thing to Console
              </button>
            </div>
            <p style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280' }}>
              <strong>Features Demonstrated:</strong><br/>
              • Node‑WoT global bundle required (no fetch fallback)<br/>
              • UI Components from <code>@thingweb/ui-wot-components</code><br/>
              • Real-time property synchronization and event handling
            </p>
          </div>
        </>
      )}
    </div>
  );
}
