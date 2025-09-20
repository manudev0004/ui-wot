import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { wotService } from '../services/wotService';
import { GridStack } from 'gridstack';
import 'gridstack/dist/dd-gridstack';
import 'gridstack/dist/gridstack.min.css';
import { useAppContext } from '../context/AppContext';
import { WoTComponent } from '../types';
import { GroupContainer } from '../components/GroupContainer';
import { SmartEditPopup } from '../components/SmartEditPopup';
import { useNavbar } from '../context/NavbarContext';

// Utility to interpret existing grid-ish numbers as pixels for display
const toPx = (n: number, scale: number) => (n > 40 ? n : Math.round(n * scale));
const layoutToRect = (layout: { x: number; y: number; w: number; h: number }) => ({
  x: toPx(layout.x, 32),
  y: toPx(layout.y, 32),
  w: toPx(layout.w, 90),
  h: toPx(layout.h, 70),
});

// Tile sizes for GridStack units
const TILE_W = 90;
const TILE_H = 70;
const MIN_CARD_H = 120; // header + minimal content
const MIN_HIDE_CARD_H = 100;
// Note: snapping handled by GridStack

// gridToAbs no longer used in GridStack phase

// absToGrid no longer used with GridStack-managed positions

export function ComponentCanvasPage() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const { setContent, clear } = useNavbar();
  const [editingComponent, setEditingComponent] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  // GridStack based dragging will be handled via events
  // Grid snapping
  const [snapEnabled, setSnapEnabled] = useState(true);
  // attributes state for the currently editing component
  const [attributesList, setAttributesList] = useState<string[]>([]);
  const [attributesValues, setAttributesValues] = useState<Record<string, string>>({});
  const [attributesTypes, setAttributesTypes] = useState<Record<string, 'string' | 'number' | 'boolean'>>({});

  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('My Dashboard');
  const [saveDescription, setSaveDescription] = useState('');

  const handleSaveDashboard = () => {
    try {
      const data = {
        name: saveName,
        description: saveDescription,
        components: state.components,
        groups: state.groups,
        tdInfos: state.tdInfos,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${saveName.replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export dashboard', e);
    }
    setShowSaveModal(false);
  };

  // Initialize GridStack on root grid and wire change events
  const gridRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!gridRef.current) return;
    const grid = GridStack.init(
      {
        column: 24,
        cellHeight: TILE_H,
        margin: 20,
        acceptWidgets: false,
        disableResize: !isEditMode,
        disableDrag: !isEditMode,
        float: false,
      },
      gridRef.current,
    );

    // Compact layout after initial render to avoid overlaps
    requestAnimationFrame(() => {
      try {
        grid.compact();
      } catch {}
    });

    const onChange = (_: any, items: any[]) => {
      if (!items) return;
      items.forEach(it => {
        const el = it.el as HTMLElement | null;
        if (!el) return;
        const itemId = el.getAttribute('data-item-id') || '';
        if (!itemId) return;
        const [kind, rawId] = itemId.split(':');
        if (!rawId) return;
        const rect = { x: it.x * TILE_W, y: it.y * TILE_H, w: it.w * TILE_W, h: it.h * TILE_H };
        if (kind === 'comp') {
          const comp = state.components.find(c => c.id === rawId);
          if (comp) {
            dispatch({ type: 'UPDATE_LAYOUT', payload: { id: comp.id, layout: { ...comp.layout, ...rect } } });
          }
        } else if (kind === 'group') {
          const group = state.groups.find(g => g.id === rawId);
          if (group) {
            dispatch({ type: 'UPDATE_GROUP', payload: { id: group.id, updates: { layout: { ...group.layout, ...rect } } } });
          }
        }
      });
    };

    const onAdded = (_: any, items: any[]) => {
      if (!items) return;
      items.forEach(it => {
        const el = it.el as HTMLElement | null;
        if (!el) return;
        const itemId = el.getAttribute('data-item-id') || '';
        if (!itemId) return;
        const [kind, rawId] = itemId.split(':');
        if (kind !== 'comp' || !rawId) return;
        // Ensure component is not in any group now
        const currentGroup = state.groups.find(g => g.affordanceIds.includes(rawId));
        if (currentGroup) {
          dispatch({ type: 'REMOVE_COMPONENT_FROM_GROUP', payload: { groupId: currentGroup.id, componentId: rawId } });
        }
      });
    };

    grid.on('change', onChange);
    grid.on('added', onAdded);

    return () => {
      grid.off('change');
      grid.off('added');
      grid.destroy(false);
    };
  }, [dispatch, isEditMode, state.components, state.groups]);

  const handleComponentEdit = (componentId: string) => {
    console.log('[ComponentCanvas] handleComponentEdit called for', componentId, { isEditMode, editingComponent });
    const nextId = editingComponent === componentId ? null : componentId;
    if (!isEditMode) {
      setIsEditMode(true);
    }
    if (nextId) {
      populateAttributes(componentId);
    }
    setEditingComponent(nextId);
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
      if (!comp) {
        console.warn('[ComponentCanvas] Component not found in state for id:', componentId);
        return;
      }

      // look for the custom element inside the wrapper
      let el: HTMLElement | null = null;
      if (wrapper) {
        el = wrapper.querySelector(comp.uiComponent) as HTMLElement | null;
      } else {
        // fallback: search document for first matching tag
        el = document.querySelector(comp.uiComponent) as HTMLElement | null;
      }

      if (!el) {
        console.warn('[ComponentCanvas] Element not found for component:', comp.uiComponent, 'in component:', componentId);
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

      console.log('[ComponentCanvas] Populating attributes for', componentId, 'with attributes:', attrs);

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

      console.log('[ComponentCanvas] Populated values:', vals);

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
        label: 'string',
        color: 'string',
        disabled: 'boolean',
        dark: 'boolean',
        readonly: 'boolean',
        keyboard: 'boolean',
        showLastUpdated: 'boolean',
      },
      'ui-toggle': {
        value: 'boolean',
        label: 'string',
        color: 'string',
        disabled: 'boolean',
        dark: 'boolean',
        readonly: 'boolean',
        keyboard: 'boolean',
        showLastUpdated: 'boolean',
      },
      'ui-slider': {
        value: 'number',
        min: 'number',
        max: 'number',
        step: 'number',
        label: 'string',
        color: 'string',
        disabled: 'boolean',
        dark: 'boolean',
        readonly: 'boolean',
        keyboard: 'boolean',
        showLastUpdated: 'boolean',
        orientation: 'string',
        thumbShape: 'string',
        enableManualControl: 'boolean',
      },
      'ui-text': {
        value: 'string',
        placeholder: 'string',
        label: 'string',
        color: 'string',
        disabled: 'boolean',
        dark: 'boolean',
        readonly: 'boolean',
        keyboard: 'boolean',
        showLastUpdated: 'boolean',
      },
      'ui-number-picker': {
        value: 'number',
        min: 'number',
        max: 'number',
        step: 'number',
        label: 'string',
        color: 'string',
        disabled: 'boolean',
        dark: 'boolean',
        readonly: 'boolean',
        keyboard: 'boolean',
        showLastUpdated: 'boolean',
      },
      'ui-calendar': {
        value: 'string',
        label: 'string',
        color: 'string',
        disabled: 'boolean',
        dark: 'boolean',
        readonly: 'boolean',
        keyboard: 'boolean',
        showLastUpdated: 'boolean',
      },
      'ui-checkbox': {
        value: 'boolean',
        label: 'string',
        color: 'string',
        disabled: 'boolean',
        dark: 'boolean',
        readonly: 'boolean',
        keyboard: 'boolean',
        showLastUpdated: 'boolean',
      },
    };

    return attributeMap[componentType] || {};
  };

  const applyAttributeChange = (componentId: string, name: string, value: string) => {
    if (!isEditMode) return; // block edits when not in edit mode

    // update local state
    setAttributesValues(prev => ({ ...prev, [name]: value }));

    // find the element within this card wrapper and apply attribute
    const comp = state.components.find(c => c.id === componentId);
    if (!comp) {
      console.warn('[ComponentCanvas] Component not found for id:', componentId);
      return;
    }

    // Try multiple ways to find the element
    let el: HTMLElement | null = null;

    // First, try to find by wrapper with data-component-id
    const wrapper = document.querySelector(`[data-component-id="${componentId}"]`);
    if (wrapper) {
      el = wrapper.querySelector(comp.uiComponent) as HTMLElement | null;
    }

    // If not found, try direct query
    if (!el) {
      el = document.querySelector(comp.uiComponent) as HTMLElement | null;
    }

    if (!el) {
      console.warn('[ComponentCanvas] Element not found for component:', comp.uiComponent, 'in component:', componentId);
      return;
    }

    console.log('[ComponentCanvas] Applying attribute change:', { componentId, name, value, elementFound: !!el });

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

    // Force a re-render or update of the element if needed
    if (name === 'variant') {
      // Dispatch a custom event to notify the component of variant change
      el.dispatchEvent(new CustomEvent('variant-changed', { detail: { variant: value } }));
    }
  };

  const tdSummary = useMemo(() => {
    const tdCount = state.tdInfos.length;
    const compCount = state.components.length;
    const tdText = tdCount > 0 ? `${tdCount} TD${tdCount > 1 ? 's' : ''} loaded` : 'No TD loaded';
    return `DASHBOARD – ${tdText}, ${compCount} components`;
  }, [state.tdInfos.length, state.components.length]);

  useEffect(() => {
    setContent({
      info: <span>{tdSummary}</span>,
      actions: (
        <>
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 text-sm text-primary">
              <input type="checkbox" checked={snapEnabled} onChange={e => setSnapEnabled(e.target.checked)} />
              <span>Snap to grid</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <label className="font-heading text-primary" style={{ fontSize: 'var(--font-size-sm)' }}>
              Edit Mode:
            </label>
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
            <span className="text-primary/30">|</span>

            <button onClick={() => navigate('/td-input')} className="bg-accent hover:bg-accent-light text-white font-heading font-medium py-1.5 px-3 rounded-lg transition-colors">
              Add TD
            </button>
            <button
              onClick={() => {
                dispatch({ type: 'RESET_STATE' });
                navigate('/');
              }}
              className="bg-primary hover:bg-primary-light text-white font-heading font-medium py-1.5 px-3 rounded-lg transition-colors"
            >
              New
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              disabled={state.components.length === 0}
              className="bg-primary hover:bg-primary-light disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-heading font-medium py-1.5 px-3 rounded-lg transition-colors"
              title={state.components.length === 0 ? 'Add components to save dashboard' : 'Save current dashboard'}
            >
              Save
            </button>
          </div>
        </>
      ),
    });
    return () => clear();
  }, [tdSummary, isEditMode, state.components.length, navigate, dispatch, setContent, clear]);

  const renderComponent = (component: WoTComponent) => {
    const isEditing = editingComponent === component.id;
    const affordance = state.availableAffordances.find(a => a.key === component.affordanceKey);

    // Common component creation function
    const createComponentElement = (el: HTMLElement | null) => {
      if (el && !isEditing) {
        el.innerHTML = '';

        try {
          const element = document.createElement(component.uiComponent);

          // Prevent CSS @import errors by disabling adoptedStyleSheets
          if (element.shadowRoot) {
            try {
              element.shadowRoot.adoptedStyleSheets = [];
            } catch (e) {
              // Ignore if not supported
            }
          }

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

    // Inner content for the card
    const CardInner = (
      <div
        key={component.layout.i}
        data-component-id={component.id}
        className={
          component.hideCard ? 'relative w-full h-full component-drag-handle' : 'bg-white rounded-lg shadow-sm border border-primary overflow-hidden relative group w-full h-full'
        }
        onClick={e => {
          if (isEditMode) {
            e.stopPropagation();
            handleComponentEdit(component.id);
          }
        }}
        style={{ zIndex: isEditing ? 1000 : 1 }}
      >
        {!component.hideCard && (
          <div
            className="bg-neutral-light px-3 h-9 flex items-center justify-between border-b border-primary component-drag-handle"
            style={{ cursor: isEditMode ? 'move' : 'default' }}
          >
            <div className="flex items-center space-x-2 flex-1">
              <span className="text-sm font-heading font-medium text-primary truncate">{component.title}</span>
              <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded">{component.type}</span>
            </div>
            {isEditMode && (
              <div className="flex items-center space-x-1 relative no-drag edit-controls" style={{ zIndex: 2000 }}>
                <button
                  type="button"
                  onClick={e => {
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
                  onClick={e => {
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
        )}
        <div
          className="relative no-drag"
          style={{ width: '100%', height: component.hideCard ? '100%' : 'calc(100% - 36px)', minHeight: component.hideCard ? MIN_HIDE_CARD_H : MIN_CARD_H - 36 }}
        >
          <div ref={createComponentElement} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
        </div>
      </div>
    );

    return CardInner;
  };

  return (
    <div className="min-h-screen bg-neutral-light">
      {/* Canvas - No sidebar padding needed anymore */}
      <div className="w-full transition-all duration-200" style={{ minHeight: 'calc(100vh - var(--navbar-height))' }}>
        <div className="page-container canvas-page py-1" style={{ minHeight: 'inherit' }}>
          {state.groups.length > 0 || state.components.length > 0 ? (
            <div className="relative w-full bg-white border border-gray-200 rounded-lg overflow-hidden" style={{ minHeight: 'calc(100vh - var(--navbar-height) - 1rem)' }}>
              <div className="grid-stack p-2" ref={gridRef}>
                {state.groups.map(group => {
                  const rect = layoutToRect(group.layout);
                  const wUnitsRaw = Math.max(4, Math.round(rect.w / TILE_W));
                  const hUnitsRaw = Math.max(2, Math.round(rect.h / TILE_H));
                  const xUnits = Math.max(0, Math.round(rect.x / TILE_W));
                  const yUnits = Math.max(0, Math.round(rect.y / TILE_H));
                  const autoPos = xUnits === 0 && yUnits === 0;
                  // Compute group min size from innerLayout extents
                  const inner = group.innerLayout || [];
                  const maxX = inner.reduce((m, i) => Math.max(m, (i.x || 0) + (i.w || 1)), 0);
                  const maxY = inner.reduce((m, i) => Math.max(m, (i.y || 0) + (i.h || 1)), 0);
                  const minWUnits = Math.max(6, maxX);
                  const minHUnits = Math.max(4, maxY + 2);
                  const wUnits = Math.max(wUnitsRaw, minWUnits);
                  const hUnits = Math.max(hUnitsRaw, minHUnits);
                  const groupChildren = state.components.filter(c => group.affordanceIds.includes(c.id));
                  return (
                    <div
                      key={group.id}
                      className="grid-stack-item"
                      data-item-id={`group:${group.id}`}
                      gs-x={(!autoPos ? (xUnits as any) : undefined) as any}
                      gs-y={(!autoPos ? (yUnits as any) : undefined) as any}
                      gs-w={wUnits as any}
                      gs-h={hUnits as any}
                      gs-min-w={minWUnits as any}
                      gs-min-h={minHUnits as any}
                      gs-auto-position={autoPos ? 'true' : 'false'}
                    >
                      <div className="grid-stack-item-content">
                        <GroupContainer group={group} components={groupChildren} isEditMode={isEditMode} renderCard={renderComponent} />
                      </div>
                    </div>
                  );
                })}
                {state.components
                  .filter(c => !state.groups.some(g => g.affordanceIds.includes(c.id)))
                  .map(component => {
                    // ensure a reasonable default size for visibility
                    const base = layoutToRect(component.layout);
                    const rect = {
                      w: Math.max(base.w || 360, 360),
                      h: Math.max(base.h || 180, 180),
                      x: base.x || 0,
                      y: base.y || 0,
                    };
                    const wUnits = Math.max(4, Math.round(rect.w / TILE_W));
                    const hUnits = Math.max(3, Math.round(rect.h / TILE_H));
                    const xUnits = Math.max(0, Math.round(rect.x / TILE_W));
                    const yUnits = Math.max(0, Math.round(rect.y / TILE_H));
                    const autoPos = xUnits === 0 && yUnits === 0;
                    return (
                      <div
                        key={component.id}
                        className="grid-stack-item"
                        data-item-id={`comp:${component.id}`}
                        gs-x={(!autoPos ? (xUnits as any) : undefined) as any}
                        gs-y={(!autoPos ? (yUnits as any) : undefined) as any}
                        gs-w={wUnits as any}
                        gs-h={hUnits as any}
                        gs-min-w={4 as any}
                        gs-min-h={3 as any}
                        gs-auto-position={autoPos ? 'true' : 'false'}
                      >
                        <div className="grid-stack-item-content" style={{ minWidth: 360, minHeight: 180 }}>
                          {renderComponent(component)}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
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
                    onClick={() => navigate('/affordances')}
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

      {/* Smart Edit Popup */}
      {editingComponent &&
        isEditMode &&
        (() => {
          const comp = state.components.find(c => c.id === editingComponent);
          if (!comp) return null;
          const afford = state.availableAffordances.find(a => a.key === comp.affordanceKey);
          return (
            <SmartEditPopup
              component={comp}
              affordance={afford}
              onClose={() => setEditingComponent(null)}
              attributesList={attributesList}
              attributesValues={attributesValues}
              attributesTypes={attributesTypes}
              onAttributeChange={applyAttributeChange}
              onVariantChange={handleVariantChange}
              onComponentClose={handleComponentClose}
            />
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
                <button onClick={handleSaveDashboard} className="px-4 py-2 bg-primary hover:bg-primary-light text-white font-heading font-medium rounded-lg transition-colors">
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
