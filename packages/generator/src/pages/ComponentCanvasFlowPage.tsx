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

const SECTION_WIDTH = 640; // px default width for sections
const SECTION_HEIGHT = 360; // px default height for sections
const GAP = 24; // px gap between nodes
const CARD_W = 200; // default card width
const CARD_H = 140; // default card height

// Module-scope layout order to be used by helpers outside component scope
let layoutOrderGlobal: Record<string, string[]> = {};

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
  const [sectionNames, setSectionNames] = useState<Record<string, string>>({});
  const [sectionStyles, setSectionStyles] = useState<Record<string, { bgColor: string; border: 'dashed' | 'solid' | 'none' }>>({});
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [layoutOrder, setLayoutOrder] = useState<Record<string, string[]>>({});

  // Make the current order available to reflow helpers outside this component
  useEffect(() => {
    (layoutOrderGlobal as any) = layoutOrder;
  }, [layoutOrder]);

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

    // place sections in two columns to balance height
    const sectionIds = [...tdOrder];
    const cols = Math.max(1, Math.min(5, Math.floor((canvasWidth - GAP) / (SECTION_WIDTH + GAP))));
    const colX = Array.from({ length: cols }, (_, i) => i * (SECTION_WIDTH + GAP));
    const colY = Array.from({ length: cols }, () => 0);
    const result: Node[] = [];

    for (const sid of sectionIds) {
      const ids = bySection[sid] || [];
      if (ids.length === 0) continue;
      const col = colY[0] <= colY[1] ? 0 : 1;
      const x = colX[col];
      const y = colY[col];
      const sectionTitle = sid === '__unassigned__' ? 'Unassigned' : sectionNames[sid] ?? state.tdInfos.find(t => t.id === sid)?.title ?? 'Section';
      const styleConf = sectionStyles[sid] || { bgColor: 'transparent', border: 'dashed' as const };
      const borderCss = styleConf.border === 'none' ? 'none' : `1px ${styleConf.border} #94a3b8`;
      // We'll compute height as we place children; preserve existing pos/size if present
      const existing = nodesRef.current.find(n => n.id === `sec:${sid}`);
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
        style: { width: (existing?.style?.width as number) ?? SECTION_WIDTH, height: (existing?.style?.height as number) ?? SECTION_HEIGHT, borderRadius: 8 },
        draggable: editMode,
      };
      result.push(secNode);
      // pack components inside section as children
      let cx = GAP;
      let cy = GAP; // small top gap
      let rowH = 0;
      const innerW = SECTION_WIDTH - GAP * 2;
      const preIndex = result.length; // remember start index for children
      for (const id of ids) {
        const comp = state.components.find(c => c.id === id);
        if (!comp) continue;
        const existingChild = nodesRef.current.find(n => n.id === id);
        const w = (existingChild?.style?.width as number) ?? CARD_W;
        const h = (existingChild?.style?.height as number) ?? CARD_H;
        if (cx + w > innerW) {
          cx = GAP;
          cy += rowH + GAP;
        }
        const useExisting = existingChild && existingChild.parentNode === `sec:${sid}`;
        const position = useExisting ? (existingChild!.position as any) : ({ x: cx, y: cy } as any);
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
          position,
          style: { width: w, height: h },
          draggable: editMode,
        });
        if (!useExisting) {
          cx += w + GAP;
          rowH = Math.max(rowH, h);
        }
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
                  if (value === '' || value == null) el.removeAttribute(attrName);
                  else el.setAttribute(attrName, value);
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
  const contentObserverRef = useRef<ResizeObserver | null>(null);
  const lastAppliedRef = useRef<{ w: number; h: number } | null>(null);

  useEffect(() => {
    // Observe the actual ui-* element size and auto-grow the node to prevent cropping
    const compId = data?.comp?.id;
    if (!compId) return;
    const container = document.querySelector(`[data-component-id="${compId}"]`) as HTMLElement | null;
    if (!container) return;
    const host = (container.firstElementChild as HTMLElement | null) || null; // CardContent host
    if (!host) return;
    const target = (host.firstElementChild as HTMLElement | null) || host; // ui-* element or host itself

    const ro = new ResizeObserver(() => {
      const rect = target.getBoundingClientRect();
      // Minimal padding so borders/controls don't clip
      const pad = 12;
      const desiredW = Math.ceil(rect.width) + pad;
      const desiredH = Math.ceil(rect.height) + pad;
      const node = rf.getNode(id);
      const curW = (node?.style?.width as number) ?? size.w;
      const curH = (node?.style?.height as number) ?? size.h;
      // Only grow; do not shrink automatically to avoid layout jitter
      const nextW = Math.max(curW, desiredW);
      const nextH = Math.max(curH, desiredH);
      const last = lastAppliedRef.current;
      if (!last || last.w !== nextW || last.h !== nextH) {
        lastAppliedRef.current = { w: nextW, h: nextH };
        rf.setNodes(prev =>
          reflowAllSections(prev.map(n => (n.id === id ? { ...n, style: { ...n.style, width: nextW, height: nextH }, data: { ...n.data, size: { w: nextW, h: nextH } } } : n))),
        );
      }
    });
    contentObserverRef.current = ro;
    ro.observe(target);
    return () => {
      try {
        ro.disconnect();
      } catch {}
      contentObserverRef.current = null;
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
      const nw = Math.max(120, resizing.current.w + dx);
      const nh = Math.max(100, resizing.current.h + dy);
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
      <div style={{ width: '100%', height: '100%', overflow: 'visible' }} data-component-id={data?.comp?.id}>
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
    sortChildrenByLayoutOrder(children, (sec.id as string).replace(/^sec:/, ''));
    if (children.length === 0) continue;
    let cx = GAP;
    let cy = GAP;
    let rowH = 0;
    const innerW = sw - GAP * 2;
    let maxBottom = GAP;
    for (const child of children) {
      const w = (child.style?.width as number) ?? CARD_W;
      const h = (child.style?.height as number) ?? CARD_H;
      if (cx + w > innerW && cx > GAP) {
        cx = GAP;
        cy += rowH + GAP;
        rowH = 0;
      }
      child.position = { x: cx, y: cy } as any;
      cx += w + GAP;
      rowH = Math.max(rowH, h);
      maxBottom = Math.max(maxBottom, cy + h + GAP);
    }
    const innerH = Math.max(cy + rowH + GAP, maxBottom);
    sec.style = { ...sec.style, height: Math.max(SECTION_HEIGHT, innerH) } as any;
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
