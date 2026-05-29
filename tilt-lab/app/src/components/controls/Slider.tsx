import './Slider.css';

export interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  ariaLabel: string;
}

/**
 * Range slider with a styled track + accent fill + thumb and an inline tabular
 * numeric readout. The readout decimals are derived from `step` so the value
 * never reflows as it changes (font-variant-numeric: tabular-nums in CSS).
 */
export function Slider({ value, min = 0, max = 1, step = 0.01, onChange, ariaLabel }: SliderProps) {
  const decimals = step < 1 ? (String(step).split('.')[1]?.length ?? 0) : 0;
  const num = Number.isFinite(value) ? value : min;
  const span = max - min;
  const pct = span > 0 ? ((num - min) / span) * 100 : 0;

  return (
    <span className="tl-slider">
      <input
        className="tl-slider__input"
        aria-label={ariaLabel}
        type="range"
        min={min}
        max={max}
        step={step}
        value={num}
        // expose fill percentage to CSS so the track shows progress
        style={{ ['--tl-slider-pct' as string]: `${pct}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output className="tl-slider__value">{num.toFixed(decimals)}</output>
    </span>
  );
}
