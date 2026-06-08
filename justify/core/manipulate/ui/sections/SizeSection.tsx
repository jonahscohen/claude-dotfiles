/**
 * SizeSection - width/height sizing with Fill/Hug/Auto modes, aspect-ratio
 * lock, and optional min/max constraints. Two modes:
 *   - Frame mode (frameDimensions prop): simple NumberInputs for iframe w/h
 *   - Normal mode: full ComboInput sizing + aspect lock + min/max extras
 *
 * Ported 1:1 from Retune ui/sections/SizeSection.tsx per spec
 * 03-sections-position-layout-spacing-size.md (section 4). Token/variable layer
 * DEFERRED. Uses the ported sizing-utils for mode logic. The aspect-lock and
 * add/remove icons are the inline locks + Plus/Minus from section-icons.
 */

import { useState, useRef, useEffect, useCallback } from "preact/hooks";
import type { BaseSectionProps, LayoutContextProps } from "./section-props";
import { Section, Row, Field } from "../section";
import { NumberInput } from "../number-input";
import { ComboInput, type ComboOption } from "../combo-input";
import { DropdownMenu, type DropdownMenuOption } from "../dropdown-menu";
import { Tooltip } from "../tooltip";
import { Plus, Minus, LockClosed, LockOpen } from "../section-icons";
import { computeSizingChanges, detectSizingMode, canFill, type SizingMode } from "../sizing-utils";

type SizeExtra = "min" | "max";

export interface SizeSectionProps extends BaseSectionProps, LayoutContextProps {
  /** When set, shows iframe dimensions instead of CSS width/height. */
  frameDimensions?: { width: number; height: number; onResize: (width: number, height: number) => void };
}

const SIZE_OPTIONS: ComboOption[] = [
  { value: "__fill", label: "Fill" },
  { value: "__hug", label: "Hug" },
  { value: "auto", label: "Auto" },
];

// Defined in Retune but not rendered (kept for parity; see spec open-question 1).
const FLEX_BASIS_OPTIONS: ComboOption[] = [
  { value: "auto", label: "Auto" },
  { value: "0", label: "0" },
  { value: "100%", label: "100%" },
  { value: "fit-content", label: "Fit Content" },
];
void FLEX_BASIS_OPTIONS;

export function SizeSection({
  element,
  s,
  onPropertyChange,
  changeProps,
  isFlexChild,
  isGridChild,
  parentFlexDir,
  frameDimensions,
}: SizeSectionProps) {
  // -- Internal state --
  const [sizeExtras, setSizeExtras] = useState<Set<SizeExtra>>(new Set());
  const [aspectLocked, setAspectLocked] = useState(false);
  const aspectRatioRef = useRef<number>(1);
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const [sizeMenuPos, setSizeMenuPos] = useState<{ top: number; left: number } | null>(null);

  const sizeMenuRef = useRef<HTMLDivElement>(null);
  const sizeMenuBtnRef = useRef<HTMLButtonElement>(null);

  // Close size dropdown on outside click
  useEffect(() => {
    if (!sizeMenuOpen) return;
    const handleClick = (e: PointerEvent) => {
      const btn = sizeMenuBtnRef.current;
      const menu = sizeMenuRef.current;
      if (btn && btn.contains(e.target as Node)) return;
      if (menu && menu.contains(e.target as Node)) return;
      setSizeMenuOpen(false);
    };
    const root = sizeMenuBtnRef.current?.getRootNode() as ShadowRoot | Document;
    root.addEventListener("pointerdown", handleClick as EventListener);
    return () => root.removeEventListener("pointerdown", handleClick as EventListener);
  }, [sizeMenuOpen]);

  // -- Sizing mode detection --
  const sizingCtx = { isFlexChild, isGridChild, parentFlexDir, currentStyles: s };
  const widthMode = detectSizingMode("width", sizingCtx);
  const heightMode = detectSizingMode("height", sizingCtx);
  const heightCanFill = canFill("height", sizingCtx);
  const heightSizeOptions = heightCanFill ? SIZE_OPTIONS : SIZE_OPTIONS.filter(o => o.value !== "__fill");
  const widthDisplayValue = widthMode === "fill" ? "__fill" : widthMode === "hug" ? "__hug" : s.width;
  const heightDisplayValue = heightMode === "fill" ? "__fill" : heightMode === "hug" ? "__hug" : s.height;

  // Auto-show size extras that have non-default values
  const visibleSizeExtras = new Set(sizeExtras);
  if ((s.minWidth && s.minWidth !== "0px" && s.minWidth !== "auto") ||
      (s.minHeight && s.minHeight !== "0px" && s.minHeight !== "auto")) visibleSizeExtras.add("min");
  if ((s.maxWidth && s.maxWidth !== "none") ||
      (s.maxHeight && s.maxHeight !== "none")) visibleSizeExtras.add("max");

  const handleSizingModeChange = useCallback((axis: "width" | "height", mode: SizingMode) => {
    const rect = element.element?.getBoundingClientRect();
    const changes = computeSizingChanges(axis, mode, {
      isFlexChild,
      isGridChild,
      parentFlexDir,
      currentStyles: s,
      elementRect: rect ? { width: rect.width, height: rect.height } : undefined,
    });
    for (const [prop, value] of Object.entries(changes)) {
      onPropertyChange(prop, value);
    }
  }, [isFlexChild, isGridChild, parentFlexDir, s, element.element, onPropertyChange]);

  // -- Frame mode: simple iframe dimensions --
  if (frameDimensions) {
    return (
      <Section label="Size">
        <Row>
          <Field label="Width">
            <NumberInput
              prop="width"
              value={`${frameDimensions.width}px`}
              onChange={(_p, v) => {
                const n = parseInt(v);
                if (!isNaN(n) && n > 0) frameDimensions.onResize(n, frameDimensions.height);
              }}
              min={200}
            />
          </Field>
          <Field label="Height">
            <NumberInput
              prop="height"
              value={`${frameDimensions.height}px`}
              onChange={(_p, v) => {
                const n = parseInt(v);
                if (!isNaN(n) && n > 0) frameDimensions.onResize(frameDimensions.width, n);
              }}
              min={200}
            />
          </Field>
        </Row>
      </Section>
    );
  }

  // -- Normal mode: full sizing controls --
  return (
    <Section
      label="Size"
      action={
        <>
          <Tooltip content="Add constraint" side="top">
            <button
              ref={sizeMenuBtnRef}
              className="retune-section-action"
              onClick={() => {
                if (sizeMenuOpen) {
                  setSizeMenuOpen(false);
                  return;
                }
                const el = sizeMenuBtnRef.current;
                if (!el) return;
                const rect = el.getBoundingClientRect();
                setSizeMenuPos({ top: rect.bottom + 4, left: rect.right });
                setSizeMenuOpen(true);
              }}
            >
              <Plus />
            </button>
          </Tooltip>
          {sizeMenuOpen && sizeMenuPos && (
            <div
              ref={sizeMenuRef}
              style={{ position: "fixed", top: sizeMenuPos.top, left: sizeMenuPos.left, transform: "translateX(-100%)", zIndex: 2147483647 }}
            >
              <DropdownMenu
                options={[
                  { value: "min", label: visibleSizeExtras.has("min") ? "Remove min size" : "Add min size" },
                  { value: "max", label: visibleSizeExtras.has("max") ? "Remove max size" : "Add max size" },
                ]}
                value={undefined}
                showCheckmark={false}
                onSelect={(option: DropdownMenuOption) => {
                  const key = option.value as SizeExtra;
                  if (visibleSizeExtras.has(key)) {
                    // Remove: reset values to defaults and hide
                    if (key === "min") {
                      onPropertyChange("minWidth", "0px");
                      onPropertyChange("minHeight", "0px");
                    } else {
                      onPropertyChange("maxWidth", "none");
                      onPropertyChange("maxHeight", "none");
                    }
                    setSizeExtras((prev) => {
                      const next = new Set(prev);
                      next.delete(key);
                      return next;
                    });
                  } else {
                    setSizeExtras((prev) => {
                      const next = new Set(prev);
                      next.add(key);
                      return next;
                    });
                  }
                  setSizeMenuOpen(false);
                }}
              />
            </div>
          )}
        </>
      }
    >
      <Row>
        <Field label="Width">
          <ComboInput
            prop="width"
            value={widthDisplayValue}
            options={SIZE_OPTIONS}
            onChange={(prop, val) => {
              if (val === "__fill") handleSizingModeChange("width", "fill");
              else if (val === "__hug") handleSizingModeChange("width", "hug");
              else {
                if (isFlexChild) handleSizingModeChange("width", "fixed");
                onPropertyChange(prop, val);
                // Aspect ratio lock: adjust height proportionally
                if (aspectLocked) {
                  const newW = parseFloat(val);
                  if (!isNaN(newW) && aspectRatioRef.current > 0) {
                    const newH = Math.round(newW / aspectRatioRef.current);
                    requestAnimationFrame(() => onPropertyChange("height", `${newH}px`));
                  }
                }
              }
            }}
            {...changeProps("width")}
          />
        </Field>
        <Field label="Height">
          <ComboInput
            prop="height"
            value={heightDisplayValue}
            options={heightSizeOptions}
            onChange={(prop, val) => {
              if (val === "__fill") handleSizingModeChange("height", "fill");
              else if (val === "__hug") handleSizingModeChange("height", "hug");
              else {
                if (isFlexChild) handleSizingModeChange("height", "fixed");
                onPropertyChange(prop, val);
                // Aspect ratio lock: adjust width proportionally
                if (aspectLocked) {
                  const newH = parseFloat(val);
                  if (!isNaN(newH) && aspectRatioRef.current > 0) {
                    const newW = Math.round(newH * aspectRatioRef.current);
                    requestAnimationFrame(() => onPropertyChange("width", `${newW}px`));
                  }
                }
              }
            }}
            {...changeProps("height")}
          />
        </Field>
        <Tooltip content={aspectLocked ? "Unlock aspect ratio" : "Lock aspect ratio"} side="top">
          <button
            className={`retune-split-btn${aspectLocked ? " active" : ""}`}
            onClick={() => {
              if (!aspectLocked && element.element) {
                const rect = element.element.getBoundingClientRect();
                if (rect.height > 0) aspectRatioRef.current = rect.width / rect.height;
                element.element.setAttribute("data-retune-aspect-locked", "true");
              } else if (element.element) {
                element.element.removeAttribute("data-retune-aspect-locked");
              }
              setAspectLocked(v => !v);
            }}
          >
            {aspectLocked ? <LockClosed /> : <LockOpen />}
          </button>
        </Tooltip>
      </Row>
      {visibleSizeExtras.has("min") && (
        <div className="retune-section-row">
          <div className="retune-row">
            <Field label="Min W">
              <NumberInput prop="minWidth" value={s.minWidth === "0px" || s.minWidth === "auto" ? "" : s.minWidth} placeholder={EN_DASH} onChange={(p, v) => {
                if (!v) onPropertyChange(p, "0px");
                else onPropertyChange(p, v);
              }} {...changeProps("minWidth")} />
            </Field>
            <Field label="Min H">
              <NumberInput prop="minHeight" value={s.minHeight === "0px" || s.minHeight === "auto" ? "" : s.minHeight} placeholder={EN_DASH} onChange={(p, v) => {
                if (!v) onPropertyChange(p, "0px");
                else onPropertyChange(p, v);
              }} {...changeProps("minHeight")} />
            </Field>
            <Tooltip content="Remove min size" side="top">
              <button className="retune-split-btn" onClick={() => {
                onPropertyChange("minWidth", "0px");
                onPropertyChange("minHeight", "0px");
                setSizeExtras((prev) => { const next = new Set(prev); next.delete("min"); return next; });
              }}>
                <Minus />
              </button>
            </Tooltip>
          </div>
        </div>
      )}
      {visibleSizeExtras.has("max") && (
        <div className="retune-section-row">
          <div className="retune-row">
            <Field label="Max W">
              <NumberInput prop="maxWidth" value={s.maxWidth === "none" ? "" : s.maxWidth} placeholder={EN_DASH} onChange={(p, v) => {
                if (!v) onPropertyChange(p, "none");
                else onPropertyChange(p, v);
              }} {...changeProps("maxWidth")} />
            </Field>
            <Field label="Max H">
              <NumberInput prop="maxHeight" value={s.maxHeight === "none" ? "" : s.maxHeight} placeholder={EN_DASH} onChange={(p, v) => {
                if (!v) onPropertyChange(p, "none");
                else onPropertyChange(p, v);
              }} {...changeProps("maxHeight")} />
            </Field>
            <Tooltip content="Remove max size" side="top">
              <button className="retune-split-btn" onClick={() => {
                onPropertyChange("maxWidth", "none");
                onPropertyChange("maxHeight", "none");
                setSizeExtras((prev) => { const next = new Set(prev); next.delete("max"); return next; });
              }}>
                <Minus />
              </button>
            </Tooltip>
          </div>
        </div>
      )}
    </Section>
  );
}

// Empty min/max placeholder glyph: en-dash (U+2013), matching Retune verbatim.
const EN_DASH = String.fromCharCode(0x2013);
