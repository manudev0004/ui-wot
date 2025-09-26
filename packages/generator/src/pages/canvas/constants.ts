// Canvas constants for layout and sizing
export const SECTION_WIDTH = 640;
export const SECTION_HEIGHT = 360;
export const GAP = 10;
export const MIN_GAP = 8;
export const CARD_WIDTH = 280;
export const CARD_HEIGHT = 140;
export const EVENT_CARD_HEIGHT = 304;
export const OBJECT_CARD_HEIGHT = 304;

export function getMinCardHeight(component: any): number {
  const uiType = component?.uiComponent?.toLowerCase?.() || '';
  if (uiType.includes('event')) return EVENT_CARD_HEIGHT;
  if (uiType.includes('object') || component?.affordanceKey?.includes?.('object')) return OBJECT_CARD_HEIGHT;
  return CARD_HEIGHT;
}

export function getCardDimensions(component: any): { w: number; h: number } {
  if (!component) return { w: CARD_WIDTH, h: CARD_HEIGHT };

  const uiComponentType = component.uiComponent?.toLowerCase() || '';

  if (uiComponentType.includes('event')) {
    return { w: CARD_WIDTH, h: EVENT_CARD_HEIGHT };
  }

  if (uiComponentType.includes('object') || component.affordanceKey?.includes('object')) {
    return { w: CARD_WIDTH, h: OBJECT_CARD_HEIGHT };
  }

  return { w: CARD_WIDTH, h: CARD_HEIGHT };
}
