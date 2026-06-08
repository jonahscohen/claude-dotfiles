/**
 * PropertyPanel.tsx - the Preact panel shell for the ported Retune Design panel.
 *
 * Phase 2 scope: the panel container, enter/exit animation, and the
 * Elements/Design tab bar with a sliding measured pill. The Design body is a
 * placeholder; the real sections (Scope/Position/Layout/...) land in later phases.
 *
 * Ported near-verbatim from Retune's overlay/Retune.tsx (AnimatedPanel, the
 * tab-pill effect, and the panel/tab JSX) per spec 01-shell-and-theme.md. React
 * hooks become preact/hooks; structure and timings are unchanged.
 */

import { useState, useRef, useEffect } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { PositionSection } from './ui/sections/PositionSection';
import { LayoutSection } from './ui/sections/LayoutSection';
import { SpacingSection } from './ui/sections/SpacingSection';
import { SizeSection } from './ui/sections/SizeSection';
import { TypographySection } from './ui/sections/TypographySection';
import { FillSection } from './ui/sections/FillSection';
import { ImageSection } from './ui/sections/ImageSection';
import { BorderSection } from './ui/sections/BorderSection';
import { ShadowSection } from './ui/sections/ShadowSection';
import { FiltersSection } from './ui/sections/FiltersSection';
import { ScopeSection } from './ui/sections/ScopeSection';
import { ElementTree } from './ui/ElementTree';
import type { ChangeProps, SectionElementInfo, ScopeLevel, ForcedState } from './ui/sections/section-props';

const PANEL_ANIMATION_MS = 150;

type AnimState = 'hidden' | 'entering' | 'visible' | 'exiting';

/**
 * AnimatedPanel - wraps the panel so it animates in on show and out on hide,
 * keeping a snapshot of children during exit so the content stays visible while
 * it animates away. Ported verbatim from Retune.tsx (lines 74-105).
 */
function AnimatedPanel({ visible, children }: { visible: boolean; children: ComponentChildren }) {
  const [state, setState] = useState<AnimState>('hidden');
  const prevVisibleRef = useRef(false);
  const childrenRef = useRef<ComponentChildren>(children);

  // Keep a snapshot of children while visible so exit animation shows content
  if (visible) childrenRef.current = children;

  if (visible && !prevVisibleRef.current) {
    prevVisibleRef.current = true;
    setState('entering');
  } else if (!visible && prevVisibleRef.current) {
    prevVisibleRef.current = false;
    setState('exiting');
  }

  useEffect(() => {
    if (state === 'entering') {
      const timer = setTimeout(() => setState('visible'), PANEL_ANIMATION_MS);
      return () => clearTimeout(timer);
    }
    if (state === 'exiting') {
      const timer = setTimeout(() => setState('hidden'), PANEL_ANIMATION_MS);
      return () => clearTimeout(timer);
    }
  }, [state]);

  if (state === 'hidden') return null;

  const animClass = state === 'entering' ? 'entering' : state === 'exiting' ? 'exiting' : '';
  return <div className={`retune-panel-anim ${animClass}`}>{childrenRef.current}</div>;
}

/**
 * The contract EVERY Design section receives. ManipulateMode builds this object
 * (see renderPanel) and the section list spreads it into each <XSection>. The
 * sections themselves declare their own prop interfaces extending the shared
 * BaseSectionProps in ./ui/sections/section-props.ts; this panel builds that
 * contract object and composes them.
 */
export interface PropertyPanelProps {
  /** Whether an element is selected in edit mode (drives show/hide + animation). */
  visible: boolean;
  /** Which side of the viewport the panel is anchored to. */
  side?: 'right' | 'left';
  /** Version string rendered at the right of the tab bar (optional). */
  version?: string;
  /** Short label for the selected element (tab-bar / debug). */
  selectedLabel?: string;
  /** The selected DOM element (the live node sections read directly). */
  element?: HTMLElement | null;
  /** The element's CSS selector (keys the section subtree; engine preview uses it). */
  selector?: string | null;
  /** Scoped/computed styles bound to the controls (camelCase keys). */
  s?: Record<string, string>;
  /** Live-preview + change-record callback (camelCase prop). */
  onPropertyChange?: (prop: string, value: string) => void;
  /** Box-model hover callback (camelCase prop | null). */
  onPropertyHover?: (prop: string | null) => void;
  /** Per-property change state for ChangeIndicator + controls (camelCase prop). */
  changeProps?: (prop: string) => ChangeProps;
  /** Shorthand-group change state (a set of props edited together). */
  shorthandChangeProps?: (props: string[]) => ChangeProps;
  /** HTML/SVG attribute change path - DISTINCT from CSS (ImageSection). */
  onAttributeChange?: (attr: string, oldValue: string, newValue: string) => void;
  /** camelCase props authored by the active scope rule. */
  ownedProperties?: Set<string>;
  // ── Scope rail (Target) + forced pseudo-state (ScopeSection) ──
  /** Scope levels (class -> ancestor -> "This instance") for the selected element. */
  scopeLevels?: ScopeLevel[];
  /** Index of the active scope level. */
  activeLevelIndex?: number;
  /** Switch the active scope level. */
  onScopeLevelChange?: (index: number) => void;
  /** Transient highlight on scope-level hover (index | null on leave). */
  onScopeLevelHover?: (index: number | null) => void;
  /** Current forced pseudo-state (:hover/:focus/:active | null). */
  forcedState?: ForcedState;
  /** Change the forced pseudo-state. */
  onForcedStateChange?: (state: ForcedState | null) => void;
  // ── Elements tab (ElementTree) ──
  /** Select an element from the tree (routes through the same path a page-click uses). */
  onElementSelect?: (el: Element) => void;
  /** Hover an element from the tree (el -> show picker highlight; null -> clear). */
  onElementHover?: (el: Element | null) => void;
}

const NOOP_CHANGE: ChangeProps = { isChanged: false, onReset: () => {} };

/** Compute the gating flags + layout context the sections self-gate on, from the
 *  live element + its computed/scoped styles. Pure reads; runs per render. */
function deriveContext(element: HTMLElement | null, s: Record<string, string>) {
  const tagName = element?.tagName.toLowerCase() ?? '';
  const display = s.display ?? (element ? getComputedStyle(element).display : '') ?? '';
  const isFlex = display.includes('flex');
  const isGrid = display.includes('grid');
  const isImage = tagName === 'img' || tagName === 'picture';
  const isVideo = tagName === 'video';
  const isMedia = isImage || isVideo;
  const bgImage = s.backgroundImage ?? '';
  const hasBackgroundImage = !!bgImage && bgImage !== 'none';

  // SVG shape children (Fill section paints them via fill/stroke).
  const SVG_SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);
  const isSvgChild = SVG_SHAPES.has(tagName) || (!!element && element.namespaceURI === 'http://www.w3.org/2000/svg' && tagName !== 'svg');

  // Text gate: a known text tag, or an element with a non-empty direct text node.
  const TEXT_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'button', 'label', 'li', 'td', 'th', 'caption', 'figcaption', 'blockquote', 'cite', 'code', 'em', 'strong', 'small', 'sub', 'sup', 'time', 'mark', 'dt', 'dd', 'legend', 'summary', 'b', 'i', 'u']);
  let isText = TEXT_TAGS.has(tagName);
  if (!isText && element) {
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim().length > 0) { isText = true; break; }
    }
  }

  // Layout context: the selected element's relationship to its PARENT.
  const parent = element?.parentElement ?? null;
  const pcs = parent ? getComputedStyle(parent) : null;
  const parentDisplay = pcs?.display ?? '';
  const isFlexChild = parentDisplay.includes('flex');
  const isGridChild = parentDisplay.includes('grid');
  const parentFlexDir = pcs?.flexDirection ?? 'row';

  return {
    elementInfo: { element, tagName, reactComponents: [] } as SectionElementInfo,
    isText, isFlex, isGrid, isImage, isVideo, isMedia, hasBackgroundImage, isSvgChild,
    isFlexChild, isGridChild, parentFlexDir,
  };
}

export function PropertyPanel({
  visible,
  side = 'right',
  version = '',
  selector,
  element = null,
  s: sProp,
  onPropertyChange,
  onPropertyHover,
  changeProps,
  shorthandChangeProps,
  onAttributeChange,
  scopeLevels,
  activeLevelIndex = 0,
  onScopeLevelChange,
  onScopeLevelHover,
  forcedState = null,
  onForcedStateChange,
  onElementSelect,
  onElementHover,
}: PropertyPanelProps) {
  const s = sProp ?? {};
  const cp = changeProps ?? ((_p: string) => NOOP_CHANGE);
  const scp = shorthandChangeProps ?? ((_p: string[]) => NOOP_CHANGE);
  const ctx = deriveContext(element, s);

  // The shared base contract spread into every section. Sections destructure only
  // the props their own interface declares; the spread carries the rest harmlessly.
  const base = {
    element: ctx.elementInfo,
    s,
    onPropertyChange: onPropertyChange ?? (() => {}),
    onPropertyHover: onPropertyHover ?? (() => {}),
    changeProps: cp,
    onAttributeChange: onAttributeChange ?? (() => {}),
  };
  const layoutCtx = {
    isFlexChild: ctx.isFlexChild,
    isGridChild: ctx.isGridChild,
    parentFlexDir: ctx.parentFlexDir,
  };

  // Direct DOM click opens Design immediately - Design is the default tab.
  const [panelTab, setPanelTab] = useState<'elements' | 'design'>('design');

  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabPillRef = useRef<HTMLDivElement>(null);
  const tabPillFirstRender = useRef(true);

  // Tab pill animation - measure the active tab button and slide the pill to it.
  // Ported verbatim from Retune.tsx (lines 2243-2268).
  useEffect(() => {
    const bar = tabBarRef.current;
    const pill = tabPillRef.current;
    if (!bar || !pill) return;

    const buttons = bar.querySelectorAll<HTMLButtonElement>('.retune-tab');
    const idx = panelTab === 'elements' ? 0 : 1;
    const btn = buttons[idx];
    if (!btn) return;

    const barRect = bar.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const offsetX = btnRect.left - barRect.left;

    pill.style.width = `${btnRect.width}px`;
    if (tabPillFirstRender.current) {
      pill.style.transition = 'none';
      pill.style.transform = `translateX(${offsetX}px)`;
      void pill.offsetHeight; // force reflow
      pill.style.transition = '';
      tabPillFirstRender.current = false;
    } else {
      pill.style.transform = `translateX(${offsetX}px)`;
    }
  }, [panelTab, visible]);

  return (
    <AnimatedPanel visible={visible}>
      <div className={`retune-panel ${side}`}>
        <div className="retune-tab-bar" ref={tabBarRef}>
          <div className="retune-tab-pill" ref={tabPillRef} />
          <button
            className={`retune-tab${panelTab === 'elements' ? ' active' : ''}`}
            onClick={() => setPanelTab('elements')}
          >
            Elements
          </button>
          <button
            className={`retune-tab${panelTab === 'design' ? ' active' : ''}`}
            onClick={() => setPanelTab('design')}
          >
            Design
          </button>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '11px',
              lineHeight: '16px',
              color: 'var(--retune-text-tertiary)',
              letterSpacing: '-0.005em',
              paddingRight: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {version ? `v${version}` : ''}
          </span>
        </div>
        <div className="retune-panel-body">
          {panelTab === 'design' && (
            // Key the section subtree by selector so every control remounts when a
            // different element is selected (prevents stale control state). Mirrors
            // Retune's `<PropertyPanel key={selectedElement.selector}>`.
            <div key={selector ?? 'none'}>
              {/* ▼▼▼ DESIGN SECTION LIST (Retune order) ▼▼▼ */}
              {/* TODO: ComponentSection - renders React component props/variants;
                  stub (null) until the manifest/React-props layer lands. */}
              <ScopeSection
                element={ctx.elementInfo}
                scopeLevels={scopeLevels ?? []}
                activeLevelIndex={activeLevelIndex}
                onScopeLevelChange={onScopeLevelChange}
                onScopeLevelHover={onScopeLevelHover}
                forcedState={forcedState}
                onForcedStateChange={onForcedStateChange}
              />
              <PositionSection {...base} {...layoutCtx} />
              <LayoutSection {...base} />
              <SpacingSection {...base} shorthandChangeProps={scp} />
              <SizeSection {...base} {...layoutCtx} />
              <TypographySection {...base} isText={ctx.isText} />
              <FillSection {...base} isSvgChild={ctx.isSvgChild} isMedia={ctx.isMedia} />
              <ImageSection {...base} isImage={ctx.isImage} isVideo={ctx.isVideo} hasBackgroundImage={ctx.hasBackgroundImage} />
              <BorderSection s={s} onPropertyChange={base.onPropertyChange} changeProps={cp} shorthandChangeProps={scp} />
              <ShadowSection {...base} />
              <FiltersSection {...base} />
              {/* ▲▲▲ END DESIGN SECTION LIST ▲▲▲ */}
            </div>
          )}
          {panelTab === 'elements' && (
            // NOT wrapped in a selector-keyed div (unlike the Design branch above):
            // ElementTree owns its own expand/collapse state (expandedSet) and must
            // persist across re-renders, or every page-click would reset the tree.
            // Phase A: selectedElement / onSelect / onHover only - drag (onTreeReorder/
            // onTreeReparent) is intentionally omitted, so ElementTree's handleDragStart
            // early-returns and pointerdown falls through to click-select.
            <ElementTree
              selectedElement={element}
              onSelect={onElementSelect ?? (() => {})}
              onHover={onElementHover ?? (() => {})}
            />
          )}
        </div>
      </div>
    </AnimatedPanel>
  );
}
