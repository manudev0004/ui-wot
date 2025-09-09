declare namespace JSX {
  interface IntrinsicElements {
    'ui-heading': {
      text?: string;
    };
    'ui-button': {
      variant?: string;
      color?: string;
      label?: string;
      'click-handler'?: string;
      'td-url'?: string;
    };
    'ui-toggle': {
      variant?: string;
      color?: string;
      label?: string;
      value?: string;
      mode?: string;
      'change-handler'?: string;
      'td-url'?: string;
    };
    'ui-slider': {
      variant?: string;
      color?: string;
      label?: string;
      min?: string;
      max?: string;
      value?: string;
      'change-handler'?: string;
      'td-url'?: string;
    };
    'ui-number-picker': {
      variant?: string;
      color?: string;
      label?: string;
      min?: string;
      max?: string;
      value?: string;
      'change-handler'?: string;
      'td-url'?: string;
    };
    'ui-text': {
      variant?: string;
      color?: string;
      label?: string;
      value?: string;
      'change-handler'?: string;
      'td-url'?: string;
    };
    'ui-calendar': {
      variant?: string;
      color?: string;
      label?: string;
      value?: string;
      'change-handler'?: string;
      'td-url'?: string;
    };
    'ui-checkbox': {
      variant?: string;
      color?: string;
      label?: string;
      value?: string;
      'change-handler'?: string;
      'td-url'?: string;
    };
  }
}
