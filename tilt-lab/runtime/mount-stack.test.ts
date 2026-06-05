import { describe, it, expect, afterEach } from 'vitest';
import { mountStack } from './index';

/**
 * mountStack is the portable embed entry point. These tests exercise its
 * control flow - the reduced-motion guard, the RAF loop scheduling, and the
 * disposer - using an EMPTY stack so no real (WebGL) effect has to init in the
 * headless DOM. The compositing of real layers is covered by compositor.test.ts.
 */

const realRAF = globalThis.requestAnimationFrame;
const realCAF = globalThis.cancelAnimationFrame;
const realMatchMedia = window.matchMedia;

function stubMatchMedia(reduced: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches: reduced,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false;
      },
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

afterEach(() => {
  globalThis.requestAnimationFrame = realRAF;
  globalThis.cancelAnimationFrame = realCAF;
  window.matchMedia = realMatchMedia;
});

describe('mountStack', () => {
  it('honors reduced-motion: paints a static frame, schedules no animation loop', () => {
    let rafCalls = 0;
    globalThis.requestAnimationFrame = (() => {
      rafCalls++;
      return 1;
    }) as typeof globalThis.requestAnimationFrame;
    stubMatchMedia(true);

    const host = document.createElement('div');
    const dispose = mountStack(host, { layers: [] });

    expect(rafCalls).toBe(0); // no loop under reduced-motion
    expect(typeof dispose).toBe('function');
    dispose();
  });

  it('animates when motion is allowed: schedules a loop the disposer cancels', () => {
    let rafCalls = 0;
    let nextId = 0;
    let canceledId: number | null = null;
    // Do NOT invoke the callback, or the loop would re-schedule forever.
    globalThis.requestAnimationFrame = (() => {
      rafCalls++;
      return ++nextId;
    }) as typeof globalThis.requestAnimationFrame;
    globalThis.cancelAnimationFrame = ((id: number) => {
      canceledId = id;
    }) as typeof globalThis.cancelAnimationFrame;
    stubMatchMedia(false);

    const host = document.createElement('div');
    const dispose = mountStack(host, { layers: [] });

    expect(rafCalls).toBe(1); // loop primed once
    dispose();
    expect(canceledId).toBe(1); // disposer cancels the scheduled frame
  });

  it('respectReducedMotion:false animates even when the user prefers reduced motion', () => {
    let rafCalls = 0;
    globalThis.requestAnimationFrame = (() => {
      rafCalls++;
      return 1;
    }) as typeof globalThis.requestAnimationFrame;
    stubMatchMedia(true);

    const host = document.createElement('div');
    const dispose = mountStack(host, { layers: [] }, { respectReducedMotion: false });

    expect(rafCalls).toBe(1); // override forces the loop
    dispose();
  });
});
