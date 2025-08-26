// Type-only facade for WoT service types used in the components package.
// Simple runtime implementation is provided in `simple-wot-service.ts`.

export interface ThingDescription {
  '@context'?: string | string[];
  '@type'?: string | string[];
  id?: string;
  title: string;
  description?: string;
  properties?: { [key: string]: any };
  actions?: { [key: string]: any };
  events?: { [key: string]: any };
  links?: any[];
  forms?: any[];
  security?: string[];
  securityDefinitions?: { [key: string]: any };
  base?: string;
  [key: string]: any;
}

export interface PropertyElement {
  type?: string;
  description?: string;
  readOnly?: boolean;
  writeOnly?: boolean;
  observable?: boolean;
  forms?: any[];
  [key: string]: any;
}

export interface ActionElement {
  description?: string;
  input?: any;
  output?: any;
  forms?: any[];
  [key: string]: any;
}

export interface EventElement {
  description?: string;
  data?: any;
  forms?: any[];
  [key: string]: any;
}

export interface Form {
  href: string;
  contentType?: string;
  op?: string | string[];
  [key: string]: any;
}

export interface SecurityScheme {
  scheme?: string;
  [key: string]: any;
}

export interface Subscription {
  stop(): Promise<void>;
  [key: string]: any;
}

export interface ConsumedThing {
  getThingDescription(): ThingDescription;
  readProperty(propertyName: string, options?: any): Promise<any>;
  writeProperty(propertyName: string, value: any, options?: any): Promise<void>;
  observeProperty(propertyName: string, listener: (value: any) => void, errorListener?: (error: Error) => void, options?: any): Promise<any>;
  invokeAction(actionName: string, parameter?: any, options?: any): Promise<any>;
}

export interface WoTServiceConfig {
  debug?: boolean;
  timeout?: number;
  http?: { allowSelfSigned?: boolean; proxy?: string };
  ws?: { allowSelfSigned?: boolean };
  servient?: any;
}

// Expose a lightweight type alias for the runtime implementation
export type WoTService = any;

export type WoTThing = ConsumedThing;
 
