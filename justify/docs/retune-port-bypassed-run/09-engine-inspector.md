# 09 - Engine & Inspector (Data Pipeline)

Area: **engine-inspector** - the non-visual data pipeline behind Retune's Design panel. This is how Retune (1) reads computed styles off a DOM element, (2) resolves authored/scoped values for display, (3) applies live preview to the page DOM, (4) tracks before/after changes with undo/redo, and (5) emits source-edit output for an AI agent. There is no JSX/CSS in these files - this spec captures the data model, algorithms, and exact constants so the pipeline can be reproduced 1:1.

> Note on glyphs: Retune's `output.ts` uses the em-dash glyph (U+2014) and the right-arrow glyph (U+2192) in several emitted strings and the multiplication sign (U+00D7) for dimensions. This spec is constrained to ASCII, so those glyphs are written here as `-` (hyphen), `->`, and `x`. When porting the OUTPUT strings, restore the original Unicode glyphs to match byte-for-byte; their exact code points are called out inline below.

Source files covered (all under `packages/overlay/src/`):

- `inspector/styles.ts` - computed-style extraction, shorthand expansion, scoped/pseudo style reads, layout-mode detection.
- `inspector/style-source.ts` - cascade origin resolver (which rule/sheet set a value).
- `engine/live-preview.ts` - `LivePreviewEngine` (Constructable Stylesheets).
- `engine/change-tracker.ts` - `ChangeTracker` (snapshot diff + undo/redo + variable links + breakpoints + persistence).
- `engine/output.ts` - markdown output formatter for the agent.
- `engine/candidates.ts` - token/class/variable candidate enrichment.

The canonical change unit is **`{selector, property, oldValue, newValue}`**, expressed in code as `PropertyChange { property, from, to, breakpoint? }` grouped under `ElementChange { selector, ... changes: PropertyChange[] }`.

---

## 0. The change data model (from `types.ts`)

These shapes are referenced by every file in this area. Defined in `packages/overlay/src/types.ts` (lines 64-148), reproduced verbatim:

```ts
export interface PropertyChange {
  property: string;          // camelCase, e.g. "paddingTop", or kebab "class:..."/"__text"
  from: string;              // oldValue
  to: string;                // newValue
  /** null/undefined = base (widest breakpoint), "768px" = @media (max-width: 768px) override */
  breakpoint?: string | null;
}

export interface PropertyCandidate {
  type: "semantic-token" | "utility-class" | "css-variable";
  name: string;              // class name or "var(--name)"
  value: string;             // resolved CSS value
  exact: boolean;            // exactly matches user's new value
  distance?: string;         // fuzzy: "nearest: 1rem vs 1.1rem"
}

export interface EnrichedPropertyChange extends PropertyChange {
  recommended?: PropertyCandidate;
  alternatives: PropertyCandidate[];   // max 3, same category
  cssVariables: string[];              // matching --custom-property names
  source?: {
    selector: string;
    origin: "inline" | "stylesheet" | "user-agent";
    stylesheet?: string;
    important: boolean;
    mediaQuery?: string;
  };
  conflicts?: Array<{ selector: string; value: string; important: boolean }>;
}

export interface ElementChange {
  selector: string;
  tagName: string;
  textContent: string | null;
  classes: string[];
  reactComponents: string[];
  changes: PropertyChange[];
  timestamp: number;
  sourceFile?: { fileName: string; lineNumber: number; columnNumber?: number } | null;
  stylingApproach?: string;
  inlineStyles?: string | null;
  elementId?: string | null;
  accessibleName?: string | null;
  parentContext?: string | null;
  childSummary?: string | null;
  domPath?: string;
  nearbySiblings?: string | null;
  position?: { x: number; y: number; width: number; height: number };
  variableAssociations?: Record<string, { className: string; values: Record<string, string> }>;
  unlinkedProperties?: Array<{ property: string; value: string }>;
  propChanges?: Array<{ prop: string; from: unknown; to: unknown }>;
  attributeChanges?: Array<{ attr: string; from: string; to: string }>;
}
```

**Property keys are camelCase** internally (e.g. `paddingTop`, `borderTopLeftRadius`). They are converted to kebab-case only at output time via `camelToKebab` (from `utils.ts`, symbol `camelToKebab` line 2) and back via the inline regex `prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())` (used repeatedly in `change-tracker.ts` and `style-source.ts`).

---

## 1. Reading computed styles (`inspector/styles.ts`)

### 1.1 The curated property set

Retune does NOT dump all ~300 computed properties. It reads a fixed curated list. The list is built by concatenating these `as const` arrays into `ALL_PROPS` (lines 9-79). **Order is preserved** and matters - it is the iteration order used everywhere downstream.

| Group | camelCase properties (verbatim) |
|---|---|
| `SPACING_PROPS` | `paddingTop, paddingRight, paddingBottom, paddingLeft, marginTop, marginRight, marginBottom, marginLeft` |
| `SIZING_PROPS` | `width, height, minWidth, maxWidth, minHeight, maxHeight` |
| `BORDER_PROPS` | `borderTopWidth, borderRightWidth, borderBottomWidth, borderLeftWidth, borderTopColor, borderRightColor, borderBottomColor, borderLeftColor, borderTopStyle, borderRightStyle, borderBottomStyle, borderLeftStyle, borderTopLeftRadius, borderTopRightRadius, borderBottomLeftRadius, borderBottomRightRadius` |
| `TYPOGRAPHY_PROPS` | `fontSize, fontWeight, fontFamily, fontStyle, lineHeight, letterSpacing, textAlign, verticalAlign, textDecoration, textTransform, whiteSpace, wordSpacing, textIndent, color` |
| `BACKGROUND_PROPS` | `backgroundColor, backgroundImage, backgroundSize, backgroundPosition, backgroundRepeat` |
| `MEDIA_PROPS` | `objectFit, objectPosition, aspectRatio` |
| `SVG_PROPS` | `fill, stroke, strokeWidth` |
| `LAYOUT_PROPS` | `display, position, flexDirection, flexWrap, alignItems, justifyContent, gap, rowGap, columnGap, gridTemplateColumns, gridTemplateRows, top, right, bottom, left, zIndex, flexGrow, flexShrink, flexBasis, alignSelf, order, gridColumn, gridRow, justifySelf` |
| `VISUAL_PROPS` | `opacity, overflow, boxShadow, textShadow, transform, filter, backdropFilter` |
| `TEXT_OVERFLOW_PROPS` | `textOverflow, overflowWrap, wordBreak, webkitLineClamp, webkitBoxOrient` |

`ALL_PROPS = [...SPACING_PROPS, ...SIZING_PROPS, ...BORDER_PROPS, ...TYPOGRAPHY_PROPS, ...BACKGROUND_PROPS, ...MEDIA_PROPS, ...SVG_PROPS, ...LAYOUT_PROPS, ...VISUAL_PROPS, ...TEXT_OVERFLOW_PROPS]`.

### 1.2 `getRelevantStyles(element)` (lines 443-458)

The plain computed-style read. For each `prop` in `ALL_PROPS`:

```ts
const computed = window.getComputedStyle(element);
let value = computed.getPropertyValue(camelToKebab(prop));
if (value) {
  if (value === "normal" && NORMAL_TO_ZERO.has(prop)) value = "0px";
  styles[prop] = value;
}
```

- Reads via `getComputedStyle` then `getPropertyValue(kebab)`.
- **`normal` to `0px` normalization** applies ONLY to the set `NORMAL_TO_ZERO = new Set(["gap", "rowGap", "columnGap"])` (line 441). This is so an unset gap shows a usable `0px` instead of the string `normal`.
- Result keys are camelCase. Empty values are dropped (the `if (value)` guard).

### 1.3 `LayoutMode` and `detectLayoutMode(element)` (lines 81, 460-473)

`type LayoutMode = "block" | "flex" | "grid" | "inline" | "absolute" | "fixed" | "relative" | "sticky"`.

Resolution order (position wins over display):

```ts
if (position === "fixed") return "fixed";
if (position === "absolute") return "absolute";
if (position === "sticky") return "sticky";
if (position === "relative") return "relative";
if (display.includes("flex")) return "flex";   // matches "inline-flex" too
if (display.includes("grid")) return "grid";   // matches "inline-grid" too
if (display.includes("inline")) return "inline";
return "block";
```

### 1.4 `ForcedState` type (line 83)

`type ForcedState = ":hover" | ":focus" | ":active" | null;` - used by the panel to request pseudo-state styles.

---

## 2. Resolving authored & scoped values (`inspector/styles.ts`)

### 2.1 `getPseudoStateStyles(element, state)` (lines 89-142)

Returns `Record<string,string>` (kebab keys, then shorthand-expanded) of every property declared by stylesheet rules that target `element` under a pseudo-state (`":hover" | ":focus" | ":active"`).

Algorithm:

1. Build a regex from the state, escaping regex metachars: `new RegExp(state.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g")`.
2. Walk every `document.styleSheets` sheet; `try { rules = sheet.cssRules } catch { continue }` (skips cross-origin sheets).
3. `walkRules` recursion rules:
   - Recurse into `CSSGroupingRule` OR `CSSLayerBlockRule` (guarded `typeof CSSLayerBlockRule !== "undefined"`).
   - For `CSSMediaRule`, **skip if the media query does not currently match**: `if (rule instanceof CSSMediaRule && !window.matchMedia(rule.conditionText).matches) continue;`.
   - Only process `CSSStyleRule`.
4. `if (!sel.includes(state)) continue;` - rule must mention the pseudo.
5. Strip the pseudo to get the base selector and confirm the element matches: `const baseSel = sel.replace(stateRegex, "").replace(/\s+/g, " ").trim();` then `element.matches(baseSel)` inside try/catch (invalid selectors skipped).
6. Collect every declared property from `rule.style` (iterate `rule.style.length`, `rule.style[j]`, `getPropertyValue(prop)`).
7. Return `expandShorthands(styles)`.

### 2.2 `expandShorthands(styles)` (lines 151-264)

Because CSSOM enumerates a shorthand (e.g. `padding: 10px 20px`) but NOT its longhands, this expands known shorthands into longhands so downstream sees individual sides. Operates on a copy. **A longhand already explicitly present is never overwritten** (every set is guarded `if (!(side in result))`), and the shorthand key is `delete`d after expansion.

- `expandBoxValues(shorthand, [top,right,bottom,left])` parses 1-4 space-separated tokens with CSS box rules:
  - 1 value: all four
  - 2 values: `top=bottom=parts[0]`, `right=left=parts[1]`
  - 3 values: `top=parts[0]`, `right=left=parts[1]`, `bottom=parts[2]`
  - 4+ values: `top,right,bottom,left = parts[0..3]`
  - Applied to: `padding`, `margin`, `border-width`, `border-color`, `border-style` (kebab side names).
- `expandBorderRadius()` takes only the horizontal radii (splits on `/`, uses `[0]`), then 1-4 corner expansion in order `border-top-left-radius, border-top-right-radius, border-bottom-right-radius, border-bottom-left-radius`:
  - 1: all four; 2: `tl=br=p0, tr=bl=p1`; 3: `tl=p0, tr=bl=p1, br=p2`; 4: `tl,tr,br,bl`.
- `expandGap()`: `row-gap = parts[0]`, `column-gap = parts[1] ?? parts[0]`; deletes `gap`.

### 2.3 `getStyleSources(element)` (lines 278-309)

Returns `Record<string, StyleSource>` where the **local** `StyleSource` (lines 266-271) is `{ selector: string; value: string }` (camelCase property keys). This is the simplified "which selector last set this prop" map (last-match-wins, like the browser, no specificity tracking).

- Walks all sheets/rules with the same grouping/media recursion as 2.1.
- **Skips any rule whose selectorText includes `:hover`, `:focus`, or `:active`** (line 292) - base styles only.
- `element.matches(sel)` gate (try/catch).
- For each declared prop, converts kebab to camel and stores `{ selector: sel, value: getPropertyValue(prop) }`. Later matches overwrite earlier ones.

### 2.4 `getScopedStyles(element, scopeSelector)` (lines 319-441)

This is the most intricate read. It returns:

```ts
interface ScopedStyleResult {
  styles: Record<string, string>;       // camelCase, full ALL_PROPS coverage
  ownedProperties: Set<string>;         // camelCase props set by a rule WITHIN scope
}
```

Purpose (lines 416-418 comment): show a value scoped to the chosen selector, not the cascade result after a more-specific variant overrode it. Example given in code: `.alert`'s padding shows `16px` even though `.alert-dismissible` overrides `padding-right` to `40px`.

Key mechanics:

1. **Probe element** for resolving `var()` and shorthands (lines 338-340): a hidden `<div>` appended to `document.body` with inline cssText:
   ```
   position:fixed;top:-9999px;left:-9999px;visibility:hidden;pointer-events:none;
   ```
   Removed at the end via `probe.remove()` (line 413).
2. `scopeClasses = scopeSelector.match(/\.[a-zA-Z0-9_-]+/g) || []` - the set of class tokens in scope.
3. `resolveRuleValue(rule, prop)` (lines 342-360):
   - Reads `rule.style.getPropertyValue(prop).trim()`.
   - If empty, looks for a matching shorthand among `["padding","margin","border-radius","gap","border-width","border-color","border-style"]` where `prop.startsWith(sh.split("-")[0])`; sets the shorthand on the probe, reads back the computed longhand, removes it.
   - Else if value `includes("var(")`: sets prop on probe, reads computed resolved value, removes it.
4. `walkScopedRules` (lines 362-405): same grouping/media recursion; **skips `:hover`/`:focus`/`:active` rules**; `element.matches(sel)` gate. Then class-scoping logic:
   - `ruleClasses = sel.match(/\.[a-zA-Z0-9_-]+/g) || []`; skip if empty.
   - `ruleWithinScope = ruleClasses.every(rc => scopeClasses.includes(rc))` (rule subset of scope).
   - `ruleSupersetOfScope = !ruleWithinScope && scopeClasses.every(sc => ruleClasses.includes(sc))` (scope subset of rule - higher-specificity overrides).
   - `if (!ruleWithinScope && !ruleSupersetOfScope) continue;`
   - **Specificity = number of class tokens** (`ruleSpecificity = ruleClasses.length`). For each declared prop: if `ruleWithinScope`, add camel key to `ownedProperties`. Resolve value; store into `scopedValues[camel]` only if `ruleSpecificity >= prevSpec` (equal specificity + later source wins, matching cascade).
5. Final merge (lines 419-435): for each `prop` in `ALL_PROPS`, prefer `scopedValues[prop]` if present; otherwise fall back to `computed.getPropertyValue(camelToKebab(prop))` with the same `normal -> 0px` normalization from section 1.2.

---

## 3. Cascade origin resolver (`inspector/style-source.ts`)

This file answers "where did this value come from in the cascade" with full origin/specificity ordering. It defines a **second, richer `StyleSource`** interface (lines 22-37) - do not confuse with the local one in `styles.ts`:

```ts
interface StyleSource {
  property: string;     // kebab matched property (longhand OR shorthand)
  value: string;
  selector: string;
  origin: "inline" | "stylesheet" | "user-agent";
  stylesheet?: string;  // formatted sheet name
  important: boolean;
  mediaQuery?: string;
}
```

### 3.1 `LONGHAND_TO_SHORTHAND` map (lines 12-20)

Used so a longhand query can fall back to a shorthand declaration. Verbatim mappings: all four `padding-*` to `padding`; all four `margin-*` to `margin`; `border-*-width` to `border-width`; `border-*-color` to `border-color`; `border-*-style` to `border-style`; all four corner radii to `border-radius`; and `gap`, `row-gap`, `column-gap` to `gap`.

### 3.2 `findStyleSources(element, properties)` (lines 43-102)

Returns `Map<string, StyleSource[]>` (one entry per requested camelCase property, sorted highest-priority first).

1. **Inline first** (lines 53-76): reads `(element as HTMLElement).style`. For each prop, `getPropertyValue(kebab)`; if empty, try the shorthand via `LONGHAND_TO_SHORTHAND`. If found, push `{ property: matchedProperty, value: value.trim(), selector: "[inline]", origin: "inline", important: getPropertyPriority(matchedProperty) === "important" }`.
2. **Stylesheets** (lines 79-86): for each sheet, compute display name from `sheet.href || sheet.ownerNode?.textContent?.slice(0,50) || "embedded"`, then `walkRules(...)` in try/catch (cross-origin skipped).
3. `walkRules` (lines 104-154): recurses into `CSSMediaRule` passing `rule.conditionText` as `mediaQuery` (note: unlike `styles.ts`, it does NOT skip non-matching media - it records the media context instead). For `CSSStyleRule`, `element.matches(rule.selectorText)` gate. For each requested prop: longhand-or-shorthand value lookup, push `StyleSource` with `origin:"stylesheet"`, `stylesheet: sheetName`, `important` from `getPropertyPriority`, and `mediaQuery` if inside a media rule.
4. **Sort** (lines 89-99): inline beats non-inline; then `!important` beats non-important; otherwise stable (returns 0). There is no numeric specificity calculation here - DOM order from CSSOM is the implicit tiebreak.

### 3.3 `formatSheetName(href)` (lines 157-168)

`"embedded"` becomes `"embedded <style>"`. Otherwise parse URL, take `pathname`, strip `^/_next/static/css/` and leading `/`. On parse failure, `href.slice(0, 80)`.

### 3.4 `formatStyleSource(sources)` (lines 174-195)

Picks the winner (`sources[0]`). Inline becomes `"inline style"`. Else builds `` `selector` `` + (` in \`stylesheet\`` if present) + (` @media(query)` if present) + (` !important` if important). Empty list becomes `"unknown"`.

---

## 4. Live preview engine (`engine/live-preview.ts`)

`class LivePreviewEngine` applies changes to the page WITHOUT mutating existing stylesheets, using a single Constructable `CSSStyleSheet` added to `document.adoptedStyleSheets`. Removing the sheet instantly reverts everything.

### 4.1 Internal record

```ts
interface AppliedRule {
  selector: string;
  property: string;     // camelCase as passed in
  value: string;
  index: number;        // index returned by insertRule
  breakpoint?: string | null;
}
```

State: `private sheet: CSSStyleSheet` (created in constructor via `new CSSStyleSheet()`), `private rules: AppliedRule[] = []`, `private attached = false`.

### 4.2 Methods (exact behavior)

- `attach()` (lines 29-33): idempotent. `document.adoptedStyleSheets = [...document.adoptedStyleSheets, this.sheet]; this.attached = true;`
- `detach()` (lines 36-42): idempotent. Filters the sheet out of `adoptedStyleSheets` - instant revert.
- `applyChange(selector, property, value, breakpoint?)` (lines 45-58):
  - First `removeChange(selector, property, breakpoint)` (replace semantics).
  - `kebabProp = camelToKebab(property)`.
  - Inner rule string: `` `${selector} { ${kebabProp}: ${value} !important; }` `` - **every preview declaration is `!important`** to override author styles.
  - If `breakpoint` set: wrap `` `@media (max-width: ${breakpoint}) { ${innerRule} }` ``.
  - `this.sheet.insertRule(rule, this.sheet.cssRules.length)` (appends at end); push the `AppliedRule`. Invalid CSS is swallowed in `catch {}` (silent skip).
- `removeChange(selector, property, breakpoint?)` (lines 61-72): finds the rule by exact `selector + property + (breakpoint||null)` match; since CSSOM indices shift on delete, it `rebuildSheet`s the filtered list rather than deleting in place.
- `removeAllChanges(selector)` (lines 75-79): rebuild without that selector.
- `clearAll()` (lines 82-85): `this.sheet.replaceSync(""); this.rules = [];`
- `getChanges()` (lines 88-90): returns `ReadonlyArray<AppliedRule>`.
- `migrateChanges(fromSelector, toSelector)` (lines 93-102): re-applies each `from` rule under `to` (preserving breakpoint), then removes the `from` rules.
- `rebuildSheet(newRules)` (lines 104-110): `replaceSync(""); rules=[];` then re-`applyChange` each - this re-normalizes indices.
- `destroy()` (lines 112-115): `detach()` + `clearAll()`.

**Breakpoint model:** breakpoint is the `max-width` value string (e.g. `"768px"`); `null`/absent = base. Media query is always `@media (max-width: <bp>)` (desktop-first).

---

## 5. Change tracker (`engine/change-tracker.ts`)

`class ChangeTracker` is the diff + history + variable-link + persistence core. The canonical model: per selector it keeps `originalStyles` (snapshot at selection) and `currentStyles`; a pending change is any prop where `current !== original`.

### 5.1 Tracked element shape (lines 18-50)

`TrackedElement` holds: `selector, tagName, textContent, classes, reactComponents, originalStyles, currentStyles`, optional `breakpointStyles?: Map<string, {original, current}>`, `originalProps/currentProps` (React), `variableAssociations?: Record<string, TrackedVariableRef>`, `unlinkedVariables?: Set<string>`, `originalAttrs/currentAttrs`, plus context fields (`sourceFile, stylingApproach, inlineStyles, elementId, accessibleName, parentContext, childSummary, domPath, nearbySiblings, position`).

`TrackedVariableRef = { className: string; values: Record<string,string> }` (lines 7-11).

`UndoEntry` (lines 52-67): `{ selector, property, value, group, breakpoint?, action?: "unlink", variableRef?, prevVariableAssoc?, prevUnlinked? }`. `value` holds the **old** value to restore.

### 5.2 `track(...)` (lines 79-128)

Snapshots on first registration: `originalStyles = {...currentStyles}`, `currentStyles = {...currentStyles}`, and if `reactProps`, `originalProps/currentProps = {...reactProps}`. If already tracked but `reactProps` newly available, backfills props only.

### 5.3 `recordChange(selector, property, newValue, breakpoint?)` (lines 182-239)

The heart of the data model. Returns `{ from, to } | null`.

- Resolve bucket: base uses `tracked.currentStyles`; breakpoint uses `tracked.breakpointStyles.get(bp)` (lazy-init snapshotting current styles as that breakpoint's `original` and `current` - lines 191-197).
- `oldValue = bucket[property] || ""`. **No-op guard:** `if (oldValue === newValue) return null;` Then write `bucket[property] = newValue`.
- Snapshot variable state for undo: `prevVariableAssoc = variableAssociations?.[camelProp] ?? null`, `prevUnlinked = unlinkedVariables?.has(camelProp) ?? false`.
- **Coalescing** into one undo group. Constant `const COALESCE_MS = 300;` (line 69). If `lastChange.selector === selector && now - lastChange.time < 300`:
  - If the property already has an entry in that group (`findInGroup`), keep the original `from` (do not push a new entry) - this is how a single scrub gesture touching `paddingTop`+`paddingBottom` reverts as one step.
  - Else push a new `UndoEntry` with the same `group`. Update `lastChange.time = now`.
  - Otherwise start a new group: `groupCounter++`, push entry, set `lastChange = { selector, time: now, group: groupCounter }`.
- `this.redoStack = []` (any new change clears redo).

### 5.4 Other change recorders

- `recordChangeSilent(selector, property, newValue)` (lines 243-247): writes `currentStyles` only, no undo entry. For bulk/structural changes.
- `ensureOriginalValue(selector, property, value)` (lines 172-178): seeds both original+current for pseudo-properties (e.g. `__reorder`) not in the computed snapshot.
- `recordPropChange / isPropChanged / resetProp` (lines 131-153): React prop edits against `currentProps`/`originalProps`.
- `recordAttributeChange(selector, attr, oldValue, newValue)` (lines 156-167): stores original once, updates current; persists.
- `trackBreakpoint(selector, breakpoint, computedStyles)` (lines 250-259): explicit per-breakpoint snapshot if not already present.

### 5.5 Undo / redo (lines 261-393)

- Groups are contiguous in the stack. `findInGroup(group, property)` scans from the top, stops when leaving the group (lines 262-271).
- `popUndo()` (lines 274-334): pops the whole top group; assigns a fresh `redoGroup = ++groupCounter`; for each entry either reverses an `"unlink"` action (restores association/removes from unlinked set) or restores the style value into the correct bucket (base vs breakpoint), pushing the current value to the redo stack and restoring `prevVariableAssoc`/`prevUnlinked`. Calls `persist()`.
- `popRedo()` (lines 337-393): mirror image, pushing back onto undo with a fresh `undoGroup`.
- `canUndo` / `canRedo` getters (line 738): `undoStack.length > 0` / `redoStack.length > 0`.
- `breakCoalescing()` (lines 734-736): `lastChange = null` - forces the next change into a new group.

### 5.6 Variable (design-token) links (lines 550-643)

- `setVariableAssociation(selector, properties, token)` / `clearVariableAssociation` - attach/remove a `TrackedVariableRef` per camelCase property.
- `unlinkVariable(selector, properties)` - clears associations and adds props to `unlinkedVariables` (suppresses auto token detection). `relinkVariable` removes from the unlinked set.
- `recordUnlink(selector, properties)` (lines 587-614): undoable unlink - saves current refs, performs unlink, pushes one `action:"unlink"` entry per prop under a new group, resets `lastChange=null`, clears redo.
- `isVariableUnlinked / getUnlinkedVariables / getVariableAssociation / getVariableAssociations` accessors.

### 5.7 Diff into `getPendingChanges()` (lines 396-498)

Produces the `ElementChange[]` consumed by output. For each tracked element:

1. Base diff: every `currentStyles` prop where `current !== (original || "")` becomes a `PropertyChange {property, from, to}`.
2. Breakpoint diff: same, with `breakpoint: bp` added.
3. Prop diff into `propChanges: [{prop, from, to}]` (React props).
4. Attr diff into `attributeChanges: [{attr, from, to}]`.
5. `unlinked` into `[{property, value: currentStyles[prop] || ""}]`.
6. `hasChanges = propertyChanges.length > 0 || unlinked.length > 0 || propChanges.length > 0 || attributeChanges.length > 0`. Only emits an `ElementChange` if true. Attaches `variableAssociations`, `unlinkedProperties`, `propChanges`, `attributeChanges` only when non-empty, and copies all context fields plus `timestamp: Date.now()`.

`hasPendingChanges()` = `getPendingChanges().length > 0`.

### 5.8 Per-property helpers

- `isPropertyChanged(selector, property)` (lines 646-654): true if unlinked OR `original !== current`.
- `getChangedProperties(selector)` (lines 657-674): Set of camelCase changed props, including all unlinked.
- `silentRevert(selector, property)` (lines 678-683): set current back to original, no undo entry.
- `removeProperty(selector, property)` (lines 687-692): deletes from both `originalStyles` and `currentStyles` (so it won't surface as a change).
- `resetProperty(selector, property)` (lines 695-731): reverts to original, pushes an undoable group (no coalescing - `lastChange=null`), clears variable association + unlinked state, persists. Returns `{from, to}` or `null` if nothing to reset.

### 5.9 `migrateChanges(fromSelector, toSelector)` (lines 508-548)

Moves diffed props from one tracked selector to another (applies to target's current, resets source's current to original), migrates variable associations (both camel and kebab keys), then clears undo/redo (history invalidated).

### 5.10 Persistence (lines 749-803)

- `STORAGE_KEY = "retune-pending-changes"`.
- `persist()`: serializes `tracked` entries (converting `unlinkedVariables` Set into array, `breakpointStyles` Map into entries array), plus `undoStack`/`redoStack`, into `localStorage` under the key. Wrapped in try/catch.
- `restore()`: parses back, rehydrates Sets/Maps, restores stacks, recomputes `groupCounter` to the max existing group id. Returns `hasPendingChanges()`.
- `clear()`: empties tracked + both stacks + persists.

---

## 6. Candidate enrichment (`engine/candidates.ts`)

Bridges a `PropertyChange` to token/class/variable recommendations and cascade source. Output is `EnrichedPropertyChange`.

- Constants: `const MAX_ALTERNATIVES = 3;` (line 18), `const MAX_CSS_VARS = 2;` (line 19).
- `PSEUDO_STATES = [":hover", ":focus", ":active", ":focus-visible", ":focus-within"]` (line 22). `stripPseudoState(selector)` removes a trailing pseudo (lines 25-32).
- `enrichPropertyChanges(changes, tokenMap, selector)` (lines 144-161): resolves the DOM element once via `document.querySelector(stripPseudoState(selector))` (try/catch), **filters out structural props** (`!c.property.startsWith("__")` - drops `__delete`, `__text`, `__reorder`, `__reparent`, `__bulkOf`), maps each through `resolvePropertyCandidates`.
- `resolvePropertyCandidates(prop, tokenMap, element)` (lines 37-139):
  1. `kebab = camelToKebab(prop.property)`.
  2. **Utility/semantic token** via `findVariableForValue(kebab, prop.to)` (from `variables/resolver`). Exactness = normalized (trim+lowercase) equality of token value vs `prop.to`. Type = `isRawUtility(token) ? "utility-class" : "semantic-token"`. `distance` set to `` `nearest: ${tokenVal} vs ${prop.to}` `` when not exact.
  3. **CSS custom properties** via `findCssVarsForValue(prop.to, tokenMap)` (alias of `findTokensForValue` from `inspector/tokens`), sliced to `MAX_CSS_VARS`. **Skipped entirely** for `SKIP_CSS_VAR_PROPS = new Set(["top","right","bottom","left","transform"])` (lines 68-69) to avoid false positives like `0px` matching `--tw-ring-offset-width`. If no utility token but a CSS var exists, promote the first var to `recommended` (`type:"css-variable"`, `name: \`var(${...})\``, `exact:true`).
  4. **Alternatives** via `getAlternativeVariables(kebab, utilToken?)`, up to `MAX_ALTERNATIVES`, skipping the recommended one.
  5. **Source + conflicts** via `findStyleSources(element, [prop.property])`: winner becomes `source`; `propSources.slice(1, 4)` becomes `conflicts` (max 3 competing rules).

Referenced external symbols (outside this file set): `findVariableForValue`, `getAlternativeVariables`, `isRawUtility` from `variables/resolver`; `findTokensForValue` and `TokenMap` from `inspector/tokens`; `getVariableRegistry` from `variables/registry`.

---

## 7. Source output formatter (`engine/output.ts`)

Turns `ElementChange[]` (+ optional comments + manifest) into the markdown handed to the AI agent. `type Fidelity = "minimal" | "standard" | "full"` (line 19).

### 7.1 Selector parsing helpers

- `PSEUDO_STATES = [":hover", ":focus", ":active", ":focus-visible", ":focus-within"]` (line 22).
- `parsePseudoState(selector)` (lines 32-42): returns `{ base, pseudoState }` (pseudo without leading colon, e.g. `"hover"`).
- `describeSelectorScope(selector)` (lines 45-84): classifies as `"ancestor-scoped"`, `"class-scoped"`, `"id-scoped, unique"`, `"element-specific"`, or `null`, appending live `querySelectorAll(base).length` counts (e.g. `"class-scoped, 3 elements"`). Descendant/child detection uses regexes `/[.\])\w]\s+[.\[:]/` and `/[.\])\w]\s*>\s*[.\[:]/` after stripping `(...)` pseudo-function contents.

### 7.2 `formatChanges(changes, fidelity, comments?, manifest?)` (lines 95-218)

1. Empty guard: no changes and no comments returns `"No changes recorded."`.
2. **Bulk split:** counts changes containing a `__bulkOf` property (`bulkCount`); uses only primary (non-`__bulkOf`) changes downstream.
3. Header line varies by content: changes+comments, comments-only, or changes-only (exact strings at lines 111-116).
4. **Environment block:** `**Environment:**`, `- URL: ${window.location.href}`, `- Viewport: ${window.innerWidth}x${window.innerHeight}` (the separator in source is the multiplication sign U+00D7, shown here as `x`), `- Timestamp: ${new Date().toISOString()}`.
5. Token system summary via `summarizeTokenSystem(getTokenMap())` (skipped in `minimal`). Token map is lazily cached: `cachedTokenMap` + `getTokenMap()` calling `scanDesignTokens()` (lines 86-93).
6. **Framework guidance:** if `getVariableRegistry().framework === "tailwind"`, emits the verbatim Tailwind instruction (lines 136-137) telling the agent to apply changes via Tailwind utility classes, not inline styles or raw CSS.
7. **Responsive / Manifest blocks** (non-minimal): breakpoints `name=width`, components list count.
8. `# Visual Changes (N elements)` then `formatSingleChange` joined by `\n---\n\n`.
9. `# Comments (N)` section: per-comment element/area headers, `**Marker position:** (x, y)`, area `**Region:** (x, y) WxHpx`, contained elements (first 8), quoted comment text.

### 7.3 `formatSingleChange(change, fidelity, tokenMap, bulkInstanceCount, manifest?)` (lines 220-564)

Emits, in order (many gated by fidelity):

- `## \`<tagname>\` "text"` (text truncated to 60 via `truncate`).
- `**Source:** \`fileName:line:col\`` (col optional).
- `**Component:** A (arrow) B` from `reactComponents` joined with the U+2192 right-arrow glyph; plus manifest-driven `**Component props:**` (full) or `**Variants:**` (standard, only enum/class_map props).
- `**Styling:** ...` via `formatStylingApproach` (lines 566-575): `tailwind` -> "Tailwind CSS (modify utility classes)", `css-modules` -> "CSS Modules (modify `.module.css` file)", `css-in-js` -> "CSS-in-JS / Emotion (modify style object)", `styled-components` -> "styled-components (modify template literal)", `plain-css` -> "Plain CSS (modify stylesheet)".
- `**DOM Path:**` (non-minimal).
- `**Selector:** \`base\` (hover state, class-scoped, N elements)` - annotations from pseudo + scope joined with `, `.
- Ancestor/compound breakdown: ancestor selectors split into `**Ancestor context:**` + `**Target element:**` (the source joins each with the U+2014 em-dash glyph and explanatory text); compound classes render as `**Target classes:** \`.a\` (n) (arrow) \`.b\` (m) (em-dash) apply changes where all these classes are present`. The arrow and em-dash here are U+2192 and U+2014 in source.
- Full-fidelity extras: `**ID:**`, `**Accessible name:**`, `**Position:** x:.. y:.. (WxHpx)`, `**Nearby elements:**`, `**Parent:**`, `**Children:**`, `**Inline styles:**`.
- **Structural actions** (early-return / inline blocks): `__delete` -> "### Action: Delete Element"; `__reparent` -> "### Action: Reparent Element" parsing `selector@index` via `lastIndexOf("@")`; `__reorder` -> "### Action: Reorder Element" (from/to positions); `__text` -> "### Action: Edit Text Content" with fenced before/after blocks. Bulk-aware wording mentions `${bulkInstanceCount + 1} instances`.
- **Changes table:** `collapseShorthands` then `enrichPropertyChanges`, then user token override (from `variableAssociations`, exact). Grouped base-first then per-breakpoint (`### Override @media (max-width: <bp>)`, optionally suffixed with the manifest token name joined by an em-dash, sorted widest-first by `parseInt`). Table columns: `| Property | Before | After | Token |` with property kebabified (except `class:` prefixed), values backticked, token via `formatRecommended` (lines 578-586): `css-variable` -> `` `name` ``, else `` `.name` ``; fuzzy appends `(distance)`; none renders as the em-dash glyph (shown here as `-`).
- **Detached Variables** table (`| Property | Current Value |`) from `unlinkedProperties` with the instruction to hardcode values.
- **Attribute Changes** / **SVG Attribute Changes** table (SVG detected from a fixed tag allowlist: `SVG, PATH, CIRCLE, ELLIPSE, RECT, LINE, POLYGON, POLYLINE, G, TEXT, USE, DEFS`). Columns `| Attribute | From | To |`; empty `from` renders as the em-dash glyph.
- **Prop Changes** table (`| Prop | From | To |`, JSON-stringified, `undefined` renders as the em-dash glyph).
- **Resolution context** `<details>` block (non-minimal) via `formatResolutionContext` (lines 601-645): per-prop recommended/alternatives/CSS-vars/competing-rules, only when there is something beyond the table.

### 7.4 `collapseShorthands(changes)` (lines 675-693)

Collapses four longhands into a shorthand **only when all four are present AND share the same `from` AND same `to`**. `SHORTHAND_GROUPS` (lines 648-673): `borderRadius` (4 corners), `padding` (4 sides), `margin` (4 sides), `borderWidth`, `borderColor`, `borderStyle`. Emits a single `PropertyChange {property: shorthand, from, to}`.

---

## 8. End-to-end pipeline (selector / property / oldValue / newValue)

1. **Selection:** read styles with `getRelevantStyles` / `getScopedStyles` / `getPseudoStateStyles` (`styles.ts`). Detect layout via `detectLayoutMode`. camelCase keys, curated `ALL_PROPS` set, `normal -> 0px` for gaps.
2. **Snapshot:** `ChangeTracker.track(selector, ..., currentStyles)` stores `originalStyles`/`currentStyles`.
3. **Edit** (drag/scrub/type/token-pick in the panel): `ChangeTracker.recordChange(selector, property, newValue, breakpoint?)` produces `{from, to}`, coalescing within 300 ms by selector into one undo group.
4. **Preview:** `LivePreviewEngine.applyChange(selector, property, value, breakpoint?)` injects `selector { prop: value !important; }` (wrapped in `@media (max-width: bp)` when scoped) into a Constructable stylesheet; `detach()` reverts instantly.
5. **Diff:** `ChangeTracker.getPendingChanges()` yields `ElementChange[]` where each `changes[]` entry is exactly `{property, from(=oldValue), to(=newValue), breakpoint?}`.
6. **Enrich:** `candidates.enrichPropertyChanges` attaches recommended token/class/CSS-var, alternatives (max 3), css vars (max 2), and cascade `source`/`conflicts` via `style-source.findStyleSources`.
7. **Output:** `output.formatChanges` renders the agent-facing markdown (environment, framework/responsive/manifest context, per-element tables, resolution `<details>`).

The `{selector, property, oldValue, newValue}` model maps directly: `selector` = `ElementChange.selector` (may carry a pseudo suffix and represent class/ancestor/id scope); `property` = camelCase `PropertyChange.property`; `oldValue` = `from`; `newValue` = `to`; plus the orthogonal `breakpoint` axis (`null` = base, `"768px"` = `@media (max-width: 768px)`).

---

## 9. References to symbols defined outside this file set

- `camelToKebab(prop)` and `truncate(str, len)` - `packages/overlay/src/utils.ts` (lines 2, 11).
- `PropertyChange, EnrichedPropertyChange, PropertyCandidate, ElementChange` - `packages/overlay/src/types.ts` (lines 64-148).
- `TokenMap, scanDesignTokens, summarizeTokenSystem, findTokensForValue` (+ `DesignToken`, `detectStylingApproach`) - `packages/overlay/src/inspector/tokens.ts`.
- `findVariableForValue, getAlternativeVariables, isRawUtility` - `packages/overlay/src/variables/resolver.ts`.
- `getVariableRegistry` (and `.framework`) - `packages/overlay/src/variables/registry.ts`.
- `Comment` - `packages/overlay/src/engine/comment-store.ts`.

---

## 10. Open questions / gaps for the port

- **Specificity is approximate.** `style-source.ts` sorts only by inline/!important and relies on CSSOM source order for the rest (no real specificity calculus). `getScopedStyles` approximates specificity as "number of class tokens". A 1:1 port should decide whether to keep these approximations or compute true specificity.
- **`webkitLineClamp` / `webkitBoxOrient`** are read via `getPropertyValue(camelToKebab(...))` which yields `-webkit-line-clamp` / `-webkit-box-orient` - confirm the target browser exposes these on computed style.
- **Token resolution internals** (`scanDesignTokens`, `findVariableForValue`, registry framework detection) live outside this file set; the exact match/distance heuristics for tokens are not specified here and need their own spec (inspector/tokens, variables/resolver, variables/registry).
- **Panel control mechanics** (drag/scrub math, keyboard stepping, unit handling) are NOT in these files - they live in the `ui/` and `drag/` directories and must be spec'd separately; this layer only receives the final `newValue` string via `recordChange`/`applyChange`.
- **`__bulkOf` / bulk-instance semantics** are referenced in `output.ts` (bulk count) and `change-tracker` (`recordChangeSilent`/`ensureOriginalValue`) but the bulk-detection logic itself is elsewhere.
- **Output glyphs** (U+2014 em-dash, U+2192 arrow, U+00D7 multiplication sign) must be restored verbatim in the ported `output.ts` strings; this ASCII spec substitutes them.
