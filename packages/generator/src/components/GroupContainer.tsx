import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  const { dispatch, state } = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [showOptions, setShowOptions] = useState(false);
  const innerLayoutChangeTimer = useRef<number | null>(null);

  // Update container size when group layout changes
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    
    // Also update size when window resizes
    window.addEventListener('resize', updateSize);
    
    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, [group.layout, group.options.collapsed]);

  // Use ResizeObserver to detect container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  /**
   * Handle layout changes within the group
   */
  const handleInnerLayoutChange = useCallback((layout: Layout[]) => {
    if (!isEditMode) return;
    if (innerLayoutChangeTimer.current) {
      window.clearTimeout(innerLayoutChangeTimer.current);
    }
    innerLayoutChangeTimer.current = window.setTimeout(() => {
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
    }, 100);
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
    console.log('handleBorderStyleChange called with:', borderStyle);
    console.log('Current group options:', group.options);
    
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
    console.log('handleBackgroundColorChange called with:', backgroundColor);
    console.log('Current group options:', group.options);
    
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
   * Update group header color
   */
  const handleHeaderColorChange = useCallback((headerColor: string) => {
    console.log('handleHeaderColorChange called with:', headerColor);
    console.log('Current group options:', group.options);
    
    dispatch({
      type: 'UPDATE_GROUP',
      payload: {
        id: group.id,
        updates: {
          options: {
            ...group.options,
            headerColor
          }
        }
      }
    });
  }, [dispatch, group.id, group.options]);

  /**
   * Update group hide wrapper option
   */
  const handleHideWrapperChange = useCallback((hideWrapper: boolean) => {
    console.log('handleHideWrapperChange called with:', hideWrapper);
    console.log('Current group options:', group.options);
    
    dispatch({
      type: 'UPDATE_GROUP',
      payload: {
        id: group.id,
        updates: {
          options: {
            ...group.options,
            hideWrapper
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

  // Group container styles (memoized)
  const containerStyles: React.CSSProperties = useMemo(() => ({
    ['--custom-bg-color' as any]: group.options.backgroundColor || '#ffffff',
    ['--custom-border' as any]: group.options.borderStyle === 'none'
      ? 'none'
      : `2px ${group.options.borderStyle || 'solid'} #e2e8f0`,
    ['--custom-header-color' as any]: group.options.headerColor || '#f8fafc',
    borderRadius: '12px',
    padding: '16px',
    position: 'relative',
    opacity: group.options.visible ? 1 : 0.3,
    transition: 'opacity 0.3s ease, background-color 0.3s ease, border 0.3s ease',
    minHeight: group.options.collapsed ? '60px' : `${group.minSize?.height || 200}px`,
    overflow: group.options.collapsed ? 'hidden' : 'visible'
  }), [group.options.backgroundColor, group.options.borderStyle, group.options.headerColor, group.options.visible, group.options.collapsed, group.minSize?.height]);

  // Optional debug: comment out noisy logs in production
  // useEffect(() => {
  //   console.log('Group styles updated:', { id: group.id, options: group.options });
  // }, [group.id, group.options]);

  // If hideWrapper is enabled, render only the content
  if (group.options.hideWrapper) {
    return (
      <div className="group-container-content-only">
        {groupComponents.length > 0 ? (
          <AnyResponsiveGridLayout
            className="layout inner-layout"
            layouts={{ 
              lg: gridLayout.map(layout => ({
                ...layout,
                minW: 2,
                minH: 2,
                maxW: 12,
                maxH: 12,
                isResizable: isEditMode,
                isDraggable: isEditMode
              })),
              md: gridLayout.map(layout => ({
                ...layout,
                minW: 2,
                minH: 2,
                maxW: 8,
                maxH: 12,
                isResizable: isEditMode,
                isDraggable: isEditMode
              })),
              sm: gridLayout.map(layout => ({
                ...layout,
                minW: 1,
                minH: 2,
                maxW: 4,
                maxH: 12,
                isResizable: isEditMode,
                isDraggable: isEditMode
              })),
              xs: gridLayout.map(layout => ({
                ...layout,
                w: Math.min(layout.w, 2),
                minW: 1,
                minH: 2,
                maxW: 2,
                maxH: 12,
                isResizable: isEditMode,
                isDraggable: isEditMode
              })),
              xxs: gridLayout.map(layout => ({
                ...layout,
                w: 1,
                minW: 1,
                minH: 2,
                maxW: 1,
                maxH: 12,
                isResizable: isEditMode,
                isDraggable: isEditMode
              }))
            }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ 
              lg: Math.max(8, Math.floor((containerSize.width - 64) / 120)), 
              md: Math.max(6, Math.floor((containerSize.width - 64) / 120)), 
              sm: 4, 
              xs: 2, 
              xxs: 1 
            }}
            rowHeight={60}
            width={containerSize.width} // Full width since no padding/border
            isDraggable={isEditMode}
            isResizable={isEditMode}
            onLayoutChange={handleInnerLayoutChange}
            margin={[8, 8]}
            containerPadding={[8, 8]}
            useCSSTransforms={true}
            compactType={state.autoArrange ? 'vertical' : null}
            preventCollision={!state.autoArrange}
            allowOverlap={false}
            draggableHandle={'.component-drag-handle'}
            draggableCancel={'.no-drag, button, input, select, textarea, .edit-controls, .options-panel'}
            resizeHandles={['se', 'sw', 'nw', 'ne']}
          >
            {groupComponents.map(component => (
              <div
                key={component.id}
                className={`component-wrapper ${editingComponent === component.id ? 'editing' : ''}`}
                data-component-id={component.id}
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
            ))}
          </AnyResponsiveGridLayout>
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
            <p>No components in this group</p>
          </div>
        )}
      </div>
    );
  }

  return (
  <div
      ref={containerRef}
      className={`group-container custom-styled ${isEditMode ? 'edit-mode' : ''}`}
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
            aria-label={group.options.collapsed ? 'Expand group' : 'Collapse group'}
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
            aria-pressed={group.options.visible}
            aria-label={group.options.visible ? 'Hide group' : 'Show group'}
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
            <div className="relative no-drag">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowOptions(!showOptions);
                }}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors no-drag"
                title="Group options"
                aria-haspopup="menu"
                aria-expanded={showOptions}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {showOptions && (
                <div
                  className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border p-4 no-drag options-panel"
                  style={{ zIndex: 2000, position: 'absolute' }}
                  onMouseDown={(e) => { e.stopPropagation(); }}
                  onPointerDown={(e) => { e.stopPropagation(); }}
                  onClick={(e) => { e.stopPropagation(); }}
                  role="menu"
                  aria-label="Group settings"
                >
                  {/* Border Style */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Border Style</label>
                    <div className="flex space-x-2">
                      {(['solid', 'dashed', 'none'] as const).map(style => (
                        <button
                          key={style}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleBorderStyleChange(style);
                            console.log('Border style changed to:', style);
                          }}
                          className={`px-3 py-1 text-xs rounded border transition-colors ${
                            group.options.borderStyle === style
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                          role="menuitemradio"
                          aria-checked={group.options.borderStyle === style}
                          aria-label={`Border ${style}`}
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
                        'transparent', '#ffffff', '#f8fafc', '#e2e8f0', 
                        '#cbd5e1', '#dbeafe', '#dcfce7', '#fef3c7', '#fed7d7'
                      ].map(color => (
                        <button
                          key={color}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleBackgroundColorChange(color);
                            console.log('Background color changed to:', color);
                          }}
                          className={`w-8 h-8 rounded border-2 transition-all ${
                            group.options.backgroundColor === color 
                              ? 'border-blue-500 scale-110' 
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                          style={{ 
                            backgroundColor: color === 'transparent' ? 'transparent' : color,
                            backgroundImage: color === 'transparent' 
                              ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                              : 'none',
                            backgroundSize: color === 'transparent' ? '8px 8px' : 'auto',
                            backgroundPosition: color === 'transparent' ? '0 0, 0 4px, 4px -4px, -4px 0px' : 'auto'
                          }}
                          title={color === 'transparent' ? 'Transparent' : color}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={group.options.backgroundColor || '#ffffff'}
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleBackgroundColorChange(e.target.value);
                        console.log('Custom background color changed to:', e.target.value);
                      }}
                      className="w-full h-8 rounded border border-gray-200"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Header Color */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Header Color</label>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {[
                        '#f8fafc', '#ffffff', '#e2e8f0', '#cbd5e1',
                        '#dbeafe', '#dcfce7', '#fef3c7', '#fed7d7'
                      ].map(color => (
                        <button
                          key={color}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleHeaderColorChange(color);
                            console.log('Header color changed to:', color);
                          }}
                          className={`w-8 h-8 rounded border-2 transition-all ${
                            group.options.headerColor === color 
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
                      value={group.options.headerColor || '#f8fafc'}
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleHeaderColorChange(e.target.value);
                        console.log('Custom header color changed to:', e.target.value);
                      }}
                      className="w-full h-8 rounded border border-gray-200"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Hide Wrapper Toggle */}
                  <div className="mb-4">
                    <label className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Hide Wrapper</span>
                      <input
                        type="checkbox"
                        checked={group.options.hideWrapper || false}
                        onChange={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleHideWrapperChange(e.target.checked);
                          console.log('Hide wrapper changed to:', e.target.checked);
                        }}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-1">Hide the group wrapper and show only components</p>
                  </div>

                  {/* Close button */}
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowOptions(false);
                      }}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                    >
                      Close
                    </button>
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
              className="layout inner-layout"
              layouts={{ 
                lg: gridLayout.map(layout => ({
                  ...layout,
                  minW: 2,
                  minH: 2,
                  maxW: 12,
                  maxH: 12,
                  isResizable: isEditMode,
                  isDraggable: isEditMode
                })),
                md: gridLayout.map(layout => ({
                  ...layout,
                  minW: 2,
                  minH: 2,
                  maxW: 8,
                  maxH: 12,
                  isResizable: isEditMode,
                  isDraggable: isEditMode
                })),
                sm: gridLayout.map(layout => ({
                  ...layout,
                  minW: 1,
                  minH: 2,
                  maxW: 4,
                  maxH: 12,
                  isResizable: isEditMode,
                  isDraggable: isEditMode
                }))
              }}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ 
                lg: Math.max(8, Math.floor((containerSize.width - 64) / 120)), 
                md: Math.max(6, Math.floor((containerSize.width - 64) / 120)), 
                sm: 4, 
                xs: 2, 
                xxs: 1 
              }}
              rowHeight={60}
              width={containerSize.width - 32} // Account for padding
              isDraggable={isEditMode}
              isResizable={isEditMode}
              onLayoutChange={handleInnerLayoutChange}
              margin={[8, 8]}
              containerPadding={[8, 8]}
              useCSSTransforms={true}
              compactType={state.autoArrange ? 'vertical' : null}
              preventCollision={!state.autoArrange}
              allowOverlap={false}
              draggableHandle={'.component-drag-handle'}
              draggableCancel={'.no-drag, button, input, select, textarea, .edit-controls, .options-panel'}
              resizeHandles={['se', 'sw', 'nw', 'ne']}
            >
              {groupComponents.map(component => (
                <div
                  key={component.id}
                  className={`component-wrapper ${editingComponent === component.id ? 'editing' : ''}`}
                  data-component-id={component.id}
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
          className="fixed inset-0"
          style={{ zIndex: 1000 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowOptions(false);
          }}
        />
      )}
    </div>
  );
}
