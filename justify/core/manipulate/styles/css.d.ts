// CSS files are imported as raw strings via esbuild's `text` loader (build.js)
// and shipped as constructable CSSStyleSheets on the shadow root.
declare module '*.css' {
  const css: string;
  export default css;
}
