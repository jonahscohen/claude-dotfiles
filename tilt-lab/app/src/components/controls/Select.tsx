import './Select.css';

export interface SelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  ariaLabel: string;
}

/**
 * Select. For small option sets (<= 4) it renders a segmented control, which
 * reads as more intentional and keeps every choice visible (e.g. fit,
 * renderMode). For larger sets it falls back to a styled native <select>.
 * Both branches keep the value/options/onChange contract.
 */
export function Select({ value, options, onChange, ariaLabel }: SelectProps) {
  const segmented = options.length > 0 && options.length <= 4;

  if (segmented) {
    const moveBy = (delta: number) => {
      const idx = options.indexOf(value);
      const base = idx === -1 ? 0 : idx;
      const next = (base + delta + options.length) % options.length;
      onChange(options[next]);
    };

    return (
      <div className="tl-segmented" role="radiogroup" aria-label={ariaLabel}>
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={active}
              data-active={active}
              tabIndex={active ? 0 : -1}
              className="tl-segmented__opt"
              onClick={() => onChange(opt)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  moveBy(1);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  moveBy(-1);
                }
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <select
      className="tl-select"
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
