import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { wotService } from '../services/wotService';
import { WoTComponent } from '../types';

export function AffordanceSelectionPage() {
  const { state, dispatch } = useAppContext();
  const [selectedAffordances, setSelectedAffordances] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAffordanceToggle = (affordanceKey: string) => {
    setSelectedAffordances(prev => (prev.includes(affordanceKey) ? prev.filter(key => key !== affordanceKey) : [...prev, affordanceKey]));
  };

  const handleSelectAll = () => {
    setSelectedAffordances(state.availableAffordances.map(a => a.key));
  };

  const handleSelectNone = () => {
    setSelectedAffordances([]);
  };

  const handleLoad = async () => {
    if (selectedAffordances.length === 0) return;
    if (!state.parsedTD) return;

    setLoading(true);

    try {
      // Create WoT thing
      const thing = await wotService.createThing(state.parsedTD);
      dispatch({
        type: 'SET_THING',
        payload: { id: state.parsedTD.id || 'default', thing },
      });

      // Get the active TD ID
      const activeTdId = state.activeTdId || (state.tdInfos.length > 0 ? state.tdInfos[0].id : 'default');

      // Create components for selected affordances
      const components: WoTComponent[] = selectedAffordances
        .map((affordanceKey, index) => {
          const affordance = state.availableAffordances.find(a => a.key === affordanceKey);
          if (!affordance) return null;

          const gridPosition = {
            x: (index % 3) * 4, // 3 columns
            y: Math.floor(index / 3) * 4, // 4 units height per row
          };

          return {
            id: `${affordanceKey}-${Date.now()}-${index}`,
            type: affordance.type,
            title: affordance.title || affordanceKey,
            name: affordanceKey,
            description: affordance.description,
            schema: affordance.schema,
            uiComponent: affordance.suggestedComponent,
            variant: affordance.availableVariants[0],
            layout: {
              i: `${affordanceKey}-${Date.now()}-${index}`,
              x: gridPosition.x,
              y: gridPosition.y,
              w: 4,
              h: 3,
              minW: 2,
              minH: 2,
            },
            thing,
            affordanceKey,
            tdId: activeTdId, // Assign the correct TD ID
          };
        })
        .filter(Boolean) as WoTComponent[];

      // Add components to state
      components.forEach(component => {
        dispatch({ type: 'ADD_COMPONENT', payload: component });
      });

      dispatch({ type: 'SELECT_AFFORDANCES', payload: selectedAffordances });
      dispatch({ type: 'SET_VIEW', payload: 'component-canvas' });
    } catch (error) {
      console.error('Failed to load affordances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    dispatch({ type: 'SET_VIEW', payload: 'td-input' });
  };

  const getComponentBadgeColor = (component: string) => {
    const colorMap: Record<string, string> = {
      'ui-button': 'bg-blue-100 text-blue-800',
      'ui-toggle': 'bg-green-100 text-green-800',
      'ui-slider': 'bg-purple-100 text-purple-800',
      'ui-number-picker': 'bg-orange-100 text-orange-800',
      'ui-text': 'bg-gray-100 text-gray-800',
      'ui-calendar': 'bg-pink-100 text-pink-800',
      'ui-checkbox': 'bg-indigo-100 text-indigo-800',
    };
    return colorMap[component] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={handleBack} className="mr-4 p-2 text-gray-600 hover:text-gray-900" aria-label="Go back">
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Select Affordances</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {state.parsedTD?.title} - Choose which affordances to include
                  {state.components.length > 0 && (
                    <span className="ml-2 text-blue-600">
                      (Adding to existing dashboard with {state.components.length} components)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={handleSelectAll} className="text-sm text-blue-600 hover:text-blue-700">
                Select All
              </button>
              <button onClick={handleSelectNone} className="text-sm text-gray-600 hover:text-gray-700">
                Select None
              </button>
              <button
                onClick={handleLoad}
                disabled={selectedAffordances.length === 0 || loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                {loading ? 'Loading...' : `Load (${selectedAffordances.length})`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Affordances Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.availableAffordances.map(affordance => (
            <div
              key={affordance.key}
              className={`bg-white rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                selectedAffordances.includes(affordance.key) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleAffordanceToggle(affordance.key)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div>
                      <h3 className="font-medium text-gray-900">{affordance.title}</h3>
                      <p className="text-sm text-gray-500 capitalize">{affordance.type}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedAffordances.includes(affordance.key)}
                    onChange={() => handleAffordanceToggle(affordance.key)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                {affordance.description && <p className="text-sm text-gray-600 mb-3">{affordance.description}</p>}

                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getComponentBadgeColor(affordance.suggestedComponent)}`}>
                    {affordance.suggestedComponent}
                  </span>
                  {affordance.availableVariants.length > 1 && <span className="text-xs text-gray-500">+{affordance.availableVariants.length - 1} variants</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {state.availableAffordances.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No affordances found in the Thing Description.</p>
          </div>
        )}
      </div>
    </div>
  );
}
