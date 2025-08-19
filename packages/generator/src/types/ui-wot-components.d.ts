declare module '../../components/dist/ui-wot-components/ui-wot-components.esm.js' {
  const content: any;
  export default content;
}

// Fallback wildcard declarations for different import resolutions
declare module '../../components/dist/ui-wot-components/*' {
  const content: any;
  export default content;
}

declare module '*ui-wot-components.esm.js' {
  const content: any;
  export default content;
}
