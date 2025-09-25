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
const GAP = 24; // px gap between nodes
const MIN_GAP = 8; // minimal gap when squeezing a row to fit another card
const CARD_W = 250; // default card width (also min width)
const LAYOUT_CARD_W = 360; // nominal card width used only for section layout math
const CARD_H = 140; // default card height (min height is 130)

// Module-scope layout order to be used by helpers outside component scope
let layoutOrderGlobal: Record<string, string[]> = {};
// Layout lock flags used by helpers outside the component
let __lockLayoutSetting = false; // reflects the UI toggle
let __layoutPositionsLocked = false; // becomes true after initial settle when lock is enabled

// Enhanced reflow scheduler that waits for all components to fully load
let __componentsLoaded = new Set<string>();
let __totalComponents = 0;
let __arrangeTimeout: NodeJS.Timeout | null = null;



function scheduleArrangementAfterLoad(rf: ReturnType<typeof useReactFlow> | any, componentId: string, totalCount: number) {
  __componentsLoaded.add(componentId);
  __totalComponents = totalCount;
  
  // Clear any existing timeout
  if (__arrangeTimeout) {
    clearTimeout(__arrangeTimeout);
    __arrangeTimeout = null;
  }
  
  // If all components are loaded, arrange immediately
  if (__componentsLoaded.size >= __totalComponents && __totalComponents > 0) {
    console.log('All components loaded, arranging layout...');
    __arrangeTimeout = setTimeout(() => {
      try {
        rf.setNodes((prev: Node[]) => reflowAllSections(prev));
        if (__lockLayoutSetting) __layoutPositionsLocked = true;
      } catch {}
    }, 100);
  } else {
    // Wait a bit longer for remaining components
    __arrangeTimeout = setTimeout(() => {
      console.log(`Arranging layout (${__componentsLoaded.size}/${__totalComponents} components loaded)`);
      try {
        rf.setNodes((prev: Node[]) => reflowAllSections(prev));
        if (__lockLayoutSetting) __layoutPositionsLocked = true;
      } catch {}
    }, 2000); // Extended wait for slow components
  }
}

export function ComponentCanvasFlowPage() {
  const { state, dispatch } = useAppContext();
  const { setContent, clear } = useNavbar();
  const navigate = useNavigate();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
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
  const [lockLayout, setLockLayout] = useState<boolean>(true);
  const [sectionNames, setSectionNames] = useState<Record<string, string>>({});
  const [sectionStyles, setSectionStyles] = useState<Record<string, { bgColor: string; border: 'dashed' | 'solid' | 'none' }>>({});
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [layoutOrder, setLayoutOrder] = useState<Record<string, string[]>>({});

  // Make the current order available to reflow helpers outside this component
  useEffect(() => {
    (layoutOrderGlobal as any) = layoutOrder;
  }, [layoutOrder]);

  // Reflect lock toggle to module flags used by helper functions
  useEffect(() => {
    __lockLayoutSetting = !!lockLayout;
    if (!lockLayout) __layoutPositionsLocked = false;
  }, [lockLayout]);

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

    // place sections in multiple columns to balance height
    const sectionIds = [...tdOrder];
    let cols = Math.max(1, Math.min(5, Math.floor((canvasWidth - GAP) / (LAYOUT_CARD_W + GAP))));
    const activeSectionCount = sectionIds.filter(sid => (bySection[sid] || []).length > 0).length;
    if (activeSectionCount <= 1) cols = 1;
    const baseW = Math.max(1, Math.floor((canvasWidth - GAP * (cols - 1)) / cols));
    const singleTargetCols = 4; // aim for ~4 cards per row when only one section
    const singleTargetW = GAP * 2 + singleTargetCols * LAYOUT_CARD_W + (singleTargetCols - 1) * GAP;
    const secW = activeSectionCount <= 1 ? Math.max(320, Math.min(baseW, singleTargetW)) : Math.min(SECTION_WIDTH, Math.max(320, baseW));
    const colX = Array.from({ length: cols }, (_, i) => i * (secW + GAP));
    const colY = Array.from({ length: cols }, () => 0);
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
      const widthForSection = (existing?.style?.width as number) ?? secW;
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
        // Try to place at each y level with finer granularity
        const stepSize = Math.min(GAP, 12); // Smaller steps for better packing
        for (let y = GAP; y <= currentY + h + GAP; y += stepSize) {
          // For each y level, try placing from left to right
          for (let x = GAP; x + w <= innerW + GAP; x += stepSize) {
            const candidate = { x, y, w: w + GAP, h: h + GAP }; // Include gap in conflict check
            // Check if this position conflicts with any occupied space
            const hasConflict = occupiedSpaces.some(occupied => 
              !(candidate.x >= occupied.x + occupied.w ||
                candidate.x + candidate.w <= occupied.x ||
                candidate.y >= occupied.y + occupied.h ||
                candidate.y + candidate.h <= occupied.y)
            );
            if (!hasConflict && x + w <= innerW) {
              return { x, y };
            }
          }
        }
        // If no space found in existing rows, start a new row
        return { x: GAP, y: currentY };
      };

      const detectAndResolveOverlaps = () => {
        const placedNodes = result.slice(preIndex);
        let hasOverlaps = false;
        
        // Check for overlaps between all placed nodes
        for (let i = 0; i < placedNodes.length; i++) {
          for (let j = i + 1; j < placedNodes.length; j++) {
            const a = placedNodes[i];
            const b = placedNodes[j];
            const aPos = a.position as { x: number; y: number };
            const bPos = b.position as { x: number; y: number };
            const aW = (a.style?.width as number) ?? CARD_W;
            const aH = (a.style?.height as number) ?? CARD_H;
            const bW = (b.style?.width as number) ?? CARD_W;
            const bH = (b.style?.height as number) ?? CARD_H;
            
            // Check for overlap (with small buffer for gaps)
            const overlap = !(
              aPos.x + aW + MIN_GAP <= bPos.x ||
              bPos.x + bW + MIN_GAP <= aPos.x ||
              aPos.y + aH + MIN_GAP <= bPos.y ||
              bPos.y + bH + MIN_GAP <= aPos.y
            );
            
            if (overlap) {
              hasOverlaps = true;
              // Move the second node to a non-overlapping position
              const newPos = findBestPosition(bW, bH);
              b.position = { x: newPos.x, y: newPos.y } as any;
              occupiedSpaces.push({ x: newPos.x, y: newPos.y, w: bW + GAP, h: bH + GAP });
              currentY = Math.max(currentY, newPos.y + bH + GAP);
            }
          }
        }
        
        return hasOverlaps;
      };

      while (queue.length) {
        const id = queue.shift()!;
        const comp = state.components.find(c => c.id === id);
        if (!comp) continue;
        
        const existingChild = nodesRef.current.find(n => n.id === id);
        const w = (existingChild?.style?.width as number) ?? CARD_W;
        const h = (existingChild?.style?.height as number) ?? CARD_H;
        
        const pos = findBestPosition(w, h);
        
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
      
      // After initial placement, detect and resolve any overlaps
      let attempts = 0;
      while (detectAndResolveOverlaps() && attempts < 3) {
        attempts++;
        console.log(`Resolving overlaps (attempt ${attempts})`);
      }
      // adjust section height to enclose children using actual child bounds
      const children = result.slice(preIndex);
      let maxBottom = GAP;
      if (children.length) {
        for (const ch of children) {
          const h = (ch.style?.height as number) ?? CARD_H;
          const y = (ch.position?.y as number) ?? 0;
          maxBottom = Math.max(maxBottom, y + h + GAP);
        }
      } else {
        maxBottom = SECTION_HEIGHT;
      }
      secNode.style = { ...secNode.style, height: Math.max(SECTION_HEIGHT, maxBottom) } as any;
      // stack using the section's current or computed height
      const stackH = (existing?.style?.height as number) ?? (Number((secNode.style as any)?.height) || SECTION_HEIGHT);
      colY[col] += stackH + GAP;
    }

    // Fallback: components without any section create standalone nodes so page never blanks
    const unassigned = bySection['__unassigned__'] || [];
    for (const id of unassigned) {
      if (result.find(n => n.id === id)) continue;
      const comp = state.components.find(c => c.id === id);
      if (!comp) continue;
      const existingFree = nodesRef.current.find(n => n.id === id && !n.parentNode);
      const w = (existingFree?.style?.width as number) ?? CARD_W;
      const h = (existingFree?.style?.height as number) ?? CARD_H;
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
  }, [state.components, state.tdInfos, membership, editMode, dispatch, sectionNames, sectionStyles, layoutOrder, canvasWidth]);

  useEffect(() => {
    setNodes(buildNodes);
  }, [buildNodes, setNodes]);

  // Enhanced post-mount: wait for all components to load before arranging
  useEffect(() => {
    if (nodes.length === 0) return;
    
    // Reset tracking for new layout
    __componentsLoaded.clear();
    __totalComponents = state.components.length;
    
    // Don't arrange immediately - let components load first
    // The arrangement will be triggered from ComponentNode measurement effects
    console.log(`Waiting for ${__totalComponents} components to load...`);
    
    return () => {
      if (__arrangeTimeout) {
        clearTimeout(__arrangeTimeout);
        __arrangeTimeout = null;
      }
    };
  }, [nodes.length, state.components.length, setNodes]);

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
          <label
            className="flex items-center gap-2 border rounded-lg px-2 py-1 cursor-pointer select-none transition-colors"
            title="Lock card positions after first layout"
            style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <input type="checkbox" checked={lockLayout} onChange={e => setLockLayout(e.target.checked)} />
            <span className="text-xs font-heading">Lock layout</span>
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
  }, [setContent, clear, navigate, editMode, tdSummary, state, dispatch, lockLayout]);

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

  // Drag preview state
  const dragRef = useRef<{
    activeId: string | null;
    baseline: Node[];
  } | null>(null);

  const onNodeDragStart = (_: any, node: any) => {
    if (!editMode) return;
    if (!node || node.type !== 'componentNode') return;
    dragRef.current = { activeId: node.id, baseline: nodes.map(n => ({ ...n, position: { ...n.position } })) };
  };

  const onNodeDrag = (_: any, node: any) => {
    if (!editMode) return;
    if (!node || node.type !== 'componentNode') return;
    if (!dragRef.current || dragRef.current.activeId !== node.id) return;
    const baseline = dragRef.current.baseline;

    // Determine target section under cursor (absolute center)
    const sections = baseline.filter(n => n.type === 'sectionNode');
    const getNodeSize = (n: Node) => ({
      w: (n.style?.width as number) ?? (n.data?.size?.w as number) ?? (n.data?.size?.width as number) ?? CARD_W,
      h: (n.style?.height as number) ?? (n.data?.size?.h as number) ?? (n.data?.size?.height as number) ?? CARD_H,
    });

    const draggedSize = getNodeSize(node);
    const absPt = { x: node.positionAbsolute?.x ?? node.position.x, y: node.positionAbsolute?.y ?? node.position.y };
    const center = { x: absPt.x + draggedSize.w / 2, y: absPt.y + draggedSize.h / 2 };
    let targetSection: Node | null = null;
    for (const sec of sections) {
      const sw = (sec.style?.width as number) ?? SECTION_WIDTH;
      const sh = (sec.style?.height as number) ?? SECTION_HEIGHT;
      const rect = { x: sec.position.x, y: sec.position.y, w: sw, h: sh };
      if (center.x >= rect.x && center.x <= rect.x + rect.w && center.y >= rect.y && center.y <= rect.y + rect.h) {
        targetSection = sec;
        break;
      }
    }

    const next: Node[] = baseline.map(n => ({ ...n }));

    // Helper to pack a section's children around a fixed node
    const packSection = (sec: Node, fixed: { id: string; x: number; y: number; w: number; h: number } | null) => {
      const sw = (sec.style?.width as number) ?? SECTION_WIDTH;
      const innerW = sw - GAP * 2;
      const children = next.filter(n => n.type === 'componentNode' && n.parentNode === sec.id);
      sortChildrenByLayoutOrder(children, (sec.id as string).replace(/^sec:/, ''));
      let cx = GAP;
      let cy = GAP;
      let rowH = 0;
      for (const ch of children) {
        if (fixed && ch.id === fixed.id) {
          // ensure fixed is inside bounds
          ch.position = { x: Math.max(GAP, Math.min(innerW - fixed.w, fixed.x)), y: Math.max(GAP, fixed.y) } as any;
          rowH = Math.max(rowH, fixed.h);
          continue;
        }
        const sz = getNodeSize(ch);
        // wrap if needed
        if (cx + sz.w > innerW && cx > GAP) {
          cx = GAP;
          cy += rowH + GAP;
          rowH = 0;
        }
        // avoid colliding with fixed
        if (fixed) {
          const overlapsVert = !(cy + sz.h <= fixed.y || fixed.y + fixed.h <= cy);
          const wouldOverlapHoriz = !(cx + sz.w <= fixed.x || fixed.x + fixed.w <= cx);
          if (overlapsVert && wouldOverlapHoriz) {
            // move to right of fixed
            const newCx = fixed.x + fixed.w + GAP;
            if (newCx + sz.w <= innerW) {
              cx = newCx;
            } else {
              // wrap row
              cx = GAP;
              cy += rowH + GAP;
              rowH = 0;
            }
          }
        }
        ch.position = { x: cx, y: cy } as any;
        cx += sz.w + GAP;
        rowH = Math.max(rowH, sz.h);
      }
      // set section height to enclose children
      const innerH = cy + rowH + GAP;
      next.forEach(n => {
        if (n.id === sec.id) n.style = { ...n.style, height: Math.max(SECTION_HEIGHT, innerH) } as any;
      });
    };

    // Case A: Dragging within a section (current or entering targetSection)
    if (targetSection) {
      // Remove from any previous parent in preview and attach to target section for preview
      const idx = next.findIndex(n => n.id === node.id);
      if (idx !== -1) {
        next[idx].parentNode = targetSection.id as any;
        const rel = { x: absPt.x - targetSection.position.x, y: absPt.y - targetSection.position.y };
        const fixed = { id: node.id, x: rel.x, y: rel.y, w: draggedSize.w, h: draggedSize.h };
        // Pack target section with fixed node
        packSection(targetSection, fixed);
      }
      // Reflow all other sections without changes
    } else {
      // Not over a section: if it had a parent, preview leaving it by reflowing that section without the dragged
      const draggedInBaseline = baseline.find(n => n.id === node.id);
      const prevParentId = draggedInBaseline?.parentNode as string | undefined;
      if (prevParentId) {
        const sec = next.find(n => n.id === prevParentId);
        if (sec) {
          // Temporarily remove dragged from this section for preview
          const idx = next.findIndex(n => n.id === node.id);
          if (idx !== -1) next[idx].parentNode = undefined as any;
          packSection(sec as any, null);
        }
      }
      // Allow free dragging outside; do not pack global canvas
    }

    setNodes(next);
  };

  const onNodeDragStop = (_: any, node: any) => {
    // If dragging a component node, detect if it should join/leave a section
    if (!node || node.type !== 'componentNode') return;
    setNodes(prev => {
      const sections = prev.filter(n => n.type === 'sectionNode');
      const pt = { x: node.positionAbsolute?.x ?? node.position.x, y: node.positionAbsolute?.y ?? node.position.y };
      let target: any = null;
      for (const sec of sections) {
        const sw = (sec.style?.width as number) ?? SECTION_WIDTH;
        const sh = (sec.style?.height as number) ?? SECTION_HEIGHT;
        const rect = { x: sec.position.x, y: sec.position.y, w: sw, h: sh };
        // if center is inside
        const cx = pt.x + ((node.style?.width as number) ?? CARD_W) / 2;
        const cy = pt.y + ((node.style?.height as number) ?? CARD_H) / 2;
        if (cx >= rect.x && cx <= rect.x + rect.w && cy >= rect.y && cy <= rect.y + rect.h) {
          target = sec;
          break;
        }
      }
      let next = prev.map(n => ({ ...n }));
      // Helper to pack a section with fixed dropped node
      const packCommit = (sec: Node, fixedNode: Node, fixedAbs: { x: number; y: number }) => {
        const sw = (sec.style?.width as number) ?? SECTION_WIDTH;
        const innerW = sw - GAP * 2;
        const rel = { x: fixedAbs.x - sec.position.x, y: fixedAbs.y - sec.position.y };
        const fw = (fixedNode.style?.width as number) ?? CARD_W;
        const fh = (fixedNode.style?.height as number) ?? CARD_H;
        const fixed = { id: fixedNode.id, x: Math.max(GAP, Math.min(innerW - fw, rel.x)), y: Math.max(GAP, rel.y), w: fw, h: fh };
        // attach fixed to section
        next = next.map(n => (n.id === fixedNode.id ? ({ ...n, parentNode: sec.id, position: { x: fixed.x, y: fixed.y } } as any) : n));
        // pack others
        let cx = GAP;
        let cy = GAP;
        let rowH = 0;
        const children = next.filter(n => n.type === 'componentNode' && n.parentNode === sec.id);
        // honor stored layout order; keep fixed in sequence where it falls by order
        sortChildrenByLayoutOrder(children, (sec.id as string).replace(/^sec:/, ''));
        for (const ch of children) {
          if (ch.id === fixed.id) {
            rowH = Math.max(rowH, fixed.h);
            continue;
          }
          const w = (ch.style?.width as number) ?? CARD_W;
          const h = (ch.style?.height as number) ?? CARD_H;
          if (cx + w > innerW && cx > GAP) {
            cx = GAP;
            cy += rowH + GAP;
            rowH = 0;
          }
          // avoid fixed
          const overlapsVert = !(cy + h <= fixed.y || fixed.y + fixed.h <= cy);
          const wouldOverlapHoriz = !(cx + w <= fixed.x || fixed.x + fixed.w <= cx);
          if (overlapsVert && wouldOverlapHoriz) {
            const newCx = fixed.x + fixed.w + GAP;
            if (newCx + w <= innerW) cx = newCx;
            else {
              cx = GAP;
              cy += rowH + GAP;
              rowH = 0;
            }
          }
          ch.position = { x: cx, y: cy } as any;
          cx += w + GAP;
          rowH = Math.max(rowH, h);
        }
        const innerH = Math.max(cy + rowH + GAP, fixed.y + fixed.h + GAP);
        next = next.map(n => (n.id === sec.id ? ({ ...n, style: { ...n.style, height: Math.max(SECTION_HEIGHT, innerH) } } as any) : n));
      };

      const draggedNode = next.find(n => n.id === node.id)!;
      if (target) {
        packCommit(target as Node, draggedNode as Node, pt);
        // persist membership to target section
        const secId = (target.id as string).replace(/^sec:/, '');
        setMembership(m => ({ ...m, [node.id]: secId }));
        // Recalculate and persist user sequence for the target section
        const order = computeSectionOrder(next, target.id as string);
        setLayoutOrder(prev => {
          const n = { ...prev, [secId]: order };
          layoutOrderGlobal = n;
          return n;
        });
      } else {
        // leaving section: keep absolute pos and reflow previous parent if any
        const prevParentId = draggedNode.parentNode as string | undefined;
        next = next.map(n => (n.id === node.id ? ({ ...n, parentNode: undefined, position: { x: pt.x, y: pt.y } } as any) : n));
        setMembership(m => ({ ...m, [node.id]: null }));
        if (prevParentId) {
          const sec = next.find(n => n.id === prevParentId);
          if (sec) {
            // pack without fixed
            let cx = GAP,
              cy = GAP,
              rowH = 0;
            const sw = (sec.style?.width as number) ?? SECTION_WIDTH;
            const innerW = sw - GAP * 2;
            const children = next.filter(n => n.type === 'componentNode' && n.parentNode === sec.id);
            sortChildrenByLayoutOrder(children, (sec.id as string).replace(/^sec:/, ''));
            for (const ch of children) {
              const w = (ch.style?.width as number) ?? CARD_W;
              const h = (ch.style?.height as number) ?? CARD_H;
              if (cx + w > innerW && cx > GAP) {
                cx = GAP;
                cy += rowH + GAP;
                rowH = 0;
              }
              ch.position = { x: cx, y: cy } as any;
              cx += w + GAP;
              rowH = Math.max(rowH, h);
            }
            const innerH = cy + rowH + GAP;
            next = next.map(n => (n.id === sec.id ? ({ ...n, style: { ...n.style, height: Math.max(SECTION_HEIGHT, innerH) } } as any) : n));
            // Update order for the source section after removal
            const sourceSecId = (sec.id as string).replace(/^sec:/, '');
            const order = computeSectionOrder(next, sec.id as string);
            setLayoutOrder(prev => {
              const n = { ...prev, [sourceSecId]: order };
              layoutOrderGlobal = n;
              return n;
            });
          }
        }
      }
      // Snapshot committed layout so buildNodes can preserve positions
      try {
        nodesRef.current = next.map(n => ({ ...n, position: { ...n.position } as any }));
      } catch {}
      return next;
    });
    dragRef.current = null;
  };

  const onNodesChangeWithArrange = (changes: any) => {
    // Let React Flow update positions; avoid global reflow here
    // We explicitly reflow after resizes and in drag/drop handlers
    onNodesChange(changes);
  };

  return (
    <div ref={wrapperRef} className="canvas-page" style={{ width: '100%', height: 'calc(100vh - var(--navbar-height))' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeWithArrange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        fitView
        zoomOnScroll={false}
        panOnScroll={true}
        panOnScrollMode={PanOnScrollMode.Free}
      >
        <MiniMap />
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>

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
        border: data?.styles?.border || '1px dashed #94a3b8',
        borderRadius: 8,
        position: 'relative',
      }}
    >
      {/* Section label always visible; controls only in edit mode */}
      <div style={{ position: 'absolute', left: GAP, top: -22, display: 'flex', alignItems: 'center', gap: 6, zIndex: 3 }}>
        <span
          className="nodrag nopan px-2 py-0.5 text-primary text-xs font-heading rounded shadow border"
          style={{ backgroundColor: 'var(--color-bg-card)', borderColor: '#94a3b8' }}
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
          style={{ position: 'absolute', right: -6, bottom: -6, width: 14, height: 14, borderRadius: 4, background: 'white', border: '1px solid #64748b', cursor: 'nwse-resize' }}
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
            const maxRight = next ? Math.max(GAP, (((next.position?.x as number) ?? 0) - MIN_GAP)) : innerW;
            const maxAllowedW = Math.max(CARD_W, Math.max(0, maxRight - x0));
            // growth-only: don't shrink width here
            desiredW = Math.min(desiredW, Math.max(curW, maxAllowedW));
          }
        }
      } catch {}

      const capW = Math.max(CARD_W, Math.min(desiredW, 1600));
      const capH = Math.max(CARD_H, Math.min(desiredH, 1600));
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
      // Signal that this component is loaded and measured
      scheduleArrangementAfterLoad(rf, id, __totalComponents);
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
      const nw = Math.max(CARD_W, resizing.current.w + dx);
      const nh = Math.max(CARD_H, resizing.current.h + dy);
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
  return (
    <div
      className={hideWrapper ? 'relative w-full h-full' : 'rounded-lg shadow-sm border w-full h-full'}
      style={
        hideWrapper
          ? { position: 'relative', background: 'transparent', overflow: 'visible' }
          : { borderColor: 'var(--color-border)', background: 'var(--color-bg-card)', position: 'relative', overflow: 'visible' }
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
      <div style={{ width: '100%', height: '100%', padding: 8, boxSizing: 'border-box' }} data-component-id={data?.comp?.id}>
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
    if (__layoutPositionsLocked) {
      // Do not reposition; only update section height to fit current child bounds
      let maxBottom = GAP;
      for (const ch of children) {
        const h = (ch.style?.height as number) ?? CARD_H;
        const y = (ch.position?.y as number) ?? 0;
        maxBottom = Math.max(maxBottom, y + h + GAP);
      }
      const innerH = Math.max(SECTION_HEIGHT, maxBottom);
      sec.style = { ...sec.style, height: innerH } as any;
    } else {
      sortChildrenByLayoutOrder(children, (sec.id as string).replace(/^sec:/, ''));
      if (children.length === 0) continue;
      
      const innerW = sw - GAP * 2;
      
      // Use coordinate-based space tracking for optimal packing
      type SpaceRect = { x: number; y: number; w: number; h: number };
      const occupiedSpaces: SpaceRect[] = [];
      let maxBottom = GAP;
      
      const findBestPosition = (w: number, h: number): { x: number; y: number } => {
        // Try to place at each y level with finer granularity
        const stepSize = Math.min(GAP, 12);
        for (let y = GAP; y <= maxBottom + GAP; y += stepSize) {
          // For each y level, try placing from left to right
          for (let x = GAP; x + w <= innerW + GAP; x += stepSize) {
            const candidate = { x, y, w: w + GAP, h: h + GAP };
            // Check if this position conflicts with any occupied space
            const hasConflict = occupiedSpaces.some(occupied => 
              !(candidate.x >= occupied.x + occupied.w ||
                candidate.x + candidate.w <= occupied.x ||
                candidate.y >= occupied.y + occupied.h ||
                candidate.y + candidate.h <= occupied.y)
            );
            if (!hasConflict && x + w <= innerW) {
              return { x, y };
            }
          }
        }
        // If no space found in existing area, place at bottom
        return { x: GAP, y: maxBottom };
      };

      const detectOverlapsInReflow = (): boolean => {
        let hasOverlaps = false;
        
        // Check for overlaps between all children
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
            
            // Check for overlap
            const overlap = !(
              aPos.x + aW + MIN_GAP <= bPos.x ||
              bPos.x + bW + MIN_GAP <= aPos.x ||
              aPos.y + aH + MIN_GAP <= bPos.y ||
              bPos.y + bH + MIN_GAP <= aPos.y
            );
            
            if (overlap) {
              hasOverlaps = true;
              // Move the second node to a non-overlapping position
              const newPos = findBestPosition(bW, bH);
              b.position = { x: newPos.x, y: newPos.y } as any;
              occupiedSpaces.push({ x: newPos.x, y: newPos.y, w: bW + GAP, h: bH + GAP });
              maxBottom = Math.max(maxBottom, newPos.y + bH + GAP);
            }
          }
        }
        
        return hasOverlaps;
      };
      
      for (const child of children) {
        const w = (child.style?.width as number) ?? CARD_W;
        const h = (child.style?.height as number) ?? CARD_H;
        
        const pos = findBestPosition(w, h);
        child.position = { x: pos.x, y: pos.y } as any;
        
        // Mark this space as occupied
        occupiedSpaces.push({ x: pos.x, y: pos.y, w: w + GAP, h: h + GAP });
        
        // Update maxBottom to track the bottom-most occupied space
        maxBottom = Math.max(maxBottom, pos.y + h + GAP);
      }
      
      // After positioning, detect and resolve any overlaps
      let attempts = 0;
      while (detectOverlapsInReflow() && attempts < 3) {
        attempts++;
        console.log(`Resolving reflow overlaps (attempt ${attempts})`);
      }
      
      const innerH = Math.max(SECTION_HEIGHT, maxBottom);
      sec.style = { ...sec.style, height: innerH } as any;
    }
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

function computeSectionOrder(nodes: Node[], sectionNodeId: string): string[] {
  const children = nodes.filter(n => n.type === 'componentNode' && n.parentNode === sectionNodeId);
  children.sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
  return children.map(n => n.id);
}
