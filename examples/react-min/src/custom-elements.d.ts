declare namespace JSX {
  interface IntrinsicElements {
    'ui-toggle': any;
    'ui-button': any;
    'ui-event': any;
    'ui-slider': any;
    'ui-text': any;
    'ui-color-picker': any;
    'ui-calendar': any;
    'ui-file-picker': any;
  }
}

// Extend HTMLElement for Stencil component methods
interface HTMLElement {
  componentOnReady?: () => Promise<void>;
  setValue?: (value: any, options?: any) => Promise<boolean>;
  value?: any;
}
