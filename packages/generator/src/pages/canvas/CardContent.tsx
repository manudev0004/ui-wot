import { useEffect, useRef } from 'react';
import type { WoTComponent, TDInfo } from '../../types';

export function CardContent({ component, tdInfos }: { component: WoTComponent; tdInfos: TDInfo[] }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const elHost = hostRef.current;
    if (!elHost) return;
    elHost.innerHTML = '';
    try {
      const el = document.createElement(component.uiComponent);
      if (component.variant) {
        el.setAttribute('variant', component.variant);
      }
      el.setAttribute('label', component.title);

      if (component.attributes) {
        Object.entries(component.attributes).forEach(([k, v]) => {
          if (v != null) el.setAttribute(k, String(v));
        });
      }

      const tdInfo = tdInfos.find(t => t.id === component.tdId);
      const tdUrl = (tdInfo?.source.type === 'url' ? (tdInfo.source.content as string) : undefined) || component.tdUrl || '';
      if (tdUrl) el.setAttribute('data-td-url', tdUrl);
      if (component.type === 'property') el.setAttribute('data-td-property', component.name);
      else if (component.type === 'action') el.setAttribute('data-td-action', component.name);
      else if (component.type === 'event') el.setAttribute('data-td-event', component.name);

      (el as HTMLElement).style.maxWidth = '100%';
      (el as HTMLElement).style.maxHeight = '100%';

      elHost.appendChild(el);
      try {
        const tdInfo = tdInfos.find(t => t.id === component.tdId);
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
