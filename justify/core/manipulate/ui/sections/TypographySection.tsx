/**
 * TypographySection - font, size, weight, line-height, letter-spacing, color,
 * alignment, and expanded decoration/transform/truncate/list controls.
 *
 * Ported near-verbatim from Retune ui/sections/TypographySection.tsx per spec 04.
 * Gated: returns null entirely when !isText.
 *
 * DEVIATIONS (this phase): the token/variable layer is deferred, so the
 * `{...variableProps(...)}` spreads are dropped; `{...changeProps(...)}` (the
 * per-property {isChanged,onReset}) is preserved. ColorInput is imported from
 * its canonical path (built by the color/gradient task #26).
 */

import { useState } from "react";
import { Section, Row, Field } from "../section.js";
import { NumberInput } from "../number-input.js";
import { ComboInput, type ComboOption } from "../combo-input.js";
import { ColorInput } from "../color-input.js";
import { FontInput } from "../font-input.js";
import { SelectInput } from "../select-input.js";
import { SegmentedControl, type SegmentedOption } from "../segmented-control.js";
import { Tooltip } from "../tooltip.js";
import {
  TextAlignLeft, TextAlignCenter, TextAlignRight,
  TextAlignTop, TextAlignMiddle, TextAlignBottom,
  AdjustSmall, Minus, ListView, NumberList,
} from "../section-icons.js";
import { detectTruncation, computeTruncationChanges } from "../truncation-utils.js";
import type { BaseSectionProps } from "./section-props.js";

export interface TypographySectionProps extends BaseSectionProps {
  /** Whether the element contains text (gates the whole section). */
  isText: boolean;
  /** Whether vertical-align applies (enables the Vertical control). */
  hasVerticalAlign: boolean;
  /** Apply a style directly to an arbitrary element (ancestor min-width fix). */
  onApplyToElement?: (element: Element, property: string, value: string) => void;
}

// ── Constants ──

const TEXT_ALIGN_OPTIONS: SegmentedOption[] = [
  { value: "left", icon: <TextAlignLeft />, label: "Left" },
  { value: "center", icon: <TextAlignCenter />, label: "Center" },
  { value: "right", icon: <TextAlignRight />, label: "Right" },
];

const VERTICAL_ALIGN_OPTIONS: SegmentedOption[] = [
  { value: "top", icon: <TextAlignTop />, label: "Top" },
  { value: "middle", icon: <TextAlignMiddle />, label: "Middle" },
  { value: "bottom", icon: <TextAlignBottom />, label: "Bottom" },
];

const FONT_WEIGHT_OPTIONS: ComboOption[] = [
  { value: "100", label: "Thin" },
  { value: "200", label: "Extra Light" },
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
  { value: "900", label: "Black" },
];

const LINE_HEIGHT_OPTIONS: ComboOption[] = [
  { value: "normal", label: "Normal" },
  { value: "1", label: "1" },
  { value: "1.25", label: "1.25" },
  { value: "1.5", label: "1.5" },
  { value: "1.75", label: "1.75" },
  { value: "2", label: "2" },
];

const LETTER_SPACING_OPTIONS: ComboOption[] = [
  { value: "normal", label: "Normal" },
  { value: "-0.05em", label: "Tight" },
  { value: "0.05em", label: "Wide" },
  { value: "0.1em", label: "Wider" },
];

const LIST_STYLE_OPTIONS: SegmentedOption[] = [
  { value: "none", icon: <Minus />, label: "None" },
  { value: "disc", icon: <ListView />, label: "Bullet" },
  { value: "decimal", icon: <NumberList />, label: "Numbered" },
];

// ── Helpers ──

/** Map computed textAlign CSS value to our option values */
function mapTextAlign(value: string | undefined): string {
  if (!value) return "left";
  if (value === "start") return "left";
  if (value === "end") return "right";
  return value; // left, center, right, justify pass through
}

/** Map computed verticalAlign CSS value to our option values */
function mapVerticalAlign(value: string | undefined): string {
  if (!value) return "top";
  if (value === "middle" || value === "center") return "middle";
  if (value === "bottom") return "bottom";
  if (value === "top" || value === "baseline" || value === "text-top") return "top";
  if (value === "text-bottom" || value === "sub") return "bottom";
  if (value === "super") return "top";
  return "top";
}

export function TypographySection({
  element,
  s,
  onPropertyChange,
  onApplyToElement,
  changeProps,
  isText,
  hasVerticalAlign,
}: TypographySectionProps) {
  const [typoExpanded, setTypoExpanded] = useState(false);

  if (!isText) return null;

  return (
    <Section label="Typography">
      <Row>
        <Field label="Font">
          <FontInput prop="fontFamily" value={s.fontFamily} onChange={onPropertyChange} {...changeProps("fontFamily")} />
        </Field>
      </Row>
      <Row>
        <Field label="Size">
          <NumberInput prop="fontSize" value={s.fontSize} onChange={onPropertyChange} min={1} {...changeProps("fontSize")} />
        </Field>
        <Field label="Weight">
          <ComboInput prop="fontWeight" value={s.fontWeight} options={FONT_WEIGHT_OPTIONS} onChange={onPropertyChange} {...changeProps("fontWeight")} />
        </Field>
      </Row>
      <Row>
        <Field label="Line height">
          <ComboInput prop="lineHeight" value={s.lineHeight} options={LINE_HEIGHT_OPTIONS} onChange={onPropertyChange} {...changeProps("lineHeight")} />
        </Field>
        <Field label="Letter spacing">
          <ComboInput prop="letterSpacing" value={s.letterSpacing} options={LETTER_SPACING_OPTIONS} onChange={onPropertyChange} {...changeProps("letterSpacing")} />
        </Field>
      </Row>
      <Row>
        <Field label="Color">
          <ColorInput prop="color" value={s.color} onChange={onPropertyChange} {...changeProps("color")} />
        </Field>
      </Row>
      <Row>
        <Field label="Align">
          <SegmentedControl
            options={TEXT_ALIGN_OPTIONS}
            value={mapTextAlign(s.textAlign)}
            onChange={(v) => onPropertyChange("textAlign", v)}
          />
        </Field>
        <Field label="Vertical">
          <SegmentedControl
            options={VERTICAL_ALIGN_OPTIONS}
            value={mapVerticalAlign(s.verticalAlign)}
            onChange={(v) => onPropertyChange("verticalAlign", v)}
            disabled={!hasVerticalAlign}
          />
        </Field>
        <div style={{ alignSelf: "flex-end" }}>
          <Tooltip content={typoExpanded ? "Show less" : "More options"} side="top">
            <button className={`retune-split-btn${typoExpanded ? " active" : ""}`} onClick={() => setTypoExpanded((v) => !v)}>
              <AdjustSmall />
            </button>
          </Tooltip>
        </div>
      </Row>
      {typoExpanded && (
        <>
          <Row>
            <Field label="Style">
              <SelectInput prop="fontStyle" value={s.fontStyle} options={["normal", "italic", "oblique"]} onChange={onPropertyChange} />
            </Field>
            <Field label="Decoration">
              <SelectInput prop="textDecoration" value={s.textDecoration} options={["none", "underline", "line-through", "overline"]} onChange={onPropertyChange} />
            </Field>
          </Row>
          <Row>
            <Field label="Transform">
              <SelectInput prop="textTransform" value={s.textTransform} options={["none", "uppercase", "lowercase", "capitalize"]} onChange={onPropertyChange} />
            </Field>
            <Field label="White space">
              <SelectInput prop="whiteSpace" value={s.whiteSpace} options={["normal", "nowrap", "pre", "pre-wrap", "pre-line", "break-spaces"]} onChange={onPropertyChange} />
            </Field>
          </Row>
          {(() => {
            const truncation = detectTruncation(s);
            const ctx = { currentDisplay: s.display };

            const applyChanges = (changes: Record<string, string>) => {
              for (const [prop, value] of Object.entries(changes)) {
                onPropertyChange(prop, value);
              }
            };

            const fixAncestorMinWidth = (enabled: boolean) => {
              if (!onApplyToElement) return;
              let el = element.element?.parentElement;
              while (el && el !== document.body) {
                const parentDisplay = getComputedStyle(el.parentElement || el).display;
                const isGridOrFlexChild = parentDisplay.includes("grid") || parentDisplay.includes("flex");
                if (isGridOrFlexChild) {
                  onApplyToElement(el, "minWidth", enabled ? "0px" : "");
                }
                el = el.parentElement;
              }
            };

            return (
              <>
                <Row>
                  <Field label="Truncate">
                    <SelectInput
                      prop="truncate"
                      value={truncation.enabled ? "ellipsis" : "none"}
                      options={["none", "ellipsis"]}
                      onChange={(_p, val) => {
                        const enabled = val === "ellipsis";
                        const changes = computeTruncationChanges(
                          { enabled, lines: 1 },
                          ctx,
                        );
                        applyChanges(changes);
                        fixAncestorMinWidth(enabled);
                      }}
                    />
                  </Field>
                  {truncation.enabled && (
                    <Field label="Max lines">
                      <NumberInput
                        prop="lineClamp"
                        value={String(truncation.lines)}
                        onChange={(_p, val) => {
                          const n = parseInt(val) || 1;
                          const changes = computeTruncationChanges(
                            { enabled: true, lines: n },
                            ctx,
                          );
                          applyChanges(changes);
                        }}
                        {...changeProps("lineClamp")}
                      />
                    </Field>
                  )}
                </Row>
                <Row>
                  <Field label="Word break">
                    <SelectInput prop="overflowWrap" value={s.overflowWrap} options={["normal", "break-word", "anywhere"]} onChange={onPropertyChange} />
                  </Field>
                  {["UL", "OL", "LI"].includes(element.tagName) && (
                    <Field label="List style">
                      <SegmentedControl
                        options={LIST_STYLE_OPTIONS}
                        value={s.listStyleType || "none"}
                        onChange={(val) => onPropertyChange("listStyleType", val)}
                      />
                    </Field>
                  )}
                </Row>
              </>
            );
          })()}
        </>
      )}
    </Section>
  );
}
