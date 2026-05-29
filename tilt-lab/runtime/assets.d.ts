// Ambient declarations for static image imports.
//
// A default image import resolves to a usable URL string in BOTH bundlers:
//   - Vite (playground / vitest): the resolved asset URL (or an inlined data
//     URL for small assets).
//   - esbuild (runtime bundle): an inlined `data:` URL via the dataurl loader
//     configured in build.js.
//
// NOTE: esbuild does NOT rewrite `new URL('./x.png', import.meta.url)` for any
// loader (verified empirically), so the asset-delivery convention uses default
// imports instead - they inline under esbuild and resolve natively under Vite.
declare module '*.png' {
  const url: string;
  export default url;
}
declare module '*.jpg' {
  const url: string;
  export default url;
}
