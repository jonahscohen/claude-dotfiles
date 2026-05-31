import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParamControls } from './ParamControls';
import type { ParamSpec } from '../../../runtime/types';

const specs: ParamSpec[] = [
  { name: 'speed', type: 'range', default: 1, min: 0, max: 5, step: 0.5 },
  { name: 'colorA', type: 'color', default: '#ff0000' },
  { name: 'loop', type: 'toggle', default: true },
];

const values = { speed: 1, colorA: '#ff0000', loop: true };

describe('ParamControls', () => {
  it('renders a labelled control per spec', () => {
    render(<ParamControls specs={specs} values={values} onChange={() => {}} />);
    expect(screen.getByLabelText('speed')).toBeTruthy();
    expect(screen.getByLabelText('colorA')).toBeTruthy();
    expect(screen.getByLabelText('loop')).toBeTruthy();
  });

  it('emits onChange with coerced numeric value for a range', () => {
    const onChange = vi.fn();
    render(<ParamControls specs={specs} values={values} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('speed'), { target: { value: '3.5' } });
    expect(onChange).toHaveBeenCalledWith('speed', 3.5);
  });

  it('emits onChange with boolean for a toggle', () => {
    const onChange = vi.fn();
    render(<ParamControls specs={specs} values={values} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('loop'));
    expect(onChange).toHaveBeenCalledWith('loop', false);
  });

  it('emits onChange with the selected string for a select', () => {
    const onChange = vi.fn();
    const selectSpecs: ParamSpec[] = [
      { name: 'fit', type: 'select', default: 'cover', options: ['cover', 'contain'] },
    ];
    render(<ParamControls specs={selectSpecs} values={{ fit: 'cover' }} onChange={onChange} />);
    // <= 4 options renders a segmented control; clicking an option emits its value.
    fireEvent.click(screen.getByText('contain'));
    expect(onChange).toHaveBeenCalledWith('fit', 'contain');
  });

  it('renders a text param and emits the typed string', () => {
    const onChange = vi.fn();
    const textSpecs: ParamSpec[] = [
      { name: 'customChars', type: 'text', default: '', placeholder: 'ramp' },
    ];
    render(<ParamControls specs={textSpecs} values={{ customChars: '' }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('customChars'), { target: { value: '@#. ' } });
    expect(onChange).toHaveBeenCalledWith('customChars', '@#. ');
  });

  it('renders a marker-list param and emits the full array on add', () => {
    const onChange = vi.fn();
    const markerSpecs: ParamSpec[] = [
      { name: 'markers', type: 'marker-list', default: [{ location: [1, 2], size: 0.05 }] },
    ];
    render(
      <ParamControls
        specs={markerSpecs}
        values={{ markers: [{ location: [1, 2], size: 0.05 }] }}
        onChange={onChange}
      />,
    );
    // existing marker row is present
    expect(screen.getByLabelText('markers marker 1 latitude')).toBeTruthy();
    // add a second marker
    fireEvent.click(screen.getByLabelText('Add markers marker'));
    expect(onChange).toHaveBeenCalledWith('markers', [
      { location: [1, 2], size: 0.05 },
      { location: [0, 0], size: 0.05 },
    ]);
  });

  it('renders a flat list (no groups) at or below the declutter threshold', () => {
    const { container } = render(
      <ParamControls specs={specs} values={values} onChange={() => {}} />,
    );
    expect(container.querySelectorAll('details.param-group').length).toBe(0);
  });

  it('decluttering: groups high-param effects into collapsible sections, first open', () => {
    // 9 params (> threshold) with a real multi-member cluster (layer1*).
    const many: ParamSpec[] = [
      { name: 'speed', type: 'range', default: 1, min: 0, max: 5, step: 0.5 },
      { name: 'noiseScale', type: 'range', default: 1, min: 0, max: 5, step: 0.1 },
      { name: 'brightness', type: 'range', default: 1, min: 0, max: 2, step: 0.1 },
      { name: 'saturation', type: 'range', default: 1, min: 0, max: 2, step: 0.1 },
      { name: 'opacity', type: 'range', default: 1, min: 0, max: 1, step: 0.1 },
      { name: 'verticalFade', type: 'range', default: 0.5, min: 0, max: 1, step: 0.1 },
      { name: 'layer1Color', type: 'color', default: '#ff0000' },
      { name: 'layer1Speed', type: 'range', default: 1, min: 0, max: 5, step: 0.1 },
      { name: 'layer1Intensity', type: 'range', default: 1, min: 0, max: 2, step: 0.1 },
    ];
    const vals = Object.fromEntries(many.map((s) => [s.name, s.default]));
    const { container } = render(
      <ParamControls specs={many} values={vals} onChange={() => {}} />,
    );

    const groups = container.querySelectorAll('details.param-group');
    // General (singletons) + Layer 1 (3-member cluster).
    expect(groups.length).toBe(2);
    // First group (General) is open, the rest collapsed.
    expect((groups[0] as HTMLDetailsElement).open).toBe(true);
    expect((groups[1] as HTMLDetailsElement).open).toBe(false);

    // Every control stays reachable by its aria-label regardless of grouping.
    expect(screen.getByLabelText('layer1Color')).toBeTruthy();
    expect(screen.getByLabelText('speed')).toBeTruthy();
  });
});
