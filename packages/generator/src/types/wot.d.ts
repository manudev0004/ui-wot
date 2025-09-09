declare module '@node-wot/browser-bundle' {
  export class Servient {
    addClientFactory(factory: any): void;
    start(): Promise<void>;
    addThing(td: any): Promise<any>;
    shutdown(): Promise<void>;
  }
}

declare module '@node-wot/core' {
  export interface WoTThing {
    readProperty(propertyName: string): Promise<any>;
    writeProperty(propertyName: string, value: any): Promise<void>;
    invokeAction(actionName: string, input?: any): Promise<any>;
    subscribeEvent(eventName: string, callback: (data: any) => void): Promise<void>;
  }
}

declare global {
  interface Window {
    HttpClientFactory: any;
  }
}

declare module 'react-grid-layout' {
  import * as React from 'react';

  export interface Layout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    static?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
  }

  export interface ResponsiveLayout {
    [key: string]: Layout[];
  }

  export interface Breakpoints {
    [key: string]: number;
  }

  export interface Cols {
    [key: string]: number;
  }

  export interface ResponsiveProps {
    className?: string;
    layouts?: ResponsiveLayout;
    breakpoints?: Breakpoints;
    cols?: Cols;
    rowHeight?: number;
    onLayoutChange?: (layout: Layout[]) => void;
    isDraggable?: boolean;
    isResizable?: boolean;
    margin?: [number, number];
    containerPadding?: [number, number];
    children?: React.ReactNode;
  }

  export class Responsive extends React.Component<ResponsiveProps> {}

  export function WidthProvider<T>(component: React.ComponentType<T>): React.ComponentType<T>;
}

declare module 'react-resizable' {
  export const Resizable: any;
}
