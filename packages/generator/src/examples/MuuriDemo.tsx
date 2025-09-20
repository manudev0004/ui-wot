/* Minimal Muuri demo: editable sections (multiple grids), cross-section drag/drop,
   resizable cards, save/restore, and optional snap approximation. */
import { useEffect, useMemo, useRef, useState } from 'react';

declare global {
  interface Window {
    Muuri?: any;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load script')));
      // If it already loaded
      if ((existing as any).loaded) return resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.defer = true;
    s.onload = () => {
      (s as any).loaded = true;
      resolve();
    };
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

type Section = { id: string; title: string };
type SavedCard = { id: string; title: string; sectionId: string; w: number; h: number };

export function MuuriDemo() {
  const sectionsWrapperRef = useRef<HTMLDivElement | null>(null);
  const sectionsGridRef = useRef<any | null>(null);
  const gridsRef = useRef<Map<string, any>>(new Map());
  const [sections, setSections] = useState<Section[]>([
    { id: 'sec-1', title: 'Section A' },
    { id: 'sec-2', title: 'Section B' },
  ]);
  const [snap, setSnap] = useState(false);
  const [targetSection, setTargetSection] = useState('sec-1');

  const allGrids = () => Array.from(gridsRef.current.values());

  // Initialize Muuri after script load
  useEffect(() => {
    (async () => {
      if (!window.Muuri) {
        await loadScript('https://cdn.jsdelivr.net/npm/muuri@0.9.5/dist/muuri.min.js');
      }
      initOrUpdateGrids();
    })();
    // cleanup on unmount
    return () => {
      gridsRef.current.forEach(g => g.destroy?.());
      gridsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-init if sections change (add/remove)
  useEffect(() => {
    if (!window.Muuri) return;
    initOrUpdateGrids();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, snap]);

  const initOrUpdateGrids = () => {
    const Muuri = window.Muuri!;

    // Initialize or refresh parent sections grid
    if (sectionsWrapperRef.current) {
      if (!sectionsGridRef.current) {
        sectionsGridRef.current = new Muuri(sectionsWrapperRef.current, {
          dragEnabled: true,
          dragHandle: '.section-drag-handle',
          layoutDuration: 300,
          dragReleaseDuration: 200,
        });
      } else {
        sectionsGridRef.current.refreshItems().layout();
      }
    }

    // Initialize or refresh per-section item grids
    const wrappers = sectionsWrapperRef.current?.querySelectorAll('[data-section-id]') || [];

    wrappers.forEach(container => {
      const id = (container as HTMLElement).dataset.sectionId!;
      let grid = gridsRef.current.get(id);
      if (!grid) {
        grid = new Muuri(container, {
          dragEnabled: true,
          dragSort: () => allGrids(),
          layoutDuration: 300,
          dragReleaseDuration: 200,
          dragHandle: '.card-header',
        });
        gridsRef.current.set(id, grid);
      } else {
        grid.refreshItems().layout();
      }
    });

    // expose map globally for remove handlers
    (window as any).__muuri_grids_map = gridsRef.current;
  };

  // Enable section resizers
  useEffect(() => {
    const container = sectionsWrapperRef.current;
    if (!container) return;
    const resizers = Array.from(container.querySelectorAll('.section-resizer')) as HTMLElement[];
    const moveHandlers: Array<() => void> = [];
    resizers.forEach(handleEl => {
      const sectionEl = handleEl.closest('.muuri-section') as HTMLElement | null;
      if (!sectionEl) return;
      let startX = 0,
        startY = 0,
        startW = 0,
        startH = 0;
      const onMove = (e: MouseEvent) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const w = Math.max(420, startW + dx);
        const h = Math.max(260, startH + dy);
        sectionEl.style.width = `${w}px`;
        sectionEl.style.height = `${h}px`;
        sectionsGridRef.current?.refreshItems([sectionEl]).layout();
        const child = sectionEl.querySelector('.muuri-grid') as HTMLElement | null;
        const secId = child?.dataset.sectionId;
        const grid = gridsRef.current.get(secId || '');
        grid?.refreshItems().layout();
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      const onDown = (e: MouseEvent) => {
        e.preventDefault();
        const rect = sectionEl.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startW = rect.width;
        startH = rect.height;
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      };
      handleEl.addEventListener('mousedown', onDown);
      moveHandlers.push(() => handleEl.removeEventListener('mousedown', onDown));
    });
    return () => {
      moveHandlers.forEach(off => off());
    };
  }, [sections]);

  const addSection = () => {
    const id = `sec-${Date.now()}`;
    setSections(prev => [...prev, { id, title: `Section ${prev.length + 1}` }]);
    setTargetSection(id);
  };

  const removeSection = (id: string) => {
    const grid = gridsRef.current.get(id);
    if (grid) {
      // Move its items to another section (first available)
      const fallback = sections.find(s => s.id !== id)?.id;
      if (fallback) {
        const fallbackGrid = gridsRef.current.get(fallback);
        if (fallbackGrid) {
          grid.getItems().forEach((it: any) => fallbackGrid.add(it.getElement()));
          fallbackGrid.refreshItems().layout();
        }
      }
      grid.destroy();
      gridsRef.current.delete(id);
    }
    setSections(prev => prev.filter(s => s.id !== id));
  };

  const addCard = () => {
    const grid = gridsRef.current.get(targetSection);
    if (!grid) return;
    const id = `card-${Date.now()}`;
    const el = createCardElement(id, `Card ${id.slice(-4)}`, snap);
    grid.add(el, { index: 0 });
    requestAnimationFrame(() => grid.refreshItems().layout());
  };

  const saveLayout = () => {
    const out: { sections: Section[]; cards: SavedCard[] } = { sections, cards: [] };
    sections.forEach(sec => {
      const grid = gridsRef.current.get(sec.id);
      if (!grid) return;
      grid.getItems().forEach((it: any) => {
        const el = it.getElement() as HTMLElement;
        if (!el.classList.contains('muuri-item')) return;
        const id = el.dataset.id!;
        const title = el.querySelector('.title')?.textContent || 'Card';
        const w = el.getBoundingClientRect().width;
        const h = el.getBoundingClientRect().height;
        out.cards.push({ id, title, sectionId: sec.id, w, h });
      });
    });
    localStorage.setItem('muuri-demo', JSON.stringify(out));
  };

  const loadLayout = () => {
    const raw = localStorage.getItem('muuri-demo');
    if (!raw) return;
    const data = JSON.parse(raw) as { sections: Section[]; cards: SavedCard[] };
    // Reset all sections and grids
    gridsRef.current.forEach(g => g.destroy?.());
    gridsRef.current.clear();
    // React will re-render sections; Muuri grids will be re-initialized in effect
    setSections(data.sections);
    // Defer card injection until grids are ready
    setTimeout(() => {
      data.cards.forEach(c => {
        const grid = gridsRef.current.get(c.sectionId);
        const el = createCardElement(c.id, c.title, snap);
        el.style.width = `${Math.max(180, Math.round(c.w))}px`;
        el.style.height = `${Math.max(120, Math.round(c.h))}px`;
        grid?.add(el);
      });
      allGrids().forEach(g => g.refreshItems().layout());
    }, 50);
  };

  const toolbar = useMemo(
    () => (
      <div className="flex items-center gap-2 mb-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} />
          <span>Snap size increments</span>
        </label>
        <button className="px-2 py-1 border rounded" onClick={addSection}>
          Add Section
        </button>
        <select className="px-2 py-1 border rounded" value={targetSection} onChange={e => setTargetSection(e.target.value)}>
          {sections.map(s => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <button className="px-2 py-1 border rounded" onClick={addCard}>
          Add Card
        </button>
        <button className="px-2 py-1 border rounded" onClick={saveLayout}>
          Save
        </button>
        <button className="px-2 py-1 border rounded" onClick={loadLayout}>
          Load
        </button>
      </div>
    ),
    [sections, targetSection, snap],
  );

  return (
    <div className="p-3">
      <h2 className="text-lg mb-2">Muuri Demo – Sections + Cards</h2>
      {toolbar}
      <style>{css}</style>
      <div ref={sectionsWrapperRef} className="muuri-sections">
        {sections.map(s => (
          <div key={s.id} className="muuri-section">
            <div className="muuri-section-content">
              <div className="section-header">
                <span className="section-title">{s.title}</span>
                <div className="section-actions">
                  <span className="section-drag-handle" title="Drag section">
                    ⠿
                  </span>
                  <button className="section-remove" onClick={() => removeSection(s.id)} title="Remove section">
                    ×
                  </button>
                </div>
              </div>
              <div className="muuri-grid" data-section-id={s.id} />
              <div className="section-resizer" data-section-id={s.id}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const css = `
.muuri-sections { position: relative; min-height: 700px; }
.muuri-section { position: absolute; width: 620px; height: 340px; }
.muuri-section-content { position: relative; height: 100%; background: #f6f8f9; border: 1px solid #e1ece9; border-radius: 10px; padding: 10px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.section-title { font-size: 13px; color: #4a5f5b; }
.section-actions { display: flex; gap: 6px; align-items: center; }
.section-drag-handle { cursor: move; font-size: 16px; color: #4a5f5b; }
.section-remove { border: 1px solid #d0dcda; background: white; width: 22px; height: 22px; border-radius: 6px; cursor: pointer; }
.section-resizer { position: absolute; right: 8px; bottom: 8px; width: 16px; height: 16px; border-right: 2px solid #0aa394; border-bottom: 2px solid #0aa394; cursor: se-resize; opacity: 0.7; }
.muuri-grid { position: relative; height: calc(100% - 40px); }
.muuri-item { position: absolute; width: 240px; height: 160px; margin: 12px; }
.muuri-item-content { height: 100%; background: white; border: 1px solid #0aa394; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); overflow: hidden; display: flex; flex-direction: column; }
.card-header { cursor: move; display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: #eef7f6; border-bottom: 1px solid #dbe9e6; font-size: 12px; color: #0a776a; }
.card-body { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 13px; color: #445; }
.resizer { position: absolute; right: 6px; bottom: 6px; width: 16px; height: 16px; border-right: 2px solid #0aa394; border-bottom: 2px solid #0aa394; cursor: se-resize; opacity: 0.7; }
`;

function createCardElement(id: string, title: string, snap: boolean) {
  const item = document.createElement('div');
  item.className = 'muuri-item';
  item.dataset.id = id;
  const content = document.createElement('div');
  content.className = 'muuri-item-content';
  const header = document.createElement('div');
  header.className = 'card-header';
  const titleSpan = document.createElement('span');
  titleSpan.className = 'title';
  titleSpan.textContent = title;
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.title = 'Remove card';
  closeBtn.style.border = '1px solid #d0dcda';
  closeBtn.style.background = 'white';
  closeBtn.style.width = '22px';
  closeBtn.style.height = '22px';
  closeBtn.style.borderRadius = '6px';
  closeBtn.onclick = e => {
    e.stopPropagation();
    const parentGridEl = item.parentElement as HTMLElement | null;
    const parentSectionId = parentGridEl?.dataset.sectionId;
    const gridsMap = (window as any).__muuri_grids_map as Map<string, any> | undefined;
    if (gridsMap && parentSectionId) {
      const grid = gridsMap.get(parentSectionId);
      if (grid) grid.remove(item, { removeElements: true });
    } else {
      item.remove();
    }
  };
  header.appendChild(titleSpan);
  header.appendChild(closeBtn);
  const body = document.createElement('div');
  body.className = 'card-body';
  body.textContent = 'Drag me between sections. Resize with the corner handle.';
  const resizer = document.createElement('div');
  resizer.className = 'resizer';
  enableResize(item, resizer, snap);
  content.appendChild(header);
  content.appendChild(body);
  content.appendChild(resizer);
  item.appendChild(content);
  return item;
}

function enableResize(item: HTMLElement, handle: HTMLElement, snap: boolean) {
  let startX = 0,
    startY = 0,
    startW = 0,
    startH = 0;
  const onDown = (e: MouseEvent) => {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    const rect = item.getBoundingClientRect();
    startW = rect.width;
    startH = rect.height;
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  const onMove = (e: MouseEvent) => {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let w = Math.max(180, startW + dx);
    let h = Math.max(120, startH + dy);
    if (snap) {
      const cw = 60;
      const ch = 40; // snap increments
      w = Math.round(w / cw) * cw;
      h = Math.round(h / ch) * ch;
    }
    item.style.width = `${w}px`;
    item.style.height = `${h}px`;
    const parent = item.parentElement as HTMLElement | null;
    const secId = parent?.dataset.sectionId;
    const gridsMap = (window as any).__muuri_grids_map as Map<string, any> | undefined;
    const grid = gridsMap && secId ? gridsMap.get(secId) : undefined;
    grid?.refreshItems([item]).layout();
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
  handle.addEventListener('mousedown', onDown);
}

// Enable resize for sections using the corner handle, and relayout both grids
// (section resize handled within component effect)
