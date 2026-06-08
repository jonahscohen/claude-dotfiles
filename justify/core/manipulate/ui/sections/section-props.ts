/**
 * Shared section-props contract for the ported Design panel sections.
 *
 * Mirrors Retune's ui/sections/section-props.ts BaseSectionProps, but with the
 * TOKEN/VARIABLE layer DEFERRED for this phase: there is no variableProps()/
 * handleVariableSelect/handleVariableApply here. Sections render only their CSS
 * branches; the variable-applied branch + VariableAction are added in the token
 * phase. changeProps() supplies the per-property {isChanged, onReset} that the
 * controls and ChangeIndicator consume.
 *
 * NOTE (cross-task): this file is the shared base for ALL section builders
 * (Position/Layout/Spacing/Size, Typography/Fill/Border, Shadow/Filters/Image).
 * If another section task already created it, reconcile to a single definition.
 */

/** Minimal selected-element info a section needs. The richer selection model
 *  (scopeLevels, forcedState, full reactComponents) lives in the picker /
 *  Design-entry layer; sections read only what they use. */
export interface SectionElementInfo {
  /** The live DOM node, or null if unavailable. ImageSection reads HTML
   *  attributes (loading/alt/autoplay/loop/muted/controls) off this node. */
  element: HTMLElement | null;
  tagName: string;
  reactComponents?: string[];
}

/** Per-property change state spread onto controls + ChangeIndicator. */
export interface ChangeProps {
  isChanged: boolean;
  onReset: () => void;
}

export interface BaseSectionProps {
  /** Selected element identity + live DOM node. */
  element: SectionElementInfo;
  /** Computed/scoped styles map, camelCase keys (e.g. s.boxShadow, s.objectFit). */
  s: Record<string, string>;
  /** Apply a CSS property change (camelCase property, string value). */
  onPropertyChange: (prop: string, value: string) => void;
  /** Hover a property for on-page highlight (optional). */
  onPropertyHover?: (prop: string | null) => void;
  /** Per-property change state for ChangeIndicator + controls. */
  changeProps: (prop: string) => ChangeProps;
  /**
   * HTML/SVG attribute change path - DISTINCT from CSS onPropertyChange.
   * Used by ImageSection for loading/alt/autoplay/loop/muted/controls.
   * Routes to ChangeTracker.recordAttributeChange -> "### Attribute Changes".
   */
  onAttributeChange?: (attr: string, oldValue: string, newValue: string) => void;
}

/**
 * Shorthand-group change state (one {isChanged, onReset} for a set of props
 * edited together: e.g. padding H/V, margin, border width, corner radius).
 * Additive to BaseSectionProps; sections that use ShorthandInput require it.
 */
export type ShorthandChangeProps = (props: string[]) => ChangeProps;

/**
 * Derived layout context the Position and Size sections need to gate controls
 * (alignment applicability, Fill/Hug validity). Computed by the panel from the
 * selected element's parent. Additive - sections that do not need it omit it.
 */
export interface LayoutContextProps {
  /** Is the selected element a flex child? */
  isFlexChild: boolean;
  /** Is the selected element a grid child? */
  isGridChild: boolean;
  /** Parent's flex-direction ("row" | "column" | "row-reverse" | "column-reverse"). */
  parentFlexDir: string;
}

// ── Scope section (Target rail + forced pseudo-state) ──

/** Forced pseudo-state. Single source: the inspector (drives getPseudoStateStyles). */
export type { ForcedState } from "../../../inspector/styles.js";
import type { ForcedState } from "../../../inspector/styles.js";

/**
 * One level in the Target/scope rail. `selector === null` is the "This element"
 * (instance) level. `count` is how many elements match the selector (>1 shows a
 * count badge). `kind` is advisory ("class" | "ancestor" | "element").
 */
export interface ScopeLevel {
  label: string;
  selector: string | null;
  count: number;
  kind?: string;
}

/**
 * ScopeSection props. The scope rail is navigation/selection state owned by the
 * picker / Design-entry layer; the parent computes `scopeLevels` (via
 * buildScopeLevels) + `activeLevelIndex` and supplies the callbacks. The token/
 * variable layer is not involved here.
 */
export interface ScopeSectionProps {
  /** Selected element identity (tagName + reactComponents drive the section title). */
  element: SectionElementInfo;
  scopeLevels: ScopeLevel[];
  activeLevelIndex: number;
  /** Switch the active scope level (index into scopeLevels). */
  onScopeLevelChange?: (index: number) => void;
  /** Hover a scope level for on-page highlight (index, or null on leave). */
  onScopeLevelHover?: (index: number | null) => void;
  /** Current forced pseudo-state, or null for none. */
  forcedState?: ForcedState;
  /** Change the forced pseudo-state. */
  onForcedStateChange?: (state: ForcedState | null) => void;
}
