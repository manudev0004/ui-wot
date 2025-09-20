import { useEffect, useMemo, useRef, useState } from 'react';
import { GridStack, GridStackWidget } from 'gridstack';
import 'gridstack/dist/dd-gridstack';
import 'gridstack/dist/gridstack.min.css';

type Card = { id: string; title: string; x?: number; y?: number; w?: number; h?: number };
type Section = { id: string; title: string; x: number; y: number; w: number; h: number };

export function LovelaceLikeDemo() {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const gridApi = useRef<GridStack | null>(null);
  const [snap, setSnap] = useState(true);
  const [cards, setCards] = useState<Card[]>([
    { id: 'c1', title: 'Served Counter', w: 6, h: 4 },
    { id: 'c2', title: 'Maintenance', w: 6, h: 4 },
    { id: 'c3', title: 'Resources', w: 6, h: 4 },
    { id: 'c4', title: 'Schedule', w: 6, h: 4 },
  ]);
  const [editSections, setEditSections] = useState(false);
  const [sections] = useState<Section[]>([
    { id: 's1', title: 'Machine A', x: 0, y: 0, w: 24, h: 10 },
    { id: 's2', title: 'Machine B', x: 0, y: 11, w: 24, h: 10 },
  ]);

  // Initialize single GridStack
  useEffect(() => {
    if (!gridRef.current) return;
    const grid = GridStack.init(
      {
        column: 24,
        cellHeight: snap ? 70 : 16,
        margin: snap ? 16 : 8,
        float: false,
        disableDrag: false,
        disableResize: false,
      },
      gridRef.current,
    );
    gridApi.current = grid;

    // compact once
    requestAnimationFrame(() => {
      try {
        grid.compact();
      } catch {}
    });

    // cleanup
    return () => {
      grid.destroy(false);
      gridApi.current = null;
    };
  }, [snap]);

  // Save current layout to JSON
  const saveLayout = () => {
    const grid = gridApi.current;
    if (!grid) return;
    const nodes = grid.engine.nodes;
    const data = nodes.filter(n => (n.el?.getAttribute('data-type') || 'card') === 'card').map(n => ({ id: n.id as string, x: n.x, y: n.y, w: n.w, h: n.h }));
    localStorage.setItem('lovelace-demo-layout', JSON.stringify(data));
  };

  // Restore layout from JSON
  const loadLayout = () => {
    const grid = gridApi.current;
    if (!grid) return;
    const raw = localStorage.getItem('lovelace-demo-layout');
    if (!raw) return;
    const data: Array<{ id: string; x: number; y: number; w: number; h: number }> = JSON.parse(raw);
    data.forEach(item => {
      const el = grid.engine.nodes.find(n => n.id === item.id)?.el as HTMLElement | undefined;
      if (el) grid.update(el, { x: item.x, y: item.y, w: item.w, h: item.h } as GridStackWidget);
    });
    try {
      grid.compact();
    } catch {}
  };

  // Reset layout (auto-position)
  const resetLayout = () => {
    const grid = gridApi.current;
    if (!grid) return;
    grid.engine.nodes.forEach(n => {
      const isCard = (n.el?.getAttribute('data-type') || 'card') === 'card';
      if (isCard && n.el) grid.update(n.el, { x: undefined, y: undefined, autoPosition: true } as GridStackWidget);
    });
    try {
      grid.compact();
    } catch {}
  };

  const header = useMemo(
    () => (
      <div className="flex items-center gap-2 mb-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} />
          <span>Snap to grid</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={editSections} onChange={e => setEditSections(e.target.checked)} />
          <span>Edit sections</span>
        </label>
        <button className="px-2 py-1 border rounded" onClick={saveLayout}>
          Save
        </button>
        <button className="px-2 py-1 border rounded" onClick={loadLayout}>
          Load
        </button>
        <button className="px-2 py-1 border rounded" onClick={resetLayout}>
          Auto-arrange
        </button>
        <button
          className="px-2 py-1 border rounded"
          onClick={() =>
            setCards(prev => {
              const id = `c${prev.length + 1}`;
              return [...prev, { id, title: `Card ${prev.length + 1}`, w: 6, h: 4 }];
            })
          }
        >
          Add Card
        </button>
      </div>
    ),
    [snap, editSections],
  );

  return (
    <div className="p-3">
      <h2 className="text-lg mb-2">Lovelace-like Grid Demo</h2>
      {header}
      <div className="grid-stack" ref={gridRef} style={{ position: 'relative' }}>
        {/* Sections as background overlays in the same grid (no drag, no resize) */}
        {sections.map(s => (
          <div
            key={s.id}
            className="grid-stack-item"
            data-type="section"
            gs-x={s.x as any}
            gs-y={s.y as any}
            gs-w={s.w as any}
            gs-h={s.h as any}
            gs-no-move={editSections ? 'false' : 'true'}
            gs-no-resize={editSections ? 'false' : 'true'}
            gs-locked={editSections ? 'false' : 'true'}
          >
            <div
              className="grid-stack-item-content"
              style={{
                background: 'transparent',
                outline: '1px dashed #cfe3e0',
                borderRadius: 8,
                zIndex: 0,
                pointerEvents: editSections ? 'auto' : 'none',
                display: 'flex',
                alignItems: 'flex-start',
                padding: 8,
              }}
            >
              <span style={{ fontSize: 12, opacity: 0.5, background: '#fff', padding: '2px 6px', borderRadius: 4 }}>{s.title}</span>
            </div>
          </div>
        ))}

        {/* Cards in the same grid, fully draggable/resizable and movable anywhere */}
        {cards.map(c => (
          <div
            key={c.id}
            className="grid-stack-item"
            data-type="card"
            data-id={c.id}
            gs-w={(c.w || 6) as any}
            gs-h={(c.h || 4) as any}
            gs-x={(c.x ?? undefined) as any}
            gs-y={(c.y ?? undefined) as any}
            gs-auto-position={c.x == null || c.y == null ? 'true' : 'false'}
          >
            <div
              className="grid-stack-item-content"
              style={{
                background: '#fff',
                border: '1px solid #0aa394',
                borderRadius: 8,
                zIndex: 1,
                padding: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 120,
              }}
            >
              <span>{c.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
