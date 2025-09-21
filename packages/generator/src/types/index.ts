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
  /** Arbitrary UI component attributes (kebab-case keys) */
  attributes?: Record<string, string>;
  layout: ComponentLayout;
  thing: any; // Reference to the WoT thing (deprecated; no longer used)
  affordanceKey: string; // Key of the affordance in TD
  tdId: string; // Reference to the TD this component belongs to
  hideCard?: boolean; // Whether to hide the card wrapper and show only the component
  /** Optional TD URL used for one-line services wiring */
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
  // List of possible component types that can be used for this affordance (first is preferred)
  possibleComponents?: string[];
}

export interface TDInfo {
  id: string;
  title: string;
  td: any; // ThingDescription type
  source: TDSource;
}

export interface AffordanceGroup {
  /** Unique group identifier */
  id: string;
  /** Reference to the TD this group belongs to */
  tdId: string;
  /** Display name (TD title or user-defined) */
  title: string;
  /** Optional description */
  description?: string;
  /** Group's position and size in main grid */
  layout: ComponentLayout;
  /** Group visual and behavior options */
  options: {
    /** Toggle transparency/collapse */
    visible: boolean;
    /** Border style for the group container */
    borderStyle: 'solid' | 'dashed' | 'none';
    /** Background color (hex color or CSS color name) */
    backgroundColor: string;
    /** Header/heading background color */
    headerColor: string;
    /** Whether the group is collapsed */
    collapsed: boolean;
    /** Whether to hide the group wrapper/card */
    hideWrapper: boolean;
  };
  /** List of component IDs in this group */
  affordanceIds: string[];
  /** Internal grid layout for components within group */
  innerLayout: Array<{
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
  /** Minimum group dimensions */
  minSize: {
    width: number;
    height: number;
  };
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
  groups: AffordanceGroup[]; // Affordance groups for organizing components
}
