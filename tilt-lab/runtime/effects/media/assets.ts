// Default sample for the Image / Video layer so it renders real content
// out-of-the-box (and post effects have something to transform); the user can
// still upload their own image/video via the `source` file param, which
// overrides this. Default image import resolves in Vite + esbuild alike.
import sample from './assets/sample.png';

export const assets: Record<string, string> = { source: sample };
