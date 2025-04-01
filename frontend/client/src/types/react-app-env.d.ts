/// <reference types="react" />
/// <reference types="react-dom" />
/// <reference types="@mui/material" />
/// <reference types="@mui/x-data-grid" />
/// <reference types="date-fns" />

declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;
  const src: string;
  export default src;
}

declare module '*.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.json' {
  const value: any;
  export default value;
} 