# 01 - Shell + Theme/Tokens (EXACT spec)

Source of truth (read in full):
- `packages/overlay/src/overlay/Retune.tsx` (4391 lines) - render tree, toolbar, panel shell, tab bar
- `packages/overlay/src/overlay/PropertyPanel.tsx` - Design-tab section composition (also covered in 02)
- `packages/overlay/src/overlay/styles.ts` - one line: `export { default as overlayStyles } from './overlay-css';`
- `packages/overlay/src/overlay/overlay-css.ts` - AUTO-GENERATED from overlay.css (line 1: `// AUTO-GENERATED from overlay.css - do not edit directly.`). Not the source.
- `packages/overlay/src/overlay/overlay.css` (3524 lines) - THE canonical theme + all component CSS
- `packages/overlay/src/inspector/tokens.ts` - NOT the overlay theme; it is the design-token scanner that reads the host page's CSS custom properties. Documented at the end.

Everything is scoped under a Shadow DOM `:host`. Dark mode is `:host(.dark)`.

---

## 1. The complete theme (`:host` block, overlay.css lines 1-151)

### `:host` base (lines 1-11)
```css
:host {
  all: initial;
  font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-feature-settings: 'liga' 1, 'calt' 1, 'zero' 0, 'tnum' 0;
  font-size: 13px;
  letter-spacing: -0.005em;
  color: var(--retune-text);
  line-height: 1.4;
  interpolate-size: allow-keywords;
  user-select: none;
  -webkit-user-select: none;
  ...
}
```
- Base font size **13px**, base letter-spacing **-0.005em**, line-height **1.4**.
- `all: initial` resets all inherited host-page styles.
- `interpolate-size: allow-keywords` enables animating to/from `auto` etc.

### PRIMITIVES - raw palette (never change)

**Black ramp** - base `--retune-black: #1c1917`. Opacity steps generated via `color-mix(in srgb, var(--retune-black) N%, transparent)` for N in **5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95** (lines 18-37). Each token: `--retune-black-5` through `--retune-black-95`.

**White ramp** - base `--retune-white: #ffffff`. Same opacity steps 5 through 95 via `color-mix(in srgb, var(--retune-white) N%, transparent)` to `--retune-white-5` through `--retune-white-95` (lines 40-59).

**Blue ramp (Figma blue)** (lines 62-71):
```
--retune-blue-100:  #F2F9FF
--retune-blue-200:  #E5F4FF
--retune-blue-300:  #BDE3FF
--retune-blue-400:  #80CAFF
--retune-blue-500:  #0D99FF
--retune-blue-600:  #007BE5
--retune-blue-700:  #0768CF
--retune-blue-800:  #034AC1
--retune-blue-900:  #093077
--retune-blue-1000: #0D193F
```

**Red ramp (Tailwind-ish red)** (lines 74-83):
```
--retune-red-100:  #FFF5F5
--retune-red-200:  #FFE2E0
--retune-red-300:  #FFC7C2
--retune-red-400:  #FFAFA3
--retune-red-500:  #F24822
--retune-red-600:  #DC3412
--retune-red-700:  #BD2915
--retune-red-800:  #9F1F18
--retune-red-900:  #771208
--retune-red-1000: #660E0B
```

### SEMANTIC tokens - light mode (lines 89-119)
```
--retune-always-white: #ffffff
--retune-always-black: #1c1917

--retune-text:            var(--retune-black-90)
--retune-text-secondary:  var(--retune-black-70)
--retune-text-tertiary:   var(--retune-black-50)
--retune-text-disabled:   var(--retune-black-25)

--retune-surface:         var(--retune-white)
--retune-surface-hover:   var(--retune-black-5)
--retune-surface-active:  var(--retune-black-5)
--retune-input-bg:        var(--retune-black-5)
--retune-input-bg-hover:  var(--retune-black-10)

--retune-border:          var(--retune-black-10)
--retune-border-hover:    var(--retune-black-15)
--retune-border-subtle:   var(--retune-black-5)
--retune-shadow:          var(--retune-black-10)

--retune-blue:            var(--retune-blue-500)
--retune-blue-text:       var(--retune-blue-700)
--retune-blue-bg:         var(--retune-blue-200)
--retune-blue-bg-hover:   var(--retune-blue-100)

--retune-red:             var(--retune-red-500)
```

### SEMANTIC tokens - dark mode override `:host(.dark)` (lines 125-151)
Only these semantic tokens are swapped (primitives unchanged):
```
--retune-text:            var(--retune-white-90)
--retune-text-secondary:  var(--retune-white-70)
--retune-text-tertiary:   var(--retune-white-50)
--retune-text-disabled:   var(--retune-white-25)

--retune-surface:         color-mix(in srgb, var(--retune-black) 95%, var(--retune-white))
--retune-surface-hover:   var(--retune-white-5)
--retune-surface-active:  var(--retune-white-5)
--retune-input-bg:        var(--retune-white-5)
--retune-input-bg-hover:  var(--retune-white-10)

--retune-border:          var(--retune-white-10)
--retune-border-hover:    var(--retune-white-15)
--retune-border-subtle:   var(--retune-white-5)
--retune-shadow:          var(--retune-white-5)

--retune-blue-text:       var(--retune-blue-500)
--retune-blue-bg:         color-mix(in srgb, var(--retune-blue-700) 50%, transparent)
--retune-blue-bg-hover:   color-mix(in srgb, var(--retune-blue-700) 75%, transparent)
```
(`--retune-blue`, `--retune-red` keep their light values in dark mode.)

### Global resets (lines 153-157)
```css
* { box-sizing: border-box; margin: 0; padding: 0; }
input, textarea, [contenteditable] { user-select: text; -webkit-user-select: text; }
```

### Notable hardcoded colors (NOT tokenized - reproduce verbatim)
- Component-name text accent: `#3b82f6` (`.retune-el-component` line 452; grid-picker selected `#3b82f6` line 1073; pin-center-dot `#3b82f6` line 1172; active dots `#3b82f6`).
- Grid-picker preview cell `#93c5fd` (line 1077); grid-picker hover `#eeeceb` (line 1006).
- Dark dropdown/menu surface: hardcoded `#1c1917` (`.retune-menu-scroll` 2456; `.retune-variable-picker` 2757; scroll-indicator 2552). Menu separator line `#292524`.
- Tooltip surface hardcoded `#1e1e1e` (line 2578).
- Focus glow on inputs: `box-shadow: 0 0 0 1.5px rgba(59, 130, 246, 0.5)`; search variant `0 0 0 2px rgba(59,130,246,0.15)`.
- Changes-dot gradient: `radial-gradient(circle at center, #fff 1px, #0D99FF 1px)` (line 237).

### Recurring magic numbers (the design language)
- **Standard control height: 32px** (every input, button, select, slider, segmented item, swatch).
- **Standard control radius: 8px**. Larger shells: panel/toolbar/settings/comment-popover **16px**; floating dialog **12px**; menus 10-12px; small chips/badges 4-5px; tab pill 8px.
- **Icon button size: 32x32** with internal icon 20px (toolbar) or 16-24px.
- **Section header height: 44px**; toolbar height **44px**.
- **Standard easing: `cubic-bezier(0.23, 1, 0.32, 1)`** for enters; common durations 0.15s / 0.12s / 0.2s / 150ms / 250ms.
- **z-index: `2147483647`** (max int) for all floating surfaces (toolbar, panel, settings, dialogs, tooltips, popovers). Snap guides use `2147483645`/`2147483646`; comment markers `2147483646`; area outline `2147483639`, area handle `2147483640`.
- Standard small box-shadow: `0 2px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)` (toolbar, panel, settings, comment marker, comment popover).

---

## 2. Panel shell - container structure, dimensions, positioning

### React render tree (Retune.tsx `RetuneInner`, return at line 3932)
Everything renders through `createPortal(...)` into a Shadow-DOM mount (`mountOverlay()`), wrapped in two context providers:
```
createPortal(
  <PreviewBridgeContext.Provider value={previewBridgeRef.current}>
  <TooltipPortalContext.Provider value={portalTarget}>
    <div class="retune-toolbar bottom {side} {expanded|collapsed}"> ... </div>   // floating toolbar
    <AnimatedPanel visible={active && selectedElement && !settingsOpen && !toolbarDragging && mode==="edit"}>
      <div class="retune-panel {side}">
        <div class="retune-tab-bar"> tab-pill + Elements btn + Design btn + version span </div>
        <div class="retune-panel-body"> banners + (ElementTree | ComponentSection+PropertyPanel) </div>
      </div>
    </AnimatedPanel>
    {settings && <SettingsPanel .../>}
    {hoveredBoxModel && <BoxModelOverlay .../>}
    {comments.map(CommentMarker)}
    ...
  </...>
)
```

### Panel container `.retune-panel` (overlay.css 377-437)
```css
.retune-panel {
  position: fixed;
  z-index: 2147483647;
  pointer-events: auto;
  background: var(--retune-surface);
  border: none;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04);
  width: 280px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  overscroll-behavior: none;
}
.retune-panel.right { right: 16px; bottom: 68px; }
.retune-panel.left  { left: 16px;  bottom: 68px; }
.retune-panel { height: calc(100vh - 84px); }
```
- **Fixed width 280px.** Height `calc(100vh - 84px)`. Anchored 16px from chosen side, **68px** from bottom (clears the 44px toolbar that sits 16px from bottom, with an 8px gap).
- `side` is `"right" | "left"`, persisted in `localStorage["retune-panel-side"]`, default from `config.position`.

### Panel body `.retune-panel-body` (392-399)
```css
.retune-panel-body { flex: 1; overflow-y: auto; overflow-x: clip; scrollbar-width: none; }
.retune-panel-body::-webkit-scrollbar { display: none; }
```
Scroll lives on the body; the tab bar is `flex-shrink: 0` and stays pinned.

### Panel enter/exit animation (`AnimatedPanel`, Retune.tsx 74-105; CSS 401-433)
- `PANEL_ANIMATION_MS = 150`. State machine: hidden -> entering -> visible -> exiting -> hidden. Children snapshot is kept during exit so content stays visible while animating out.
```css
.retune-panel-anim { display: contents; }
.retune-panel-anim.entering .retune-panel { animation: retune-panel-in  0.15s cubic-bezier(0.23,1,0.32,1) both; }
.retune-panel-anim.exiting  .retune-panel { animation: retune-panel-out 0.15s cubic-bezier(0.23,1,0.32,1) both; }
@keyframes retune-panel-in  { from {opacity:0; transform:translateY(12px);} to {opacity:1; transform:translateY(0);} }
@keyframes retune-panel-out { from {opacity:1; transform:translateY(0);}    to {opacity:0; transform:translateY(12px);} }
```
Panel shows only when `active && selectedElement && !settingsOpen && !toolbarDragging && mode === "edit"`.

### Responsive + dev gates
- `MIN_VIEWPORT_WIDTH = 768`. Below 768px the whole `Retune` returns null (Retune.tsx 107, 305-317).
- Dev-mode gate: renders only when `NODE_ENV==="development"` or Vite `import.meta.env.DEV`, unless `props.force` (Retune.tsx 300-303).

---

## 3. Floating toolbar (the launcher)

### `.retune-toolbar` (overlay.css 165-205)
```css
.retune-toolbar {
  position: fixed;
  z-index: 2147483647;
  pointer-events: auto;
  background: var(--retune-surface);
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04);
  height: 44px;
  padding: 6px;
  display: flex; align-items: center; gap: 6px;
  user-select: none; overflow: hidden; cursor: default;
  transition: padding/gap/width 0.2s cubic-bezier(0.23,1,0.32,1), background 0.15s ease;
}
.retune-toolbar.collapsed { padding: 0; gap: 0; width: 44px; cursor: pointer; overflow: visible;
  transition: transform 100ms ease, background 0.15s ease; }
.retune-toolbar.collapsed:active { transform: scale(0.97); }
.retune-toolbar.top.right    { top: 16px; right: 16px; }
.retune-toolbar.top.left     { top: 16px; left: 16px; }
.retune-toolbar.bottom.right { bottom: 16px; right: 16px; }
.retune-toolbar.bottom.left  { bottom: 16px; left: 16px; }
```
- Collapsed = single 44x44 round launcher (the Retune logo). Expanded = horizontal pill of action buttons, gap 6px, padding 6px.
- Class is always `retune-toolbar bottom {side} {expanded|collapsed}` (Retune.tsx 3938). Code only renders `bottom`.

### Collapse button `.retune-toolbar-collapse-btn` (208-228)
44x44, `border-radius: 50%`, padding 12px (icon 20px), transparent bg, color `--retune-text`. When expanded it shrinks to 0x0, opacity 0, `filter: blur(8px)`, `transform: scale(0.8)` (242-252). Holds animated `<RetuneLogo>` (bloom hover effect, Retune.tsx 586-700) and a `.retune-changes-dot` (12x12 radial-gradient dot) when collapsed with pending changes.

### Expanded inner `.retune-toolbar-expanded` (255-272) + buttons (275-374)
- `.retune-toolbar-expanded`: flex, gap 6px, `max-width: 300px`, animates width/opacity/gap. Collapsed -> max-width 0, opacity 0.
- `.retune-toolbar-btn`: 32x32, `border-radius: 10px`, transparent, padding 6px; hover `--retune-surface-hover`; `.active` bg `--retune-surface-hover`; `.disabled`/`:disabled` opacity 0.2.
- Staggered entrance: children nth-child 1-5 animate `retune-icon-in` (blur(2px)+scale(0.9) -> clear) at 0/20/40/60/80ms (302-316).
- `.retune-edit-count`: blue pill (min-width 32, h 32, radius 10, bg `--retune-blue`, color `--retune-always-white`, font 13px/500) showing `changeCount + commentCount` (Retune.tsx 3957).
- `.retune-toolbar-divider`: 1px x 20px `--retune-border` (3459-3464).
- `.retune-icon-swap`: 20x20 relative; two stacked icons cross-fade (copy <-> check) via `.in`/`.out` (opacity+scale(0.5->1)+blur) for the copy-confirm animation (328-358).

### Toolbar button order (Retune.tsx 3955-4033)
1. (conditional) edit-count pill + divider
2. Edit mode - `IconCursor1` (shortcut V)
3. Comment mode - custom `IconComment` (shortcut C)
4. Copy changes - `IconSquareBehindSquare6` <-> `IconCheckCircle2` swap (Cmd+C), disabled when no changes/comments
5. Reset all - `IconBroom`, disabled when none
6. Settings - `IconSettingsGear2`
7. Close - `IconCrossMedium` (Esc)

All buttons wrapped in `<Tooltip content shortcut side="top">`.

---

## 4. The Elements / Design tab structure

### Tab bar `.retune-tab-bar` (overlay.css 619-661) + JSX (Retune.tsx 4039-4050)
```css
.retune-tab-bar { display: flex; position: relative; padding: 8px; flex-shrink: 0;
  border-bottom: 1px solid var(--retune-border); }
.retune-tab-pill { position: absolute; top: 8px; left: 0; height: calc(100% - 16px);
  border-radius: 8px; background: var(--retune-input-bg);
  transition: transform 0.2s cubic-bezier(0.23,1,0.32,1), width 0.2s cubic-bezier(0.23,1,0.32,1);
  pointer-events: none; }
.retune-tab { width: auto; padding: 8px 12px; border: none; border-radius: 8px; background: none;
  font-family: inherit; font-size: 12px; font-weight: 500; color: var(--retune-text-tertiary);
  cursor: pointer; position: relative; z-index: 1; transition: color 0.15s; text-align: center; }
.retune-tab:hover  { color: var(--retune-text-secondary); }
.retune-tab.active { color: var(--retune-text); }
```
JSX:
```jsx
<div className="retune-tab-bar" ref={tabBarRef}>
  <div className="retune-tab-pill" ref={tabPillRef} />
  <button className={`retune-tab${panelTab==="elements"?" active":""}`} onClick={()=>setPanelTab("elements")}>Elements</button>
  <button className={`retune-tab${panelTab==="design"?" active":""}`}   onClick={()=>setPanelTab("design")}>Design</button>
  <span style={{marginLeft:"auto", fontSize:"11px", lineHeight:"16px", color:"var(--retune-text-tertiary)",
        letterSpacing:"-0.005em", paddingRight:"8px", display:"flex", alignItems:"center", gap:"4px", ...}}>
    {updateInfo && <span style={{width:4,height:4,borderRadius:"50%",background:"var(--retune-blue)"}}/>}
    v{version}
  </span>
</div>
```
- Two tabs: **Elements** (index 0) and **Design** (index 1). Default tab = **design** (`useState(... "design")`, Retune.tsx 895).
- Right-aligned version label `v{...}` with optional blue update dot; clicking it un-dismisses the update banner.

### Tab pill animation (Retune.tsx 2243-2268)
A sliding pill (`.retune-tab-pill`) tracks the active tab: measures active `.retune-tab` button rect vs bar rect, sets `pill.style.width` and `transform: translateX(offsetX)`. First render is jumpless (`transition: none` + forced reflow via `pill.offsetHeight`), subsequent changes animate. Recomputed on `[panelTab, selectedElement]`.

### Tab body switching (Retune.tsx 4051-4209)
Inside `.retune-panel-body`:
- Always: update `<PanelBanner>` (visible when an update is available and not dismissed).
- `panelTab === "elements"` -> `<ElementTree ... />` (DOM tree with select/hover/reorder/reparent).
- `panelTab === "design" && selectedElement` -> fragment of:
  - manifest banners (PanelBanner): "Unlock your design system" (no manifest) and "Know your components" (tokens but no components key, component selected),
  - `<ComponentSection ...>` (React component props/state, when manifest+reactProps present),
  - `<PropertyPanel key={selectedElement.selector} ...>` - the actual CSS property sections (see 02).

**The "Design side"** = the `panelTab === "design"` branch. It renders as: optional banners -> ComponentSection -> PropertyPanel, all stacked vertically inside the scrolling `.retune-panel-body`. PropertyPanel is re-keyed by `selectedElement.selector` so it fully remounts on selection change.

---

## 5. Settings panel (overlay of the design panel)

`.retune-settings-panel` (overlay.css 2970-2991): same 280px width, `border-radius: 16px`, same shadow, `bottom: 68px`, `max-height: calc(100vh - 84px)`, `height: auto`, side via `.right{right:16px}` / `.left{left:16px}`. Enter `retune-settings-in` 250ms `cubic-bezier(0.5,0,0,1)` (translateY(8px)+blur(4px) -> none); exit `retune-settings-out`. Rendered separately (Retune.tsx 4215-4225) when `active && settingsVisible && !toolbarDragging`. Theme is `"system" | "light" | "dark"`, persisted in `localStorage["retune-theme"]`, applied by toggling `.dark` on the shadow host (Retune.tsx 900-927). Contains rows (`.retune-settings-row`, padding 8px 16px), a `.retune-switch` toggle (36x20, knob 16x16, on -> bg `--retune-blue`), keyboard-shortcut `.retune-key` badges, and a `.retune-settings-header` with back button.

---

## 6. Dark-mode shell shadows (overlay.css 573-602)
In dark mode, panel/settings/toolbar/floating-dialog/comment-popover get a 1px solid `--retune-black` border plus an inset white hairline:
```css
:host(.dark) .retune-panel, ... {
  border: 1px solid var(--retune-black);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 10%),
              0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
}
```

---

## 7. `inspector/tokens.ts` - design-token SCANNER (not the overlay theme)
This file does NOT define the overlay's own theme. It scans the **host page** for CSS custom properties so the inspector can map a computed value back to a token name.
- `interface DesignToken { name; value; source }`, `interface TokenMap { tokens: DesignToken[]; valueToTokens: Map<string,string[]> }`.
- `scanDesignTokens()`: walks `document.styleSheets` (handles `CSSStyleRule` + `CSSMediaRule`), extracts every `--*` custom property via `extractTokensFromRule`, resolves them against `:root`/`body` computed styles, builds a reverse `value -> [tokenNames]` map. Cross-origin sheets are skipped (try/catch).
- `normalizeValue()`: trims, lowercases, normalizes `rgb()/rgba()` to `rgb(r, g, b)` for comparison.
- `findTokensForValue(value, tokenMap)`: reverse lookup.
- `detectStylingApproach(element)`: returns `"tailwind" | "css-modules" | "styled-components" | "css-in-js" | "plain-css" | "unknown"` via class-name heuristics (Tailwind regex needs >=3 matches or >50% of classes; CSS-modules `name_name__hash`; styled/emotion `sc-`/`css-` or `[data-styled]`).
- `summarizeTokenSystem(tokenMap)`: human summary of top token prefixes.

For the port, this is the "detect the host project's tokens" capability, independent of our own theme.

---

## Open questions for the build plan
- Our reproduction target (Justify) is injected into the live page, not necessarily a Shadow DOM. The `:host` / `:host(.dark)` scoping must be re-homed (e.g., a `.justify-root` scope class) and `all: initial` re-evaluated. Shadow DOM gives Retune full isolation we may not have.
- `interpolate-size: allow-keywords` and `color-mix` are modern-only; confirm browser target.
- The version label, update banner, and manifest banners are Retune-product-specific; likely omitted in the port.
