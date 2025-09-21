import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { WoTComponent } from '../types';
import { useNavbar } from '../context/NavbarContext';
import ReactGridLayoutLib, { WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './rgl-overrides.css';
import { SmartEditPopup } from '../components/SmartEditPopup';

const ReactGridLayout = WidthProvider(ReactGridLayoutLib as unknown as React.ComponentType<any>);

// Basic grid constants
const COLS = 24;
const ROW_H = 56; // smaller row height for tighter fit
const MARGIN: [number, number] = [12, 12];
const PADDING: [number, number] = [12, 12];
const MIN_CARD_H = 88; // smaller minimum visual height
// const MIN_HIDE_CARD_H = 100; // px when header hidden (not used for minimal version)

// Minimal default sizes per component type (grid units)
const DEFAULT_SIZES: Record<string, { w: number; h: number; minW?: number; minH?: number }> = {
  'ui-button': { w: 3, h: 2, minW: 2, minH: 1 },
  'ui-toggle': { w: 3, h: 2, minW: 2, minH: 2 },
  'ui-slider': { w: 5, h: 2, minW: 4, minH: 2 },
  'ui-text': { w: 3, h: 2, minW: 2, minH: 2 },
  'ui-number-picker': { w: 3, h: 2, minW: 2, minH: 2 },
  'ui-calendar': { w: 5, h: 3, minW: 4, minH: 3 },
  'ui-checkbox': { w: 3, h: 2, minW: 2, minH: 2 },
  'ui-event': { w: 3.5, h: 3.5, minW: 2, minH: 2.6 },
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
  const [hiddenCards, _setHiddenCards] = useState<Set<string>>(new Set());
  const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set());
  const [sectionTitles, setSectionTitles] = useState<Record<string, string>>({});
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editComponentId, setEditComponentId] = useState<string | null>(null);
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

  // Initialize or sync section titles from TD infos
  useEffect(() => {
    setSectionTitles(prev => {
      const next = { ...prev } as Record<string, string>;
      state.tdInfos.forEach(td => {
        if (!next[td.id]) next[td.id] = td.title || 'Section';
      });
      // Remove titles for TDs no longer present
      Object.keys(next).forEach(k => {
        if (!state.tdInfos.some(td => td.id === k)) delete next[k];
      });
      return next;
    });
  }, [state.tdInfos]);

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

  // SECTION RESIZE: bottom-right handle to resize width; children reflow to fill
  const sectionResizeRef = useRef<{
    tdId: string;
    startX: number;
    startY: number;
    startBox: { minX: number; minY: number; width: number; height: number };
    // snapshot order for stable packing
    itemOrder: string[];
  } | null>(null);

  const reflowSectionItems = useCallback(
    (tdId: string, minX: number, minY: number, targetW: number) => {
      if (targetW < 1) targetW = 1;
      // Collect visible items in this section
      const items = layout.filter(it => (membership[it.i] ?? state.components.find(c => c.id === it.i)?.tdId) === tdId && !hiddenCards.has(it.i)).map(it => ({ ...it }));
      if (items.length === 0) return;

      // Stable order by current (y,x)
      items.sort((a, b) => a.y - b.y || a.x - b.x);

      let cursorX = 0;
      let cursorY = 0;
      let rowMaxH = 0;

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        // Keep child width fixed; do not resize items during section resize
        const w = it.w;

        // next row if doesn't fit
        if (cursorX + w > targetW && cursorX > 0) {
          cursorX = 0;
          cursorY += rowMaxH;
          rowMaxH = 0;
        }

        // place
        it.x = minX + cursorX;
        it.y = minY + cursorY;
        it.w = w;
        cursorX += it.w;
        rowMaxH = Math.max(rowMaxH, it.h);
      }

      // Apply back to main layout
      setLayout(prev => {
        const next = prev.map(it => {
          const found = items.find(x => x.i === it.i);
          return found ? { ...it, x: found.x, y: found.y, w: found.w } : it;
        });
        return next;
      });
    },
    [layout, membership, state.components, hiddenCards],
  );

  const onSectionResizeMouseDown = useCallback(
    (tdId: string, box: { minX: number; minY: number; maxX: number; maxY: number }, e: React.MouseEvent<HTMLDivElement>) => {
      if (colWidth === 0) return;
      e.preventDefault();
      e.stopPropagation();
      // Determine the minimum allowed width so we don't force-resize children
      const sectionItems = layout.filter(it => (membership[it.i] ?? state.components.find(c => c.id === it.i)?.tdId) === tdId && !hiddenCards.has(it.i));
      const minAllowedW = sectionItems.length > 0 ? Math.max(...sectionItems.map(it => it.w)) : 1;
      sectionResizeRef.current = {
        tdId,
        startX: e.clientX,
        startY: e.clientY,
        startBox: { minX: box.minX, minY: box.minY, width: box.maxX - box.minX, height: box.maxY - box.minY },
        itemOrder: [],
      };

      const handleMove = (ev: MouseEvent) => {
        const data = sectionResizeRef.current;
        if (!data) return;
        const dxPx = ev.clientX - data.startX;
        const cellW = colWidth + MARGIN[0];
        let dCols = Math.round(dxPx / cellW);
        // Calculate target width, clamp within grid
        let targetW = Math.max(minAllowedW, Math.min(COLS - data.startBox.minX, data.startBox.width + dCols));
        reflowSectionItems(tdId, data.startBox.minX, data.startBox.minY, targetW);
      };
      const handleUp = () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
        sectionResizeRef.current = null;
      };
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    },
    [colWidth, reflowSectionItems],
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

  // Card-level hide control removed from UI; keep hiddenCards support if needed later

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
    if (editComponentId === id) setEditComponentId(null);
  };

  const deleteSectionWithChildren = (tdId: string) => {
    // Remove only components currently in this section (membership === tdId)
    const idsToRemove = layout
      .filter(l => (membership[l.i] ?? state.components.find(c => c.id === l.i)?.tdId) === tdId)
      .map(l => l.i);
    idsToRemove.forEach(id => dispatch({ type: 'REMOVE_COMPONENT', payload: id }));
    // Clean up local state
    setMembership(prev => {
      const next = { ...prev };
      idsToRemove.forEach(id => delete next[id]);
      return next;
    });
    setHiddenSections(prev => {
      const next = new Set(prev);
      next.delete(tdId);
      return next;
    });
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
              {/* Section overlays (non-interactive dashed boxes with draggable edges) */}
              <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
                {Object.entries(sectionBoxes.byTd).map(([tdId, box]) => {
                  if (hiddenSections.has(tdId)) return null;
                  if (colWidth === 0) return null;
                  const { left, top, width, height } = unitToPx(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
                  return (
                    <div key={tdId} style={{ position: 'absolute', left, top, width, height, border: '2px dashed #cbd5e1', borderRadius: 12, background: 'transparent' }}>
                      {/* Interactive resize handle (bottom-right) */}
                      <div
                        className="section-resize-handle"
                        style={{
                          position: 'absolute',
                          right: -6,
                          bottom: -6,
                          width: 14,
                          height: 14,
                          borderRadius: 4,
                          background: 'white',
                          border: '1px solid #64748b',
                          cursor: 'nwse-resize',
                          pointerEvents: 'auto',
                        }}
                        onMouseDown={e => onSectionResizeMouseDown(tdId, box, e)}
                      />
                      {/* Draggable edges for moving whole section */}
                      <div
                        style={{ position: 'absolute', left: -6, top: 0, width: 12, height, cursor: 'move', pointerEvents: 'auto', zIndex: 20 }}
                        onMouseDown={e => onSectionMouseDown(tdId, e)}
                      />
                      <div
                        style={{ position: 'absolute', right: -6, top: 0, width: 12, height, cursor: 'move', pointerEvents: 'auto', zIndex: 20 }}
                        onMouseDown={e => onSectionMouseDown(tdId, e)}
                      />
                      <div
                        style={{ position: 'absolute', left: 0, top: -6, width, height: 12, cursor: 'move', pointerEvents: 'auto', zIndex: 20 }}
                        onMouseDown={e => onSectionMouseDown(tdId, e)}
                      />
                      <div
                        style={{ position: 'absolute', left: 0, bottom: -6, width, height: 12, cursor: 'move', pointerEvents: 'auto', zIndex: 20 }}
                        onMouseDown={e => onSectionMouseDown(tdId, e)}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Section drag bars (interactive, small hit area) */}
              {Object.entries(sectionBoxes.byTd).map(([tdId, box]) => {
                if (hiddenSections.has(tdId)) return null;
                if (colWidth === 0) return null;
                const { left, top, width } = unitToPx(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
                const tdInfo = state.tdInfos.find(t => t.id === tdId);
                const title = sectionTitles[tdId] ?? tdInfo?.title ?? 'Section';
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
                    {editingSectionId === tdId ? (
                      <input
                        className="rgl-no-drag text-xs px-2 py-0.5 bg-white border border-primary rounded"
                        style={{ cursor: 'text' }}
                        autoFocus
                        defaultValue={title}
                        onClick={e => { e.stopPropagation(); }}
                        onMouseDown={e => { e.stopPropagation(); }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const value = (e.target as HTMLInputElement).value.trim() || 'Section';
                            setSectionTitles(prev => ({ ...prev, [tdId]: value }));
                            setEditingSectionId(null);
                          } else if (e.key === 'Escape') {
                            setEditingSectionId(null);
                          }
                        }}
                        onBlur={e => {
                          const value = e.target.value.trim() || 'Section';
                          setSectionTitles(prev => ({ ...prev, [tdId]: value }));
                          setEditingSectionId(null);
                        }}
                      />
                    ) : (
                      <span className="px-2 py-0.5 bg-white/90 text-primary text-xs font-heading rounded shadow border border-primary/30 rgl-no-drag" onDoubleClick={e => { e.stopPropagation(); setEditingSectionId(tdId); }}>{title}</span>
                    )}
                    {/* Icons: edit name, hide, delete section */}
                    <span
                      className="rgl-no-drag inline-flex items-center justify-center w-5 h-5 rounded hover:bg-gray-100 cursor-pointer"
                      title="Rename"
                      onClick={e => { e.preventDefault(); e.stopPropagation(); setEditingSectionId(tdId); }}
                    >
                      <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </span>
                    <span
                      className="rgl-no-drag inline-flex items-center justify-center w-5 h-5 rounded hover:bg-gray-100 cursor-pointer"
                      title="Hide section"
                      onClick={e => { e.preventDefault(); e.stopPropagation(); toggleSectionHidden(tdId); }}
                    >
                      <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.016.152-1.996.436-2.922m2.063-3.48C6.349 1.866 9.061 1 12 1c5.523 0 10 4.477 10 10 0 2.353-.808 4.516-2.162 6.227M3 3l18 18"/></svg>
                    </span>
                    <span
                      className="rgl-no-drag inline-flex items-center justify-center w-5 h-5 rounded hover:bg-gray-100 cursor-pointer"
                      title="Delete section"
                      onClick={e => { e.preventDefault(); e.stopPropagation(); deleteSectionWithChildren(tdId); }}
                    >
                      <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </span>
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
                  compactType={null}
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
                          <div className="bg-white rounded-lg shadow-sm border border-primary overflow-hidden relative w-full h-full" data-component-id={comp.id}>
                            {/* Top-right icon actions: edit (pencil) and remove (×) */}
                            <div className="absolute top-1 right-1 flex items-center gap-2 z-10">
                              <span
                                className="rgl-no-drag inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 cursor-pointer"
                                title="Edit"
                                onClick={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditComponentId(comp.id);
                                }}
                              >
                                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </span>
                              <span
                                className="rgl-no-drag inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 cursor-pointer"
                                title="Remove"
                                onClick={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeComponent(comp.id);
                                }}
                              >
                                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </span>
                            </div>

                            <div className="relative" style={{ width: '100%', height: '100%', minHeight: MIN_CARD_H }}>
                              <CardContent component={comp} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </ReactGridLayout>
              </div>
              {/* Hidden Sections Dock */}
              {hiddenSections.size > 0 && (
                <div className="absolute left-2 top-2 flex flex-wrap gap-2 z-30">
                  {Array.from(hiddenSections).map(tdId => (
                    <div key={`hidden-${tdId}`} className="rgl-no-drag flex items-center gap-1 px-2 py-1 bg-white/90 border border-primary/30 rounded shadow cursor-pointer" onClick={e => { e.preventDefault(); e.stopPropagation(); toggleSectionHidden(tdId); }}>
                      <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      <span className="text-xs text-primary font-heading">{sectionTitles[tdId] || state.tdInfos.find(t => t.id === tdId)?.title || 'Section'}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Smart Edit Popup */}
              {editComponentId &&
                (() => {
                  const comp = state.components.find(c => c.id === editComponentId);
                  if (!comp) return null;
                  const affordance = state.availableAffordances.find(a => a.key === comp.affordanceKey);
                  return (
                    <SmartEditPopup
                      component={comp}
                      affordance={affordance}
                      onClose={() => setEditComponentId(null)}
                      attributesList={[]}
                      attributesValues={{}}
                      attributesTypes={{}}
                      onAttributeChange={() => {
                        /* minimal no-op for now */
                      }}
                      onVariantChange={(componentId, variant) => dispatch({ type: 'UPDATE_COMPONENT', payload: { id: componentId, updates: { variant } } })}
                      onComponentClose={componentId => removeComponent(componentId)}
                    />
                  );
                })()}
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
