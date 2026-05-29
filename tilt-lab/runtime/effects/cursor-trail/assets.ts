// Asset URLs for cursor-trail. Default image imports resolve in BOTH Vite
// (playground, native) and esbuild (bundle, inlined via the dataurl loader).
import item1 from './assets/item1.png';
import item2 from './assets/item2.png';

export const assets: Record<string, string> = { item1, item2 };
