/**
 * NumberInput - numeric input with scrub-to-adjust on the label.
 * Ported from Retune overlay/src/ui/number-input.tsx.
 *
 * DEVIATION (Phase 3b scope): the variable/token integration
 * (variableMatch, VariableAction, usePreviewValue) is deferred to the
 * later token phase. The scrub math, keyboard, unit inference, clamp,
 * focus/commit behavior and exact geometry are preserved verbatim.
 * Scrub: 1px of horizontal drag = 1 * step; precision = ceil(-log10(step)).
 * Uses setPointerCapture (core-input drag model, per plan open-question n).
 */

import { useState, useRef, type ReactNode } from "react";
import { roundCssValue, inferCssUnit } from "./round-css-value";
import { ChangeIndicator } from "./change-indicator";

// Default placeholder glyph: en-dash (U+2013), matching Retune verbatim.
const PLACEHOLDER_DASH = String.fromCharCode(0x2013);

function clampNum(val: number, min?: number, max?: number): number {
  if (min !== undefined && val < min) return min;
  if (max !== undefined && val > max) return max;
  return val;
}

function clampCssValue(val: string, min?: number, max?: number): string {
  if (min === undefined && max === undefined) return val;
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  const clamped = clampNum(num, min, max);
  if (clamped === num) return val;
  const unit = val.match(/[a-z%]+$/i)?.[0] || "";
  return `${clamped}${unit}`;
}

export interface NumberInputProps {
  label?: ReactNode;
  prop: string;
  value: string | undefined;
  placeholder?: string;
  onChange: (prop: string, value: string) => void;
  /** Minimum numeric value (clamps scrub, arrow keys, and committed input) */
  min?: number;
  /** Maximum numeric value */
  max?: number;
  /** Step size for arrow keys and scrub (default: 1, shift multiplies by 10) */
  step?: number;
  /** Whether this property has been changed from its original value */
  isChanged?: boolean;
  /** Reset this property to its original value */
  onReset?: () => void;
}

export function NumberInput({ label, prop, value, placeholder, onChange, min, max, step: stepProp, isChanged, onReset }: NumberInputProps) {
  const [localValue, setLocalValue] = useState(roundCssValue(value || ""));
  const labelRef = useRef<HTMLSpanElement>(null);

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setLocalValue(roundCssValue(value || ""));
  }

  // Scrub-to-adjust: drag on label to change numeric values
  const scrubRef = useRef({ startX: 0, startVal: 0, active: false });

  const handleLabelPointerDown = (e: React.PointerEvent) => {
    const num = parseFloat(localValue);
    if (isNaN(num)) return;
    scrubRef.current = { startX: e.clientX, startVal: num, active: true };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleLabelPointerMove = (e: React.PointerEvent) => {
    if (!scrubRef.current.active) return;
    const pixelDelta = e.clientX - scrubRef.current.startX;
    const baseStep = stepProp ?? 1;
    const raw = scrubRef.current.startVal + Math.round(pixelDelta) * baseStep;
    // Round to step precision to avoid floating point drift
    const precision = baseStep < 1 ? Math.ceil(-Math.log10(baseStep)) : 0;
    const rounded = precision > 0 ? parseFloat(raw.toFixed(precision)) : raw;
    const clamped = clampNum(rounded, min, max);
    const unit = localValue.match(/[a-z%]+$/i)?.[0] || "";
    const newVal = `${clamped}${unit}`;
    setLocalValue(newVal);
    onChange(prop, newVal);
  };

  const handleLabelPointerUp = () => {
    scrubRef.current.active = false;
  };

  // Scrub from input's left padding when there's no label
  const SCRUB_ZONE = 16; // px from left edge of input

  const handleInputPointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    if (label) return; // label handles scrub
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left > SCRUB_ZONE) return; // click is on text, let input handle it
    const num = parseFloat(localValue);
    if (isNaN(num)) return;
    e.preventDefault(); // prevent focus/selection
    scrubRef.current = { startX: e.clientX, startVal: num, active: true };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleInputPointerMove = (e: React.PointerEvent<HTMLInputElement>) => {
    if (scrubRef.current.active) {
      const pixelDelta = e.clientX - scrubRef.current.startX;
      const baseStep = stepProp ?? 1;
      const raw = scrubRef.current.startVal + Math.round(pixelDelta) * baseStep;
      const precision = baseStep < 1 ? Math.ceil(-Math.log10(baseStep)) : 0;
      const rounded = precision > 0 ? parseFloat(raw.toFixed(precision)) : raw;
      const clamped = clampNum(rounded, min, max);
      const unit = localValue.match(/[a-z%]+$/i)?.[0] || "";
      const newVal = `${clamped}${unit}`;
      setLocalValue(newVal);
      onChange(prop, newVal);
      return;
    }
    // Update cursor based on whether pointer is in scrub zone
    const rect = e.currentTarget.getBoundingClientRect();
    const inZone = e.clientX - rect.left <= SCRUB_ZONE;
    e.currentTarget.style.cursor = inZone ? "ew-resize" : "";
  };

  const handleInputPointerUp = () => {
    scrubRef.current.active = false;
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const commitValue = (val: string) => {
    const resolved = clampCssValue(inferCssUnit(val, value || "", prop), min, max);
    setLocalValue(resolved);
    onChange(prop, resolved);
  };

  const handleBlur = () => {
    const resolved = clampCssValue(inferCssUnit(localValue, value || "", prop), min, max);
    if (resolved !== value) {
      commitValue(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitValue(localValue);
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const num = parseFloat(localValue);
      // If the current value is a non-numeric keyword (e.g. "normal"), ignore arrow keys
      if (isNaN(num)) return;
      const baseStep = stepProp ?? 1;
      const step = e.shiftKey ? baseStep * 10 : baseStep;
      const delta = e.key === "ArrowUp" ? step : -step;
      const raw = num + delta;
      const precision = baseStep < 1 ? Math.ceil(-Math.log10(baseStep)) : 0;
      const rounded = precision > 0 ? parseFloat(raw.toFixed(precision)) : raw;
      const clamped = clampNum(rounded, min, max);
      const unit = localValue.match(/[a-z%]+$/i)?.[0] || "";
      const newVal = `${clamped}${unit}`;
      setLocalValue(newVal);
      onChange(prop, newVal);
    }
  };

  return (
    <div className="retune-prop">
      <ChangeIndicator isChanged={isChanged ?? false} onReset={onReset ?? (() => {})} />
      {label && (
        <span
          ref={labelRef}
          className="retune-prop-label"
          onPointerDown={handleLabelPointerDown}
          onPointerMove={handleLabelPointerMove}
          onPointerUp={handleLabelPointerUp}
        >
          {label}
        </span>
      )}
      <input
        className="retune-prop-input"
        style={label ? undefined : { paddingLeft: 8 }}
        value={localValue}
        placeholder={placeholder || PLACEHOLDER_DASH}
        onPointerDown={!label ? handleInputPointerDown : undefined}
        onPointerMove={!label ? handleInputPointerMove : undefined}
        onPointerUp={!label ? handleInputPointerUp : undefined}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        spellCheck={false}
      />
    </div>
  );
}
