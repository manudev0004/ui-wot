import { useEffect, useRef, useState } from 'react';
import { initializeWot, connectAll } from '@thingweb/ui-wot-components/services';

export function useAutoWiring(deps: { tdInfos: any[]; components: any[]; editMode: boolean }) {
  const connectionStopsRef = useRef<Array<() => void>>([]);
  const wiringSeqRef = useRef(0);
  const [rewireTick, setRewireTick] = useState(0);

  useEffect(() => {
    if (!deps.editMode) setRewireTick(t => t + 1);
  }, [deps.editMode]);

  useEffect(() => {
    let stops: Array<() => void> | undefined;
    const root = document.querySelector('.canvas-page') as HTMLElement | null;
    if (!root) return;
    const seq = ++wiringSeqRef.current;
    (async () => {
      try {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        if (wiringSeqRef.current !== seq) return;

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
        if (wiringSeqRef.current !== seq) return;

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
        await Promise.all(tagsToWait.map(t => ((window as any).customElements?.whenDefined ? customElements.whenDefined(t) : Promise.resolve())));
        if (wiringSeqRef.current !== seq) return;

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
        } catch {}
        if (wiringSeqRef.current !== seq) return;

        try {
          await initializeWot();
        } catch {}
        if (wiringSeqRef.current !== seq) return;

        const tdUrls = deps.tdInfos.map(t => (t.source?.type === 'url' ? (t.source.content as string) : null)).filter(Boolean) as string[];
        const fallbackFromElement = (root.querySelector('[data-td-url]') as HTMLElement | null)?.getAttribute('data-td-url') || undefined;
        const baseUrl = tdUrls[0] ?? fallbackFromElement ?? '';

        if (!baseUrl) {
          const candidates = Array.from(root.querySelectorAll<HTMLElement>('[data-td-property],[data-td-action],[data-td-event]'));
          const missingUrl = candidates.filter(el => !el.getAttribute('data-td-url')).length;
          if (missingUrl > 0) return;
        }
        if (wiringSeqRef.current !== seq) return;

        try {
          if (wiringSeqRef.current === seq && connectionStopsRef.current?.length) {
            for (const stop of connectionStopsRef.current) {
              try {
                stop();
              } catch {}
            }
            connectionStopsRef.current = [];
          }
        } catch {}

        if (wiringSeqRef.current !== seq) return;
        stops = await connectAll({ baseUrl, container: root });
        if ((stops?.length ?? 0) === 0) {
          stops = await connectAll({ baseUrl, container: document });
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
          for (const stop of stops)
            try {
              stop();
            } catch {}
        } catch {}
      }
    };
  }, [deps.tdInfos, deps.components, rewireTick]);
}
