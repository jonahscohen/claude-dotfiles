import { PRIMITIVES, getPrimitivesByCategory } from './primitives';
import type { PrimitiveType } from './primitives';

type DropCallback = (type: string, category: string, x: number, y: number) => void;

const CATEGORIES: Array<PrimitiveType['category']> = [
  'layout',
  'content',
  'controls',
  'elements',
  'blocks',
];

const CATEGORY_COLORS: Record<string, string> = {
  layout:   '#6366f1',
  content:  '#10b981',
  controls: '#f59e0b',
  elements: '#3b82f6',
  blocks:   '#ec4899',
};

export class ComponentPalette {
  private shadow: ShadowRoot;
  private sidebar: HTMLDivElement | null = null;
  private dropCallback: DropCallback | null = null;

  constructor(shadow: ShadowRoot) {
    this.shadow = shadow;
    this.build();
  }

  private build(): void {
    this.sidebar = document.createElement('div');
    this.sidebar.style.position      = 'fixed';
    this.sidebar.style.left          = '20px';
    this.sidebar.style.top           = '20px';
    this.sidebar.style.width         = '200px';
    this.sidebar.style.maxHeight     = '80vh';
    this.sidebar.style.overflowY     = 'auto';
    this.sidebar.style.background    = '#18181b';
    this.sidebar.style.borderRadius  = '8px';
    this.sidebar.style.border        = '1px solid #3f3f46';
    this.sidebar.style.padding       = '8px 0';
    this.sidebar.style.zIndex        = '2147483646';
    this.sidebar.style.pointerEvents = 'all';
    this.sidebar.style.fontFamily    = 'system-ui, sans-serif';
    this.sidebar.style.boxShadow     = '0 4px 24px rgba(0,0,0,0.4)';
    this.sidebar.style.userSelect    = 'none';

    const title = document.createElement('div');
    title.textContent = 'Components';
    title.style.color      = '#a1a1aa';
    title.style.fontSize   = '11px';
    title.style.fontWeight = '700';
    title.style.letterSpacing = '0.08em';
    title.style.textTransform = 'uppercase';
    title.style.padding    = '0 12px 8px';
    title.style.borderBottom = '1px solid #3f3f46';
    title.style.marginBottom = '4px';
    this.sidebar.appendChild(title);

    for (const cat of CATEGORIES) {
      const items = getPrimitivesByCategory(cat);
      if (!items.length) continue;

      const heading = document.createElement('div');
      heading.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      heading.style.color       = CATEGORY_COLORS[cat] ?? '#a1a1aa';
      heading.style.fontSize    = '10px';
      heading.style.fontWeight  = '700';
      heading.style.letterSpacing = '0.06em';
      heading.style.textTransform = 'uppercase';
      heading.style.padding     = '8px 12px 4px';
      this.sidebar.appendChild(heading);

      for (const prim of items) {
        const item = this.buildItem(prim);
        this.sidebar.appendChild(item);
      }
    }

    this.shadow.appendChild(this.sidebar);

    // Wire drop on the document (target is the page body, not the shadow root)
    document.addEventListener('dragover', this.handleDragOver);
    document.addEventListener('drop', this.handleDrop);
  }

  private buildItem(prim: PrimitiveType): HTMLDivElement {
    const item = document.createElement('div');
    item.draggable = true;
    item.dataset['primitiveType']     = prim.name;
    item.dataset['primitiveCategory'] = prim.category;
    item.style.padding     = '5px 12px';
    item.style.fontSize    = '12px';
    item.style.color       = '#d4d4d8';
    item.style.cursor      = 'grab';
    item.style.borderRadius = '4px';
    item.style.margin      = '1px 6px';
    item.style.transition  = 'background 120ms ease';

    const label = document.createElement('span');
    label.textContent = prim.name;
    item.appendChild(label);

    item.addEventListener('mouseenter', () => {
      item.style.background = '#27272a';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = '';
    });

    item.addEventListener('dragstart', (e: DragEvent) => {
      if (!e.dataTransfer) return;
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('improv/type',     prim.name);
      e.dataTransfer.setData('improv/category', prim.category);
    });

    return item;
  }

  private handleDragOver = (e: DragEvent): void => {
    if (!e.dataTransfer?.types.includes('improv/type')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  private handleDrop = (e: DragEvent): void => {
    if (!e.dataTransfer?.types.includes('improv/type')) return;
    e.preventDefault();

    const type     = e.dataTransfer.getData('improv/type');
    const category = e.dataTransfer.getData('improv/category');
    if (!type || !this.dropCallback) return;

    this.dropCallback(type, category, e.clientX, e.clientY);
  };

  show(): void {
    if (this.sidebar) this.sidebar.style.display = '';
  }

  hide(): void {
    if (this.sidebar) this.sidebar.style.display = 'none';
  }

  onDrop(callback: DropCallback): void {
    this.dropCallback = callback;
  }

  destroy(): void {
    document.removeEventListener('dragover', this.handleDragOver);
    document.removeEventListener('drop', this.handleDrop);
    this.sidebar?.remove();
    this.sidebar = null;
  }
}
