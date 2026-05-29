import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './IconButton.css';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Required accessible name - icon-only buttons must have one. */
  label: string;
  /** The icon element to render (e.g. <ChevronUpIcon />). */
  icon: ReactNode;
}

export function IconButton({ label, icon, className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={className ? `icon-button ${className}` : 'icon-button'}
      {...rest}
    >
      {icon}
    </button>
  );
}
