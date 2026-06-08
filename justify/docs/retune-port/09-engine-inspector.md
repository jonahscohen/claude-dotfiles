# 09 - Engine + Inspector (value / preview / output pipeline)

Source of truth (read in full):
- `RETUNE/inspector/styles.ts` - computed-style extraction, shorthand expansion, scoped/pseudo styles, layout-mode detection.
- `RETUNE/inspector/style-source.ts` - cascade tracing (which rule/sheet/selector set a property).
- `RETUNE/engine/live-preview.ts` - applies changes to the live DOM via a constructable stylesheet.
- `RETUNE/engine/change-tracker.ts` - before/after diffing, undo/redo, persistence.
- `RETUNE/engine/output.ts` - turns the diff into AI-agent markdown.
- `RETUNE/engine/candidates.ts` - enriches each property change with token/class/variable matches and source info.

The Justify change model is `{ selector, property, oldValue, newValue }`. Retune's internal shape is `PropertyChange = { property, from, to, breakpoint? }` nested under an `ElementChange` that carries the `selector` plus rich metadata. The mapping is:

| Justify field | Retune field | Notes |
|---|---|---|
| `selector` | `ElementChange.selector` | the CSS selector for the tracked element; one ElementChange owns many property changes |
| `property` | `PropertyChange.property` | **camelCase** internally (e.g. `paddingTop`), kebab-cased only at output time via `camelToKebab` |
| `oldValue` | `PropertyChange.from` | snapshot of the resolved value at track() time |
| `newValue` | `PropertyChange.to` | the edited value |
| (none) | `PropertyChange.breakpoint` | `null`/undefined = base; `"768px"` = `@media (max-width: 768px)` override |

Everything below explains how Retune fills those four fields end-to-end.

---

## Stage 1 - Reading values (the Inspector)

### 1a. Which properties are read

`inspector/styles.ts` does NOT dump all ~300 computed properties. It curates a fixed allowlist (`ALL_PROPS`) built from themed groups:

- `SPACING_PROPS` - padding/margin longhands (8).
- `SIZING_PROPS` - width/height/min/max (6).
- `BORDER_PROPS` - per-side width/color/style + 4 corner radii (16).
- `TYPOGRAPHY_PROPS` - fontSize, fontWeight, fontFamily, fontStyle, lineHeight, letterSpacing, textAlign, verticalAlign, textDecoration, textTransform, whiteSpace, wordSpacing, textIndent, color.
- `BACKGROUND_PROPS` - backgroundColor/Image/Size/Position/Repeat.
- `MEDIA_PROPS` - objectFit, objectPosition, aspectRatio.
- `SVG_PROPS` - fill, stroke, strokeWidth.
- `LAYOUT_PROPS` - display, position, flex container + child props, grid template + child props, inset (top/right/bottom/left), zIndex.
- `VISUAL_PROPS` - opacity, overflow, boxShadow, textShadow, transform, filter, backdropFilter.
- `TEXT_OVERFLOW_PROPS` - textOverflow, overflowWrap, wordBreak, webkitLineClamp, webkitBoxOrient.

Properties are stored as **camelCase keys**; values are read with `computed.getPropertyValue(camelToKebab(prop))`.

Justify port note: this allowlist is exactly what should drive Justify's section/property list. It is the union of every property the UI can edit.

### 1b. The three read functions (pick by context)

1. **`getRelevantStyles(element)`** - the simple path. `getComputedStyle(element)`, read each allowlisted prop, special-case: if `gap`/`rowGap`/`columnGap` come back `"normal"`, coerce to `"0px"` (`NORMAL_TO_ZERO` set). Returns `Record<camelProp, value>`. This is the resolved, post-cascade, browser-computed value (e.g. colors as `rgb(...)`, sizes as `px`).

2. **`getScopedStyles(element, scopeSelector)`** - the "edit the class, not the element" path, and the most important one to understand. Computed styles reflect the full cascade for *this one element*; but Retune wants to show/edit the value owned by a specific selector (e.g. `.alert`) without contamination from more specific variants (e.g. `.alert-dismissible` overriding `padding-right`). It works like this:
   - Walks all stylesheets/rules via the CSSOM (`document.styleSheets` -> `cssRules`), recursing into `CSSGroupingRule`/`CSSLayerBlockRule`, and skipping `@media` rules whose `conditionText` doesn't match the current viewport.
   - Skips `:hover`/`:focus`/`:active` rules.
   - For each rule the element `matches`, it compares the rule's classes to the scope's classes:
     - **rule within scope** (every rule class is in the scope) -> the property is "owned" by the scope; added to `ownedProperties`.
     - **rule superset of scope** (scope classes all present, plus more) -> higher specificity, can override scope value in cascade, but is NOT marked owned.
   - Resolves each rule value with a hidden **probe element** appended to `document.body`: if the value contains `var(...)`, it sets it on the probe and reads back the computed value (resolving the custom property to a concrete value); if a longhand isn't present but the matching shorthand is, it sets the shorthand on the probe and reads the longhand back. Probe is removed at the end.
   - Tracks specificity = number of classes; later rule with `>=` specificity wins (mirrors the cascade).
   - Final merge: for each allowlisted prop, use the scoped value if owned, else fall back to `getComputedStyle` (with the same `normal`->`0px` coercion). Returns `{ styles, ownedProperties }`.

3. **`getPseudoStateStyles(element, state)`** - for `:hover`/`:focus`/`:active`. Walks rules, finds selectors containing the state, strips the pseudo to get the base selector, checks the element `matches` the base, and collects the rule's declared properties. Runs the result through `expandShorthands` so consumers always see longhands. Returns `Record<kebabProp, value>` (note: pseudo path returns kebab keys, since it reads `rule.style[j]` directly).

### 1c. Shorthand expansion (`expandShorthands`)

When a stylesheet rule uses `padding: 10px 20px`, the CSSOM enumerates only the shorthand; the longhands are absent. `expandShorthands` detects known shorthands and synthesizes longhands using standard 1-4 value box logic:
- `expandBoxValues` for padding, margin, border-width, border-color, border-style (the 1/2/3/4 -> T R B L expansion).
- `expandBorderRadius` (1/2/3/4 -> TL TR BR BL, takes only the horizontal side of any `/` slash syntax).
- `expandGap` (`gap` -> `row-gap` + `column-gap`).
Longhands are only written if not already explicitly declared; the shorthand key is then deleted.

### 1d. Layout mode detection (`detectLayoutMode`)

`getComputedStyle` -> branch on position first (`fixed`/`absolute`/`sticky`/`relative`), then display (`flex`/`grid`/`inline`), else `block`. Drives which sections/controls the UI shows.

### 1e. Cascade source tracing - TWO implementations

There are two `StyleSource` concepts; do not confuse them.

- **`inspector/styles.ts -> getStyleSources(element)`** - lightweight. Returns `Record<camelProp, { selector, value }>`, last-match-wins, skips pseudo-state rules. Quick "where does this come from" map.

- **`inspector/style-source.ts -> findStyleSources(element, properties)`** - the forensic one used by output. For each requested property it returns a sorted `StyleSource[]`:
  ```ts
  interface StyleSource {
    property: string;       // kebab-case, may be the matched shorthand
    value: string;          // value as authored in the rule
    selector: string;       // matched selector ("[inline]" for inline)
    origin: "inline" | "stylesheet" | "user-agent";
    stylesheet?: string;    // formatted sheet name (href pathname, or "embedded <style>")
    important: boolean;     // !important?
    mediaQuery?: string;    // conditionText if inside @media
  }
  ```
  - Checks inline styles first; if a longhand isn't set inline, it falls back to the shorthand via `LONGHAND_TO_SHORTHAND`.
  - Walks every stylesheet (try/catch around `cssRules` to skip cross-origin), recursing into `@media` (carrying `conditionText` as `mediaQuery`).
  - For each matching rule, records the longhand value or, if absent, the shorthand value (`matchedProperty` reflects which one matched).
  - Sorts each property's sources: inline wins (unless stylesheet `!important`), then `!important`, then source order. `sources[0]` is the "winner"; the rest are conflicts.
  - `formatStyleSource` renders the winner as `` `selector` in `sheet` @media(...) !important ``.

---

## Stage 2 - Live preview (`engine/live-preview.ts`)

`LivePreviewEngine` applies edits to the running page WITHOUT mutating any existing stylesheet, so previews are instantly reversible.

Mechanism: a single **Constructable Stylesheet** (`new CSSStyleSheet()`) pushed onto `document.adoptedStyleSheets`.

- `attach()` / `detach()` - add/remove the sheet from `adoptedStyleSheets`. `detach()` instantly reverts ALL preview changes (the entire sheet stops applying).
- `applyChange(selector, property, value, breakpoint?)`:
  - First `removeChange` for the same selector+property+breakpoint (no duplicates).
  - Builds `` `${selector} { ${kebabProp}: ${value} !important; }` `` - note **`!important`** is always added so the preview beats existing author styles.
  - If `breakpoint` is set, wraps it: `@media (max-width: ${breakpoint}) { ... }`.
  - `this.sheet.insertRule(rule, length)` inside try/catch (invalid CSS silently skipped); records `{ selector, property, value, index, breakpoint }` in `rules[]`.
- `removeChange` / `removeAllChanges(selector)` / `clearAll()` - because CSSOM rule indices shift on delete, removal is done by `rebuildSheet` (replaceSync("") then re-`applyChange` the survivors).
- `migrateChanges(from, to)` - re-applies all of `from`'s rules under `to`, then removes the `from` rules (used when the selector for an element changes).
- `getChanges()` returns the applied rules; `destroy()` detaches + clears.

Key behaviors to port: constructable-sheet isolation, always-`!important`, breakpoint = `@media (max-width: N)`, rebuild-on-delete because indices shift. Property is kebab-cased at apply time (`camelToKebab`).

Important: **the preview engine and the change tracker are independent.** The preview engine paints pixels; the tracker records semantics. The UI calls both. Preview value strings are exactly the `newValue`.

---

## Stage 3 - Change tracking + diff (`engine/change-tracker.ts`)

`ChangeTracker` is the source of truth for `{from, to}` diffs, undo/redo, and persistence.

### 3a. Tracking model

`track(selector, tagName, textContent, classes, reactComponents, currentStyles, ...lots of metadata...)` snapshots an element on first selection:
- `originalStyles` = `{...currentStyles}` (the immutable baseline = `oldValue`).
- `currentStyles` = `{...currentStyles}` (mutated as the user edits = `newValue`).
- Plus rich metadata carried onto output: `sourceFile` (React `_debugSource`), `stylingApproach`, `inlineStyles`, `elementId`, `accessibleName`, `parentContext`, `childSummary`, `domPath`, `nearbySiblings`, `position`, and React `originalProps`/`currentProps`.

So `currentStyles` should be seeded from `getScopedStyles`/`getRelevantStyles` (Stage 1). The diff `originalStyles[p] !== currentStyles[p]` is exactly `oldValue !== newValue`.

### 3b. Recording a change (`recordChange`)

`recordChange(selector, property, newValue, breakpoint?)`:
- Resolves the bucket: base -> `currentStyles`; breakpoint -> lazily-initialized `breakpointStyles.get(bp)` (snapshotting current styles as that breakpoint's `original`/`current` on first touch).
- `oldValue = bucket[property] || ""`; if `oldValue === newValue`, returns null (no-op).
- Sets `bucket[property] = newValue`.
- Pushes an `UndoEntry` storing the OLD value (so undo restores it).
- **Coalescing:** within `COALESCE_MS = 300` of the last change on the same selector, paired props (e.g. `paddingTop` + `paddingBottom` from one scrub gesture, or a ShorthandInput) join the same undo `group` so they revert together. Otherwise a new group is opened (`groupCounter++`).
- Clears the redo stack.
- Returns `{ from: oldValue, to: newValue }`.

There is also `recordChangeSilent` (persist without undo entry), `ensureOriginalValue` (seed structural pseudo-props like `__reorder`), `recordPropChange`/`recordAttributeChange` for React props and HTML/SVG attributes.

### 3c. Undo / redo

Group-based. `popUndo` pops the entire top group, reverts each entry's bucket value to the stored old value, and pushes inverse entries to the redo stack with a new group id. `popRedo` is symmetric. Undo entries also snapshot variable-association state (`prevVariableAssoc`, `prevUnlinked`) and support an `action: "unlink"` entry type so token-detach is itself undoable. `breakCoalescing()` forces the next change into a fresh group.

### 3d. Producing the diff (`getPendingChanges`) - this is where the change model materializes

For each tracked element it builds an `ElementChange`:
- **Base property changes:** for every `[prop, currentVal]` in `currentStyles`, compare to `originalStyles[prop] || ""`; if different, push `{ property: prop, from: originalVal, to: currentVal }`. **This is the canonical `{selector(from ElementChange), property, oldValue=from, newValue=to}`.**
- **Breakpoint changes:** same diff over each `breakpointStyles` bucket, adding `breakpoint: bp` to the PropertyChange.
- **React prop changes** -> `propChanges: [{prop, from, to}]`.
- **Attribute changes** -> `attributeChanges: [{attr, from, to}]`.
- **Unlinked variables** -> `unlinkedProperties: [{property, value}]`.
- Only emits an ElementChange if `hasChanges` (any of the above non-empty). Attaches all the identity metadata (selector, tagName, classes, reactComponents, sourceFile, domPath, etc.) and `variableAssociations`.

Other diff helpers: `isPropertyChanged`, `getChangedProperties` (camelCase set, includes unlinked), `resetProperty` (revert one prop to original, undoable), `migrateChanges(from,to)` (move diffed props to a new selector, reset source, clear history).

### 3e. Persistence

`persist()` serializes `{tracked, undoStack, redoStack}` to `localStorage["retune-pending-changes"]`, converting Sets/Maps to arrays. `restore()` rebuilds them (re-hydrating Sets/Maps and `groupCounter`). So pending changes survive reloads. Port note: Justify needs an equivalent durable store keyed per page/site.

---

## Stage 4 - Enrichment (`engine/candidates.ts`)

Before output, each `PropertyChange` is enriched into an `EnrichedPropertyChange` with token/class/variable suggestions and cascade source.

`enrichPropertyChanges(changes, tokenMap, selector)`:
- Resolves the DOM element once via `document.querySelector(stripPseudoState(selector))`.
- Skips structural pseudo-props (`property.startsWith("__")` -> `__delete`, `__text`, `__reorder`, etc.).
- For each property runs `resolvePropertyCandidates`:
  - **Recommended candidate:** `findVariableForValue(kebab, to)` looks up a utility/semantic token whose value equals (exact) or is nearest (fuzzy) to `newValue`. Marks `exact` and, if fuzzy, a `distance` string (`nearest: X vs Y`). Type is `utility-class` vs `semantic-token` (via `isRawUtility`).
  - **CSS variables:** `findCssVarsForValue(to, tokenMap)` (max 2). Skipped for `top/right/bottom/left/transform` (false positives). If no utility token but a CSS var matches, the var is promoted to `recommended` (`type: "css-variable"`, name `var(--x)`).
  - **Alternatives:** up to 3 same-category semantic tokens (`getAlternativeVariables`).
  - **Source + conflicts:** `findStyleSources(element, [property])` (Stage 1e); `sources[0]` -> `source`, the rest (up to 3) -> `conflicts` (`{selector, value, important}`).

This is what tells the downstream AI "your new `16px` matches `--space-4` / `.p-4`," and which competing rule might fight the change.

---

## Stage 5 - Output (`engine/output.ts`)

`formatChanges(changes, fidelity, comments?, manifest?)` renders the whole diff as Markdown aimed at an AI coding agent. `Fidelity = "minimal" | "standard" | "full"`.

Flow:
1. Separates bulk instances (`__bulkOf`) from primary changes.
2. Header preamble ("Apply these Retune visual changes to the source code") - variant if comments exist.
3. **Environment block:** URL, viewport (`innerWidth×innerHeight`), ISO timestamp.
4. Design-token system summary (`summarizeTokenSystem`), framework guidance (Tailwind detected -> "use utility classes, not inline styles"), responsive context + breakpoints from manifest, and a manifest component list - all gated by fidelity.
5. **Per element** -> `formatSingleChange`:
   - Heading `` ## `<tag>` "text" ``.
   - `**Source:** file:line:col` (from `sourceFile`) - most important line for the agent.
   - `**Component:** A → B → C` + manifest prop/variant context.
   - `**Styling:**` approach, `**DOM Path:**`, `**Selector:**` with pseudo-state + scope annotations (`parsePseudoState`, `describeSelectorScope` -> `class-scoped, N elements` / `ancestor-scoped` / `id-scoped, unique`).
   - For compound/ancestor selectors, breaks out `**Ancestor context:**` vs `**Target element:**`, or `**Target classes:**` with per-class element counts.
   - Structural actions get their own sections: `__delete` -> "Delete Element", `__reparent` -> "Reparent Element" (parses `selector@index`), `__reorder` -> "Reorder Element", `__text` -> "Edit Text Content" (before/after fenced blocks).
   - **Style changes table:** runs `collapseShorthands` (if all 4 longhands share one from/to, collapse to `padding`/`margin`/`borderWidth`/`borderColor`/`borderStyle`/`borderRadius`), then `enrichPropertyChanges`, then prints a table `| Property | Before | After | Token |`. User's explicit token pick (`variableAssociations`) overrides the recommended column. Base changes first, then `### Override @media (max-width: N)` groups (mapped to manifest breakpoint names).
   - `### Detached Variables` table for `unlinkedProperties` ("hardcode these, do not use the token").
   - `### SVG Attribute Changes` / `### Attribute Changes` table for `attributeChanges` (SVG detected by tag name).
   - `### Prop Changes` table for React `propChanges` (JSON-stringified values).
   - `<details>Resolution context</details>` (standard/full) listing recommended/alternatives/CSS vars/competing rules per property.
6. Comments section (`# Comments`) for element/area comments.

Property names are kebab-cased only here (`camelToKebab`), except `class:` pseudo-props.

---

## End-to-end mapping to Justify's `{selector, property, oldValue, newValue}`

1. **Select element** -> Inspector reads values. Seed `oldValue` from `getScopedStyles(element, selector).styles[prop]` (resolved, var()-expanded, shorthand-expanded). `selector` is the chosen CSS selector for the element.
2. **Edit** -> `LivePreviewEngine.applyChange(selector, property, newValue)` paints it (constructable sheet, `!important`). In parallel `ChangeTracker.recordChange(selector, property, newValue)` records `{from: oldValue, to: newValue}` with undo grouping.
3. **Diff** -> `getPendingChanges()` yields `ElementChange[]`, each a `{selector, ...meta, changes: [{property, from, to, breakpoint?}]}`. Flatten to Justify rows: `{ selector, property, oldValue: from, newValue: to }`.
4. **Enrich (optional)** -> attach recommended token/class/var + cascade source/conflicts per property.
5. **Output** -> `formatChanges(...)` to Markdown for an agent, or emit the flat rows as JSON.

### What Justify must add or can drop
- **Internal camelCase, kebab at the edge.** Keep property keys camelCase through tracking; convert to kebab only when emitting/preview-applying. (Retune uses `camelToKebab`.)
- Breakpoint is a first-class part of the change identity (`selector + property + breakpoint`); Justify's flat model needs to carry it or scope selectors per breakpoint.
- The "edit the class not the element" behavior (`getScopedStyles` + `ownedProperties`) is the single most important nuance: without it, `oldValue` is contaminated by more-specific variant rules and the diff lies.
- Always-`!important` preview + constructable stylesheet is the cleanest reversible-preview design; recommended to copy verbatim.

## Open questions
- **Selector generation is upstream of all six files.** None of these files compute the `selector` itself - they receive it. The selection module (task #10) owns selector synthesis; the diff quality depends entirely on it. Confirm Justify has a comparably robust selector generator, otherwise `getScopedStyles` scoping and preview targeting both degrade.
- **`tokens.ts`, `variables/resolver.ts`, `variables/registry.ts`** are referenced by candidates/output but were out of scope here. The token-matching quality (`findVariableForValue`, `findCssVarsForValue`, framework detection) lives there - flag for a follow-up read if Justify wants the token-suggestion layer, not just raw diffs.
- **React-specific paths** (`_debugSource`, prop changes, manifest) assume a React app with dev-source instrumentation. For Justify on arbitrary sites (e.g. WordPress/PHP), `sourceFile`/`propChanges` will be empty; the CSS-diff + selector + style-source path still works and is the portable core.
- Pseudo-state reads return kebab keys (`getPseudoStateStyles`) while computed/scoped reads return camelCase - normalize on the way into the tracker.
