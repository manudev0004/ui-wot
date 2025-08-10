import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, WoTComponent, ParsedAffordance, TDSource } from '../types';
import { ThingDescription } from 'wot-thing-description-types';

type AppAction =
  | { type: 'SET_VIEW'; payload: AppState['currentView'] }
  | { type: 'SET_TD_SOURCE'; payload: TDSource }
  | { type: 'SET_PARSED_TD'; payload: ThingDescription }
  | { type: 'SET_AFFORDANCES'; payload: ParsedAffordance[] }
  | { type: 'SELECT_AFFORDANCES'; payload: string[] }
  | { type: 'ADD_COMPONENT'; payload: WoTComponent }
  | { type: 'UPDATE_COMPONENT'; payload: { id: string; updates: Partial<WoTComponent> } }
  | { type: 'REMOVE_COMPONENT'; payload: string }
  | { type: 'UPDATE_LAYOUT'; payload: { id: string; layout: WoTComponent['layout'] } }
  | { type: 'SET_THING'; payload: { id: string; thing: any } }
  | { type: 'RESET_STATE' };

const initialState: AppState = {
  currentView: 'home',
  availableAffordances: [],
  selectedAffordances: [],
  components: [],
  things: new Map(),
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    
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
        components: state.components.map(comp =>
          comp.id === action.payload.id
            ? { ...comp, ...action.payload.updates }
            : comp
        ),
      };
    
    case 'REMOVE_COMPONENT':
      return {
        ...state,
        components: state.components.filter(comp => comp.id !== action.payload),
      };
    
    case 'UPDATE_LAYOUT':
      return {
        ...state,
        components: state.components.map(comp =>
          comp.id === action.payload.id
            ? { ...comp, layout: action.payload.layout }
            : comp
        ),
      };
    
    case 'SET_THING':
      const newThings = new Map(state.things);
      newThings.set(action.payload.id, action.payload.thing);
      return { ...state, things: newThings };
    
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

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
