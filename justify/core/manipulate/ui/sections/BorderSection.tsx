/**
 * BorderSection - add/remove, color, collapsed/expanded width, style.
 *
 * Ported near-verbatim from Retune ui/sections/BorderSection.tsx per spec 04.
 * Section always renders; body only when hasBorder.
 *
 * TRIMMED PROP SET (plan decision g): like Retune, BorderSection receives only
 * s / onPropertyChange / changeProps / shorthandChangeProps - NOT the full
 * BaseSectionProps (no element, no onPropertyHover). Replicated exactly.
 *
 * DEVIATION (this phase): token/variable layer deferred, so the
 * `{...variableProps(...)}` / `{...shorthandVariableProps(...)}` spreads are
 * dropped; the change-indicator spreads are preserved. ColorInput is imported
 * from its canonical path (built by the color/gradient task #26).
 */

import { useState, useCallback } from "react";
import { Section, Row, Field } from "../section.js";
import { NumberInput } from "../number-input.js";
import { ColorInput } from "../color-input.js";
import { SelectInput } from "../select-input.js";
import { ShorthandInput } from "../shorthand-input.js";
import { Tooltip } from "../tooltip.js";
import { AlPaddingSides, Plus, Minus } from "../section-icons.js";
import type { BaseSectionProps, ShorthandChangeProps } from "./section-props.js";

export interface BorderSectionProps extends Pick<
  BaseSectionProps,
  "s" | "onPropertyChange" | "changeProps"
> {
  shorthandChangeProps: ShorthandChangeProps;
}

export function BorderSection({
  s,
  onPropertyChange,
  changeProps,
  shorthandChangeProps,
}: BorderSectionProps) {
  // ── Border state ──
  const borderSides = [
    { width: s.borderTopWidth, style: s.borderTopStyle },
    { width: s.borderRightWidth, style: s.borderRightStyle },
    { width: s.borderBottomWidth, style: s.borderBottomStyle },
    { width: s.borderLeftWidth, style: s.borderLeftStyle },
  ];
  const hasBorder = borderSides.some((side) => side.style !== "none" && parseFloat(side.width) > 0);
  const borderColors = [s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor];
  const activeBorderColor = borderSides.reduce<string | null>((found, side, i) => {
    if (found) return found;
    return (side.style !== "none" && parseFloat(side.width) > 0) ? borderColors[i] : null;
  }, null) || s.borderTopColor;

  const [borderExpanded, setBorderExpanded] = useState(false);

  const handleAddBorder = useCallback(() => {
    onPropertyChange("borderWidth", "1px");
    onPropertyChange("borderStyle", "solid");
    onPropertyChange("borderColor", "#000000");
  }, [onPropertyChange]);

  const handleRemoveBorder = useCallback(() => {
    onPropertyChange("borderTopWidth", "0px");
    onPropertyChange("borderRightWidth", "0px");
    onPropertyChange("borderBottomWidth", "0px");
    onPropertyChange("borderLeftWidth", "0px");
    onPropertyChange("borderTopStyle", "none");
    onPropertyChange("borderRightStyle", "none");
    onPropertyChange("borderBottomStyle", "none");
    onPropertyChange("borderLeftStyle", "none");
  }, [onPropertyChange]);

  return (
    <Section
      label="Border"
      action={
        hasBorder ? (
          <Tooltip content="Remove border" side="top"><button className="retune-section-action" onClick={handleRemoveBorder}><Minus /></button></Tooltip>
        ) : (
          <Tooltip content="Add border" side="top"><button className="retune-section-action" onClick={handleAddBorder}><Plus /></button></Tooltip>
        )
      }
    >
      {hasBorder && (
        <>
          <Row>
            <Field label="Color">
              <ColorInput prop="borderColor" value={activeBorderColor} onChange={onPropertyChange} {...changeProps("borderColor")} />
            </Field>
          </Row>
          {borderExpanded ? (
            <>
              <div className="retune-section-row">
                <div className="retune-row">
                  <Field label="Top">
                    <NumberInput prop="borderTopWidth" value={s.borderTopWidth} onChange={(p, v) => {
                      onPropertyChange(p, v);
                      if (parseFloat(v) > 0 && s.borderTopStyle === "none") onPropertyChange("borderTopStyle", "solid");
                    }} min={0} {...changeProps("borderTopWidth")} />
                  </Field>
                  <Field label="Right">
                    <NumberInput prop="borderRightWidth" value={s.borderRightWidth} onChange={(p, v) => {
                      onPropertyChange(p, v);
                      if (parseFloat(v) > 0 && s.borderRightStyle === "none") onPropertyChange("borderRightStyle", "solid");
                    }} min={0} {...changeProps("borderRightWidth")} />
                  </Field>
                  <Tooltip content="Collapse to shorthand" side="top">
                    <button className="retune-split-btn active" onClick={() => setBorderExpanded(false)}>
                      <AlPaddingSides />
                    </button>
                  </Tooltip>
                </div>
              </div>
              <div className="retune-section-row">
                <div className="retune-row">
                  <Field label="Bottom">
                    <NumberInput prop="borderBottomWidth" value={s.borderBottomWidth} onChange={(p, v) => {
                      onPropertyChange(p, v);
                      if (parseFloat(v) > 0 && s.borderBottomStyle === "none") onPropertyChange("borderBottomStyle", "solid");
                    }} min={0} {...changeProps("borderBottomWidth")} />
                  </Field>
                  <Field label="Left">
                    <NumberInput prop="borderLeftWidth" value={s.borderLeftWidth} onChange={(p, v) => {
                      onPropertyChange(p, v);
                      if (parseFloat(v) > 0 && s.borderLeftStyle === "none") onPropertyChange("borderLeftStyle", "solid");
                    }} min={0} {...changeProps("borderLeftWidth")} />
                  </Field>
                </div>
              </div>
            </>
          ) : (
            <Row label="Width">
              <div className="retune-row">
                <ShorthandInput
                  props={["borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"]}
                  values={[s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth]}
                  onChange={onPropertyChange}
                  min={0}
                  {...shorthandChangeProps(["borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"])}
                />
                <Tooltip content="Edit individual sides" side="top">
                  <button className="retune-split-btn" onClick={() => setBorderExpanded(true)}>
                    <AlPaddingSides />
                  </button>
                </Tooltip>
              </div>
            </Row>
          )}
          <Row>
            <Field label="Style">
              <SelectInput prop="borderStyle" value={s.borderTopStyle !== "none" ? s.borderTopStyle : s.borderRightStyle !== "none" ? s.borderRightStyle : s.borderBottomStyle !== "none" ? s.borderBottomStyle : s.borderLeftStyle} options={["solid", "dashed", "dotted", "double", "groove", "ridge"]} onChange={onPropertyChange} />
            </Field>
          </Row>
        </>
      )}
    </Section>
  );
}
