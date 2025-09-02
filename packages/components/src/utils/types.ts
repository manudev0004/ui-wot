/**
 * Standard message format for all UI components. For consistent data structure across all components.
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
  /** Success flag*/
  ok?: boolean;
  /** Error details incase operation failed */
  error?: { code?: string; message: string };
  /** Additional metadata if needed */
  meta?: Record<string, any>;
}
