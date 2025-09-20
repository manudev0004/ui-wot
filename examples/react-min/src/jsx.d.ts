import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ui-object': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        label?: string;
        url?: string;
        property?: string;
        variant?: 'outlined' | 'filled';
        'show-last-updated'?: string | boolean;
        'show-status'?: string | boolean;
        strategy?: 'observe' | 'poll' | 'auto';
        'poll-ms'?: string | number;
      };
    }
  }
}

export {};