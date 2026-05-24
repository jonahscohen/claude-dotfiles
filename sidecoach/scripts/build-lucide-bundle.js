#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const LUCIDE_SRC = '/Users/spare3/Documents/Github/lucide/icons';

// Icons in this list use their bundle key (what consumers reference) mapped to
// the actual Lucide filename (which may differ due to renames across Lucide versions).
// Format: 'bundle-key' or ['bundle-key', 'actual-filename']
const CURATED = [
  ['home', 'house'],
  'menu', 'x', 'search', 'settings', 'user', 'users', 'bell', 'heart', 'star',
  'arrow-left', 'arrow-right', 'arrow-up', 'arrow-down',
  'chevron-left', 'chevron-right', 'chevron-up', 'chevron-down',
  'check',
  ['check-circle', 'circle-check'],
  ['x-circle', 'circle-x'],
  ['alert-circle', 'circle-alert'],
  'info',
  ['help-circle', 'circle-help'],
  'plus', 'minus',
  ['edit', 'pencil'],
  'trash', 'copy', 'download', 'upload', 'share', 'external-link',
  'mail', 'phone', 'calendar', 'clock', 'map-pin',
  'eye', 'eye-off', 'lock',
  ['unlock', 'lock-open'],
  'shield-check',
  'file', 'folder', 'image', 'video', 'music', 'book-open',
  'play', 'pause',
  ['stop-circle', 'circle-stop'],
  'skip-back', 'skip-forward', 'volume-2',
  'globe', 'link',
  'workflow', 'layers', 'box', 'grid-2x2', 'sparkles', 'zap', 'gauge',
  'terminal', 'compass', 'type', 'palette', 'file-code',
];

if (!fs.existsSync(LUCIDE_SRC)) {
  console.error(`Lucide source not found at ${LUCIDE_SRC}. Clone https://github.com/lucide-icons/lucide first.`);
  process.exit(2);
}

const bundle = {};
const missing = [];

for (const entry of CURATED) {
  const bundleKey = Array.isArray(entry) ? entry[0] : entry;
  const fileName = Array.isArray(entry) ? entry[1] : entry;
  const svgPath = path.join(LUCIDE_SRC, `${fileName}.svg`);
  if (!fs.existsSync(svgPath)) {
    missing.push(`${bundleKey} (looked for ${fileName}.svg)`);
    continue;
  }
  const svg = fs.readFileSync(svgPath, 'utf8');
  const inner = svg.replace(/^[\s\S]*?>\s*/, '').replace(/<\/svg>\s*$/, '').trim();
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  bundle[bundleKey] = {
    inner,
    viewBox: viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: '2',
  };
}

const outPath = path.resolve(__dirname, '..', 'data', 'icons', 'lucide.json');
fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2));
console.log(`Bundled ${Object.keys(bundle).length} Lucide icons to ${outPath}`);
if (missing.length) console.log(`Missing (skipped): ${missing.join(', ')}`);
