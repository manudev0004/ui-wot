import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { wotService } from '../services/wotService';
import { dashboardService } from '../services/dashboardService';

export function TDInputPage() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function postTDToHost(td: any): Promise<string> {
    const resp = await fetch('http://localhost:8086/serve-td', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(td),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `TD host error (${resp.status})`);
    }
    const data = await resp.json();
    return data.url as string;
  }

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setError(null);
      setLoading(true);

      try {
        const tdSource = { type: 'file' as const, content: file };
        const parsedTD = await wotService.parseTDFromSource(tdSource);
        // Ask Node‑WoT servient to host this TD and give back a URL
        const servedUrl = await postTDToHost(parsedTD);
        const affordances = wotService.parseAffordances(parsedTD);

        // Create TD info object
        const tdInfo = {
          id: Date.now().toString(), // Simple ID generation
          title: parsedTD.title || 'Untitled TD',
          td: parsedTD,
          source: tdSource,
        };

        // Always replace current parsed TD and available affordances when loading a new TD from this page
        dispatch({ type: 'SET_TD_SOURCE', payload: { type: 'url', content: servedUrl } });
        dispatch({ type: 'SET_PARSED_TD', payload: parsedTD });
        dispatch({ type: 'SET_AFFORDANCES', payload: affordances });
        dispatch({ type: 'ADD_TD', payload: { ...tdInfo, source: { type: 'url', content: servedUrl } } });

        navigate('/affordances');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse Thing Description');
      } finally {
        setLoading(false);
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'application/ld+json': ['.jsonld'],
    },
    maxFiles: 1,
  });

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const tdSource = { type: 'url' as const, content: urlInput.trim() };
      const parsedTD = await wotService.parseTDFromSource(tdSource);
      // Rehost via Node‑WoT to normalize path/security and ensure liveness
      const servedUrl = await postTDToHost(parsedTD);
      const affordances = wotService.parseAffordances(parsedTD);

      // Create TD info object
      const tdInfo = {
        id: Date.now().toString(), // Simple ID generation
        title: parsedTD.title || 'Untitled TD',
        td: parsedTD,
        source: tdSource,
      };

      // Always replace current parsed TD and available affordances when loading a new TD from this page
      dispatch({ type: 'SET_TD_SOURCE', payload: { type: 'url', content: servedUrl } });
      dispatch({ type: 'SET_PARSED_TD', payload: parsedTD });
      dispatch({ type: 'SET_AFFORDANCES', payload: affordances });
      dispatch({ type: 'ADD_TD', payload: { ...tdInfo, source: { type: 'url', content: servedUrl } } });

      navigate('/affordances');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Thing Description');
    } finally {
      setLoading(false);
    }
  };

  const handleImportDashboard = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    try {
      const dashboardData = await dashboardService.importDashboard(file);

      dispatch({
        type: 'LOAD_DASHBOARD',
        payload: {
          tdInfos: dashboardData.tdInfos,
          components: dashboardData.components,
          availableAffordances: dashboardData.availableAffordances,
          groups: dashboardData.groups || [], // Include groups if available
        },
      });

      navigate('/components');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import dashboard. Please check the file format.');
    } finally {
      setLoading(false);
    }

    // Reset the file input
    event.target.value = '';
  };

  const handleBack = () => {
    if (state.components.length > 0) {
      // If we have existing components, go back to canvas
      navigate('/components');
    } else {
      // Otherwise go to home
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-light py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button onClick={handleBack} className="mr-4 p-2 text-primary hover:text-primary-light font-heading" aria-label="Go back">
            ← Back
          </button>
          <h1 className="text-3xl font-hero text-primary">{state.components.length > 0 ? 'ADD ANOTHER THING DESCRIPTION' : 'ADD THING DESCRIPTION'}</h1>
          {state.components.length > 0 && (
            <p className="text-sm text-primary/70 font-body mt-1">
              Adding to existing dashboard with {state.components.length} components from {state.tdInfos.length} TD{state.tdInfos.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-body">{error}</p>
          </div>
        )}

        {/* URL Input */}
        <div className="bg-white rounded-lg shadow-sm border border-primary/20 p-6 mb-6">
          <h2 className="text-xl font-heading font-semibold text-primary mb-4">From URL</h2>
          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-heading font-medium text-primary mb-2">
                Thing Description URL
              </label>
              <input
                type="url"
                id="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://example.com/thing-description.json"
                className="w-full px-3 py-2 border border-primary/30 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-body"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !urlInput.trim()}
              className="w-full bg-primary hover:bg-primary-light disabled:bg-gray-300 text-white font-heading font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Loading...' : 'Consume'}
            </button>
          </form>
        </div>

        {/* File Upload */}
        <div className="bg-white rounded-lg shadow-sm border border-primary/20 p-6">
          <h2 className="text-xl font-heading font-semibold text-primary mb-4">From File</h2>

          {/* Thing Description Upload */}
          <div className="mb-6">
            <h3 className="text-lg font-heading font-medium text-primary mb-3">Thing Description</h3>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                isDragActive ? 'border-accent bg-accent/10' : 'border-primary/30 hover:border-primary/50'
              } ${loading ? 'pointer-events-none opacity-50' : ''}`}
            >
              <input {...getInputProps()} />
              <div className="text-primary">
                {loading ? (
                  <div>
                    <div className="text-lg font-heading font-medium">Processing...</div>
                  </div>
                ) : isDragActive ? (
                  <div>
                    <div className="text-lg font-heading font-medium">Drop the TD file here</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-lg font-heading font-medium mb-2">Drag & drop a Thing Description file here</div>
                    <div className="text-sm text-primary/70 font-body mb-4">or click to select a file</div>
                    <div className="text-xs text-primary/50 font-body">Supports .json and .jsonld files</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dashboard Import */}
          <div>
            <h3 className="text-lg font-heading font-medium text-primary mb-3">Dashboard</h3>
            <div className="border-2 border-dashed border-primary/30 hover:border-primary/50 rounded-lg p-6 text-center transition-colors">
              <label className="cursor-pointer block">
                <div className="text-primary">
                  <div className="text-lg font-heading font-medium mb-2">Import Saved Dashboard</div>
                  <div className="text-sm text-primary/70 font-body mb-4">Upload a previously exported dashboard file</div>
                  <div className="text-xs text-primary/50 font-body">Supports .json dashboard files</div>
                </div>
                <input type="file" accept=".json" onChange={handleImportDashboard} className="hidden" disabled={loading} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
