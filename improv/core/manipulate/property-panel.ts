import { DetectedControls, ControlDefinition, ControlGroup } from './control-detector.js';
import { attachScrub, parseNumericValue, formatNumericValue } from './scrub.js';

type PropertyChangeCallback = (property: string, value: string) => void;

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function rgbToHex(rgb: string): string {
  const match = rgb.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/,
  );
  if (!match) return '#000000';
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
}

function parseColor(val: string): string {
  if (!val || val === 'transparent') return '#000000';
  if (val.startsWith('rgb')) return rgbToHex(val);
  if (val.startsWith('#'))
    return val.length === 4
      ? '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3]
      : val;
  return '#000000';
}

function parsePx(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function cssPropToCamel(property: string): string {
  return property.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function getVal(
  computedStyles: Record<string, string>,
  property: string,
): string {
  const camel = cssPropToCamel(property);
  return computedStyles[camel] ?? computedStyles[property] ?? '';
}

// ---------------------------------------------------------------------------
// SVG icon helpers (paths from Lucide, verbatim)
// ---------------------------------------------------------------------------

function svgIcon(w: number, h: number, pathData: string): SVGSVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('width', String(w));
  el.setAttribute('height', String(h));
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('fill', 'none');
  el.setAttribute('stroke', 'currentColor');
  el.setAttribute('stroke-width', '2');
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  const parts = pathData.split('|');
  for (const d of parts) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d.trim());
    el.appendChild(p);
  }
  return el;
}

// Lucide chevron-down
function chevronDownIcon(size: number = 12): SVGSVGElement {
  return svgIcon(size, size, 'M6 9l6 6l6-6');
}

// Lucide plus
function plusIcon(size: number = 14): SVGSVGElement {
  return svgIcon(size, size, 'M12 5v14|M5 12h14');
}

// Lucide link/chain icon for aspect ratio lock
function chainIcon(size: number = 14): SVGSVGElement {
  return svgIcon(size, size, 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71|M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71');
}

// Lucide corner-down-right (for split/expand icon)
function splitIcon(size: number = 14): SVGSVGElement {
  return svgIcon(size, size, 'M9 4v8h8|M5 4v4a4 4 0 0 0 4 4h8');
}

// ---------------------------------------------------------------------------
// Lucide alignment icons (verbatim paths)
// ---------------------------------------------------------------------------

// Horizontal alignment
const ALIGN_H_LEFT = 'M4 4v16|M8 8h12|M8 16h8';
const ALIGN_H_CENTER = 'M12 4v16|M6 8h12|M8 16h8';
const ALIGN_H_RIGHT = 'M20 4v16|M4 8h12|M8 16h8';

// Vertical alignment
const ALIGN_V_TOP = 'M4 4h16|M8 8v12|M16 8v8';
const ALIGN_V_CENTER = 'M4 12h16|M8 6v12|M16 8v8';
const ALIGN_V_BOTTOM = 'M4 20h16|M8 4v12|M16 8v8';

// Display icons
const ICON_BLOCK = 'M3 3h18v18H3z';
const ICON_FLEX_ROW = 'M3 3h18v18H3z|M9 3v18|M15 3v18';
const ICON_FLEX_COL = 'M3 3h18v18H3z|M3 9h18|M3 15h18';
const ICON_GRID = 'M3 3h18v18H3z|M3 9h18|M3 15h18|M9 3v18|M15 3v18';

// Text alignment icons (Lucide align-left, align-center, align-right)
const TEXT_ALIGN_LEFT = 'M21 6H3|M15 12H3|M17 18H3';
const TEXT_ALIGN_CENTER = 'M21 6H3|M17 12H7|M21 18H3';
const TEXT_ALIGN_RIGHT = 'M21 6H3|M21 12H9|M21 18H3';

// Vertical text alignment
const TEXT_VALIGN_TOP = 'M4 4h16|M12 8v12';
const TEXT_VALIGN_MIDDLE = 'M4 12h16|M12 6v12';
const TEXT_VALIGN_BOTTOM = 'M4 20h16|M12 4v12';

// Spacing icons
const ICON_PADDING_H = 'M7 4v16|M17 4v16|M7 12h10';
const ICON_PADDING_V = 'M4 7h16|M4 17h16|M12 7v10';
const ICON_MARGIN_H = 'M3 4v16|M21 4v16|M3 12h18';
const ICON_MARGIN_V = 'M4 3h16|M4 21h16|M12 3v18';

// Corner radius icon
const ICON_RADIUS = 'M3 12V5a2 2 0 0 1 2-2h7|M21 12v7a2 2 0 0 1-2 2h-7';

// ---------------------------------------------------------------------------
// Constants (Retune-exact values)
// ---------------------------------------------------------------------------

const PANEL_WIDTH = 280;
const FONT = 'system-ui, -apple-system, sans-serif';
const BG = '#1c1c1c';
const BORDER = 'rgba(255,255,255,0.06)';
const SHADOW = '0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.04)';
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

const TEXT_PRIMARY = 'rgba(255,255,255,0.85)';
const TEXT_SECONDARY = 'rgba(255,255,255,0.65)';
const TEXT_DIM = 'rgba(255,255,255,0.35)';
const TEXT_FAINT = 'rgba(255,255,255,0.25)';

const INPUT_BG = 'rgba(255,255,255,0.05)';
const INPUT_BG_HOVER = 'rgba(255,255,255,0.08)';
const INPUT_BG_ACTIVE = 'rgba(255,255,255,0.1)';
const INPUT_FOCUS = 'rgba(255,255,255,0.12)';

const PILL_ACTIVE_BG = 'rgba(59,130,246,0.15)';
const PILL_ACTIVE_COLOR = '#6dacfc';
const RESET_DOT_COLOR = '#0D99FF';

// ---------------------------------------------------------------------------
// PropertyPanel
// ---------------------------------------------------------------------------

export class PropertyPanel {
  private shadow: ShadowRoot;
  private container: HTMLDivElement;
  private cleanups: Array<() => void> = [];
  private changeCallback: PropertyChangeCallback | null = null;
  private activeTab: 'elements' | 'design' = 'design';
  private tabContentEl: HTMLDivElement | null = null;
  private controls: DetectedControls | null = null;
  private computedStyles: Record<string, string> = {};
  private originalValues: Record<string, string> = {};

  constructor(shadowRoot: ShadowRoot) {
    this.shadow = shadowRoot;
    this.container = document.createElement('div');
    this.applyContainerStyles();
    this.shadow.appendChild(this.container);
  }

  // -----------------------------------------------------------------------
  // Container styles
  // -----------------------------------------------------------------------

  private applyContainerStyles(): void {
    Object.assign(this.container.style, {
      position: 'fixed',
      right: '16px',
      bottom: '68px',
      width: PANEL_WIDTH + 'px',
      maxHeight: 'calc(100vh - 84px)',
      overflowY: 'auto',
      scrollbarWidth: 'none',
      background: BG,
      borderRadius: '16px',
      border: '1px solid ' + BORDER,
      boxShadow: SHADOW,
      pointerEvents: 'auto',
      fontFamily: FONT,
      fontSize: '12px',
      color: TEXT_PRIMARY,
      zIndex: '2147483647',
      opacity: '0',
      transform: 'translateY(12px)',
    });

    requestAnimationFrame(() => {
      this.container.style.transition =
        'opacity 150ms ' + EASE + ', transform 150ms ' + EASE;
      this.container.style.opacity = '1';
      this.container.style.transform = 'translateY(0)';
    });

    // Hide scrollbar for webkit
    const style = document.createElement('style');
    style.textContent =
      ':host ::-webkit-scrollbar { display: none; }\n' +
      '.improv-pp-retune::-webkit-scrollbar { display: none; }';
    this.shadow.appendChild(style);
    this.container.classList.add('improv-pp-retune');
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  render(controls: DetectedControls, computedStyles: Record<string, string>): void {
    this.cleanup();
    this.clearContainer();
    this.controls = controls;
    this.computedStyles = computedStyles;

    // Capture initial values for per-field reset tracking
    this.originalValues = {};
    for (const key of Object.keys(computedStyles)) {
      this.originalValues[key] = computedStyles[key];
    }

    // Tab bar
    this.buildTabBar();

    // Tab content area
    this.tabContentEl = document.createElement('div');
    this.container.appendChild(this.tabContentEl);

    // Render active tab
    this.renderTabContent();
  }

  onPropertyChange(callback: PropertyChangeCallback): void {
    this.changeCallback = callback;
  }

  show(): void {
    this.container.style.display = '';
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  destroy(): void {
    this.cleanup();
    this.changeCallback = null;
    this.controls = null;
    if (this.shadow.contains(this.container)) {
      this.shadow.removeChild(this.container);
    }
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private cleanup(): void {
    for (const fn of this.cleanups) fn();
    this.cleanups = [];
  }

  private clearContainer(): void {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }

  // -----------------------------------------------------------------------
  // Tab bar (40px)
  // -----------------------------------------------------------------------

  private buildTabBar(): void {
    const bar = document.createElement('div');
    Object.assign(bar.style, {
      display: 'flex',
      alignItems: 'center',
      height: '40px',
      padding: '0 8px',
      borderBottom: '1px solid ' + BORDER,
      position: 'relative',
    });

    const tabsWrap = document.createElement('div');
    Object.assign(tabsWrap.style, {
      display: 'flex',
      alignItems: 'center',
      position: 'relative',
      flex: '1',
    });

    // Sliding pill indicator
    const pill = document.createElement('div');
    Object.assign(pill.style, {
      position: 'absolute',
      height: '28px',
      background: INPUT_BG,
      borderRadius: '8px',
      transition: 'transform 150ms ' + EASE + ', width 150ms ' + EASE,
      pointerEvents: 'none',
    });
    tabsWrap.appendChild(pill);

    const tabs: HTMLButtonElement[] = [];
    const tabDefs: Array<{ label: string; id: 'elements' | 'design' }> = [
      { label: 'Elements', id: 'elements' },
      { label: 'Design', id: 'design' },
    ];

    for (const def of tabDefs) {
      const btn = document.createElement('button');
      btn.textContent = def.label;
      const isActive = this.activeTab === def.id;

      Object.assign(btn.style, {
        background: 'none',
        border: 'none',
        padding: '0 12px',
        height: '28px',
        fontSize: '12px',
        fontWeight: '500',
        fontFamily: FONT,
        color: isActive ? TEXT_PRIMARY : TEXT_DIM,
        cursor: 'pointer',
        position: 'relative',
        zIndex: '1',
        transition: 'color 150ms ' + EASE,
      });

      const onClick = () => {
        this.activeTab = def.id;
        for (let i = 0; i < tabs.length; i++) {
          const t = tabs[i];
          t.style.color = tabDefs[i].id === def.id ? TEXT_PRIMARY : TEXT_DIM;
        }
        this.updatePillPosition(pill, tabs, tabDefs);
        this.renderTabContent();
      };
      btn.addEventListener('click', onClick);
      this.cleanups.push(() => btn.removeEventListener('click', onClick));

      tabs.push(btn);
      tabsWrap.appendChild(btn);
    }

    // Version text on right
    const version = document.createElement('span');
    version.textContent = 'v0.1';
    Object.assign(version.style, {
      fontSize: '11px',
      color: TEXT_FAINT,
      marginLeft: 'auto',
      flexShrink: '0',
    });

    bar.appendChild(tabsWrap);
    bar.appendChild(version);
    this.container.appendChild(bar);

    // Position pill after layout
    requestAnimationFrame(() => {
      this.updatePillPosition(pill, tabs, tabDefs);
    });
  }

  private updatePillPosition(
    pill: HTMLDivElement,
    tabs: HTMLButtonElement[],
    tabDefs: Array<{ id: string }>,
  ): void {
    const activeIdx = tabDefs.findIndex((d) => d.id === this.activeTab);
    if (activeIdx < 0 || !tabs[activeIdx]) return;
    const btn = tabs[activeIdx];
    const parent = btn.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const offsetLeft = btnRect.left - parentRect.left;
    pill.style.width = btnRect.width + 'px';
    pill.style.transform = 'translateX(' + offsetLeft + 'px)';
  }

  private renderTabContent(): void {
    if (!this.tabContentEl) return;
    while (this.tabContentEl.firstChild) {
      this.tabContentEl.removeChild(this.tabContentEl.firstChild);
    }

    if (this.activeTab === 'design') {
      this.buildDesignTab(this.tabContentEl);
    } else {
      this.buildElementsTab(this.tabContentEl);
    }
  }

  // -----------------------------------------------------------------------
  // Elements tab (placeholder)
  // -----------------------------------------------------------------------

  private buildElementsTab(parent: HTMLDivElement): void {
    const empty = document.createElement('div');
    Object.assign(empty.style, {
      padding: '32px 16px',
      textAlign: 'center',
      fontSize: '11px',
      color: TEXT_DIM,
    });
    empty.textContent = 'Element tree coming soon';
    parent.appendChild(empty);
  }

  // -----------------------------------------------------------------------
  // Design tab - all 11 sections
  // -----------------------------------------------------------------------

  private buildDesignTab(parent: HTMLDivElement): void {
    if (!this.controls) return;
    const cs = this.computedStyles;
    const groupNames = new Set(this.controls.groups.map((g) => g.name));
    const hasTypography = groupNames.has('typography');
    const hasFlex = groupNames.has('flex');
    const hasGrid = groupNames.has('grid');

    // Determine element tag
    const tag = this.getElementTag();

    // 1. Element Tag
    this.buildElementTagSection(parent, tag);

    // 2. Position
    this.buildPositionSection(parent, cs);

    // 3. Layout
    this.buildLayoutSection(parent, cs, hasFlex, hasGrid);

    // 4. Spacing
    this.buildSpacingSection(parent, cs);

    // 5. Size
    this.buildSizeSection(parent, cs);

    // 6. Typography (only for text elements)
    if (hasTypography) {
      this.buildTypographySection(parent, cs);
    }

    // 7. Appearance
    this.buildAppearanceSection(parent, cs);

    // 8-11. Collapsed sections
    this.buildCollapsedSection(parent, 'Fill');
    this.buildCollapsedSection(parent, 'Border');
    this.buildCollapsedSection(parent, 'Shadow');
    this.buildCollapsedSection(parent, 'Filters');
  }

  private getElementTag(): string {
    if (!this.controls) return 'div';
    const groups = new Set(this.controls.groups.map((g) => g.name));
    if (groups.has('image')) return 'img';
    if (groups.has('typography')) {
      const fs = parsePx(getVal(this.computedStyles, 'font-size'));
      if (fs >= 28) return 'h1';
      if (fs >= 22) return 'h2';
      if (fs >= 18) return 'h3';
      return 'p';
    }
    if (groups.has('flex') || groups.has('grid')) return 'div';
    return 'div';
  }

  // -----------------------------------------------------------------------
  // 1. Element Tag Section
  // -----------------------------------------------------------------------

  private buildElementTagSection(parent: HTMLDivElement, tag: string): void {
    const section = this.createSection();

    // Header with element tag as title
    const header = this.makeSectionHeader(tag);
    section.appendChild(header);

    // Body
    const body = this.makeSectionBody();

    // Target row (group-label-inline)
    const targetRow = this.makeSectionRow();

    const targetLabel = this.makeInlineLabel('Target');
    targetRow.appendChild(targetLabel);

    // Selector pills
    const pillWrap = document.createElement('div');
    Object.assign(pillWrap.style, {
      display: 'flex',
      gap: '4px',
      flexWrap: 'wrap',
    });

    const instancePill = this.makeSelectorPill('This instance', true);
    pillWrap.appendChild(instancePill);

    targetRow.appendChild(pillWrap);
    body.appendChild(targetRow);

    // Trigger row
    const triggerRow = this.makeSectionRow();

    const triggerLabel = this.makeInlineLabel('Trigger');
    triggerRow.appendChild(triggerLabel);

    const triggerSelect = this.makeSelectControl(
      ['None', 'Hover', 'Focus', 'Active'],
      'None',
      (_val: string) => {
        // State trigger - future feature
      },
    );
    triggerRow.appendChild(triggerSelect);
    body.appendChild(triggerRow);

    section.appendChild(body);
    parent.appendChild(section);
  }

  // -----------------------------------------------------------------------
  // 2. Position Section
  // -----------------------------------------------------------------------

  private buildPositionSection(
    parent: HTMLDivElement,
    cs: Record<string, string>,
  ): void {
    const section = this.createSection();

    const header = this.makeSectionHeader('Position');
    section.appendChild(header);

    const body = this.makeSectionBody();

    // Alignment row: two groups of 3 icon buttons
    const alignRow = this.makeSectionRow();
    Object.assign(alignRow.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    });

    // Horizontal alignment group
    const hGroup = this.makeIconButtonGroup(
      [
        { icon: ALIGN_H_LEFT, value: 'left' },
        { icon: ALIGN_H_CENTER, value: 'center' },
        { icon: ALIGN_H_RIGHT, value: 'right' },
      ],
      '',
      (val) => this.emitChange('text-align', val),
    );
    alignRow.appendChild(hGroup);

    // Vertical alignment group (disabled for block elements by default)
    const display = getVal(cs, 'display') || 'block';
    const isFlexOrGrid = display === 'flex' || display === 'inline-flex' ||
      display === 'grid' || display === 'inline-grid';

    const vGroup = this.makeIconButtonGroup(
      [
        { icon: ALIGN_V_TOP, value: 'flex-start' },
        { icon: ALIGN_V_CENTER, value: 'center' },
        { icon: ALIGN_V_BOTTOM, value: 'flex-end' },
      ],
      '',
      (val) => this.emitChange('align-items', val),
    );
    if (!isFlexOrGrid) {
      Object.assign(vGroup.style, {
        opacity: '0.3',
        pointerEvents: 'none',
      });
    }
    alignRow.appendChild(vGroup);

    body.appendChild(alignRow);

    // Position type row
    const positionVal = getVal(cs, 'position') || 'static';
    const typeRow = this.makeSectionRow();
    const posLabel = this.makeInlineLabel('Type');
    typeRow.appendChild(posLabel);
    const posSelect = this.makeSelectControl(
      ['static', 'relative', 'absolute', 'fixed', 'sticky'],
      positionVal,
      (val) => this.emitChange('position', val),
    );
    typeRow.appendChild(posSelect);
    body.appendChild(typeRow);

    section.appendChild(body);
    parent.appendChild(section);
  }

  // -----------------------------------------------------------------------
  // 3. Layout Section
  // -----------------------------------------------------------------------

  private buildLayoutSection(
    parent: HTMLDivElement,
    cs: Record<string, string>,
    hasFlex: boolean,
    hasGrid: boolean,
  ): void {
    const section = this.createSection();

    const header = this.makeSectionHeader('Layout');
    section.appendChild(header);

    const body = this.makeSectionBody();

    // Determine active display mode
    const display = getVal(cs, 'display') || 'block';
    const flexDir = getVal(cs, 'flex-direction') || 'row';
    let activeDisplay = 'block';
    if (display === 'flex' || display === 'inline-flex') {
      activeDisplay = flexDir === 'column' ? 'flex-col' : 'flex-row';
    } else if (display === 'grid' || display === 'inline-grid') {
      activeDisplay = 'grid';
    }

    // Display segmented control
    const displayRow = this.makeSectionRow();
    const segmented = this.makeSegmentedControl(
      [
        { icon: ICON_BLOCK, value: 'block', label: 'Block' },
        { icon: ICON_FLEX_ROW, value: 'flex-row', label: 'Flex Row' },
        { icon: ICON_FLEX_COL, value: 'flex-col', label: 'Flex Column' },
        { icon: ICON_GRID, value: 'grid', label: 'Grid' },
      ],
      activeDisplay,
      (val) => {
        if (val === 'block') {
          this.emitChange('display', 'block');
        } else if (val === 'flex-row') {
          this.emitChange('display', 'flex');
          this.emitChange('flex-direction', 'row');
        } else if (val === 'flex-col') {
          this.emitChange('display', 'flex');
          this.emitChange('flex-direction', 'column');
        } else if (val === 'grid') {
          this.emitChange('display', 'grid');
        }
      },
    );
    displayRow.appendChild(segmented);
    body.appendChild(displayRow);

    // Flex-specific controls
    if (hasFlex) {
      const flexExtrasRow = this.makeSectionRow();
      Object.assign(flexExtrasRow.style, {
        display: 'flex',
        gap: '8px',
      });

      const wrapSelect = this.makeSelectControl(
        ['nowrap', 'wrap', 'wrap-reverse'],
        getVal(cs, 'flex-wrap') || 'nowrap',
        (val) => this.emitChange('flex-wrap', val),
      );
      flexExtrasRow.appendChild(wrapSelect);
      body.appendChild(flexExtrasRow);

      // Gap
      const gapRow = this.makeSectionRow();
      Object.assign(gapRow.style, { display: 'flex', gap: '8px' });
      const gapLabel = this.makeInlineLabel('Gap');
      gapRow.appendChild(gapLabel);
      gapRow.appendChild(this.makePropInput('gap', null, cs));
      body.appendChild(gapRow);

      // Justify content
      const justifyRow = this.makeSectionRow();
      Object.assign(justifyRow.style, { display: 'flex', gap: '8px' });
      const justifyLabel = this.makeInlineLabel('Justify');
      justifyRow.appendChild(justifyLabel);
      const justifySelect = this.makeSelectControl(
        ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
        getVal(cs, 'justify-content') || 'flex-start',
        (val) => this.emitChange('justify-content', val),
      );
      justifyRow.appendChild(justifySelect);
      body.appendChild(justifyRow);

      // Align items
      const alignRow = this.makeSectionRow();
      Object.assign(alignRow.style, { display: 'flex', gap: '8px' });
      const alignLabel = this.makeInlineLabel('Align');
      alignRow.appendChild(alignLabel);
      const alignSelect = this.makeSelectControl(
        ['flex-start', 'flex-end', 'center', 'stretch', 'baseline'],
        getVal(cs, 'align-items') || 'stretch',
        (val) => this.emitChange('align-items', val),
      );
      alignRow.appendChild(alignSelect);
      body.appendChild(alignRow);
    }

    section.appendChild(body);
    parent.appendChild(section);
  }

  // -----------------------------------------------------------------------
  // 4. Spacing Section
  // -----------------------------------------------------------------------

  private buildSpacingSection(
    parent: HTMLDivElement,
    cs: Record<string, string>,
  ): void {
    const section = this.createSection();

    const header = this.makeSectionHeader('Spacing');
    section.appendChild(header);

    const body = this.makeSectionBody();

    // Padding group (group-label-inline)
    const padRow = this.makeSectionRow();
    Object.assign(padRow.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      paddingRight: '8px',
    });

    const padLabel = this.makeInlineLabel('Padding');
    padRow.appendChild(padLabel);

    // Horizontal padding input with icon
    padRow.appendChild(this.makePropInput('padding-left', ICON_PADDING_H, cs));

    // Vertical padding input with icon
    padRow.appendChild(this.makePropInput('padding-top', ICON_PADDING_V, cs));

    // Split button
    padRow.appendChild(this.makeSplitButton());

    body.appendChild(padRow);

    // Margin group (group-label-inline)
    const marRow = this.makeSectionRow();
    Object.assign(marRow.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      paddingRight: '8px',
    });

    const marLabel = this.makeInlineLabel('Margin');
    marRow.appendChild(marLabel);

    marRow.appendChild(this.makePropInput('margin-left', ICON_MARGIN_H, cs));
    marRow.appendChild(this.makePropInput('margin-top', ICON_MARGIN_V, cs));
    marRow.appendChild(this.makeSplitButton());

    body.appendChild(marRow);

    section.appendChild(body);
    parent.appendChild(section);
  }

  // -----------------------------------------------------------------------
  // 5. Size Section
  // -----------------------------------------------------------------------

  private buildSizeSection(
    parent: HTMLDivElement,
    cs: Record<string, string>,
  ): void {
    const section = this.createSection();

    const header = this.makeSectionHeader('Size', () => {
      // Add size constraint action
    });
    section.appendChild(header);

    const body = this.makeSectionBody();

    // Width + Height row
    const whRow = this.makeSectionRow();
    Object.assign(whRow.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    });

    const wLabel = this.makeInlineLabel('W');
    whRow.appendChild(wLabel);
    whRow.appendChild(this.makeComboInput('width', cs));

    const hLabel = this.makeInlineLabel('H');
    whRow.appendChild(hLabel);
    whRow.appendChild(this.makeComboInput('height', cs));

    body.appendChild(whRow);

    // Max W + Max H row
    const maxRow = this.makeSectionRow();
    Object.assign(maxRow.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    });

    const mwLabel = this.makeInlineLabel('Max W');
    maxRow.appendChild(mwLabel);
    maxRow.appendChild(this.makePropInput('max-width', null, cs, 1, true));

    const mhLabel = this.makeInlineLabel('Max H');
    maxRow.appendChild(mhLabel);
    maxRow.appendChild(this.makePropInput('max-height', null, cs, 1, true));

    // Lock aspect ratio button
    const lockBtn = document.createElement('button');
    Object.assign(lockBtn.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '28px',
      height: '28px',
      borderRadius: '6px',
      border: 'none',
      background: 'transparent',
      color: TEXT_DIM,
      cursor: 'pointer',
      padding: '0',
      flexShrink: '0',
    });
    lockBtn.appendChild(chainIcon(12));
    const onLockEnter = () => { lockBtn.style.background = INPUT_BG; };
    const onLockLeave = () => { lockBtn.style.background = 'transparent'; };
    lockBtn.addEventListener('mouseenter', onLockEnter);
    lockBtn.addEventListener('mouseleave', onLockLeave);
    this.cleanups.push(() => {
      lockBtn.removeEventListener('mouseenter', onLockEnter);
      lockBtn.removeEventListener('mouseleave', onLockLeave);
    });
    maxRow.appendChild(lockBtn);

    body.appendChild(maxRow);

    section.appendChild(body);
    parent.appendChild(section);
  }

  // -----------------------------------------------------------------------
  // 6. Typography Section
  // -----------------------------------------------------------------------

  private buildTypographySection(
    parent: HTMLDivElement,
    cs: Record<string, string>,
  ): void {
    const section = this.createSection();

    const header = this.makeSectionHeader('Typography');
    section.appendChild(header);

    const body = this.makeSectionBody();

    // Font family picker
    const fontFamily = getVal(cs, 'font-family') || 'system-ui';
    const fontRow = this.makeSectionRow();
    const fontBtn = document.createElement('button');
    Object.assign(fontBtn.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      height: '32px',
      padding: '0 8px',
      borderRadius: '8px',
      background: INPUT_BG,
      border: 'none',
      color: TEXT_PRIMARY,
      fontSize: '11px',
      fontWeight: '450',
      fontFamily: FONT,
      cursor: 'pointer',
      textAlign: 'left',
    });
    const firstFont = fontFamily.split(',')[0].trim().replace(/["']/g, '');
    const fontText = document.createElement('span');
    fontText.textContent = firstFont;
    Object.assign(fontText.style, {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    });
    fontBtn.appendChild(fontText);
    fontBtn.appendChild(chevronDownIcon(10));

    const onFontEnter = () => { fontBtn.style.background = INPUT_BG_HOVER; };
    const onFontLeave = () => { fontBtn.style.background = INPUT_BG; };
    fontBtn.addEventListener('mouseenter', onFontEnter);
    fontBtn.addEventListener('mouseleave', onFontLeave);
    this.cleanups.push(() => {
      fontBtn.removeEventListener('mouseenter', onFontEnter);
      fontBtn.removeEventListener('mouseleave', onFontLeave);
    });

    fontRow.appendChild(fontBtn);
    body.appendChild(fontRow);

    // Size + Weight row
    const sizeWeightRow = this.makeSectionRow();
    Object.assign(sizeWeightRow.style, {
      display: 'flex',
      gap: '8px',
    });

    const sizeLabel = this.makeInlineLabel('Size');
    sizeWeightRow.appendChild(sizeLabel);
    sizeWeightRow.appendChild(this.makePropInput('font-size', null, cs));

    const weightLabel = this.makeInlineLabel('Weight');
    sizeWeightRow.appendChild(weightLabel);
    const weightVal = getVal(cs, 'font-weight') || '400';
    const weightSelect = this.makeSelectControl(
      ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
      weightVal,
      (val) => this.emitChange('font-weight', val),
    );
    sizeWeightRow.appendChild(weightSelect);
    body.appendChild(sizeWeightRow);

    // Line height + Letter spacing
    const lineLetterRow = this.makeSectionRow();
    Object.assign(lineLetterRow.style, {
      display: 'flex',
      gap: '8px',
    });
    const lhLabel = this.makeInlineLabel('LH');
    lineLetterRow.appendChild(lhLabel);
    lineLetterRow.appendChild(this.makeComboInput('line-height', cs, 0.1));

    const lsLabel = this.makeInlineLabel('LS');
    lineLetterRow.appendChild(lsLabel);
    lineLetterRow.appendChild(this.makeComboInput('letter-spacing', cs, 0.1));
    body.appendChild(lineLetterRow);

    // Color row
    const colorRow = this.makeSectionRow();
    const colorControl = this.makeColorRow('color', cs);
    colorRow.appendChild(colorControl);
    body.appendChild(colorRow);

    // Text align segmented
    const alignRow = this.makeSectionRow();
    Object.assign(alignRow.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    });

    const currentAlign = getVal(cs, 'text-align') || 'left';
    const alignSeg = this.makeSegmentedControl(
      [
        { icon: TEXT_ALIGN_LEFT, value: 'left', label: 'Left' },
        { icon: TEXT_ALIGN_CENTER, value: 'center', label: 'Center' },
        { icon: TEXT_ALIGN_RIGHT, value: 'right', label: 'Right' },
      ],
      currentAlign,
      (val) => this.emitChange('text-align', val),
    );
    alignRow.appendChild(alignSeg);

    // Split/settings button at end of align row
    alignRow.appendChild(this.makeSplitButton());

    body.appendChild(alignRow);

    // Vertical align segmented
    const vAlignRow = this.makeSectionRow();
    const currentVAlign = getVal(cs, 'vertical-align') || 'top';
    let vAlignVal = 'top';
    if (currentVAlign === 'middle') vAlignVal = 'middle';
    else if (currentVAlign === 'bottom') vAlignVal = 'bottom';

    const vAlignSeg = this.makeSegmentedControl(
      [
        { icon: TEXT_VALIGN_TOP, value: 'top', label: 'Top' },
        { icon: TEXT_VALIGN_MIDDLE, value: 'middle', label: 'Middle' },
        { icon: TEXT_VALIGN_BOTTOM, value: 'bottom', label: 'Bottom' },
      ],
      vAlignVal,
      (val) => this.emitChange('vertical-align', val),
    );
    vAlignRow.appendChild(vAlignSeg);
    body.appendChild(vAlignRow);

    section.appendChild(body);
    parent.appendChild(section);
  }

  // -----------------------------------------------------------------------
  // 7. Appearance Section
  // -----------------------------------------------------------------------

  private buildAppearanceSection(
    parent: HTMLDivElement,
    cs: Record<string, string>,
  ): void {
    const section = this.createSection();

    const header = this.makeSectionHeader('Appearance');
    section.appendChild(header);

    const body = this.makeSectionBody();

    // Opacity + Z-index row
    const opZRow = this.makeSectionRow();
    Object.assign(opZRow.style, { display: 'flex', gap: '8px' });

    const opLabel = this.makeInlineLabel('Opacity');
    opZRow.appendChild(opLabel);
    opZRow.appendChild(this.makePropInput('opacity', null, cs, 0.05));

    const zLabel = this.makeInlineLabel('Z');
    opZRow.appendChild(zLabel);
    opZRow.appendChild(this.makePropInput('z-index', null, cs, 1));
    body.appendChild(opZRow);

    // Corner radius group
    const radiusRow = this.makeSectionRow();
    Object.assign(radiusRow.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      paddingRight: '8px',
    });

    radiusRow.appendChild(this.makePropInput('border-radius', ICON_RADIUS, cs));
    radiusRow.appendChild(this.makeSplitButton());

    body.appendChild(radiusRow);

    // Overflow row
    const overflowRow = this.makeSectionRow();
    Object.assign(overflowRow.style, { display: 'flex', gap: '8px' });
    const overflowLabel = this.makeInlineLabel('Overflow');
    overflowRow.appendChild(overflowLabel);
    const overflowVal = getVal(cs, 'overflow') || 'visible';
    const overflowSelect = this.makeSelectControl(
      ['visible', 'hidden', 'scroll', 'auto'],
      overflowVal,
      (val) => this.emitChange('overflow', val),
    );
    overflowRow.appendChild(overflowSelect);
    body.appendChild(overflowRow);

    section.appendChild(body);
    parent.appendChild(section);
  }

  // -----------------------------------------------------------------------
  // 8-11. Collapsed sections (header only with + button)
  // -----------------------------------------------------------------------

  private buildCollapsedSection(parent: HTMLDivElement, title: string): void {
    const section = this.createSection();
    const header = this.makeSectionHeader(title, () => {
      // Placeholder for add action
    });
    section.appendChild(header);
    parent.appendChild(section);
  }

  // -----------------------------------------------------------------------
  // Section structure helpers
  // -----------------------------------------------------------------------

  private createSection(): HTMLDivElement {
    const section = document.createElement('div');
    Object.assign(section.style, {
      borderBottom: '1px solid ' + BORDER,
    });
    return section;
  }

  private makeSectionHeader(
    title: string,
    onAdd?: () => void,
  ): HTMLDivElement {
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 8px 0 16px',
      height: '44px',
    });

    const titleEl = document.createElement('span');
    titleEl.textContent = title;
    Object.assign(titleEl.style, {
      fontSize: '12px',
      fontWeight: '500',
      color: TEXT_SECONDARY,
    });
    header.appendChild(titleEl);

    if (onAdd) {
      const addBtn = document.createElement('button');
      Object.assign(addBtn.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        border: 'none',
        background: 'transparent',
        color: TEXT_DIM,
        cursor: 'pointer',
        padding: '0',
        opacity: '0',
        transition: 'opacity 120ms, background 120ms',
      });
      addBtn.appendChild(plusIcon(14));

      // Show add button on section hover
      const onHeaderEnter = () => { addBtn.style.opacity = '1'; };
      const onHeaderLeave = () => { addBtn.style.opacity = '0'; };
      const onBtnEnter = () => { addBtn.style.background = INPUT_BG; };
      const onBtnLeave = () => { addBtn.style.background = 'transparent'; };
      header.addEventListener('mouseenter', onHeaderEnter);
      header.addEventListener('mouseleave', onHeaderLeave);
      addBtn.addEventListener('mouseenter', onBtnEnter);
      addBtn.addEventListener('mouseleave', onBtnLeave);
      addBtn.addEventListener('click', onAdd);
      this.cleanups.push(() => {
        header.removeEventListener('mouseenter', onHeaderEnter);
        header.removeEventListener('mouseleave', onHeaderLeave);
        addBtn.removeEventListener('mouseenter', onBtnEnter);
        addBtn.removeEventListener('mouseleave', onBtnLeave);
        addBtn.removeEventListener('click', onAdd);
      });

      header.appendChild(addBtn);
    }

    return header;
  }

  private makeSectionBody(): HTMLDivElement {
    const body = document.createElement('div');
    Object.assign(body.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      paddingBottom: '16px',
    });
    return body;
  }

  private makeSectionRow(): HTMLDivElement {
    const row = document.createElement('div');
    Object.assign(row.style, {
      padding: '0 48px 0 16px',
    });
    return row;
  }

  private makeInlineLabel(text: string): HTMLSpanElement {
    const label = document.createElement('span');
    label.textContent = text;
    Object.assign(label.style, {
      fontSize: '11px',
      fontWeight: '500',
      color: TEXT_DIM,
      flexShrink: '0',
      minWidth: '32px',
    });
    return label;
  }

  // -----------------------------------------------------------------------
  // Selector pill (for Target row)
  // -----------------------------------------------------------------------

  private makeSelectorPill(text: string, active: boolean): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, {
      padding: '4px 8px',
      borderRadius: '8px',
      fontSize: '11px',
      fontWeight: '500',
      fontFamily: FONT,
      border: 'none',
      cursor: 'pointer',
      background: active ? PILL_ACTIVE_BG : INPUT_BG,
      color: active ? PILL_ACTIVE_COLOR : TEXT_SECONDARY,
      transition: 'background 120ms, color 120ms',
    });
    return btn;
  }

  // -----------------------------------------------------------------------
  // Split button (32x32, toggles shorthand vs individual values)
  // -----------------------------------------------------------------------

  private makeSplitButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    Object.assign(btn.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      border: 'none',
      background: 'transparent',
      color: TEXT_DIM,
      cursor: 'pointer',
      padding: '0',
      flexShrink: '0',
    });
    btn.appendChild(splitIcon(12));

    const onEnter = () => { btn.style.background = INPUT_BG; };
    const onLeave = () => { btn.style.background = 'transparent'; };
    btn.addEventListener('mouseenter', onEnter);
    btn.addEventListener('mouseleave', onLeave);
    this.cleanups.push(() => {
      btn.removeEventListener('mouseenter', onEnter);
      btn.removeEventListener('mouseleave', onLeave);
    });

    return btn;
  }

  // -----------------------------------------------------------------------
  // Per-field reset dot
  // -----------------------------------------------------------------------

  private makeResetDot(
    property: string,
    currentValue: string,
    onReset: () => void,
  ): HTMLDivElement {
    const dot = document.createElement('div');
    Object.assign(dot.style, {
      width: '4px',
      height: '4px',
      borderRadius: '50%',
      background: RESET_DOT_COLOR,
      cursor: 'pointer',
      flexShrink: '0',
      display: 'none',
    });

    // Check if value differs from original
    const origKey = cssPropToCamel(property);
    const origVal = this.originalValues[origKey] ?? this.originalValues[property] ?? '';
    if (currentValue !== origVal && currentValue !== '') {
      dot.style.display = 'block';
    }

    const onClick = (e: MouseEvent) => {
      e.stopPropagation();
      dot.style.display = 'none';
      onReset();
    };
    dot.addEventListener('click', onClick);
    this.cleanups.push(() => dot.removeEventListener('click', onClick));

    return dot;
  }

  private updateResetDot(dot: HTMLDivElement, property: string, currentValue: string): void {
    const origKey = cssPropToCamel(property);
    const origVal = this.originalValues[origKey] ?? this.originalValues[property] ?? '';
    dot.style.display = (currentValue !== origVal && currentValue !== '') ? 'block' : 'none';
  }

  // -----------------------------------------------------------------------
  // PropInput control
  // -----------------------------------------------------------------------

  private makePropInput(
    property: string,
    iconPath: string | null,
    computedStyles: Record<string, string>,
    step: number = 1,
    showDash: boolean = false,
  ): HTMLDivElement {
    const rawValue = getVal(computedStyles, property);
    const parsed = parseNumericValue(rawValue);

    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      position: 'relative',
      height: '32px',
      borderRadius: '8px',
      background: INPUT_BG,
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      flex: '1',
      minWidth: '0',
    });

    // Hover
    const onEnter = () => { wrapper.style.background = INPUT_BG_HOVER; };
    const onLeave = () => {
      if (wrapper.querySelector('input:focus')) return;
      wrapper.style.background = INPUT_BG;
    };
    wrapper.addEventListener('mouseenter', onEnter);
    wrapper.addEventListener('mouseleave', onLeave);
    this.cleanups.push(() => {
      wrapper.removeEventListener('mouseenter', onEnter);
      wrapper.removeEventListener('mouseleave', onLeave);
    });

    // Icon label area (28px wide, ew-resize cursor)
    if (iconPath) {
      const labelEl = document.createElement('div');
      Object.assign(labelEl.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        bottom: '0',
        width: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'ew-resize',
        userSelect: 'none',
        flexShrink: '0',
        zIndex: '1',
        color: TEXT_DIM,
      });

      const icon = svgIcon(12, 12, iconPath);
      labelEl.appendChild(icon);
      wrapper.appendChild(labelEl);

      // Scrub on label area
      if (parsed !== null) {
        const unit = parsed.unit || 'px';
        const cleanup = attachScrub(labelEl, {
          initialValue: parsed.number,
          step,
          onUpdate: (val) => {
            input.value = String(Math.round(val * 1000) / 1000);
          },
          onCommit: (val) => {
            input.value = String(Math.round(val * 1000) / 1000);
            this.emitChange(property, formatNumericValue(val, unit));
          },
        });
        this.cleanups.push(cleanup);
      }
    }

    // Input field
    const input = document.createElement('input');
    input.type = 'text';
    const displayVal = parsed ? String(Math.round(parsed.number * 1000) / 1000) : rawValue || '';
    input.value = displayVal;
    if (showDash && !displayVal) {
      input.placeholder = '-';
    }
    Object.assign(input.style, {
      width: '100%',
      height: '100%',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      color: TEXT_PRIMARY,
      fontSize: '11px',
      fontWeight: '450',
      fontFamily: FONT,
      paddingLeft: iconPath ? '28px' : '8px',
      paddingRight: '6px',
      boxSizing: 'border-box',
      fontVariantNumeric: 'tabular-nums',
    });

    // Focus outline on wrapper
    const onFocus = () => {
      wrapper.style.outline = '1px solid ' + INPUT_FOCUS;
      wrapper.style.background = INPUT_BG_HOVER;
    };
    const onBlur = () => {
      wrapper.style.outline = 'none';
      wrapper.style.background = INPUT_BG;
    };
    input.addEventListener('focus', onFocus);
    input.addEventListener('blur', onBlur);
    this.cleanups.push(() => {
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('blur', onBlur);
    });

    // Commit on Enter or change
    const onCommit = () => {
      const val = input.value.trim();
      if (parsed) {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          const unit = parsed.unit || 'px';
          this.emitChange(property, formatNumericValue(num, unit));
        }
      } else {
        this.emitChange(property, val);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        onCommit();
        input.blur();
      }
    };
    input.addEventListener('change', onCommit);
    input.addEventListener('keydown', onKeyDown);
    this.cleanups.push(() => {
      input.removeEventListener('change', onCommit);
      input.removeEventListener('keydown', onKeyDown);
    });

    wrapper.appendChild(input);
    return wrapper;
  }

  // -----------------------------------------------------------------------
  // ComboInput (input + dropdown trigger chevron)
  // -----------------------------------------------------------------------

  private makeComboInput(
    property: string,
    computedStyles: Record<string, string>,
    step: number = 1,
  ): HTMLDivElement {
    const rawValue = getVal(computedStyles, property);
    const parsed = parseNumericValue(rawValue);

    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      position: 'relative',
      height: '32px',
      borderRadius: '8px',
      background: INPUT_BG,
      display: 'flex',
      alignItems: 'center',
      flex: '1',
      minWidth: '0',
    });

    // Hover
    const onEnter = () => { wrapper.style.background = INPUT_BG_HOVER; };
    const onLeave = () => {
      if (wrapper.querySelector('input:focus')) return;
      wrapper.style.background = INPUT_BG;
    };
    wrapper.addEventListener('mouseenter', onEnter);
    wrapper.addEventListener('mouseleave', onLeave);
    this.cleanups.push(() => {
      wrapper.removeEventListener('mouseenter', onEnter);
      wrapper.removeEventListener('mouseleave', onLeave);
    });

    // Input
    const input = document.createElement('input');
    input.type = 'text';
    // Display "Fill" for width auto, pixel value otherwise
    let displayVal = '';
    if (property === 'width' && (rawValue === 'auto' || !rawValue)) {
      displayVal = 'Fill';
    } else if (parsed) {
      displayVal = String(Math.round(parsed.number * 1000) / 1000);
    } else {
      displayVal = rawValue || '';
    }
    input.value = displayVal;
    Object.assign(input.style, {
      width: '100%',
      height: '100%',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      color: TEXT_PRIMARY,
      fontSize: '11px',
      fontWeight: '450',
      fontFamily: FONT,
      paddingLeft: '8px',
      paddingRight: '24px',
      boxSizing: 'border-box',
      fontVariantNumeric: 'tabular-nums',
    });

    // Focus
    const onFocus = () => {
      wrapper.style.outline = '1px solid ' + INPUT_FOCUS;
      wrapper.style.background = INPUT_BG_HOVER;
    };
    const onBlur = () => {
      wrapper.style.outline = 'none';
      wrapper.style.background = INPUT_BG;
    };
    input.addEventListener('focus', onFocus);
    input.addEventListener('blur', onBlur);
    this.cleanups.push(() => {
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('blur', onBlur);
    });

    // Commit
    const onCommit = () => {
      const val = input.value.trim();
      if (parsed) {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          const unit = parsed.unit || 'px';
          this.emitChange(property, formatNumericValue(num, unit));
        }
      } else {
        this.emitChange(property, val);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        onCommit();
        input.blur();
      }
    };
    input.addEventListener('change', onCommit);
    input.addEventListener('keydown', onKeyDown);
    this.cleanups.push(() => {
      input.removeEventListener('change', onCommit);
      input.removeEventListener('keydown', onKeyDown);
    });

    wrapper.appendChild(input);

    // Chevron trigger on right
    const chevronBtn = document.createElement('div');
    Object.assign(chevronBtn.style, {
      position: 'absolute',
      right: '0',
      top: '0',
      bottom: '0',
      width: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: TEXT_DIM,
    });
    chevronBtn.appendChild(chevronDownIcon(12));
    wrapper.appendChild(chevronBtn);

    return wrapper;
  }

  // -----------------------------------------------------------------------
  // SelectControl
  // -----------------------------------------------------------------------

  private makeSelectControl(
    options: string[],
    currentValue: string,
    onChange: (val: string) => void,
  ): HTMLDivElement {
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      position: 'relative',
      height: '32px',
      borderRadius: '8px',
      background: INPUT_BG,
      display: 'flex',
      alignItems: 'center',
      flex: '1',
      minWidth: '0',
      cursor: 'pointer',
    });

    const valueText = document.createElement('span');
    valueText.textContent = currentValue;
    Object.assign(valueText.style, {
      flex: '1',
      fontSize: '11px',
      fontWeight: '450',
      color: TEXT_PRIMARY,
      paddingLeft: '8px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    });

    const chevron = chevronDownIcon(10);
    Object.assign(chevron.style, {
      flexShrink: '0',
      marginRight: '8px',
      color: TEXT_DIM,
    });

    wrapper.appendChild(valueText);
    wrapper.appendChild(chevron);

    // Hover
    const onEnter = () => { wrapper.style.background = INPUT_BG_HOVER; };
    const onLeave = () => { wrapper.style.background = INPUT_BG; };
    wrapper.addEventListener('mouseenter', onEnter);
    wrapper.addEventListener('mouseleave', onLeave);
    this.cleanups.push(() => {
      wrapper.removeEventListener('mouseenter', onEnter);
      wrapper.removeEventListener('mouseleave', onLeave);
    });

    // Click to show dropdown
    let dropdown: HTMLDivElement | null = null;

    const closeDropdown = () => {
      if (dropdown && dropdown.parentElement) {
        dropdown.parentElement.removeChild(dropdown);
      }
      dropdown = null;
    };

    const onClick = (e: MouseEvent) => {
      e.stopPropagation();

      if (dropdown) {
        closeDropdown();
        return;
      }

      dropdown = document.createElement('div');
      Object.assign(dropdown.style, {
        position: 'absolute',
        top: '34px',
        left: '0',
        right: '0',
        background: '#222',
        borderRadius: '8px',
        border: '1px solid ' + BORDER,
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        zIndex: '10',
        maxHeight: '200px',
        overflowY: 'auto',
        scrollbarWidth: 'none',
        padding: '4px',
      });

      for (const opt of options) {
        const item = document.createElement('div');
        const isActive = opt === currentValue;
        Object.assign(item.style, {
          padding: '6px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          color: isActive ? PILL_ACTIVE_COLOR : TEXT_SECONDARY,
          background: isActive ? PILL_ACTIVE_BG : 'transparent',
          cursor: 'pointer',
        });
        item.textContent = opt;

        const onItemEnter = () => {
          if (!isActive) item.style.background = INPUT_BG;
        };
        const onItemLeave = () => {
          if (!isActive) item.style.background = 'transparent';
        };
        const onItemClick = (ev: MouseEvent) => {
          ev.stopPropagation();
          valueText.textContent = opt;
          onChange(opt);
          closeDropdown();
        };
        item.addEventListener('mouseenter', onItemEnter);
        item.addEventListener('mouseleave', onItemLeave);
        item.addEventListener('click', onItemClick);
        this.cleanups.push(() => {
          item.removeEventListener('mouseenter', onItemEnter);
          item.removeEventListener('mouseleave', onItemLeave);
          item.removeEventListener('click', onItemClick);
        });

        dropdown.appendChild(item);
      }

      wrapper.appendChild(dropdown);

      // Close on outside click
      const onDocClick = () => {
        closeDropdown();
        document.removeEventListener('click', onDocClick);
      };
      setTimeout(() => document.addEventListener('click', onDocClick), 0);
      this.cleanups.push(() => document.removeEventListener('click', onDocClick));
    };

    wrapper.addEventListener('click', onClick);
    this.cleanups.push(() => wrapper.removeEventListener('click', onClick));

    return wrapper;
  }

  // -----------------------------------------------------------------------
  // SegmentedControl
  // -----------------------------------------------------------------------

  private makeSegmentedControl(
    items: Array<{ icon: string; value: string; label: string }>,
    activeValue: string,
    onChange: (val: string) => void,
  ): HTMLDivElement {
    const outer = document.createElement('div');
    Object.assign(outer.style, {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      background: INPUT_BG,
      borderRadius: '8px',
      height: '28px',
      overflow: 'hidden',
      flex: '1',
    });

    // Sliding pill
    const pill = document.createElement('div');
    Object.assign(pill.style, {
      position: 'absolute',
      height: '100%',
      background: 'rgba(255,255,255,0.06)',
      borderRadius: '8px',
      transition: 'transform 150ms ' + EASE + ', width 150ms ' + EASE,
      pointerEvents: 'none',
      zIndex: '0',
    });
    outer.appendChild(pill);

    const buttons: HTMLButtonElement[] = [];
    let activeIdx = items.findIndex((i) => i.value === activeValue);
    if (activeIdx < 0) activeIdx = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const btn = document.createElement('button');
      const isActive = i === activeIdx;
      Object.assign(btn.style, {
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        border: 'none',
        background: 'transparent',
        color: isActive ? TEXT_PRIMARY : TEXT_DIM,
        cursor: 'pointer',
        position: 'relative',
        zIndex: '1',
        padding: '0',
        transition: 'color 150ms',
      });
      btn.title = item.label;
      btn.setAttribute('aria-label', item.label);
      btn.appendChild(svgIcon(14, 14, item.icon));

      const onClick = () => {
        activeIdx = i;
        for (let j = 0; j < buttons.length; j++) {
          buttons[j].style.color = j === i ? TEXT_PRIMARY : TEXT_DIM;
        }
        updatePill();
        onChange(item.value);
      };
      btn.addEventListener('click', onClick);
      this.cleanups.push(() => btn.removeEventListener('click', onClick));

      buttons.push(btn);
      outer.appendChild(btn);
    }

    const updatePill = () => {
      if (!buttons[activeIdx]) return;
      const segW = 100 / items.length;
      pill.style.width = segW + '%';
      pill.style.transform = 'translateX(' + (activeIdx * 100) + '%)';
    };

    requestAnimationFrame(updatePill);

    return outer;
  }

  // -----------------------------------------------------------------------
  // Icon button group (for alignment)
  // -----------------------------------------------------------------------

  private makeIconButtonGroup(
    items: Array<{ icon: string; value: string }>,
    activeValue: string,
    onChange: (val: string) => void,
  ): HTMLDivElement {
    const group = document.createElement('div');
    Object.assign(group.style, {
      display: 'flex',
      gap: '2px',
    });

    const buttons: HTMLButtonElement[] = [];

    for (const item of items) {
      const btn = document.createElement('button');
      const isActive = item.value === activeValue;
      Object.assign(btn.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        borderRadius: '6px',
        border: 'none',
        background: isActive ? INPUT_BG_ACTIVE : 'transparent',
        color: isActive ? TEXT_PRIMARY : TEXT_DIM,
        cursor: 'pointer',
        padding: '0',
      });
      btn.appendChild(svgIcon(14, 14, item.icon));

      const onClick = () => {
        for (const b of buttons) {
          b.style.background = 'transparent';
          b.style.color = TEXT_DIM;
        }
        btn.style.background = INPUT_BG_ACTIVE;
        btn.style.color = TEXT_PRIMARY;
        onChange(item.value);
      };
      btn.addEventListener('click', onClick);
      this.cleanups.push(() => btn.removeEventListener('click', onClick));

      const onEnter = () => {
        if (btn.style.background !== INPUT_BG_ACTIVE) {
          btn.style.background = INPUT_BG;
        }
      };
      const onLeave = () => {
        if (btn.style.background === INPUT_BG) {
          btn.style.background = 'transparent';
        }
      };
      btn.addEventListener('mouseenter', onEnter);
      btn.addEventListener('mouseleave', onLeave);
      this.cleanups.push(() => {
        btn.removeEventListener('mouseenter', onEnter);
        btn.removeEventListener('mouseleave', onLeave);
      });

      buttons.push(btn);
      group.appendChild(btn);
    }

    return group;
  }

  // -----------------------------------------------------------------------
  // ColorRow
  // -----------------------------------------------------------------------

  private makeColorRow(
    property: string,
    computedStyles: Record<string, string>,
  ): HTMLDivElement {
    const rawValue = getVal(computedStyles, property);
    const hexValue = parseColor(rawValue);

    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      height: '32px',
    });

    // Swatch: 16px circle with inset shadow
    const swatchWrap = document.createElement('div');
    Object.assign(swatchWrap.style, {
      position: 'relative',
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      background: hexValue,
      flexShrink: '0',
      cursor: 'pointer',
      boxShadow: 'rgba(0,0,0,0.1) 0px 0px 0px 1px inset',
    });

    // Hidden native color input
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = hexValue;
    Object.assign(colorInput.style, {
      position: 'absolute',
      inset: '0',
      opacity: '0',
      width: '100%',
      height: '100%',
      cursor: 'pointer',
      padding: '0',
      border: 'none',
    });
    swatchWrap.appendChild(colorInput);

    // Hex text input
    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.value = hexValue;
    Object.assign(hexInput.style, {
      flex: '1',
      height: '32px',
      border: 'none',
      outline: 'none',
      background: INPUT_BG,
      borderRadius: '8px',
      color: TEXT_PRIMARY,
      fontSize: '11px',
      fontWeight: '450',
      fontFamily: FONT,
      padding: '0 8px',
      boxSizing: 'border-box',
    });

    const onColorInput = () => {
      swatchWrap.style.background = colorInput.value;
      hexInput.value = colorInput.value;
      this.emitChange(property, colorInput.value);
    };
    colorInput.addEventListener('input', onColorInput);
    this.cleanups.push(() => colorInput.removeEventListener('input', onColorInput));

    const onHexChange = () => {
      const val = hexInput.value.trim();
      if (/^#[0-9a-fA-F]{3,6}$/.test(val)) {
        const normalized =
          val.length === 4
            ? '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3]
            : val;
        swatchWrap.style.background = normalized;
        colorInput.value = normalized;
        this.emitChange(property, normalized);
      }
    };
    hexInput.addEventListener('change', onHexChange);
    this.cleanups.push(() => hexInput.removeEventListener('change', onHexChange));

    // Focus style
    const onFocus = () => { hexInput.style.outline = '1px solid ' + INPUT_FOCUS; };
    const onBlur = () => { hexInput.style.outline = 'none'; };
    hexInput.addEventListener('focus', onFocus);
    hexInput.addEventListener('blur', onBlur);
    this.cleanups.push(() => {
      hexInput.removeEventListener('focus', onFocus);
      hexInput.removeEventListener('blur', onBlur);
    });

    row.appendChild(swatchWrap);
    row.appendChild(hexInput);
    return row;
  }

  // -----------------------------------------------------------------------
  // Change emission
  // -----------------------------------------------------------------------

  private emitChange(property: string, value: string): void {
    this.changeCallback?.(property, value);
  }
}
