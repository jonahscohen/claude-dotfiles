// Asset URLs for water-ripple. Default imports resolve in Vite + esbuild (dataurl).
import image from './assets/image.png';
import brush from './assets/water-ripple-brush.png';

export const assets: Record<string, string> = {
  image,
  'water-ripple-brush': brush,
};
