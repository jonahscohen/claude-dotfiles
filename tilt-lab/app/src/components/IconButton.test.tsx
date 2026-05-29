import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IconButton } from './IconButton';
import { ChevronUpIcon } from './icons';

describe('IconButton', () => {
  it('exposes its label as the accessible name', () => {
    render(<IconButton label="Move grad up" icon={<ChevronUpIcon />} />);
    expect(screen.getByRole('button', { name: 'Move grad up' })).toBeTruthy();
  });

  it('defaults to type="button" so it never submits a form', () => {
    render(<IconButton label="Move grad up" icon={<ChevronUpIcon />} />);
    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });

  it('fires onClick when activated', () => {
    const onClick = vi.fn();
    render(<IconButton label="Remove grad" icon={<ChevronUpIcon />} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Move grad up" icon={<ChevronUpIcon />} disabled onClick={onClick} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
