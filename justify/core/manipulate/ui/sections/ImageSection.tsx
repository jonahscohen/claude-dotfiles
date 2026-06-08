/**
 * ImageSection - image/video media controls + background-image settings.
 *
 * Ported from Retune ui/sections/ImageSection.tsx per spec 05 (section 3).
 * React -> Preact. TOKEN/VARIABLE layer DEFERRED (no variableProps spreads).
 *
 * CRITICAL (plan j): media CSS (objectFit/objectPosition, backgroundSize/
 * Position/Repeat) routes through onPropertyChange, but the HTML ATTRIBUTES
 * (loading/alt/autoplay/loop/muted/controls) are written directly on the DOM
 * node AND recorded via onAttributeChange(attr, oldVal, newVal) - a path
 * DISTINCT from CSS. That feeds ChangeTracker.recordAttributeChange and the
 * separate "### Attribute Changes" output table (engine, task #17).
 */

import type { BaseSectionProps } from "./section-props.js";
import { Section, Row, Field } from "../section.js";
import { TextInput } from "../text-input.js";
import { SelectInput } from "../select-input.js";
import { ComboInput } from "../combo-input.js";
import { SegmentedControl } from "../segmented-control.js";

export interface ImageSectionProps extends BaseSectionProps {
  /** Is this an img/picture/canvas element? */
  isImage: boolean;
  /** Is this a video element? */
  isVideo: boolean;
  /** Does the element have a non-gradient background-image? */
  hasBackgroundImage: boolean;
}

export function ImageSection({
  element,
  s,
  onPropertyChange,
  onAttributeChange,
  changeProps,
  isImage,
  isVideo,
  hasBackgroundImage,
}: ImageSectionProps) {
  const isMedia = isImage || isVideo;
  const node = element.element;

  return (
    <>
      {/* Image / Media */}
      {isMedia && (
        <Section label={isVideo ? "Video" : "Image"}>
          <Row>
            <Field label="Fit">
              <SelectInput
                prop="objectFit"
                value={s.objectFit || "fill"}
                options={["fill", "contain", "cover", "none", "scale-down"]}
                onChange={onPropertyChange}
                {...changeProps("objectFit")}
              />
            </Field>
            <Field label="Position">
              <ComboInput
                prop="objectPosition"
                value={s.objectPosition || "50% 50%"}
                options={[
                  { value: "center", label: "Center" },
                  { value: "top", label: "Top" },
                  { value: "bottom", label: "Bottom" },
                  { value: "left", label: "Left" },
                  { value: "right", label: "Right" },
                  { value: "top left", label: "Top Left" },
                  { value: "top right", label: "Top Right" },
                  { value: "bottom left", label: "Bottom Left" },
                  { value: "bottom right", label: "Bottom Right" },
                ]}
                onChange={onPropertyChange}
                {...changeProps("objectPosition")}
              />
            </Field>
          </Row>
          {isImage && node && (
            <Row>
              <Field label="Loading">
                <SegmentedControl
                  options={[{ value: "lazy", label: "Lazy" }, { value: "eager", label: "Eager" }]}
                  value={((node as HTMLImageElement).loading === "lazy") ? "lazy" : "eager"}
                  onChange={(v) => {
                    const oldVal = (node as HTMLImageElement).loading || "eager";
                    (node as HTMLImageElement).loading = v as "lazy" | "eager";
                    onAttributeChange?.("loading", oldVal, v);
                  }}
                />
              </Field>
            </Row>
          )}
          {isImage && node && (
            <Row label="Alt">
              <div className="retune-row">
                <TextInput
                  prop="alt"
                  value={(node as HTMLImageElement).alt || ""}
                  onChange={(prop, value) => {
                    const oldVal = (node as HTMLImageElement).alt || "";
                    (node as HTMLImageElement).alt = value;
                    onAttributeChange?.(prop, oldVal, value);
                  }}
                />
              </div>
            </Row>
          )}
          {isVideo && node && (
            <>
              <Row>
                <Field label="Autoplay">
                  <SegmentedControl
                    options={[{ value: "true", label: "Yes" }, { value: "false", label: "No" }]}
                    value={(node as HTMLVideoElement).autoplay ? "true" : "false"}
                    onChange={(v) => {
                      const oldVal = (node as HTMLVideoElement).autoplay ? "true" : "false";
                      (node as HTMLVideoElement).autoplay = v === "true";
                      onAttributeChange?.("autoplay", oldVal, v === "true" ? "true" : "false");
                    }}
                  />
                </Field>
                <Field label="Loop">
                  <SegmentedControl
                    options={[{ value: "true", label: "Yes" }, { value: "false", label: "No" }]}
                    value={(node as HTMLVideoElement).loop ? "true" : "false"}
                    onChange={(v) => {
                      const oldVal = (node as HTMLVideoElement).loop ? "true" : "false";
                      (node as HTMLVideoElement).loop = v === "true";
                      onAttributeChange?.("loop", oldVal, v === "true" ? "true" : "false");
                    }}
                  />
                </Field>
              </Row>
              <Row>
                <Field label="Muted">
                  <SegmentedControl
                    options={[{ value: "true", label: "Yes" }, { value: "false", label: "No" }]}
                    value={(node as HTMLVideoElement).muted ? "true" : "false"}
                    onChange={(v) => {
                      const oldVal = (node as HTMLVideoElement).muted ? "true" : "false";
                      (node as HTMLVideoElement).muted = v === "true";
                      onAttributeChange?.("muted", oldVal, v === "true" ? "true" : "false");
                    }}
                  />
                </Field>
                <Field label="Controls">
                  <SegmentedControl
                    options={[{ value: "true", label: "Show" }, { value: "false", label: "Hide" }]}
                    value={(node as HTMLVideoElement).controls ? "true" : "false"}
                    onChange={(v) => {
                      const oldVal = (node as HTMLVideoElement).controls ? "true" : "false";
                      (node as HTMLVideoElement).controls = v === "true";
                      onAttributeChange?.("controls", oldVal, v === "true" ? "true" : "false");
                    }}
                  />
                </Field>
              </Row>
            </>
          )}
        </Section>
      )}

      {/* Background Image */}
      {hasBackgroundImage && (
        <Section label="Background Image">
          <Row label="Size">
            <div className="retune-row">
              <ComboInput
                label=""
                prop="backgroundSize"
                value={s.backgroundSize || "auto"}
                options={[
                  { value: "cover", label: "Cover" },
                  { value: "contain", label: "Contain" },
                  { value: "auto", label: "Auto" },
                  { value: "100% 100%", label: "Stretch" },
                ]}
                onChange={onPropertyChange}
                {...changeProps("backgroundSize")}
              />
            </div>
          </Row>
          <Row label="Position">
            <div className="retune-row">
              <SelectInput
                prop="backgroundPosition"
                value={s.backgroundPosition || "center center"}
                options={["center", "top", "bottom", "left", "right", "top left", "top right", "bottom left", "bottom right"]}
                onChange={onPropertyChange}
                {...changeProps("backgroundPosition")}
              />
            </div>
          </Row>
          <Row label="Repeat">
            <div className="retune-row">
              <SelectInput
                prop="backgroundRepeat"
                value={s.backgroundRepeat || "repeat"}
                options={["no-repeat", "repeat", "repeat-x", "repeat-y", "space", "round"]}
                onChange={onPropertyChange}
                {...changeProps("backgroundRepeat")}
              />
            </div>
          </Row>
        </Section>
      )}
    </>
  );
}
