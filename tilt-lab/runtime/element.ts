import type { EffectFactory, Manifest, ParamSpec } from './types';
import { PointerTracker } from './pointer';

function coerce(spec: ParamSpec, raw: string): unknown {
  switch (spec.type) {
    case 'range':
      return Number(raw);
    case 'toggle':
      return raw === 'true' || raw === '';
    default:
      return raw; // color, select -> string
  }
}

export function defineEffectElement(manifest: Manifest, factory: EffectFactory): void {
  const tag = `tilt-${manifest.id}`;
  if (customElements.get(tag)) return;

  const paramByName = new Map(manifest.params.map((p) => [p.name, p]));

  class TiltEffectElement extends HTMLElement {
    static observedAttributes = manifest.params.map((p) => p.name);

    private effect = factory();
    private canvas!: HTMLCanvasElement;
    private raf = 0;
    private ro?: ResizeObserver;
    private reduced = false;
    private pointer?: PointerTracker;

    connectedCallback() {
      this.canvas = document.createElement('canvas');
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.style.display = this.style.display || 'block';
      this.appendChild(this.canvas);

      const params: Record<string, unknown> = {};
      for (const p of manifest.params) {
        const attr = this.getAttribute(p.name);
        params[p.name] = attr === null ? p.default : coerce(p, attr);
      }
      this.effect.init(this.canvas, { params, assets: {} });

      // DOM/R3F effects render into this element's subtree instead of the canvas.
      if (this.effect.mount) {
        this.effect.mount(this, { params, assets: {} });
      }
      // Pointer-driven effects get pointer moves relative to this element.
      if (this.effect.onPointer) {
        this.pointer = new PointerTracker(this);
      }

      this.ro = new ResizeObserver(() => this.syncSize());
      this.ro.observe(this);
      this.syncSize();

      this.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      if (!this.reduced) this.loop(0);
      else this.effect.frame(0); // render a single static frame
    }

    private syncSize() {
      const w = this.clientWidth || 1;
      const h = this.clientHeight || 1;
      this.canvas.width = w;
      this.canvas.height = h;
      this.effect.resize(w, h);
    }

    private loop = (t: number) => {
      if (this.pointer && this.effect.onPointer) {
        const p = this.pointer.position();
        this.effect.onPointer(p.x, p.y);
      }
      this.effect.frame(t);
      this.raf = requestAnimationFrame(this.loop);
    };

    attributeChangedCallback(name: string, _old: string | null, value: string | null) {
      const spec = paramByName.get(name);
      if (!spec) return;
      this.effect.setParam(name, value === null ? spec.default : coerce(spec, value));
    }

    disconnectedCallback() {
      cancelAnimationFrame(this.raf);
      this.pointer?.dispose();
      this.ro?.disconnect();
      this.effect.dispose();
    }
  }

  customElements.define(tag, TiltEffectElement);
}
