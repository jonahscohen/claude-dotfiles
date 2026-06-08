/**
 * FillSection - Appearance, SVG Fill/Stroke, and CSS Fill (background color/gradient).
 *
 * Ported from Retune overlay/src/ui/sections/FillSection.tsx.
 *
 * Three sub-sections:
 * 1. Appearance - Opacity, Z index, corner radius (collapsed shorthand or expanded
 *    4-corner), overflow. Hidden for SVG child shapes.
 * 2. SVG Fill & Stroke - simple color controls for SVG child shapes.
 * 3. Fill - background color/gradient for non-image, non-SVG elements (solid via
 *    ColorInput or gradient via a fill-mode SelectInput + GradientEditor).
 *
 * DEVIATION (Phase 5 scope): the token/variable layer is DEFERRED - variableProps,
 * shorthandVariableProps, handleVariableSelect/Apply, getVariableMatch, the Fill
 * header VariableAction, and onVariableAssociate are removed; the section renders
 * only its CSS branches per the shared trimmed BaseSectionProps contract. Corner
 * radius prop order is TL,TR,BR,BL (plan l). gradientToCss is the EXACT emitted
 * backgroundImage string.
 */

import { useState, useCallback, useRef } from "react";
import type { BaseSectionProps, ChangeProps } from "./section-props";
import { Section, Row, Field } from "../section";
import { NumberInput } from "../number-input";
import { ColorInput } from "../color-input";
import { SelectInput } from "../select-input";
import { ShorthandInput } from "../shorthand-input";
import { GradientEditor } from "../gradient-editor";
import { Tooltip } from "../tooltip";
import {
  type FillMode, type GradientFill,
  detectFillMode, defaultGradient, parseCssGradient, gradientToCss,
} from "../gradient-utils";
import {
  RadiusTopLeft, RadiusTopRight, RadiusBottomLeft, RadiusBottomRight,
  AlPaddingSides, Plus, Minus,
} from "../icons";

export interface FillSectionProps extends BaseSectionProps {
  /** Whether the element is an SVG child shape (path, rect, circle, etc.) */
  isSvgChild: boolean;
  /** Whether the element is an image or video */
  isMedia: boolean;
}

export function FillSection({
  s,
  onPropertyChange,
  changeProps,
  isSvgChild,
  isMedia,
}: FillSectionProps) {
  // Derive shorthand change state from per-property changeProps (no
  // shorthandChangeProps in the trimmed contract): changed if any corner changed;
  // reset resets all corners.
  const shorthandChangeProps = useCallback((props: string[]): ChangeProps => ({
    isChanged: props.some((p) => changeProps(p).isChanged),
    onReset: () => props.forEach((p) => changeProps(p).onReset()),
  }), [changeProps]);

  // -- Corner radius expand/collapse --
  const [radiusExpanded, setRadiusExpanded] = useState(false);

  // -- Fill mode (solid vs gradient) --
  const detectedFillMode = detectFillMode(s.backgroundColor, s.backgroundImage);
  const [fillMode, setFillMode] = useState<FillMode>(detectedFillMode);
  // Capture the ORIGINAL fill mode and gradient at mount time (for change tracking)
  const [initialFillMode] = useState<FillMode>(detectedFillMode);
  const [initialGradient] = useState<GradientFill | null>(() => {
    if (s.backgroundImage && s.backgroundImage !== "none") {
      return parseCssGradient(s.backgroundImage) ?? null;
    }
    return null;
  });
  const [gradient, setGradient] = useState<GradientFill>(() => {
    if (s.backgroundImage && s.backgroundImage !== "none") {
      const parsed = parseCssGradient(s.backgroundImage);
      if (parsed) return parsed;
    }
    return defaultGradient();
  });
  // Skip gradient sync when we're the source of the change (e.g. during stop drag)
  const gradientEditingRef = useRef(false);

  // Sync fill mode from element changes
  const [prevBgImage, setPrevBgImage] = useState(s.backgroundImage);
  if (s.backgroundImage !== prevBgImage) {
    setPrevBgImage(s.backgroundImage);
    if (!gradientEditingRef.current) {
      const newMode = detectFillMode(s.backgroundColor, s.backgroundImage);
      setFillMode(newMode);
      if (newMode !== "solid") {
        const parsed = parseCssGradient(s.backgroundImage || "");
        if (parsed) setGradient(parsed);
      }
    }
    gradientEditingRef.current = false;
  }

  // -- Fill (null-or-active) --
  const hasFill = (() => {
    const bg = s.backgroundColor;
    const bgImg = s.backgroundImage;
    if (bgImg && bgImg !== "none") return true;
    if (!bg || bg === "transparent" || bg === "rgba(0, 0, 0, 0)") return false;
    return true;
  })();

  const handleAddFill = useCallback(() => {
    onPropertyChange("backgroundColor", "#ffffff");
  }, [onPropertyChange]);

  const handleRemoveFill = useCallback(() => {
    onPropertyChange("backgroundColor", "transparent");
    onPropertyChange("backgroundImage", "none");
    setFillMode("solid");
  }, [onPropertyChange]);

  const handleFillModeChange = useCallback((_prop: string, value: string) => {
    const mode = value as FillMode;
    setFillMode(mode);
    if (mode === "solid") {
      onPropertyChange("backgroundImage", "none");
      onPropertyChange("backgroundColor", "#ffffff");
    } else {
      const newGradient = { ...gradient, type: mode as GradientFill["type"] };
      setGradient(newGradient);
      onPropertyChange("backgroundImage", gradientToCss(newGradient));
      onPropertyChange("backgroundColor", "transparent");
    }
  }, [gradient, onPropertyChange]);

  const handleGradientChange = useCallback((newGradient: GradientFill) => {
    gradientEditingRef.current = true;
    setGradient(newGradient);
    onPropertyChange("backgroundImage", gradientToCss(newGradient));
  }, [onPropertyChange]);

  const radiusProps = ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"];

  return (
    <>
      {/* Appearance (hidden for SVG child shapes) */}
      {!isSvgChild && (
        <Section label="Appearance">
          <Row>
            <Field label="Opacity">
              <NumberInput prop="opacity" value={s.opacity} onChange={onPropertyChange} min={0} max={1} step={0.01} {...changeProps("opacity")} />
            </Field>
            <Field label="Z index">
              <NumberInput prop="zIndex" value={s.zIndex} onChange={onPropertyChange} {...changeProps("zIndex")} />
            </Field>
          </Row>
          <Row label="Corner radius">
            {radiusExpanded ? (
              <>
                <div className="retune-row">
                  <NumberInput label={<Tooltip content="Top left corner radius" side="top" sideOffset={14}><RadiusTopLeft /></Tooltip>} prop="borderTopLeftRadius" value={s.borderTopLeftRadius} onChange={onPropertyChange} min={0} {...changeProps("borderTopLeftRadius")} />
                  <NumberInput label={<Tooltip content="Top right corner radius" side="top" sideOffset={14}><RadiusTopRight /></Tooltip>} prop="borderTopRightRadius" value={s.borderTopRightRadius} onChange={onPropertyChange} min={0} {...changeProps("borderTopRightRadius")} />
                  <Tooltip content="Collapse to single" side="top">
                    <button className="retune-split-btn active" onClick={() => setRadiusExpanded(false)}>
                      <AlPaddingSides />
                    </button>
                  </Tooltip>
                </div>
                <div className="retune-row">
                  <NumberInput label={<Tooltip content="Bottom left corner radius" side="top" sideOffset={14}><RadiusBottomLeft /></Tooltip>} prop="borderBottomLeftRadius" value={s.borderBottomLeftRadius} onChange={onPropertyChange} min={0} {...changeProps("borderBottomLeftRadius")} />
                  <NumberInput label={<Tooltip content="Bottom right corner radius" side="top" sideOffset={14}><RadiusBottomRight /></Tooltip>} prop="borderBottomRightRadius" value={s.borderBottomRightRadius} onChange={onPropertyChange} min={0} {...changeProps("borderBottomRightRadius")} />
                  <div style={{ width: 32 }} />
                </div>
              </>
            ) : (
              <div className="retune-row">
                <ShorthandInput
                  label={<Tooltip content="Corner radius (TL, TR, BR, BL)" side="top" sideOffset={14}><RadiusTopLeft /></Tooltip>}
                  props={radiusProps}
                  values={[s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius]}
                  onChange={onPropertyChange}
                  min={0}
                  {...shorthandChangeProps(radiusProps)}
                />
                <Tooltip content="Edit individual corners" side="top">
                  <button className="retune-split-btn" onClick={() => setRadiusExpanded(true)}>
                    <AlPaddingSides />
                  </button>
                </Tooltip>
              </div>
            )}
          </Row>
          <Row>
            <Field label="Overflow">
              <SelectInput prop="overflow" value={s.overflow} options={["visible", "hidden", "auto", "scroll"]} onChange={onPropertyChange} />
            </Field>
          </Row>
        </Section>
      )}

      {/* SVG Fill - always visible for SVG child shapes */}
      {isSvgChild && (() => {
        const hasSvgFill = s.fill && s.fill !== "none" && s.fill !== "transparent";
        return (
          <Section label="Fill" action={
            hasSvgFill ? (
              <Tooltip content="Remove fill" side="top"><button className="retune-section-action" onClick={() => onPropertyChange("fill", "none")}><Minus /></button></Tooltip>
            ) : (
              <Tooltip content="Add fill" side="top"><button className="retune-section-action" onClick={() => onPropertyChange("fill", "#000000")}><Plus /></button></Tooltip>
            )
          }>
            {hasSvgFill && (
              <Row label="Color">
                <div className="retune-row">
                  <ColorInput prop="fill" value={s.fill} onChange={onPropertyChange} {...changeProps("fill")} />
                </div>
              </Row>
            )}
          </Section>
        );
      })()}

      {/* SVG Stroke - always visible for SVG child shapes */}
      {isSvgChild && (() => {
        const hasStrokeColor = s.stroke && s.stroke !== "none" && s.stroke !== "transparent";
        return (
          <Section label="Stroke" action={
            hasStrokeColor ? (
              <Tooltip content="Remove stroke" side="top"><button className="retune-section-action" onClick={() => { onPropertyChange("stroke", "none"); }}><Minus /></button></Tooltip>
            ) : null
          }>
            <Row label="Color">
              <div className="retune-row">
                <ColorInput prop="stroke" value={hasStrokeColor ? s.stroke : "transparent"} onChange={(prop, val) => {
                  onPropertyChange(prop, val);
                  if (!s.strokeWidth || s.strokeWidth === "0") onPropertyChange("strokeWidth", "1");
                }} {...changeProps("stroke")} />
              </div>
            </Row>
            <Row label="Width">
              <div className="retune-row">
                <NumberInput label="" prop="strokeWidth" value={s.strokeWidth || "0"} onChange={onPropertyChange} min={0} step={0.5} {...changeProps("strokeWidth")} />
              </div>
            </Row>
          </Section>
        );
      })()}

      {/* Fill (hidden for images/videos and SVG child shapes) */}
      {!isMedia && !isSvgChild && (
        <Section
          label="Fill"
          gap={8}
          action={
            <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
              {hasFill ? (
                <Tooltip content="Remove fill" side="top"><button className="retune-section-action" onClick={handleRemoveFill}><Minus /></button></Tooltip>
              ) : (
                <Tooltip content="Add fill" side="top"><button className="retune-section-action" onClick={handleAddFill}><Plus /></button></Tooltip>
              )}
            </div>
          }
        >
          {hasFill ? (
            <>
              <Row>
                <SelectInput
                  prop="fillMode"
                  value={fillMode === "solid" ? "solid" : gradient.type}
                  options={["solid", "linear", "radial", "conic"]}
                  onChange={handleFillModeChange}
                  isChanged={changeProps("backgroundImage").isChanged}
                  onReset={() => { changeProps("backgroundImage").onReset(); changeProps("backgroundColor").onReset(); }}
                />
              </Row>
              {fillMode === "solid" ? (
                <Row>
                  <ColorInput prop="backgroundColor" value={s.backgroundColor} onChange={onPropertyChange} {...changeProps("backgroundColor")} />
                </Row>
              ) : (
                <GradientEditor
                  gradient={gradient}
                  onChange={handleGradientChange}
                  originalGradient={initialGradient ?? undefined}
                  isNewGradient={initialFillMode === "solid"}
                />
              )}
            </>
          ) : null}
        </Section>
      )}
    </>
  );
}
