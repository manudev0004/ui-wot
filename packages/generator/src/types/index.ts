export interface ComponentLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

// Canvas layout snapshot
export interface LayoutSnapshot {
  manualPositions: Record<string, { x: number; y: number }>;
  sizes: Record<string, { w: number; h: number }>;
  membership: Record<string, string | null>;
  layoutOrder: Record<string, string[]>;
  sectionNames: Record<string, string>;
  sectionStyles: Record<string, { bgColor: string; border: 'dashed' | 'solid' | 'none' }>;
}

export interface WoTComponent {
  id: string;
  type: 'property' | 'action' | 'event';
  title: string;
  name: string;
  description?: string;
  schema?: any;
  uiComponent: string;
  variant?: string;
  attributes?: Record<string, string>;
  layout: ComponentLayout;
  affordanceKey: string;
  tdId: string;
  hideCard?: boolean;
  tdUrl?: string;
}

export interface TDSource {
  type: 'url' | 'file';
  content: string | File;
}

export interface ParsedAffordance {
  key: string;
  type: 'property' | 'action' | 'event';
  title?: string;
  description?: string;
  schema?: any;
  forms?: any[];
  suggestedComponent: string;
  availableVariants: string[];
  // Possible component types
  possibleComponents?: string[];
}

export interface TDInfo {
  id: string;
  title: string;
  td: any;
  source: TDSource;
}

export interface AffordanceGroup {
  id: string;
  tdId: string;
  title: string;
  description?: string;
  layout: ComponentLayout;
  options: {
    visible: boolean;
    borderStyle: 'solid' | 'dashed' | 'none';
    backgroundColor: string;
    headerColor: string;
    collapsed: boolean;
    hideWrapper: boolean;
  };
  affordanceIds: string[];
  innerLayout: Array<{
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
  minSize: {
    width: number;
    height: number;
  };
}

export interface AppState {
  tdInfos: TDInfo[];
  activeTdId?: string;
  tdSource?: TDSource;
  parsedTD?: any;
  availableAffordances: ParsedAffordance[];
  selectedAffordances: string[];
  components: WoTComponent[];
  things: Map<string, any>;
  groups: AffordanceGroup[];
  // Optional persisted canvas layout for React Flow
  layoutSnapshot?: LayoutSnapshot;
}
