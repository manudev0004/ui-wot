import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, WoTComponent, ParsedAffordance, TDSource, TDInfo, AffordanceGroup } from '../types';

type AppAction =
  | { type: 'SET_VIEW'; payload: AppState['currentView'] }
  | { type: 'ADD_TD'; payload: TDInfo }
  | { type: 'SET_ACTIVE_TD'; payload: string }
  | { type: 'SET_TD_SOURCE'; payload: TDSource }
  | { type: 'SET_PARSED_TD'; payload: any }
  | { type: 'SET_AFFORDANCES'; payload: ParsedAffordance[] }
  | { type: 'SELECT_AFFORDANCES'; payload: string[] }
  | { type: 'ADD_COMPONENT'; payload: WoTComponent }
  | { type: 'UPDATE_COMPONENT'; payload: { id: string; updates: Partial<WoTComponent> } }
  | { type: 'REMOVE_COMPONENT'; payload: string }
  | { type: 'UPDATE_LAYOUT'; payload: { id: string; layout: WoTComponent['layout'] } }
  | { type: 'SET_THING'; payload: { id: string; thing: any } }
  | { type: 'LOAD_DASHBOARD'; payload: { tdInfos: TDInfo[]; components: WoTComponent[]; availableAffordances: ParsedAffordance[]; groups?: AffordanceGroup[] } }
  | { type: 'ADD_GROUP'; payload: AffordanceGroup }
  | { type: 'UPDATE_GROUP'; payload: { id: string; updates: Partial<AffordanceGroup> } }
  | { type: 'REMOVE_GROUP'; payload: string }
  | { type: 'ADD_COMPONENT_TO_GROUP'; payload: { groupId: string; componentId: string } }
  | { type: 'REMOVE_COMPONENT_FROM_GROUP'; payload: { groupId: string; componentId: string } }
  | { type: 'UPDATE_GROUP_INNER_LAYOUT'; payload: { groupId: string; layout: AffordanceGroup['innerLayout'] } }
  | { type: 'TOGGLE_AUTO_ARRANGE' }
  | { type: 'SET_AUTO_ARRANGE'; payload: boolean }
  | { type: 'RESET_STATE' };

const initialState: AppState = {
  currentView: 'home',
  tdInfos: [],
  availableAffordances: [],
  selectedAffordances: [],
  components: [],
  things: new Map(),
  groups: [],
  autoArrange: true, // Default to auto-arrange enabled
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };

    case 'ADD_TD':
      return { 
        ...state, 
        tdInfos: [...state.tdInfos, action.payload],
        activeTdId: action.payload.id
      };

    case 'SET_ACTIVE_TD':
      const activeTd = state.tdInfos.find(td => td.id === action.payload);
      if (activeTd) {
        return {
          ...state,
          activeTdId: action.payload,
          parsedTD: activeTd.td,
          tdSource: activeTd.source
        };
      }
      return state;

    case 'SET_TD_SOURCE':
      return { ...state, tdSource: action.payload };

    case 'SET_PARSED_TD':
      return { ...state, parsedTD: action.payload };

    case 'SET_AFFORDANCES':
      return { ...state, availableAffordances: action.payload };

    case 'SELECT_AFFORDANCES':
      return { ...state, selectedAffordances: action.payload };

    case 'ADD_COMPONENT':
      return { ...state, components: [...state.components, action.payload] };

    case 'UPDATE_COMPONENT':
      return {
        ...state,
        components: state.components.map(comp => (comp.id === action.payload.id ? { ...comp, ...action.payload.updates } : comp)),
      };

    case 'REMOVE_COMPONENT':
      return {
        ...state,
        components: state.components.filter(comp => comp.id !== action.payload),
      };

    case 'UPDATE_LAYOUT':
      return {
        ...state,
        components: state.components.map(comp => (comp.id === action.payload.id ? { ...comp, layout: action.payload.layout } : comp)),
      };

    case 'SET_THING':
      const newThings = new Map(state.things);
      newThings.set(action.payload.id, action.payload.thing);
      return { ...state, things: newThings };

    case 'LOAD_DASHBOARD':
      return {
        ...state,
        tdInfos: action.payload.tdInfos,
        components: action.payload.components,
        availableAffordances: action.payload.availableAffordances,
        groups: action.payload.groups || [],
        currentView: 'component-canvas'
      };

    case 'ADD_GROUP':
      return {
        ...state,
        groups: [...state.groups, action.payload]
      };

    case 'UPDATE_GROUP':
      return {
        ...state,
        groups: state.groups.map(group => 
          group.id === action.payload.id 
            ? { ...group, ...action.payload.updates }
            : group
        )
      };

    case 'REMOVE_GROUP':
      return {
        ...state,
        groups: state.groups.filter(group => group.id !== action.payload)
      };

    case 'ADD_COMPONENT_TO_GROUP':
      return {
        ...state,
        groups: state.groups.map(group => 
          group.id === action.payload.groupId
            ? { ...group, affordanceIds: [...group.affordanceIds, action.payload.componentId] }
            : group
        )
      };

    case 'REMOVE_COMPONENT_FROM_GROUP':
      return {
        ...state,
        groups: state.groups.map(group => 
          group.id === action.payload.groupId
            ? { ...group, affordanceIds: group.affordanceIds.filter(id => id !== action.payload.componentId) }
            : group
        )
      };

    case 'UPDATE_GROUP_INNER_LAYOUT':
      return {
        ...state,
        groups: state.groups.map(group => 
          group.id === action.payload.groupId
            ? { ...group, innerLayout: action.payload.layout }
            : group
        )
      };

    case 'TOGGLE_AUTO_ARRANGE':
      return { ...state, autoArrange: !state.autoArrange };

    case 'SET_AUTO_ARRANGE':
      return { ...state, autoArrange: action.payload };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
