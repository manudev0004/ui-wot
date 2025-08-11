import { useState } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { useAppContext } from '../context/AppContext';
import { WoTComponent } from '../types';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

export function ComponentCanvasPage() {
  const { state, dispatch } = useAppContext();
  const [editingComponent, setEditingComponent] = useState<string | null>(null);
  const [isDraggable, setIsDraggable] = useState(false);

  const handleLayoutChange = (layout: Layout[]) => {
    if (!isDraggable) return;
    
    layout.forEach((layoutItem) => {
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
    setEditingComponent(editingComponent === componentId ? null : componentId);
  };

  const handleComponentClose = (componentId: string) => {
    dispatch({ type: 'REMOVE_COMPONENT', payload: componentId });
  };

  const handleVariantChange = (componentId: string, variant: string) => {
    dispatch({
      type: 'UPDATE_COMPONENT',
      payload: { id: componentId, updates: { variant } },
    });
  };

  const handleBack = () => {
    dispatch({ type: 'SET_VIEW', payload: 'affordance-selection' });
  };

  const renderComponent = (component: WoTComponent) => {
    const isEditing = editingComponent === component.id;
    const affordance = state.availableAffordances.find(a => a.key === component.affordanceKey);

    return (
      <div
        key={component.layout.i}
        className="bg-white rounded-lg shadow-sm border border-primary overflow-hidden relative group"
        style={{ zIndex: isEditing ? 1000 : 1 }}
      >
        {/* Component Header */}
        <div className="bg-neutral-light px-3 py-2 border-b border-primary flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-heading font-medium text-primary truncate">{component.title}</span>
            <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
              {component.type}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleComponentEdit(component.id)}
              className={`p-1 rounded transition-colors ${
                isEditing ? 'bg-accent text-white' : 'text-primary hover:text-accent'
              }`}
              title="Edit component"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => handleComponentClose(component.id)}
              className="p-1 rounded text-primary hover:text-red-600 transition-colors"
              title="Remove component"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Component Content */}
        <div className="p-4 relative">
          <div
            ref={(el) => {
              if (el && !isEditing) {
                el.innerHTML = '';
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
                
                el.appendChild(element);
              }
            }}
            className="min-h-16 flex items-center justify-center"
          />

          {/* Simplified Edit Panel */}
          {isEditing && (
            <div className="absolute inset-0 bg-white border-2 border-accent rounded p-3 overflow-y-auto z-10">
              <div className="space-y-3">
                <h4 className="font-heading font-medium text-primary">Component Settings</h4>
                
                <div>
                  <label className="block text-sm font-heading font-medium text-primary mb-1">
                    Variant
                  </label>
                  <select
                    value={component.variant || 'minimal'}
                    onChange={(e) => handleVariantChange(component.id, e.target.value)}
                    className="w-full px-3 py-1 text-sm border border-primary rounded focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {affordance?.availableVariants.map((variant) => (
                      <option key={variant} value={variant}>
                        {variant.charAt(0).toUpperCase() + variant.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 border-t border-neutral-light">
                  <h5 className="text-sm font-heading font-medium text-primary mb-2">WoT Integration</h5>
                  <div className="text-xs text-gray-600 space-y-1 font-body">
                    <div><strong>Type:</strong> {component.type}</div>
                    <div><strong>Affordance:</strong> {component.affordanceKey}</div>
                    {affordance?.forms?.[0]?.href && (
                      <div><strong>Endpoint:</strong> <span className="font-mono">{affordance.forms[0].href}</span></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
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
              <button
                onClick={handleBack}
                className="mr-4 p-2 text-primary hover:text-accent hover:bg-neutral-light rounded-lg transition-colors"
                aria-label="Go back"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-hero font-bold text-primary">
                  COMPONENT CANVAS
                </h1>
                <p className="text-sm font-body text-gray-600 mt-1">
                  {state.parsedTD?.title} - {state.components.length} components loaded
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-heading font-medium text-primary">Drag Mode:</label>
                <button
                  onClick={() => setIsDraggable(!isDraggable)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                    isDraggable ? 'bg-primary' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isDraggable ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm font-body text-gray-500">
                  {isDraggable ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <button
                onClick={() => {
                  dispatch({ type: 'RESET_STATE' });
                  dispatch({ type: 'SET_VIEW', payload: 'home' });
                }}
                className="bg-primary hover:bg-primary-light text-white font-heading font-medium py-2 px-4 rounded-lg transition-colors"
              >
                New TD
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {state.components.length > 0 ? (
          <ResponsiveGridLayout
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
            isDraggable={isDraggable}
            isResizable={isDraggable}
            margin={[16, 16]}
            containerPadding={[0, 0]}
          >
            {state.components.map(renderComponent)}
          </ResponsiveGridLayout>
        ) : (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <svg className="mx-auto h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="mt-2 text-sm font-heading font-medium text-primary">No components</h3>
              <p className="mt-1 text-sm font-body text-gray-500">
                No components have been selected yet. Go back to select affordances from your Thing Description.
              </p>
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
  );
}