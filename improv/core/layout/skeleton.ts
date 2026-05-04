import type { LayoutPlacementData } from '../types';

const CATEGORY_COLORS: Record<string, string> = {
  layout:   '#6366f1',
  content:  '#10b981',
  controls: '#f59e0b',
  elements: '#3b82f6',
  blocks:   '#ec4899',
};

export class SkeletonRenderer {
  private container: HTMLElement;
  private skeletons = new Map<string, HTMLDivElement>();

  constructor(container: HTMLElement) {
    this.container = container;
  }

  create(placement: LayoutPlacementData): HTMLDivElement {
    const color = CATEGORY_COLORS[placement.category] ?? '#6366f1';

    const el = document.createElement('div');
    el.dataset['skeletonId'] = placement.id;

    el.style.position      = 'absolute';
    el.style.left          = `${placement.x}px`;
    el.style.top           = `${placement.y - placement.scrollY}px`;
    el.style.width         = `${placement.width}px`;
    el.style.height        = `${placement.height}px`;
    el.style.border        = `2px dashed ${color}`;
    el.style.borderRadius  = '4px';
    el.style.backgroundColor = `${color}1a`; // 10% opacity via hex alpha
    el.style.display       = 'flex';
    el.style.alignItems    = 'center';
    el.style.justifyContent = 'center';
    el.style.pointerEvents = 'all';
    el.style.cursor        = 'move';
    el.style.userSelect    = 'none';

    const label = document.createElement('span');
    label.textContent = placement.componentType;
    label.style.color      = color;
    label.style.fontSize   = '12px';
    label.style.fontFamily = 'system-ui, sans-serif';
    label.style.fontWeight = '600';
    label.style.textAlign  = 'center';
    label.style.pointerEvents = 'none';

    el.appendChild(label);

    this.container.appendChild(el);
    this.skeletons.set(placement.id, el);

    return el;
  }

  update(id: string, x: number, y: number): void {
    const el = this.skeletons.get(id);
    if (!el) return;
    el.style.left = `${x}px`;
    el.style.top  = `${y}px`;
  }

  remove(id: string): void {
    const el = this.skeletons.get(id);
    if (!el) return;
    el.remove();
    this.skeletons.delete(id);
  }

  clear(): void {
    for (const [id] of this.skeletons) {
      this.remove(id);
    }
  }

  getAll(): Map<string, HTMLDivElement> {
    return this.skeletons;
  }
}
