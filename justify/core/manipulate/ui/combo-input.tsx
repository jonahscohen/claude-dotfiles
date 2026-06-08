/**
 * ComboInput - number input with a dropdown for preset keyword values
 * (e.g. auto, fit-content). Supports typing numeric values with units and
 * selecting from CSS keyword options. Scrub-to-adjust on the label.
 *
 * Ported from Retune overlay/src/ui/combo-input.tsx.
 *
 * DEVIATION (Phase 3b scope): the variable/token integration (variableMatch,
 * VariableDialog, hasVariablesForProperty, the "Add variable" sentinel option,
 * usePreviewValue) is deferred to the later token phase. The scrub math
 * (1px = 1 integer, with the negative-clamp prop allowlist), keyword matching,
 * keyboard (dropdown nav when open / numeric stepper when closed), commit and
 * exact geometry are preserved verbatim. Uses setPointerCapture.
 */

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { DropdownMenu, type DropdownMenuOption } from "./dropdown-menu";
import { calcMenuPosition, type MenuPosition } from "./menu-position";
import { roundCssValue, inferCssUnit } from "./round-css-value";
import { ChevronDown } from "./icons";
import { useScrollLock } from "./use-scroll-lock";
import { ChangeIndicator } from "./change-indicator";

// Default placeholder glyph: en-dash (U+2013), matching Retune verbatim.
const PLACEHOLDER_DASH = String.fromCharCode(0x2013);

export interface ComboOption {
  value: string;
  label: string;
}

export interface ComboInputProps {
  label?: ReactNode;
  prop: string;
  value: string | undefined;
  options: ComboOption[];
  onChange: (prop: string, value: string) => void;
  /** Whether this property has been changed from its original value */
  isChanged?: boolean;
  /** Reset this property to its original value */
  onReset?: () => void;
}

export function ComboInput({ label, prop, value, options, onChange, isChanged, onReset }: ComboInputProps) {
  const [localValue, setLocalValue] = useState(roundCssValue(value || ""));
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const editingRef = useRef(false);
  useScrollLock(open);

  const allOptions = options;

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    // Don't overwrite what the user is typing
    if (!editingRef.current) {
      setLocalValue(roundCssValue(value || ""));
    }
  }

  const openDropdown = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const selectedIndex = Math.max(0, allOptions.findIndex((opt) => opt.value === localValue));
    const pos = calcMenuPosition(rect, selectedIndex, allOptions.length);
    setMenuPos(pos);
    setOpen(true);
    setHighlightedIndex(selectedIndex);
  }, [allOptions, localValue]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
    setMenuPos(null);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const path = e.composedPath();
      if (!path.includes(container)) {
        closeDropdown();
      }
    };
    const root = containerRef.current?.getRootNode() as ShadowRoot | Document;
    root.addEventListener("pointerdown", handlePointerDown as EventListener);
    return () => root.removeEventListener("pointerdown", handlePointerDown as EventListener);
  }, [open, closeDropdown]);

  // Get display value: show option label if value matches an option
  const displayValue = (() => {
    const match = options.find((opt) => opt.value === localValue);
    return match ? match.label : localValue;
  })();

  // Scrub-to-adjust on label
  const scrubRef = useRef({ startX: 0, startVal: 0, active: false });

  const handleLabelPointerDown = (e: React.PointerEvent) => {
    const num = parseFloat(localValue);
    if (isNaN(num)) return;
    scrubRef.current = { startX: e.clientX, startVal: num, active: true };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleLabelPointerMove = (e: React.PointerEvent) => {
    if (!scrubRef.current.active) return;
    const delta = Math.round(e.clientX - scrubRef.current.startX);
    const unit = localValue.match(/[a-z%]+$/i)?.[0] || "";
    const raw = scrubRef.current.startVal + delta;
    // Clamp to 0 minimum for properties that shouldn't go negative (gap, size, etc.)
    const clamped = raw < 0 && !prop.includes("margin") && !prop.includes("top") && !prop.includes("right") && !prop.includes("bottom") && !prop.includes("left") && !prop.includes("indent") ? 0 : raw;
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
    if (label) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left > SCRUB_ZONE) return;
    const num = parseFloat(localValue);
    if (isNaN(num)) return;
    e.preventDefault();
    scrubRef.current = { startX: e.clientX, startVal: num, active: true };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleInputPointerMove = (e: React.PointerEvent<HTMLInputElement>) => {
    if (scrubRef.current.active) {
      const delta = Math.round(e.clientX - scrubRef.current.startX);
      const unit = localValue.match(/[a-z%]+$/i)?.[0] || "";
      const raw = scrubRef.current.startVal + delta;
      const clamped = raw < 0 && !prop.includes("margin") && !prop.includes("top") && !prop.includes("right") && !prop.includes("bottom") && !prop.includes("left") && !prop.includes("indent") ? 0 : raw;
      const newVal = `${clamped}${unit}`;
      setLocalValue(newVal);
      onChange(prop, newVal);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const inZone = e.clientX - rect.left <= SCRUB_ZONE;
    e.currentTarget.style.cursor = inZone ? "ew-resize" : "";
  };

  const handleInputPointerUp = () => {
    scrubRef.current.active = false;
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    editingRef.current = true;
    e.target.select();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    const match = options.find(
      (opt) =>
        opt.label.toLowerCase() === newValue.toLowerCase() ||
        opt.value.toLowerCase() === newValue.toLowerCase()
    );
    if (match) {
      onChange(prop, match.value);
    }
  };

  const handleBlur = () => {
    editingRef.current = false;
    const resolved = inferCssUnit(localValue, value || "", prop);
    setLocalValue(resolved);
    if (resolved !== value) {
      onChange(prop, resolved);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && highlightedIndex >= 0) {
        const opt = allOptions[highlightedIndex];
        setLocalValue(opt.value);
        onChange(prop, opt.value);
        closeDropdown();
      } else {
        const resolved = inferCssUnit(localValue, value || "", prop);
        setLocalValue(resolved);
        onChange(prop, resolved);
        (e.target as HTMLInputElement).blur();
      }
      return;
    }

    if (e.key === "Escape") {
      closeDropdown();
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (open) {
        if (e.key === "ArrowDown") {
          setHighlightedIndex((prev) => prev < allOptions.length - 1 ? prev + 1 : prev);
        } else {
          setHighlightedIndex((prev) => prev > 0 ? prev - 1 : prev);
        }
      } else {
        const num = parseFloat(localValue);
        if (isNaN(num)) return;
        const step = e.shiftKey ? 10 : 1;
        const delta = e.key === "ArrowUp" ? step : -step;
        const unit = localValue.match(/[a-z%]+$/i)?.[0] || "";
        const newVal = `${num + delta}${unit}`;
        setLocalValue(newVal);
        onChange(prop, newVal);
      }
    }
  };

  const handleOptionSelect = (option: DropdownMenuOption) => {
    setLocalValue(option.value);
    onChange(prop, option.value);
    closeDropdown();
  };

  return (
    <div className="retune-combo" ref={containerRef}>
      <ChangeIndicator isChanged={isChanged ?? false} onReset={onReset ?? (() => {})} />
      {label && (
        <span
          ref={labelRef}
          className="retune-combo-label"
          onPointerDown={handleLabelPointerDown}
          onPointerMove={handleLabelPointerMove}
          onPointerUp={handleLabelPointerUp}
        >
          {label}
        </span>
      )}
      <input
        className="retune-combo-input"
        style={label ? undefined : { paddingLeft: 8 }}
        value={displayValue}
        placeholder={PLACEHOLDER_DASH}
        onPointerDown={!label ? handleInputPointerDown : undefined}
        onPointerMove={!label ? handleInputPointerMove : undefined}
        onPointerUp={!label ? handleInputPointerUp : undefined}
        onFocus={handleFocus}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        spellCheck={false}
      />
      <button
        type="button"
        className="retune-combo-trigger"
        onClick={() => { open ? closeDropdown() : openDropdown(); }}
        aria-label="Toggle options"
      >
        <ChevronDown />
      </button>
      {open && menuPos && (
        <div
          className="retune-combo-dropdown-anchor"
          style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
        >
          <DropdownMenu
            options={allOptions}
            value={localValue}
            highlightedIndex={highlightedIndex}
            onSelect={handleOptionSelect}
            onHighlight={setHighlightedIndex}
            initialScrollTop={menuPos.scrollTop}
            showCheckmark
          />
        </div>
      )}
    </div>
  );
}
