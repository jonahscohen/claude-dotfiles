import { describe, it, expect } from 'vitest';
import { argsToNodeSpec } from '../node-spec';

describe('argsToNodeSpec', () => {
  it('creates a basic FRAME spec with defaults', () => {
    const spec = argsToNodeSpec({ name: 'Card' });
    expect(spec.type).toBe('FRAME');
    expect(spec.properties.name).toBe('Card');
    expect(spec.properties.layout?.layoutMode).toBe('VERTICAL');
  });

  it('creates a TEXT node with characters and default black fill', () => {
    const spec = argsToNodeSpec({ type: 'TEXT', name: 'Title', characters: 'Hello' });
    expect(spec.type).toBe('TEXT');
    expect(spec.properties.text?.characters).toBe('Hello');
    expect(spec.properties.fills).toEqual([
      { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
    ]);
  });

  it('creates a TEXT node with custom text color', () => {
    const spec = argsToNodeSpec({
      type: 'TEXT',
      name: 'Label',
      characters: 'Test',
      textColor: { r: 1, g: 0, b: 0 },
    });
    expect(spec.properties.fills).toEqual([
      { type: 'SOLID', color: { r: 1, g: 0, b: 0 } },
    ]);
  });

  it('creates a RECTANGLE with fill and stroke', () => {
    const spec = argsToNodeSpec({
      type: 'RECTANGLE',
      name: 'Box',
      width: 200,
      height: 100,
      fillColor: { r: 0.5, g: 0.5, b: 0.5 },
      strokeColor: { r: 0, g: 0, b: 0 },
      strokeWeight: 2,
    });
    expect(spec.type).toBe('RECTANGLE');
    expect(spec.properties.width).toBe(200);
    expect(spec.properties.fills).toEqual([
      { type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } },
    ]);
    expect(spec.properties.strokes).toEqual([
      { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
    ]);
    expect(spec.properties.strokeWeight).toBe(2);
  });

  it('sets layout properties on FRAME', () => {
    const spec = argsToNodeSpec({
      type: 'FRAME',
      name: 'Row',
      layoutMode: 'HORIZONTAL',
      itemSpacing: 16,
      paddingTop: 8,
      paddingRight: 12,
      primaryAxisAlignItems: 'CENTER',
    });
    expect(spec.properties.layout?.layoutMode).toBe('HORIZONTAL');
    expect(spec.properties.layout?.itemSpacing).toBe(16);
    expect(spec.properties.layout?.paddingTop).toBe(8);
    expect(spec.properties.layout?.paddingRight).toBe(12);
    expect(spec.properties.layout?.primaryAxisAlignItems).toBe('CENTER');
  });

  it('sets layout sizing on non-container nodes', () => {
    const spec = argsToNodeSpec({
      type: 'TEXT',
      name: 'Stretchy',
      characters: 'Fill width',
      layoutSizingHorizontal: 'FILL',
    });
    expect(spec.properties.layout?.layoutSizingHorizontal).toBe('FILL');
  });

  it('recurses into children', () => {
    const spec = argsToNodeSpec({
      type: 'FRAME',
      name: 'Parent',
      children: [
        { type: 'TEXT', name: 'Child1', characters: 'Hi' },
        { type: 'RECTANGLE', name: 'Child2', width: 50, height: 50 },
      ],
    });
    expect(spec.children).toHaveLength(2);
    expect(spec.children![0].type).toBe('TEXT');
    expect(spec.children![0].properties.name).toBe('Child1');
    expect(spec.children![1].type).toBe('RECTANGLE');
  });

  it('applies button shortcut: FRAME + characters + no children → auto-label', () => {
    const spec = argsToNodeSpec({
      type: 'FRAME',
      name: 'Button',
      characters: 'Click Me',
      fillColor: { r: 0, g: 0.4, b: 1 },
    });
    expect(spec.children).toHaveLength(1);
    expect(spec.children![0].type).toBe('TEXT');
    expect(spec.children![0].properties.name).toBe('Label');
    expect(spec.children![0].properties.text?.characters).toBe('Click Me');
    expect(spec.children![0].properties.text?.style?.fontStyle).toBe('Medium');
  });

  it('does NOT apply button shortcut when children are provided', () => {
    const spec = argsToNodeSpec({
      type: 'FRAME',
      name: 'NotButton',
      characters: 'Ignored',
      children: [{ type: 'TEXT', name: 'Explicit', characters: 'Child' }],
    });
    expect(spec.children).toHaveLength(1);
    expect(spec.children![0].properties.name).toBe('Explicit');
  });

  it('handles effects array', () => {
    const spec = argsToNodeSpec({
      type: 'FRAME',
      name: 'Shadow',
      effects: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.25 }, radius: 8 }],
    });
    expect(spec.properties.effects).toHaveLength(1);
    expect(spec.properties.effects![0].type).toBe('DROP_SHADOW');
    expect(spec.properties.effects![0].radius).toBe(8);
  });

  it('defaults type to FRAME when not specified', () => {
    const spec = argsToNodeSpec({ name: 'NoType' });
    expect(spec.type).toBe('FRAME');
  });

  it('handles opacity and cornerRadius', () => {
    const spec = argsToNodeSpec({
      type: 'RECTANGLE',
      name: 'Rounded',
      opacity: 0.8,
      cornerRadius: 12,
    });
    expect(spec.properties.opacity).toBe(0.8);
    expect(spec.properties.cornerRadius).toBe(12);
  });
});
