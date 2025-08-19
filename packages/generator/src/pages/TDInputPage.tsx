import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAppContext } from '../context/AppContext';
import { wotService } from '../services/wotService';

export function TDInputPage() {
  const { state, dispatch } = useAppContext();
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setError(null);
      setLoading(true);

      try {
        const tdSource = { type: 'file' as const, content: file };
        const parsedTD = await wotService.parseTDFromSource(tdSource);
        const affordances = wotService.parseAffordances(parsedTD);

        // Create TD info object
        const tdInfo = {
          id: Date.now().toString(), // Simple ID generation
          title: parsedTD.title || 'Untitled TD',
          td: parsedTD,
          source: tdSource
        };

        if (state.components.length > 0) {
          // Adding to existing dashboard
          dispatch({ type: 'ADD_TD', payload: tdInfo });
          dispatch({ type: 'SET_AFFORDANCES', payload: [...state.availableAffordances, ...affordances] });
        } else {
          // First TD
          dispatch({ type: 'SET_TD_SOURCE', payload: tdSource });
          dispatch({ type: 'SET_PARSED_TD', payload: parsedTD });
          dispatch({ type: 'SET_AFFORDANCES', payload: affordances });
          dispatch({ type: 'ADD_TD', payload: tdInfo });
        }
        
        dispatch({ type: 'SET_VIEW', payload: 'affordance-selection' });
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
      const affordances = wotService.parseAffordances(parsedTD);

      // Create TD info object
      const tdInfo = {
        id: Date.now().toString(), // Simple ID generation
        title: parsedTD.title || 'Untitled TD',
        td: parsedTD,
        source: tdSource
      };

      if (state.components.length > 0) {
        // Adding to existing dashboard
        dispatch({ type: 'ADD_TD', payload: tdInfo });
        dispatch({ type: 'SET_AFFORDANCES', payload: [...state.availableAffordances, ...affordances] });
      } else {
        // First TD
        dispatch({ type: 'SET_TD_SOURCE', payload: tdSource });
        dispatch({ type: 'SET_PARSED_TD', payload: parsedTD });
        dispatch({ type: 'SET_AFFORDANCES', payload: affordances });
        dispatch({ type: 'ADD_TD', payload: tdInfo });
      }

      dispatch({ type: 'SET_VIEW', payload: 'affordance-selection' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Thing Description');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (state.components.length > 0) {
      // If we have existing components, go back to canvas
      dispatch({ type: 'SET_VIEW', payload: 'component-canvas' });
    } else {
      // Otherwise go to home
      dispatch({ type: 'SET_VIEW', payload: 'home' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button onClick={handleBack} className="mr-4 p-2 text-gray-600 hover:text-gray-900" aria-label="Go back">
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {state.components.length > 0 ? 'Add Another Thing Description' : 'Add Thing Description'}
          </h1>
          {state.components.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              Adding to existing dashboard with {state.components.length} components from {state.tdInfos.length} TD{state.tdInfos.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* URL Input */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">From URL</h2>
          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Thing Description URL
              </label>
              <input
                type="url"
                id="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://example.com/thing-description.json"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !urlInput.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Loading...' : 'Load from URL'}
            </button>
          </form>
        </div>

        {/* File Upload */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">From File</h2>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            } ${loading ? 'pointer-events-none opacity-50' : ''}`}
          >
            <input {...getInputProps()} />
            <div className="text-gray-600">
              {loading ? (
                <div>
                  <div className="text-lg font-medium">Processing...</div>
                </div>
              ) : isDragActive ? (
                <div>
                  <div className="text-lg font-medium">Drop the file here</div>
                </div>
              ) : (
                <div>
                  <div className="text-lg font-medium mb-2">Drag & drop a Thing Description file here</div>
                  <div className="text-sm text-gray-500 mb-4">or click to select a file</div>
                  <div className="text-xs text-gray-400">Supports .json and .jsonld files</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
