import './Switch.css';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}

/**
 * A real sliding toggle (not a checkbox). Rendered as a button with
 * role="switch" + aria-checked so it is keyboard operable (Space/Enter fire
 * the native button click) and announced correctly by screen readers.
 */
export function Switch({ checked, onChange, ariaLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      data-checked={checked}
      className="tl-switch"
      onClick={() => onChange(!checked)}
    >
      <span className="tl-switch__track">
        <span className="tl-switch__thumb" />
      </span>
    </button>
  );
}
