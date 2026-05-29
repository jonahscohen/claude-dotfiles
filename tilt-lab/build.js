import * as esbuild from 'esbuild';
import { argv } from 'process';

const dev = argv.includes('--dev');

await esbuild.build({
  entryPoints: ['runtime/index.ts'],
  bundle: true,
  outfile: 'dist/tilt-runtime.js',
  format: 'esm',
  // `.png`/`.jpg` -> inlined data URLs so the runtime bundle is self-contained
  // and effects receive real asset URLs (resolved from `new URL(..., import.meta.url)`).
  loader: { '.json': 'json', '.png': 'dataurl', '.jpg': 'dataurl' },
  minify: !dev,
  sourcemap: true,
  target: 'es2022',
});

console.log(`Built: dist/tilt-runtime.js (${dev ? 'dev' : 'prod'})`);
