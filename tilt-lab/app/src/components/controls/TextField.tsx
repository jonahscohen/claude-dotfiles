import './TextField.css';

export interface TextFieldProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  maxLength?: number;
}

/**
 * TextField - a styled single-line text input for free-form string params
 * (e.g. ascii's custom glyph ramp). Matches the instrument design system:
 * inset --input-bg well, hairline --line-2 border, 40px hit area, mono metrics
 * so character ramps read like a code field, and the global :focus-visible
 * accent ring. Emits the raw string on every change.
 */
export function TextField({ value, onChange, ariaLabel, placeholder, maxLength }: TextFieldProps) {
  return (
    <input
      className="tl-textfield"
      type="text"
      aria-label={ariaLabel}
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      spellCheck={false}
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
