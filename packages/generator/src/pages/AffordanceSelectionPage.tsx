import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { wotService } from '../services/wotService';
import { WoTComponent } from '../types';

export function AffordanceSelectionPage() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [selectedAffordances, setSelectedAffordances] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  // map affordanceKey -> selected component type (when multiple are available)
  const [selectedComponentMap, setSelectedComponentMap] = useState<Record<string, string>>({});

  const handleAffordanceToggle = (affordanceKey: string) => {
    setSelectedAffordances(prev => (prev.includes(affordanceKey) ? prev.filter(key => key !== affordanceKey) : [...prev, affordanceKey]));
  };

  const handleSelectAll = () => {
    setSelectedAffordances(state.availableAffordances.map(a => a.key));
  };

  const handleSelectNone = () => {
    setSelectedAffordances([]);
  };

  const handleComponentChoice = (affordanceKey: string, componentType: string) => {
    setSelectedComponentMap(prev => ({ ...prev, [affordanceKey]: componentType }));
  };

  const handleLoad = async () => {
    if (selectedAffordances.length === 0) return;
    if (!state.parsedTD) return;

    setLoading(true);

    try {
      // Reset previous selection in context when loading for a new TD
      dispatch({ type: 'SELECT_AFFORDANCES', payload: [] });
      // Reset local map for component choice
      setSelectedComponentMap({});
      // Create WoT thing
      const thing = await wotService.createThing(state.parsedTD);

      // Register the created thing under the existing tdInfo id when possible so components can resolve it
      // Try to find the tdInfo that corresponds to the currently parsed TD
      const foundTdInfo = state.tdInfos.find(t => t.td === state.parsedTD) || state.tdInfos[0];
      const registerKey = foundTdInfo?.id || state.parsedTD.id || 'default';

      if (state.parsedTD.id) wotService.registerThing(state.parsedTD.id, thing);
      wotService.registerThing(registerKey, thing);

      dispatch({
        type: 'SET_THING',
        payload: { id: state.parsedTD.id || registerKey, thing },
      });

      // Get the active TD ID (prefer existing tdInfo id, fallback to parsedTD.id)
      const activeTdId = state.activeTdId || registerKey || (state.tdInfos.length > 0 ? state.tdInfos[0].id : 'default');
      const activeTdInfo = state.tdInfos.find(td => td.id === activeTdId);

      // Create components for selected affordances
      const components: WoTComponent[] = selectedAffordances
        .map((affordanceKey, index) => {
          const affordance = state.availableAffordances.find(a => a.key === affordanceKey);
          if (!affordance) return null;

          return {
            id: `${affordanceKey}-${Date.now()}-${index}`,
            type: affordance.type,
            title: affordance.title || affordanceKey,
            name: affordanceKey,
            description: affordance.description,
            schema: affordance.schema,
            uiComponent: selectedComponentMap[affordance.key] || affordance.suggestedComponent,
            variant: affordance.availableVariants[0],
            layout: {
              i: `${affordanceKey}-${Date.now()}-${index}`,
              x: (index % 4) * 3, // 4 columns in group, 3 units wide
              y: Math.floor(index / 4) * 3, // 3 units height per row
              w: 3,
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

      // Create a group for these components
      if (components.length > 0) {
        const groupId = `group-${activeTdId}-${Date.now()}`;
        
        // Create the affordance group
        const group = {
          id: groupId,
          tdId: activeTdId,
          title: activeTdInfo?.title || state.parsedTD?.title || 'Device Group',
          description: `Components from ${activeTdInfo?.title || state.parsedTD?.title}`,
          layout: {
            i: groupId,
            x: 0,
            y: Math.max(0, ...state.components.map(c => c.layout.y + c.layout.h), 
                        ...state.groups.map(g => g.layout.y + g.layout.h)),
            w: 12, // Full width
            h: Math.ceil(components.length / 4) * 4 + 2, // Height based on component count + header
            minW: 8,
            minH: 6,
          },
          options: {
            visible: true,
            borderStyle: 'solid' as const,
            backgroundColor: '#f8fafc',
            headerColor: '#f8fafc',
            collapsed: false,
            hideWrapper: false,
          },
          affordanceIds: components.map(c => c.id),
          innerLayout: components.map(comp => ({
            i: comp.id,
            x: comp.layout.x,
            y: comp.layout.y,
            w: comp.layout.w,
            h: comp.layout.h,
          })),
          minSize: {
            width: 400,
            height: 300,
          },
        };

        // Add group to state
        dispatch({ type: 'ADD_GROUP', payload: group });
      }

      // Add components to state
      components.forEach(component => {
        dispatch({ type: 'ADD_COMPONENT', payload: component });
      });

      dispatch({ type: 'SELECT_AFFORDANCES', payload: selectedAffordances });
      navigate('/components');
    } catch (error) {
      console.error('Failed to load affordances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/td-input');
  };

  const getComponentBadgeColor = (component: string) => {
    const colorMap: Record<string, string> = {
      'ui-button': 'bg-primary/10 text-primary',
      'ui-toggle': 'bg-accent/10 text-accent',
      'ui-slider': 'bg-primary-light/10 text-primary-light',
      'ui-number-picker': 'bg-accent/20 text-primary',
      'ui-text': 'bg-neutral-light/50 text-primary',
      'ui-calendar': 'bg-primary/20 text-primary',
      'ui-checkbox': 'bg-primary-light/20 text-primary-light',
    };
    return colorMap[component] || 'bg-neutral-light/50 text-primary';
  };

  return (
    <div className="min-h-screen bg-neutral-light">
      {/* Header */}
      <div className="bg-white border-b border-primary/20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={handleBack} className="mr-4 p-2 text-primary hover:text-primary-light font-heading" aria-label="Go back">
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-hero text-primary">SELECT AFFORDANCES</h1>
                <p className="text-sm text-primary/70 font-body mt-1">
                  {state.parsedTD?.title} - Choose which affordances to include
                  {state.components.length > 0 && (
                    <span className="ml-2 text-accent">
                      (Adding to existing dashboard with {state.components.length} components)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={handleSelectAll} className="text-sm text-accent hover:text-accent/80 font-heading">
                Select All
              </button>
              <button onClick={handleSelectNone} className="text-sm text-primary/70 hover:text-primary font-heading">
                Select None
              </button>
              <button
                onClick={handleLoad}
                disabled={selectedAffordances.length === 0 || loading || !state.parsedTD}
                className="bg-primary hover:bg-primary-light disabled:bg-gray-300 text-white font-heading font-medium py-2 px-6 rounded-lg transition-colors"
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
                selectedAffordances.includes(affordance.key) ? 'border-accent bg-accent/5' : 'border-primary/20 hover:border-primary/40'
              }`}
              onClick={() => handleAffordanceToggle(affordance.key)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div>
                      <h3 className="font-heading font-medium text-primary">{affordance.title}</h3>
                      <p className="text-sm text-primary/70 font-body capitalize">{affordance.type}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedAffordances.includes(affordance.key)}
                    onChange={() => handleAffordanceToggle(affordance.key)}
                    className="w-4 h-4 text-primary border-primary/30 rounded focus:ring-primary"
                  />
                </div>

                {affordance.description && <p className="text-sm text-black font-body mb-3">{affordance.description}</p>}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-heading font-medium ${getComponentBadgeColor(selectedComponentMap[affordance.key] || affordance.suggestedComponent)}`}>
                      {selectedComponentMap[affordance.key] || affordance.suggestedComponent}
                    </span>
                    {affordance.possibleComponents && affordance.possibleComponents.length > 1 && (
                      <select
                        value={selectedComponentMap[affordance.key] || affordance.suggestedComponent}
                        onChange={e => handleComponentChoice(affordance.key, e.target.value)}
                        className="text-sm border border-gray-200 rounded px-2 py-1"
                        onClick={e => e.stopPropagation()}
                      >
                        {affordance.possibleComponents.map(pc => (
                          <option key={pc} value={pc}>{pc}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  {affordance.availableVariants.length > 1 && <span className="text-xs text-primary/50 font-body">+{affordance.availableVariants.length - 1} variants</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {state.availableAffordances.length === 0 && (
          <div className="text-center py-12">
            <p className="text-primary/70 font-body">No affordances found in the Thing Description.</p>
          </div>
        )}
      </div>
    </div>
  );
}
