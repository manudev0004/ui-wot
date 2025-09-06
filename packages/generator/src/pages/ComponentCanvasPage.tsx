import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { wotService } from '../services/wotService';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { useAppContext } from '../context/AppContext';
import { WoTComponent } from '../types';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);
// Use an `any`-typed alias to allow advanced props like draggableHandle/draggableCancel without TS friction
const AnyResponsiveGridLayout = ResponsiveGridLayout as unknown as React.ComponentType<any>;

export function ComponentCanvasPage() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [editingComponent, setEditingComponent] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  // attributes state for the currently editing component
  const [attributesList, setAttributesList] = useState<string[]>([]);
  const [attributesValues, setAttributesValues] = useState<Record<string, string>>({});
  const [attributesTypes, setAttributesTypes] = useState<Record<string, 'string' | 'number' | 'boolean'>>({});

  // Dashboard save/load state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');

  // Close the sidebar whenever Edit Mode is turned off
  useEffect(() => {
    if (!isEditMode && editingComponent) {
      setEditingComponent(null);
    }
  }, [isEditMode]);

  // Load saved dashboards on mount
  useEffect(() => {
    // No longer needed since we removed load functionality
  }, []);

  const handleSaveDashboard = async () => {
    if (!saveName.trim()) {
      alert('Please enter a dashboard name');
      return;
    }

    try {
      const dashboardData = {
        name: saveName.trim(),
        description: saveDescription.trim() || undefined,
        version: '1.0.0',
        timestamp: Date.now(),
        tdInfos: state.tdInfos,
        components: state.components,
        availableAffordances: state.availableAffordances,
      };

      // Export directly as JSON file instead of saving to localStorage
      const jsonString = JSON.stringify(dashboardData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${saveName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_dashboard.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setShowSaveModal(false);
      setSaveName('');
      setSaveDescription('');
      alert('Dashboard exported successfully!');
    } catch (error) {
      console.error('Failed to export dashboard:', error);
      alert('Failed to export dashboard. Please try again.');
    }
  };

  const handleLayoutChange = (layout: Layout[]) => {
    if (!isEditMode) return;

    layout.forEach(layoutItem => {
      const component = state.components.find(c => c.layout.i === layoutItem.i);
      if (component) {
        dispatch({
          type: 'UPDATE_LAYOUT',
          payload: {
            id: component.id,
            layout: { ...component.layout, x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h },
          },
        });
      }
    });
  };

  const handleComponentEdit = (componentId: string) => {
    console.log('[ComponentCanvas] handleComponentEdit called for', componentId, { isEditMode, editingComponent });
    const nextId = editingComponent === componentId ? null : componentId;
    
    // Always ensure edit mode is enabled when opening editor
    if (!isEditMode) {
      setIsEditMode(true);
    }
    
    setEditingComponent(nextId);
    
    // populate attributes when opening
    if (nextId) {
      // small timeout to ensure the element has been rendered into DOM
      setTimeout(() => populateAttributes(nextId), 150);
    } else {
      setAttributesList([]);
      setAttributesValues({});
      setAttributesTypes({});
    }
  };

  const handleComponentClose = (componentId: string) => {
    console.log('[ComponentCanvas] handleComponentClose called for', componentId);
    // Always ensure edit mode is enabled for removal
    if (!isEditMode) {
      setIsEditMode(true);
    }
    // Close any open editing panel first
    setEditingComponent(null);
    // Remove the component
    dispatch({ type: 'REMOVE_COMPONENT', payload: componentId });
  };

  const handleVariantChange = (componentId: string, variant: string) => {
    dispatch({
      type: 'UPDATE_COMPONENT',
      payload: { id: componentId, updates: { variant } },
    });
    // also update the runtime element attribute immediately
    applyAttributeChange(componentId, 'variant', variant);
  };

  // Helper: populate attributes from the actual DOM element for a component
  const populateAttributes = (componentId: string) => {
    try {
      // find the rendered element container by matching data-component-id attribute on wrapper
      const wrapper = document.querySelector(`[data-component-id="${componentId}"]`);
      // If wrapper not found, try to find by component id in state
      const comp = state.components.find(c => c.id === componentId);
      if (!comp) return;

      // look for the custom element inside the wrapper
      let el: HTMLElement | null = null;
      if (wrapper) {
        el = wrapper.querySelector(comp.uiComponent) as HTMLElement | null;
      } else {
        // fallback: search document for first matching tag
        el = document.querySelector(comp.uiComponent) as HTMLElement | null;
      }

      if (!el) {
        setAttributesList([]);
        setAttributesValues({});
        setAttributesTypes({});
        return;
      }

      // Get all standard component attributes with their types
      const componentAttributes = getComponentAttributes(comp.uiComponent);
      const attrs = Object.keys(componentAttributes);
      const vals: Record<string, string> = {};
      const types: Record<string, 'string' | 'number' | 'boolean'> = {};

      attrs.forEach(name => {
        const attrType = componentAttributes[name];
        types[name] = attrType;
        
        if (attrType === 'boolean') {
          // For boolean attributes, check if they exist on the element
          vals[name] = el!.hasAttribute(name) ? 'true' : 'false';
        } else {
          vals[name] = el!.getAttribute(name) || '';
        }
      });

      setAttributesList(attrs);
      setAttributesValues(vals);
      setAttributesTypes(types);
    } catch (err) {
      console.error('[ComponentCanvas] populateAttributes error for', componentId, err);
      setAttributesList([]);
      setAttributesValues({});
      setAttributesTypes({});
    }
  };

  // Helper: Get all available attributes for a component type with their types
  const getComponentAttributes = (componentType: string): Record<string, 'string' | 'number' | 'boolean'> => {
    const attributeMap: Record<string, Record<string, 'string' | 'number' | 'boolean'>> = {
      'ui-button': {
        'label': 'string',
        'color': 'string',
        'disabled': 'boolean',
        'dark': 'boolean',
        'readonly': 'boolean',
        'keyboard': 'boolean',
        'showLastUpdated': 'boolean'
      },
      'ui-toggle': {
        'value': 'boolean',
        'label': 'string',
        'color': 'string',
        'disabled': 'boolean',
        'dark': 'boolean',
        'readonly': 'boolean',
        'keyboard': 'boolean',
        'showLastUpdated': 'boolean'
      },
      'ui-slider': {
        'value': 'number',
        'min': 'number',
        'max': 'number',
        'step': 'number',
        'label': 'string',
        'color': 'string',
        'disabled': 'boolean',
        'dark': 'boolean',
        'readonly': 'boolean',
        'keyboard': 'boolean',
        'showLastUpdated': 'boolean',
        'orientation': 'string',
        'thumbShape': 'string',
        'enableManualControl': 'boolean'
      },
      'ui-text': {
        'value': 'string',
        'placeholder': 'string',
        'label': 'string',
        'color': 'string',
        'disabled': 'boolean',
        'dark': 'boolean',
        'readonly': 'boolean',
        'keyboard': 'boolean',
        'showLastUpdated': 'boolean'
      },
      'ui-number-picker': {
        'value': 'number',
        'min': 'number',
        'max': 'number',
        'step': 'number',
        'label': 'string',
        'color': 'string',
        'disabled': 'boolean',
        'dark': 'boolean',
        'readonly': 'boolean',
        'keyboard': 'boolean',
        'showLastUpdated': 'boolean'
      },
      'ui-calendar': {
        'value': 'string',
        'label': 'string',
        'color': 'string',
        'disabled': 'boolean',
        'dark': 'boolean',
        'readonly': 'boolean',
        'keyboard': 'boolean',
        'showLastUpdated': 'boolean'
      },
      'ui-checkbox': {
        'value': 'boolean',
        'label': 'string',
        'color': 'string',
        'disabled': 'boolean',
        'dark': 'boolean',
        'readonly': 'boolean',
        'keyboard': 'boolean',
        'showLastUpdated': 'boolean'
      }
    };

    return attributeMap[componentType] || {};
  };

  const applyAttributeChange = (componentId: string, name: string, value: string) => {
    if (!isEditMode) return; // block edits when not in edit mode
    // update local state
    setAttributesValues(prev => ({ ...prev, [name]: value }));

    // find the element within this card wrapper and apply attribute
    const comp = state.components.find(c => c.id === componentId);
    if (!comp) return;
    const wrapper = document.querySelector(`[data-component-id="${componentId}"]`);
    let el: HTMLElement | null = null;
    if (wrapper) {
      el = wrapper.querySelector(comp.uiComponent) as HTMLElement | null;
    } else {
      el = document.querySelector(comp.uiComponent) as HTMLElement | null;
    }
    if (!el) return;
    
    const attrType = attributesTypes[name];
    if (attrType === 'boolean') {
      // For boolean attributes, add/remove the attribute based on value
      if (value === 'true') {
        el.setAttribute(name, '');
      } else {
        el.removeAttribute(name);
      }
    } else {
      el.setAttribute(name, value);
    }
  };

  const handleBack = () => {
    navigate('/affordances');
  };

  const renderComponent = (component: WoTComponent) => {
    const isEditing = editingComponent === component.id;
    const affordance = state.availableAffordances.find(a => a.key === component.affordanceKey);

    // Common component creation function
    const createComponentElement = (el: HTMLElement | null) => {
      if (el && !isEditing) {
        el.innerHTML = '';
        
        try {
          const element = document.createElement(component.uiComponent);

          // Set component attributes using your component's API
          element.setAttribute('variant', component.variant || 'minimal');
          element.setAttribute('label', component.title);
          element.setAttribute('color', 'primary');

          // Set value and change handler attributes
          if (affordance?.schema) {
            if (affordance.schema.default !== undefined) {
              element.setAttribute('value', String(affordance.schema.default));
            }
            if (affordance.schema.minimum !== undefined) {
              element.setAttribute('min', String(affordance.schema.minimum));
            }
            if (affordance.schema.maximum !== undefined) {
              element.setAttribute('max', String(affordance.schema.maximum));
            }
          }

          // Add change handler for interactivity
          element.setAttribute('change-handler', `handle_${component.affordanceKey}_change`);

          // Add click handler for buttons
          if (component.uiComponent === 'ui-button') {
            element.setAttribute('click-handler', `handle_${component.affordanceKey}_click`);
          }

          // Add TD URL for WoT integration
          if (affordance?.forms?.[0]?.href) {
            element.setAttribute('td-url', affordance.forms[0].href);
          }

          // attach runtime listeners to the created element so it talks to WoT
          try {
            const thing = state.things.get(component.tdId);

            // If property, sync with current value and hook value updates
            if (affordance?.type === 'property' && thing) {
              // Set up periodic reading for properties
              const readInterval = setInterval(async () => {
                if (!el.isConnected) {
                  clearInterval(readInterval);
                  return;
                }
                try {
                  const current = await wotService.interactWithProperty(thing, affordance.key);
                  if (typeof current !== 'undefined') {
                    element.setAttribute('value', String(current));
                  }
                } catch (err) {
                  // ignore read errors
                }
              }, 2000);

              // Also read once immediately
              (async () => {
                try {
                  const current = await wotService.interactWithProperty(thing, affordance.key);
                  if (typeof current !== 'undefined') {
                    element.setAttribute('value', String(current));
                  }
                } catch (err) {
                  // ignore read errors
                }
              })();
            }

            // If action, hook click to invoke action
            if (affordance?.type === 'action') {
              element.addEventListener('click', async () => {
                try {
                  if (thing) await wotService.invokeAction(thing, affordance.key);
                } catch (err) {
                  console.error('Failed to invoke action via WoT:', err);
                }
              });
            }
          } catch (listenerErr) {
            console.warn('Failed to attach WoT listeners to element', listenerErr);
          }

          el.appendChild(element);
        } catch (error) {
          // Fallback when custom elements are not available
          console.warn(`Could not create custom element ${component.uiComponent}:`, error);
          const fallbackDiv = document.createElement('div');
          fallbackDiv.className = 'p-4 bg-gray-100 rounded border-2 border-dashed border-gray-300 text-center text-gray-500';
          fallbackDiv.innerHTML = `
            <div class="text-sm font-medium">${component.title}</div>
            <div class="text-xs mt-1">${component.uiComponent}</div>
            <div class="text-xs mt-2 text-gray-400">Component not loaded</div>
          `;
          el.appendChild(fallbackDiv);
        }
      }
    };

    // If hideCard is true, render only the component without card wrapper
    if (component.hideCard) {
      return (
        <div
          key={component.layout.i}
          data-component-id={component.id}
          className="relative w-full h-full flex items-center justify-center"
          style={{ zIndex: isEditing ? 1000 : 1 }}
          onClick={(e) => {
            // When edit mode is on, clicking opens the editor
            if (isEditMode) {
              e.stopPropagation();
              handleComponentEdit(component.id);
            }
          }}
        >
          {/* Edit overlay for card-less components */}
          {isEditMode && (
            <div className="absolute top-2 right-2 z-10 flex items-center space-x-1 bg-white rounded shadow-md border no-drag edit-controls">
              <button
                type="button"
                onClick={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation(); 
                  handleComponentEdit(component.id); 
                }}
                className={`p-1 rounded transition-colors ${isEditing ? 'bg-accent text-white' : 'text-primary hover:text-accent'}`}
                title="Edit component"
                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 2001 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
              <button 
                type="button"
                onClick={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation(); 
                  handleComponentClose(component.id); 
                }} 
                className="p-1 rounded text-primary hover:text-red-600 transition-colors" 
                title="Remove component"
                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 2001 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Component Content - takes full container */}
          <div className="w-full h-full flex items-center justify-center component-drag-handle no-drag" style={{ cursor: isEditMode ? 'move' : 'default' }}>
            <div
              ref={createComponentElement}
              className="w-full h-full flex items-center justify-center"
            />
          </div>
        </div>
      );
    }

    // Default card wrapper rendering
    return (
      <div
        key={component.layout.i}
        data-component-id={component.id}
        className="bg-white rounded-lg shadow-sm border border-primary overflow-hidden relative group"
        style={{ zIndex: isEditing ? 1000 : 1 }}
        onClick={(e) => {
          // When edit mode is on, clicking the card opens its editor
          if (isEditMode) {
            e.stopPropagation();
            handleComponentEdit(component.id);
          }
        }}
      >
        {/* Component Header */}
        <div className="bg-neutral-light px-3 py-2 border-b border-primary flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 component-drag-handle" style={{ cursor: isEditMode ? 'move' : 'default' }}>
            <span className="text-sm font-heading font-medium text-primary truncate">{component.title}</span>
            <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded">{component.type}</span>
          </div>
          {isEditMode && (
            <div className="flex items-center space-x-1 relative no-drag edit-controls" style={{ zIndex: 2000 }}>
              <button
                type="button"
                onClick={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation(); 
                  handleComponentEdit(component.id); 
                }}
                className={`p-1 rounded transition-colors ${isEditing ? 'bg-accent text-white' : 'text-primary hover:text-accent'}`}
                title="Edit component"
                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 2001 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
              <button 
                type="button"
                onClick={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation(); 
                  handleComponentClose(component.id); 
                }} 
                className="p-1 rounded text-primary hover:text-red-600 transition-colors" 
                title="Remove component"
                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 2001 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Component Content */}
        <div className="p-4 relative no-drag">
          <div
            ref={createComponentElement}
            className="min-h-16 flex items-center justify-center"
          />

          {/* Per-card editor removed; page-level sidebar is used */}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-light">
      {/* Header */}
      <div className="bg-white border-b border-primary sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={handleBack} className="mr-4 p-2 text-primary hover:text-accent hover:bg-neutral-light rounded-lg transition-colors" aria-label="Go back">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-hero font-bold text-primary">DASHBOARD</h1>
                <p className="text-sm font-body text-gray-600 mt-1">
                  {state.tdInfos.length > 0 
                    ? `${state.tdInfos.length} TD${state.tdInfos.length > 1 ? 's' : ''} loaded - ${state.components.length} components`
                    : `${state.components.length} components loaded`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-heading font-medium text-primary">Edit Mode:</label>
                <button
                  onClick={() => {
                    const next = !isEditMode;
                    setIsEditMode(next);
                    if (!next) setEditingComponent(null);
                  }}
                  aria-pressed={isEditMode}
                  aria-label={isEditMode ? 'Disable edit mode' : 'Enable edit mode'}
                  title={isEditMode ? 'Disable edit mode' : 'Enable edit mode'}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                    isEditMode ? 'bg-primary' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEditMode ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSaveModal(true)}
                  disabled={state.components.length === 0}
                  className="bg-primary hover:bg-primary-light disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-heading font-medium py-2 px-4 rounded-lg transition-colors"
                  title={state.components.length === 0 ? 'Add components to save dashboard' : 'Save current dashboard'}
                >
                  Save Dashboard
                </button>
                <button
                  onClick={() => {
                    navigate('/td-input');
                  }}
                  className="bg-accent hover:bg-accent-light text-white font-heading font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Add TD
                </button>
                <button
                  onClick={() => {
                    dispatch({ type: 'RESET_STATE' });
                    navigate('/');
                  }}
                  className="bg-primary hover:bg-primary-light text-white font-heading font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  New Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className={`${editingComponent ? 'mr-80 transition-all duration-200' : 'transition-all duration-200'}`}>
        <div className="max-w-7xl mx-auto px-4 py-6">
        {state.components.length > 0 ? (
          <AnyResponsiveGridLayout
            className="layout"
            layouts={{
              lg: state.components.map(c => ({ ...c.layout, minW: 2, minH: 2, maxW: 6 })),
              md: state.components.map(c => ({ ...c.layout, minW: 2, minH: 2, maxW: 4 })),
              sm: state.components.map(c => ({ ...c.layout, minW: 2, minH: 2, maxW: 3 })),
              xs: state.components.map(c => ({ ...c.layout, minW: 2, minH: 2, maxW: 2 })),
              xxs: state.components.map(c => ({ ...c.layout, minW: 1, minH: 2, maxW: 2 })),
            }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={60}
            onLayoutChange={handleLayoutChange}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            draggableHandle={'.component-drag-handle'}
            draggableCancel={'.no-drag, button, input, select, textarea, .edit-controls'}
          >
            {state.components.map(renderComponent)}
          </AnyResponsiveGridLayout>
        ) : (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <svg className="mx-auto h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="mt-2 text-sm font-heading font-medium text-primary">No components</h3>
              <p className="mt-1 text-sm font-body text-gray-500">No components have been selected yet. Go back to select affordances from your Thing Description.</p>
              <div className="mt-6">
                <button
                  onClick={handleBack}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-heading font-medium rounded-md text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
                >
                  Select Affordances
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Page-level right sidebar */}
  {editingComponent && isEditMode && (() => {
        const comp = state.components.find(c => c.id === editingComponent);
        if (!comp) return null;
        const afford = state.availableAffordances.find(a => a.key === comp.affordanceKey);
        return (
          <div className="fixed top-0 right-0 h-full w-80 bg-white border-l border-primary shadow-xl z-50 overflow-y-auto">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <h4 className="font-heading font-medium text-lg text-primary">Component Settings</h4>
                <button
                  onClick={() => setEditingComponent(null)}
                  className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Basic Settings */}
              <div className="space-y-3">
                <h5 className="text-sm font-heading font-medium text-primary">Basic</h5>
                
                <div>
                  <label className="block text-sm font-heading font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={comp.title}
                    onChange={e => {
                      const next = e.target.value;
                      dispatch({
                        type: 'UPDATE_COMPONENT',
                        payload: { id: comp.id, updates: { title: next } }
                      });
                      // reflect immediately on element
                      applyAttributeChange(comp.id, 'label', next);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-heading font-medium text-gray-700 mb-1">Variant</label>
                  <select
                    value={comp.variant || 'minimal'}
                    onChange={e => handleVariantChange(comp.id, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {afford?.availableVariants.map(variant => (
                      <option key={variant} value={variant}>
                        {variant.charAt(0).toUpperCase() + variant.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center space-x-2 text-sm font-heading font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={comp.hideCard || false}
                      onChange={e => {
                        dispatch({
                          type: 'UPDATE_COMPONENT',
                          payload: { id: comp.id, updates: { hideCard: e.target.checked } }
                        });
                      }}
                      className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent focus:ring-2"
                    />
                    <span>Hide card wrapper</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Show only the component without the card border and header</p>
                </div>

                {/* Layout */}
                <div>
                  <label className="block text-sm font-heading font-medium text-gray-700 mb-1">Width</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={comp.layout.w}
                    onChange={e => dispatch({
                      type: 'UPDATE_LAYOUT',
                      payload: {
                        id: comp.id,
                        layout: { ...comp.layout, w: parseInt(e.target.value) || 1 }
                      }
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-heading font-medium text-gray-700 mb-1">Height</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={comp.layout.h}
                    onChange={e => dispatch({
                      type: 'UPDATE_LAYOUT',
                      payload: {
                        id: comp.id,
                        layout: { ...comp.layout, h: parseInt(e.target.value) || 1 }
                      }
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Attributes */}
              <div className="pt-4 border-t border-gray-200">
                <h5 className="text-sm font-heading font-medium text-primary mb-3">Attributes</h5>
                <div className="space-y-3">
                  {attributesList.length === 0 && (
                    <div className="text-sm text-primary/70">No editable attributes detected.</div>
                  )}
                  {attributesList.map(name => {
                    const attrType = attributesTypes[name];
                    const currentValue = attributesValues[name] ?? '';
                    
                    return (
                      <div key={name} className="space-y-1">
                        <label className="block text-xs font-heading text-primary/80 capitalize">
                          {name.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                        
                        {attrType === 'boolean' ? (
                          // Checkbox for boolean attributes
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={currentValue === 'true'}
                              onChange={e => applyAttributeChange(comp.id, name, e.target.checked ? 'true' : 'false')}
                              className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent focus:ring-2"
                            />
                            <span className="text-xs text-gray-600">
                              {currentValue === 'true' ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        ) : attrType === 'number' ? (
                          // Number input for numeric attributes
                          <input
                            type="number"
                            value={currentValue}
                            onChange={e => applyAttributeChange(comp.id, name, e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-accent"
                            step={name === 'step' ? '0.01' : '1'}
                          />
                        ) : name === 'color' ? (
                          // Dropdown for color attribute
                          <select
                            value={currentValue}
                            onChange={e => applyAttributeChange(comp.id, name, e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-accent"
                          >
                            <option value="primary">Primary</option>
                            <option value="secondary">Secondary</option>
                            <option value="neutral">Neutral</option>
                            <option value="success">Success</option>
                          </select>
                        ) : name === 'orientation' ? (
                          // Dropdown for orientation
                          <select
                            value={currentValue}
                            onChange={e => applyAttributeChange(comp.id, name, e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-accent"
                          >
                            <option value="horizontal">Horizontal</option>
                            <option value="vertical">Vertical</option>
                          </select>
                        ) : name === 'thumbShape' ? (
                          // Dropdown for thumb shape
                          <select
                            value={currentValue}
                            onChange={e => applyAttributeChange(comp.id, name, e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-accent"
                          >
                            <option value="circle">Circle</option>
                            <option value="square">Square</option>
                            <option value="arrow">Arrow</option>
                            <option value="triangle">Triangle</option>
                            <option value="diamond">Diamond</option>
                          </select>
                        ) : (
                          // Text input for string attributes
                          <input
                            type="text"
                            value={currentValue}
                            onChange={e => applyAttributeChange(comp.id, name, e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-accent"
                            placeholder={name === 'placeholder' ? 'Enter placeholder text...' : ''}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleComponentClose(comp.id)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Remove Component
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Save Dashboard Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-heading font-medium text-primary mb-4">Save Dashboard</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-heading font-medium text-gray-700 mb-1">Dashboard Name</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="Enter dashboard name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-heading font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  value={saveDescription}
                  onChange={e => setSaveDescription(e.target.value)}
                  placeholder="Enter description..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowSaveModal(false);
                    setSaveName('');
                    setSaveDescription('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-heading font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDashboard}
                  className="px-4 py-2 bg-primary hover:bg-primary-light text-white font-heading font-medium rounded-lg transition-colors"
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
