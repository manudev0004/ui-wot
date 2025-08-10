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

  const handleLayoutChange = (layout: Layout[]) => {
    layout.forEach((layoutItem) => {
      const component = state.components.find(c => c.layout.i === layoutItem.i);
      if (component) {
        dispatch({
          type: 'UPDATE_LAYOUT',
          payload: {
            id: component.id,
            layout: {
              ...component.layout,
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h,
            },
          },
        });
      }
    });
  };

  const handleComponentEdit = (componentId: string) => {
    setEditingComponent(componentId);
  };

  const handleComponentClose = (componentId: string) => {
    dispatch({ type: 'REMOVE_COMPONENT', payload: componentId });
  };

  const handleVariantChange = (componentId: string, variant: string) => {
    dispatch({
      type: 'UPDATE_COMPONENT',
      payload: {
        id: componentId,
        updates: { variant },
      },
    });
    setEditingComponent(null);
  };

  const handleBack = () => {
    dispatch({ type: 'SET_VIEW', payload: 'affordance-selection' });
  };

  const handleNewTD = () => {
    dispatch({ type: 'RESET_STATE' });
    dispatch({ type: 'SET_VIEW', payload: 'home' });
  };

  const renderComponent = (component: WoTComponent) => {
    const isEditing = editingComponent === component.id;
    const affordance = state.availableAffordances.find(a => a.key === component.affordanceKey);
    const availableVariants = affordance?.availableVariants || [component.variant || 'default'];

    return (
      <div
        key={component.layout.i}
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
      >
        {/* Component Header */}
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">{component.title}</span>
            <span className="text-xs text-gray-500 capitalize">({component.type})</span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleComponentEdit(component.id)}
              className="p-1 text-gray-400 hover:text-gray-600 text-xs"
              title="Edit component"
            >
              ⚙️
            </button>
            <button
              onClick={() => handleComponentClose(component.id)}
              className="p-1 text-gray-400 hover:text-red-600 text-xs"
              title="Remove component"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Component Content */}
        <div className="p-4">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variant
                </label>
                <select
                  value={component.variant}
                  onChange={(e) => handleVariantChange(component.id, e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  {availableVariants.map((variant) => (
                    <option key={variant} value={variant}>
                      {variant}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setEditingComponent(null)}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
              >
                Done
              </button>
            </div>
          ) : (
            <div>
              {/* Render the actual Stencil component */}
              <div
                ref={(el) => {
                  if (el) {
                    // Clear existing content
                    el.innerHTML = '';
                    
                    // Create the custom element
                    const element = document.createElement(component.uiComponent);
                    
                    // Set attributes based on component type and schema
                    if (component.type === 'property' && component.schema) {
                      element.setAttribute('label', component.title);
                      element.setAttribute('variant', component.variant || 'default');
                      
                      // Set specific attributes based on component type
                      if (component.uiComponent === 'ui-slider' && component.schema.minimum !== undefined && component.schema.maximum !== undefined) {
                        element.setAttribute('min', component.schema.minimum.toString());
                        element.setAttribute('max', component.schema.maximum.toString());
                        element.setAttribute('value', ((component.schema.minimum + component.schema.maximum) / 2).toString());
                      }
                      
                      if (component.uiComponent === 'ui-number-picker') {
                        element.setAttribute('value', '0');
                        if (component.schema.minimum !== undefined) {
                          element.setAttribute('min', component.schema.minimum.toString());
                        }
                        if (component.schema.maximum !== undefined) {
                          element.setAttribute('max', component.schema.maximum.toString());
                        }
                      }
                      
                      if (component.uiComponent === 'ui-text') {
                        element.setAttribute('value', component.title);
                      }
                      
                      if (component.uiComponent === 'ui-toggle') {
                        element.setAttribute('label', component.title);
                      }
                    }
                    
                    if (component.type === 'action') {
                      element.setAttribute('variant', component.variant || 'primary');
                      element.textContent = component.title;
                    }
                    
                    el.appendChild(element);
                  }
                }}
                className="min-h-[80px] flex items-center justify-center"
              />
              
              {component.description && (
                <p className="text-xs text-gray-500 mt-2">{component.description}</p>
              )}
              
              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span>{component.uiComponent}</span>
                <span>{component.variant}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900"
                aria-label="Go back"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Component Canvas
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {state.parsedTD?.title} - Drag, resize, and configure components
                </p>
              </div>
            </div>
            <button
              onClick={handleNewTD}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              New TD
            </button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {state.components.length > 0 ? (
          <ResponsiveGridLayout
            className="layout"
            layouts={{
              lg: state.components.map(c => c.layout),
              md: state.components.map(c => c.layout),
              sm: state.components.map(c => c.layout),
              xs: state.components.map(c => c.layout),
              xxs: state.components.map(c => c.layout),
            }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={60}
            onLayoutChange={handleLayoutChange}
            isDraggable={true}
            isResizable={true}
            margin={[16, 16]}
            containerPadding={[0, 0]}
          >
            {state.components.map(renderComponent)}
          </ResponsiveGridLayout>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No components selected.</p>
            <button
              onClick={handleBack}
              className="text-blue-600 hover:text-blue-700"
            >
              Go back to select affordances
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
