import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useNavbar } from '../context/NavbarContext';
import { dashboardService } from '../services/dashboardService';
import ReactGridLayoutLib, { WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import '../styles/rgl-overrides.css';
import { EditPopup } from '../components/EditPopup';

const ReactGridLayout = WidthProvider(ReactGridLayoutLib as unknown as React.ComponentType<any>);

// Grid constants and default sizes
import { COLS, MARGIN, PADDING, DEFAULT_SIZES } from './canvas/constants';

// Attribute schemas helper
import { getAttributeSchema } from './canvas/attributeSchemas';

// Extracted components and hooks
import { CardContent } from './canvas/CardContent';
import { connectThings } from './canvas/connectThings';

export function ComponentCanvasPage() {
  const { state, dispatch } = useAppContext();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { setContent, clear } = useNavbar();

  // Local, minimal layout state for RGL
  const [layout, setLayout] = useState<Layout[]>([]);
  const [transientLayout, setTransientLayout] = useState<Layout[] | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [dragBaseline, setDragBaseline] = useState<Layout[] | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [resizeBaseline, setResizeBaseline] = useState<Layout[] | null>(null);
  const [resizingItemId, setResizingItemId] = useState<string | null>(null);
  // Membership of cards to visual section (defaults to their TD id)
  const [membership, setMembership] = useState<Record<string, string | null>>({});
  // Hide state
  const [hiddenCards, _setHiddenCards] = useState<Set<string>>(new Set());
  const [sectionNames, setSectionNames] = useState<Record<string, string>>({});
  const [sectionStyles, setSectionStyles] = useState<Record<string, { bgColor: string; border: 'dashed' | 'solid' | 'none' }>>({});
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editComponentId, setEditComponentId] = useState<string | null>(null);
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
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

  // Update layout when components list changes (section-aware placement)
  useEffect(() => {
    setLayout(prev => {
      const next: Layout[] = [...prev];
      const existingIds = new Set(next.map(l => l.i));
      const idToComp = new Map(state.components.map(c => [c.id, c] as const));

      // Quantization helpers: snap width/height to a multiple of minW/minH
      const quantizeDim = (value: number, min: number) => {
        const base = Math.max(min || 1, value || min || 1);
        const step = Math.max(1, min || 1);
        // Round to nearest multiple
        const q = Math.max(step, Math.round(base / step) * step);
        return q;
      };
      const quantizeWithinSpan = (desired: number, min: number, span: number) => {
        if (!span || span < 1) return Math.max(1, min || 1);
        let q = quantizeDim(desired, Math.max(1, min || 1));
        if (q > span) {
          const down = Math.floor(span / Math.max(1, min || 1)) * Math.max(1, min || 1);
          q = Math.max(Math.min(span, Math.max(1, down)), Math.max(1, min || 1));
        }
        return q;
      };

      // Helper: current bounding box for a TD (by comp.tdId) from `next`
      const getSectionBox = (tdId?: string | null) => {
        if (!tdId) return null as null | { minX: number; maxX: number; minY: number; maxY: number };
        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let found = false;
        for (const l of next) {
          const comp = idToComp.get(l.i);
          if (!comp || comp.tdId !== tdId) continue;
          found = true;
          minX = Math.min(minX, l.x);
          minY = Math.min(minY, l.y);
          maxX = Math.max(maxX, l.x + l.w);
          maxY = Math.max(maxY, l.y + l.h);
        }
        return found ? { minX, maxX, minY, maxY } : null;
      };

      // Helper: bottom Y for any items overlapping a horizontal span [startX, startX+span)
      const regionBottom = (startX: number, span: number) => {
        let bottom = 0;
        for (const l of next) {
          const lStart = l.x;
          const lEnd = l.x + l.w;
          const rStart = startX;
          const rEnd = startX + span;
          const overlaps = lStart < rEnd && lEnd > rStart;
          if (overlaps) bottom = Math.max(bottom, l.y + l.h);
        }
        return bottom;
      };

      const targetSpan = Math.max(1, Math.floor(COLS / 2));

      // Group new components by TD id
      const newByTd = new Map<string | null, typeof state.components>();
      for (const comp of state.components) {
        if (existingIds.has(comp.id)) continue;
        const key: string | null = comp.tdId || null;
        const arr = newByTd.get(key) || ([] as any);
        arr.push(comp);
        newByTd.set(key, arr);
      }

      // For each TD group, decide section placement
      for (const [tdId, comps] of newByTd) {
        if (!comps || comps.length === 0) continue;
        const defOf = (c: any) => DEFAULT_SIZES[c.uiComponent] || { w: 4, h: 3 };

        // Existing section bounds
        const sec = getSectionBox(tdId);
        let startX: number;
        let span: number;
        let baseY: number;
        if (!sec) {
          const leftSpan = targetSpan;
          const rightSpan = COLS - targetSpan;
          const leftBottom = regionBottom(0, leftSpan);
          const rightBottom = rightSpan > 0 ? regionBottom(targetSpan, rightSpan) : Number.POSITIVE_INFINITY;
          const placeRight = rightBottom < leftBottom;
          startX = placeRight ? targetSpan : 0;
          span = placeRight ? rightSpan : leftSpan;
          baseY = Math.min(leftBottom, rightBottom);
        } else {
          startX = sec.minX;
          span = Math.max(1, sec.maxX - sec.minX);
          baseY = sec.maxY;
        }

        // Row-wise pack for just the new items in this section
        let cursorX = 0;
        let cursorY = baseY;
        let rowMaxH = 0;
        const pickPerRow = (s: number) => (s >= 8 ? 4 : s >= 6 ? 3 : 2);
        const perRow = pickPerRow(span);
        const unitW = Math.max(1, Math.floor(span / perRow));
        for (const comp of comps) {
          const def = defOf(comp);
          const desired = unitW;
          const w = quantizeWithinSpan(Math.max(1, Math.min(desired, span)), def.minW ?? 1, span);
          const h = quantizeDim(def.h || 3, def.minH ?? 1);
          if (cursorX + w > span && cursorX > 0) {
            cursorX = 0;
            cursorY += rowMaxH;
            rowMaxH = 0;
          }
          const x = startX + cursorX;
          const y = cursorY;
          next.push({ i: comp.id, x, y, w, h, minW: def.minW, minH: def.minH });
          cursorX += w;
          rowMaxH = Math.max(rowMaxH, h);
        }
      }

      // Remove stale entries
      for (let i = next.length - 1; i >= 0; i--) {
        if (!state.components.some(c => c.id === next[i].i)) next.splice(i, 1);
      }

      return next;
    });
    // Initialize membership defaults: auto-assign to TD sections
    setMembership(prev => {
      const next: Record<string, string | null> = { ...prev };
      state.components.forEach(c => {
        if (next[c.id] === undefined) next[c.id] = c.tdId ?? null;
      });
      // drop missing
      Object.keys(next).forEach(k => {
        if (!state.components.some(c => c.id === k)) delete next[k];
      });
      return next;
    });
    // Ensure section styles have defaults for known sections
    setSectionStyles(prev => {
      const next = { ...prev } as Record<string, { bgColor: string; border: 'dashed' | 'solid' | 'none' }>;
      state.tdInfos.forEach(td => {
        if (!next[td.id]) next[td.id] = { bgColor: 'transparent', border: 'dashed' };
      });
      // Cleanup removed TDs
      Object.keys(next).forEach(id => {
        if (!state.tdInfos.find(t => t.id === id)) delete next[id];
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
          <label
            className="flex items-center gap-2 border rounded-lg px-2 py-1 rgl-no-drag cursor-pointer select-none transition-colors"
            style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <input
              type="checkbox"
              checked={editMode}
              onChange={e => {
                setEditMode(e.target.checked);
                if (!e.target.checked) setEditComponentId(null);
              }}
            />
            <span className="text-xs font-heading">Edit</span>
          </label>
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
            onClick={() => {
              try {
                const name = prompt('Save dashboard as (name):', state.tdInfos[0]?.title || 'dashboard')?.trim();
                if (!name) return;
                // Persist and export JSON
                dashboardService.saveDashboard(state as any, name);
                dashboardService.exportFromState(state as any, { name });
                alert('Dashboard saved and downloaded as JSON.');
              } catch {}
            }}
            className="bg-primary hover:bg-primary-light text-white font-heading font-medium py-1.5 px-3 rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      ),
    });
    return () => clear();
  }, [tdSummary, navigate, dispatch, setContent, clear, editMode, theme]);

  // Close any open editor when edit mode turns off
  useEffect(() => {
    if (!editMode) setEditComponentId(null);
  }, [editMode]);
  // Compute pixel positions from grid units
  const colWidth = useMemo(() => {
    if (!containerWidth) return 0;
    const totalMargins = MARGIN[0] * (COLS - 1);
    const totalPadding = PADDING[0] * 2;
    return (containerWidth - totalMargins - totalPadding) / COLS;
  }, [containerWidth]);

  // Derive a square row height from current column width
  const rowH = useMemo(() => {
    if (!colWidth) return 56;
    return colWidth; // exact match to keep squares at any zoom
  }, [colWidth]);

  const unitToPx = useCallback(
    (x: number, y: number, w: number, h: number) => {
      const left = PADDING[0] + x * (colWidth + MARGIN[0]);
      const top = PADDING[1] + y * (rowH + MARGIN[1]);
      const width = w * colWidth + (w - 1) * MARGIN[0];
      const height = h * rowH + (h - 1) * MARGIN[1];
      return { left, top, width, height };
    },
    [colWidth, rowH],
  );

  // Compute per-TD section boxes in grid units
  const sectionBoxes = useMemo(() => {
    const byTd: Record<string, { minX: number; minY: number; maxX: number; maxY: number }> = {};
    const byTdItems: Record<string, Layout[]> = {};
    const activeLayout = transientLayout ?? layout;
    const visibleLayout = activeLayout.filter(l => {
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
  }, [layout, transientLayout, membership, hiddenCards, state.components]);

  // SECTION DRAG: allow dragging the whole section box to move all child items together
  const sectionDragRef = useRef<{
    tdId: string;
    startX: number;
    startY: number;
    //  original positions for members
    original: Map<string, { x: number; y: number; w: number }>;
    lastDx: number;
    lastDy: number;
  } | null>(null);

  const onSectionMouseDown = useCallback(
    (tdId: string, e: React.MouseEvent<HTMLDivElement>) => {
      if (colWidth === 0 || !editMode) return;
      e.preventDefault();
      e.stopPropagation();
      // Collect members (only those are inside this section)
      const members = layout.filter(l => membership[l.i] === tdId);
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
        const cellH = rowH + MARGIN[1];
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
    itemOrder: string[];
  } | null>(null);

  const reflowSectionItems = useCallback(
    (tdId: string, minX: number, minY: number, targetW: number) => {
      if (targetW < 1) targetW = 1;
      // Collect visible items in this section
      const items = layout.filter(it => membership[it.i] === tdId && !hiddenCards.has(it.i)).map(it => ({ ...it }));
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
      if (colWidth === 0 || !editMode) return;
      e.preventDefault();
      e.stopPropagation();
      // Determine the minimum allowed width so it don't force-resize children
      const sectionItems = layout.filter(it => membership[it.i] === tdId && !hiddenCards.has(it.i));
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

  // Layout change handlers: keep changes transient during drag/resize
  const handleLayoutChange = (next: Layout[]) => {
    if (isDragging && dragBaseline && draggingItemId) {
      const moved = next.find(l => l.i === draggingItemId);
      if (!moved) return;
      const overlay = dragBaseline.map(it => (it.i === draggingItemId ? { ...it, x: moved.x, y: moved.y, w: moved.w, h: moved.h } : { ...it }));
      setTransientLayout(overlay);
      return;
    }
    if (isResizing && resizeBaseline && resizingItemId) {
      const resized = next.find(l => l.i === resizingItemId);
      if (!resized) return;
      const overlay = resizeBaseline.map(it => (it.i === resizingItemId ? { ...it, x: resized.x, y: resized.y, w: resized.w, h: resized.h } : { ...it }));
      setTransientLayout(overlay);
      return;
    }
  };

  const handleDragStart = (current: Layout[], _oldItem: Layout, newItem: Layout) => {
    setIsDragging(true);
    setDraggingItemId(newItem.i);
    // capture baseline as a deep copy
    const base = current.map(it => ({ ...it }));
    setDragBaseline(base);
    // show the initial overlay immediately
    setTransientLayout(base.map(it => (it.i === newItem.i ? { ...it, x: newItem.x, y: newItem.y, w: newItem.w, h: newItem.h } : it)));
  };

  const handleDragStop = (finalLayout: Layout[], _oldItem: Layout, item: Layout) => {
    setIsDragging(false);
    setTransientLayout(null);
    // Commit only the dragged item's position; restore others to baseline
    if (dragBaseline && draggingItemId) {
      const committed = dragBaseline.map(it => (it.i === draggingItemId ? { ...it, x: item.x, y: item.y, w: item.w, h: item.h } : { ...it }));
      setLayout(committed);
    } else {
      setLayout(finalLayout);
    }
    setDragBaseline(null);
    setDraggingItemId(null);
    // If the item belongs to a section, drop out when it exits the bounding box of remaining items
    const comp = state.components.find(c => c.id === item.i);
    if (!comp) return;
    const currentSec = membership[item.i] ?? comp.tdId ?? null;
    if (!currentSec) return;
    // Compute bounding box of other items in same section
    const others = layout.filter(l => l.i !== item.i && membership[l.i] === currentSec);
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

  // Re-quantize items when their component type changes (minW/minH may change)
  useEffect(() => {
    setLayout(prev => {
      if (prev.length === 0) return prev;
      let changed = false;
      const next = prev.map(it => {
        const comp = state.components.find(c => c.id === it.i);
        if (!comp) return it;
        const def = DEFAULT_SIZES[comp.uiComponent] || { w: 4, h: 3, minW: 1, minH: 1 };
        const minW = def.minW ?? 1;
        const minH = def.minH ?? 1;
        let w = it.w;
        let h = it.h;
        const quant = (value: number, min: number) => Math.max(min, Math.round(value / Math.max(1, min)) * Math.max(1, min));
        if (it.minW !== minW) w = quant(w, minW);
        if (it.minH !== minH) h = quant(h, minH);
        // Ensure item still fits within grid horizontally
        if (it.x + w > COLS) w = Math.max(minW, Math.min(COLS - it.x, w));
        if (w !== it.w || h !== it.h || it.minW !== minW || it.minH !== minH) {
          changed = true;
          return { ...it, w, h, minW, minH };
        }
        return it;
      });
      return changed ? next : prev;
    });
  }, [state.components]);

  const handleResizeStart = (current: Layout[], _oldItem: Layout, newItem: Layout) => {
    setIsResizing(true);
    setResizingItemId(newItem.i);
    const base = current.map(it => ({ ...it }));
    setResizeBaseline(base);
    setTransientLayout(base.map(it => (it.i === newItem.i ? { ...it, x: newItem.x, y: newItem.y, w: newItem.w, h: newItem.h } : it)));
  };

  // Ensure resized items snap to multiples of their min sizes, then commit
  const handleResizeStop = (finalLayout: Layout[], _oldItem: Layout, newItem: Layout) => {
    setIsResizing(false);
    setTransientLayout(null);
    const comp = state.components.find(c => c.id === newItem.i);
    const def = comp ? DEFAULT_SIZES[comp.uiComponent] : undefined;
    const minW = newItem.minW ?? def?.minW ?? 1;
    const minH = newItem.minH ?? def?.minH ?? 1;
    const quantize = (value: number, min: number) => {
      const step = Math.max(1, min || 1);
      return Math.max(step, Math.round(value / step) * step);
    };
    const qW = Math.min(COLS - newItem.x, quantize(newItem.w, minW));
    const qH = quantize(newItem.h, minH);
    let committed: Layout[];
    if (resizeBaseline && resizingItemId) {
      committed = resizeBaseline.map(it => (it.i === resizingItemId ? { ...it, x: newItem.x, y: newItem.y, w: qW, h: qH } : { ...it }));
    } else {
      committed = finalLayout.map(it => (it.i === newItem.i ? { ...it, w: qW, h: qH } : it));
    }
    setLayout(committed);
    setResizeBaseline(null);
    setResizingItemId(null);
  };

  const removeComponent = (id: string) => {
    dispatch({ type: 'REMOVE_COMPONENT', payload: id });
    if (editComponentId === id) setEditComponentId(null);
  };

  const removeSection = (tdId: string) => {
    // Remove only components currently inside this section
    const toRemove = layout.filter(l => membership[l.i] === tdId).map(l => l.i);
    toRemove.forEach(id => dispatch({ type: 'REMOVE_COMPONENT', payload: id }));
    // Clean up local maps
    setMembership(prev => {
      const next = { ...prev } as Record<string, string | null>;
      toRemove.forEach(id => delete next[id]);
      return next;
    });
    setLayout(prev => prev.filter(l => !toRemove.includes(l.i)));
  };

  // Connect UI elements to TDs using the hook
  connectThings({ tdInfos: state.tdInfos, components: state.components, editMode });

  return (
    <div className={`min-h-screen transition-colors duration-300`} style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="w-full transition-all duration-200" style={{ minHeight: 'calc(100vh - var(--navbar-height))' }}>
        <div className="page-container canvas-page py-2" style={{ minHeight: 'inherit' }}>
          {state.components.length > 0 ? (
            <div
              className={`relative w-full border rounded-lg overflow-hidden transition-colors duration-300`}
              style={{
                minHeight: 'calc(100vh - var(--navbar-height) - 1rem)',
                backgroundColor: 'var(--color-bg-card)',
                borderColor: 'var(--color-border)',
              }}
            >
              {/* Full-canvas background grid (visible only in edit mode) */}
              {editMode && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: colWidth
                      ? `linear-gradient(to right, rgba(99,102,241,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(99,102,241,0.08) 1px, transparent 1px)`
                      : undefined,
                    backgroundSize: colWidth ? `${colWidth + MARGIN[0]}px ${rowH + MARGIN[1]}px` : undefined,
                    backgroundPosition: `${PADDING[0]}px ${PADDING[1]}px`,
                  }}
                />
              )}
              {/* Section overlays (non-interactive dashed boxes with draggable edges) */}
              <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
                {Object.entries(sectionBoxes.byTd).map(([tdId, box]) => {
                  if (colWidth === 0) return null;
                  const base = unitToPx(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
                  const left = base.left;
                  const top = base.top;
                  const width = base.width + MARGIN[0];
                  const height = base.height + MARGIN[1];
                  const styles = sectionStyles[tdId] || { bgColor: 'transparent', border: 'dashed' as const };
                  const outline = styles.border === 'none' ? 'none' : `1px ${styles.border} #cbd5e1`;
                  return (
                    <div key={tdId} data-section-id={tdId} style={{ position: 'absolute', left, top, width, height, outline, background: styles.bgColor }}>
                      {editMode && (
                        <>
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
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Section labels / drag bars */}
              {Object.entries(sectionBoxes.byTd).map(([tdId, box]) => {
                if (colWidth === 0) return null;
                const { left, top, width } = unitToPx(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
                const tdInfo = state.tdInfos.find(t => t.id === tdId);
                const currentName = sectionNames[tdId] ?? tdInfo?.title ?? 'Section';
                if (editMode) {
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
                        gap: 6,
                        padding: '0 8px',
                        cursor: 'move',
                      }}
                      onMouseDown={e => onSectionMouseDown(tdId, e)}
                    >
                      {editingSectionId === tdId ? (
                        <input
                          className={`rgl-no-drag text-xs font-heading px-1 py-0.5 rounded border border-primary/30`}
                          style={{
                            backgroundColor: 'var(--color-bg-card)',
                            color: 'var(--color-text-primary)',
                            width: Math.min(240, Math.max(90, currentName.length * 8)),
                          }}
                          autoFocus
                          value={currentName}
                          onClick={e => {
                            e.stopPropagation();
                          }}
                          onChange={e => setSectionNames(prev => ({ ...prev, [tdId]: e.target.value }))}
                          onBlur={() => setEditingSectionId(null)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') setEditingSectionId(null);
                            if (e.key === 'Escape') setEditingSectionId(null);
                          }}
                        />
                      ) : (
                        <span
                          className={`px-2 py-0.5 text-primary text-xs font-heading rounded shadow border border-primary/30 rgl-no-drag`}
                          style={{ backgroundColor: 'var(--color-bg-card)' }}
                          onClick={e => {
                            e.stopPropagation();
                            setEditingSectionId(tdId);
                          }}
                          title="Rename section"
                        >
                          {currentName}
                        </span>
                      )}
                      <span
                        className="rgl-no-drag inline-flex items-center justify-center w-5 h-5 rounded cursor-pointer ml-1"
                        style={{ backgroundColor: 'transparent' }}
                        title="Rename"
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingSectionId(tdId);
                        }}
                      >
                        <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </span>
                      <span
                        className="rgl-no-drag inline-flex items-center justify-center w-5 h-5 rounded cursor-pointer"
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        title="Section settings"
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditSectionId(tdId);
                        }}
                      >
                        <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35.74-.18 1.28-.72 1.46-1.46.94-1.543 3.11-1.543 4.05 0 .18.74.72 1.28 1.46 1.46z"
                          />
                        </svg>
                      </span>
                      <span
                        className="rgl-no-drag inline-flex items-center justify-center w-5 h-5 rounded cursor-pointer"
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        title="Delete section"
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeSection(tdId);
                        }}
                      >
                        <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </span>
                    </div>
                  );
                }
                // View mode: non-interactive label only
                return (
                  <div
                    key={`label-${tdId}`}
                    style={{
                      position: 'absolute',
                      left,
                      top: Math.max(0, top - 22),
                      height: 22,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 6px',
                    }}
                  >
                    <span className={`px-2 py-0.5 text-primary text-xs font-heading rounded shadow border border-primary/30`} style={{ backgroundColor: 'var(--color-bg-card)' }}>
                      {currentName}
                    </span>
                  </div>
                );
              })}

              {/* Grid */}
              <div ref={gridWrapRef} className="p-2" style={{ minHeight: 'calc(100vh - var(--navbar-height) - 1rem)' }}>
                <ReactGridLayout
                  cols={COLS}
                  rowHeight={rowH}
                  margin={MARGIN}
                  containerPadding={PADDING}
                  compactType={null}
                  isResizable={editMode}
                  isDraggable={editMode}
                  preventCollision={false}
                  autoSize
                  useCSSTransforms
                  draggableCancel=".rgl-no-drag"
                  layout={(transientLayout ?? layout).filter(l => !hiddenCards.has(l.i))}
                  onLayoutChange={handleLayoutChange}
                  onDragStart={handleDragStart}
                  onDragStop={handleDragStop}
                  onResizeStart={handleResizeStart}
                  onResizeStop={handleResizeStop}
                >
                  {layout
                    .filter(l => !hiddenCards.has(l.i))
                    .map(l => {
                      const comp = state.components.find(c => c.id === l.i);
                      if (!comp) return null;
                      const showWrapper = !comp.hideCard;
                      return (
                        <div key={l.i} className="rgl-card" style={{ padding: 1 }}>
                          {showWrapper ? (
                            <div
                              className="rounded-lg shadow-sm border overflow-hidden relative w-full h-full"
                              style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                              data-component-id={comp.id}
                            >
                              {editMode && (
                                <div className="absolute top-1 right-1 flex items-center gap-2 z-10">
                                  <span
                                    className="rgl-no-drag inline-flex items-center justify-center w-6 h-6 rounded cursor-pointer"
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
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
                                    className="rgl-no-drag inline-flex items-center justify-center w-6 h-6 rounded cursor-pointer"
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
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
                              )}
                              <div className="relative" style={{ width: '100%', height: '100%' }}>
                                <CardContent component={comp} tdInfos={state.tdInfos} />
                              </div>
                            </div>
                          ) : (
                            <div data-component-id={comp.id} className="relative w-full h-full flex items-center justify-center">
                              {editMode && (
                                <div className="absolute top-1 right-1 flex items-center gap-2 z-10">
                                  <span
                                    className="rgl-no-drag inline-flex items-center justify-center w-6 h-6 rounded cursor-pointer"
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
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
                                    className="rgl-no-drag inline-flex items-center justify-center w-6 h-6 rounded cursor-pointer"
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
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
                              )}
                              <div className="relative" style={{ width: '100%', height: '100%' }}>
                                <CardContent component={comp} tdInfos={state.tdInfos} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </ReactGridLayout>
              </div>
              {/* Edit Popup */}
              {editComponentId &&
                (() => {
                  const comp = state.components.find(c => c.id === editComponentId);
                  if (!comp) return null;
                  const affordance = state.availableAffordances.find(a => a.key === comp.affordanceKey);
                  const schema = getAttributeSchema(comp.uiComponent);
                  const attributesList = Object.keys(schema);
                  const attributesTypes = schema;
                  const attributesValues: Record<string, string> = {};
                  attributesList.forEach(k => {
                    const raw = comp.attributes?.[k];
                    if (raw == null) {
                      attributesValues[k] = schema[k].type === 'boolean' ? 'false' : '';
                    } else {
                      attributesValues[k] = String(raw);
                    }
                  });
                  return (
                    <EditPopup
                      mode="component"
                      component={comp}
                      affordance={affordance}
                      onClose={() => setEditComponentId(null)}
                      attributesList={attributesList}
                      attributesValues={attributesValues}
                      attributesTypes={attributesTypes}
                      onAttributeChange={(componentId, attrName, value) => {
                        // Persist to state as strings (kebab-case)
                        const target = state.components.find(c => c.id === componentId);
                        if (!target) return;
                        const nextAttrs = { ...(target.attributes || {}) } as Record<string, string>;
                        if (value === '' || value == null) {
                          delete nextAttrs[attrName];
                        } else {
                          nextAttrs[attrName] = value;
                        }
                        dispatch({ type: 'UPDATE_COMPONENT', payload: { id: componentId, updates: { attributes: nextAttrs } } });
                        // Also apply live to the element in DOM if present
                        const elHost = document.querySelector(`[data-component-id="${componentId}"]`);
                        const el = elHost?.querySelector(target.uiComponent) as HTMLElement | null;
                        if (el) {
                          if (value === '' || value == null) el.removeAttribute(attrName);
                          else el.setAttribute(attrName, value);
                        }
                      }}
                      onVariantChange={(componentId, variant) => dispatch({ type: 'UPDATE_COMPONENT', payload: { id: componentId, updates: { variant } } })}
                      onComponentClose={componentId => removeComponent(componentId)}
                    />
                  );
                })()}

              {editSectionId &&
                (() => {
                  const sectionId = editSectionId!;
                  const name = sectionNames[sectionId] ?? state.tdInfos.find(t => t.id === sectionId)?.title ?? 'Section';
                  const styles = sectionStyles[sectionId] || { bgColor: 'transparent', border: 'dashed' as const };
                  const onSectionChange = (sid: string, updates: { name?: string; styles?: { bgColor?: string; border?: 'dashed' | 'solid' | 'none' } }) => {
                    if (updates.name !== undefined) setSectionNames(prev => ({ ...prev, [sid]: updates.name! }));
                    if (updates.styles) setSectionStyles(prev => ({ ...prev, [sid]: { ...prev[sid], ...updates.styles } }));
                  };
                  const onBulkAction = (sid: string, action: 'hideWrappers' | 'showWrappers' | 'setVariant', payload?: { variant?: string }) => {
                    const ids = layout.filter(l => membership[l.i] === sid).map(l => l.i);
                    if (action === 'hideWrappers') {
                      ids.forEach(id => dispatch({ type: 'UPDATE_COMPONENT', payload: { id, updates: { hideCard: true } } }));
                    } else if (action === 'showWrappers') {
                      ids.forEach(id => dispatch({ type: 'UPDATE_COMPONENT', payload: { id, updates: { hideCard: false } } }));
                    } else if (action === 'setVariant' && payload?.variant) {
                      ids.forEach(id => dispatch({ type: 'UPDATE_COMPONENT', payload: { id, updates: { variant: payload.variant } } }));
                    }
                  };
                  return (
                    <EditPopup
                      mode="section"
                      sectionId={sectionId}
                      sectionName={name}
                      sectionStyles={styles}
                      onClose={() => setEditSectionId(null)}
                      onSectionChange={onSectionChange}
                      onBulkAction={onBulkAction}
                    />
                  );
                })()}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <svg className="mx-auto h-12 w-12 transition-colors duration-300" style={{ color: 'var(--color-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className={`mt-2 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>No components</h3>
                <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>
                  No components have been selected yet. Go back to select affordances from your Thing Description.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/affordances')}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white transition-all duration-300 transform hover:scale-105"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                    }}
                    onFocus={e => {
                      e.target.style.outline = '2px solid var(--color-primary)';
                      e.target.style.outlineOffset = '2px';
                    }}
                    onBlur={e => {
                      e.target.style.outline = 'none';
                    }}
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
