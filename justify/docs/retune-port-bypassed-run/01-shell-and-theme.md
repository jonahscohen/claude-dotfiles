# Retune Port Spec 01 - Shell and Theme

Reference-extraction spec for the Retune overlay's **panel shell/container, header, Elements/Design tab structure, overall dimensions, positioning, and the complete theme** (every color, token, font, radius, shadow, z-index). Goal: 1:1 reproduction in another tool.

Source files (all under `packages/overlay/src/`):
- `overlay/Retune.tsx` - the React root: mount, toolbar, panel, tabs, render tree.
- `overlay/PropertyPanel.tsx` - Design-tab section orchestrator (covered here at structural level only; per-section specs are separate).
- `overlay/styles.ts` - re-exports raw CSS string only.
- `overlay/overlay.css` - the authoritative stylesheet (also mirrored verbatim into `overlay-css.ts` as an auto-generated string).
- `overlay/overlay-css.ts` - `// AUTO-GENERATED from overlay.css - do not edit directly.` Identical content; do NOT edit, edit `overlay.css`.
- `inspector/tokens.ts` - design-token *scanner* for the user's page. Not the overlay's own theme. (See "Note on tokens.ts" below.)
- `overlay/mount.tsx` - Shadow DOM host setup (read additionally; referenced where load-bearing).
- `ui/section.tsx` - Section/Row/Field/RowAction layout primitives (read additionally).

---

## 1. Host / mount architecture (`mount.tsx`)

The entire overlay lives in a **shadow-DOM-isolated subtree**. To reproduce, replicate this isolation boundary.

- A host `<div data-retune-host>` is appended to `document.documentElement` with inline cssText:
  ```
  position: fixed; top: 0; left: 0; width: 0; height: 0;
  z-index: 2147483647; pointer-events: none;
  ```
- `host.attachShadow({ mode: "open" })`.
- The stylesheet is applied via a constructed `CSSStyleSheet` + `root.adoptedStyleSheets = [sheet]` (content = `overlay-css.ts` string).
- React portals into `<div data-retune-container>` appended inside the shadow root.
- Inter is loaded by injecting `<link rel="preconnect" href="https://rsms.me/">` and `<link rel="stylesheet" href="https://rsms.me/inter/inter.css" data-retune-font>` into `document.head`.
- Events `click, pointerdown, mousedown, focusin, focusout` originating inside the shadow root are `stopPropagation()`-ed at the host (so app "close on outside click" handlers don't fire). Events whose `composedPath()[0] === host` (the element picker) pass through.

Dark mode is driven by toggling `.dark` on the **shadow host element** (not the container): `host.classList.toggle("dark", isDark)` where `isDark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches)`. CSS targets it via `:host(.dark)`.

---

## 2. `:host` base (the theme root) - `overlay.css` lines 1-120

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
  /* token definitions follow */
}
* { box-sizing: border-box; margin: 0; padding: 0; }
input, textarea, [contenteditable] { user-select: text; -webkit-user-select: text; }
```

Base typography defaults applied to every overlay node: `font-size: 13px`, `letter-spacing: -0.005em`, `line-height: 1.4`, font-family chain above. `all: initial` resets inherited page styles.

### 2.1 Primitive palette tokens (never change between modes)

**Black ramp** - base `--retune-black: #1c1917`. Steps 5..95 in increments of 5, each `color-mix(in srgb, var(--retune-black) N%, transparent)`:
`--retune-black-5 ... --retune-black-95` (5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95).

**White ramp** - base `--retune-white: #ffffff`. Same 5..95 steps, `color-mix(in srgb, var(--retune-white) N%, transparent)`:
`--retune-white-5 ... --retune-white-95`.

**Blue ramp (Figma blue):**
```
--retune-blue-100: #F2F9FF;  --retune-blue-200: #E5F4FF;  --retune-blue-300: #BDE3FF;
--retune-blue-400: #80CAFF;  --retune-blue-500: #0D99FF;  --retune-blue-600: #007BE5;
--retune-blue-700: #0768CF;  --retune-blue-800: #034AC1;  --retune-blue-900: #093077;
--retune-blue-1000: #0D193F;
```

**Red ramp (Tailwind red):**
```
--retune-red-100: #FFF5F5;  --retune-red-200: #FFE2E0;  --retune-red-300: #FFC7C2;
--retune-red-400: #FFAFA3;  --retune-red-500: #F24822;  --retune-red-600: #DC3412;
--retune-red-700: #BD2915;  --retune-red-800: #9F1F18;  --retune-red-900: #771208;
--retune-red-1000: #660E0B;
```

### 2.2 Semantic tokens - LIGHT (the `:host` defaults)

| Token | Value (light) |
|---|---|
| `--retune-always-white` | `#ffffff` |
| `--retune-always-black` | `#1c1917` |
| `--retune-text` | `var(--retune-black-90)` |
| `--retune-text-secondary` | `var(--retune-black-70)` |
| `--retune-text-tertiary` | `var(--retune-black-50)` |
| `--retune-text-disabled` | `var(--retune-black-25)` |
| `--retune-surface` | `var(--retune-white)` (#ffffff) |
| `--retune-surface-hover` | `var(--retune-black-5)` |
| `--retune-surface-active` | `var(--retune-black-5)` |
| `--retune-input-bg` | `var(--retune-black-5)` |
| `--retune-input-bg-hover` | `var(--retune-black-10)` |
| `--retune-border` | `var(--retune-black-10)` |
| `--retune-border-hover` | `var(--retune-black-15)` |
| `--retune-border-subtle` | `var(--retune-black-5)` |
| `--retune-shadow` | `var(--retune-black-10)` |
| `--retune-blue` | `var(--retune-blue-500)` (#0D99FF) |
| `--retune-blue-text` | `var(--retune-blue-700)` (#0768CF) |
| `--retune-blue-bg` | `var(--retune-blue-200)` (#E5F4FF) |
| `--retune-blue-bg-hover` | `var(--retune-blue-100)` (#F2F9FF) |
| `--retune-red` | `var(--retune-red-500)` (#F24822) |

### 2.3 Semantic tokens - DARK (`:host(.dark)`, lines 125-151). Only these override; primitives + always-* stay.

| Token | Value (dark) |
|---|---|
| `--retune-text` | `var(--retune-white-90)` |
| `--retune-text-secondary` | `var(--retune-white-70)` |
| `--retune-text-tertiary` | `var(--retune-white-50)` |
| `--retune-text-disabled` | `var(--retune-white-25)` |
| `--retune-surface` | `color-mix(in srgb, var(--retune-black) 95%, var(--retune-white))` |
| `--retune-surface-hover` | `var(--retune-white-5)` |
| `--retune-surface-active` | `var(--retune-white-5)` |
| `--retune-input-bg` | `var(--retune-white-5)` |
| `--retune-input-bg-hover` | `var(--retune-white-10)` |
| `--retune-border` | `var(--retune-white-10)` |
| `--retune-border-hover` | `var(--retune-white-15)` |
| `--retune-border-subtle` | `var(--retune-white-5)` |
| `--retune-shadow` | `var(--retune-white-5)` |
| `--retune-blue-text` | `var(--retune-blue-500)` (#0D99FF) |
| `--retune-blue-bg` | `color-mix(in srgb, var(--retune-blue-700) 50%, transparent)` |
| `--retune-blue-bg-hover` | `color-mix(in srgb, var(--retune-blue-700) 75%, transparent)` |

> NOTE: a handful of element rules hardcode hex instead of tokens: `.retune-el-component` color `#3b82f6`, `.retune-grid-picker-cell.selected` `#3b82f6`, `.retune-grid-picker-cell.preview` `#93c5fd`, `.retune-pin-center-dot` `#3b82f6`, `.retune-grid-picker-preview:hover` bg `#eeeceb`, `.retune-changes-dot` gradient stop `#0D99FF`, tooltip background `#1e1e1e`. The blue focus rings use literal `rgba(59, 130, 246, ...)`.

---

## 3. Z-index, fonts, radii - global constants

- **Z-index:** every fixed overlay surface uses `z-index: 2147483647` (max int). Host, toolbar, panel, floating dialog, tooltip, comment popover all use it. Internal layering uses small values (dropdown menus `100`, tree drop indicator `10`, selector bridge `-1`).
- **Font family (two variants in use):**
  - Primary chain (host + most controls): `InterVariable, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`. Some controls re-declare it explicitly (`.retune-selector-tag-count`, `.retune-selector-tag-name`).
  - `.retune-floating-dialog` uses a shorter chain: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`.
  - Monospace (grid picker labels): `ui-monospace, monospace`.
- **Standard easing:** `cubic-bezier(0.23, 1, 0.32, 1)` (used for nearly all enter/transition animations).
- **Animation duration constant:** `PANEL_ANIMATION_MS = 150` (Retune.tsx line 72) - matches the 0.15s CSS keyframes.
- **Radii in shell:** toolbar & panel `16px`; tab pill / tab / section-action / row-action `8px`; toolbar-btn `10px`; edit-count `10px`; tooltip `5px`; floating-dialog `12px`; dropdown-menu `10px`; pin-center-btn `8px`.

---

## 4. Toolbar (the collapsed/expanded floating pill)

### 4.1 JSX (`Retune.tsx` lines 3936-4034)

```
<div ref={toolbarRef}
     className={`retune-toolbar bottom ${side} ${active ? "expanded" : "collapsed"}`}
     onPointerDown/Move/Up={handleToolbar...}>
  <Tooltip content="Toggle edit mode" shortcut={config.hotkey} side="top">
    <button className="retune-toolbar-collapse-btn" onClick={activateOverlay}>
      <RetuneLogo size={20} />
      {!active && changeCount > 0 && <span className="retune-changes-dot" />}
    </button>
  </Tooltip>
  <div className="retune-toolbar-expanded">
    {(changeCount>0||commentCount>0) && <div className="retune-edit-count">{changeCount+commentCount}</div>}
    {(changeCount>0||commentCount>0) && <div className="retune-toolbar-divider" />}
    <Tooltip content="Edit mode"    shortcut="V"  side="top"><button className="retune-toolbar-btn[ active]" ><IconCursor1 size={20}/></button></Tooltip>
    <Tooltip content="Comment mode" shortcut="C"  side="top"><button className="retune-toolbar-btn[ active]" ><IconComment size={20}/></button></Tooltip>
    <Tooltip content="Copy changes" shortcut="Cmd+C" side="top">
      <button className="retune-toolbar-btn[ disabled]" disabled={changeCount===0&&commentCount===0}>
        <span className="retune-icon-swap">
          <span className="retune-icon-swap-icon in|out"><IconSquareBehindSquare6 size={20}/></span>
          <span className="retune-icon-swap-icon out|in"><IconCheckCircle2 size={20}/></span>
        </span>
      </button>
    </Tooltip>
    <Tooltip content="Reset all"    side="top"><button className="retune-toolbar-btn[ disabled]"><IconBroom size={20}/></button></Tooltip>
    <Tooltip content="Settings"     side="top"><button className="retune-toolbar-btn"><IconSettingsGear2 size={20}/></button></Tooltip>
    <Tooltip content="Close" shortcut="Esc" side="top"><button className="retune-toolbar-btn"><IconCrossMedium size={20}/></button></Tooltip>
  </div>
</div>
```
(The Copy tooltip's real shortcut string is the Cmd glyph + C.)

Position classes are `retune-toolbar bottom right` / `bottom left` by default (config.position default `"bottom-right"`). The `top`/`left` variants exist in CSS but the JSX always emits `bottom`.

### 4.2 Toolbar styles (`overlay.css` lines 165-374)

`.retune-toolbar`: `position: fixed; z-index: 2147483647; pointer-events: auto; background: var(--retune-surface); border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04); height: 44px; padding: 6px; display: flex; align-items: center; gap: 6px; overflow: hidden; cursor: default;` Transition: `padding/gap/width 0.2s cubic-bezier(0.23,1,0.32,1), background 0.15s ease`.

Position offsets (16px from edges): `.top.right{top:16px;right:16px}`, `.top.left{top:16px;left:16px}`, `.bottom.right{bottom:16px;right:16px}`, `.bottom.left{bottom:16px;left:16px}`.

`.retune-toolbar.collapsed`: `padding:0; gap:0; width:44px; cursor:pointer; overflow:visible; transition: transform 100ms ease, background 0.15s ease`. `:active` -> `transform: scale(0.97)`. `:hover` -> `background: var(--retune-surface)` (no change, intentional).

`.retune-toolbar-collapse-btn`: `position:relative; display:flex; align/justify center; border:none; border-radius:50%; cursor:pointer; color:var(--retune-text); padding:12px; width:44px; height:44px; background:transparent; flex-shrink:0`. Transition on width/height/padding/opacity/filter/transform 0.2s standard easing. When `.expanded` parent: collapses to `width:0;height:0;padding:0;opacity:0;filter:blur(8px);transform:scale(0.8);overflow:hidden;pointer-events:none;position:absolute`.

`.retune-changes-dot`: `position:absolute; top:0; right:0; width:12px; height:12px; border-radius:50%; background: radial-gradient(circle at center, #fff 1px, #0D99FF 1px); pointer-events:none`.

`.retune-toolbar-expanded`: `display:flex; align-items:center; gap:6px; max-width:300px; overflow:hidden`; transition max-width/opacity/gap. When parent `.collapsed`: `max-width:0; opacity:0; pointer-events:none; gap:0`.

`.retune-toolbar-btn`: `display:flex; align/justify center; width:32px; height:32px; border:none; border-radius:10px; background:transparent; cursor:pointer; color:var(--retune-text); padding:6px; flex-shrink:0; position:relative; transition: background 0.12s ease`. `:hover` -> `background: var(--retune-surface-hover)`. `.disabled, :disabled` -> `opacity:0.2; cursor:default; pointer-events:none`. Active mode buttons toggle `.active`.

`.retune-edit-count`: `font-size:13px; font-weight:500; background:var(--retune-blue); color:var(--retune-always-white); min-width:32px; height:32px; border-radius:10px; display:flex; center; padding:0 10px; flex-shrink:0; animation: retune-icon-in 0.15s standard backwards`.

`.retune-toolbar-divider` (line 3459): `width:1px; height:20px; background:var(--retune-border); flex-shrink:0`.

Entry stagger: `.retune-toolbar.expanded .retune-toolbar-expanded > :nth-child(n)` animate `retune-icon-in 0.15s standard {0,20,40,60,80}ms backwards`.

`@keyframes retune-icon-in { from{filter:blur(2px);transform:scale(0.9)} to{filter:blur(0);transform:scale(1)} }`.

Icon-swap (Copy vs Check): `.retune-icon-swap` 20x20 relative; `.retune-icon-swap-icon` absolute, transition opacity/transform/filter 150ms standard; `.in{opacity:1;transform:scale(1);filter:blur(0);transition-delay:75ms}`; `.out{opacity:0;transform:scale(0.5);filter:blur(2px);pointer-events:none;transition-delay:0ms}`.

### 4.3 Toolbar behavior

- Drag-to-snap (`handleToolbarPointerDown/Move/Up`, lines 2280-2349+): pointer drag with 5px deadzone, captures pointer, animates via inline `transform: translateX()`. On release: flick detection `FLICK_THRESHOLD = 0.4 px/ms` (velocity sign decides side) else position vs `window.innerWidth/2`. Then FLIP-animates to the snapped `bottom right`/`bottom left`. Side persisted to `localStorage["retune-panel-side"]`.
- `RetuneLogo` (lines 586-699): a 20x20 SVG of 16 `rect`s (2x2 each) all `fill="currentColor"`. On hover of `.retune-toolbar-collapse-btn` it runs a JS "bloom" animation: random oklch/hsl colors flash sequentially (stagger 45ms, flash 300ms, pause 200ms) via an SVG filter `#retune-bloom` (feGaussianBlur + feColorMatrix bloom). Exact rect coordinates are in source (sq1..sq14L/R).

---

## 5. Panel shell (the Design panel)

### 5.1 Mount/visibility (`Retune.tsx` line 4037)

```
<AnimatedPanel visible={!!(active && selectedElement && !settingsOpen && !toolbarDragging && mode === "edit")}>
  <div className={`retune-panel ${side}`}>
    ...tab bar + body...
  </div>
</AnimatedPanel>
```

`AnimatedPanel` (lines 74-105) wraps in `<div className="retune-panel-anim {entering|exiting|''}">`, state machine hidden -> entering -> visible -> exiting with `PANEL_ANIMATION_MS=150` timers. Keeps a `childrenRef` snapshot so exit animation still shows content. `.retune-panel-anim{display:contents}`.

The panel only renders when overlay is active, an element is selected, settings closed, not dragging, and mode is `edit` (comment mode hides it).

### 5.2 Panel styles (`overlay.css` lines 377-437)

`.retune-panel`: `position:fixed; z-index:2147483647; pointer-events:auto; background:var(--retune-surface); border:none; border-radius:16px; box-shadow:0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04); width:280px; display:flex; flex-direction:column; overflow:hidden; overscroll-behavior:none`.

Positioning: `.retune-panel.right{right:16px;bottom:68px}`, `.retune-panel.left{left:16px;bottom:68px}`, and unconditional `.retune-panel{height: calc(100vh - 84px)}`. (bottom 68px = 16px edge + 44px toolbar + 8px gap; 84px = 68 + 16.)

`.retune-panel-body`: `flex:1; overflow-y:auto; overflow-x:clip; scrollbar-width:none`; `::-webkit-scrollbar{display:none}`.

Enter/exit animations:
```css
.retune-panel-anim.entering .retune-panel { animation: retune-panel-in 0.15s cubic-bezier(0.23,1,0.32,1) both; }
.retune-panel-anim.exiting  .retune-panel { animation: retune-panel-out 0.15s cubic-bezier(0.23,1,0.32,1) both; }
@keyframes retune-panel-in  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes retune-panel-out { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(12px)} }
```

### 5.3 Dark-mode shell shadows (`overlay.css` lines 573-591)

`:host(.dark) .retune-panel, .retune-settings-panel, .retune-toolbar, .retune-floating-dialog, .retune-comment-popover`:
```
border: 1px solid var(--retune-black);
box-shadow: inset 0 0 0 1px rgb(255 255 255 / 10%), 0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
```

---

## 6. Tab bar (Elements / Design) - the header of the panel

### 6.1 JSX (`Retune.tsx` lines 4039-4050)

```
<div className="retune-tab-bar" ref={tabBarRef}>
  <div className="retune-tab-pill" ref={tabPillRef} />
  <button className={`retune-tab${panelTab==="elements"?" active":""}`} onClick={()=>setPanelTab("elements")}>Elements</button>
  <button className={`retune-tab${panelTab==="design"?" active":""}`} onClick={()=>setPanelTab("design")}>Design</button>
  <span onClick={...reopen update banner...}
        style={{ marginLeft:"auto", fontSize:"11px", lineHeight:"16px", color:"var(--retune-text-tertiary)",
                 letterSpacing:"-0.005em", paddingRight:"8px", display:"flex", alignItems:"center",
                 gap:"4px", cursor: updateInfo ? "pointer":"default" }}>
    {updateInfo && <span style={{width:4,height:4,borderRadius:"50%",background:"var(--retune-blue)",flexShrink:0}}/>}
    v{updateInfo?.current || __RETUNE_VERSION__ || ""}
  </span>
</div>
```

- Two tabs only: **Elements** and **Design**. Default tab is `design` (`useState<"elements"|"design">("design")`, line 895).
- A version string `v{X}` is pinned right (`margin-left:auto`) with an inline-styled blue dot when an update is available; clicking it reopens the dismissed update banner.

### 6.2 Tab styles (`overlay.css` lines 619-661)

`.retune-tab-bar`: `display:flex; position:relative; padding:8px; flex-shrink:0; border-bottom:1px solid var(--retune-border)`.

`.retune-tab-pill`: `position:absolute; top:8px; left:0; height:calc(100% - 16px); border-radius:8px; background:var(--retune-input-bg); transition: transform 0.2s cubic-bezier(0.23,1,0.32,1), width 0.2s cubic-bezier(0.23,1,0.32,1); pointer-events:none`.

`.retune-tab`: `width:auto; padding:8px 12px; border:none; border-radius:8px; background:none; font-family:inherit; font-size:12px; font-weight:500; color:var(--retune-text-tertiary); cursor:pointer; position:relative; z-index:1; transition:color 0.15s; text-align:center`. `:hover` -> `color:var(--retune-text-secondary)`. `.active` -> `color:var(--retune-text)`.

### 6.3 Tab pill animation (`Retune.tsx` lines 2243-2268)

The pill is positioned by JS (not CSS) on `[panelTab, selectedElement]` change: measures the active button's rect vs bar rect, sets `pill.style.width = btnRect.width` and `transform: translateX(offsetX)`. First render disables the transition (no slide-in on mount, `tabPillFirstRender` flag), subsequent changes slide via the CSS transition.

---

## 7. Panel body render tree (Design vs Elements)

`.retune-panel-body` (lines 4051-4210) contains, in order:

1. **`<PanelBanner>`** (update banner) - visible when `updateInfo && !updateDismissed`.
2. **If `panelTab === "elements"`:** `<ElementTree ...>` (DOM tree - separate spec). Tree styles live at `overlay.css` lines 663-817 (`.retune-tree`, `.retune-tree-node` height 32px, arrows, icons, drag states).
3. **If `panelTab === "design" && selectedElement`:** a fragment containing:
   - Two more `<PanelBanner>`s (manifest "Unlock your design system" / "Know your components"), conditional on manifest state.
   - `<ComponentSection>` (React component props editor - separate spec).
   - `<PropertyPanel key={selectedElement.selector} ...>` - the CSS sections (separate specs per section).

The panel is keyed on `selectedElement.selector` so it remounts on selection change.

### 7.1 `PropertyPanel` section order & conditional rendering (`PropertyPanel.tsx` lines 278-378)

The Design tab body is a flat list of `<Section>` blocks rendered in this exact order, with these guards:

| Order | Section | Render condition |
|---|---|---|
| 1 | `ScopeSection` | `!frameDimensions` (hidden for frame/body selection) |
| 2 | `PositionSection` | `!isSvgChild` |
| 3 | `LayoutSection` | `!isSvgChild` |
| 4 | `SpacingSection` | always |
| 5 | `SizeSection` | always |
| 6 | `TypographySection` | `!isSvgChild` (returns null internally when `!isText`) |
| 7 | `FillSection` | always |
| 8 | `ImageSection` | `isImage || isVideo || hasBackgroundImage` |
| 9 | `BorderSection` | `!isSvgChild` |
| 10 | `ShadowSection` | always |
| 11 | `FiltersSection` | `!isSvgChild` |

Derived booleans gating these (lines 226-257): `isText` (TEXT_TAGS list `P,H1-H6,SPAN,A,BUTTON,LABEL,LI,TD,TH,FIGCAPTION,BLOCKQUOTE,CITE,EM,STRONG,SMALL` OR has direct text node); `isFlex/isGrid` from `display`; `isPositioned/showOffsets/isSticky` from `position`; `isImage` (IMG/PICTURE/CANVAS), `isVideo` (VIDEO), `isSvg`, `isSvgChild` (closest svg), `isMedia`; `hasBackgroundImage` (backgroundImage not none and not a gradient); `isFlexChild/isGridChild/parentFlexDir` from parent computed display.

---

## 8. Section / Row primitives (`ui/section.tsx` + `overlay.css` 819-1255)

Every Design section uses these wrappers. This is the structural skeleton inside the panel body.

```
<div class="retune-section">
  <div class="retune-section-header">
    <span class="retune-section-title">{label}</span>
    {optional action node}
  </div>
  <div class="retune-section-body" [style gap]>...rows...</div>
</div>
```

`.retune-section`: `border-bottom:1px solid var(--retune-border); user-select:none`. `:last-child` and `:has(+ :not(.retune-section))` -> `border-bottom:none`.

`.retune-section-header`: `display:flex; align-items:center; justify-content:space-between; padding:0 8px 0 16px; height:44px`.

`.retune-section-title`: `font-size:12px; font-weight:500; line-height:20px; color:var(--retune-text)`.

`.retune-section-action`: `32x32; border:none; border-radius:8px; background:transparent; color:var(--retune-text); cursor:pointer; padding:0`. `:hover` -> `background:var(--retune-surface-hover)`.

`.retune-section-body`: `display:flex; flex-direction:column; gap:12px; padding-bottom:16px`.

`.retune-section-row`: `padding:0 48px 0 16px` (right reduces to 8px when row has `.retune-split-btn`/`.retune-row-action`).

`.retune-row-group`: `display:flex; flex-direction:column; gap:4px; padding:0 48px 0 16px` (same 8px right exception). `> .retune-row + .retune-row { margin-top:4px }`.

`.retune-row`: `display:flex; align-items:flex-end; gap:8px`. Direct `.retune-prop/.retune-combo/.retune-select/.retune-text-input/.retune-font-input/.retune-slider` children get `flex:1; min-width:0`.

`.retune-field`: `flex:1; min-width:0; display:flex; flex-direction:column; gap:4px`. `.retune-field-label`: `font-size:11px; font-weight:400; letter-spacing:-0.005em; color:var(--retune-text-tertiary); line-height:16px`.

`.retune-group-label` / `.retune-group-label-inline`: same type as field-label; `-inline` is `display:flex; justify-content:space-between`.

`.retune-row-action, .retune-split-btn`: `32x32; border-radius:8px; background:transparent; color:var(--retune-text); transition: background/color 0.15s ease`. `:hover` -> `background:var(--retune-surface-active)`. `.active` -> `background:var(--retune-input-bg-hover)`.

Section-header variable action (hover-reveal hexagon): `.retune-section-header .retune-variable-action{position:static;32x32;border-radius:8px;background:transparent;color:transparent;transition:color 0.15s ease}`; revealed on `.retune-section:hover` to `var(--retune-text-secondary)`; `:hover` -> `var(--retune-text)!important; background:var(--retune-surface-hover)`.

JS API of the primitives (`ui/section.tsx`): `Section({label, gap?, action?, children})`, `Row({label?, children})` (with label renders `.retune-row-group` + `.retune-group-label-inline`, without renders `.retune-section-row > .retune-row`), `Field({label, children})`, `RowAction({onClick, active?, children})`.

---

## 9. Tooltip (used by every toolbar button) - `overlay.css` 2568-2645

Wrapper `.retune-tooltip-trigger{display:contents}`. The tooltip itself:
`.retune-tooltip`: `position:fixed; z-index:2147483647; pointer-events:none; max-width:200px; border-radius:5px; background:#1e1e1e; box-shadow:0 0 0.5px rgba(0,0,0,0.15), 0 5px 12px rgba(0,0,0,0.13), 0 1px 3px rgba(0,0,0,0.1); padding:4px 8px; display:flex; align-items:center; gap:4px; font-size:11px; font-weight:500; line-height:16px; letter-spacing:-0.005em; white-space:nowrap; animation: retune-tooltip-in 150ms standard both`.

Caret `::before`: 12x6 triangle via `clip-path: polygon(50% 0%, 0% 100%, 100% 100%)`, background `#1e1e1e`, positioned per side class (`-bottom/-top/-left/-right`) using `--caret-x`/`--caret-y` custom props.

`.retune-tooltip-text{color:#fff;flex:1}`. `.retune-tooltip-shortcut{color:rgba(255,255,255,0.5);flex-shrink:0}`.
`@keyframes retune-tooltip-in{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}`.

Tooltip props seen: `content` (string), `shortcut` (optional), `side` (`"top"` for all toolbar buttons).

---

## 10. Reduced motion (`overlay.css` 3466-3523)

`@media (prefers-reduced-motion: reduce)` zeroes `transition`/`animation` on the toolbar, its children, panel enter/exit, tooltip, dropdowns, comment markers/popovers, settings panel, variable-action/change-dot, and the segmented/align/split controls. Reproduce this block to honor reduced-motion.

---

## 11. Icons - exact sources (extract verbatim)

All shell icons come from the npm package **`@central-icons-react/round-outlined-radius-2-stroke-1.5`** version `^1.1.153` (round, outlined, radius-2, stroke-width 1.5 variant). Imported in `Retune.tsx` lines 36-43. Each is rendered at `size={20}`.

| Usage | Import name | Module path |
|---|---|---|
| Toolbar collapse (imported, but RetuneLogo overrides visual) | `IconCursorClick` | `@central-icons-react/round-outlined-radius-2-stroke-1.5/IconCursorClick` |
| Copy changes (default) | `IconSquareBehindSquare6` | `.../IconSquareBehindSquare6` |
| (imported) step back | `IconStepBack` | `.../IconStepBack` |
| Close (X) | `IconCrossMedium` | `.../IconCrossMedium` |
| Reset all | `IconBroom` | `.../IconBroom` |
| Copy success state | `IconCheckCircle2` | `.../IconCheckCircle2` |
| Settings | `IconSettingsGear2` | `.../IconSettingsGear2` |
| Edit mode | `IconCursor1` | `.../IconCursor1` |

Custom inline SVGs (not from the library):
- **`IconComment`** (Retune.tsx 324-330): 20x20 viewBox `0 0 20 20`, single path `d="M3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10C17 13.866 13.866 17 10 17H4C3.44772 17 3 16.5523 3 16V10Z"` `stroke="currentColor" strokeWidth="1.25"`.
- **`RetuneLogo`** (586-699): 16 `rect`s + `#retune-bloom` filter, full coords in source.

To reproduce verbatim, pull the eight `@central-icons-react/round-outlined-radius-2-stroke-1.5/*` SVGs from that exact package version; do not hand-draw.

---

## 12. Selector field (Scope pills, Webflow-style) - `overlay.css` 467-615

Rendered by `ScopeSection` (`ui/sections/ScopeSection.tsx`). Structural CSS for the shell:

`.retune-selector-field`: `display:flex; align-items:center; gap:8px; overflow-x:auto; overflow-y:hidden; scrollbar-width:none; padding:0 16px; isolation:isolate`. Scrollbar hidden via webkit.

`.retune-selector-tag`: `display:flex; center; gap:6px; max-width:100%; padding:8px; border-radius:8px; border:none; background:var(--retune-surface-hover); cursor:pointer; font-size:11px; font-weight:500; letter-spacing:-0.005em; color:var(--retune-text); line-height:16px; white-space:nowrap; transition: background-color/color 0.15s ease`. `:hover` -> `background:var(--retune-border)`. `.included, .active` -> `background:var(--retune-blue-bg); color:var(--retune-blue-text)`; their `:hover` -> `background:var(--retune-blue-bg-hover)`.

`.retune-selector-tag-count`: pill inside tag, `font-size:11px; font-weight:500; background:var(--retune-surface); color:var(--retune-text); padding:0 6px; border-radius:4px`.

`.retune-selector-bridge`: 8x16 connector with `z-index:-1; margin:0 -8px`; `.filled` background `var(--retune-blue-bg)`; `::before/::after` are 5px-tall surface-colored caps with rounded inner corners (creates the "pipe" look between adjacent active pills).

`.retune-selector-divider`: `width:1px; height:20px; background:var(--retune-border); align-self:center`.

Dark overrides (lines 593-602): active/included tag text -> white; count chip background -> white, color -> `var(--retune-blue-700)`.

---

## 13. Element-tag label styles (panel chrome) - `overlay.css` 441-465

`.retune-el-tag`: `font-size:11px; line-height:16px; font-weight:550; color:var(--retune-text)`.
`.retune-el-component`: `font-size:11px; font-weight:450; letter-spacing:-0.005em; color:#3b82f6; margin-top:1px` (hardcoded blue).
`.retune-el-text`: `font-size:11px; font-weight:450; letter-spacing:-0.005em; color:var(--retune-text-secondary); margin-top:1px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap`.

---

## 14. Config defaults & breakpoints (`Retune.tsx`)

`DEFAULT_CONFIG` (lines 48-54): `{ port:9223, hotkey:"alt+d", fidelity:"standard", position:"bottom-right", force:false }`.

- `MIN_VIEWPORT_WIDTH = 768` (line 107). The overlay returns `null` below 768px (`useState`/matchMedia gate, lines 305-317).
- Dev-mode gate: renders only when `NODE_ENV==="development"` or Vite `import.meta.env.DEV`, unless `props.force`.
- Persisted prefs in `localStorage`: `retune-fidelity`, `retune-theme` (`system|light|dark`, default `system`), `retune-panel-side` (`left|right`).

---

## Note on `inspector/tokens.ts`

This file is **NOT** the overlay's own theme. It is the *design-token scanner* that inspects the **user's page** stylesheets to build a reverse map (resolved value -> CSS custom property name) so the Design panel can suggest/swap the host project's tokens. Key exports: `scanDesignTokens(): TokenMap`, `findTokensForValue(value, tokenMap)`, `detectStylingApproach(element): "tailwind"|"css-modules"|"styled-components"|"css-in-js"|"plain-css"|"unknown"`, `summarizeTokenSystem(tokenMap)`. Interfaces `DesignToken {name,value,source}` and `TokenMap {tokens, valueToTokens: Map<string,string[]>}`. It walks `document.styleSheets` (skipping cross-origin), reads `--*` props, resolves them against `:root`/`body` computed styles, and normalizes rgb/case. Relevant to the Design-panel *behavior* (token suggestions) but irrelevant to the shell's visual theme. Listed here only because it was in the read set.

---

## External symbols referenced but defined elsewhere (out of this spec's files)
- `PanelBanner` - `../ui/PanelBanner` (update/manifest banners inside panel body).
- `ComponentSection`, `MANIFEST_PROMPT`, `MANIFEST_COMPONENTS_PROMPT` - `../ui/ComponentSection`.
- `ElementTree`, `ReparentEntry` - `./ElementTree`.
- `SettingsPanel` - `./SettingsPanel` (overlays the design panel).
- `Tooltip` - `../ui/tooltip`; `TooltipPortalContext` - `../ui/tooltip-portal-context`.
- `Section`, `Row`, `Field`, `RowAction` - `../ui/section` (read; documented in section 8).
- All 11 `*Section` components - `../ui/sections/*` (separate specs).
- `BoxModelOverlay`, `BoxModelProperty` - `../ui/box-model-overlay`.
