import type { Effect, EffectOpts } from '../../types';

/**
 * Image / Video - a background layer that renders user-supplied media (the
 * `source` file param yields an object URL). It is the content source that
 * post-process effects (ASCII, halftone, dither, water-ripple) transform, and
 * mirrors the upload capability of the original ascii-magic / motion-core tools.
 * Loads the URL as an image; on failure falls back to a looping muted video.
 */
export function createMediaEffect(): Effect {
  let ctx: CanvasRenderingContext2D | null = null;
  let w = 1;
  let h = 1;
  let img: HTMLImageElement | null = null;
  let video: HTMLVideoElement | null = null;
  let fit: 'cover' | 'contain' = 'cover';
  let opacity = 1;
  let dead = false;

  function clearSource() {
    img = null;
    if (video) {
      try {
        video.pause();
      } catch {
        /* ignore */
      }
    }
    video = null;
  }

  function loadSource(url: string) {
    clearSource();
    if (!url) return;
    if (typeof Image === 'undefined') return; // headless
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => {
      img = im;
      video = null;
    };
    im.onerror = () => {
      // Not an image - try it as a looping, muted, autoplaying video.
      if (typeof document === 'undefined') return;
      const v = document.createElement('video');
      v.src = url;
      v.loop = true;
      v.muted = true;
      (v as HTMLVideoElement & { playsInline?: boolean }).playsInline = true;
      v.oncanplay = () => {
        video = v;
        img = null;
        v.play().catch(() => {
          /* autoplay may be blocked; frame() still draws current frame */
        });
      };
    };
    im.src = url;
  }

  function draw(src: HTMLImageElement | HTMLVideoElement, sw: number, sh: number) {
    if (!ctx || sw === 0 || sh === 0) return;
    const scale = fit === 'cover' ? Math.max(w / sw, h / sh) : Math.min(w / sw, h / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    ctx.globalAlpha = opacity;
    ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
    ctx.globalAlpha = 1;
  }

  return {
    init(canvas: HTMLCanvasElement, opts: EffectOpts) {
      ctx = canvas.getContext('2d');
      if (!ctx) {
        dead = true;
        return;
      }
      if (opts.params.fit === 'contain' || opts.params.fit === 'cover') fit = opts.params.fit;
      if (opts.params.opacity != null) opacity = Number(opts.params.opacity);
      // `||` not `??`: the file param defaults to "" (empty string, not null),
      // so fall through to the bundled default sample when no upload is set.
      const source =
        (typeof opts.params.source === 'string' && opts.params.source) || opts.assets.source;
      if (typeof source === 'string' && source) loadSource(source);
    },
    frame() {
      if (dead || !ctx) return;
      ctx.clearRect(0, 0, w, h);
      if (img && img.complete && img.naturalWidth > 0) {
        draw(img, img.naturalWidth, img.naturalHeight);
      } else if (video && video.readyState >= 2) {
        draw(video, video.videoWidth, video.videoHeight);
      }
    },
    resize(nw: number, nh: number) {
      w = nw;
      h = nh;
    },
    setParam(key: string, value: unknown) {
      if (key === 'source') loadSource(String(value));
      else if (key === 'fit') fit = value === 'contain' ? 'contain' : 'cover';
      else if (key === 'opacity') opacity = Number(value);
    },
    dispose() {
      clearSource();
      ctx = null;
      dead = true;
    },
  };
}
