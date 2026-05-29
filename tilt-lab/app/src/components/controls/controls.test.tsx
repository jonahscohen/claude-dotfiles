import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Slider } from './Slider';
import { Switch } from './Switch';
import { Select } from './Select';
import { ColorField } from './ColorField';
import { FileDrop } from './FileDrop';

describe('Slider', () => {
  it('emits a coerced numeric value on change', () => {
    const onChange = vi.fn();
    render(<Slider ariaLabel="speed" value={1} min={0} max={5} step={0.5} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('speed'), { target: { value: '3.5' } });
    expect(onChange).toHaveBeenCalledWith(3.5);
  });

  it('renders the value with step-derived decimals in the readout', () => {
    render(<Slider ariaLabel="amt" value={0.25} min={0} max={1} step={0.01} onChange={() => {}} />);
    expect(screen.getByText('0.25')).toBeTruthy();
  });
});

describe('Switch', () => {
  it('toggles to the opposite boolean on click', () => {
    const onChange = vi.fn();
    render(<Switch ariaLabel="loop" checked={true} onChange={onChange} />);
    const el = screen.getByLabelText('loop');
    expect(el.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(el);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe('Select', () => {
  it('renders a segmented control and emits the picked option (<= 4 options)', () => {
    const onChange = vi.fn();
    render(<Select ariaLabel="fit" value="cover" options={['cover', 'contain']} onChange={onChange} />);
    expect(screen.getByRole('radiogroup', { name: 'fit' })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'contain' }));
    expect(onChange).toHaveBeenCalledWith('contain');
  });

  it('falls back to a native select for more than 4 options', () => {
    const onChange = vi.fn();
    const opts = ['a', 'b', 'c', 'd', 'e'];
    render(<Select ariaLabel="mode" value="a" options={opts} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('mode'), { target: { value: 'd' } });
    expect(onChange).toHaveBeenCalledWith('d');
  });
});

describe('ColorField', () => {
  it('emits the hex value on change', () => {
    const onChange = vi.fn();
    render(<ColorField ariaLabel="colorA" value="#ff0000" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('colorA'), { target: { value: '#00ff00' } });
    expect(onChange).toHaveBeenCalledWith('#00ff00');
  });
});

describe('FileDrop', () => {
  beforeAll(() => {
    // jsdom does not implement object URLs; stub it for the file->URL flow.
    if (!('createObjectURL' in URL)) {
      // @ts-expect-error - assigning a stub onto the URL constructor in tests
      URL.createObjectURL = () => 'blob:mock';
    }
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
  });

  it('emits an object URL when a file is selected', () => {
    const onChange = vi.fn();
    render(<FileDrop ariaLabel="texture" onChange={onChange} />);
    const file = new File(['x'], 'pic.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('texture'), { target: { files: [file] } });
    expect(onChange).toHaveBeenCalledWith('blob:mock');
  });
});
