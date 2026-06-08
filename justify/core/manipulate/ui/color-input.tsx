/**
 * ColorInput - color swatch + hex input + opacity input.
 * Layout: [swatch | hex] [opacity %]. Clicking the swatch opens ColorPicker.
 *
 * Ported from Retune overlay/src/ui/color-input.tsx.
 *
 * DEVIATION (Phase 5 scope): the variable/token integration (variableMatch,
 * VariableAction, the token-applied pill, opening the picker to a "tokens" tab)
 * and the cross-dialog `dialog-singleton` coordination are DEFERRED to the later
 * token phase. The split swatch (solid | opacity-over-checkerboard), the integer-%
 * opacity (arrow keys / commit / display), None detection, hex sanitize/commit,
 * and the ColorPicker open/anchor logic are preserved verbatim.
 */

import { useState, useRef, useCallback } from "react";
import { parseCssColor, hexToRgba } from "./color-utils";
import { ColorPicker } from "./color-picker";
import { ChangeIndicator } from "./change-indicator";

export interface ColorInputProps {
  prop: string;
  value: string | undefined;
  onChange: (prop: string, value: string) => void;
  /** Whether this property has been changed from its original value */
  isChanged?: boolean;
  /** Reset this property to its original value */
  onReset?: () => void;
}

export function ColorInput({ prop, value, onChange, isChanged, onReset }: ColorInputProps) {
  const parsed = parseCssColor(value || "");
  const [hexLocal, setHexLocal] = useState(parsed.hex.replace("#", "").toUpperCase());
  const [opacityLocal, setOpacityLocal] = useState(String(parsed.opacity));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const swatchRef = useRef<HTMLDivElement>(null);
  const hexFocusedRef = useRef(false);
  const opacityFocusedRef = useRef(false);

  // Track current hex and opacity as refs for building CSS output
  const currentHexRef = useRef(parsed.hex);
  const currentOpacityRef = useRef(parsed.opacity);

  // Sync from parent
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    const p = parseCssColor(value || "");
    currentHexRef.current = p.hex;
    currentOpacityRef.current = p.opacity;
    if (!hexFocusedRef.current) {
      setHexLocal(p.hex.replace("#", "").toUpperCase());
    }
    if (!opacityFocusedRef.current) {
      setOpacityLocal(String(p.opacity));
    }
  }

  // Build and emit CSS color value
  const emitColor = useCallback((hex: string, opacity: number) => {
    currentHexRef.current = hex;
    currentOpacityRef.current = opacity;
    onChange(prop, hexToRgba(hex, opacity));
  }, [prop, onChange]);

  // -- Swatch click -> open picker --
  const openPicker = useCallback(() => {
    const el = swatchRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const row = el.closest(".retune-row");
    if (row) {
      const rowRect = row.getBoundingClientRect();
      setAnchorRect({ top: rect.top, left: rowRect.left, width: rowRect.width, height: rect.height });
    } else {
      setAnchorRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    }
    setPickerOpen(true);
  }, []);

  const handleSwatchClick = useCallback(() => {
    if (pickerOpen) {
      setPickerOpen(false);
      return;
    }
    openPicker();
  }, [pickerOpen, openPicker]);

  // -- Picker callbacks --
  const handlePickerChange = useCallback((hex: string) => {
    setHexLocal(hex.replace("#", "").toUpperCase());
    emitColor(hex, currentOpacityRef.current);
  }, [emitColor]);

  const handlePickerAlphaChange = useCallback((alpha: number) => {
    setOpacityLocal(String(alpha));
    emitColor(currentHexRef.current, alpha);
  }, [emitColor]);

  const handlePickerClose = useCallback(() => {
    setPickerOpen(false);
  }, []);

  // -- Hex input --
  const commitHex = useCallback(() => {
    hexFocusedRef.current = false;
    let cleaned = hexLocal.replace(/^#/, "").trim();
    if (cleaned.length === 3) {
      cleaned = cleaned[0] + cleaned[0] + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2];
    }
    if (/^[a-fA-F0-9]{6}$/.test(cleaned)) {
      setHexLocal(cleaned.toUpperCase());
      emitColor(`#${cleaned}`, currentOpacityRef.current);
    } else {
      // Revert to current
      setHexLocal(currentHexRef.current.replace("#", "").toUpperCase());
    }
  }, [hexLocal, emitColor]);

  // -- Opacity input --
  const commitOpacity = useCallback(() => {
    opacityFocusedRef.current = false;
    const val = Math.max(0, Math.min(100, Math.round(Number(opacityLocal) || 0)));
    setOpacityLocal(String(val));
    emitColor(currentHexRef.current, val);
  }, [opacityLocal, emitColor]);

  const handleOpacityKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      // Read from the input element directly to avoid stale state
      const current = Math.round(Number(e.currentTarget.value) || 0);
      const step = e.shiftKey ? 10 : 1;
      const delta = e.key === "ArrowUp" ? step : -step;
      const newVal = Math.max(0, Math.min(100, current + delta));
      setOpacityLocal(String(newVal));
      emitColor(currentHexRef.current, newVal);
    }
  }, [emitColor]);

  // Detect "none" / "transparent" state
  const isNone = !value || value === "none" || value === "transparent" || (currentHexRef.current === "#000000" && currentOpacityRef.current === 0);

  // Swatch display: split view when opacity < 100 (left=solid, right=with opacity over checkerboard)
  const swatchStyle = (() => {
    if (isNone) {
      return { backgroundColor: "#fff", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)" } as React.CSSProperties;
    }
    const hex = currentHexRef.current;
    const op = currentOpacityRef.current;
    if (op >= 100) {
      return { backgroundColor: hex, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)" } as React.CSSProperties;
    }
    const checkerboard = "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)";
    const transparentColor = hexToRgba(hex, op);
    return {
      backgroundImage: `linear-gradient(to right, ${hex} 50%, ${transparentColor} 50%), ${checkerboard}`,
      backgroundSize: "100% 100%, 4px 4px, 4px 4px",
      backgroundPosition: "0 0, 0 0, 2px 2px",
      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)",
    } as React.CSSProperties;
  })();

  return (
    <div className="retune-color-row">
      <ChangeIndicator isChanged={isChanged ?? false} onReset={onReset ?? (() => {})} />
      {/* Left half: swatch + hex */}
      <div className="retune-color-hex-section">
        <div
          ref={swatchRef}
          className="retune-color-swatch"
          onClick={handleSwatchClick}
        >
          <div className="retune-color-swatch-inner" style={swatchStyle}>
            {isNone && (
              <svg width="100%" height="100%" viewBox="0 0 16 16" style={{ position: "absolute", top: 0, left: 0 }}>
                <line x1="3" y1="13" x2="13" y2="3" stroke="var(--retune-red-500)" strokeWidth="1" strokeLinecap="round" />
              </svg>
            )}
          </div>
        </div>
        <input
          className="retune-color-hex-input"
          value={isNone ? "None" : hexLocal}
          onChange={(e) => setHexLocal(e.target.value.replace(/[^a-fA-F0-9]/g, "").slice(0, 6))}
          onFocus={(e) => { hexFocusedRef.current = true; e.target.select(); }}
          onBlur={commitHex}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          spellCheck={false}
        />
      </div>

      {/* Right half: opacity */}
      <div className="retune-color-opacity-section">
        <input
          className="retune-color-opacity-input"
          inputMode="numeric"
          value={opacityLocal}
          onChange={(e) => setOpacityLocal(e.target.value)}
          onFocus={(e) => { opacityFocusedRef.current = true; e.target.select(); }}
          onBlur={commitOpacity}
          onKeyDown={handleOpacityKeyDown}
        />
        <span className="retune-color-opacity-unit">%</span>
      </div>

      {pickerOpen && anchorRect && (
        <ColorPicker
          value={currentHexRef.current}
          alpha={currentOpacityRef.current}
          onChange={handlePickerChange}
          onAlphaChange={handlePickerAlphaChange}
          onClose={handlePickerClose}
          anchorRect={anchorRect}
        />
      )}
    </div>
  );
}
