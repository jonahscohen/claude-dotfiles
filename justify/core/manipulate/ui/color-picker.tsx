/**
 * ColorPicker - floating color picker: SV area, hue slider, alpha slider, hex/RGB
 * inputs, optional eyedropper. Uses FloatingDialog as the shell.
 *
 * Ported from Retune overlay/src/ui/color-picker.tsx.
 *
 * DEVIATION (Phase 5 scope): the "Variables" tab + token list (VariableDialog,
 * getVariablesForProperty, ramp grouping, token search) are DEFERRED to the later
 * token phase. The SV/hue/alpha DOCUMENT-LEVEL pointer drag (with dragCleanupRef on
 * unmount, NOT setPointerCapture - per plan n), hex/RGB commit, eyedropper
 * (EyeDropper feature-detection), and the auto-unlink-on-manual-edit behavior are
 * preserved verbatim. `currentVariable`/`onVariableUnlink` are kept so the token
 * phase can wire the unlink without touching this file.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  type HSVA,
  hexToHsva,
  hsvaToHex,
  hsvToHex,
  hsvToRgb,
  rgbToHsv,
} from "./color-utils";
import { FloatingDialog } from "./floating-dialog";
import { Tooltip } from "./tooltip";

export interface ColorPickerProps {
  value: string; // hex color
  alpha?: number; // 0-100
  onChange: (hex: string) => void;
  onAlphaChange?: (alpha: number) => void;
  onClose: () => void;
  anchorRect: { top: number; left: number; width: number; height: number };
  /** Truthy when a token is currently applied; manual edits auto-unlink it. */
  currentVariable?: unknown;
  onVariableUnlink?: () => void;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function ColorPicker({
  value, alpha = 100, onChange, onAlphaChange, onClose, anchorRect,
  currentVariable, onVariableUnlink,
}: ColorPickerProps) {
  const [hsva, setHsva] = useState<HSVA>(() => hexToHsva(value || "#000000"));
  const lastSentRef = useRef("");
  const dragCleanupRef = useRef<(() => void) | null>(null);

  // Clean up any active drag listeners on unmount
  useEffect(() => {
    return () => { dragCleanupRef.current?.(); };
  }, []);

  // Sync from parent when value changes externally
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== lastSentRef.current) {
      setHsva(hexToHsva(value || "#000000"));
    }
  }

  // Hex input local state
  const [hexInput, setHexInput] = useState(() =>
    hsvToHex(hsva.h, hsva.s, hsva.v).replace("#", "").toUpperCase()
  );
  const [rgbInputs, setRgbInputs] = useState(() => {
    const { r, g, b } = hsvToRgb(hsva.h, hsva.s, hsva.v);
    return { r: String(r), g: String(g), b: String(b) };
  });
  const focusedRef = useRef<string | null>(null);

  // Sync local inputs from hsva when not focused
  const [prevHsva, setPrevHsva] = useState(hsva);
  if (hsva !== prevHsva) {
    setPrevHsva(hsva);
    if (!focusedRef.current) {
      setHexInput(hsvToHex(hsva.h, hsva.s, hsva.v).replace("#", "").toUpperCase());
      const { r, g, b } = hsvToRgb(hsva.h, hsva.s, hsva.v);
      setRgbInputs({ r: String(r), g: String(g), b: String(b) });
    }
  }

  const emitChange = useCallback((newHsva: HSVA) => {
    setHsva(newHsva);
    const hex = hsvaToHex(newHsva);
    lastSentRef.current = hex;
    onChange(hex);
    // Auto-unlink variable when user manually picks a different color
    if (currentVariable) onVariableUnlink?.();
  }, [onChange, currentVariable, onVariableUnlink]);

  const hsvaRef = useRef(hsva);
  hsvaRef.current = hsva;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // -- SV Picker --

  const svRef = useRef<HTMLDivElement>(null);

  const getSV = useCallback((clientX: number, clientY: number) => {
    if (!svRef.current) return null;
    const rect = svRef.current.getBoundingClientRect();
    const s = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const v = clamp((1 - (clientY - rect.top) / rect.height) * 100, 0, 100);
    return { s, v };
  }, []);

  const handleSVPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const result = getSV(e.clientX, e.clientY);
    if (result) emitChange({ ...hsvaRef.current, s: result.s, v: result.v });

    const handleMove = (me: PointerEvent) => {
      const r = getSV(me.clientX, me.clientY);
      if (r) {
        const next = { ...hsvaRef.current, s: r.s, v: r.v };
        const hex = hsvaToHex(next);
        lastSentRef.current = hex;
        setHsva(next);
        onChangeRef.current(hex);
      }
    };
    const handleUp = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      dragCleanupRef.current = null;
    };
    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    dragCleanupRef.current = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };
  }, [getSV, emitChange]);

  // -- Hue Slider --

  const hueRef = useRef<HTMLDivElement>(null);

  const getHue = useCallback((clientX: number) => {
    if (!hueRef.current) return 0;
    const rect = hueRef.current.getBoundingClientRect();
    return clamp(((clientX - rect.left) / rect.width) * 360, 0, 360);
  }, []);

  const handleHuePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    emitChange({ ...hsvaRef.current, h: getHue(e.clientX) });

    const handleMove = (me: PointerEvent) => {
      const h = getHue(me.clientX);
      const next = { ...hsvaRef.current, h };
      const hex = hsvaToHex(next);
      lastSentRef.current = hex;
      setHsva(next);
      onChangeRef.current(hex);
    };
    const handleUp = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      dragCleanupRef.current = null;
    };
    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    dragCleanupRef.current = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };
  }, [getHue, emitChange]);

  // -- Alpha Slider --

  const alphaSliderRef = useRef<HTMLDivElement>(null);
  const [localAlpha, setLocalAlpha] = useState(alpha);
  const onAlphaChangeRef = useRef(onAlphaChange);
  onAlphaChangeRef.current = onAlphaChange;

  const [prevAlpha, setPrevAlpha] = useState(alpha);
  if (alpha !== prevAlpha) {
    setPrevAlpha(alpha);
    setLocalAlpha(alpha);
  }

  const getAlpha = useCallback((clientX: number) => {
    if (!alphaSliderRef.current) return 100;
    const rect = alphaSliderRef.current.getBoundingClientRect();
    return clamp(Math.round(((clientX - rect.left) / rect.width) * 100), 0, 100);
  }, []);

  const handleAlphaPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const a = getAlpha(e.clientX);
    setLocalAlpha(a);
    onAlphaChangeRef.current?.(a);

    const handleMove = (me: PointerEvent) => {
      const a = getAlpha(me.clientX);
      setLocalAlpha(a);
      onAlphaChangeRef.current?.(a);
    };
    const handleUp = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      dragCleanupRef.current = null;
    };
    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    dragCleanupRef.current = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };
  }, [getAlpha]);

  // -- Hex commit --

  const commitHex = useCallback(() => {
    focusedRef.current = null;
    let cleaned = hexInput.replace(/^#/, "").trim();
    if (cleaned.length === 3) {
      cleaned = cleaned[0] + cleaned[0] + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2];
    }
    if (/^[a-fA-F0-9]{6}$/.test(cleaned)) {
      const newHsva = hexToHsva(`#${cleaned}`, hsva.a);
      emitChange(newHsva);
      setHexInput(cleaned.toUpperCase());
    } else {
      setHexInput(hsvToHex(hsva.h, hsva.s, hsva.v).replace("#", "").toUpperCase());
    }
  }, [hexInput, hsva, emitChange]);

  // -- RGB commit --

  const commitRgb = useCallback(() => {
    focusedRef.current = null;
    const r = clamp(Math.round(Number(rgbInputs.r) || 0), 0, 255);
    const g = clamp(Math.round(Number(rgbInputs.g) || 0), 0, 255);
    const b = clamp(Math.round(Number(rgbInputs.b) || 0), 0, 255);
    const { h, s, v } = rgbToHsv(r, g, b);
    emitChange({ h, s, v, a: hsva.a });
    setRgbInputs({ r: String(r), g: String(g), b: String(b) });
  }, [rgbInputs, hsva.a, emitChange]);

  const handleInputKeyDown = useCallback(
    (commitFn: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
        commitFn();
      }
    },
    []
  );

  // -- Render --

  const currentHex = hsvToHex(hsva.h, hsva.s, hsva.v);
  const handleLeft = hsva.s;
  const handleTop = 100 - hsva.v;

  const hasEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;

  const handleEyeDropper = useCallback(async () => {
    if (!hasEyeDropper) return;
    try {
      const dropper = new (window as any).EyeDropper();
      const result = await dropper.open();
      if (result?.sRGBHex) {
        const hex = result.sRGBHex;
        onChange(hex);
        setHsva(hexToHsva(hex));
        if (currentVariable) onVariableUnlink?.();
      }
    } catch {
      // User cancelled or API error
    }
  }, [hasEyeDropper, onChange, currentVariable, onVariableUnlink]);

  const pickerContent = (
    <>
      {/* SV Picker */}
      <div className="retune-cp-sv-wrap">
      <div
        ref={svRef}
        className="retune-cp-sv"
        style={{ backgroundColor: `hsl(${hsva.h}, 100%, 50%)` }}
        onPointerDown={handleSVPointerDown}
      >
        <div className="retune-cp-sv-white" />
        <div className="retune-cp-sv-black" />
        <div
          className="retune-cp-handle"
          style={{ left: `${handleLeft}%`, top: `${handleTop}%` }}
        >
          <div className="retune-cp-handle-inner" style={{ backgroundColor: currentHex }} />
        </div>
      </div>
      </div>

      {/* Sliders */}
      <div className="retune-cp-sliders">
        {hasEyeDropper && (
          <Tooltip content="Pick color from screen" side="bottom" delay={300}>
            <button type="button" className="retune-cp-eyedropper" onClick={handleEyeDropper}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M14.5156 5.76709C15.5386 4.73901 17.203 4.7367 18.2285 5.76221C19.25 6.78399 19.2513 8.43996 18.2324 9.46436L16.6602 11.0435C17.0848 11.771 16.9869 12.7196 16.3633 13.3433L16.3438 13.3638C15.6018 14.1055 14.3982 14.1054 13.6562 13.3638L13.5 13.2075L8.43945 18.2642C7.97069 18.7324 7.33447 18.9956 6.67188 18.9956L5.50391 18.9946C5.22841 18.9944 5.00451 18.7712 5.00391 18.4956L5.00195 17.3315C5.00057 16.6668 5.26346 16.0282 5.7334 15.5581L10.792 10.4995L10.6367 10.3433C9.89467 9.60127 9.8947 8.39778 10.6367 7.65576L10.6562 7.63623C11.2789 7.01362 12.2251 6.91514 12.9521 7.3374L14.5156 5.76709ZM6.44043 16.2661C6.15876 16.5481 6.00112 16.931 6.00195 17.3296L6.00391 17.9937L6.67188 17.9956C7.06948 17.9956 7.45115 17.8372 7.73242 17.5562L12.793 12.5005L11.499 11.2065L6.44043 16.2661ZM17.5205 6.46924C16.8863 5.8355 15.8572 5.83673 15.2246 6.47217L13.3545 8.35205L13.001 8.70752L12.6367 8.34326C12.2852 7.99183 11.7147 7.99181 11.3633 8.34326L11.3438 8.36279C10.9923 8.71427 10.9923 9.28476 11.3438 9.63623L14.3633 12.6558C14.7147 13.0073 15.2852 13.0072 15.6367 12.6558L15.6562 12.6362C16.0077 12.2848 16.0077 11.7143 15.6562 11.3628L15.2939 11.0005L15.6455 10.647L17.5234 8.75928C18.1538 8.12571 18.1523 7.10128 17.5205 6.46924Z" fill="currentColor" />
              </svg>
            </button>
          </Tooltip>
        )}
        <div className="retune-cp-slider-tracks">
          <div ref={hueRef} className="retune-cp-hue" onPointerDown={handleHuePointerDown}>
            <div className="retune-cp-handle" style={{ left: `${(hsva.h / 360) * 100}%`, top: "50%" }}>
              <div className="retune-cp-handle-inner" style={{ backgroundColor: `hsl(${hsva.h}, 100%, 50%)` }} />
            </div>
          </div>
          <div ref={alphaSliderRef} className="retune-cp-alpha" onPointerDown={handleAlphaPointerDown}>
            <div className="retune-cp-alpha-checker" />
            <div className="retune-cp-alpha-gradient" style={{ background: `linear-gradient(to right, transparent, ${currentHex})` }} />
            <div className="retune-cp-handle" style={{ left: `${localAlpha}%`, top: "50%" }}>
              <div className="retune-cp-handle-inner" style={{ backgroundColor: localAlpha < 100
                ? `rgba(${hsvToRgb(hsva.h, hsva.s, hsva.v).r}, ${hsvToRgb(hsva.h, hsva.s, hsva.v).g}, ${hsvToRgb(hsva.h, hsva.s, hsva.v).b}, ${localAlpha / 100})`
                : currentHex
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Inputs */}
      <div className="retune-cp-inputs">
        <div className="retune-cp-input-group">
          <label className="retune-cp-label">Hex</label>
          <input className="retune-cp-input" value={hexInput} onChange={(e) => setHexInput(e.target.value)} onFocus={(e) => { focusedRef.current = "hex"; e.target.select(); }} onBlur={commitHex} onKeyDown={handleInputKeyDown(commitHex)} spellCheck={false} />
        </div>
        <div className="retune-cp-input-group">
          <label className="retune-cp-label">R</label>
          <input className="retune-cp-input" inputMode="numeric" value={rgbInputs.r} onChange={(e) => setRgbInputs(prev => ({ ...prev, r: e.target.value }))} onFocus={(e) => { focusedRef.current = "r"; e.target.select(); }} onBlur={commitRgb} onKeyDown={handleInputKeyDown(commitRgb)} />
        </div>
        <div className="retune-cp-input-group">
          <label className="retune-cp-label">G</label>
          <input className="retune-cp-input" inputMode="numeric" value={rgbInputs.g} onChange={(e) => setRgbInputs(prev => ({ ...prev, g: e.target.value }))} onFocus={(e) => { focusedRef.current = "g"; e.target.select(); }} onBlur={commitRgb} onKeyDown={handleInputKeyDown(commitRgb)} />
        </div>
        <div className="retune-cp-input-group">
          <label className="retune-cp-label">B</label>
          <input className="retune-cp-input" inputMode="numeric" value={rgbInputs.b} onChange={(e) => setRgbInputs(prev => ({ ...prev, b: e.target.value }))} onFocus={(e) => { focusedRef.current = "b"; e.target.select(); }} onBlur={commitRgb} onKeyDown={handleInputKeyDown(commitRgb)} />
        </div>
      </div>
    </>
  );

  return (
    <FloatingDialog title="Color" onClose={onClose} anchorRect={anchorRect}>
      {pickerContent}
    </FloatingDialog>
  );
}
