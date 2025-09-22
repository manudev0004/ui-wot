import { useEffect, useRef } from 'react';
import type { WoTComponent, TDInfo } from '../../types';

export function CardContent({ component, tdInfos }: { component: WoTComponent; tdInfos: TDInfo[] }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const elHost = hostRef.current;
    if (!elHost) return;
    elHost.replaceChildren();

    const tdInfo = tdInfos.find(t => t.id === component.tdId);
    const tdUrl = (tdInfo?.source.type === 'url' ? (tdInfo.source.content as string) : undefined) || component.tdUrl || '';

    try {
      const el = document.createElement(component.uiComponent);
      if (component.variant) el.setAttribute('variant', component.variant);
      el.setAttribute('label', component.title);
      if (component.attributes) {
        for (const [k, v] of Object.entries(component.attributes)) {
          if (v != null) el.setAttribute(k, String(v));
        }
      }
      if (tdUrl) el.setAttribute('td-url', tdUrl);
      if (component.type === 'property') el.setAttribute('td-property', component.name);
      else if (component.type === 'action') el.setAttribute('td-action', component.name);
      else if (component.type === 'event') el.setAttribute('td-event', component.name);

      (el as HTMLElement).style.maxWidth = '100%';
      (el as HTMLElement).style.maxHeight = '100%';

      elHost.replaceChildren(el);
      console.debug('[generator][card] appended', {
        id: component.id,
        tag: component.uiComponent,
        type: component.type,
        name: component.name,
        hasTdUrl: Boolean(tdUrl),
      });
    } catch (e) {
      console.error('[generator][card] failed to render component', component.uiComponent, e);
      // No visual fallback to keep logic minimal as requested
      elHost.replaceChildren();
    }

    return () => {
      elHost.replaceChildren();
    };
  }, [component.id, component.title, component.uiComponent, component.variant, component.attributes, component.type, component.name, component.tdId, tdInfos]);

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
