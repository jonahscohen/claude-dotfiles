/**
 * SpacingSection - Padding and Margin controls with expand/collapse toggle.
 *
 * Ported 1:1 from Retune ui/sections/SpacingSection.tsx per spec
 * 03-sections-position-layout-spacing-size.md (section 3). Both padding and
 * margin support a collapsed 2-axis mode (horizontal/vertical) and an expanded
 * 4-sides mode. TRIMMED prop set per plan (g): the variableProps /
 * shorthandVariableProps token spreads are DROPPED; changeProps +
 * shorthandChangeProps are kept. Padding inputs clamp min=0; margins do not.
 */

import { useState } from "preact/hooks";
import type { BaseSectionProps, ShorthandChangeProps } from "./section-props";
import { Section, Row } from "../section";
import { NumberInput } from "../number-input";
import { ShorthandInput } from "../shorthand-input";
import { Tooltip } from "../tooltip";
import {
  AlPaddingTop, AlPaddingBottom, AlPaddingLeft, AlPaddingRight,
  AlPaddingHorizontal, AlPaddingVertical, AlPaddingSides,
} from "../section-icons";

export type SpacingSectionProps = Pick<
  BaseSectionProps,
  "s" | "onPropertyChange" | "onPropertyHover" | "changeProps"
> & {
  shorthandChangeProps: ShorthandChangeProps;
};

export function SpacingSection({
  s,
  onPropertyChange,
  onPropertyHover,
  changeProps,
  shorthandChangeProps,
}: SpacingSectionProps) {
  const [paddingExpanded, setPaddingExpanded] = useState(false);
  const [marginExpanded, setMarginExpanded] = useState(false);

  return (
    <Section label="Spacing">
      <Row label="Padding">
        {paddingExpanded ? (
          <>
            <div className="retune-row">
              <div onPointerEnter={() => onPropertyHover?.("paddingLeft")} onPointerLeave={() => onPropertyHover?.(null)} style={{ flex: 1 }}>
                <NumberInput label={<Tooltip content="Padding left" side="top" sideOffset={14}><AlPaddingLeft /></Tooltip>} prop="paddingLeft" value={s.paddingLeft} onChange={onPropertyChange} min={0} {...changeProps("paddingLeft")} />
              </div>
              <div onPointerEnter={() => onPropertyHover?.("paddingTop")} onPointerLeave={() => onPropertyHover?.(null)} style={{ flex: 1 }}>
                <NumberInput label={<Tooltip content="Padding top" side="top" sideOffset={14}><AlPaddingTop /></Tooltip>} prop="paddingTop" value={s.paddingTop} onChange={onPropertyChange} min={0} {...changeProps("paddingTop")} />
              </div>
              <Tooltip content="Collapse to axes" side="top">
                <button className="retune-split-btn active" onClick={() => setPaddingExpanded(false)}>
                  <AlPaddingSides />
                </button>
              </Tooltip>
            </div>
            <div className="retune-row">
              <div onPointerEnter={() => onPropertyHover?.("paddingRight")} onPointerLeave={() => onPropertyHover?.(null)} style={{ flex: 1 }}>
                <NumberInput label={<Tooltip content="Padding right" side="top" sideOffset={14}><AlPaddingRight /></Tooltip>} prop="paddingRight" value={s.paddingRight} onChange={onPropertyChange} min={0} {...changeProps("paddingRight")} />
              </div>
              <div onPointerEnter={() => onPropertyHover?.("paddingBottom")} onPointerLeave={() => onPropertyHover?.(null)} style={{ flex: 1 }}>
                <NumberInput label={<Tooltip content="Padding bottom" side="top" sideOffset={14}><AlPaddingBottom /></Tooltip>} prop="paddingBottom" value={s.paddingBottom} onChange={onPropertyChange} min={0} {...changeProps("paddingBottom")} />
              </div>
              <div style={{ width: 32 }} />
            </div>
          </>
        ) : (
          <div className="retune-row">
            <div style={{ flex: 1 }} onPointerEnter={() => onPropertyHover?.("paddingInline")} onPointerLeave={() => onPropertyHover?.(null)}>
              <ShorthandInput
                label={<Tooltip content="Horizontal padding (left, right)" side="top" sideOffset={14}><AlPaddingHorizontal /></Tooltip>}
                props={["paddingLeft", "paddingRight"]}
                values={[s.paddingLeft, s.paddingRight]}
                onChange={onPropertyChange}
                min={0}
                {...shorthandChangeProps(["paddingLeft", "paddingRight"])}
              />
            </div>
            <div style={{ flex: 1 }} onPointerEnter={() => onPropertyHover?.("paddingBlock")} onPointerLeave={() => onPropertyHover?.(null)}>
              <ShorthandInput
                label={<Tooltip content="Vertical padding (top, bottom)" side="top" sideOffset={14}><AlPaddingVertical /></Tooltip>}
                props={["paddingTop", "paddingBottom"]}
                values={[s.paddingTop, s.paddingBottom]}
                onChange={onPropertyChange}
                min={0}
                {...shorthandChangeProps(["paddingTop", "paddingBottom"])}
              />
            </div>
            <Tooltip content="Edit individual sides" side="top">
              <button className="retune-split-btn" onClick={() => setPaddingExpanded(true)}>
                <AlPaddingSides />
              </button>
            </Tooltip>
          </div>
        )}
      </Row>
      <Row label="Margin">
        {marginExpanded ? (
          <>
            <div className="retune-row">
              <div onPointerEnter={() => onPropertyHover?.("marginLeft")} onPointerLeave={() => onPropertyHover?.(null)} style={{ flex: 1 }}>
                <NumberInput label={<Tooltip content="Margin left" side="top" sideOffset={14}><AlPaddingLeft /></Tooltip>} prop="marginLeft" value={s.marginLeft} onChange={onPropertyChange} {...changeProps("marginLeft")} />
              </div>
              <div onPointerEnter={() => onPropertyHover?.("marginTop")} onPointerLeave={() => onPropertyHover?.(null)} style={{ flex: 1 }}>
                <NumberInput label={<Tooltip content="Margin top" side="top" sideOffset={14}><AlPaddingTop /></Tooltip>} prop="marginTop" value={s.marginTop} onChange={onPropertyChange} {...changeProps("marginTop")} />
              </div>
              <Tooltip content="Collapse to axes" side="top">
                <button className="retune-split-btn active" onClick={() => setMarginExpanded(false)}>
                  <AlPaddingSides />
                </button>
              </Tooltip>
            </div>
            <div className="retune-row">
              <div onPointerEnter={() => onPropertyHover?.("marginRight")} onPointerLeave={() => onPropertyHover?.(null)} style={{ flex: 1 }}>
                <NumberInput label={<Tooltip content="Margin right" side="top" sideOffset={14}><AlPaddingRight /></Tooltip>} prop="marginRight" value={s.marginRight} onChange={onPropertyChange} {...changeProps("marginRight")} />
              </div>
              <div onPointerEnter={() => onPropertyHover?.("marginBottom")} onPointerLeave={() => onPropertyHover?.(null)} style={{ flex: 1 }}>
                <NumberInput label={<Tooltip content="Margin bottom" side="top" sideOffset={14}><AlPaddingBottom /></Tooltip>} prop="marginBottom" value={s.marginBottom} onChange={onPropertyChange} {...changeProps("marginBottom")} />
              </div>
              <div style={{ width: 32 }} />
            </div>
          </>
        ) : (
          <div className="retune-row">
            <div style={{ flex: 1 }} onPointerEnter={() => onPropertyHover?.("marginInline")} onPointerLeave={() => onPropertyHover?.(null)}>
              <ShorthandInput
                label={<Tooltip content="Horizontal margin (left, right)" side="top" sideOffset={14}><AlPaddingHorizontal /></Tooltip>}
                props={["marginLeft", "marginRight"]}
                values={[s.marginLeft, s.marginRight]}
                onChange={onPropertyChange}
                {...shorthandChangeProps(["marginLeft", "marginRight"])}
              />
            </div>
            <div style={{ flex: 1 }} onPointerEnter={() => onPropertyHover?.("marginBlock")} onPointerLeave={() => onPropertyHover?.(null)}>
              <ShorthandInput
                label={<Tooltip content="Vertical margin (top, bottom)" side="top" sideOffset={14}><AlPaddingVertical /></Tooltip>}
                props={["marginTop", "marginBottom"]}
                values={[s.marginTop, s.marginBottom]}
                onChange={onPropertyChange}
                {...shorthandChangeProps(["marginTop", "marginBottom"])}
              />
            </div>
            <Tooltip content="Edit individual sides" side="top">
              <button className="retune-split-btn" onClick={() => setMarginExpanded(true)}>
                <AlPaddingSides />
              </button>
            </Tooltip>
          </div>
        )}
      </Row>
    </Section>
  );
}
