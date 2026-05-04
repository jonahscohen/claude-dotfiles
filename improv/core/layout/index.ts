import type { Overlay } from '../overlay';
import type { Transport } from '../transport';
import type { LayoutPlacementData } from '../types';
import { ComponentPalette } from './palette';
import { SkeletonRenderer } from './skeleton';
import { GuideLineRenderer } from './guide-lines';
import { SectionDetector } from './rearrange';
import { computeSnap } from './snap';
import type { SnapTarget } from './snap';
import { getPrimitive } from './primitives';

export class LayoutMode {
  private overlay: Overlay;
  private transport: Transport;

  private palette: ComponentPalette | null = null;
  private skeletonRenderer: SkeletonRenderer | null = null;
  private guideLineRenderer: GuideLineRenderer | null = null;
  private sectionDetector: SectionDetector | null = null;

  private placements: LayoutPlacementData[] = [];
  private applyBtn: HTMLButtonElement | null = null;

  constructor(overlay: Overlay, transport: Transport) {
    this.overlay   = overlay;
    this.transport = transport;
  }

  activate(): void {
    const shadow    = this.overlay.getShadowRoot();
    const container = this.overlay.getContainer();

    this.skeletonRenderer  = new SkeletonRenderer(container);
    this.guideLineRenderer = new GuideLineRenderer(container);
    this.sectionDetector   = new SectionDetector();
    this.palette           = new ComponentPalette(shadow);

    this.palette.onDrop((type, category, clientX, clientY) => {
      this.handleDrop(type, category, clientX, clientY);
    });

    this.sectionDetector.enable((sections) => {
      // Section reorder recorded; layout is live on page already
      console.debug('[improv] sections reordered', sections.length);
    });

    this.applyBtn = this.buildApplyButton(shadow);
  }

  deactivate(): void {
    this.palette?.destroy();
    this.skeletonRenderer?.clear();
    this.guideLineRenderer?.hide();
    this.sectionDetector?.disable();
    this.applyBtn?.remove();

    this.palette           = null;
    this.skeletonRenderer  = null;
    this.guideLineRenderer = null;
    this.sectionDetector   = null;
    this.applyBtn          = null;
    this.placements        = [];
  }

  private handleDrop(type: string, category: string, clientX: number, clientY: number): void {
    const prim = getPrimitive(type);
    const w = prim?.defaultWidth  ?? 200;
    const h = prim?.defaultHeight ?? 80;

    // Center skeleton on cursor
    const x = clientX - w / 2;
    const y = clientY - h / 2;

    const snapResult = computeSnap(
      { x, y, width: w, height: h },
      this.buildSnapTargets(),
    );

    const placement: LayoutPlacementData = {
      id:            `layout-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      componentType: type,
      category,
      x:             snapResult.snappedX,
      y:             snapResult.snappedY,
      width:         w,
      height:        h,
      scrollY:       window.scrollY,
    };

    this.placements.push(placement);

    const el = this.skeletonRenderer!.create(placement);
    this.guideLineRenderer!.show(snapResult.guides);

    // Wire drag on the created skeleton
    this.wireDrag(el, placement);

    // Hide guides after a moment
    setTimeout(() => this.guideLineRenderer?.hide(), 800);
  }

  private wireDrag(el: HTMLDivElement, placement: LayoutPlacementData): void {
    let startX = 0;
    let startY = 0;
    let originX = placement.x;
    let originY = placement.y;
    let dragging = false;

    el.addEventListener('mousedown', (e: MouseEvent) => {
      dragging = true;
      startX   = e.clientX;
      startY   = e.clientY;
      originX  = placement.x;
      originY  = placement.y;
      e.preventDefault();
    });

    const onMove = (e: MouseEvent): void => {
      if (!dragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const proposedX = originX + dx;
      const proposedY = originY + dy;

      const snapResult = computeSnap(
        { x: proposedX, y: proposedY, width: placement.width, height: placement.height },
        this.buildSnapTargets(placement.id),
      );

      placement.x = snapResult.snappedX;
      placement.y = snapResult.snappedY;

      this.skeletonRenderer!.update(placement.id, placement.x, placement.y);
      this.guideLineRenderer!.show(snapResult.guides);
    };

    const onUp = (): void => {
      if (!dragging) return;
      dragging = false;
      setTimeout(() => this.guideLineRenderer?.hide(), 400);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  private buildSnapTargets(excludeId?: string): SnapTarget[] {
    return this.placements
      .filter((p) => p.id !== excludeId)
      .map((p) => ({ x: p.x, y: p.y, width: p.width, height: p.height }));
  }

  private buildApplyButton(shadow: ShadowRoot): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = 'Apply Layout';
    btn.style.position   = 'fixed';
    btn.style.bottom     = '20px';
    btn.style.right      = '20px';
    btn.style.padding    = '10px 20px';
    btn.style.background = '#6366f1';
    btn.style.color      = '#fff';
    btn.style.border     = 'none';
    btn.style.borderRadius = '6px';
    btn.style.fontFamily = 'system-ui, sans-serif';
    btn.style.fontSize   = '13px';
    btn.style.fontWeight = '600';
    btn.style.cursor     = 'pointer';
    btn.style.zIndex     = '2147483646';
    btn.style.pointerEvents = 'all';
    btn.style.boxShadow  = '0 2px 12px rgba(99,102,241,0.4)';

    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#4f46e5';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#6366f1';
    });

    btn.addEventListener('click', () => {
      this.transport.request('push_layout', {
        placements: this.placements,
      }).catch(() => {
        // Non-fatal if transport is not connected
      });
    });

    shadow.appendChild(btn);
    return btn;
  }
}

export { ComponentPalette } from './palette';
export { SkeletonRenderer } from './skeleton';
export { GuideLineRenderer } from './guide-lines';
export { SectionDetector } from './rearrange';
export { computeSnap } from './snap';
export { PRIMITIVES, getPrimitive, getPrimitivesByCategory } from './primitives';
export type { LayoutPlacementData } from '../types';
export type { PrimitiveType } from './primitives';
export type { SnapTarget, GuideLine, SnapResult } from './snap';
export type { DetectedSection } from './rearrange';
