import { describe, it, expect } from 'vitest';
import { PointerTracker } from './pointer';

describe('PointerTracker', () => {
  it('reports the latest position in element-relative coords', () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'getBoundingClientRect', {
      value: () => ({ left: 10, top: 20, width: 100, height: 100 }),
    });
    const t = new PointerTracker(el);
    el.dispatchEvent(new MouseEvent('pointermove', { clientX: 60, clientY: 70 }));
    expect(t.position()).toEqual({ x: 50, y: 50 });
    t.dispose();
  });
});
