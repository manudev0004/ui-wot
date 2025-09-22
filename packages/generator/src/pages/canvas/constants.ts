import type { Layout } from 'react-grid-layout';

export const COLS = 48; 
export const MARGIN: [number, number] = [12, 12];
export const PADDING: [number, number] = [12, 12];

export const DEFAULT_SIZES: Record<string, { w: number; h: number; minW?: number; minH?: number }> = {
  'ui-button': { w: 4, h: 2, minW: 4, minH: 2 },
  'ui-toggle': { w: 4, h: 2, minW: 4, minH: 2 },
  'ui-slider': { w: 5, h: 2, minW: 4, minH: 2 },
  'ui-text': { w: 6, h: 3, minW: 6, minH: 3 },
  'ui-number-picker': { w: 6, h: 3, minW: 6, minH: 3 },
  'ui-color-picker': { w: 6, h: 3, minW: 6, minH: 3 },
  'ui-file-picker': { w: 6, h: 3, minW: 6, minH: 3 },
  'ui-calendar': { w: 7, h: 2, minW: 7, minH: 2 },
  'ui-checkbox': { w: 3, h: 2, minW: 2, minH: 2 },
  'ui-event': { w: 7, h: 6, minW: 6, minH: 5 },
  'ui-object': { w: 9, h: 13, minW: 8, minH: 13 },
};

export type SectionBoxes = {
  byTd: Record<string, { minX: number; minY: number; maxX: number; maxY: number }>;
  byTdItems: Record<string, Layout[]>;
};
