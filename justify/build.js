import * as esbuild from 'esbuild';
import { argv } from 'process';

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
});

console.log(`Built: dist/justify-core.js (${dev ? 'dev' : 'prod'})`);

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
