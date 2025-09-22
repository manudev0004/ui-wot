import { useEffect, useRef, useState } from 'react';
import { initializeWot, connectAll } from '@thingweb/ui-wot-components/services';

export function connectThings(deps: { tdInfos: any[]; components: any[]; editMode: boolean }) {
  const stopHandles = useRef<Array<() => void>>([]);
  const seqRef = useRef(0);
  const [wireTick, setWireTick] = useState(0);

  useEffect(() => {
    if (!deps.editMode) setWireTick(t => t + 1);
  }, [deps.editMode]);

  useEffect(() => {
    let stopList: Array<() => void> | undefined;
    const canvasRoot = document.querySelector('.canvas-page') as HTMLElement | null;
    if (!canvasRoot) return;
    const seqId = ++seqRef.current;

    (async () => {
      try {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        if (seqRef.current !== seqId) return;

        const propertySelector = '[td-property]';
        const actionSelector = '[td-action]';
        const eventSelector = '[td-event]';
        let tryCount = 0;
        let uiNodes: HTMLElement[] = [];
        while (tryCount < 10) {
          const allNodes = Array.from(canvasRoot.querySelectorAll('*')) as HTMLElement[];
          uiNodes = allNodes.filter(n => n.tagName.toLowerCase().startsWith('ui-')) as HTMLElement[];
          const preProps = canvasRoot.querySelectorAll(propertySelector).length;
          const preActs = canvasRoot.querySelectorAll(actionSelector).length;
          const preEvts = canvasRoot.querySelectorAll(eventSelector).length;
          if (uiNodes.length > 0 || preProps + preActs + preEvts > 0) break;
          await new Promise(r => setTimeout(r, 100));
          tryCount++;
        }
        if (seqRef.current !== seqId) return;

        const readyTags = Array.from(new Set(uiNodes.map(n => n.tagName.toLowerCase())));
        const tagsToLoad =
          readyTags.length > 0
            ? readyTags
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
        await Promise.all(tagsToLoad.map(t => ((window as any).customElements?.whenDefined ? customElements.whenDefined(t) : Promise.resolve())));
        if (seqRef.current !== seqId) return;

        try {
          await Promise.all(
            uiNodes.map(async n => {
              const uiEl: any = n as any;
              if (typeof uiEl.componentOnReady === 'function') {
                try {
                  await uiEl.componentOnReady();
                } catch {}
              }
            }),
          );
        } catch {}
        if (seqRef.current !== seqId) return;

        try {
          await initializeWot();
        } catch {}
        if (seqRef.current !== seqId) return;

        const tdUrlList = deps.tdInfos.map(t => (t.source?.type === 'url' ? (t.source.content as string) : null)).filter(Boolean) as string[];
        const fallbackUrl = (canvasRoot.querySelector('[td-url]') as HTMLElement | null)?.getAttribute('td-url') || undefined;
        const baseUrl = tdUrlList[0] ?? fallbackUrl ?? '';

        if (!baseUrl) {
          const wiredEls = Array.from(canvasRoot.querySelectorAll<HTMLElement>('[td-property],[td-action],[td-event]'));
          const missingUrlCount = wiredEls.filter(el => !el.getAttribute('td-url')).length;
          if (missingUrlCount > 0) return;
        }
        if (seqRef.current !== seqId) return;

        try {
          if (seqRef.current === seqId && stopHandles.current?.length) {
            for (const stop of stopHandles.current) {
              try {
                stop();
              } catch {}
            }
            stopHandles.current = [];
          }
        } catch {}

        if (seqRef.current !== seqId) return;
        stopList = await connectAll({ baseUrl, container: canvasRoot });
        if ((stopList?.length ?? 0) === 0) {
          stopList = await connectAll({ baseUrl, container: document });
        }
        if (seqRef.current === seqId && stopList && stopList.length) {
          stopHandles.current = stopList;
        }
      } catch (err) {
        console.error('Wiring failed');
      }
    })();
    return () => {
      if (stopList && stopList.length) {
        try {
          for (const stop of stopList)
            try {
              stop();
            } catch {}
        } catch {}
      }
    };
  }, [deps.tdInfos, deps.components, wireTick]);
}
