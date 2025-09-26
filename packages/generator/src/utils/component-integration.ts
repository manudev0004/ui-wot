import { ParsedAffordance } from '../types';

/**
 * Maps WoT Thing Description affordances to appropriate UI components
 */

function isReasonableRange(type: string | undefined, min?: number, max?: number): boolean {
  if (min === undefined || max === undefined) return false;
  const range = max - min;
  if (type === 'integer') return range <= 100;
  if (type === 'number') return range <= 1000;
  return false;
}

function hasNestedFormat(obj: any): { hasFile: boolean; hasDate: boolean; hasTime: boolean; hasColor: boolean } {
  let hasFile = false;
  let hasDate = false;
  let hasTime = false;
  let hasColor = false;

  const visit = (node: any, keyPath: string[] = []) => {
    if (!node || typeof node !== 'object') return;

    const keyJoined = keyPath.join('.').toLowerCase();
    const nameHints = ['file', 'upload', 'image', 'picture'];
    if (nameHints.some(h => keyJoined.includes(h))) hasFile = true;
    if (keyJoined.includes('date')) hasDate = true;
    if (keyJoined.includes('time')) hasTime = true;
    if (keyJoined.includes('color') || keyJoined.includes('colour')) hasColor = true;

    const format = (node as any).format;
    if (format === 'date' || format === 'date-time') hasDate = true;
    if (format === 'time') hasTime = true;
    if (format === 'color') hasColor = true;

    if ((node as any).contentMediaType || (node as any).contentEncoding === 'base64' || (node as any).binary === true) {
      hasFile = true;
    }

    if (node.properties && typeof node.properties === 'object') {
      for (const [k, v] of Object.entries(node.properties)) {
        visit(v, [...keyPath, String(k)]);
      }
    }

    if (Array.isArray(node.anyOf)) node.anyOf.forEach((v: any) => visit(v, keyPath));
    if (Array.isArray(node.oneOf)) node.oneOf.forEach((v: any) => visit(v, keyPath));
    if (Array.isArray(node.allOf)) node.allOf.forEach((v: any) => visit(v, keyPath));
  };

  visit(obj);
  return { hasFile, hasDate, hasTime, hasColor };
}

// Build a single best numeric component from schema
function pickNumericComponent(schema: any, readOnly: boolean): { componentName: string; props: any } {
  const t = schema?.type as 'integer' | 'number' | undefined;
  const min = schema?.minimum;
  const max = schema?.maximum;
  const useSlider = isReasonableRange(t, min, max);
  if (useSlider) {
    return {
      componentName: 'ui-slider',
      props: { min, max, readonly: readOnly, step: t === 'integer' ? 1 : undefined },
    };
  }
  return {
    componentName: 'ui-number-picker',
    props: { min, max, readonly: readOnly, step: t === 'integer' ? 1 : undefined },
  };
}

// List of possible numeric components from schema
function numericPossibilities(schema: any, readOnly: boolean): Array<{ componentName: string; props: any }> {
  const t = schema?.type as 'integer' | 'number' | undefined;
  const min = schema?.minimum;
  const max = schema?.maximum;
  const list: Array<{ componentName: string; props: any }> = [];
  if (min !== undefined && max !== undefined) {
    list.push({ componentName: 'ui-slider', props: { min, max, readonly: readOnly, step: t === 'integer' ? 1 : undefined } });
  }
  list.push({ componentName: 'ui-number-picker', props: { min, max, readonly: readOnly, step: t === 'integer' ? 1 : undefined } });
  return list;
}

// List of possible string components from schema
function stringPossibilities(schema: any, readOnly: boolean): Array<{ componentName: string; props: any }> {
  const fmt = schema?.format as string | undefined;
  const out: Array<{ componentName: string; props: any }> = [];
  if (fmt === 'date-time' || fmt === 'date') {
    out.push({ componentName: 'ui-calendar', props: { readonly: readOnly, includeTime: fmt === 'date-time' } });
  } else if (fmt === 'time') {
    out.push({ componentName: 'ui-calendar', props: { readonly: readOnly, includeTime: true } });
  } else if (fmt === 'color') {
    out.push({ componentName: 'ui-color-picker', props: { readonly: readOnly } });
  }
  out.push({ componentName: 'ui-text', props: { readonly: readOnly, ...(readOnly ? {} : { mode: 'editable' as const }) } });
  return out;
}
export class ComponentMapper {
  /**
   * Infer canRead/canWrite from TD flags and forms
   */
  private static analyzeCapabilities(property: any): { canRead: boolean; canWrite: boolean } {
    let canRead = true;
    let canWrite = true;
    if (!property) return { canRead, canWrite };

    if (property.readOnly === true) canWrite = false;
    if (property.writeOnly === true) canRead = false;

    if (Array.isArray(property.forms)) {
      const ops: string[] = [];
      for (const f of property.forms) {
        if (!f) continue;
        if (typeof f.op === 'string') ops.push(f.op);
        else if (Array.isArray(f.op)) ops.push(...f.op);
      }
      if (ops.length > 0) {
        const hasRead = ops.some(o => /readproperty/i.test(o));
        const hasWrite = ops.some(o => /writeproperty/i.test(o));
        // Only override if explicit ops provided
        canRead = hasRead;
        canWrite = hasWrite;
      }
    }

    return { canRead, canWrite };
  }
  /**
   * Maps a WoT property to the most appropriate UI component
   */
  static mapPropertyToComponent(property: any): {
    componentName: string;
    props: any;
  } | null {
    const { type, minimum, maximum, enum: enumValues } = property;
    const { canWrite } = this.analyzeCapabilities(property);
    const readOnly = !canWrite;

    switch (type) {
      case 'boolean':
        return {
          componentName: 'ui-toggle',
          props: {
            readonly: readOnly,
          },
        };

      case 'integer':
      case 'number': {
        return pickNumericComponent({ type, minimum, maximum }, readOnly);
      }

      case 'string':
        if (enumValues && enumValues.length > 0) {
          return {
            componentName: 'ui-text',
            props: {
              readonly: readOnly,
              // Use editable mode only when writable; otherwise leave default 'field'
              ...(readOnly ? {} : { mode: 'editable' as const }),
            },
          };
        } else {
          // Delegate to string possibilities helper
          return stringPossibilities(property, readOnly)[0] || null;
        }

      case 'object':
        return {
          componentName: 'ui-object',
          props: {
            readonly: readOnly,
          },
        };

      case 'array':
        // Represent arrays using text in structured mode
        return {
          componentName: 'ui-text',
          props: {
            readonly: readOnly,
            mode: 'structured',
            spellcheck: false,
          },
        };

      default:
        return null;
    }
  }

  /**
   * Maps a WoT action to the most appropriate UI component
   */
  static mapActionToComponent(action: any): {
    componentName: string;
    props: any;
  } | null {
    const input = action?.input || action;
    const detect = hasNestedFormat(input);
    if (detect.hasFile) {
      return {
        componentName: 'ui-file-picker',
        props: {
          accept: (input?.properties?.file?.contentMediaType as string) || '*/*',
        },
      };
    }
    return { componentName: 'ui-button', props: {} };
  }

  /**
   * Maps a WoT event to the most appropriate UI component
   */
  static mapEventToComponent(_event: any): {
    componentName: string;
    props: any;
  } | null {
    return {
      componentName: 'ui-event',
      props: {},
    };
  }

  /**
   * Returns all possible component mappings for a given event
   */
  static getAllPossibleComponentsForEvent(_event: any): Array<{
    componentName: string;
    props: any;
  }> {
    // Events can be displayed using ui-event or ui-notification
    return [
      {
        componentName: 'ui-event',
        props: {},
      },
      {
        componentName: 'ui-notification',
        props: {},
      },
    ];
  }

  /**
   * Returns all possible component mappings for a given property
   */
  static getAllPossibleComponents(property: any): Array<{
    componentName: string;
    props: any;
  }> {
    const { type, minimum, maximum, format } = property;
    const { canWrite } = this.analyzeCapabilities(property);
    const readOnly = !canWrite;
    const possibilities: Array<{ componentName: string; props: any }> = [];

    switch (type) {
      case 'boolean':
        // Boolean properties can use toggle or checkbox
        possibilities.push({
          componentName: 'ui-toggle',
          props: {
            readonly: readOnly,
          },
        });
        possibilities.push({
          componentName: 'ui-checkbox',
          props: {
            readonly: readOnly,
          },
        });
        break;

      case 'integer':
      case 'number': {
        numericPossibilities({ type, minimum, maximum }, readOnly).forEach(p => possibilities.push(p));
        break;
      }

      case 'string':
        stringPossibilities({ format }, readOnly).forEach(p => possibilities.push(p));
        break;

      case 'object':
        possibilities.push({
          componentName: 'ui-object',
          props: {
            readonly: readOnly,
          },
        });
        break;

      case 'array':
        // Use text component in structured mode for arrays
        possibilities.push({
          componentName: 'ui-text',
          props: {
            readonly: readOnly,
            mode: 'structured',
            spellcheck: false,
          },
        });
        break;
    }

    return possibilities;
  }
}

/**
 * Returns a ranked list of suggested UI components
 */
export function getSuggestedComponentOrder(aff: ParsedAffordance): string[] {
  const out: Array<{ name: string; score: number }> = [];

  const push = (name: string, score: number) => {
    const existing = out.find(o => o.name === name);
    if (existing) {
      existing.score = Math.max(existing.score, score);
    } else {
      out.push({ name, score });
    }
  };

  if (aff.suggestedComponent) push(aff.suggestedComponent, 80);
  if (aff.possibleComponents) aff.possibleComponents.forEach(pc => push(pc, 50));

  if (aff.type === 'property') {
    const schema = (aff as any).schema || {};
    const t = schema.type as string | undefined;
    switch (t) {
      case 'boolean':
        push('ui-toggle', 100);
        push('ui-checkbox', 60);
        break;
      case 'integer':
      case 'number': {
        const hasReasonable = isReasonableRange(t, schema.minimum, schema.maximum);
        // Prefer slider when range is reasonable, otherwise keep it listed but below
        push('ui-slider', hasReasonable ? 100 : 92);
        push('ui-number-picker', 90);
        break;
      }
      case 'string': {
        const fmt = schema.format as string | undefined;
        if (fmt === 'date' || fmt === 'date-time' || fmt === 'time') push('ui-calendar', 100);
        if (fmt === 'color') push('ui-color-picker', 100);
        push('ui-text', 80);
        break;
      }
      case 'object': {
        const detect = hasNestedFormat(schema);
        if (detect.hasFile) push('ui-file-picker', 100);
        if (detect.hasDate || detect.hasTime) push('ui-calendar', 95);
        if (detect.hasColor) push('ui-color-picker', 95);
        push('ui-object', 85);
        push('ui-text', 60);
        break;
      }
      case 'array':
        push('ui-text', 80);
        break;
      default:
        push('ui-text', 50);
        break;
    }
  } else if (aff.type === 'action') {
    const schema = (aff as any).schema || {};
    const input = schema.input || schema;
    const detect = hasNestedFormat(input);
    if (detect.hasFile) push('ui-file-picker', 95);
    push('ui-button', 100);
  } else if (aff.type === 'event') {
    push('ui-event', 100);
    push('ui-notification', 80);
  }

  const ordered = out
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    })
    .map(o => o.name);

  return Array.from(new Set(ordered));
}
