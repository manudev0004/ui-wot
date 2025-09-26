import { useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  useEdgesState,
  useNodesState,
  addEdge,
  Connection,
  Edge,
  BackgroundVariant,
  useReactFlow,
  NodeTypes,
  PanOnScrollMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAppContext } from '../context/AppContext';
import { useNavbar } from '../context/NavbarContext';
import { useNavigate } from 'react-router-dom';
import { connectThings } from './canvas/connectThings';
import { CardContent } from './canvas/CardContent';
import { dashboardService } from '../services/dashboardService';
import { EditPopup } from '../components/EditPopup';
import { getAttributeSchema } from './canvas/attributeSchemas';
import { formatLabelText } from '../utils/label';

const SECTION_WIDTH = 640; // px default width for sections
const SECTION_HEIGHT = 360; // px default height for sections
const GAP = 10; // px gap between nodes
const MIN_GAP = 8; // minimal gap when squeezing a row to fit another card
const CARD_W = 280; // default card width (also min width)

const CARD_H = 140; // default card height (min height is 130)
const EVENT_CARD_H = 304; // double height for event components
const OBJECT_CARD_H = 304; // double height for object components

// Module-scope layout order to be used by helpers outside component scope
let layoutOrderGlobal: Record<string, string[]> = {};

// Minimum height per component type (object/event need taller cards)
function getMinCardHeight(comp: any): number {
  const ui = comp?.uiComponent?.toLowerCase?.() || '';
  if (ui.includes('event')) return EVENT_CARD_H;
  if (ui.includes('object') || comp?.affordanceKey?.includes?.('object')) return OBJECT_CARD_H;
  return CARD_H;
}

// Helper function to get appropriate card size based on component type
function getCardDimensions(comp: any): { w: number; h: number } {
  if (!comp) return { w: CARD_W, h: CARD_H };

  const uiComponent = comp.uiComponent?.toLowerCase() || '';

  // Event components need more height
  if (uiComponent.includes('event')) {
    return { w: CARD_W, h: EVENT_CARD_H };
  }

  // Object/complex components need more height and should scroll if needed
  if (uiComponent.includes('object') || comp.affordanceKey?.includes('object')) {
    return { w: CARD_W, h: OBJECT_CARD_H };
  }

  // Default size for other components
  return { w: CARD_W, h: CARD_H };
}

export function ComponentCanvasPage() {
  const { state, dispatch } = useAppContext();
  const { setContent, clear } = useNavbar();
  const navigate = useNavigate();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const isDraggingRef = useRef(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));
  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        if (e.contentRect?.width) setCanvasWidth(e.contentRect.width);
      }
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  // Build nodes per component; auto-pack into rows under their section header
  const [membership, setMembership] = useState<Record<string, string | null>>({});
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editComponentId, setEditComponentId] = useState<string | null>(null);

  const [sectionNames, setSectionNames] = useState<Record<string, string>>({});
  const [sectionStyles, setSectionStyles] = useState<Record<string, { bgColor: string; border: 'dashed' | 'solid' | 'none' }>>({});
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [layoutOrder, setLayoutOrder] = useState<Record<string, string[]>>({});

  // Enhanced drag state for fluid interactions
  const [manualPositions, setManualPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dragHighlight, setDragHighlight] = useState<{ targetId: string; type: 'swap' | 'insert' } | null>(null);

  // Canvas display options
  const [showDots, setShowDots] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [zoomOnScroll, setZoomOnScroll] = useState(false);
  const [panOnScroll, setPanOnScroll] = useState(true);
  const [zoomOnDoubleClick, setZoomOnDoubleClick] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });

  // Make the current order available to reflow helpers outside this component
  useEffect(() => {
    (layoutOrderGlobal as any) = layoutOrder;
  }, [layoutOrder]);

  // Persist manual positions to localStorage
  useEffect(() => {
    const key = `ui-wot-manual-positions-${window.location.pathname}`;
    localStorage.setItem(key, JSON.stringify(manualPositions));
  }, [manualPositions]);

  // Load manual positions from localStorage on mount
  useEffect(() => {
    const key = `ui-wot-manual-positions-${window.location.pathname}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const positions = JSON.parse(saved);
        setManualPositions(positions);
      } catch (e) {
        console.warn('Failed to load manual positions:', e);
      }
    }
  }, []);

  // Preserve existing node positions/sizes on rebuild
  const nodesRef = useRef<Node[]>([]);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const buildNodes = useMemo(() => {
    const tdOrder = state.tdInfos.map(t => t.id);
    const bySection: Record<string, string[]> = {};
    state.components.forEach(c => {
      const sid = membership[c.id] ?? c.tdId ?? '__unassigned__';
      if (!bySection[sid]) bySection[sid] = [];
      bySection[sid].push(c.id);
    });
    // Apply stable user-defined order per section when present
    Object.keys(bySection).forEach(sid => {
      const order = layoutOrder[sid] || [];
      bySection[sid].sort((a, b) => {
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });
    });

    // Smart section layout: 1 TD = full width, 2 TDs = half each, 3+ TDs = grid
    const sectionIds = [...tdOrder];
    const activeSectionCount = sectionIds.filter(sid => (bySection[sid] || []).length > 0).length;

    let cols, secW;
    if (activeSectionCount === 1) {
      // Single TD: take full available width (inner gaps handled inside section)
      cols = 1;
      secW = Math.min(canvasWidth - GAP * 2, 1800); // Cap max width for readability
    } else if (activeSectionCount === 2) {
      // Two TDs: ensure minimum 900px each to fit 3 cards per row
      cols = 2;
      const availableForSections = canvasWidth - GAP * 3; // Account for side margins + center gap
      secW = Math.max(895, Math.floor(availableForSections / 2));
    } else {
      // Three or more TDs: grid layout (2 per row) with minimum width
      cols = 2;
      const availableForSections = canvasWidth - GAP * 3;
      secW = Math.max(900, Math.floor(availableForSections / 2));
    }

    const colX = Array.from({ length: cols }, (_, i) => GAP + i * (secW + GAP));
    const colY = Array.from({ length: cols }, () => GAP);
    const result: Node[] = [];

    for (const sid of sectionIds) {
      const ids = bySection[sid] || [];
      if (ids.length === 0) continue;
      // pick the column with the smallest current height
      let col = 0;
      for (let i = 1; i < cols; i++) if (colY[i] < colY[col]) col = i;
      const x = colX[col];
      const y = colY[col];
      const sectionTitle = sid === '__unassigned__' ? 'Unassigned' : sectionNames[sid] ?? state.tdInfos.find(t => t.id === sid)?.title ?? 'Section';
      const styleConf = sectionStyles[sid] || { bgColor: 'transparent', border: 'dashed' as const };
      const borderCss = styleConf.border === 'none' ? 'none' : `1px ${styleConf.border} #94a3b8`;
      // We'll compute height as we place children; preserve existing pos/size if present
      const existing = nodesRef.current.find(n => n.id === `sec:${sid}`);
      // Always use computed layout width so section columns adapt to TD count
      const widthForSection = secW;
      const secNode: Node = {
        id: `sec:${sid}`,
        type: 'sectionNode',
        data: {
          title: sectionTitle,
          sectionId: sid,
          styles: { bgColor: styleConf.bgColor, border: borderCss },
          editMode,
          onRename: (id: string, name: string) => setSectionNames(prev => ({ ...prev, [id]: name })),
          onRemoveSection: (id: string) => {
            const toRemove = state.components.filter(c => (membership[c.id] ?? c.tdId ?? '__unassigned__') === id);
            toRemove.forEach(c => dispatch({ type: 'REMOVE_COMPONENT', payload: c.id }));
            setMembership(prev => {
              const next = { ...prev } as Record<string, string | null>;
              toRemove.forEach(c => delete next[c.id]);
              return next;
            });
            setLayoutOrder(prev => {
              const n = { ...prev };
              delete n[id];
              return n;
            });
          },
          onOpenSettings: (id: string) => setEditSectionId(id),
        },
        position: existing?.position ?? { x, y },
        style: { width: widthForSection, height: (existing?.style?.height as number) ?? SECTION_HEIGHT, borderRadius: 8 },
        draggable: editMode,
        dragHandle: '.section-drag-handle',
      };
      result.push(secNode);
      // pack components inside section as children using coordinate-based space tracking
      const innerW = widthForSection - GAP * 2;
      const preIndex = result.length; // remember start index for children
      const queue = [...ids];

      // Track occupied space with coordinate system
      type SpaceRect = { x: number; y: number; w: number; h: number };
      const occupiedSpaces: SpaceRect[] = [];
      let currentY = GAP;

      const findBestPosition = (w: number, h: number): { x: number; y: number } => {
        // Try to place at each y level, scanning for horizontal space
        const stepY = GAP;
        const stepX = 4; // Fine horizontal positioning

        for (let y = GAP; y <= currentY + h + GAP; y += stepY) {
          // For each y level, try placing from left to right
          for (let x = GAP; x + w <= innerW; x += stepX) {
            const candidate = { x, y, w: w + GAP, h: h + GAP };
            // Check if this position conflicts with any occupied space
            const hasConflict = occupiedSpaces.some(
              occupied =>
                !(
                  candidate.x >= occupied.x + occupied.w ||
                  candidate.x + candidate.w <= occupied.x ||
                  candidate.y >= occupied.y + occupied.h ||
                  candidate.y + candidate.h <= occupied.y
                ),
            );
            if (!hasConflict) {
              return { x, y };
            }
          }
        }
        // If no space found in existing rows, start a new row
        return { x: GAP, y: currentY };
      };

      // Add overlap detection to ensure no cards overlap
      const detectAndFixOverlaps = () => {
        const children = result.slice(preIndex);
        let fixed = false;

        for (let i = 0; i < children.length; i++) {
          for (let j = i + 1; j < children.length; j++) {
            const a = children[i];
            const b = children[j];
            const aPos = a.position as { x: number; y: number };
            const bPos = b.position as { x: number; y: number };
            const aW = (a.style?.width as number) ?? CARD_W;
            const aH = (a.style?.height as number) ?? getMinCardHeight((a.data as any)?.comp);
            const bW = (b.style?.width as number) ?? CARD_W;
            const bH = (b.style?.height as number) ?? getMinCardHeight((b.data as any)?.comp);

            // Check for overlap
            const overlap = !(aPos.x + aW + MIN_GAP <= bPos.x || bPos.x + bW + MIN_GAP <= aPos.x || aPos.y + aH + MIN_GAP <= bPos.y || bPos.y + bH + MIN_GAP <= aPos.y);

            if (overlap) {
              // Move the second card to a non-overlapping position
              const newPos = findBestPosition(bW, bH);
              b.position = { x: newPos.x, y: newPos.y } as any;
              occupiedSpaces.push({ x: newPos.x, y: newPos.y, w: bW + GAP, h: bH + GAP });
              currentY = Math.max(currentY, newPos.y + bH + GAP);
              fixed = true;
            }
          }
        }
        return fixed;
      };

      while (queue.length) {
        const id = queue.shift()!;
        const comp = state.components.find(c => c.id === id);
        if (!comp) continue;

        const existingChild = nodesRef.current.find(n => n.id === id);
        const dimensions = getCardDimensions(comp);
        let w = (existingChild?.style?.width as number) ?? dimensions.w;
        let h = (existingChild?.style?.height as number) ?? dimensions.h;
        // Enforce per-type minimum height (e.g., object/event >= 304px)
        h = Math.max(h, getMinCardHeight(comp));

        // Check if we have a manual position for this component
        const manualPos = manualPositions[id];
        const pos = manualPos ? { x: manualPos.x, y: manualPos.y } : findBestPosition(w, h);

        // Create the node
        result.push({
          id,
          type: 'componentNode',
          parentNode: `sec:${sid}`,
          data: {
            comp,
            sectionId: sid,
            size: { w, h },
            tdInfos: state.tdInfos,
            editMode,
            onEdit: setEditComponentId,
            onRemove: (cid: string) => dispatch({ type: 'REMOVE_COMPONENT', payload: cid }),
            dragHighlight: dragHighlight?.targetId === id ? dragHighlight.type : null,
          },
          position: { x: pos.x, y: pos.y } as any,
          style: { width: w, height: h },
          draggable: editMode,
        });

        // Mark this space as occupied (including gap)
        occupiedSpaces.push({ x: pos.x, y: pos.y, w: w + GAP, h: h + GAP });

        // Update currentY to track the bottom-most occupied space
        currentY = Math.max(currentY, pos.y + h + GAP);
      }

      // Fix any overlaps that occurred during placement
      let attempts = 0;
      while (detectAndFixOverlaps() && attempts < 3) {
        attempts++;
      }

      // adjust section height to enclose children using actual child bounds
      const children = result.slice(preIndex);
      let maxBottom = GAP;
      if (children.length) {
        for (const ch of children) {
          const h = (ch.style?.height as number) ?? getMinCardHeight((ch.data as any)?.comp);
          const y = (ch.position?.y as number) ?? 0;
          maxBottom = Math.max(maxBottom, y + h + GAP);
        }
      } else {
        maxBottom = SECTION_HEIGHT;
      }
      secNode.style = { ...secNode.style, height: Math.max(SECTION_HEIGHT, maxBottom) } as any;
      // stack using the section's current or computed height
      const stackH = (existing?.style?.height as number) ?? (Number((secNode.style as any)?.height) || SECTION_HEIGHT);
      // Add extra vertical gap to account for section title label (positioned at top: -22px) and proper spacing
      const SECTION_VERTICAL_GAP = GAP + 40; // Extra space for title and visual separation
      colY[col] = Math.max(colY[col], y + stackH + SECTION_VERTICAL_GAP);
    }

    // Fallback: components without any section create standalone nodes so page never blanks
    const unassigned = bySection['__unassigned__'] || [];
    for (const id of unassigned) {
      if (result.find(n => n.id === id)) continue;
      const comp = state.components.find(c => c.id === id);
      if (!comp) continue;
      const existingFree = nodesRef.current.find(n => n.id === id && !n.parentNode);
      const dimensions = getCardDimensions(comp);
      const w = (existingFree?.style?.width as number) ?? dimensions.w;
      const h = (existingFree?.style?.height as number) ?? dimensions.h;
      const pos = existingFree?.position ?? { x: 0, y: colY[0] + GAP };
      result.push({
        id,
        type: 'componentNode',
        data: {
          comp,
          sectionId: null,
          size: { w, h },
          tdInfos: state.tdInfos,
          editMode,
          onEdit: setEditComponentId,
          onRemove: (cid: string) => dispatch({ type: 'REMOVE_COMPONENT', payload: cid }),
        },
        position: pos as any,
        style: { width: w, height: h },
        draggable: editMode,
      });
    }

    return result;
  }, [state.components, state.tdInfos, membership, editMode, dispatch, sectionNames, sectionStyles, layoutOrder, canvasWidth, manualPositions]);

  useEffect(() => {
    setNodes(buildNodes);
  }, [buildNodes, setNodes]);

  // Auto-reflow after nodes are built (regardless of edit mode)
  useEffect(() => {
    if (nodes.length === 0) return;
    const timer = setTimeout(() => {
      // Don't reflow if user is currently dragging
      if (!isDraggingRef.current) {
        setNodes(prev => reflowAllSections(prev));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [nodes.length, setNodes]);

  // Live reflow when components change (for live editing feedback)
  useEffect(() => {
    if (nodes.length === 0) return;
    const timer = setTimeout(() => {
      // Don't reflow if user is currently dragging
      if (!isDraggingRef.current) {
        setNodes(prev => reflowAllSections(prev));
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [state.components, setNodes]);

  // Initialize layout order from current arrangement once nodes are first built
  useEffect(() => {
    if (!nodes.length) return;
    const bySection: Record<string, string[]> = {};
    nodes.forEach(n => {
      if (n.type === 'componentNode' && n.parentNode) {
        const sid = (n.parentNode as string).replace(/^sec:/, '');
        if (!bySection[sid]) bySection[sid] = [];
        bySection[sid].push(n.id);
      }
    });
    if (Object.keys(bySection).length) {
      setLayoutOrder(prev => {
        const next = { ...prev };
        Object.entries(bySection).forEach(([sid, ids]) => (next[sid] = ids));
        layoutOrderGlobal = next;
        return next;
      });
    }
  }, [nodes.length]);

  // Initialize membership for new components
  useEffect(() => {
    setMembership(prev => {
      let changed = false;
      const next: Record<string, string | null> = { ...prev };
      state.components.forEach(c => {
        if (next[c.id] === undefined) {
          next[c.id] = c.tdId ?? null;
          changed = true;
        }
      });
      // cleanup
      Object.keys(next).forEach(id => {
        if (!state.components.find(c => c.id === id)) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    // Keep layoutOrder in sync with components per section
    setLayoutOrder(prev => {
      const bySection: Record<string, string[]> = {};
      state.components.forEach(c => {
        const sid = membership[c.id] ?? c.tdId ?? '__unassigned__';
        if (!bySection[sid]) bySection[sid] = [];
        bySection[sid].push(c.id);
      });
      const next: Record<string, string[]> = { ...prev };
      Object.entries(bySection).forEach(([sid, ids]) => {
        const existing = (prev[sid] || []).filter(id => ids.includes(id));
        const toAppend = ids.filter(id => !existing.includes(id));
        next[sid] = [...existing, ...toAppend];
      });
      layoutOrderGlobal = next;
      return next;
    });
  }, [state.components, membership]);

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
        <div className="flex items-center gap-2">
          <label
            className="flex items-center gap-2 border rounded-lg px-2 py-1 cursor-pointer select-none transition-colors"
            style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <input type="checkbox" checked={editMode} onChange={e => setEditMode(e.target.checked)} />
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
  }, [setContent, clear, navigate, editMode, tdSummary, state, dispatch]);

  // Toggle node draggability when edit mode changes
  useEffect(() => {
    setNodes(prev => prev.map(n => ({ ...n, draggable: editMode })));
  }, [editMode, setNodes]);

  // Use the original hook-based connector (called at top-level of component)
  connectThings({ tdInfos: state.tdInfos, components: state.components, editMode });

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      sectionNode: SectionNode,
      componentNode: ComponentNode,
    }),
    [],
  );

  const onConnect = (connection: Connection) => setEdges((eds: Edge[]) => addEdge(connection, eds));

  // Context menu handlers
  const onPaneContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      show: true,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, show: false }));
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => closeContextMenu();
    if (contextMenu.show) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu.show]);

  // Drag preview state
  const dragRef = useRef<{
    activeId: string | null;
    baseline: Node[];
  } | null>(null);

  const onNodeDragStart = (_: any, node: any) => {
    if (!editMode) return;
    if (!node || node.type !== 'componentNode') return;
    isDraggingRef.current = true;
    dragRef.current = { activeId: node.id, baseline: nodes.map(n => ({ ...n, position: { ...n.position } })) };
  };

  const onNodeDrag = (_: any, node: any) => {
    // Allow free dragging in edit mode
    if (!editMode || !node || node.type !== 'componentNode') return;

    // Update positions in real-time during drag to show live arrangement
    const draggingCardId = node.id;
    const draggingPos = node.position;

    // Find the section this card belongs to
    const sectionId = node.parentNode;
    if (!sectionId) return;

    // Get all cards in the same section
    const sectionCards = nodes.filter(n => n.parentNode === sectionId && n.type === 'componentNode' && n.id !== draggingCardId);

    // Apply coordinate-based repositioning for cards that would overlap
    const cardW = (node.style?.width as number) ?? CARD_W;
    const cardH = (node.style?.height as number) ?? getMinCardHeight(node.data?.comp);
    const section = nodes.find(n => n.id === sectionId);
    const sectionW = (section?.style?.width as number) ?? SECTION_WIDTH;
    const innerW = sectionW - GAP * 2;

    // Track occupied spaces excluding the dragging card
    const occupiedSpaces: Array<{ x: number; y: number; w: number; h: number; id: string }> = [];

    // Add the dragging card's new position
    occupiedSpaces.push({
      x: draggingPos.x,
      y: draggingPos.y,
      w: cardW + GAP,
      h: cardH + GAP,
      id: draggingCardId,
    });

    // Check for potential card swapping
    let swapTarget: string | null = null;
    const dragCenter = { x: draggingPos.x + cardW / 2, y: draggingPos.y + cardH / 2 };

    sectionCards.forEach(card => {
      const pos = card.position;
      const w = (card.style?.width as number) ?? CARD_W;
      const h = (card.style?.height as number) ?? getMinCardHeight((card as any)?.data?.comp);

      // Check if dragging card center is over this card's area (for swapping)
      if (dragCenter.x >= pos.x && dragCenter.x <= pos.x + w && dragCenter.y >= pos.y && dragCenter.y <= pos.y + h) {
        swapTarget = card.id;
      }
    });

    // Update drag highlight for visual feedback
    if (swapTarget && swapTarget !== dragHighlight?.targetId) {
      setDragHighlight({ targetId: swapTarget, type: 'swap' });
    } else if (!swapTarget && dragHighlight) {
      setDragHighlight(null);
    }

    const findBestPosition = (w: number, h: number, excludeId: string): { x: number; y: number } => {
      const stepY = GAP;
      const stepX = 4;
      let maxBottom = GAP;

      // Calculate max bottom from current occupancy
      occupiedSpaces.forEach(space => {
        if (space.id !== excludeId) {
          maxBottom = Math.max(maxBottom, space.y + space.h);
        }
      });

      for (let y = GAP; y <= maxBottom + GAP; y += stepY) {
        for (let x = GAP; x + w <= innerW; x += stepX) {
          const hasConflict = occupiedSpaces.some(
            occupied => occupied.id !== excludeId && !(x >= occupied.x + occupied.w || x + w + GAP <= occupied.x || y >= occupied.y + occupied.h || y + h + GAP <= occupied.y),
          );
          if (!hasConflict) return { x, y };
        }
      }
      return { x: GAP, y: maxBottom };
    };

    // Handle card swapping or displacement
    const updatedNodes = [...nodes];
    let needsUpdate = false;

    if (swapTarget) {
      // Swap positions with the target card
      const targetNode = sectionCards.find(card => card.id === swapTarget);
      if (targetNode) {
        const targetIndex = updatedNodes.findIndex(n => n.id === swapTarget);
        const dragIndex = updatedNodes.findIndex(n => n.id === draggingCardId);

        if (targetIndex >= 0 && dragIndex >= 0) {
          // Store the target's original position for the dragging card to take
          const targetOriginalPos = { ...targetNode.position };

          // Move target to dragging card's original position (from dragRef baseline)
          const dragOriginalPos = dragRef.current?.baseline.find(n => n.id === draggingCardId)?.position;
          if (dragOriginalPos) {
            updatedNodes[targetIndex] = {
              ...updatedNodes[targetIndex],
              position: { ...dragOriginalPos },
            };

            // Update manual positions to remember the swap
            setManualPositions(prev => ({
              ...prev,
              [swapTarget!]: { ...dragOriginalPos },
              [draggingCardId]: { ...targetOriginalPos },
            }));

            needsUpdate = true;
          }
        }
      }
    } else {
      // Regular displacement behavior
      sectionCards.forEach(card => {
        const pos = card.position;
        const w = (card.style?.width as number) ?? CARD_W;
        const h = (card.style?.height as number) ?? getMinCardHeight((card as any)?.data?.comp);

        // Check if this card overlaps with the dragging card's new position
        const overlap = !(
          pos.x + w + MIN_GAP <= draggingPos.x ||
          draggingPos.x + cardW + MIN_GAP <= pos.x ||
          pos.y + h + MIN_GAP <= draggingPos.y ||
          draggingPos.y + cardH + MIN_GAP <= pos.y
        );

        if (overlap) {
          const newPos = findBestPosition(w, h, card.id);
          const nodeIndex = updatedNodes.findIndex(n => n.id === card.id);
          if (nodeIndex >= 0) {
            updatedNodes[nodeIndex] = {
              ...updatedNodes[nodeIndex],
              position: { x: newPos.x, y: newPos.y },
            };
            occupiedSpaces.push({
              x: newPos.x,
              y: newPos.y,
              w: w + GAP,
              h: h + GAP,
              id: card.id,
            });
            needsUpdate = true;
          }
        } else {
          // Add non-overlapping cards to occupied spaces
          occupiedSpaces.push({
            x: pos.x,
            y: pos.y,
            w: w + GAP,
            h: h + GAP,
            id: card.id,
          });
        }
      });
    }

    if (needsUpdate) {
      setNodes(updatedNodes);
    }
  };

  const onNodeDragStop = (_: any, node: any) => {
    // After drag, clean up and persist the position changes
    if (!editMode || !node || node.type !== 'componentNode') return;

    // Clear drag highlight
    setDragHighlight(null);

    // Mark that we're no longer dragging
    isDraggingRef.current = false;

    // Store final position in manual positions for persistence
    setManualPositions(prev => ({
      ...prev,
      [node.id]: { x: node.position.x, y: node.position.y },
    }));

    // Clean up drag reference
    dragRef.current = null;

    // Update layout order based on final positions to maintain consistency
    const sectionId = node.parentNode;
    if (sectionId) {
      const sectionCards = nodes.filter(n => n.parentNode === sectionId && n.type === 'componentNode');
      // Sort cards by their Y position, then X position
      const sortedCards = sectionCards.sort((a, b) => {
        if (Math.abs(a.position.y - b.position.y) < 10) {
          return a.position.x - b.position.x; // Same row, sort by X
        }
        return a.position.y - b.position.y; // Different rows, sort by Y
      });

      const newOrder = sortedCards.map(card => (card as any).data?.comp?.id).filter(Boolean);
      setLayoutOrder(prev => ({
        ...prev,
        [sectionId.replace('sec:', '')]: newOrder,
      }));
    }

    // Optional: Trigger a gentle reflow after a delay to clean up any minor positioning issues
    // but only if we're not in the middle of another drag operation
    setTimeout(() => {
      if (!isDraggingRef.current) {
        // Perform a minimal reflow that respects manually positioned cards
        // This will only fix overlaps without completely rearranging the layout
        setNodes(prev => {
          const updated = [...prev];
          const sections = updated.filter(n => n.type === 'sectionNode');

          sections.forEach(sec => {
            const children = updated.filter(n => n.parentNode === sec.id && n.type === 'componentNode');
            if (children.length === 0) return;

            // Only fix clear overlaps without major repositioning
            for (let i = 0; i < children.length; i++) {
              for (let j = i + 1; j < children.length; j++) {
                const a = children[i];
                const b = children[j];
                const aPos = a.position as { x: number; y: number };
                const bPos = b.position as { x: number; y: number };
                const aW = (a.style?.width as number) ?? CARD_W;
                const aH = (a.style?.height as number) ?? CARD_H;
                const bW = (b.style?.width as number) ?? CARD_W;
                const bH = (b.style?.height as number) ?? CARD_H;

                // Only fix if there's a clear overlap (less than minimum gap)
                const overlap = !(aPos.x + aW + MIN_GAP <= bPos.x || bPos.x + bW + MIN_GAP <= aPos.x || aPos.y + aH + MIN_GAP <= bPos.y || bPos.y + bH + MIN_GAP <= aPos.y);

                if (overlap) {
                  // Move the second card slightly to avoid overlap
                  const sectionW = (sec.style?.width as number) ?? SECTION_WIDTH;
                  const innerW = sectionW - GAP * 2;

                  // Try moving horizontally first
                  if (aPos.x + aW + MIN_GAP + bW <= innerW) {
                    b.position = { x: aPos.x + aW + MIN_GAP, y: bPos.y } as any;
                  } else {
                    // Move vertically
                    b.position = { x: bPos.x, y: aPos.y + aH + MIN_GAP } as any;
                  }
                }
              }
            }
          });

          return updated;
        });
      }
    }, 300);
  };

  return (
    <div ref={wrapperRef} className="canvas-page" style={{ width: '100%', height: 'calc(100vh - var(--navbar-height))' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onPaneContextMenu={onPaneContextMenu}
        fitView
        fitViewOptions={{
          padding: 0.05,
          minZoom: 0.5,
          maxZoom: 1.2,
          includeHiddenNodes: false,
          nodes: nodes.filter(n => n.type === 'sectionNode').slice(0, 1), // Focus on first section only
        }}
        zoomOnScroll={zoomOnScroll}
        panOnScroll={panOnScroll}
        panOnScrollMode={PanOnScrollMode.Free}
        zoomOnDoubleClick={zoomOnDoubleClick}
      >
        {showMiniMap && (
          <MiniMap 
            nodeColor={(node) => {
              if (node.type === 'sectionNode') {
                return 'var(--color-border)';
              }
              return 'var(--color-primary)';
            }}
            maskColor="var(--color-bg-secondary)"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
            }}
          />
        )}
        {showControls && (
          <Controls 
            style={{
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
            }}
          />
        )}
        {showDots && <Background variant={BackgroundVariant.Dots} gap={16} size={1} />}
        {showGrid && <Background variant={BackgroundVariant.Lines} gap={20} size={1} />}
      </ReactFlow>

      {/* Canvas Context Menu */}
      {contextMenu.show && (
        <div
          className="fixed rounded-lg shadow-lg py-1 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            minWidth: '200px',
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-xs font-semibold border-b" style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
            Canvas Options
          </div>

          {/* Background Options */}
          <button
            className="w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              setShowDots(!showDots);
              setShowGrid(false);
              closeContextMenu();
            }}
          >
            <span>Show Dots</span>
            {showDots && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
          </button>

          <button
            className="w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              setShowGrid(!showGrid);
              setShowDots(false);
              closeContextMenu();
            }}
          >
            <span>Show Grid</span>
            {showGrid && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
          </button>

          <button
            className="w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              setShowDots(false);
              setShowGrid(false);
              closeContextMenu();
            }}
          >
            <span>Hide Background</span>
            {!showDots && !showGrid && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
          </button>

          <div className="border-t my-1" style={{ borderColor: 'var(--color-border)' }}></div>

          {/* UI Elements */}
          <button
            className="w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              setShowMiniMap(!showMiniMap);
              closeContextMenu();
            }}
          >
            <span>Show Mini Map</span>
            {showMiniMap && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
          </button>

          <button
            className="w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              setShowControls(!showControls);
              closeContextMenu();
            }}
          >
            <span>Show Controls</span>
            {showControls && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
          </button>

          <div className="border-t my-1" style={{ borderColor: 'var(--color-border)' }}></div>

          {/* Interaction Options */}
          <button
            className="w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              setZoomOnScroll(true);
              setPanOnScroll(false);
              closeContextMenu();
            }}
          >
            <span>Zoom on Scroll</span>
            {zoomOnScroll && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
          </button>

          <button
            className="w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              setPanOnScroll(true);
              setZoomOnScroll(false);
              closeContextMenu();
            }}
          >
            <span>Pan on Scroll</span>
            {panOnScroll && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
          </button>

          <button
            className="w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              setZoomOnDoubleClick(!zoomOnDoubleClick);
              closeContextMenu();
            }}
          >
            <span>Double-click Zoom</span>
            {zoomOnDoubleClick && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
          </button>

          <div className="border-t my-1" style={{ borderColor: 'var(--color-border)' }}></div>

          {/* Layout Options */}
          <button
            className="w-full px-3 py-2 text-left text-sm transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              if (confirm('Reset all manual card positions to auto-layout?')) {
                setManualPositions({});
                const key = `ui-wot-manual-positions-${window.location.pathname}`;
                localStorage.removeItem(key);
              }
              closeContextMenu();
            }}
          >
            <span>Reset Layout</span>
          </button>
        </div>
      )}

      {/* Edit Popup */}
      {editComponentId &&
        (() => {
          const comp = state.components.find(c => c.id === editComponentId);
          if (!comp) return null;
          const affordance = state.availableAffordances.find(a => a.key === comp.affordanceKey);
          const schema = getAttributeSchema(comp.uiComponent);
          const attributesList = Object.keys(schema);
          const attributesTypes = schema;
          const attributesValues: Record<string, string> = {} as any;
          attributesList.forEach(k => {
            const raw = comp.attributes?.[k];
            if (raw == null) attributesValues[k] = schema[k].type === 'boolean' ? 'false' : '';
            else attributesValues[k] = String(raw);
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
                const target = state.components.find(c => c.id === componentId);
                if (!target) return;
                const nextAttrs = { ...(target.attributes || {}) } as Record<string, string>;
                if (value === '' || value == null) delete nextAttrs[attrName];
                else nextAttrs[attrName] = value;
                dispatch({ type: 'UPDATE_COMPONENT', payload: { id: componentId, updates: { attributes: nextAttrs } } });
                const elHost = document.querySelector(`[data-component-id="${componentId}"]`);
                const el = elHost?.querySelector(target.uiComponent) as HTMLElement | null;
                if (el) {
                  const applyVal = (name: string, val: string | null | undefined) => {
                    if (val === '' || val == null) el.removeAttribute(name);
                    else el.setAttribute(name, val);
                  };
                  let out = value as string | undefined;
                  if (attrName === 'label') out = formatLabelText(value, { maxPerLine: 24, maxLines: 2 });
                  applyVal(attrName, out);
                }
              }}
              onVariantChange={(componentId, variant) => dispatch({ type: 'UPDATE_COMPONENT', payload: { id: componentId, updates: { variant } } })}
              onComponentClose={componentId => dispatch({ type: 'REMOVE_COMPONENT', payload: componentId })}
            />
          );
        })()}

      {/* Section Settings Popup */}
      {editSectionId &&
        (() => {
          const sid = editSectionId!;
          const name = sectionNames[sid] ?? state.tdInfos.find(t => t.id === sid)?.title ?? 'Section';
          const styles = sectionStyles[sid] || { bgColor: 'transparent', border: 'dashed' as const };
          const onSectionChange = (id: string, updates: { name?: string; styles?: { bgColor?: string; border?: 'dashed' | 'solid' | 'none' } }) => {
            if (updates.name !== undefined) setSectionNames(prev => ({ ...prev, [id]: updates.name! }));
            if (updates.styles) setSectionStyles(prev => ({ ...prev, [id]: { ...(prev[id] || { bgColor: 'transparent', border: 'dashed' as const }), ...updates.styles } }));
          };
          const onBulkAction = (id: string, action: 'hideWrappers' | 'showWrappers' | 'setVariant', payload?: { variant?: string }) => {
            const nodeSectionId = `sec:${id}`;
            const ids = nodes.filter(n => n.type === 'componentNode' && n.parentNode === nodeSectionId).map(n => n.id);
            if (action === 'hideWrappers') ids.forEach(cid => dispatch({ type: 'UPDATE_COMPONENT', payload: { id: cid, updates: { hideCard: true } } }));
            else if (action === 'showWrappers') ids.forEach(cid => dispatch({ type: 'UPDATE_COMPONENT', payload: { id: cid, updates: { hideCard: false } } }));
            else if (action === 'setVariant' && payload?.variant)
              ids.forEach(cid => dispatch({ type: 'UPDATE_COMPONENT', payload: { id: cid, updates: { variant: payload.variant } } }));
          };
          return (
            <EditPopup
              mode="section"
              sectionId={sid}
              sectionName={name}
              sectionStyles={styles}
              onClose={() => setEditSectionId(null)}
              onSectionChange={onSectionChange}
              onBulkAction={onBulkAction}
            />
          );
        })()}
    </div>
  );
}

function SectionNode({ id, data }: any) {
  const rf = useReactFlow();
  const resizing = useRef<{ startX: number; startY: number; w: number; h: number } | null>(null);
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const node = rf.getNode(id);
    const w = (node?.style?.width as number) ?? SECTION_WIDTH;
    const h = (node?.style?.height as number) ?? SECTION_HEIGHT;
    resizing.current = { startX: e.clientX, startY: e.clientY, w, h };
    // disable dragging while resizing
    rf.setNodes(prev => prev.map(n => (n.id === id ? { ...n, draggable: false } : n)));
    const move = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const dx = ev.clientX - resizing.current.startX;
      const dy = ev.clientY - resizing.current.startY;
      const nw = Math.max(320, resizing.current.w + dx);
      const nh = Math.max(160, resizing.current.h + dy);
      // Update size and reflow to preview layout in real-time
      rf.setNodes(prev => {
        const next = prev.map(n => (n.id === id ? { ...n, style: { ...n.style, width: nw, height: nh } } : { ...n }));
        return reflowAllSections(next);
      });
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      resizing.current = null;
      // re-enable dragging
      rf.setNodes(prev => prev.map(n => (n.id === id ? { ...n, draggable: true } : n)));
      // trigger reflow after final size
      rf.setNodes(prev => reflowAllSections(prev));
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: data?.styles?.bgColor || 'transparent',
        border: data?.styles?.border || `1px dashed var(--color-border)`,
        borderRadius: 8,
        position: 'relative',
      }}
    >
      {/* Section label always visible; controls only in edit mode */}
      <div style={{ position: 'absolute', left: GAP, top: -30, display: 'flex', alignItems: 'center', gap: 6, zIndex: 3 }}>
        <span
          className={`px-3 py-1 text-base font-heading font-semibold rounded shadow border ${data?.editMode ? 'section-drag-handle cursor-move' : 'nodrag nopan'}`}
          style={{
            backgroundColor: 'var(--color-bg-card)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        >
          {data?.title || 'Section'}
        </span>
        {data?.editMode && (
          <>
            <span
              className="nodrag nopan inline-flex items-center justify-center w-5 h-5 rounded cursor-pointer"
              title="Rename section"
              onClick={() => {
                const name = prompt('Rename section:', data?.title || '')?.trim();
                if (name) data?.onRename?.(data?.sectionId, name);
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
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
              className="nodrag nopan inline-flex items-center justify-center w-5 h-5 rounded cursor-pointer"
              title="Section settings"
              onClick={() => data?.onOpenSettings?.(data?.sectionId)}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
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
              className="nodrag nopan inline-flex items-center justify-center w-5 h-5 rounded cursor-pointer"
              title="Delete section"
              onClick={() => {
                if (confirm('Delete this section and its components?')) data?.onRemoveSection?.(data?.sectionId);
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          </>
        )}
      </div>
      {/* Resize handle only; drag anywhere else */}
      {data?.editMode && (
        <div
          className="nodrag nopan"
          onMouseDown={onMouseDown}
          style={{
            position: 'absolute',
            right: -6,
            bottom: -6,
            width: 14,
            height: 14,
            borderRadius: 4,
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            cursor: 'nwse-resize',
          }}
        />
      )}
    </div>
  );
}

function ComponentNode({ id, data }: any) {
  const rf = useReactFlow();
  const resizing = useRef<{ startX: number; startY: number; w: number; h: number } | null>(null);
  const size = data?.size || { w: CARD_W, h: CARD_H };
  // Auto-fit wrapper to custom element's shadow content so the card matches its true size
  useEffect(() => {
    if (!data?.comp?.id) return;
    const containerSel = `[data-component-id="${data.comp.id}"]`;
    let containerEl: HTMLElement | null = null;
    let childEl: HTMLElement | null = null; // the custom element with data-ui-el="1"
    let shadowInner: HTMLElement | null = null; // inner shadow content for intrinsic size

    const measure = () => {
      if (!containerEl || !childEl) return;
      const node = rf.getNode(id);
      if (!node) return;
      const curW = (node.style?.width as number) ?? size.w ?? CARD_W;
      const curH = (node.style?.height as number) ?? size.h ?? CARD_H;

      // Prefer measuring shadow content when available for accurate intrinsic size
      const baseRect = childEl.getBoundingClientRect();
      const innerRect = (shadowInner?.getBoundingClientRect && shadowInner.getBoundingClientRect()) || baseRect;
      const contRect = containerEl.getBoundingClientRect();
      const cs = getComputedStyle(containerEl);
      const padX = (parseFloat(cs.paddingLeft || '0') || 0) + (parseFloat(cs.paddingRight || '0') || 0);
      const padY = (parseFloat(cs.paddingTop || '0') || 0) + (parseFloat(cs.paddingBottom || '0') || 0);
      const contentW = contRect.width - padX;
      const contentH = contRect.height - padY;
      const needsW = innerRect.width - contentW > 1;
      const needsH = innerRect.height - contentH > 1;
      if (!needsW && !needsH) return;

      const FUDGE = 4; // slight extra beyond padding for visual gap
      let desiredW = needsW ? Math.ceil(innerRect.width + padX + FUDGE) : curW;
      const desiredH = needsH ? Math.ceil(innerRect.height + padY + FUDGE) : curH;

      // Constrain width growth to the available space in the current row to avoid forcing wraps
      try {
        const allNodes = (rf as any).getNodes ? (rf as any).getNodes() : [];
        const sectionId = node.parentNode as string | undefined;
        if (sectionId) {
          const secNode = rf.getNode(sectionId);
          const sw = (secNode?.style?.width as number) ?? SECTION_WIDTH;
          const innerW = sw - GAP * 2;
          const siblings = allNodes.filter((n: any) => n.type === 'componentNode' && n.parentNode === sectionId);
          const y0 = (node.position?.y as number) ?? 0;
          const rowTol = 12; // px tolerance to consider same row (accounts for tiny vertical drifts)
          const row = siblings.filter((s: any) => Math.abs(((s.position?.y as number) ?? 0) - y0) <= rowTol);
          row.sort((a: any, b: any) => ((a.position?.x as number) ?? 0) - ((b.position?.x as number) ?? 0));
          const idx = row.findIndex((s: any) => s.id === id);
          if (idx !== -1) {
            const x0 = (node.position?.x as number) ?? 0;
            const next = row[idx + 1];
            // if next exists, don’t intrude into its space; otherwise allow up to innerW
            const maxRight = next ? Math.max(GAP, ((next.position?.x as number) ?? 0) - MIN_GAP) : innerW;
            const maxAllowedW = Math.max(CARD_W, Math.max(0, maxRight - x0));
            // growth-only: don't shrink width here
            desiredW = Math.min(desiredW, Math.max(curW, maxAllowedW));
          }
        }
      } catch {}

      const minH = getMinCardHeight(data?.comp);
      const capW = Math.max(CARD_W, Math.min(desiredW, 1600));
      const capH = Math.max(minH, Math.min(desiredH, 1600));
      if (Math.abs(capW - curW) < 2 && Math.abs(capH - curH) < 2) return;

      // Apply size update and only adjust the parent section height; avoid full reflow now
      rf.setNodes(prev => {
        let sectionId: string | undefined;
        const next = prev.map(n => {
          if (n.id === id) {
            sectionId = (n.parentNode as string) || undefined;
            return { ...n, style: { ...n.style, width: capW, height: capH }, data: { ...n.data, size: { w: capW, h: capH } } } as any;
          }
          return n;
        });
        if (sectionId) {
          const secIdx = next.findIndex(n => n.id === sectionId);
          if (secIdx !== -1) {
            const children = next.filter(n => n.type === 'componentNode' && n.parentNode === sectionId);
            let maxBottom = GAP;
            for (const ch of children) {
              const h = (ch.style?.height as number) ?? CARD_H;
              const y = (ch.position?.y as number) ?? 0;
              maxBottom = Math.max(maxBottom, y + h + GAP);
            }
            const innerH = Math.max(SECTION_HEIGHT, maxBottom);
            next[secIdx] = { ...next[secIdx], style: { ...next[secIdx].style, height: innerH } } as any;
          }
        }
        return next;
      });
      // Live reflow after measurement (works in all modes)
      setTimeout(() => rf.setNodes((prev: Node[]) => reflowAllSections(prev)), 50);
    };

    const ro = new ResizeObserver(() => measure());
    const init = () => {
      containerEl = document.querySelector(containerSel) as HTMLElement | null;
      childEl = (containerEl?.querySelector('[data-ui-el="1"]') as HTMLElement) || null;
      shadowInner = (childEl as any)?.shadowRoot?.firstElementChild || null;
      if (!containerEl || !childEl) return;
      // Initial measurement after paint
      requestAnimationFrame(measure);
      // Observe subsequent size changes
      if (shadowInner instanceof HTMLElement) ro.observe(shadowInner);
      ro.observe(childEl);
      ro.observe(containerEl);
    };
    // Try now and after microtask in case CardContent just mounted
    init();
    const t = setTimeout(init, 50);
    return () => {
      clearTimeout(t);
      try {
        ro.disconnect();
      } catch {}
    };
  }, [id, rf, data?.comp?.id]);
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const node = rf.getNode(id);
    const w = (node?.style?.width as number) ?? size.w;
    const h = (node?.style?.height as number) ?? size.h;
    resizing.current = { startX: e.clientX, startY: e.clientY, w, h };
    // disable dragging of this node during resize
    rf.setNodes(prev => prev.map(n => (n.id === id ? { ...n, draggable: false } : n)));
    const move = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const dx = ev.clientX - resizing.current.startX;
      const dy = ev.clientY - resizing.current.startY;
      const minH = getMinCardHeight(data?.comp);
      const nw = Math.max(CARD_W, resizing.current.w + dx);
      const nh = Math.max(minH, resizing.current.h + dy);
      rf.setNodes(prev => prev.map(n => (n.id === id ? { ...n, style: { ...n.style, width: nw, height: nh }, data: { ...n.data, size: { w: nw, h: nh } } } : n)));
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      resizing.current = null;
      // re-enable dragging
      rf.setNodes(prev => prev.map(n => (n.id === id ? { ...n, draggable: true } : n)));
      // Reflow siblings in section if any
      rf.setNodes(prev => reflowAllSections(prev));
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };
  const hideWrapper = !!data?.comp?.hideCard;
  const isDragTarget = data?.dragHighlight === 'swap';

  return (
    <div
      className={hideWrapper ? 'relative w-full h-full' : 'rounded-lg shadow-sm border w-full h-full'}
      style={
        hideWrapper
          ? { position: 'relative', background: 'transparent', overflow: 'visible' }
          : {
              borderColor: isDragTarget ? '#3b82f6' : 'var(--color-border)',
              background: isDragTarget ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg-card)',
              position: 'relative',
              overflow: 'visible',
              boxShadow: isDragTarget ? '0 0 0 2px rgba(59, 130, 246, 0.3)' : undefined,
              transform: isDragTarget ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.2s ease',
            }
      }
    >
      {/* In edit mode, a transparent overlay lets you drag anywhere */}
      {data?.editMode && <div style={{ position: 'absolute', inset: 0, zIndex: 1 }} />}
      {data?.editMode && (
        <div className="absolute top-1 right-1 flex items-center gap-2 z-10">
          <span
            className="nodrag nopan inline-flex items-center justify-center w-6 h-6 rounded cursor-pointer"
            title="Edit"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              data?.onEdit?.(data?.comp?.id);
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
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
            className="nodrag nopan inline-flex items-center justify-center w-6 h-6 rounded cursor-pointer"
            title="Remove"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              if (data?.comp?.id) data?.onRemove?.(data.comp.id);
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        </div>
      )}
      {data?.editMode && (
        <div
          className="nodrag nopan"
          style={{
            position: 'absolute',
            right: 4,
            bottom: 4,
            width: 12,
            height: 12,
            border: '1px solid #64748b',
            background: 'white',
            borderRadius: 3,
            cursor: 'nwse-resize',
            zIndex: 2,
          }}
          onMouseDown={onMouseDown}
        />
      )}
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: 8,
          boxSizing: 'border-box',
          // Add scroll for object components
          overflow: data?.comp?.uiComponent?.toLowerCase().includes('object') || data?.comp?.affordanceKey?.includes('object') ? 'auto' : 'visible',
        }}
        data-component-id={data?.comp?.id}
      >
        {data?.comp ? <CardContent component={data.comp} tdInfos={data.tdInfos} /> : null}
      </div>
    </div>
  );
}

function reflowAllSections(prevNodes: Node[]): Node[] {
  const out = [...prevNodes];
  const sections = out.filter(n => n.type === 'sectionNode');

  for (const sec of sections) {
    const sw = (sec.style?.width as number) ?? SECTION_WIDTH;
    const children = out.filter(n => n.parentNode === sec.id && n.type === 'componentNode');

    if (children.length === 0) continue;

    // Use coordinate-based space tracking
    const innerW = sw - GAP * 2;
    const occupiedSpaces: Array<{ x: number; y: number; w: number; h: number }> = [];
    let maxBottom = GAP;

    const findBestPosition = (w: number, h: number): { x: number; y: number } => {
      const stepY = GAP;
      const stepX = 4; // Fine horizontal positioning for better packing

      for (let y = GAP; y <= maxBottom + GAP; y += stepY) {
        for (let x = GAP; x + w <= innerW; x += stepX) {
          const hasConflict = occupiedSpaces.some(
            occupied => !(x >= occupied.x + occupied.w || x + w + GAP <= occupied.x || y >= occupied.y + occupied.h || y + h + GAP <= occupied.y),
          );
          if (!hasConflict) return { x, y };
        }
      }
      return { x: GAP, y: maxBottom };
    };

    // Add overlap detection for reflow
    const fixOverlapsInReflow = () => {
      let fixed = false;
      for (let i = 0; i < children.length; i++) {
        for (let j = i + 1; j < children.length; j++) {
          const a = children[i];
          const b = children[j];
          const aPos = a.position as { x: number; y: number };
          const bPos = b.position as { x: number; y: number };
          const aW = (a.style?.width as number) ?? CARD_W;
          const aH = (a.style?.height as number) ?? getMinCardHeight((a as any)?.data?.comp);
          const bW = (b.style?.width as number) ?? CARD_W;
          const bH = (b.style?.height as number) ?? getMinCardHeight((b as any)?.data?.comp);

          const overlap = !(aPos.x + aW + MIN_GAP <= bPos.x || bPos.x + bW + MIN_GAP <= aPos.x || aPos.y + aH + MIN_GAP <= bPos.y || bPos.y + bH + MIN_GAP <= aPos.y);

          if (overlap) {
            const newPos = findBestPosition(bW, bH);
            b.position = { x: newPos.x, y: newPos.y } as any;
            occupiedSpaces.push({ x: newPos.x, y: newPos.y, w: bW + GAP, h: bH + GAP });
            maxBottom = Math.max(maxBottom, newPos.y + bH + GAP);
            fixed = true;
          }
        }
      }
      return fixed;
    };

    sortChildrenByLayoutOrder(children, (sec.id as string).replace(/^sec:/, ''));

    for (const child of children) {
      const w = (child.style?.width as number) ?? CARD_W;
      const h = (child.style?.height as number) ?? getMinCardHeight((child as any)?.data?.comp);
      const pos = findBestPosition(w, h);

      child.position = { x: pos.x, y: pos.y } as any;
      occupiedSpaces.push({ x: pos.x, y: pos.y, w: w + GAP, h: h + GAP });
      maxBottom = Math.max(maxBottom, pos.y + h + GAP);
    }

    // Fix any overlaps after initial positioning
    let attempts = 0;
    while (fixOverlapsInReflow() && attempts < 3) {
      attempts++;
    }

    sec.style = { ...sec.style, height: Math.max(SECTION_HEIGHT, maxBottom) } as any;
  }

  return out;
}

function sortChildrenByLayoutOrder(children: Node[], sectionId: string) {
  const order = layoutOrderGlobal[sectionId];
  children.sort((a, b) => {
    if (order && order.length) {
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      if (ia !== -1 || ib !== -1) {
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      }
    }
    // fallback to current reading order
    return a.position.y - b.position.y || a.position.x - b.position.x;
  });
}
