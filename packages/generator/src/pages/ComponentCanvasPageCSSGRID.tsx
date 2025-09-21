import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { WoTComponent } from '../types';
import { useNavbar } from '../context/NavbarContext';
import { EditPopup } from '../components/EditPopup';
import { connectAll, initializeWot } from '@thingweb/ui-wot-components/services';

// Component size categories for responsive CSS grid
const COMPONENT_SIZES: Record<string, 'small' | 'medium' | 'large'> = {
  'ui-button': 'small',
  'ui-toggle': 'small', 
  'ui-checkbox': 'small',
  'ui-slider': 'medium',
  'ui-text': 'medium',
  'ui-number-picker': 'medium',
  'ui-calendar': 'medium',
  'ui-event': 'large',
};

// Attribute schemas for each UI component (kebab-case)
const ATTRIBUTE_SCHEMAS: Record<string, Record<string, 'string' | 'number' | 'boolean'>> = {
  'ui-button': {
    'disabled': 'boolean',
    'show-status': 'boolean',
    'show-last-updated': 'boolean',
    'label': 'string',
  },
  'ui-toggle': {
    'disabled': 'boolean',
    'readonly': 'boolean',
    'show-status': 'boolean',
    'show-last-updated': 'boolean',
  },
  'ui-checkbox': {
    'disabled': 'boolean',
    'readonly': 'boolean',
    'show-status': 'boolean',
    'show-last-updated': 'boolean',
  },
  'ui-slider': {
    'disabled': 'boolean',
    'readonly': 'boolean',
    'show-status': 'boolean',
    'show-last-updated': 'boolean',
    'min': 'number',
    'max': 'number',
    'step': 'number',
  },
  'ui-text': {
    'disabled': 'boolean',
    'readonly': 'boolean',
    'show-status': 'boolean',
    'show-last-updated': 'boolean',
    'placeholder': 'string',
  },
  'ui-number-picker': {
    'disabled': 'boolean',
    'readonly': 'boolean',
    'show-status': 'boolean',
    'show-last-updated': 'boolean',
    'min': 'number',
    'max': 'number',
    'step': 'number',
  },
  'ui-calendar': {
    'disabled': 'boolean',
    'readonly': 'boolean',
    'show-status': 'boolean',
    'show-last-updated': 'boolean',
  },
  'ui-color-picker': {
    'disabled': 'boolean',
    'readonly': 'boolean',
    'show-status': 'boolean',
    'show-last-updated': 'boolean',
  },
  'ui-file-picker': {
    'disabled': 'boolean',
    'readonly': 'boolean',
    'show-status': 'boolean',
    'show-last-updated': 'boolean',
    'accept': 'string',
    'multiple': 'boolean',
  },
  'ui-event': {
    'show-status': 'boolean',
    'show-last-updated': 'boolean',
    'max-events': 'number',
  },
  'ui-notification': {
    'show-status': 'boolean',
    'show-last-updated': 'boolean',
    'duration': 'number',
  },
  'ui-object': {
    'disabled': 'boolean',
    'readonly': 'boolean',
    'show-status': 'boolean',
    'show-last-updated': 'boolean',
  },
};

const getAttributeSchema = (componentType: string): Record<string, 'string' | 'number' | 'boolean'> => {
  return ATTRIBUTE_SCHEMAS[componentType] || {};
};

export function ComponentCanvasPage() {
  const { state, dispatch } = useAppContext();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { setContent, clear } = useNavbar();

  // Membership of cards to visual section (defaults to their TD id)
  const [membership, setMembership] = useState<Record<string, string | null>>({});
  const [sectionNames, setSectionNames] = useState<Record<string, string>>({});
  const [sectionStyles, setSectionStyles] = useState<Record<string, { bgColor: string; border: 'dashed' | 'solid' | 'none' }>>({});
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editComponentId, setEditComponentId] = useState<string | null>(null);
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);

  // Fluid layout states
  const sectionsGridRef = useRef<HTMLDivElement | null>(null);
  const [sectionSpans, setSectionSpans] = useState<Record<string, number>>({}); // per-section gridColumn span
  const [cardSpans, setCardSpans] = useState<Record<string, number>>({}); // per-card gridColumn span
  const [cardHeights, setCardHeights] = useState<Record<string, number>>({}); // per-card minHeight in px
  const [sectionOrders, setSectionOrders] = useState<Record<string, string[]>>({}); // per-section card order
  const dragDataRef = useRef<{ fromSection: string; compId: string } | null>(null);

  // Initialize membership when components change
  useEffect(() => {
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
    // Initialize default spans for sections and cards
    setSectionSpans(prev => {
      const next = { ...prev } as Record<string, number>;
      state.tdInfos.forEach(td => {
        if (!next[td.id]) next[td.id] = 1; // default span 1
      });
      // cleanup removed
      Object.keys(next).forEach(id => {
        if (!state.tdInfos.find(t => t.id === id)) delete next[id];
      });
      return next;
    });
    setCardSpans(prev => {
      const next = { ...prev } as Record<string, number>;
      state.components.forEach(c => {
        if (!next[c.id]) next[c.id] = 1; // default span 1
      });
      // cleanup removed
      Object.keys(next).forEach(id => {
        if (!state.components.find(c => c.id === id)) delete next[id];
      });
      return next;
    });
    setCardHeights(prev => {
      const next = { ...prev } as Record<string, number>;
      state.components.forEach(c => {
        if (!next[c.id]) {
          // baseline per size
          const base = ((): number => {
            switch (c.uiComponent) {
              case 'ui-button':
              case 'ui-toggle':
              case 'ui-checkbox':
                return 120;
              case 'ui-event':
                return 220;
              default:
                return 160;
            }
          })();
          next[c.id] = base;
        }
      });
      Object.keys(next).forEach(id => {
        if (!state.components.find(c => c.id === id)) delete next[id];
      });
      return next;
    });

    // Initialize/maintain ordering per section
    setSectionOrders(prev => {
      // Build current groups
      const groups: Record<string, string[]> = {};
      state.components.forEach(c => {
        const sid = membership[c.id] ?? c.tdId ?? 'ungrouped';
        if (!groups[sid]) groups[sid] = [];
        groups[sid].push(c.id);
      });
      // Merge with previous order to keep stability; append new ids at end; drop removed
      const next: Record<string, string[]> = {};
      Object.entries(groups).forEach(([sid, ids]) => {
        const prevOrder = prev[sid] || [];
        const kept = prevOrder.filter(id => ids.includes(id));
        const added = ids.filter(id => !kept.includes(id));
        next[sid] = [...kept, ...added];
      });
      return next;
    });
  }, [state.components, state.tdInfos]);

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
          <label className="flex items-center gap-1 bg-white border rounded-lg px-2 py-1 cursor-pointer select-none">
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
        </div>
      ),
    });
    return () => clear();
  }, [tdSummary, navigate, dispatch, setContent, clear, editMode]);

  // Close any open editor when edit mode turns off
  useEffect(() => {
    if (!editMode) setEditComponentId(null);
  }, [editMode]);

  // Helpers to parse CSS grid computed columns for sizing thresholds
  const getGridColumnWidths = (el: HTMLElement | null): number[] => {
    if (!el) return [];
    const style = window.getComputedStyle(el);
    const tpl = style.getPropertyValue('grid-template-columns');
    // e.g., "304px 304px 304px" or "repeat(3, 1fr)" (computed usually resolves to px)
    const parts = tpl.split(' ').filter(Boolean);
    const widths: number[] = [];
    for (const p of parts) {
      const m = p.match(/([0-9.]+)px/);
      if (m) widths.push(parseFloat(m[1]));
    }
    return widths;
  };

  const estimateAvgColumnWidth = (el: HTMLElement | null, fallback: number, minTrack = 200) => {
    if (!el) return fallback;
    const widths = getGridColumnWidths(el);
    if (widths.length) return widths.reduce((a, b) => a + b, 0) / widths.length;
    const style = window.getComputedStyle(el);
    const gap = parseFloat(style.getPropertyValue('column-gap') || '0');
    const total = el.clientWidth;
    const approxCols = Math.max(1, Math.floor(total / (minTrack + gap)));
    return total / approxCols;
  };

  // SECTION resize (horizontal span)
  const onSectionResizeMouseDown = (sectionId: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    const gridEl = sectionsGridRef.current;
    const colWidths = getGridColumnWidths(gridEl as HTMLElement);
    const avgCol = colWidths.length ? colWidths.reduce((a, b) => a + b, 0) / colWidths.length : 400;
    const startX = e.clientX;
    const startSpan = sectionSpans[sectionId] || 1;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      // every ~0.8 col increases span by 1
      const deltaCols = Math.round(dx / (avgCol * 0.8));
      const target = Math.max(1, Math.min(3, startSpan + deltaCols));
      setSectionSpans(prev => (prev[sectionId] === target ? prev : { ...prev, [sectionId]: target }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // CARD resize (horizontal span + vertical height)
  const onCardResizeMouseDown = (sectionGridEl: HTMLElement | null, compId: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    const gridEl = sectionGridEl;
    const avgCol = estimateAvgColumnWidth(gridEl as HTMLElement, 240, 200);
    const startX = e.clientX;
    const startY = e.clientY;
    const cardItem = (e.currentTarget.closest('.component-card') as HTMLElement) || null;
    const initialH = cardHeights[compId] || 160;
    const startSpan = cardSpans[compId] || 1;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const deltaCols = Math.round(dx / (avgCol * 0.8));
      const targetSpan = Math.max(1, Math.min(3, startSpan + deltaCols));
      const targetH = Math.max(100, Math.min(600, initialH + dy));
      setCardSpans(prev => (prev[compId] === targetSpan ? prev : { ...prev, [compId]: targetSpan }));
      setCardHeights(prev => (prev[compId] === targetH ? prev : { ...prev, [compId]: targetH }));
      if (cardItem) cardItem.style.minHeight = `${targetH}px`;
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // CARD horizontal-only resize (right edge handle)
  const onCardResizeHorizontalMouseDown = (sectionGridEl: HTMLElement | null, compId: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    const gridEl = sectionGridEl;
    const avgCol = estimateAvgColumnWidth(gridEl as HTMLElement, 240, 200);
    const startX = e.clientX;
    const startSpan = cardSpans[compId] || 1;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const deltaCols = Math.round(dx / (avgCol * 0.8));
      const targetSpan = Math.max(1, Math.min(3, startSpan + deltaCols));
      setCardSpans(prev => (prev[compId] === targetSpan ? prev : { ...prev, [compId]: targetSpan }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const removeComponent = (id: string) => {
    dispatch({ type: 'REMOVE_COMPONENT', payload: id });
    if (editComponentId === id) setEditComponentId(null);
  };

  const removeSection = (tdId: string) => {
    // Remove only components currently inside this section (explicit membership)
    const toRemove = state.components.filter(c => membership[c.id] === tdId).map(c => c.id);
    toRemove.forEach(id => dispatch({ type: 'REMOVE_COMPONENT', payload: id }));
    // Clean up local maps
    setMembership(prev => {
      const next = { ...prev } as Record<string, string | null>;
      toRemove.forEach(id => delete next[id]);
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
        // Create the custom element and apply base attributes
        const el = document.createElement(component.uiComponent);
        el.setAttribute('variant', component.variant || 'outlined');
        el.setAttribute('label', component.title);
        el.setAttribute('color', 'primary');

        // Apply per-component attributes if present
        if (component.attributes) {
          Object.entries(component.attributes).forEach(([k, v]) => {
            if (v != null) el.setAttribute(k, String(v));
          });
        }

        // TD wiring via data attributes
        const tdInfo = state.tdInfos.find(t => t.id === component.tdId);
        const tdUrl = (tdInfo?.source.type === 'url' ? (tdInfo.source.content as string) : undefined) || component.tdUrl || '';
        if (tdUrl) el.setAttribute('data-td-url', tdUrl);
        if (component.type === 'property') el.setAttribute('data-td-property', component.name);
        else if (component.type === 'action') el.setAttribute('data-td-action', component.name);
        else if (component.type === 'event') el.setAttribute('data-td-event', component.name);

        // Sizing behavior
        (el as HTMLElement).style.maxWidth = '100%';
        (el as HTMLElement).style.maxHeight = '100%';

        elHost.appendChild(el);
        try {
          const tdInfo = state.tdInfos.find(t => t.id === component.tdId);
          const tdUrlLog = (tdInfo?.source.type === 'url' ? (tdInfo.source.content as string) : undefined) || component.tdUrl || '';
          console.log('[generator][card] appended', {
            id: component.id,
            tag: component.uiComponent,
            type: component.type,
            name: component.name,
            hasTdUrl: Boolean(tdUrlLog),
          });
        } catch {}
      } catch (e) {
        const fallback = document.createElement('div');
        fallback.className = 'p-4 bg-gray-100 rounded border-2 border-dashed border-gray-300 text-center text-gray-500';
        fallback.innerHTML = `<div class="text-sm font-medium">${component.title}</div><div class="text-xs mt-1">${component.uiComponent}</div>`;
        elHost.appendChild(fallback);
      }
      return () => {
        if (elHost) elHost.innerHTML = '';
      };
    }, [component.id, component.title, component.uiComponent, component.variant, component.attributes, component.type, component.name, component.tdId, state.tdInfos]);
    return (
      <div
        ref={hostRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    );
  }

  // Keep last connections to allow explicit cleanup before reconnect
  const connectionStopsRef = useRef<Array<() => void>>([]);
  // Sequence guard to avoid races across overlapping effect runs
  const wiringSeqRef = useRef(0);
  // Signal to trigger rewiring after edit mode ends
  const [rewireTick, setRewireTick] = useState(0);

  // When edit mode turns off, trigger a single rewire
  useEffect(() => {
    if (!editMode) {
      setRewireTick(t => t + 1);
    }
  }, [editMode]);

  // Auto-wire all elements to the current TD via data attributes when components or TDs change
  useEffect(() => {
    let stops: Array<() => void> | undefined;
    const root = document.querySelector('.canvas-page');
    if (!root) return;
    const seq = ++wiringSeqRef.current;
    (async () => {
      try {
        console.log('[generator][wiring] components in state:', state.components.length);
        // Let DOM settle so all UI elements are in place
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        if (wiringSeqRef.current !== seq) return; // superseded

        // Retry a few times for rendered UI elements to appear
        const propSel = '[data-td-property],[td-property],[property]';
        const actSel = '[data-td-action],[td-action],[action]';
        const evtSel = '[data-td-event],[td-event],[event]';
        let attempts = 0;
        let targetNodes: HTMLElement[] = [];
        while (attempts < 10) {
          const allNodes = Array.from(root.querySelectorAll('*')) as HTMLElement[];
          targetNodes = allNodes.filter(n => n.tagName.toLowerCase().startsWith('ui-')) as HTMLElement[];
          const preProps = root.querySelectorAll(propSel).length;
          const preActs = root.querySelectorAll(actSel).length;
          const preEvts = root.querySelectorAll(evtSel).length;
          if (targetNodes.length > 0 || preProps + preActs + preEvts > 0) break;
          await new Promise(r => setTimeout(r, 100));
          attempts++;
        }
        if (wiringSeqRef.current !== seq) return; // superseded
        const presentTags = Array.from(new Set(targetNodes.map(n => n.tagName.toLowerCase())));
        const tagsToWait =
          presentTags.length > 0
            ? presentTags
            : [
                'ui-button',
                'ui-toggle',
                'ui-slider',
                'ui-text',
                'ui-number-picker',
                'ui-calendar',
                'ui-checkbox',
                'ui-color-picker',
                'ui-file-picker',
                'ui-event',
                'ui-notification',
                'ui-object',
              ];
        console.log('[generator][wiring] tags present:', presentTags, 'targets:', targetNodes.length);
        await Promise.all(tagsToWait.map(t => ((window as any).customElements?.whenDefined ? customElements.whenDefined(t) : Promise.resolve())));
        console.log('[generator][wiring] custom elements ready');
        if (wiringSeqRef.current !== seq) return; // superseded

        // Ensure each Stencil instance is upgraded so @Method proxies exist
        try {
          await Promise.all(
            targetNodes.map(async n => {
              const anyEl: any = n as any;
              if (typeof anyEl.componentOnReady === 'function') {
                try {
                  await anyEl.componentOnReady();
                } catch {}
              }
            }),
          );
          console.log('[generator][wiring] stencil instances upgraded');
        } catch {}
        if (wiringSeqRef.current !== seq) return; // superseded

        // Ensure WoT is initialized (idempotent; reuses existing if available)
        try {
          await initializeWot();
          console.log('[generator][wiring] initializeWot OK');
        } catch (e) {
          console.warn('[generator][wiring] initializeWot failed', e);
        }
        if (wiringSeqRef.current !== seq) return; // superseded

        // Determine a baseUrl: prefer TD URL from state, else from any element's data-td-url
        const tdUrls = state.tdInfos.map(t => (t.source.type === 'url' ? (t.source.content as string) : null)).filter(Boolean) as string[];
        const fallbackFromElement = (root.querySelector('[data-td-url]') as HTMLElement | null)?.getAttribute('data-td-url') || undefined;
        const baseUrl = tdUrls[0] ?? fallbackFromElement ?? '';
        if (!baseUrl) {
          console.warn('[generator][wiring] no global baseUrl; relying on per-element data-td-url');
        }
        console.log('[generator][wiring] baseUrl:', baseUrl || '(per-element)');

        if (!baseUrl) {
          const candidates = Array.from(root.querySelectorAll<HTMLElement>('[data-td-property],[data-td-action],[data-td-event]'));
          const missingUrl = candidates.filter(el => !el.getAttribute('data-td-url')).length;
          if (missingUrl > 0) {
            console.warn('[generator][wiring] aborting: elements without data-td-url found and no global baseUrl', { missingUrl, total: candidates.length });
            return;
          }
        }
        if (wiringSeqRef.current !== seq) return; // superseded

        // Sanity: how many elements match selectors that connectAll would use?
        const preProps = root.querySelectorAll(propSel).length;
        const preActs = root.querySelectorAll(actSel).length;
        const preEvts = root.querySelectorAll(evtSel).length;
        const docProps = document.querySelectorAll(propSel).length;
        const docActs = document.querySelectorAll(actSel).length;
        const docEvts = document.querySelectorAll(evtSel).length;
        console.log('[generator][wiring] pre-connect counts', {
          properties: preProps,
          actions: preActs,
          events: preEvts,
          docProperties: docProps,
          docActions: docActs,
          docEvents: docEvts,
        });

        // Stop previous connections (e.g., after edit-mode DOM changes)
        try {
          if (wiringSeqRef.current === seq && connectionStopsRef.current?.length) {
            console.log('[generator][wiring] stopping previous connections:', connectionStopsRef.current.length);
            for (const stop of connectionStopsRef.current) {
              try {
                stop();
              } catch {}
            }
            connectionStopsRef.current = [];
          }
        } catch {}

        if (wiringSeqRef.current !== seq) return; // superseded
        stops = await connectAll({ baseUrl, container: root });
        console.log('[generator][wiring] connectAll attached', { count: stops?.length ?? 0 });
        if ((stops?.length ?? 0) === 0 && docProps + docActs + docEvts > 0) {
          console.warn('[generator][wiring] retrying connectAll at document scope');
          if (wiringSeqRef.current !== seq) return; // superseded
          stops = await connectAll({ baseUrl, container: document });
          console.log('[generator][wiring] document-scope connectAll attached', { count: stops?.length ?? 0 });
        }
        if ((stops?.length ?? 0) === 0) {
          const sample = Array.from(root.querySelectorAll('[data-td-property],[data-td-action],[data-td-event]'))
            .slice(0, 5)
            .map(el => ({
              tag: (el as HTMLElement).tagName.toLowerCase(),
              property: (el as HTMLElement).getAttribute('data-td-property'),
              action: (el as HTMLElement).getAttribute('data-td-action'),
              event: (el as HTMLElement).getAttribute('data-td-event'),
              url: (el as HTMLElement).getAttribute('data-td-url') || (el as HTMLElement).getAttribute('url') || (el as HTMLElement).getAttribute('td-url') || undefined,
            }));
          console.warn('[generator][wiring] zero connections; sample elements:', sample);
        }
        if (wiringSeqRef.current === seq && stops && stops.length) {
          connectionStopsRef.current = stops;
        }
      } catch (err) {
        console.warn('connectAll failed:', err);
      }
    })();
    return () => {
      if (stops && stops.length) {
        try {
          console.log('[generator][wiring] cleanup connections:', stops.length);
          for (const stop of stops)
            try {
              stop();
            } catch {}
        } catch {}
      }
    };
  }, [state.tdInfos, state.components, rewireTick]);

  // Group components by their section membership
  const componentsBySection = useMemo(() => {
    const groups: Record<string, WoTComponent[]> = {};
    // collect comps by sid
    const interim: Record<string, WoTComponent[]> = {};
    state.components.forEach(comp => {
      const sectionId = membership[comp.id] ?? comp.tdId ?? 'ungrouped';
      if (!interim[sectionId]) interim[sectionId] = [];
      interim[sectionId].push(comp);
    });
    // apply ordering
    Object.entries(interim).forEach(([sid, comps]) => {
      const order = sectionOrders[sid];
      if (order && order.length) {
        const byId = new Map(comps.map(c => [c.id, c] as const));
        groups[sid] = order.map(id => byId.get(id)).filter(Boolean) as WoTComponent[];
      } else {
        groups[sid] = comps;
      }
    });
    return groups;
  }, [state.components, membership, sectionOrders]);

  // Drag-drop helpers
  const onCardDragStart = (sectionId: string, compId: string, e: React.DragEvent<HTMLDivElement>) => {
    if (!editMode) return;
    dragDataRef.current = { fromSection: sectionId, compId };
    try {
      e.dataTransfer.setData('text/plain', compId);
    } catch {}
    e.dataTransfer.effectAllowed = 'move';
  };
  const onCardDragOver = (e: React.DragEvent) => {
    if (!editMode) return;
    e.preventDefault(); // allow drop
  };
  const onDropOnCard = (sectionId: string, targetId: string, e: React.DragEvent) => {
    if (!editMode) return;
    e.preventDefault();
    const data = dragDataRef.current;
    if (!data) return;
    const { fromSection, compId } = data;
    setSectionOrders(prev => {
      const next = { ...prev } as Record<string, string[]>;
      // remove from old
      if (next[fromSection]) next[fromSection] = next[fromSection].filter(id => id !== compId);
      // insert before target in new section
      const arr = (next[sectionId] || []).filter(id => id !== compId);
      const idx = arr.indexOf(targetId);
      if (idx >= 0) arr.splice(idx, 0, compId);
      else arr.push(compId);
      next[sectionId] = arr;
      return next;
    });
    if (fromSection !== sectionId) {
      // update membership when moved across sections
      setMembership(prev => ({ ...prev, [compId]: sectionId === 'ungrouped' ? null : sectionId }));
    }
    dragDataRef.current = null;
  };
  const onDropOnSection = (sectionId: string, e: React.DragEvent) => {
    if (!editMode) return;
    e.preventDefault();
    const data = dragDataRef.current;
    if (!data) return;
    const { fromSection, compId } = data;
    setSectionOrders(prev => {
      const next = { ...prev } as Record<string, string[]>;
      if (next[fromSection]) next[fromSection] = next[fromSection].filter(id => id !== compId);
      const arr = (next[sectionId] || []).filter(id => id !== compId);
      arr.push(compId);
      next[sectionId] = arr;
      return next;
    });
    if (fromSection !== sectionId) {
      setMembership(prev => ({ ...prev, [compId]: sectionId === 'ungrouped' ? null : sectionId }));
    }
    dragDataRef.current = null;
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
      <div className="w-full transition-all duration-200" style={{ minHeight: 'calc(100vh - var(--navbar-height))' }}>
        <div className="page-container canvas-page py-2" style={{ minHeight: 'inherit' }}>
          {state.components.length > 0 ? (
            <div
              className={`relative w-full ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } border rounded-lg overflow-hidden transition-colors duration-300`}
              style={{ minHeight: 'calc(100vh - var(--navbar-height) - 1rem)' }}
            >
              {/* Fluid CSS Grid Layout: sections arranged in responsive columns */}
              <div
                ref={sectionsGridRef}
                className="p-4 grid gap-6"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(520px, 1fr))' }}
              >
                {Object.entries(componentsBySection).map(([sectionId, components]) => {
                  if (components.length === 0) return null;
                  const tdInfo = state.tdInfos.find(t => t.id === sectionId);
                  const sectionName = sectionNames[sectionId] ?? tdInfo?.title ?? 'Section';
                  const styles = sectionStyles[sectionId] || { bgColor: 'transparent', border: 'dashed' as const };
                  
                  return (
                    <div
                      key={sectionId}
                      className="relative border rounded-lg p-4"
                      style={{
                        borderStyle: styles.border,
                        backgroundColor: styles.bgColor,
                        borderColor: styles.border === 'none' ? 'transparent' : '#cbd5e1',
                        gridColumn: `span ${sectionSpans[sectionId] || 1}`,
                      }}
                    >
                      {/* Section header */}
                      <div className="flex items-center justify-between mb-4">
                        {editMode && editingSectionId === sectionId ? (
                          <input
                            className="text-lg font-heading px-2 py-1 rounded border border-primary/30 bg-white/95"
                            autoFocus
                            value={sectionName}
                            onChange={e => setSectionNames(prev => ({ ...prev, [sectionId]: e.target.value }))}
                            onBlur={() => setEditingSectionId(null)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') setEditingSectionId(null);
                              if (e.key === 'Escape') setEditingSectionId(null);
                            }}
                          />
                        ) : (
                          <h3
                            className="text-lg font-heading text-primary cursor-pointer"
                            onClick={() => editMode && setEditingSectionId(sectionId)}
                          >
                            {sectionName}
                          </h3>
                        )}
                        
                        {editMode && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingSectionId(sectionId)}
                              className="p-1 rounded hover:bg-gray-100"
                              title="Rename section"
                            >
                              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setEditSectionId(sectionId)}
                              className="p-1 rounded hover:bg-gray-100"
                              title="Section settings"
                            >
                              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35.74-.18 1.28-.72 1.46-1.46.94-1.543 3.11-1.543 4.05 0 .18.74.72 1.28 1.46 1.46z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => removeSection(sectionId)}
                              className="p-1 rounded hover:bg-gray-100"
                              title="Delete section"
                            >
                              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Section horizontal resize handle (right edge) */}
                      {editMode && (
                        <div
                          onMouseDown={e => onSectionResizeMouseDown(sectionId, e)}
                          style={{ position: 'absolute', top: 0, right: -6, width: 12, height: '100%', cursor: 'ew-resize' }}
                          title="Drag to resize section width"
                        />
                      )}

                      {/* Fluid CSS Grid for components */}
                      <div
                        className="grid gap-3"
                        data-section-grid
                        style={{
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gridAutoRows: '8px', // masonry row unit
                          alignItems: 'start',
                          gridAutoFlow: 'dense',
                        }}
                        onDragOver={onCardDragOver}
                        onDrop={e => onDropOnSection(sectionId, e)}
                      >
                        {components.map(component => {
                          const size = COMPONENT_SIZES[component.uiComponent] || 'medium';
                          const showWrapper = !component.hideCard;
                          const span = cardSpans[component.id] || 1;
                          const heightPx = cardHeights[component.id] || (size === 'small' ? 120 : size === 'medium' ? 150 : 200);
                          const rowUnit = 8;
                          const rowSpan = Math.max(1, Math.ceil(heightPx / rowUnit));
                          
                          return (
                            <div
                              key={component.id}
                              className={`component-card ${size}`}
                              style={{
                                gridColumn: `span ${span}`,
                                gridRow: `span ${rowSpan}`,
                                minHeight: `${heightPx}px`,
                              }}
                              draggable={editMode}
                              onDragStart={e => onCardDragStart(sectionId, component.id, e)}
                              onDragOver={onCardDragOver}
                              onDrop={e => onDropOnCard(sectionId, component.id, e)}
                            >
                              {showWrapper ? (
                                <div className="bg-white rounded-lg shadow-sm border border-primary overflow-hidden relative w-full h-full" data-component-id={component.id}>
                                  {editMode && (
                                    <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                                      <button
                                        className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100"
                                        title="Edit"
                                        onClick={() => setEditComponentId(component.id)}
                                      >
                                        <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100"
                                        title="Remove"
                                        onClick={() => removeComponent(component.id)}
                                      >
                                        <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                  <div className="relative p-2" style={{ width: '100%', height: '100%' }}>
                                    <CardContent component={component} />
                                  </div>
                                  {editMode && (
                                    <div
                                      onMouseDown={e => onCardResizeMouseDown((e.currentTarget.closest('[data-section-grid]') as HTMLElement) || null, component.id, e)}
                                      style={{ position: 'absolute', right: 6, bottom: 6, width: 14, height: 14, borderRadius: 4, background: 'white', border: '1px solid #64748b', cursor: 'nwse-resize', zIndex: 20, userSelect: 'none' }}
                                      title="Drag to resize card"
                                      draggable={false}
                                      onDragStart={ev => ev.preventDefault()}
                                    />
                                  )}
                                  {editMode && (
                                    <div
                                      onMouseDown={e => onCardResizeHorizontalMouseDown((e.currentTarget.closest('[data-section-grid]') as HTMLElement) || null, component.id, e)}
                                      style={{ position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)', width: 12, height: 24, background: 'white', border: '1px solid #64748b', borderRadius: 4, cursor: 'ew-resize', zIndex: 20, userSelect: 'none' }}
                                      title="Drag to resize width"
                                      draggable={false}
                                      onDragStart={ev => ev.preventDefault()}
                                    />
                                  )}
                                </div>
                              ) : (
                                <div data-component-id={component.id} className="relative w-full h-full flex items-center justify-center">
                                  {editMode && (
                                    <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                                      <button
                                        className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100"
                                        title="Edit"
                                        onClick={() => setEditComponentId(component.id)}
                                      >
                                        <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100"
                                        title="Remove"
                                        onClick={() => removeComponent(component.id)}
                                      >
                                        <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                  <div className="relative p-2" style={{ width: '100%', height: '100%' }}>
                                    <CardContent component={component} />
                                  </div>
                                  {editMode && (
                                    <div
                                      onMouseDown={e => onCardResizeMouseDown((e.currentTarget.closest('[data-section-grid]') as HTMLElement) || null, component.id, e)}
                                      style={{ position: 'absolute', right: 6, bottom: 6, width: 14, height: 14, borderRadius: 4, background: 'white', border: '1px solid #64748b', cursor: 'nwse-resize', zIndex: 20, userSelect: 'none' }}
                                      title="Drag to resize card"
                                      draggable={false}
                                      onDragStart={ev => ev.preventDefault()}
                                    />
                                  )}
                                  {editMode && (
                                    <div
                                      onMouseDown={e => onCardResizeHorizontalMouseDown((e.currentTarget.closest('[data-section-grid]') as HTMLElement) || null, component.id, e)}
                                      style={{ position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)', width: 12, height: 24, background: 'white', border: '1px solid #64748b', borderRadius: 4, cursor: 'ew-resize', zIndex: 20, userSelect: 'none' }}
                                      title="Drag to resize width"
                                      draggable={false}
                                      onDragStart={ev => ev.preventDefault()}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Edit Popups */}
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
                      attributesValues[k] = schema[k] === 'boolean' ? 'false' : '';
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
                      attributesTypes={attributesTypes as any}
                      onAttributeChange={(componentId, attrName, value) => {
                        // Persist to state as strings (kebab-case)
                        const target = state.components.find(c => c.id === componentId);
                        if (!target) return;
                        const nextAttrs = { ...(target.attributes || {}) };
                        nextAttrs[attrName] = value;
                        dispatch({ type: 'UPDATE_COMPONENT', payload: { id: componentId, updates: { attributes: nextAttrs } } });
                        // Also apply live to the element in DOM if present
                        const elHost = document.querySelector(`[data-component-id="${componentId}"]`);
                        const el = elHost?.querySelector(target.uiComponent) as HTMLElement | null;
                        if (el) el.setAttribute(attrName, value);
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
                    const ids = state.components.filter(c => membership[c.id] === sid).map(c => c.id);
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
                      (e.target as HTMLElement).style.backgroundColor = 'var(--color-primary-light)';
                    }}
                    onMouseLeave={e => {
                      (e.target as HTMLElement).style.backgroundColor = 'var(--color-primary)';
                    }}
                    onFocus={e => {
                      (e.target as HTMLElement).style.outline = '2px solid var(--color-primary)';
                      (e.target as HTMLElement).style.outlineOffset = '2px';
                    }}
                    onBlur={e => {
                      (e.target as HTMLElement).style.outline = 'none';
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