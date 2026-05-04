import type { GuideLine } from './snap';

const GUIDE_COLOR = '#f59e0b';

export class GuideLineRenderer {
  private container: HTMLElement;
  private lines: HTMLDivElement[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  show(guides: GuideLine[]): void {
    this.hide();

    for (const guide of guides) {
      const el = document.createElement('div');
      el.style.position      = 'absolute';
      el.style.pointerEvents = 'none';
      el.style.backgroundColor = GUIDE_COLOR;
      el.style.opacity       = '0.8';
      el.style.zIndex        = '9999';

      if (guide.axis === 'x') {
        // Vertical line at x position
        el.style.left   = `${guide.position}px`;
        el.style.top    = '0';
        el.style.width  = '1px';
        el.style.height = '100%';
      } else {
        // Horizontal line at y position
        el.style.top    = `${guide.position}px`;
        el.style.left   = '0';
        el.style.width  = '100%';
        el.style.height = '1px';
      }

      this.container.appendChild(el);
      this.lines.push(el);
    }
  }

  hide(): void {
    for (const line of this.lines) {
      line.remove();
    }
    this.lines = [];
  }
}
