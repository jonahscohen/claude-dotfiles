export class Overlay {
  private host: HTMLDivElement;
  private shadow: ShadowRoot;
  private container: HTMLDivElement;
  private highlight: HTMLDivElement | null = null;

  constructor() {
    this.host = document.createElement('div');
    this.host.dataset['improv'] = '';
    this.host.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;';

    this.shadow = this.host.attachShadow({ mode: 'open' });

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
      :host{all:initial;}
      .improv-container{position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;overflow:visible;}
    `);
    this.shadow.adoptedStyleSheets = [sheet];

    this.container = document.createElement('div');
    this.container.className = 'improv-container';
    this.shadow.appendChild(this.container);
  }

  mount(): void {
    if (!document.body.contains(this.host)) {
      document.body.appendChild(this.host);
    }
  }

  unmount(): void {
    this.host.remove();
  }

  isVisible(): boolean {
    return document.body.contains(this.host);
  }

  getShadowRoot(): ShadowRoot {
    return this.shadow;
  }

  getContainer(): HTMLDivElement {
    return this.container;
  }

  showHighlight(rect: DOMRect): void {
    if (!this.highlight) {
      this.highlight = document.createElement('div');
      this.highlight.style.cssText =
        'position:fixed;pointer-events:none;border:2px solid #3b82f6;border-radius:2px;transition:all 80ms ease;';
      this.container.appendChild(this.highlight);
    }

    Object.assign(this.highlight.style, {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }

  hideHighlight(): void {
    if (this.highlight) {
      this.highlight.remove();
      this.highlight = null;
    }
  }

  appendToContainer(el: HTMLElement): void {
    this.container.appendChild(el);
  }

  removeFromContainer(el: HTMLElement): void {
    if (this.container.contains(el)) {
      this.container.removeChild(el);
    }
  }
}
