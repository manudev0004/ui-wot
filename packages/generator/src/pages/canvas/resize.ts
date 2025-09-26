import type { Node } from 'reactflow';
import { CARD_WIDTH, CARD_HEIGHT, GAP, MIN_GAP, SECTION_HEIGHT, SECTION_WIDTH, getMinCardHeight } from './constants';
import { reflowAllSections } from './layout';

export function setupComponentAutoFit(reactFlowInstance: any, id: string, component: any, cardSize: { w: number; h: number }) {
  const containerSelector = `[data-component-id="${component.id}"]`;
  let containerElement: HTMLElement | null = null;
  let childElement: HTMLElement | null = null;
  let shadowInnerElement: HTMLElement | null = null;

  // Measure the rendered size of the component and expand the card
  const measure = () => {
    if (!containerElement || !childElement) return;
    const currentNode = reactFlowInstance.getNode(id);
    if (!currentNode) return;
    const currentWidth = (currentNode.style?.width as number) ?? cardSize.w ?? CARD_WIDTH;
    const currentHeight = (currentNode.style?.height as number) ?? cardSize.h ?? CARD_HEIGHT;

    const baseRect = childElement.getBoundingClientRect();
    const innerRect = (shadowInnerElement?.getBoundingClientRect && shadowInnerElement.getBoundingClientRect()) || baseRect;
    const containerRect = containerElement.getBoundingClientRect();
    const computedStyle = getComputedStyle(containerElement);
    const paddingX = (parseFloat(computedStyle.paddingLeft || '0') || 0) + (parseFloat(computedStyle.paddingRight || '0') || 0);
    const paddingY = (parseFloat(computedStyle.paddingTop || '0') || 0) + (parseFloat(computedStyle.paddingBottom || '0') || 0);
    const contentWidth = containerRect.width - paddingX;
    const contentHeight = containerRect.height - paddingY;
    const needsWidth = innerRect.width - contentWidth > 1;
    const needsHeight = innerRect.height - contentHeight > 1;
    if (!needsWidth && !needsHeight) return;

    const FUDGE = 4;
    let desiredWidth = needsWidth ? Math.ceil(innerRect.width + paddingX + FUDGE) : currentWidth;
    const desiredHeight = needsHeight ? Math.ceil(innerRect.height + paddingY + FUDGE) : currentHeight;

    try {
      // If the card sits in a row with other sibling nodes then cap its width so it doesn't overlap the next card.
      const allNodes = (reactFlowInstance as any).getNodes ? (reactFlowInstance as any).getNodes() : [];
      const parentSectionId = currentNode.parentNode as string | undefined;
      if (parentSectionId) {
        const sectionNode = reactFlowInstance.getNode(parentSectionId);
        const sectionWidth = (sectionNode?.style?.width as number) ?? SECTION_WIDTH;
        const innerWidth = sectionWidth - GAP * 2;
        const siblingNodes = allNodes.filter((nodeItem: any) => nodeItem.type === 'componentNode' && nodeItem.parentNode === parentSectionId);
        const currentY = (currentNode.position?.y as number) ?? 0;
        // Tolerance to consider nodes on the same visual row
        const rowTol = 12;
        const rowNodes = siblingNodes.filter((sibling: any) => Math.abs(((sibling.position?.y as number) ?? 0) - currentY) <= rowTol);
        rowNodes.sort((firstNode: any, secondNode: any) => ((firstNode.position?.x as number) ?? 0) - ((secondNode.position?.x as number) ?? 0));
        const currentIndex = rowNodes.findIndex((sibling: any) => sibling.id === id);
        if (currentIndex !== -1) {
          const currentX = (currentNode.position?.x as number) ?? 0;
          const nextNode = rowNodes[currentIndex + 1];
          // If there's a neighbor to the right, keep enough gap
          const maxRightPosition = nextNode ? Math.max(GAP, ((nextNode.position?.x as number) ?? 0) - MIN_GAP) : innerWidth;
          const maxAllowedWidth = Math.max(CARD_WIDTH, Math.max(0, maxRightPosition - currentX));
          desiredWidth = Math.min(desiredWidth, Math.max(currentWidth, maxAllowedWidth));
        }
      }
    } catch {}

    const minHeight = getMinCardHeight(component);
    // Follow minimums and avoid unbounded growth
    const cappedWidth = Math.max(CARD_WIDTH, Math.min(desiredWidth, 1600));
    const cappedHeight = Math.max(minHeight, Math.min(desiredHeight, 1600));
    if (Math.abs(cappedWidth - currentWidth) < 2 && Math.abs(cappedHeight - currentHeight) < 2) return;

    reactFlowInstance.setNodes((previousNodes: any) => {
      let parentSectionId: string | undefined;
      const updatedNodes = previousNodes.map((nodeItem: any) => {
        if (nodeItem.id === id) {
          parentSectionId = (nodeItem.parentNode as string) || undefined;
          return {
            ...nodeItem,
            style: { ...nodeItem.style, width: cappedWidth, height: cappedHeight },
            data: { ...nodeItem.data, size: { w: cappedWidth, h: cappedHeight } },
          } as any;
        }
        return nodeItem;
      });
      if (parentSectionId) {
        // Update the section's height to accommodate the tallest child
        const sectionIndex = updatedNodes.findIndex((n: any) => n.id === parentSectionId);
        if (sectionIndex !== -1) {
          const children = updatedNodes.filter((n: any) => n.type === 'componentNode' && n.parentNode === parentSectionId);
          let maxBottom = GAP;
          for (const ch of children) {
            const childHeight = (ch.style?.height as number) ?? CARD_HEIGHT;
            const y = (ch.position?.y as number) ?? 0;
            maxBottom = Math.max(maxBottom, y + childHeight + GAP);
          }
          const innerHeight = Math.max(SECTION_HEIGHT, maxBottom);
          updatedNodes[sectionIndex] = { ...updatedNodes[sectionIndex], style: { ...updatedNodes[sectionIndex].style, height: innerHeight } } as any;
        }
      }
      return updatedNodes;
    });

    // Re-run layout shortly after size adjustments to fix any row wraps or collisions
    setTimeout(() => reactFlowInstance.setNodes((prev: Node[]) => reflowAllSections(prev)), 50);
  };

  const ro = new ResizeObserver(() => measure());
  const init = () => {
    containerElement = document.querySelector(containerSelector) as HTMLElement | null;
    childElement = (containerElement?.querySelector('[data-ui-el="1"]') as HTMLElement) || null;
    shadowInnerElement = (childElement as any)?.shadowRoot?.firstElementChild || null;
    if (!containerElement || !childElement) return;
    requestAnimationFrame(measure);
    if (shadowInnerElement instanceof HTMLElement) ro.observe(shadowInnerElement);
    ro.observe(childElement);
    ro.observe(containerElement);
  };
  init();
  const t = setTimeout(init, 50);
  return () => {
    clearTimeout(t);
    try {
      ro.disconnect();
    } catch {}
  };
}

export function createComponentResizeMouseDown(
  reactFlowInstance: any,
  id: string,
  data: any,
  resizingState: React.MutableRefObject<{ startX: number; startY: number; w: number; h: number } | null>,
) {
  // Manual resize handler for card and disables dragging while resizing
  return (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const node = reactFlowInstance.getNode(id);
    const w = (node?.style?.width as number) ?? data?.size?.w ?? CARD_WIDTH;
    const h = (node?.style?.height as number) ?? data?.size?.h ?? CARD_HEIGHT;
    resizingState.current = { startX: e.clientX, startY: e.clientY, w, h };
    reactFlowInstance.setNodes((prev: any) => prev.map((n: any) => (n.id === id ? { ...n, draggable: false } : n)));
    const move = (ev: MouseEvent) => {
      if (!resizingState.current) return;
      const dx = ev.clientX - resizingState.current.startX;
      const dy = ev.clientY - resizingState.current.startY;
      const minHeight = getMinCardHeight(data?.comp);
      const newWidth = Math.max(CARD_WIDTH, resizingState.current.w + dx);
      const newHeight = Math.max(minHeight, resizingState.current.h + dy);
      reactFlowInstance.setNodes((prev: any) =>
        prev.map((n: any) => (n.id === id ? { ...n, style: { ...n.style, width: newWidth, height: newHeight }, data: { ...n.data, size: { w: newWidth, h: newHeight } } } : n)),
      );
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      resizingState.current = null;
      reactFlowInstance.setNodes((prev: any) => prev.map((n: any) => (n.id === id ? { ...n, draggable: true } : n)));
      // Finalize by reflowing sections so neighbors adjust to the new size
      reactFlowInstance.setNodes((prev: any) => reflowAllSections(prev));
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };
}

export function createSectionResizeMouseDown(
  reactFlowInstance: any,
  id: string,
  resizingState: React.MutableRefObject<{ startX: number; startY: number; w: number; h: number } | null>,
) {
  // Manual resize handler for section containers; triggers live reflow while dragging
  return (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const node = reactFlowInstance.getNode(id);
    const w = (node?.style?.width as number) ?? SECTION_WIDTH;
    const h = (node?.style?.height as number) ?? SECTION_HEIGHT;
    resizingState.current = { startX: e.clientX, startY: e.clientY, w, h };
    reactFlowInstance.setNodes((prev: any) => prev.map((n: any) => (n.id === id ? { ...n, draggable: false } : n)));
    const move = (ev: MouseEvent) => {
      if (!resizingState.current) return;
      const dx = ev.clientX - resizingState.current.startX;
      const dy = ev.clientY - resizingState.current.startY;
      const nw = Math.max(320, resizingState.current.w + dx);
      const nh = Math.max(160, resizingState.current.h + dy);
      reactFlowInstance.setNodes((prev: any) => {
        const next = prev.map((n: any) => (n.id === id ? { ...n, style: { ...n.style, width: nw, height: nh } } : { ...n }));
        return reflowAllSections(next);
      });
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      resizingState.current = null;
      reactFlowInstance.setNodes((prev: any) => prev.map((n: any) => (n.id === id ? { ...n, draggable: true } : n)));
      reactFlowInstance.setNodes((prev: any) => reflowAllSections(prev));
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };
}
