import { useEffect, useRef } from 'react';
import type { WoTComponent, TDInfo } from '../../types';

export function CardContent({ component, tdInfos }: { component: WoTComponent; tdInfos: TDInfo[] }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.replaceChildren();

    const tdInfo = tdInfos.find(t => t.id === component.tdId);
    const tdUrl = (tdInfo?.source.type === 'url' ? (tdInfo.source.content as string) : undefined) || component.tdUrl || '';

    try {
      const el = document.createElement(component.uiComponent);
      (el as HTMLElement).setAttribute('data-ui-el', '1');
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
      // Let custom element compute its own height; avoid clamping to host

      host.replaceChildren(el);
    } catch (e) {
      console.error('Render failed:', component.uiComponent);
      host.replaceChildren();
    }

    return () => {
      host.replaceChildren();
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
