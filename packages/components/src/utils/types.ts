/**
 * Standard message format for all UI components.
 * This unified event payload provides consistent data structure across all components.
 */
export interface UiMsg<T = any> {
  /** Current value */
  payload: T;
  /** Previous value if known */
  prev?: T;
  /** Timestamp in milliseconds */
  ts: number;
  /** Component source identifier */
  source?: string;
  /** Success flag for operations */
  ok?: boolean;
  /** Error details if operation failed */
  error?: { code?: string; message: string };
  /** Additional metadata */
  meta?: Record<string, any>;
}

/**
 * Thing Description property capability classification
 */
export interface TdCapability {
  /** Can read the property value */
  canRead: boolean;
  /** Can write to the property */
  canWrite: boolean;
  /** Can observe/subscribe to property changes */
  canObserve: boolean;
  /** Capability mode classification */
  mode: 'readwrite' | 'read-only' | 'write-only';
}

/**
 * Utility to classify TD property capabilities
 */
export function classifyTdProperty(prop: {
  readOnly?: boolean;
  writeOnly?: boolean;
  observable?: boolean;
}): TdCapability {
  const canWrite = !prop.readOnly && prop.writeOnly !== true;
  const canRead = !prop.writeOnly;
  const canObserve = !!prop.observable && canRead;
  
  let mode: TdCapability['mode'] = 'readwrite';
  if (canRead && !canWrite) mode = 'read-only';
  else if (!canRead && canWrite) mode = 'write-only';
  
  return { canRead, canWrite, canObserve, mode };
}
