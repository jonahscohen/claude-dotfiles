import { createIconSourceReference } from '../icon-source-reference';

const ref: any = createIconSourceReference();
const home = ref.getIconSource('lucide', 'home');
if (!home) { console.error('FAIL: home icon missing'); process.exit(1); }
if (typeof home.inner !== 'string' || home.inner.length < 10) { console.error('FAIL: inner is not a non-empty string'); process.exit(1); }
if (home.viewBox !== '0 0 24 24') { console.error('FAIL: viewBox mismatch'); process.exit(1); }

const ghost = ref.getIconSource('lucide', 'does-not-exist-xyz');
if (ghost !== null) { console.error('FAIL: missing icon should return null'); process.exit(1); }

const bad = ref.getIconSource('not-a-library', 'home');
if (bad !== null) { console.error('FAIL: unknown library should return null'); process.exit(1); }

console.log('icon-source-reference paths test PASS');
