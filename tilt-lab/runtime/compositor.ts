import type { Effect, LayerConfig } from './types';
import { orderLayers } from './stack';

type FactoryById = (effectId: string) => Effect;

interface MountedLayer {
  config: LayerConfig;
  effect: Effect;
  canvas: HTMLCanvasElement;
}

/**
 * Orchestrates an ordered set of layers. Non-post layers draw onto a shared
 * composite canvas. The post layer (at most one) samples that composite canvas
 * as its input. Pixel correctness is verified visually; this class owns ordering
 * and lifecycle.
 */
export class Compositor {
  private layers: MountedLayer[] = [];
  private composite: HTMLCanvasElement;

  constructor(private root: HTMLElement, private factory: FactoryById) {
    this.composite = document.createElement('canvas');
    this.root.appendChild(this.composite);
  }

  compositeCanvas(): HTMLCanvasElement {
    return this.composite;
  }

  /** The canvas the post layer samples (the composited output beneath it). */
  postInputCanvas(): HTMLCanvasElement {
    return this.composite;
  }

  setLayers(configs: LayerConfig[]): void {
    this.clear();
    const ordered = orderLayers(configs);
    for (const config of ordered) {
      const effect = this.factory(config.effectId);
      const canvas =
        config.layerRole === 'post' ? document.createElement('canvas') : this.composite;
      effect.init(canvas, { params: config.params, assets: {} });
      this.layers.push({ config, effect, canvas });
    }
  }

  renderFrame(t: number): void {
    for (const { effect } of this.layers) {
      effect.frame(t);
    }
  }

  clear(): void {
    for (const { effect } of this.layers) {
      effect.dispose();
    }
    this.layers = [];
  }
}

/**
 * <tilt-stack config-src="..."> renders a full layered stack from a manifest URL.
 * Drives the Compositor with a RAF loop. The effect factory is injected by the
 * built bundle's registry (set via setStackFactory) so this file stays decoupled
 * from the concrete effect set.
 */
let stackFactory: FactoryById | null = null;
export function setStackFactory(f: FactoryById): void {
  stackFactory = f;
}

export class TiltStackElement extends HTMLElement {
  private compositor?: Compositor;
  private raf = 0;

  async connectedCallback() {
    const src = this.getAttribute('config-src');
    if (!src || !stackFactory) return;
    const res = await fetch(src);
    const config = (await res.json()) as { layers: LayerConfig[] };
    this.compositor = new Compositor(this, stackFactory);
    this.compositor.setLayers(config.layers);
    const loop = (t: number) => {
      this.compositor?.renderFrame(t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.raf);
    this.compositor?.clear();
  }
}

export function defineStackElement(): void {
  if (!customElements.get('tilt-stack')) {
    customElements.define('tilt-stack', TiltStackElement);
  }
}
