// Asset URLs for fake-3d-image. colorSrc is the photo, depthSrc is a grayscale
// depth map (near = white, far = black). Default imports resolve in Vite + esbuild.
import colorSrc from './assets/color.png';
import depthSrc from './assets/depth.png';

export const assets: Record<string, string> = { colorSrc, depthSrc };
