export interface PointerPos {
  x: number;
  y: number;
}

/** Tracks the latest pointer position relative to a host element. */
export class PointerTracker {
  private pos: PointerPos = { x: 0, y: 0 };
  private handler = (e: Event) => {
    const me = e as MouseEvent;
    const rect = this.host.getBoundingClientRect();
    this.pos = { x: me.clientX - rect.left, y: me.clientY - rect.top };
  };

  constructor(private host: HTMLElement) {
    host.addEventListener('pointermove', this.handler);
  }

  position(): PointerPos {
    return this.pos;
  }

  dispose(): void {
    this.host.removeEventListener('pointermove', this.handler);
  }
}
