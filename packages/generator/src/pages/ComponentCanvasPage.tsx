import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { WoTComponent } from '../types';
import { useNavbar } from '../context/NavbarContext';
import ReactGridLayoutLib, { WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './rgl-overrides.css';

const ReactGridLayout = WidthProvider(ReactGridLayoutLib as unknown as React.ComponentType<any>);

// Basic grid constants
const COLS = 24;
const ROW_H = 70;
const MARGIN: [number, number] = [16, 16];
const PADDING: [number, number] = [16, 16];
const MIN_CARD_H = 120; // px minimum visual height for content zone
// const MIN_HIDE_CARD_H = 100; // px when header hidden (not used for minimal version)

// Minimal default sizes per component type (grid units)
const DEFAULT_SIZES: Record<string, { w: number; h: number; minW?: number; minH?: number }> = {
  'ui-button': { w: 4, h: 3, minW: 3, minH: 2 },
  'ui-toggle': { w: 4, h: 3, minW: 3, minH: 2 },
  'ui-slider': { w: 6, h: 3, minW: 5, minH: 3 },
  'ui-text': { w: 4, h: 3, minW: 3, minH: 2 },
  'ui-number-picker': { w: 4, h: 3, minW: 3, minH: 2 },
  'ui-calendar': { w: 6, h: 4, minW: 5, minH: 3 },
  'ui-checkbox': { w: 4, h: 3, minW: 3, minH: 2 },
};

export function ComponentCanvasPage() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const { setContent, clear } = useNavbar();

  // Local, minimal layout state for RGL (no persistence)
  const [layout, setLayout] = useState<Layout[]>([]);
  // Membership of cards to visual section (defaults to their TD id)
  const [membership, setMembership] = useState<Record<string, string | null>>({});
  // Hide state
  const [hiddenCards, setHiddenCards] = useState<Set<string>>(new Set());
  const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set());
  // Grid container width for computing section overlays
  const gridWrapRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Observe width to position section overlays
  useEffect(() => {
    if (!gridWrapRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setContainerWidth(e.contentRect.width);
      }
    });
    ro.observe(gridWrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Seed or update layout when components list changes
  useEffect(() => {
    setLayout(prev => {
      // Start from existing layout to preserve user positions
      const next: Layout[] = [...prev];
      const existingIds = new Set(next.map(l => l.i));

      // Compute baseline row (place new items on new rows below existing ones)
      const baseY = next.length > 0 ? next.reduce((m, l) => Math.max(m, l.y + l.h), 0) : 0;
      let cursorX = 0;
      let cursorY = baseY;
      let rowH = 0;

      const place = (w: number, h: number) => {
        if (cursorX + w > COLS) {
          cursorX = 0;
          cursorY += rowH;
          rowH = 0;
        }
        const pos = { x: cursorX, y: cursorY };
        cursorX += w;
        rowH = Math.max(rowH, h);
        return pos;
      };

      // Add any new components using simple row-wise placement
      for (const comp of state.components) {
        if (existingIds.has(comp.id)) continue;
        const def = DEFAULT_SIZES[comp.uiComponent] || { w: 4, h: 3 };
        const { x, y } = place(def.w, def.h);
        next.push({ i: comp.id, x, y, w: def.w, h: def.h, minW: def.minW, minH: def.minH });
      }

      // Remove stale entries
      for (let i = next.length - 1; i >= 0; i--) {
        if (!state.components.some(c => c.id === next[i].i)) next.splice(i, 1);
      }

      return next;
    });
    // Initialize membership defaults
    setMembership(prev => {
      const next: Record<string, string | null> = { ...prev };
      state.components.forEach(c => {
        if (next[c.id] === undefined) next[c.id] = c.tdId || null;
      });
      // drop missing
      Object.keys(next).forEach(k => {
        if (!state.components.some(c => c.id === k)) delete next[k];
      });
      return next;
    });
  }, [state.components]);

  const tdSummary = useMemo(() => {
    const tdCount = state.tdInfos.length;
    const compCount = state.components.length;
    const tdText = tdCount > 0 ? `${tdCount} TD${tdCount > 1 ? 's' : ''} loaded` : 'No TD loaded';
    return `DASHBOARD – ${tdText}, ${compCount} components`;
  }, [state.tdInfos.length, state.components.length]);

  // Minimal navbar content
  useEffect(() => {
    setContent({
      info: <span>{tdSummary}</span>,
      actions: (
        <div className="flex items-center gap-2">
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
        </div>
      ),
    });
    return () => clear();
  }, [tdSummary, navigate, dispatch, setContent, clear]);
  // Helpers to compute pixel positions from grid units
  const colWidth = useMemo(() => {
    if (!containerWidth) return 0;
    const totalMargins = MARGIN[0] * (COLS - 1);
    const totalPadding = PADDING[0] * 2;
    return (containerWidth - totalMargins - totalPadding) / COLS;
  }, [containerWidth]);

  const unitToPx = useCallback(
    (x: number, y: number, w: number, h: number) => {
      const left = PADDING[0] + x * (colWidth + MARGIN[0]);
      const top = PADDING[1] + y * (ROW_H + MARGIN[1]);
      const width = w * colWidth + (w - 1) * MARGIN[0];
      const height = h * ROW_H + (h - 1) * MARGIN[1];
      return { left, top, width, height };
    },
    [colWidth],
  );

  // Compute per-TD section boxes in grid units
  const sectionBoxes = useMemo(() => {
    const byTd: Record<string, { minX: number; minY: number; maxX: number; maxY: number }> = {};
    const byTdItems: Record<string, Layout[]> = {};
    const visibleLayout = layout.filter(l => {
      if (hiddenCards.has(l.i)) return false;
      if (membership[l.i] === null) return false;
      // Skip items without resolved positions yet
      if (!Number.isFinite(l.x) || !Number.isFinite(l.y) || !Number.isFinite(l.w) || !Number.isFinite(l.h)) return false;
      return true;
    });
    visibleLayout.forEach(l => {
      const comp = state.components.find(c => c.id === l.i);
      if (!comp) return;
      const sec = membership[l.i] || comp.tdId;
      if (!sec) return;
      if (!byTd[sec]) {
        byTd[sec] = { minX: l.x, minY: l.y, maxX: l.x + l.w, maxY: l.y + l.h };
        byTdItems[sec] = [l];
      } else {
        byTd[sec].minX = Math.min(byTd[sec].minX, l.x);
        byTd[sec].minY = Math.min(byTd[sec].minY, l.y);
        byTd[sec].maxX = Math.max(byTd[sec].maxX, l.x + l.w);
        byTd[sec].maxY = Math.max(byTd[sec].maxY, l.y + l.h);
        byTdItems[sec].push(l);
      }
    });
    return { byTd, byTdItems };
  }, [layout, membership, hiddenCards, state.components]);

  // SECTION DRAG: allow dragging the whole section box to move all child items together
  const sectionDragRef = useRef<{
    tdId: string;
    startX: number;
    startY: number;
    // Snapshot of original positions for members
    original: Map<string, { x: number; y: number; w: number }>;
    lastDx: number;
    lastDy: number;
  } | null>(null);

  const onSectionMouseDown = useCallback(
    (tdId: string, e: React.MouseEvent<HTMLDivElement>) => {
      if (colWidth === 0) return;
      e.preventDefault();
      e.stopPropagation();
      // Collect members
      const members = layout.filter(l => (membership[l.i] ?? state.components.find(c => c.id === l.i)?.tdId) === tdId);
      const original = new Map<string, { x: number; y: number; w: number }>();
      members.forEach(m => original.set(m.i, { x: m.x, y: m.y, w: m.w }));
      sectionDragRef.current = {
        tdId,
        startX: e.clientX,
        startY: e.clientY,
        original,
        lastDx: 0,
        lastDy: 0,
      };

      const handleMove = (ev: MouseEvent) => {
        const data = sectionDragRef.current;
        if (!data) return;
        const dxPx = ev.clientX - data.startX;
        const dyPx = ev.clientY - data.startY;
        const cellW = colWidth + MARGIN[0];
        const cellH = ROW_H + MARGIN[1];
        const dx = Math.round(dxPx / cellW);
        const dy = Math.round(dyPx / cellH);
        if (dx === data.lastDx && dy === data.lastDy) return;
        data.lastDx = dx;
        data.lastDy = dy;
        // Move all member items by dx,dy
        setLayout(prev =>
          prev.map(it => {
            if (!data.original.has(it.i)) return it;
            const base = data.original.get(it.i)!;
            const nextX = Math.max(0, Math.min(COLS - base.w, base.x + dx));
            const nextY = Math.max(0, base.y + dy);
            return { ...it, x: nextX, y: nextY };
          }),
        );
      };
      const handleUp = () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
        sectionDragRef.current = null;
      };
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    },
    [layout, membership, state.components, colWidth],
  );

  // Layout change handlers
  const handleLayoutChange = (next: Layout[]) => {
    setLayout(next);
  };

  const handleDragStop = (_layout: Layout[], item: Layout) => {
    // If the item belongs to a section, drop out when it exits the bounding box of remaining items
    const comp = state.components.find(c => c.id === item.i);
    if (!comp) return;
    const currentSec = membership[item.i] ?? comp.tdId ?? null;
    if (!currentSec) return;
    // Compute bounding box of other items in same section
    const others = layout.filter(l => l.i !== item.i && (membership[l.i] ?? state.components.find(c => c.id === l.i)?.tdId) === currentSec);
    if (others.length === 0) return; // nothing to compare
    const box = others.reduce(
      (acc, l) => ({ minX: Math.min(acc.minX, l.x), minY: Math.min(acc.minY, l.y), maxX: Math.max(acc.maxX, l.x + l.w), maxY: Math.max(acc.maxY, l.y + l.h) }),
      { minX: others[0].x, minY: others[0].y, maxX: others[0].x + others[0].w, maxY: others[0].y + others[0].h },
    );
    const itemCenter = { x: item.x + item.w / 2, y: item.y + item.h / 2 };
    const inside = itemCenter.x >= box.minX && itemCenter.x <= box.maxX && itemCenter.y >= box.minY && itemCenter.y <= box.maxY;
    if (!inside) {
      setMembership(prev => ({ ...prev, [item.i]: null }));
    }
  };

  const toggleCardHidden = (id: string) => {
    setHiddenCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSectionHidden = (tdId: string) => {
    setHiddenSections(prev => {
      const next = new Set(prev);
      if (next.has(tdId)) next.delete(tdId);
      else next.add(tdId);
      return next;
    });
  };

  const removeComponent = (id: string) => {
    dispatch({ type: 'REMOVE_COMPONENT', payload: id });
  };

  // Simple card content mounting for custom elements
  function CardContent({ component }: { component: WoTComponent }) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
      const elHost = hostRef.current;
      if (!elHost) return;
      elHost.innerHTML = '';
      try {
        const element = document.createElement(component.uiComponent);
        element.setAttribute('variant', component.variant || 'minimal');
        element.setAttribute('label', component.title);
        element.setAttribute('color', 'primary');
        elHost.appendChild(element);
      } catch (e) {
        const fallback = document.createElement('div');
        fallback.className = 'p-4 bg-gray-100 rounded border-2 border-dashed border-gray-300 text-center text-gray-500';
        fallback.innerHTML = `<div class="text-sm font-medium">${component.title}</div><div class="text-xs mt-1">${component.uiComponent}</div>`;
        elHost.appendChild(fallback);
      }
      return () => {
        if (elHost) elHost.innerHTML = '';
      };
    }, [component.id, component.title, component.uiComponent, component.variant]);
    return <div ref={hostRef} style={{ width: '100%', height: '100%' }} />;
  }

  return (
    <div className="min-h-screen bg-neutral-light">
      <div className="w-full transition-all duration-200" style={{ minHeight: 'calc(100vh - var(--navbar-height))' }}>
        <div className="page-container canvas-page py-2" style={{ minHeight: 'inherit' }}>
          {state.components.length > 0 ? (
            <div className="relative w-full bg-white border border-gray-200 rounded-lg overflow-hidden" style={{ minHeight: 'calc(100vh - var(--navbar-height) - 1rem)' }}>
              {/* Section overlays (non-interactive dashed boxes) */}
              <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
                {Object.entries(sectionBoxes.byTd).map(([tdId, box]) => {
                  if (hiddenSections.has(tdId)) return null;
                  if (colWidth === 0) return null;
                  const { left, top, width, height } = unitToPx(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
                  return <div key={tdId} style={{ position: 'absolute', left, top, width, height, border: '2px dashed #cbd5e1', borderRadius: 12, background: 'transparent' }} />;
                })}
              </div>

              {/* Section drag bars (interactive, small hit area) */}
              {Object.entries(sectionBoxes.byTd).map(([tdId, box]) => {
                if (hiddenSections.has(tdId)) return null;
                if (colWidth === 0) return null;
                const { left, top, width } = unitToPx(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
                const tdInfo = state.tdInfos.find(t => t.id === tdId);
                return (
                  <div
                    key={`bar-${tdId}`}
                    className="section-drag-bar"
                    style={{
                      position: 'absolute',
                      left,
                      top: Math.max(0, top - 24),
                      width,
                      height: 24,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '0 12px',
                      cursor: 'move',
                    }}
                    onMouseDown={e => onSectionMouseDown(tdId, e)}
                  >
                    <span className="px-2 py-0.5 bg-white/90 text-primary text-xs font-heading rounded shadow border border-primary/30">{tdInfo?.title || 'Section'}</span>
                    <button
                      className="text-xs px-2 py-0.5 rounded bg-white border text-blue-600 hover:bg-blue-50 rgl-no-drag"
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleSectionHidden(tdId);
                      }}
                    >
                      Hide
                    </button>
                  </div>
                );
              })}

              {/* Grid */}
              <div ref={gridWrapRef} className="p-2">
                <ReactGridLayout
                  cols={COLS}
                  rowHeight={ROW_H}
                  margin={MARGIN}
                  containerPadding={PADDING}
                  compactType="vertical"
                  isResizable
                  isDraggable
                  preventCollision={false}
                  autoSize
                  useCSSTransforms
                  draggableCancel=".rgl-no-drag"
                  layout={layout.filter(l => !hiddenCards.has(l.i) && !(membership[l.i] && hiddenSections.has(membership[l.i]!)))}
                  onLayoutChange={handleLayoutChange}
                  onDragStop={handleDragStop}
                >
                  {layout
                    .filter(l => !hiddenCards.has(l.i) && !(membership[l.i] && hiddenSections.has(membership[l.i]!)))
                    .map(l => {
                      const comp = state.components.find(c => c.id === l.i);
                      if (!comp) return null;
                      return (
                        <div key={l.i} className="rgl-card">
                          <div className="bg-white rounded-lg shadow-sm border border-primary overflow-hidden relative group w-full h-full">
                            <div className="bg-neutral-light px-3 h-9 flex items-center justify-between border-b border-primary">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-heading font-medium text-primary truncate">{comp.title}</span>
                                <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded">{comp.type}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  className="text-xs px-2 py-1 rounded bg-white border text-gray-700 hover:bg-gray-50 rgl-no-drag"
                                  onClick={e => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleCardHidden(comp.id);
                                  }}
                                >
                                  {hiddenCards.has(comp.id) ? 'Show' : 'Hide'}
                                </button>
                                <button
                                  className="text-xs px-2 py-1 rounded bg-white border text-red-600 hover:bg-red-50 rgl-no-drag"
                                  onClick={e => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    removeComponent(comp.id);
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                            <div className="relative" style={{ width: '100%', height: 'calc(100% - 36px)', minHeight: MIN_CARD_H - 36 }}>
                              <CardContent component={comp} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </ReactGridLayout>
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
    </div>
  );
}
