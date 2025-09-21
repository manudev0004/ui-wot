export const ATTRIBUTE_SCHEMAS: Record<string, Record<string, 'string' | 'number' | 'boolean'>> = {
  'ui-button': {
    'disabled': 'boolean',
    'show-status': 'boolean',
    'show-last-updated': 'boolean',
    'label': 'string',
  },
  'ui-toggle': {
    'disabled': 'boolean',
    'readonly': 'boolean',
    'show-status': 'boolean',
    'show-last-updated': 'boolean',
  },
  'ui-checkbox': {
    'disabled': 'boolean',
    'readonly': 'boolean',
    'show-status': 'boolean',
    'show-last-updated': 'boolean',
  },
  'ui-slider': {
    'min': 'number',
    'max': 'number',
    'step': 'number',
    'show-min-max': 'boolean',
    'disabled': 'boolean',
    'readonly': 'boolean',
    'show-status': 'boolean',
  },
  'ui-number-picker': {
    'min': 'number',
    'max': 'number',
    'step': 'number',
    'precision': 'number',
    'disabled': 'boolean',
    'readonly': 'boolean',
    'show-status': 'boolean',
  },
  'ui-text': {
    'mode': 'string',
    'placeholder': 'string',
    'debounce-ms': 'number',
    'readonly': 'boolean',
    'show-status': 'boolean',
  },
  'ui-calendar': {
    'include-time': 'boolean',
    'readonly': 'boolean',
    'disabled': 'boolean',
    'show-status': 'boolean',
  },
  'ui-color-picker': {
    'readonly': 'boolean',
    'disabled': 'boolean',
    'show-status': 'boolean',
  },
  'ui-file-picker': {
    'accept': 'string',
    'multiple': 'boolean',
    'show-status': 'boolean',
  },
  'ui-event': {
    'max-events': 'number',
    'show-timestamps': 'boolean',
    'auto-scroll': 'boolean',
    'show-status': 'boolean',
    'label': 'string',
  },
  'ui-notification': {
    'type': 'string',
    'duration': 'number',
    'show-status': 'boolean',
  },
  'ui-object': {
    'show-status': 'boolean',
    'show-last-updated': 'boolean',
  },
};

export function getAttributeSchema(componentType: string) {
  return ATTRIBUTE_SCHEMAS[componentType] || {};
}
