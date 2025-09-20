// TypeScript JSX support for UI-WoT custom elements in the React demo
// Demo-only: keeps the editor happy by declaring intrinsic JSX tags.

declare namespace JSX {
  interface IntrinsicElements {
    'ui-toggle': any;
    'ui-slider': any;
    'ui-text': any;
    'ui-button': any;
    'ui-event': any;
    'ui-object': any;
    'ui-number-picker': any;
    'ui-color-picker': any;
    'ui-checkbox': any;
    'ui-calendar': any;
    'ui-file-picker': any;
    'ui-notification': any;
  }
}
