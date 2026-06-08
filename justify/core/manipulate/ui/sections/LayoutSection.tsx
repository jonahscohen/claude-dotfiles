/**
 * LayoutSection - Display mode, flex/grid alignment, gap, and direction controls.
 *
 * Ported 1:1 from Retune ui/sections/LayoutSection.tsx per spec
 * 03-sections-position-layout-spacing-size.md (section 2). Token/variable layer
 * DEFERRED (the gap/columnGap/rowGap variableProps spreads are dropped; their
 * changeProps are kept). Display/flex/grid gating derives from s.display.
 */

import type { BaseSectionProps } from "./section-props";
import { Section, Row, Field } from "../section";
import { NumberInput } from "../number-input";
import { SelectInput } from "../select-input";
import { SegmentedControl, type SegmentedOption } from "../segmented-control";
import { AlignmentGrid } from "../alignment-grid";
import { GridPicker, parseGridCount } from "../grid-picker";
import { Tooltip } from "../tooltip";
import {
  RectangleSmall, AutolayoutAddHorizontal, AutolayoutAddVertical, GridView,
  AlSpacingHorizontal, AlSpacingVertical,
} from "../section-icons";

// Display segmented labels match Retune verbatim: "Flex " + arrow glyphs.
const ARROW_RIGHT = String.fromCharCode(0x2192);
const ARROW_DOWN = String.fromCharCode(0x2193);

const DISPLAY_OPTIONS: SegmentedOption[] = [
  { value: "block", icon: <RectangleSmall />, label: "Block" },
  { value: "flex-row", icon: <AutolayoutAddHorizontal />, label: `Flex ${ARROW_RIGHT}` },
  { value: "flex-column", icon: <AutolayoutAddVertical />, label: `Flex ${ARROW_DOWN}` },
  { value: "grid", icon: <GridView />, label: "Grid" },
];

export type LayoutSectionProps = Pick<
  BaseSectionProps,
  "s" | "onPropertyChange" | "onPropertyHover" | "changeProps"
>;

export function LayoutSection({
  s,
  onPropertyChange,
  onPropertyHover,
  changeProps,
}: LayoutSectionProps) {
  const displayValue = s.display || "block";
  const isFlex = displayValue.includes("flex");
  const isGrid = displayValue.includes("grid");

  return (
    <Section label="Layout">
      <Row>
        <Field label="Display">
          <SegmentedControl
            options={DISPLAY_OPTIONS}
            value={
              displayValue.includes("flex")
                ? (s.flexDirection || "row").startsWith("column") ? "flex-column" : "flex-row"
                : displayValue.includes("grid") ? "grid" : "block"
            }
            onChange={(v) => {
              if (v === "flex-row") {
                onPropertyChange("display", "flex");
                onPropertyChange("flexDirection", "row");
              } else if (v === "flex-column") {
                onPropertyChange("display", "flex");
                onPropertyChange("flexDirection", "column");
              } else {
                onPropertyChange("display", v);
              }
            }}
          />
        </Field>
      </Row>
      {isFlex && (
        <>
          <div className="retune-section-row">
            <div className="retune-row" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <Field label="Alignment">
                  <AlignmentGrid
                    justifyContent={s.justifyContent || "flex-start"}
                    alignItems={s.alignItems || "stretch"}
                    flexDirection={s.flexDirection || "row"}
                    onChange={onPropertyChange}
                  />
                </Field>
              </div>
              <div style={{ flex: 1 }} onPointerEnter={() => onPropertyHover?.("gap")} onPointerLeave={() => onPropertyHover?.(null)}>
                <Field label="Gap">
                  <NumberInput
                    label={<Tooltip content={(s.flexDirection || "row").startsWith("column") ? "Vertical gap between items" : "Horizontal gap between items"} side="top" sideOffset={14}>{(s.flexDirection || "row").startsWith("column") ? <AlSpacingVertical /> : <AlSpacingHorizontal />}</Tooltip>}
                    prop="gap"
                    value={s.gap}
                    onChange={onPropertyChange}
                    min={0}
                    {...changeProps("gap")}
                  />
                </Field>
              </div>
            </div>
          </div>
          <Row>
            <Field label="Reverse">
              <SelectInput
                prop="flexDirection"
                value={(s.flexDirection || "row").includes("reverse") ? "yes" : "no"}
                options={["no", "yes"]}
                onChange={(_, v) => {
                  const base = (s.flexDirection || "row").startsWith("column") ? "column" : "row";
                  onPropertyChange("flexDirection", v === "yes" ? `${base}-reverse` : base);
                }}
              />
            </Field>
            <Field label="Wrap">
              <SelectInput prop="flexWrap" value={s.flexWrap} options={["nowrap", "wrap", "wrap-reverse"]} onChange={onPropertyChange} />
            </Field>
          </Row>
        </>
      )}
      {isGrid && (
        <Row>
          <div style={{ flex: 1 }}>
            <Field label="Grid">
              <GridPicker
                columns={parseGridCount(s.gridTemplateColumns)}
                rows={parseGridCount(s.gridTemplateRows)}
                onChange={onPropertyChange}
              />
            </Field>
          </div>
          <div style={{ flex: 1 }} onPointerEnter={() => onPropertyHover?.("gap")} onPointerLeave={() => onPropertyHover?.(null)}>
            <Field label="Gap">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <NumberInput label={<Tooltip content="Horizontal gap between columns" side="top" sideOffset={14}><AlSpacingHorizontal /></Tooltip>} prop="columnGap" value={s.columnGap} onChange={onPropertyChange} min={0} {...changeProps("columnGap")} />
                <NumberInput label={<Tooltip content="Vertical gap between rows" side="top" sideOffset={14}><AlSpacingVertical /></Tooltip>} prop="rowGap" value={s.rowGap} onChange={onPropertyChange} min={0} {...changeProps("rowGap")} />
              </div>
            </Field>
          </div>
        </Row>
      )}
    </Section>
  );
}
