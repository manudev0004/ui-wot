import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { AffordanceGroup, WoTComponent } from '../types';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import './GroupContainer.css';
import { GridStack } from 'gridstack';

// No grid inside groups; parent handles free-form positioning

interface GroupContainerProps {
  /** The group configuration */
  group: AffordanceGroup;
  /** Components belonging to this group */
  components: WoTComponent[];
  /** Whether the group is in edit mode */
  isEditMode: boolean;
  /** Toggle wrapper visibility and edit options via header */
  /** Optional render function to render a component card */
  renderCard?: (component: WoTComponent) => React.ReactNode;
}

/**
 * GroupContainer component that wraps affordances from a single TD
 * Provides visual grouping, resizing, and drag-and-drop capabilities
 */
export function GroupContainer({ group, components, isEditMode, renderCard }: GroupContainerProps) {
  const { dispatch } = useAppContext();
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [showOptions, setShowOptions] = useState(false);

  // Size observation no longer needed; parent controls sizing

  // Initialize nested GridStack for this group
  useEffect(() => {
    if (!gridRef.current) return;
    const grid = GridStack.init(
      {
        column: 24,
        cellHeight: 70,
        margin: 14,
        acceptWidgets: false,
        float: false,
        disableDrag: !isEditMode,
        disableResize: !isEditMode,
      },
      gridRef.current,
    );

    // Compact inner grid after mount
    requestAnimationFrame(() => {
      try {
        grid.compact();
      } catch {}
    });

    const onChange = (_: any, items: any[]) => {
      if (!items) return;
      // Update innerLayout entries for moved/resized components
      const updated = new Map<string, { i: string; x: number; y: number; w: number; h: number }>();
      (group.innerLayout || []).forEach(i => updated.set(i.i, { ...i }));
      items.forEach(it => {
        const el = it.el as HTMLElement | null;
        if (!el) return;
        const itemId = el.getAttribute('data-item-id') || '';
        const [kind, rawId] = itemId.split(':');
        if (kind !== 'comp' || !rawId) return;
        updated.set(rawId, { i: rawId, x: it.x, y: it.y, w: it.w, h: it.h });
      });
      const nextLayout = Array.from(updated.values());
      dispatch({ type: 'UPDATE_GROUP_INNER_LAYOUT', payload: { groupId: group.id, layout: nextLayout } });
    };

    // Disable cross-grid membership via drag to avoid DOM conflicts

    grid.on('change', onChange);
    // No added/removed listeners

    return () => {
      grid.off('change');
      // nothing to remove for added/removed
      grid.destroy(false);
    };
  }, [dispatch, group.id, group.innerLayout, isEditMode]);

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
            visible: !group.options.visible,
          },
        },
      },
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
            collapsed: !group.options.collapsed,
          },
        },
      },
    });
  }, [dispatch, group.id, group.options]);

  /**
   * Update group border style
   */
  const handleBorderStyleChange = useCallback(
    (borderStyle: 'solid' | 'dashed' | 'none') => {
      console.log('handleBorderStyleChange called with:', borderStyle);
      console.log('Current group options:', group.options);

      dispatch({
        type: 'UPDATE_GROUP',
        payload: {
          id: group.id,
          updates: {
            options: {
              ...group.options,
              borderStyle,
            },
          },
        },
      });
    },
    [dispatch, group.id, group.options],
  );

  /**
   * Update group background color
   */
  const handleBackgroundColorChange = useCallback(
    (backgroundColor: string) => {
      console.log('handleBackgroundColorChange called with:', backgroundColor);
      console.log('Current group options:', group.options);

      dispatch({
        type: 'UPDATE_GROUP',
        payload: {
          id: group.id,
          updates: {
            options: {
              ...group.options,
              backgroundColor,
            },
          },
        },
      });
    },
    [dispatch, group.id, group.options],
  );

  /**
   * Update group header color
   */
  const handleHeaderColorChange = useCallback(
    (headerColor: string) => {
      console.log('handleHeaderColorChange called with:', headerColor);
      console.log('Current group options:', group.options);

      dispatch({
        type: 'UPDATE_GROUP',
        payload: {
          id: group.id,
          updates: {
            options: {
              ...group.options,
              headerColor,
            },
          },
        },
      });
    },
    [dispatch, group.id, group.options],
  );

  /**
   * Update group hide wrapper option
   */
  const handleHideWrapperChange = useCallback(
    (hideWrapper: boolean) => {
      console.log('handleHideWrapperChange called with:', hideWrapper);
      console.log('Current group options:', group.options);

      dispatch({
        type: 'UPDATE_GROUP',
        payload: {
          id: group.id,
          updates: {
            options: {
              ...group.options,
              hideWrapper,
            },
          },
        },
      });
    },
    [dispatch, group.id, group.options],
  );

  /**
   * Update group title
   */
  const handleTitleChange = useCallback(
    (title: string) => {
      dispatch({
        type: 'UPDATE_GROUP',
        payload: {
          id: group.id,
          updates: { title },
        },
      });
    },
    [dispatch, group.id],
  );

  const groupComponents = components.filter(comp => group.affordanceIds.includes(comp.id));

  // Group container styles (memoized)
  const containerStyles: React.CSSProperties = useMemo(
    () => ({
      ['--custom-bg-color' as any]: group.options.backgroundColor || '#ffffff',
      ['--custom-border' as any]: group.options.borderStyle === 'none' ? 'none' : `2px ${group.options.borderStyle || 'solid'} #e2e8f0`,
      ['--custom-header-color' as any]: group.options.headerColor || '#f8fafc',
      borderRadius: '12px',
      padding: '16px',
      position: 'relative',
      opacity: group.options.visible ? 1 : 0.3,
      transition: 'opacity 0.3s ease, background-color 0.3s ease, border 0.3s ease',
      minHeight: group.options.collapsed ? '60px' : `${group.minSize?.height || 200}px`,
      overflow: group.options.collapsed ? 'hidden' : 'visible',
    }),
    [group.options.backgroundColor, group.options.borderStyle, group.options.headerColor, group.options.visible, group.options.collapsed, group.minSize?.height],
  );

  // Optional debug: comment out noisy logs in production
  // useEffect(() => {
  //   console.log('Group styles updated:', { id: group.id, options: group.options });
  // }, [group.id, group.options]);

  // Hide-wrapper now only toggles header/visuals; positioning handled by parent

  return (
    <div ref={containerRef} className={`group-container custom-styled ${isEditMode ? 'edit-mode' : ''}`} style={containerStyles} data-group-id={group.id}>
      {/* Group Header */}
      <div
        className={`group-header flex items-center justify-between mb-4 ${
          theme === 'dark' ? 'bg-gray-800/80' : 'bg-white/80'
        } backdrop-blur-sm rounded-lg p-3 shadow-sm transition-colors duration-300`}
      >
        <div className="flex items-center space-x-3">
          <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'} transition-colors duration-300`}>
            {isEditMode ? (
              <input
                type="text"
                value={group.title}
                onChange={e => handleTitleChange(e.target.value)}
                className={`bg-transparent border-b outline-none transition-colors duration-300 ${
                  theme === 'dark' ? 'border-gray-600 text-gray-100' : 'border-gray-300 text-gray-800'
                }`}
                style={{
                  borderBottomColor: 'var(--color-border)',
                }}
                onFocus={e => {
                  e.target.style.borderBottomColor = 'var(--color-primary)';
                }}
                onBlur={e => {
                  e.target.style.borderBottomColor = 'var(--color-border)';
                }}
                placeholder="Group title"
              />
            ) : (
              group.title
            )}
          </h3>
          <span className={`text-sm ${theme === 'dark' ? 'text-gray-400 bg-gray-700' : 'text-gray-500 bg-gray-100'} px-2 py-1 rounded transition-colors duration-300`}>
            {groupComponents.length} components
          </span>
        </div>

        <div className="flex items-center space-x-2 group-options">
          {/* Collapse/Expand Button */}
          <button
            onClick={handleToggleCollapse}
            className={`p-2 ${
              theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            } rounded-lg transition-colors no-drag`}
            title={group.options.collapsed ? 'Expand group' : 'Collapse group'}
            aria-label={group.options.collapsed ? 'Expand group' : 'Collapse group'}
          >
            <svg className={`w-4 h-4 transition-transform ${group.options.collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Visibility Toggle */}
          <button
            onClick={handleToggleVisibility}
            className={`p-2 rounded-lg transition-colors no-drag ${
              group.options.visible
                ? theme === 'dark'
                  ? 'hover:bg-gray-700'
                  : 'hover:bg-blue-50'
                : theme === 'dark'
                ? 'text-gray-500 hover:text-gray-400 hover:bg-gray-700'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            style={
              group.options.visible
                ? {
                    color: 'var(--color-primary)',
                  }
                : {}
            }
            onMouseEnter={e => {
              if (group.options.visible) {
                e.currentTarget.style.color = 'var(--color-primary-dark)';
              }
            }}
            onMouseLeave={e => {
              if (group.options.visible) {
                e.currentTarget.style.color = 'var(--color-primary)';
              }
            }}
            title={group.options.visible ? 'Hide group' : 'Show group'}
            aria-pressed={group.options.visible}
            aria-label={group.options.visible ? 'Hide group' : 'Show group'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {group.options.visible ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                />
              )}
            </svg>
          </button>

          {/* Options Menu */}
          {isEditMode && (
            <div className="relative no-drag">
              <button
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowOptions(!showOptions);
                }}
                className={`p-2 ${
                  theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                } rounded-lg transition-colors no-drag`}
                title="Group options"
                aria-haspopup="menu"
                aria-expanded={showOptions}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>

              {showOptions && (
                <div
                  className={`absolute right-0 top-full mt-2 w-64 ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                  } rounded-lg shadow-lg border p-4 no-drag options-panel transition-colors duration-300`}
                  style={{ zIndex: 2000, position: 'absolute' }}
                  onMouseDown={e => {
                    e.stopPropagation();
                  }}
                  onPointerDown={e => {
                    e.stopPropagation();
                  }}
                  onClick={e => {
                    e.stopPropagation();
                  }}
                  role="menu"
                  aria-label="Group settings"
                >
                  {/* Border Style */}
                  <div className="mb-4">
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Border Style</label>
                    <div className="flex space-x-2">
                      {(['solid', 'dashed', 'none'] as const).map(style => (
                        <button
                          key={style}
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleBorderStyleChange(style);
                            console.log('Border style changed to:', style);
                          }}
                          className={`px-3 py-1 text-xs rounded border transition-colors ${
                            group.options.borderStyle === style
                              ? theme === 'dark'
                                ? 'text-gray-100 border-gray-500'
                                : 'text-gray-800 border-gray-400'
                              : theme === 'dark'
                              ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                          style={
                            group.options.borderStyle === style
                              ? {
                                  backgroundColor: 'var(--color-primary)',
                                  color: 'white',
                                  borderColor: 'var(--color-primary-dark)',
                                }
                              : {}
                          }
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
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Background Color</label>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {['transparent', '#ffffff', '#f8fafc', '#e2e8f0', '#cbd5e1', '#dbeafe', '#dcfce7', '#fef3c7', '#fed7d7'].map(color => (
                        <button
                          key={color}
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleBackgroundColorChange(color);
                            console.log('Background color changed to:', color);
                          }}
                          className={`w-8 h-8 rounded border-2 transition-all ${
                            group.options.backgroundColor === color ? 'border-blue-500 scale-110' : 'border-gray-200 hover:border-gray-400'
                          }`}
                          style={{
                            backgroundColor: color === 'transparent' ? 'transparent' : color,
                            backgroundImage:
                              color === 'transparent'
                                ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                                : 'none',
                            backgroundSize: color === 'transparent' ? '8px 8px' : 'auto',
                            backgroundPosition: color === 'transparent' ? '0 0, 0 4px, 4px -4px, -4px 0px' : 'auto',
                          }}
                          title={color === 'transparent' ? 'Transparent' : color}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={group.options.backgroundColor || '#ffffff'}
                      onChange={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleBackgroundColorChange(e.target.value);
                        console.log('Custom background color changed to:', e.target.value);
                      }}
                      className="w-full h-8 rounded border border-gray-200"
                      onClick={e => e.stopPropagation()}
                    />
                  </div>

                  {/* Header Color */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Header Color</label>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {['#f8fafc', '#ffffff', '#e2e8f0', '#cbd5e1', '#dbeafe', '#dcfce7', '#fef3c7', '#fed7d7'].map(color => (
                        <button
                          key={color}
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleHeaderColorChange(color);
                            console.log('Header color changed to:', color);
                          }}
                          className={`w-8 h-8 rounded border-2 transition-all ${
                            group.options.headerColor === color ? 'border-blue-500 scale-110' : 'border-gray-200 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={group.options.headerColor || '#f8fafc'}
                      onChange={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleHeaderColorChange(e.target.value);
                        console.log('Custom header color changed to:', e.target.value);
                      }}
                      className="w-full h-8 rounded border border-gray-200"
                      onClick={e => e.stopPropagation()}
                    />
                  </div>

                  {/* Hide Wrapper Toggle */}
                  <div className="mb-4">
                    <label className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Hide Wrapper</span>
                      <input
                        type="checkbox"
                        checked={group.options.hideWrapper || false}
                        onChange={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleHideWrapperChange(e.target.checked);
                          console.log('Hide wrapper changed to:', e.target.checked);
                        }}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        onClick={e => e.stopPropagation()}
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-1">Hide the group wrapper and show only components</p>
                  </div>

                  {/* Close button */}
                  <div className="flex justify-end">
                    <button
                      onClick={e => {
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

      {/* Group Content with nested GridStack */}
      {!group.options.collapsed && (
        <div className="group-content" style={{ minHeight: '120px' }}>
          <div className="grid-stack group-grid" ref={gridRef}>
            {groupComponents.map(comp => {
              const inner = (group.innerLayout || []).find(i => i.i === comp.id);
              const w = Math.max(4, inner?.w || 4);
              const h = Math.max(3, inner?.h || 3);
              const x = Math.max(0, inner?.x || 0);
              const y = Math.max(0, inner?.y || 0);
              const autoPos = x === 0 && y === 0;
              return (
                <div
                  key={comp.id}
                  className="grid-stack-item"
                  data-item-id={`comp:${comp.id}`}
                  gs-x={(!autoPos ? (x as any) : undefined) as any}
                  gs-y={(!autoPos ? (y as any) : undefined) as any}
                  gs-w={w as any}
                  gs-h={h as any}
                  gs-min-w={4 as any}
                  gs-min-h={3 as any}
                  gs-auto-position={autoPos ? 'true' : 'false'}
                >
                  <div className="grid-stack-item-content" style={{ minWidth: 300, minHeight: 150, position: 'relative' }}>
                    {/* Render actual card content inside group; drag-out is disabled to avoid DOM conflicts */}
                    {renderCard ? renderCard(comp) : null}
                    {isEditMode && (
                      <button
                        className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-white border text-gray-700 hover:bg-gray-50"
                        title="Ungroup (move to root)"
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Remove from this group
                          dispatch({ type: 'REMOVE_COMPONENT_FROM_GROUP', payload: { groupId: group.id, componentId: comp.id } });
                          // Also drop an innerLayout entry removal
                          const next = (group.innerLayout || []).filter(i => i.i !== comp.id);
                          dispatch({ type: 'UPDATE_GROUP_INNER_LAYOUT', payload: { groupId: group.id, layout: next } });
                          // Move to root with auto-position (x/y=0 => root will auto-place)
                          dispatch({
                            type: 'UPDATE_LAYOUT',
                            payload: {
                              id: comp.id,
                              layout: {
                                ...comp.layout,
                                x: 0,
                                y: 0,
                              },
                            },
                          });
                        }}
                      >
                        Ungroup
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {groupComponents.length === 0 && (
            <div className="flex items-center justify-center h-24 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg mt-2">
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
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            setShowOptions(false);
          }}
        />
      )}
    </div>
  );
}
