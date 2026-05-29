import './ColorField.css';

export interface ColorFieldProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}

/**
 * ColorField - a designed swatch + hex label that opens the native color
 * picker. The native <input type="color"> stays in the tree (styled, not
 * raw) so it remains keyboard focusable and screen-reader labelled.
 */
export function ColorField({ value, onChange, ariaLabel }: ColorFieldProps) {
  return (
    <span className="tl-colorfield">
      <input
        className="tl-colorfield__swatch"
        type="color"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="tl-colorfield__hex">{value}</span>
    </span>
  );
}
