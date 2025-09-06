import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { AffordanceGroup, WoTComponent } from '../types';
import { useAppContext } from '../context/AppContext';
import './GroupContainer.css';

const ResponsiveGridLayout = WidthProvider(Responsive);
const AnyResponsiveGridLayout = ResponsiveGridLayout as unknown as React.ComponentType<any>;

interface GroupContainerProps {
  /** The group configuration */
  group: AffordanceGroup;
  /** Components belonging to this group */
  components: WoTComponent[];
  /** Whether the group is in edit mode */
  isEditMode: boolean;
  /** Callback for when a component is clicked for editing */
  onComponentEdit?: (componentId: string) => void;
  /** Callback for rendering individual components */
  renderComponent: (component: WoTComponent) => React.ReactNode;
  /** Currently editing component ID */
  editingComponent?: string | null;
}

/**
 * GroupContainer component that wraps affordances from a single TD
 * Provides visual grouping, resizing, and drag-and-drop capabilities
 */
export function GroupContainer({
  group,
  components,
  isEditMode,
  onComponentEdit,
  renderComponent,
  editingComponent
}: GroupContainerProps) {
  const { dispatch } = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [showOptions, setShowOptions] = useState(false);

  // Update container size when group layout changes
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    }
  }, [group.layout]);

  /**
   * Handle layout changes within the group
   */
  const handleInnerLayoutChange = useCallback((layout: Layout[]) => {
    if (!isEditMode) return;

    dispatch({
      type: 'UPDATE_GROUP_INNER_LAYOUT',
      payload: {
        groupId: group.id,
        layout: layout.map(item => ({
          i: item.i,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h
        }))
      }
    });
  }, [dispatch, group.id, isEditMode]);

  /**
   * Toggle group visibility
   */
  const handleToggleVisibility = useCallback(() => {
    dispatch({
      type: 'UPDATE_GROUP',
      payload: {
        id: group.id,
        updates: {
          options: {
            ...group.options,
            visible: !group.options.visible
          }
        }
      }
    });
  }, [dispatch, group.id, group.options]);

  /**
   * Toggle group collapse state
   */
  const handleToggleCollapse = useCallback(() => {
    dispatch({
      type: 'UPDATE_GROUP',
      payload: {
        id: group.id,
        updates: {
          options: {
            ...group.options,
            collapsed: !group.options.collapsed
          }
        }
      }
    });
  }, [dispatch, group.id, group.options]);

  /**
   * Update group border style
   */
  const handleBorderStyleChange = useCallback((borderStyle: 'solid' | 'dashed' | 'none') => {
    dispatch({
      type: 'UPDATE_GROUP',
      payload: {
        id: group.id,
        updates: {
          options: {
            ...group.options,
            borderStyle
          }
        }
      }
    });
  }, [dispatch, group.id, group.options]);

  /**
   * Update group background color
   */
  const handleBackgroundColorChange = useCallback((backgroundColor: string) => {
    dispatch({
      type: 'UPDATE_GROUP',
      payload: {
        id: group.id,
        updates: {
          options: {
            ...group.options,
            backgroundColor
          }
        }
      }
    });
  }, [dispatch, group.id, group.options]);

  /**
   * Update group title
   */
  const handleTitleChange = useCallback((title: string) => {
    dispatch({
      type: 'UPDATE_GROUP',
      payload: {
        id: group.id,
        updates: { title }
      }
    });
  }, [dispatch, group.id]);

  // Filter components for this group and create layout
  const groupComponents = components.filter(comp => group.affordanceIds.includes(comp.id));
  const gridLayout = groupComponents.map(comp => {
    const innerLayout = group.innerLayout.find(layout => layout.i === comp.id);
    return innerLayout || {
      i: comp.id,
      x: 0,
      y: 0,
      w: 4,
      h: 3
    };
  });

  // Group container styles
  const containerStyles: React.CSSProperties = {
    backgroundColor: group.options.backgroundColor,
    border: group.options.borderStyle === 'none' 
      ? 'none' 
      : `2px ${group.options.borderStyle} #e2e8f0`,
    borderRadius: '12px',
    padding: '16px',
    position: 'relative',
    opacity: group.options.visible ? 1 : 0.3,
    transition: 'opacity 0.3s ease, background-color 0.3s ease',
    minHeight: group.options.collapsed ? '60px' : `${group.minSize.height}px`,
    overflow: group.options.collapsed ? 'hidden' : 'visible'
  };

  return (
    <div
      ref={containerRef}
      className={`group-container ${isEditMode ? 'edit-mode' : ''}`}
      style={containerStyles}
      data-group-id={group.id}
    >
      {/* Group Header */}
      <div className="group-header flex items-center justify-between mb-4 bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-medium text-gray-800">
            {isEditMode ? (
              <input
                type="text"
                value={group.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none"
                placeholder="Group title"
              />
            ) : (
              group.title
            )}
          </h3>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {groupComponents.length} components
          </span>
        </div>

        <div className="flex items-center space-x-2 group-options">
          {/* Collapse/Expand Button */}
          <button
            onClick={handleToggleCollapse}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors no-drag"
            title={group.options.collapsed ? 'Expand group' : 'Collapse group'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${group.options.collapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Visibility Toggle */}
          <button
            onClick={handleToggleVisibility}
            className={`p-2 rounded-lg transition-colors no-drag ${
              group.options.visible 
                ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            title={group.options.visible ? 'Hide group' : 'Show group'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {group.options.visible ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              )}
            </svg>
          </button>

          {/* Options Menu */}
          {isEditMode && (
            <div className="relative">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors no-drag"
                title="Group options"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {showOptions && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border z-50 p-4 no-drag">
                  {/* Border Style */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Border Style</label>
                    <div className="flex space-x-2">
                      {(['solid', 'dashed', 'none'] as const).map(style => (
                        <button
                          key={style}
                          onClick={() => handleBorderStyleChange(style)}
                          className={`px-3 py-1 text-xs rounded border transition-colors ${
                            group.options.borderStyle === style
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background Color */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {[
                        '#ffffff', '#f8fafc', '#e2e8f0', '#cbd5e1',
                        '#dbeafe', '#dcfce7', '#fef3c7', '#fed7d7'
                      ].map(color => (
                        <button
                          key={color}
                          onClick={() => handleBackgroundColorChange(color)}
                          className={`w-8 h-8 rounded border-2 transition-all ${
                            group.options.backgroundColor === color 
                              ? 'border-blue-500 scale-110' 
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={group.options.backgroundColor}
                      onChange={(e) => handleBackgroundColorChange(e.target.value)}
                      className="w-full h-8 rounded border border-gray-200"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Group Content */}
      {!group.options.collapsed && (
        <div className="group-content" style={{ minHeight: '200px' }}>
          {groupComponents.length > 0 ? (
            <AnyResponsiveGridLayout
              className="layout"
              layouts={{ 
                lg: gridLayout.map(layout => ({
                  ...layout,
                  minW: 2,
                  minH: 2,
                  maxW: Infinity,
                  maxH: Infinity,
                  isResizable: true,
                  isDraggable: true
                }))
              }}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: Math.max(6, Math.floor(containerSize.width / 150)), md: 4, sm: 3, xs: 2, xxs: 1 }}
              rowHeight={60}
              width={Math.max(400, containerSize.width - 32)} // Account for padding, minimum width
              isDraggable={isEditMode}
              isResizable={isEditMode}
              onLayoutChange={handleInnerLayoutChange}
              margin={[8, 8]}
              containerPadding={[0, 0]}
              useCSSTransforms={true}
              compactType={null}
              preventCollision={false}
              allowOverlap={false}
              draggableHandle={'.component-drag-handle'}
              draggableCancel={'.no-drag, button, input, select, textarea, .edit-controls'}
              resizeHandles={['se', 'sw', 'nw', 'ne']}
            >
              {groupComponents.map(component => (
                <div
                  key={component.id}
                  className={`component-wrapper ${editingComponent === component.id ? 'editing' : ''}`}
                  data-component-id={component.id}
                >
                  <div
                    className="component-inner-wrapper w-full h-full"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isEditMode) {
                        onComponentEdit?.(component.id);
                      }
                    }}
                    style={{ cursor: isEditMode ? 'pointer' : 'default' }}
                  >
                    {renderComponent(component)}
                  </div>
                </div>
              ))}
            </AnyResponsiveGridLayout>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
              <p>No components in this group</p>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close options */}
      {showOptions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowOptions(false)}
        />
      )}
    </div>
  );
}
