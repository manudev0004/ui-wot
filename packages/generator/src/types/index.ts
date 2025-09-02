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

export interface WoTComponent {
  id: string;
  type: 'property' | 'action' | 'event';
  title: string;
  name: string;
  description?: string;
  schema?: any;
  uiComponent: string; // The stencil component to use
  variant?: string; // Component variant
  layout: ComponentLayout;
  thing: any; // Reference to the WoT thing
  affordanceKey: string; // Key of the affordance in TD
  tdId: string; // Reference to the TD this component belongs to
  hideCard?: boolean; // Whether to hide the card wrapper and show only the component
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
  // List of possible component types that can be used for this affordance (first is preferred)
  possibleComponents?: string[];
}

export interface TDInfo {
  id: string;
  title: string;
  td: any; // ThingDescription type
  source: TDSource;
}

export interface AppState {
  currentView: 'home' | 'td-input' | 'affordance-selection' | 'component-canvas';
  tdInfos: TDInfo[]; // Support multiple TDs
  activeTdId?: string; // Currently active TD for affordance selection
  tdSource?: TDSource;
  parsedTD?: any; // ThingDescription type
  availableAffordances: ParsedAffordance[];
  selectedAffordances: string[];
  components: WoTComponent[];
  things: Map<string, any>; // WoT thing instances
}
