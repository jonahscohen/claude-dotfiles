/**
 * ShadowSection - box-shadow controls: color, X/Y offset, blur, spread, inset toggle.
 *
 * Ported from Retune ui/sections/ShadowSection.tsx per spec 05 (section 1).
 * React -> Preact. TOKEN/VARIABLE layer DEFERRED: the variable-applied branch
 * (1.A) and VariableAction are omitted this phase; only Add/Remove + the
 * editable branch (1.B) render.
 *
 * SINGLE LAYER ONLY (plan k): parseBoxShadow/shadowToCss operate on the first
 * box-shadow layer. Multi-layer shadows are flattened to layer 0 on any edit.
 *
 * Imports shadow-utils from core/manipulate/ui/shadow-utils (ported task #19).
 * ColorInput is owned by the color/gradient phase (task #26); imported from
 * '../color-input.js'.
 */

import { useCallback } from "preact/hooks";
import type { BaseSectionProps } from "./section-props.js";
import type { ShadowValue } from "../shadow-utils.js";
import { parseBoxShadow, shadowToCss, defaultShadow } from "../shadow-utils.js";
import { Section, Row, Field } from "../section.js";
import { NumberInput } from "../number-input.js";
import { ColorInput } from "../color-input.js";
import { SelectInput } from "../select-input.js";
import { Tooltip } from "../tooltip.js";
import { Plus, Minus } from "../icons.js";

export interface ShadowSectionProps extends BaseSectionProps {}

export function ShadowSection({ s, onPropertyChange, changeProps }: ShadowSectionProps) {
  const hasShadow = !!s.boxShadow && s.boxShadow !== "none";

  const handleAddShadow = useCallback(() => {
    onPropertyChange("boxShadow", shadowToCss(defaultShadow()));
  }, [onPropertyChange]);

  const handleRemoveShadow = useCallback(() => {
    onPropertyChange("boxShadow", "none");
  }, [onPropertyChange]);

  const handleShadowFieldChange = useCallback(
    (field: keyof ShadowValue, value: string | number | boolean) => {
      const parsed = parseBoxShadow(s.boxShadow) || defaultShadow();
      const updated = { ...parsed, [field]: value };
      onPropertyChange("boxShadow", shadowToCss(updated));
    },
    [s.boxShadow, onPropertyChange],
  );

  return (
    <Section
      label="Shadow"
      action={
        <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
          {hasShadow ? (
            <Tooltip content="Remove shadow" side="top">
              <button className="retune-section-action" onClick={handleRemoveShadow}><Minus /></button>
            </Tooltip>
          ) : (
            <Tooltip content="Add shadow" side="top">
              <button className="retune-section-action" onClick={handleAddShadow}><Plus /></button>
            </Tooltip>
          )}
        </div>
      }
    >
      {hasShadow ? (() => {
        const shadow = parseBoxShadow(s.boxShadow);
        if (!shadow) return null;
        return (
          <>
            <Row>
              <Field label="Color">
                <ColorInput
                  prop="shadowColor"
                  value={shadow.color}
                  onChange={(_p: string, val: string) => handleShadowFieldChange("color", val)}
                  {...changeProps("shadowColor")}
                />
              </Field>
            </Row>
            <Row>
              <Field label="X offset">
                <NumberInput
                  prop="shadowOffsetX"
                  value={`${shadow.offsetX}px`}
                  onChange={(_p, val) => handleShadowFieldChange("offsetX", parseFloat(val) || 0)}
                  {...changeProps("shadowOffsetX")}
                />
              </Field>
              <Field label="Y offset">
                <NumberInput
                  prop="shadowOffsetY"
                  value={`${shadow.offsetY}px`}
                  onChange={(_p, val) => handleShadowFieldChange("offsetY", parseFloat(val) || 0)}
                  {...changeProps("shadowOffsetY")}
                />
              </Field>
            </Row>
            <Row>
              <Field label="Blur">
                <NumberInput
                  prop="shadowBlur"
                  value={`${shadow.blur}px`}
                  onChange={(_p, val) => handleShadowFieldChange("blur", Math.max(0, parseFloat(val) || 0))}
                  min={0}
                  {...changeProps("shadowBlur")}
                />
              </Field>
              <Field label="Spread">
                <NumberInput
                  prop="shadowSpread"
                  value={`${shadow.spread}px`}
                  onChange={(_p, val) => handleShadowFieldChange("spread", parseFloat(val) || 0)}
                  {...changeProps("shadowSpread")}
                />
              </Field>
            </Row>
            <Row>
              <Field label="Type">
                <SelectInput
                  prop="shadowInset"
                  value={shadow.inset ? "inside" : "outside"}
                  options={["outside", "inside"]}
                  onChange={(_p, val) => handleShadowFieldChange("inset", val === "inside")}
                />
              </Field>
            </Row>
          </>
        );
      })() : null}
    </Section>
  );
}
