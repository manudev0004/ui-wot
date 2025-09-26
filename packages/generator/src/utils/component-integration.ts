/**
 * Maps WoT Thing Description affordances to appropriate UI components
 */
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
      case 'number':
        if (minimum !== undefined && maximum !== undefined) {
          const range = maximum - minimum;
          // For integers, prefer slider for reasonable ranges
          if (type === 'integer' && range <= 100) {
            return {
              componentName: 'ui-slider',
              props: {
                min: minimum,
                max: maximum,
                readonly: readOnly,
                step: 1,
              },
            };
          } else if (type === 'number' && range <= 1000) {
            // For numbers, use slider for reasonable ranges
            return {
              componentName: 'ui-slider',
              props: {
                min: minimum,
                max: maximum,
                readonly: readOnly,
              },
            };
          } else {
            // For large ranges, prefer number picker
            return {
              componentName: 'ui-number-picker',
              props: {
                min: minimum,
                max: maximum,
                readonly: readOnly,
                step: type === 'integer' ? 1 : undefined,
              },
            };
          }
        } else {
          // Use number picker for open-ended values
          return {
            componentName: 'ui-number-picker',
            props: {
              min: minimum,
              max: maximum,
              readonly: readOnly,
              step: type === 'integer' ? 1 : undefined,
            },
          };
        }

      case 'string':
        if (enumValues && enumValues.length > 0) {
          // Could map to a select component (not implemented yet)
          return {
            componentName: 'ui-text',
            props: {
              readonly: readOnly,
              // Use editable mode only when writable; otherwise leave default 'field'
              ...(readOnly ? {} : { mode: 'editable' as const }),
            },
          };
        } else if (property.format === 'date-time' || property.format === 'date') {
          return {
            componentName: 'ui-calendar',
            props: {
              readonly: readOnly,
              includeTime: property.format === 'date-time',
            },
          };
        } else if (property.format === 'color') {
          return {
            componentName: 'ui-color-picker',
            props: {
              readonly: readOnly,
            },
          };
        } else {
          return {
            componentName: 'ui-text',
            props: {
              readonly: readOnly,
              ...(readOnly ? {} : { mode: 'editable' as const }),
            },
          };
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
    const { input } = action;

    if (input && input.type === 'object' && input.properties?.file) {
      // File upload action
      return {
        componentName: 'ui-file-picker',
        props: {
          accept: input.properties.file.contentMediaType || '*/*',
        },
      };
    } else {
      // Generic action button
      return {
        componentName: 'ui-button',
        props: {},
      };
    }
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
      case 'number':
        // For integers and numbers, always provide both slider and number picker options
        // but prioritize slider when there's a reasonable range
        if (minimum !== undefined && maximum !== undefined) {
          // Always add slider for ranged values
          possibilities.push({
            componentName: 'ui-slider',
            props: {
              min: minimum,
              max: maximum,
              readonly: readOnly,
              step: type === 'integer' ? 1 : undefined,
            },
          });
        }

        // Always add number picker as an option
        possibilities.push({
          componentName: 'ui-number-picker',
          props: {
            min: minimum,
            max: maximum,
            readonly: readOnly,
            step: type === 'integer' ? 1 : undefined,
          },
        });
        break;

      case 'string':
        // String properties have multiple options based on format
        if (format === 'date-time' || format === 'date') {
          possibilities.push({
            componentName: 'ui-calendar',
            props: {
              readonly: readOnly,
              includeTime: format === 'date-time',
            },
          });
        } else if (format === 'color') {
          possibilities.push({
            componentName: 'ui-color-picker',
            props: {
              readonly: readOnly,
            },
          });
        }

        // All string properties can use text input
        possibilities.push({
          componentName: 'ui-text',
          props: {
            readonly: readOnly,
            ...(readOnly ? {} : { mode: 'editable' as const }),
          },
        });
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
