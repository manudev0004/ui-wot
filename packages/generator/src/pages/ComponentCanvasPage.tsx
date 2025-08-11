import { useState, useRef, useEffect } from 'react';
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
  const editModalRef = useRef<HTMLDivElement>(null);

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
    setEditingComponent(editingComponent === componentId ? null : componentId);
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
  };

  const handleSettingsToggle = () => {
    setIsDraggable(!isDraggable);
  };

  const getComponentVariants = (uiComponent: string): string[] => {
    const variantMap: Record<string, string[]> = {
      'ui-button': ['minimal', 'outlined', 'filled'],
      'ui-slider': ['minimal', 'outlined', 'filled'],
      'ui-number-picker': ['minimal', 'outlined', 'filled'],
      'ui-toggle': ['minimal', 'outlined', 'filled'],
      'ui-text': ['minimal', 'outlined', 'filled'],
      'ui-checkbox': ['minimal', 'outlined', 'filled'],
      'ui-calendar': ['minimal', 'outlined', 'filled'],
      'ui-heading': ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
    };
    return variantMap[uiComponent] || ['default'];
  };

  const getComponentColors = (): string[] => {
    return ['primary', 'secondary', 'neutral'];
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
    const availableVariants = getComponentVariants(component.uiComponent);
    const availableColors = getComponentColors();

    return (
      <div
        key={component.layout.i}
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative group"
        style={{ zIndex: isEditing ? 1000 : 1 }}
      >
        {/* Component Header */}
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700 truncate">{component.title}</span>
            <span className="text-xs text-gray-500 capitalize px-2 py-1 bg-gray-100 rounded">
              {component.type}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleComponentEdit(component.id);
              }}
              className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
                isEditing ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Edit component"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleComponentClose(component.id);
              }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Remove component"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Component Content */}
        <div className="p-4 relative">
          {/* Component Stencil Element */}
          <div
            ref={(el) => {
              if (el && !isEditing) {
                // Clear existing content
                el.innerHTML = '';
                
                // Create the custom element
                const element = document.createElement(component.uiComponent);
                
                // Set common attributes
                element.setAttribute('variant', component.variant || 'minimal');
                
                // Set attributes based on component type and schema
                if (component.type === 'property' && component.schema) {
                  element.setAttribute('label', component.title);
                  
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

                  if (component.uiComponent === 'ui-checkbox') {
                    element.setAttribute('label', component.title);
                  }

                  if (component.uiComponent === 'ui-heading') {
                    element.setAttribute('level', component.variant || 'h3');
                    element.textContent = component.title;
                  }
                }
                
                if (component.type === 'action') {
                  element.setAttribute('label', component.title);
                  // Set TD URL and action data for WoT functionality
                  if (state.parsedTD && component.affordanceKey) {
                    const baseUrl = 'http://localhost:8080'; // Mock URL for demo
                    element.setAttribute('td-url', `${baseUrl}/${component.affordanceKey}`);
                  }
                }
                
                el.appendChild(element);
              }
            }}
            className="min-h-[60px] flex items-center justify-center mb-3"
          />
          
          {/* Component Info */}
          {!isEditing && (
            <>
              {component.description && (
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{component.description}</p>
              )}
              
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="truncate">{component.uiComponent}</span>
                <span className="capitalize">{component.variant}</span>
              </div>
            </>
          )}
        </div>

        {/* Edit Panel */}
        {isEditing && (
          <div className="absolute inset-0 bg-white border-2 border-blue-500 rounded-lg z-10 overflow-y-auto">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Edit Component</h3>
                <button
                  onClick={() => setEditingComponent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variant
                </label>
                <select
                  value={component.variant || 'minimal'}
                  onChange={(e) => handleVariantChange(component.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {availableVariants.map((variant) => (
                    <option key={variant} value={variant}>
                      {variant.charAt(0).toUpperCase() + variant.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Component Type
                </label>
                <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
                  {component.uiComponent}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Affordance
                </label>
                <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
                  {component.affordanceKey} ({component.type})
                </div>
              </div>

              {component.schema && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schema Info
                  </label>
                  <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded font-mono">
                    {JSON.stringify(component.schema, null, 2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Component Canvas
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {state.parsedTD?.title} - {state.components.length} components loaded
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Drag Mode:</label>
                <button
                  onClick={handleSettingsToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isDraggable ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isDraggable ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-500">
                  {isDraggable ? 'Enabled' : 'Disabled'}
                </span>
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
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No components</h3>
              <p className="mt-1 text-sm text-gray-500">
                No components have been selected yet. Go back to select affordances from your Thing Description.
              </p>
              <div className="mt-6">
                <button
                  onClick={handleBack}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
