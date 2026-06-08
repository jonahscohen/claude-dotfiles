import * as esbuild from 'esbuild';
import { argv } from 'process';
import { copyFileSync, readdirSync, mkdirSync, existsSync } from 'fs';

const coreOnly = argv.includes('--core-only');
const dev = argv.includes('--dev');

await esbuild.build({
  entryPoints: ['core/index.ts'],
  bundle: true,
  outfile: 'dist/justify-core.js',
  format: 'iife',
  globalName: 'Justify',
  minify: !dev,
  sourcemap: true,
  target: 'es2022',
  // Preact render layer for the ported Retune Design panel. JSX compiles to
  // preact/jsx-runtime; react/react-dom imports in ported .tsx resolve to
  // preact/compat. Applied to the CORE bundle only - the react/vue/svelte
  // adapters below are host-framework shims and must NOT be aliased.
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: {
    react: 'preact/compat',
    'react-dom': 'preact/compat',
    'react/jsx-runtime': 'preact/jsx-runtime',
    'react/jsx-dev-runtime': 'preact/jsx-dev-runtime',
  },
  // Panel/section CSS is imported as a raw string and shipped as a
  // constructable CSSStyleSheet on the shadow root (adoptedStyleSheets), the
  // same primitive PreviewEngine uses. The `text` loader returns file contents
  // verbatim - esbuild does NOT parse/transform the CSS, so :host, color-mix,
  // etc. survive untouched. Nothing else in the core imports .css.
  loader: { '.css': 'text' },
});

console.log(`Built: dist/justify-core.js (${dev ? 'dev' : 'prod'})`);

// Copy the status-bar sprite sheets into dist so the daemon can serve them at
// /spark-<name>.svg. The core fetches these at runtime to animate the Claudebar
// icon; without them the icon silently 404s and renders blank. They live in
// assets/ in source; mkdir dist defensively in case this runs before esbuild
// created it (it won't here, but keeps the copy self-contained).
if (existsSync('assets')) {
  mkdirSync('dist', { recursive: true });
  for (const f of readdirSync('assets')) {
    if (f.startsWith('spark-') && f.endsWith('.svg')) {
      copyFileSync(`assets/${f}`, `dist/${f}`);
    }
  }
  console.log('Copied: assets/spark-*.svg -> dist/');
}

if (coreOnly) {
  process.exit(0);
}

const adapters = ['react', 'vue', 'svelte'];

for (const name of adapters) {
  try {
    await esbuild.build({
      entryPoints: [`adapters/${name}/index.ts`],
      bundle: true,
      outfile: `dist/justify-${name}.js`,
      format: 'iife',
      globalName: `Justify_${name}`,
      minify: !dev,
      sourcemap: true,
      target: 'es2022',
    });
    console.log(`Built: dist/justify-${name}.js`);
  } catch {
    console.log(`Skipped adapter: ${name} (not found)`);
  }
}
