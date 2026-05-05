import { attachScrub, parseNumericValue, formatNumericValue } from './scrub.js';
import type { DetectedControls } from './control-detector.js';
import {
  layoutAlignLeft,
  layoutAlignRight,
  layoutAlignHorizontalCenter,
  layoutAlignTop,
  layoutAlignBottom,
  layoutAlignVerticalCenter,
  textAlignLeft,
  textAlignCenter,
  textAlignRight,
  textAlignTop,
  textAlignMiddle,
  textAlignBottom,
  rectangleSmall,
  autolayoutAddHorizontal,
  autolayoutAddVertical,
  gridView,
  chevronDown,
  plus,
  minus,
  alPaddingHorizontal,
  alPaddingVertical,
  alPaddingSides,
  alSpacingHorizontal,
  radiusTopLeft,
  lockClosed,
  lockOpen,
  iconDot,
  iconPositionLeft,
  iconPositionCenterH,
  iconPositionRight,
  iconPositionTop,
  iconPositionCenterV,
  iconPositionBottom,
} from './icons.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PropertyChangeCallback = (property: string, value: string) => void;
type ElementSelectCallback = (element: HTMLElement) => void;

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

function parseOpacity(rgba: string): number {
  const m = rgba.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
  if (m) return Math.round(parseFloat(m[1]) * 100);
  return 100;
}

interface ParsedShadow {
  inset: boolean;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
}

function parseBoxShadow(val: string): ParsedShadow | null {
  if (!val || val === 'none') return null;
  const inset = val.includes('inset');
  const clean = val.replace('inset', '').trim();
  const colorMatch = clean.match(/(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})/);
  const color = colorMatch ? colorMatch[1] : 'rgba(0,0,0,0.15)';
  const withoutColor = clean.replace(/(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})/, '').trim();
  const nums = withoutColor.split(/\s+/).map(parseFloat).filter(n => !isNaN(n));
  return {
    inset,
    x: nums[0] ?? 0,
    y: nums[1] ?? 0,
    blur: nums[2] ?? 0,
    spread: nums[3] ?? 0,
    color,
  };
}

function buildBoxShadow(s: ParsedShadow): string {
  const parts: string[] = [];
  if (s.inset) parts.push('inset');
  parts.push(s.x + 'px', s.y + 'px', s.blur + 'px', s.spread + 'px', s.color);
  return parts.join(' ');
}

interface ParsedFilter {
  type: string;
  value: number;
  unit: string;
}

function parseFilterString(val: string): ParsedFilter[] {
  if (!val || val === 'none') return [];
  const re = /(\w[\w-]*)\(([^)]+)\)/g;
  const result: ParsedFilter[] = [];
  let m;
  while ((m = re.exec(val)) !== null) {
    const type = m[1];
    const raw = m[2].trim();
    const num = parseFloat(raw);
    const unit = raw.replace(String(num), '').trim() || '';
    result.push({ type, value: isNaN(num) ? 0 : num, unit });
  }
  return result;
}

function buildFilterString(filters: ParsedFilter[]): string {
  if (filters.length === 0) return 'none';
  return filters.map(f => f.type + '(' + f.value + f.unit + ')').join(' ');
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
// CSS Custom Property names (set on panel root, referenced everywhere)
// ---------------------------------------------------------------------------

const V = {
  surface: '--improv-surface',
  surfaceHover: '--improv-surface-hover',
  text: '--improv-text',
  textSecondary: '--improv-text-secondary',
  textTertiary: '--improv-text-tertiary',
  border: '--improv-border',
  inputBg: '--improv-input-bg',
  blueBg: '--improv-blue-bg',
  blueText: '--improv-blue-text',
  blue500: '--improv-blue-500',
  surfaceActive: '--improv-surface-active',
  black: '--improv-black',
  white: '--improv-white',
} as const;

// Resolved dark-mode values (design tokens)
const TOKENS: Record<string, string> = {
  [V.surface]: 'color-mix(in srgb, #1c1917 95%, #ffffff)',
  [V.surfaceHover]: 'color-mix(in srgb, #ffffff 5%, transparent)',
  [V.text]: 'color-mix(in srgb, #ffffff 90%, transparent)',
  [V.textSecondary]: 'color-mix(in srgb, #ffffff 70%, transparent)',
  [V.textTertiary]: 'color-mix(in srgb, #ffffff 50%, transparent)',
  [V.border]: 'color-mix(in srgb, #ffffff 10%, transparent)',
  [V.inputBg]: 'color-mix(in srgb, #ffffff 5%, transparent)',
  [V.blueBg]: 'color-mix(in srgb, #0768CF 50%, transparent)',
  [V.blueText]: '#0D99FF',
  [V.blue500]: '#0D99FF',
  [V.surfaceActive]: 'color-mix(in srgb, #ffffff 5%, transparent)',
  [V.black]: '#1c1917',
  [V.white]: '#ffffff',
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PANEL_WIDTH = 280;
const FONT = 'system-ui, -apple-system, sans-serif';
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

// Shorthand accessors for var() references
const tv = (name: string) => `var(${name})`;

// ---------------------------------------------------------------------------
// Tree node type for the Elements tab
// ---------------------------------------------------------------------------

interface TreeNode {
  element: HTMLElement;
  depth: number;
  children: TreeNode[];
  expanded: boolean;
  tagName: string;
  displayName: string;
  isComponent: boolean;
}

// ---------------------------------------------------------------------------
// PropertyPanel
// ---------------------------------------------------------------------------

export class PropertyPanel {
  private shadow: ShadowRoot;
  private container: HTMLDivElement;
  private cleanups: Array<() => void> = [];
  private changeCallback: PropertyChangeCallback | null = null;
  private selectCallback: ElementSelectCallback | null = null;
  private activeTab: 'elements' | 'design' = 'design';
  private tabContentEl: HTMLDivElement | null = null;
  private controls: DetectedControls | null = null;
  private computedStyles: Record<string, string> = {};
  private originalValues: Record<string, string> = {};
  private selectedElement: HTMLElement | null = null;
  private treeRoot: TreeNode | null = null;

  constructor(shadowRoot: ShadowRoot) {
    this.shadow = shadowRoot;
    this.container = document.createElement('div');
    this.applyContainerStyles();
    this.shadow.appendChild(this.container);
  }

  // -----------------------------------------------------------------------
  // Container styles - set CSS custom properties on the root
  // -----------------------------------------------------------------------

  private applyContainerStyles(): void {
    // Apply CSS custom properties
    for (const [prop, value] of Object.entries(TOKENS)) {
      this.container.style.setProperty(prop, value);
    }

    Object.assign(this.container.style, {
      position: 'fixed',
      right: '16px',
      bottom: '68px',
      width: PANEL_WIDTH + 'px',
      maxHeight: 'calc(100vh - 84px)',
      overflowY: 'auto',
      scrollbarWidth: 'none',
      background: tv(V.surface),
      borderRadius: '16px',
      border: '1px solid ' + tv(V.border),
      boxShadow:
        '0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.04)',
      pointerEvents: 'auto',
      fontFamily: FONT,
      fontSize: '13px',
      color: tv(V.text),
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
      '.improv-pp-panel::-webkit-scrollbar { display: none; }';
    this.shadow.appendChild(style);
    this.container.classList.add('improv-pp-panel');
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  render(
    controls: DetectedControls,
    computedStyles: Record<string, string>,
  ): void {
    this.cleanup();
    this.clearContainer();
    this.controls = controls;
    this.computedStyles = computedStyles;

    // Capture initial values for per-field reset tracking
    this.originalValues = {};
    for (const key of Object.keys(computedStyles)) {
      this.originalValues[key] = computedStyles[key];
    }

    // Build element tree from document.body
    this.treeRoot = this.buildTree(document.body, 0);

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

  onElementSelect(callback: ElementSelectCallback): void {
    this.selectCallback = callback;
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
    this.selectCallback = null;
    this.controls = null;
    this.treeRoot = null;
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
  // Tab bar (exact: padding 4px 8px, border-bottom 1px solid border)
  // -----------------------------------------------------------------------

  private buildTabBar(): void {
    const bar = document.createElement('div');
    Object.assign(bar.style, {
      display: 'flex',
      alignItems: 'center',
      padding: '8px',
      borderBottom: '1px solid ' + tv(V.border),
      position: 'relative',
    });

    // Sliding pill indicator (behind tabs)
    const pill = document.createElement('div');
    Object.assign(pill.style, {
      position: 'absolute',
      top: '8px',
      height: 'calc(100% - 16px)',
      background: tv(V.inputBg),
      borderRadius: '8px',
      transition: 'transform 0.2s ' + EASE + ', width 0.2s ' + EASE,
      pointerEvents: 'none',
    });
    bar.appendChild(pill);

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
        padding: '8px 12px',
        fontSize: '12px',
        fontWeight: '500',
        fontFamily: FONT,
        color: isActive ? tv(V.text) : tv(V.textTertiary),
        cursor: 'pointer',
        position: 'relative',
        zIndex: '1',
        transition: 'color 150ms ' + EASE,
      });

      const onClick = () => {
        this.activeTab = def.id;
        for (let i = 0; i < tabs.length; i++) {
          const t = tabs[i];
          t.style.color =
            tabDefs[i].id === def.id ? tv(V.text) : tv(V.textTertiary);
        }
        this.updatePillPosition(pill, tabs, tabDefs);
        this.renderTabContent();
      };
      btn.addEventListener('click', onClick);
      this.cleanups.push(() => btn.removeEventListener('click', onClick));

      tabs.push(btn);
      bar.appendChild(btn);
    }

    // Version text on right
    const version = document.createElement('span');
    version.textContent = 'v0.1';
    Object.assign(version.style, {
      fontSize: '11px',
      color: tv(V.textTertiary),
      marginLeft: 'auto',
      paddingRight: '8px',
      flexShrink: '0',
    });

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
  // Elements tab - DOM tree
  // -----------------------------------------------------------------------

  private buildTree(element: HTMLElement, depth: number): TreeNode {
    const tagName = element.tagName.toLowerCase();
    const isComponent = this.isFrameworkComponent(element);
    const displayName = this.getNodeDisplayName(element);

    const node: TreeNode = {
      element,
      depth,
      children: [],
      expanded: depth < 2,
      tagName,
      displayName,
      isComponent,
    };

    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i] as HTMLElement;
      if (!child || child.nodeType !== 1) continue;
      // Skip our own panel
      if (
        child.tagName === 'IMPROV-PANEL' ||
        child.classList.contains('improv-pp-panel')
      )
        continue;
      // Skip script/style/noscript
      const tag = child.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') continue;
      node.children.push(this.buildTree(child, depth + 1));
    }

    return node;
  }

  private isFrameworkComponent(el: HTMLElement): boolean {
    // Check for React/Vue/Svelte component markers
    for (const attr of el.getAttributeNames()) {
      if (
        attr.startsWith('data-reactroot') ||
        attr.startsWith('data-v-') ||
        attr.startsWith('data-svelte')
      )
        return true;
    }
    // Check for custom elements (web components)
    if (el.tagName.includes('-')) return true;
    return false;
  }

  private getNodeDisplayName(el: HTMLElement): string {
    // Prefer class name
    if (el.className && typeof el.className === 'string') {
      const firstClass = el.className.split(/\s+/)[0];
      if (firstClass && firstClass.length < 30) {
        return '.' + firstClass;
      }
    }
    // Then id
    if (el.id) {
      return '#' + el.id;
    }
    // Then text content (truncated)
    const text = el.textContent?.trim();
    if (text && text.length > 0) {
      const truncated = text.length > 30 ? text.substring(0, 27) + '...' : text;
      // Only show text if this element has direct text nodes
      let hasDirectText = false;
      for (const child of el.childNodes) {
        if (child.nodeType === 3 && child.textContent?.trim()) {
          hasDirectText = true;
          break;
        }
      }
      if (hasDirectText) return truncated;
    }
    // Fallback to tag
    return el.tagName.toLowerCase();
  }

  private buildElementsTab(parent: HTMLDivElement): void {
    const treeContainer = document.createElement('div');
    Object.assign(treeContainer.style, {
      padding: '4px 0',
      overflowX: 'auto',
    });

    if (this.treeRoot) {
      this.renderTreeNode(treeContainer, this.treeRoot);
    }

    parent.appendChild(treeContainer);
  }

  private renderTreeNode(container: HTMLElement, node: TreeNode): void {
    const row = document.createElement('div');
    const paddingLeft = node.depth * 20 + 12;
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      height: '32px',
      paddingLeft: paddingLeft + 'px',
      paddingRight: '8px',
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'background 0.12s',
    });

    // Check if this is the selected element
    const isSelected = node.element === this.selectedElement;
    if (isSelected) {
      row.style.background = tv(V.blueBg);
    }

    // Hover
    const onEnter = () => {
      if (!isSelected) {
        row.style.background = tv(V.surfaceHover);
      }
    };
    const onLeave = () => {
      if (!isSelected) {
        row.style.background = 'transparent';
      }
    };
    row.addEventListener('mouseenter', onEnter);
    row.addEventListener('mouseleave', onLeave);
    this.cleanups.push(() => {
      row.removeEventListener('mouseenter', onEnter);
      row.removeEventListener('mouseleave', onLeave);
    });

    // Arrow (expand/collapse) - 16x16
    const arrowWrap = document.createElement('div');
    Object.assign(arrowWrap.style, {
      width: '16px',
      height: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
      marginRight: '4px',
    });

    if (node.children.length > 0) {
      const arrow = chevronDown(16);
      Object.assign(arrow.style, {
        transition: 'transform 0.12s',
        transform: node.expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
        color: tv(V.textTertiary),
      });
      arrowWrap.appendChild(arrow);

      const onArrowClick = (e: MouseEvent) => {
        e.stopPropagation();
        node.expanded = !node.expanded;
        arrow.style.transform = node.expanded
          ? 'rotate(0deg)'
          : 'rotate(-90deg)';
        // Toggle children visibility
        const childContainer = row.nextElementSibling as HTMLElement | null;
        if (childContainer && childContainer.dataset.treeChildren === 'true') {
          childContainer.style.display = node.expanded ? 'block' : 'none';
        }
      };
      arrowWrap.addEventListener('click', onArrowClick);
      arrowWrap.style.cursor = 'pointer';
      this.cleanups.push(() =>
        arrowWrap.removeEventListener('click', onArrowClick),
      );
    }
    row.appendChild(arrowWrap);

    // Icon - 16x16 (tag icon for DOM, component icon for framework)
    const iconWrap = document.createElement('div');
    Object.assign(iconWrap.style, {
      width: '16px',
      height: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
      marginRight: '6px',
      color: node.isComponent ? tv(V.blueText) : tv(V.textTertiary),
    });
    // Use a simple dot for tree nodes since we don't have specific tree icons in the reference
    const treeDot = document.createElement('div');
    Object.assign(treeDot.style, {
      width: '4px',
      height: '4px',
      borderRadius: '50%',
      background: 'currentColor',
    });
    iconWrap.appendChild(treeDot);
    row.appendChild(iconWrap);

    // Name
    const nameEl = document.createElement('span');
    nameEl.textContent = node.displayName;
    Object.assign(nameEl.style, {
      fontSize: '13px',
      fontWeight: '400',
      color: tv(V.text),
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      flex: '1',
      minWidth: '0',
    });
    row.appendChild(nameEl);

    // Click to select element
    const onRowClick = () => {
      this.selectedElement = node.element;
      this.selectCallback?.(node.element);
      // Re-render tree to update selection highlighting
      if (this.tabContentEl) {
        this.renderTabContent();
      }
    };
    row.addEventListener('click', onRowClick);
    this.cleanups.push(() => row.removeEventListener('click', onRowClick));

    container.appendChild(row);

    // Children container
    if (node.children.length > 0) {
      const childContainer = document.createElement('div');
      childContainer.dataset.treeChildren = 'true';
      childContainer.style.display = node.expanded ? 'block' : 'none';
      for (const child of node.children) {
        this.renderTreeNode(childContainer, child);
      }
      container.appendChild(childContainer);
    }
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

    // 8. Fill
    this.buildFillSection(parent, cs);

    // 9. Border
    this.buildBorderSection(parent, cs);

    // 10. Shadow
    this.buildShadowSection(parent, cs);

    // 11. Filters
    this.buildFiltersSection(parent, cs);
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

    // Target group
    const targetRow = this.makeSectionRow();

    const targetLabel = this.makeGroupLabelInline('Target');
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

    // Trigger group
    const triggerRow = this.makeSectionRow();

    const triggerLabel = this.makeGroupLabelInline('Trigger');
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
  // 2. Position Section - 6-button alignment row
  // -----------------------------------------------------------------------

  private buildPositionSection(
    parent: HTMLDivElement,
    cs: Record<string, string>,
  ): void {
    const section = this.createSection();

    const header = this.makeSectionHeader('Position');
    section.appendChild(header);

    const body = this.makeSectionBody();

    // Alignment field (label above controls - Field pattern)
    const alignField = this.makeSectionRow();
    const alignFieldWrap = document.createElement('div');
    Object.assign(alignFieldWrap.style, {
      display: 'flex', flexDirection: 'column', gap: '4px', flex: '1', minWidth: '0',
    });
    alignFieldWrap.appendChild(this.makeFieldLabel('Alignment'));

    const alignRow = document.createElement('div');
    const alignContainer = document.createElement('div');
    Object.assign(alignContainer.style, {
      display: 'flex',
      gap: '8px',
    });

    // Determine enabled state for groups
    const positionVal = getVal(cs, 'position') || 'static';
    const parentDisplay = getVal(cs, 'display') || 'block';
    const parentFlexDir = getVal(cs, 'flex-direction') || 'row';
    const isAbsOrFixed = positionVal === 'absolute' || positionVal === 'fixed';
    const isParentGrid = parentDisplay === 'grid' || parentDisplay === 'inline-grid';
    const isParentFlexCol = (parentDisplay === 'flex' || parentDisplay === 'inline-flex') && parentFlexDir.includes('column');
    const isParentFlexRow = (parentDisplay === 'flex' || parentDisplay === 'inline-flex') && !parentFlexDir.includes('column');

    const hEnabled = isAbsOrFixed || isParentGrid || isParentFlexCol;
    const vEnabled = isAbsOrFixed || isParentGrid || isParentFlexRow;

    // Horizontal alignment group
    const hGroup = document.createElement('div');
    Object.assign(hGroup.style, {
      flex: '1',
      display: 'flex',
      background: tv(V.surfaceHover),
      borderRadius: '8px',
      overflow: 'hidden',
      opacity: hEnabled ? '1' : '0.3',
      pointerEvents: hEnabled ? 'auto' : 'none',
    });

    const hIcons = [
      { icon: () => layoutAlignLeft(24), value: 'left' },
      { icon: () => layoutAlignHorizontalCenter(24), value: 'center' },
      { icon: () => layoutAlignRight(24), value: 'right' },
    ];

    for (let i = 0; i < hIcons.length; i++) {
      const item = hIcons[i];
      const btn = document.createElement('button');
      Object.assign(btn.style, {
        flex: '1',
        height: '32px',
        border: 'none',
        background: 'transparent',
        color: tv(V.text),
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        transition: 'background 0.15s ease',
      });
      if (i > 0) {
        btn.style.boxShadow = 'inset 1px 0 0 ' + tv(V.surface);
      }
      btn.appendChild(item.icon());

      const onBtnEnter = () => { btn.style.background = tv(V.border); };
      const onBtnLeave = () => { btn.style.background = 'transparent'; };
      const onBtnClick = () => {
        this.emitChange('text-align', item.value);
      };
      btn.addEventListener('mouseenter', onBtnEnter);
      btn.addEventListener('mouseleave', onBtnLeave);
      btn.addEventListener('click', onBtnClick);
      this.cleanups.push(() => {
        btn.removeEventListener('mouseenter', onBtnEnter);
        btn.removeEventListener('mouseleave', onBtnLeave);
        btn.removeEventListener('click', onBtnClick);
      });

      hGroup.appendChild(btn);
    }

    // Vertical alignment group
    const vGroup = document.createElement('div');
    Object.assign(vGroup.style, {
      flex: '1',
      display: 'flex',
      background: tv(V.surfaceHover),
      borderRadius: '8px',
      overflow: 'hidden',
      opacity: vEnabled ? '1' : '0.3',
      pointerEvents: vEnabled ? 'auto' : 'none',
    });

    const vIcons = [
      { icon: () => layoutAlignTop(24), value: 'flex-start' },
      { icon: () => layoutAlignVerticalCenter(24), value: 'center' },
      { icon: () => layoutAlignBottom(24), value: 'flex-end' },
    ];

    for (let i = 0; i < vIcons.length; i++) {
      const item = vIcons[i];
      const btn = document.createElement('button');
      Object.assign(btn.style, {
        flex: '1',
        height: '32px',
        border: 'none',
        background: 'transparent',
        color: tv(V.text),
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        transition: 'background 0.15s ease',
      });
      if (i > 0) {
        btn.style.boxShadow = 'inset 1px 0 0 ' + tv(V.surface);
      }
      btn.appendChild(item.icon());

      const onBtnEnter = () => { btn.style.background = tv(V.border); };
      const onBtnLeave = () => { btn.style.background = 'transparent'; };
      const onBtnClick = () => {
        this.emitChange('align-items', item.value);
      };
      btn.addEventListener('mouseenter', onBtnEnter);
      btn.addEventListener('mouseleave', onBtnLeave);
      btn.addEventListener('click', onBtnClick);
      this.cleanups.push(() => {
        btn.removeEventListener('mouseenter', onBtnEnter);
        btn.removeEventListener('mouseleave', onBtnLeave);
        btn.removeEventListener('click', onBtnClick);
      });

      vGroup.appendChild(btn);
    }

    alignContainer.appendChild(hGroup);
    alignContainer.appendChild(vGroup);
    alignFieldWrap.appendChild(alignContainer);
    alignField.appendChild(alignFieldWrap);
    body.appendChild(alignField);

    // Position type field (label above - Field pattern)
    const typeRow = this.makeSectionRow();
    const typeField = document.createElement('div');
    Object.assign(typeField.style, {
      display: 'flex', flexDirection: 'column', gap: '4px', flex: '1', minWidth: '0',
    });
    typeField.appendChild(this.makeFieldLabel('Type'));
    const posSelect = this.makeSelectControl(
      ['static', 'relative', 'absolute', 'fixed', 'sticky'],
      positionVal,
      (val) => this.emitChange('position', val),
    );
    typeField.appendChild(posSelect);
    typeRow.appendChild(typeField);
    body.appendChild(typeRow);

    // Constraints input for absolute/fixed positioning
    if (positionVal === 'absolute' || positionVal === 'fixed') {
      const constraintsRow = this.makeSectionRow();
      const cWrap = document.createElement('div');
      Object.assign(cWrap.style, {
        display: 'flex',
        gap: '4px',
        alignItems: 'center',
        width: '100%',
      });

      const leftSide = document.createElement('div');
      Object.assign(leftSide.style, { flex: '1', minWidth: '0' });
      leftSide.appendChild(this.makePropInput('left', null, cs, 1, false, 'L'));
      cWrap.appendChild(leftSide);

      const centerCol = document.createElement('div');
      Object.assign(centerCol.style, {
        flex: '1', minWidth: '0', display: 'flex',
        flexDirection: 'column', gap: '4px', alignItems: 'stretch',
      });

      centerCol.appendChild(this.makePropInput('top', null, cs, 1, false, 'T'));

      const pinBox = document.createElement('div');
      Object.assign(pinBox.style, {
        position: 'relative',
        background: tv(V.surfaceHover),
        borderRadius: '8px',
        width: '100%',
        height: '64px',
      });
      const pinCenter = document.createElement('div');
      Object.assign(pinCenter.style, {
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '24px', height: '24px',
        background: tv(V.surface),
        border: '1px solid ' + tv(V.border),
        borderRadius: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0',
      });
      const pinDot = document.createElement('div');
      Object.assign(pinDot.style, {
        width: '4px', height: '4px', borderRadius: '50%', background: '#3b82f6',
      });
      pinCenter.appendChild(pinDot);
      pinBox.appendChild(pinCenter);
      centerCol.appendChild(pinBox);

      centerCol.appendChild(this.makePropInput('bottom', null, cs, 1, false, 'B'));
      cWrap.appendChild(centerCol);

      const rightSide = document.createElement('div');
      Object.assign(rightSide.style, { flex: '1', minWidth: '0' });
      rightSide.appendChild(this.makePropInput('right', null, cs, 1, false, 'R'));
      cWrap.appendChild(rightSide);

      constraintsRow.appendChild(cWrap);
      body.appendChild(constraintsRow);
    }

    // Offsets for relative positioning
    if (positionVal === 'relative') {
      const offsetLabel = this.makeSectionRow();
      offsetLabel.appendChild(this.makeGroupLabelInline('Offsets'));
      body.appendChild(offsetLabel);

      const offsetRow1 = this.makeSectionRow();
      Object.assign(offsetRow1.style, { display: 'flex', gap: '8px' });
      offsetRow1.appendChild(this.makePropInput('top', null, cs, 1, false, 'T'));
      offsetRow1.appendChild(this.makePropInput('right', null, cs, 1, false, 'R'));
      body.appendChild(offsetRow1);

      const offsetRow2 = this.makeSectionRow();
      Object.assign(offsetRow2.style, { display: 'flex', gap: '8px' });
      offsetRow2.appendChild(this.makePropInput('bottom', null, cs, 1, false, 'B'));
      offsetRow2.appendChild(this.makePropInput('left', null, cs, 1, false, 'L'));
      body.appendChild(offsetRow2);
    }

    // Sticky offset
    if (positionVal === 'sticky') {
      const stickyLabel = this.makeSectionRow();
      stickyLabel.appendChild(this.makeGroupLabelInline('Sticky offset'));
      body.appendChild(stickyLabel);

      const stickyRow = this.makeSectionRow();
      Object.assign(stickyRow.style, { display: 'flex', gap: '8px' });
      stickyRow.appendChild(this.makePropInput('top', null, cs, 1, false, 'T'));
      stickyRow.appendChild(this.makePropInput('bottom', null, cs, 1, false, 'B'));
      body.appendChild(stickyRow);
    }

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
    _hasGrid: boolean,
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

    // Display field (label above - Field pattern)
    const displayRow = this.makeSectionRow();
    const displayField = document.createElement('div');
    Object.assign(displayField.style, {
      display: 'flex', flexDirection: 'column', gap: '4px', flex: '1', minWidth: '0',
    });
    displayField.appendChild(this.makeFieldLabel('Display'));
    const segmented = this.makeSegmentedControlWithIcons(
      [
        { iconFn: () => rectangleSmall(24), value: 'block', label: 'Block' },
        { iconFn: () => autolayoutAddHorizontal(24), value: 'flex-row', label: 'Flex Row' },
        { iconFn: () => autolayoutAddVertical(24), value: 'flex-col', label: 'Flex Column' },
        { iconFn: () => gridView(24), value: 'grid', label: 'Grid' },
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
    displayField.appendChild(segmented);
    displayRow.appendChild(displayField);
    body.appendChild(displayRow);

    // Flex-specific controls (reference layout: Alignment+Gap side by side, then Reverse+Wrap)
    if (hasFlex) {
      // Alignment + Gap on same row (reference layout)
      const alignGapRow = this.makeSectionRow();
      Object.assign(alignGapRow.style, {
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-start',
      });

      // Left: Alignment field with 3x3 grid
      const alignField = document.createElement('div');
      Object.assign(alignField.style, {
        display: 'flex', flexDirection: 'column', gap: '4px',
        flex: '1', minWidth: '0',
      });
      alignField.appendChild(this.makeFieldLabel('Alignment'));
      alignField.appendChild(this.makeAlignmentGrid(cs));
      alignGapRow.appendChild(alignField);

      // Right: Gap field
      const gapField = document.createElement('div');
      Object.assign(gapField.style, {
        display: 'flex', flexDirection: 'column', gap: '4px',
        flex: '1', minWidth: '0',
      });
      gapField.appendChild(this.makeFieldLabel('Gap'));
      gapField.appendChild(this.makePropInputWithIcon('gap', () => alSpacingHorizontal(24), cs));
      alignGapRow.appendChild(gapField);

      body.appendChild(alignGapRow);

      // Reverse + Wrap (Field pattern: labels above selects, side by side)
      const revWrapRow = this.makeSectionRow();
      Object.assign(revWrapRow.style, {
        display: 'flex',
        gap: '8px',
      });

      const revField = document.createElement('div');
      Object.assign(revField.style, {
        display: 'flex', flexDirection: 'column', gap: '4px',
        flex: '1', minWidth: '0',
      });
      revField.appendChild(this.makeFieldLabel('Reverse'));
      revField.appendChild(this.makeSelectControl(
        ['No', 'Yes'],
        flexDir.includes('reverse') ? 'Yes' : 'No',
        (val) => {
          const baseDir = activeDisplay === 'flex-col' ? 'column' : 'row';
          this.emitChange('flex-direction', val === 'Yes' ? baseDir + '-reverse' : baseDir);
        },
      ));
      revWrapRow.appendChild(revField);

      const wrapField = document.createElement('div');
      Object.assign(wrapField.style, {
        display: 'flex', flexDirection: 'column', gap: '4px',
        flex: '1', minWidth: '0',
      });
      wrapField.appendChild(this.makeFieldLabel('Wrap'));
      wrapField.appendChild(this.makeSelectControl(
        ['Nowrap', 'Wrap', 'Wrap-reverse'],
        (() => {
          const w = getVal(cs, 'flex-wrap') || 'nowrap';
          return w === 'nowrap' ? 'Nowrap' : w === 'wrap' ? 'Wrap' : 'Wrap-reverse';
        })(),
        (val) => this.emitChange('flex-wrap', val.toLowerCase()),
      ));
      revWrapRow.appendChild(wrapField);

      body.appendChild(revWrapRow);
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

    // Padding group
    const padRow = this.makeSectionRowWithSplit();
    Object.assign(padRow.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    });

    const padLabel = this.makeGroupLabelInline('Padding');
    padRow.appendChild(padLabel);

    // Horizontal padding input with reference icon
    padRow.appendChild(
      this.makePropInputWithIcon('padding-left', () => alPaddingHorizontal(24), cs),
    );

    // Vertical padding input with reference icon
    padRow.appendChild(
      this.makePropInputWithIcon('padding-top', () => alPaddingVertical(24), cs),
    );

    // Split button
    padRow.appendChild(this.makeSplitButton());

    body.appendChild(padRow);

    // Margin group
    const marRow = this.makeSectionRowWithSplit();
    Object.assign(marRow.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    });

    const marLabel = this.makeGroupLabelInline('Margin');
    marRow.appendChild(marLabel);

    marRow.appendChild(
      this.makePropInputWithIcon('margin-left', () => alPaddingHorizontal(24), cs),
    );
    marRow.appendChild(
      this.makePropInputWithIcon('margin-top', () => alPaddingVertical(24), cs),
    );
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

    // Width + Height row with labels above
    const labelsRow = this.makeSectionRow();
    Object.assign(labelsRow.style, {
      display: 'flex',
      gap: '8px',
    });
    const wLabelSpan = this.makeGroupLabelInline('Width');
    wLabelSpan.style.flex = '1';
    const hLabelSpan = this.makeGroupLabelInline('Height');
    hLabelSpan.style.flex = '1';
    labelsRow.appendChild(wLabelSpan);
    labelsRow.appendChild(hLabelSpan);
    // Spacer for lock button
    const lockSpacer = document.createElement('div');
    lockSpacer.style.width = '32px';
    lockSpacer.style.flexShrink = '0';
    labelsRow.appendChild(lockSpacer);
    body.appendChild(labelsRow);

    // Combo inputs row
    const whRow = this.makeSectionRow();
    Object.assign(whRow.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    });

    whRow.appendChild(this.makeComboInput('width', cs));
    whRow.appendChild(this.makeComboInput('height', cs));

    // Lock aspect ratio button (reference lock icon)
    const lockBtn = document.createElement('button');
    let locked = false;
    Object.assign(lockBtn.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      border: 'none',
      background: 'transparent',
      color: tv(V.textTertiary),
      cursor: 'pointer',
      padding: '0',
      flexShrink: '0',
    });
    lockBtn.appendChild(lockOpen(24));
    const onLockEnter = () => {
      lockBtn.style.background = tv(V.surfaceHover);
    };
    const onLockLeave = () => {
      lockBtn.style.background = 'transparent';
    };
    const onLockClick = () => {
      locked = !locked;
      while (lockBtn.firstChild) lockBtn.removeChild(lockBtn.firstChild);
      lockBtn.appendChild(locked ? lockClosed(24) : lockOpen(24));
      lockBtn.style.color = locked ? tv(V.text) : tv(V.textTertiary);
    };
    lockBtn.addEventListener('mouseenter', onLockEnter);
    lockBtn.addEventListener('mouseleave', onLockLeave);
    lockBtn.addEventListener('click', onLockClick);
    this.cleanups.push(() => {
      lockBtn.removeEventListener('mouseenter', onLockEnter);
      lockBtn.removeEventListener('mouseleave', onLockLeave);
      lockBtn.removeEventListener('click', onLockClick);
    });
    whRow.appendChild(lockBtn);

    body.appendChild(whRow);

    // Max W + Max H labels
    const maxLabelsRow = this.makeSectionRow();
    Object.assign(maxLabelsRow.style, {
      display: 'flex',
      gap: '8px',
      marginTop: '4px',
    });
    const mwLabelSpan = this.makeGroupLabelInline('Max W');
    mwLabelSpan.style.flex = '1';
    const mhLabelSpan = this.makeGroupLabelInline('Max H');
    mhLabelSpan.style.flex = '1';
    maxLabelsRow.appendChild(mwLabelSpan);
    maxLabelsRow.appendChild(mhLabelSpan);
    body.appendChild(maxLabelsRow);

    // Max W + Max H inputs
    const maxRow = this.makeSectionRow();
    Object.assign(maxRow.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    });

    maxRow.appendChild(
      this.makePropInput('max-width', null, cs, 1, true),
    );
    maxRow.appendChild(
      this.makePropInput('max-height', null, cs, 1, true),
    );

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
      background: tv(V.surfaceHover),
      border: 'none',
      color: tv(V.text),
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
    fontBtn.appendChild(chevronDown(24));

    const onFontEnter = () => {
      fontBtn.style.background = tv(V.border);
    };
    const onFontLeave = () => {
      fontBtn.style.background = tv(V.surfaceHover);
    };
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

    const sizeLabel = this.makeGroupLabelInline('Size');
    sizeWeightRow.appendChild(sizeLabel);
    sizeWeightRow.appendChild(this.makePropInput('font-size', null, cs));

    const weightLabel = this.makeGroupLabelInline('Weight');
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
    const lhLabel = this.makeGroupLabelInline('Line height');
    lineLetterRow.appendChild(lhLabel);
    lineLetterRow.appendChild(
      this.makeComboInput('line-height', cs, 0.1),
    );

    const lsLabel = this.makeGroupLabelInline('Letter spacing');
    lineLetterRow.appendChild(lsLabel);
    lineLetterRow.appendChild(
      this.makeComboInput('letter-spacing', cs, 0.1),
    );
    body.appendChild(lineLetterRow);

    // Color row (swatch + hex input + opacity)
    const colorRow = this.makeSectionRow();
    const colorControl = this.makeColorInput('color', cs);
    colorRow.appendChild(colorControl);
    body.appendChild(colorRow);

    // Text align segmented - 3-option with reference icons
    const alignRow = this.makeSectionRow();
    Object.assign(alignRow.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    });

    const alignLabel = this.makeGroupLabelInline('Align');
    alignRow.appendChild(alignLabel);

    const currentAlign = getVal(cs, 'text-align') || 'left';
    const alignSeg = this.makeSegmentedControlWithIcons(
      [
        { iconFn: () => textAlignLeft(24), value: 'left', label: 'Left' },
        { iconFn: () => textAlignCenter(24), value: 'center', label: 'Center' },
        { iconFn: () => textAlignRight(24), value: 'right', label: 'Right' },
      ],
      currentAlign,
      (val) => this.emitChange('text-align', val),
    );
    alignRow.appendChild(alignSeg);
    body.appendChild(alignRow);

    // Vertical align segmented - 3-option with reference icons
    const vAlignRow = this.makeSectionRow();
    Object.assign(vAlignRow.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    });

    const vAlignLabel = this.makeGroupLabelInline('Vertical');
    vAlignRow.appendChild(vAlignLabel);

    const currentVAlign = getVal(cs, 'vertical-align') || 'top';
    let vAlignVal = 'top';
    if (currentVAlign === 'middle') vAlignVal = 'middle';
    else if (currentVAlign === 'bottom') vAlignVal = 'bottom';

    const vAlignSeg = this.makeSegmentedControlWithIcons(
      [
        { iconFn: () => textAlignTop(24), value: 'top', label: 'Top' },
        { iconFn: () => textAlignMiddle(24), value: 'middle', label: 'Middle' },
        { iconFn: () => textAlignBottom(24), value: 'bottom', label: 'Bottom' },
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

    const opLabel = this.makeGroupLabelInline('Opacity');
    opZRow.appendChild(opLabel);
    opZRow.appendChild(this.makePropInput('opacity', null, cs, 0.05));

    const zLabel = this.makeGroupLabelInline('Z index');
    opZRow.appendChild(zLabel);
    opZRow.appendChild(this.makePropInput('z-index', null, cs, 1));
    body.appendChild(opZRow);

    // Corner radius group with split button and reference icon
    const radiusRow = this.makeSectionRowWithSplit();
    Object.assign(radiusRow.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    });

    const radiusLabel = this.makeGroupLabelInline('Corner radius');
    radiusRow.appendChild(radiusLabel);
    radiusRow.appendChild(
      this.makePropInputWithIcon('border-radius', () => radiusTopLeft(24), cs),
    );
    radiusRow.appendChild(this.makeSplitButton());

    body.appendChild(radiusRow);

    // Overflow row
    const overflowRow = this.makeSectionRow();
    Object.assign(overflowRow.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    });
    const overflowLabel = this.makeGroupLabelInline('Overflow');
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
  // 8. Fill Section
  // -----------------------------------------------------------------------

  private buildFillSection(
    parent: HTMLDivElement,
    cs: Record<string, string>,
  ): void {
    const section = this.createSection();
    const bgColor = getVal(cs, 'background-color');
    const hasBg = bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)';

    const header = this.makeSectionHeader('Fill', () => {
      // Add fill - set a default background color
      this.emitChange('background-color', '#ffffff');
    });
    section.appendChild(header);

    if (hasBg) {
      const body = this.makeSectionBody();
      const colorRow = this.makeSectionRow();
      colorRow.appendChild(this.makeColorInput('background-color', cs));
      body.appendChild(colorRow);
      section.appendChild(body);
    }

    parent.appendChild(section);
  }

  // -----------------------------------------------------------------------
  // 9. Border Section
  // -----------------------------------------------------------------------

  private buildBorderSection(
    parent: HTMLDivElement,
    cs: Record<string, string>,
  ): void {
    const section = this.createSection();
    const borderStyle = getVal(cs, 'border-style') || getVal(cs, 'border-top-style') || 'none';
    const borderWidth = parsePx(getVal(cs, 'border-width') || getVal(cs, 'border-top-width') || '0');
    const hasBorder = borderStyle !== 'none' && borderWidth > 0;

    const header = this.makeSectionHeader('Border', () => {
      this.emitChange('border-style', 'solid');
      this.emitChange('border-width', '1px');
      this.emitChange('border-color', '#333333');
    });
    section.appendChild(header);

    if (hasBorder) {
      const body = this.makeSectionBody();

      // Color row
      const colorRow = this.makeSectionRow();
      colorRow.appendChild(this.makeColorInput('border-color', cs));
      body.appendChild(colorRow);

      // Width row
      const widthRow = this.makeSectionRowWithSplit();
      Object.assign(widthRow.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      });
      const widthLabel = this.makeGroupLabelInline('Width');
      widthRow.appendChild(widthLabel);
      widthRow.appendChild(this.makePropInput('border-width', null, cs));
      widthRow.appendChild(this.makeSplitButton());
      body.appendChild(widthRow);

      // Style row
      const styleRow = this.makeSectionRow();
      Object.assign(styleRow.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      });
      const styleLabel = this.makeGroupLabelInline('Style');
      styleRow.appendChild(styleLabel);
      const styleSelect = this.makeSelectControl(
        ['solid', 'dashed', 'dotted', 'double'],
        borderStyle,
        (val) => this.emitChange('border-style', val),
      );
      styleRow.appendChild(styleSelect);
      body.appendChild(styleRow);

      section.appendChild(body);
    }

    parent.appendChild(section);
  }

  // -----------------------------------------------------------------------
  // 10. Shadow Section
  // -----------------------------------------------------------------------

  private buildShadowSection(
    parent: HTMLDivElement,
    cs: Record<string, string>,
  ): void {
    const section = this.createSection();
    const shadowVal = getVal(cs, 'box-shadow');
    const shadow = parseBoxShadow(shadowVal);

    const header = this.makeSectionHeader('Shadow', () => {
      this.emitChange('box-shadow', '0px 2px 8px 0px rgba(0,0,0,0.15)');
    });
    section.appendChild(header);

    if (shadow) {
      const body = this.makeSectionBody();

      // Color row
      const colorRow = this.makeSectionRow();
      const shadowColorHex = parseColor(shadow.color);
      const shadowColorContainer = document.createElement('div');
      Object.assign(shadowColorContainer.style, {
        display: 'flex',
        alignItems: 'center',
        height: '32px',
        gap: '1px',
      });

      // Hex section
      const hexSection = document.createElement('div');
      Object.assign(hexSection.style, {
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        minWidth: '0',
        height: '32px',
        background: tv(V.surfaceHover),
        borderRadius: '8px 0 0 8px',
      });

      const swatchContainer = document.createElement('div');
      Object.assign(swatchContainer.style, {
        width: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: '0',
        position: 'relative',
      });
      const swatchInner = document.createElement('div');
      Object.assign(swatchInner.style, {
        width: '20px',
        height: '20px',
        borderRadius: '2px',
        background: shadowColorHex,
        position: 'relative',
        overflow: 'hidden',
      });
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = shadowColorHex;
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
      const onShadowColorInput = () => {
        swatchInner.style.background = colorInput.value;
        shadow.color = colorInput.value;
        this.emitChange('box-shadow', buildBoxShadow(shadow));
      };
      colorInput.addEventListener('input', onShadowColorInput);
      this.cleanups.push(() => colorInput.removeEventListener('input', onShadowColorInput));
      swatchContainer.appendChild(swatchInner);
      swatchContainer.appendChild(colorInput);
      hexSection.appendChild(swatchContainer);

      const hexInput = document.createElement('input');
      hexInput.type = 'text';
      hexInput.value = shadowColorHex;
      Object.assign(hexInput.style, {
        flex: '1',
        height: '100%',
        border: 'none',
        outline: 'none',
        background: 'transparent',
        color: tv(V.text),
        fontSize: '11px',
        fontWeight: '450',
        fontFamily: FONT,
        padding: '0',
        letterSpacing: '-0.005em',
      });
      hexSection.appendChild(hexInput);
      shadowColorContainer.appendChild(hexSection);

      // Opacity section
      const opSection = document.createElement('div');
      Object.assign(opSection.style, {
        display: 'flex',
        alignItems: 'center',
        height: '32px',
        background: tv(V.surfaceHover),
        borderRadius: '0 8px 8px 0',
        padding: '0 8px 0 4px',
      });
      const opInput = document.createElement('input');
      opInput.type = 'text';
      opInput.value = String(parseOpacity(shadow.color));
      Object.assign(opInput.style, {
        width: '28px',
        height: '100%',
        border: 'none',
        outline: 'none',
        background: 'transparent',
        color: tv(V.text),
        fontSize: '11px',
        fontWeight: '450',
        fontFamily: FONT,
        textAlign: 'right',
        letterSpacing: '-0.005em',
        fontVariantNumeric: 'tabular-nums',
      });
      const pctLabel = document.createElement('span');
      pctLabel.textContent = '%';
      Object.assign(pctLabel.style, {
        fontSize: '11px',
        color: tv(V.textTertiary),
      });
      opSection.appendChild(opInput);
      opSection.appendChild(pctLabel);
      shadowColorContainer.appendChild(opSection);

      colorRow.appendChild(shadowColorContainer);
      body.appendChild(colorRow);

      // X/Y row
      const xyRow = this.makeSectionRow();
      Object.assign(xyRow.style, { display: 'flex', gap: '8px' });
      const xLabel = this.makeGroupLabelInline('X');
      xyRow.appendChild(xLabel);
      xyRow.appendChild(this.makeShadowPropInput(shadow, 'x'));
      const yLabel = this.makeGroupLabelInline('Y');
      xyRow.appendChild(yLabel);
      xyRow.appendChild(this.makeShadowPropInput(shadow, 'y'));
      body.appendChild(xyRow);

      // Blur/Spread row
      const bsRow = this.makeSectionRow();
      Object.assign(bsRow.style, { display: 'flex', gap: '8px' });
      const blurLabel = this.makeGroupLabelInline('Blur');
      bsRow.appendChild(blurLabel);
      bsRow.appendChild(this.makeShadowPropInput(shadow, 'blur'));
      const spreadLabel = this.makeGroupLabelInline('Spread');
      bsRow.appendChild(spreadLabel);
      bsRow.appendChild(this.makeShadowPropInput(shadow, 'spread'));
      body.appendChild(bsRow);

      // Type row (inset toggle)
      const typeRow = this.makeSectionRow();
      Object.assign(typeRow.style, { display: 'flex', alignItems: 'center', gap: '8px' });
      const typeLabel = this.makeGroupLabelInline('Type');
      typeRow.appendChild(typeLabel);
      const typeSelect = this.makeSelectControl(
        ['Outside', 'Inside'],
        shadow.inset ? 'Inside' : 'Outside',
        (val) => {
          shadow.inset = val === 'Inside';
          this.emitChange('box-shadow', buildBoxShadow(shadow));
        },
      );
      typeRow.appendChild(typeSelect);
      body.appendChild(typeRow);

      section.appendChild(body);
    }

    parent.appendChild(section);
  }

  // -----------------------------------------------------------------------
  // 11. Filters Section
  // -----------------------------------------------------------------------

  private buildFiltersSection(
    parent: HTMLDivElement,
    cs: Record<string, string>,
  ): void {
    const section = this.createSection();
    const filterVal = getVal(cs, 'filter');
    const filters = parseFilterString(filterVal);

    const header = this.makeSectionHeader('Filters', () => {
      this.emitChange('filter', 'blur(0px)');
    });
    section.appendChild(header);

    if (filters.length > 0) {
      const body = this.makeSectionBody();

      for (let fi = 0; fi < filters.length; fi++) {
        const filter = filters[fi];
        const filterRow = this.makeSectionRow();
        Object.assign(filterRow.style, {
          display: 'flex',
          alignItems: 'center',
          height: '32px',
          background: tv(V.surfaceHover),
          borderRadius: '8px',
          padding: '0 8px',
          gap: '8px',
        });

        // Filter label
        const fLabel = document.createElement('span');
        fLabel.textContent = filter.type;
        Object.assign(fLabel.style, {
          fontSize: '11px',
          fontWeight: '400',
          color: tv(V.textTertiary),
          flexShrink: '0',
          minWidth: '50px',
        });
        filterRow.appendChild(fLabel);

        // Slider track
        const trackWrap = document.createElement('div');
        Object.assign(trackWrap.style, {
          flex: '1',
          height: '4px',
          borderRadius: '2px',
          background: tv(V.border),
          position: 'relative',
          cursor: 'pointer',
        });

        // Determine percentage for common filter types
        let maxVal = 100;
        if (filter.unit === 'px') maxVal = 50;
        else if (filter.unit === 'deg') maxVal = 360;
        else if (filter.type === 'saturate' || filter.type === 'contrast' || filter.type === 'brightness') maxVal = 200;
        const pct = Math.min(100, (filter.value / maxVal) * 100);

        const fillBar = document.createElement('div');
        Object.assign(fillBar.style, {
          position: 'absolute',
          left: '0',
          top: '0',
          height: '100%',
          width: pct + '%',
          borderRadius: '2px',
          background: tv(V.blue500),
        });
        trackWrap.appendChild(fillBar);

        // Click/drag on track to change value
        const onTrackClick = (e: MouseEvent) => {
          const rect = trackWrap.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          filter.value = Math.round(ratio * maxVal * 10) / 10;
          fillBar.style.width = (ratio * 100) + '%';
          valSpan.textContent = filter.value + filter.unit;
          this.emitChange('filter', buildFilterString(filters));
        };
        trackWrap.addEventListener('click', onTrackClick);
        this.cleanups.push(() => trackWrap.removeEventListener('click', onTrackClick));

        filterRow.appendChild(trackWrap);

        // Value display
        const valSpan = document.createElement('span');
        valSpan.textContent = filter.value + filter.unit;
        Object.assign(valSpan.style, {
          fontSize: '11px',
          fontWeight: '450',
          color: tv(V.text),
          fontVariantNumeric: 'tabular-nums',
          minWidth: '36px',
          textAlign: 'right',
          flexShrink: '0',
        });
        filterRow.appendChild(valSpan);

        body.appendChild(filterRow);
      }

      section.appendChild(body);
    }

    parent.appendChild(section);
  }

  // -----------------------------------------------------------------------
  // Section structure helpers (exact dimensions)
  // -----------------------------------------------------------------------

  private createSection(): HTMLDivElement {
    const section = document.createElement('div');
    Object.assign(section.style, {
      borderBottom: '1px solid ' + tv(V.border),
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
      color: tv(V.text),
      lineHeight: '20px',
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
        color: tv(V.textTertiary),
        cursor: 'pointer',
        padding: '0',
        opacity: '0',
        transition: 'opacity 120ms, background 120ms',
      });
      addBtn.appendChild(plus(24));

      // Show add button on section hover
      const onHeaderEnter = () => {
        addBtn.style.opacity = '1';
      };
      const onHeaderLeave = () => {
        addBtn.style.opacity = '0';
      };
      const onBtnEnter = () => {
        addBtn.style.background = tv(V.surfaceHover);
      };
      const onBtnLeave = () => {
        addBtn.style.background = 'transparent';
      };
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

  // Row with standard padding: 0 48px 0 16px
  private makeSectionRow(): HTMLDivElement {
    const row = document.createElement('div');
    Object.assign(row.style, {
      padding: '0 48px 0 16px',
    });
    return row;
  }

  // Row with split button padding: 0 8px 0 16px
  private makeSectionRowWithSplit(): HTMLDivElement {
    const row = document.createElement('div');
    Object.assign(row.style, {
      padding: '0 8px 0 16px',
    });
    return row;
  }

  // Group label inline: 11px, weight 400, color textTertiary
  private makeGroupLabelInline(text: string): HTMLSpanElement {
    const label = document.createElement('span');
    label.textContent = text;
    Object.assign(label.style, {
      fontSize: '11px',
      fontWeight: '400',
      letterSpacing: '-0.005em',
      color: tv(V.textTertiary),
      lineHeight: '16px',
      flexShrink: '0',
    });
    return label;
  }

  private makeFieldLabel(text: string): HTMLSpanElement {
    const label = document.createElement('span');
    label.textContent = text;
    Object.assign(label.style, {
      fontSize: '11px',
      fontWeight: '400',
      letterSpacing: '-0.005em',
      color: tv(V.textTertiary),
      lineHeight: '16px',
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
      background: active ? tv(V.blueBg) : tv(V.surfaceHover),
      color: active ? tv(V.blueText) : tv(V.textSecondary),
      transition: 'background 120ms, color 120ms',
    });
    return btn;
  }

  // -----------------------------------------------------------------------
  // Split button (32x32) with minus icon
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
      color: tv(V.textTertiary),
      cursor: 'pointer',
      padding: '0',
      flexShrink: '0',
    });
    btn.appendChild(alPaddingSides(24));

    const onEnter = () => {
      btn.style.background = tv(V.surfaceHover);
    };
    const onLeave = () => {
      btn.style.background = 'transparent';
    };
    btn.addEventListener('mouseenter', onEnter);
    btn.addEventListener('mouseleave', onLeave);
    this.cleanups.push(() => {
      btn.removeEventListener('mouseenter', onEnter);
      btn.removeEventListener('mouseleave', onLeave);
    });

    return btn;
  }

  // -----------------------------------------------------------------------
  // Per-field reset dot (4px, #0D99FF)
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
      background: tv(V.blue500),
      cursor: 'pointer',
      flexShrink: '0',
      display: 'none',
      position: 'absolute',
      left: '4px',
      top: '50%',
      transform: 'translateY(-50%)',
    });

    // Check if value differs from original
    const origKey = cssPropToCamel(property);
    const origVal =
      this.originalValues[origKey] ?? this.originalValues[property] ?? '';
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

  // -----------------------------------------------------------------------
  // PropInput control (exact: h32, r8, bg inputBg)
  // -----------------------------------------------------------------------

  private makePropInput(
    property: string,
    _iconPath: string | null,
    computedStyles: Record<string, string>,
    step: number = 1,
    showDash: boolean = false,
    textLabel: string | null = null,
  ): HTMLDivElement {
    const rawValue = getVal(computedStyles, property);
    const parsed = parseNumericValue(rawValue);

    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      position: 'relative',
      height: '32px',
      borderRadius: '8px',
      background: tv(V.surfaceHover),
      display: 'flex',
      alignItems: 'center',
      overflow: 'visible',
      flex: '1',
      minWidth: '0',
      transition: 'background-color 0.15s',
    });

    const onEnter = () => {
      wrapper.style.background = tv(V.border);
    };
    const onLeave = () => {
      if (wrapper.querySelector('input:focus')) return;
      wrapper.style.background = tv(V.surfaceHover);
    };
    wrapper.addEventListener('mouseenter', onEnter);
    wrapper.addEventListener('mouseleave', onLeave);
    this.cleanups.push(() => {
      wrapper.removeEventListener('mouseenter', onEnter);
      wrapper.removeEventListener('mouseleave', onLeave);
    });

    // Text label area (e.g. "T", "R", "B", "L" for offsets)
    if (textLabel) {
      const labelEl = document.createElement('div');
      Object.assign(labelEl.style, {
        position: 'absolute',
        left: '0',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        fontWeight: '450',
        letterSpacing: '-0.005em',
        color: tv(V.text),
        flexShrink: '0',
        userSelect: 'none',
        cursor: 'ew-resize',
        zIndex: '1',
      });
      labelEl.textContent = textLabel;
      wrapper.appendChild(labelEl);

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

    // Reset dot
    const resetDot = this.makeResetDot(property, rawValue, () => {
      const origKey = cssPropToCamel(property);
      const origVal =
        this.originalValues[origKey] ??
        this.originalValues[property] ??
        '';
      input.value = origVal;
      this.emitChange(property, origVal);
    });
    wrapper.appendChild(resetDot);

    // Input field
    const input = document.createElement('input');
    input.type = 'text';
    const displayVal = parsed
      ? String(Math.round(parsed.number * 1000) / 1000)
      : rawValue || '';
    input.value = displayVal;
    if (showDash && !displayVal) {
      input.placeholder = '-';
    }
    Object.assign(input.style, {
      flex: '1',
      height: '100%',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      color: tv(V.text),
      fontSize: '11px',
      fontWeight: '450',
      fontFamily: FONT,
      padding: textLabel ? '0 8px 0 32px' : '0 8px',
      boxSizing: 'border-box',
      letterSpacing: '-0.005em',
      fontVariantNumeric: 'tabular-nums',
    });

    const onFocus = () => {
      wrapper.style.outline = '1px solid ' + tv(V.border);
      wrapper.style.background = tv(V.border);
    };
    const onBlur = () => {
      wrapper.style.outline = 'none';
      wrapper.style.background = tv(V.surfaceHover);
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
  // PropInput with reference SVG icon (icon factory function, not path string)
  // -----------------------------------------------------------------------

  private makePropInputWithIcon(
    property: string,
    iconFn: () => SVGSVGElement,
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
      background: tv(V.surfaceHover),
      display: 'flex',
      alignItems: 'center',
      overflow: 'visible',
      flex: '1',
      minWidth: '0',
      transition: 'background-color 0.15s',
    });

    const onEnter = () => {
      wrapper.style.background = tv(V.border);
    };
    const onLeave = () => {
      if (wrapper.querySelector('input:focus')) return;
      wrapper.style.background = tv(V.surfaceHover);
    };
    wrapper.addEventListener('mouseenter', onEnter);
    wrapper.addEventListener('mouseleave', onLeave);
    this.cleanups.push(() => {
      wrapper.removeEventListener('mouseenter', onEnter);
      wrapper.removeEventListener('mouseleave', onLeave);
    });

    // Icon label area (32px wide, ew-resize cursor)
    const labelEl = document.createElement('div');
    Object.assign(labelEl.style, {
      width: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'ew-resize',
      userSelect: 'none',
      flexShrink: '0',
      color: tv(V.textTertiary),
      position: 'relative',
    });

    labelEl.appendChild(iconFn());

    // Reset dot inside label area
    const resetDot = this.makeResetDot(property, rawValue, () => {
      const origKey = cssPropToCamel(property);
      const origVal =
        this.originalValues[origKey] ??
        this.originalValues[property] ??
        '';
      input.value = origVal;
      this.emitChange(property, origVal);
    });
    labelEl.appendChild(resetDot);

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

    // Input field
    const input = document.createElement('input');
    input.type = 'text';
    const displayVal = parsed
      ? String(Math.round(parsed.number * 1000) / 1000)
      : rawValue || '';
    input.value = displayVal;
    Object.assign(input.style, {
      flex: '1',
      height: '100%',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      color: tv(V.text),
      fontSize: '11px',
      fontWeight: '450',
      fontFamily: FONT,
      padding: '0 8px',
      boxSizing: 'border-box',
      letterSpacing: '-0.005em',
      fontVariantNumeric: 'tabular-nums',
    });

    const onFocus = () => {
      wrapper.style.outline = '1px solid ' + tv(V.border);
      wrapper.style.background = tv(V.border);
    };
    const onBlur = () => {
      wrapper.style.outline = 'none';
      wrapper.style.background = tv(V.surfaceHover);
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
  // Shadow prop input (modifies shadow object and emits box-shadow)
  // -----------------------------------------------------------------------

  private makeShadowPropInput(
    shadow: ParsedShadow,
    key: 'x' | 'y' | 'blur' | 'spread',
  ): HTMLDivElement {
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      position: 'relative',
      height: '32px',
      borderRadius: '8px',
      background: tv(V.surfaceHover),
      display: 'flex',
      alignItems: 'center',
      overflow: 'visible',
      flex: '1',
      minWidth: '0',
      transition: 'background-color 0.15s',
    });

    const onEnter = () => { wrapper.style.background = tv(V.border); };
    const onLeave = () => {
      if (wrapper.querySelector('input:focus')) return;
      wrapper.style.background = tv(V.surfaceHover);
    };
    wrapper.addEventListener('mouseenter', onEnter);
    wrapper.addEventListener('mouseleave', onLeave);
    this.cleanups.push(() => {
      wrapper.removeEventListener('mouseenter', onEnter);
      wrapper.removeEventListener('mouseleave', onLeave);
    });

    const input = document.createElement('input');
    input.type = 'text';
    input.value = String(shadow[key]);
    Object.assign(input.style, {
      flex: '1',
      height: '100%',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      color: tv(V.text),
      fontSize: '11px',
      fontWeight: '450',
      fontFamily: FONT,
      padding: '0 8px',
      boxSizing: 'border-box',
      letterSpacing: '-0.005em',
      fontVariantNumeric: 'tabular-nums',
    });

    const onFocus = () => {
      wrapper.style.outline = '1px solid ' + tv(V.border);
      wrapper.style.background = tv(V.border);
    };
    const onBlur = () => {
      wrapper.style.outline = 'none';
      wrapper.style.background = tv(V.surfaceHover);
    };
    input.addEventListener('focus', onFocus);
    input.addEventListener('blur', onBlur);
    this.cleanups.push(() => {
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('blur', onBlur);
    });

    const onCommit = () => {
      const num = parseFloat(input.value.trim());
      if (!isNaN(num)) {
        shadow[key] = num;
        this.emitChange('box-shadow', buildBoxShadow(shadow));
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { onCommit(); input.blur(); }
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
  // ComboInput (split structure: input + chevron trigger with 1px gap)
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
      display: 'flex',
      alignItems: 'center',
      flex: '1',
      minWidth: '0',
      gap: '1px',
    });

    // Left: input area
    const inputArea = document.createElement('div');
    Object.assign(inputArea.style, {
      flex: '1',
      height: '32px',
      borderRadius: '8px 0 0 8px',
      background: tv(V.surfaceHover),
      display: 'flex',
      alignItems: 'center',
      paddingLeft: '8px',
      minWidth: '0',
      transition: 'background 0.15s',
    });

    const onInputAreaEnter = () => { inputArea.style.background = tv(V.border); };
    const onInputAreaLeave = () => {
      if (inputArea.querySelector('input:focus')) return;
      inputArea.style.background = tv(V.surfaceHover);
    };
    inputArea.addEventListener('mouseenter', onInputAreaEnter);
    inputArea.addEventListener('mouseleave', onInputAreaLeave);
    this.cleanups.push(() => {
      inputArea.removeEventListener('mouseenter', onInputAreaEnter);
      inputArea.removeEventListener('mouseleave', onInputAreaLeave);
    });

    const input = document.createElement('input');
    input.type = 'text';
    let displayVal = '';
    if (
      property === 'width' &&
      (rawValue === 'auto' || !rawValue)
    ) {
      displayVal = 'Fill';
    } else if (parsed) {
      displayVal = String(Math.round(parsed.number * 1000) / 1000);
    } else {
      displayVal = rawValue || '';
    }
    input.value = displayVal;
    Object.assign(input.style, {
      flex: '1',
      height: '100%',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      color: tv(V.text),
      fontSize: '11px',
      fontWeight: '450',
      fontFamily: FONT,
      padding: '0',
      paddingRight: '4px',
      boxSizing: 'border-box',
      letterSpacing: '-0.005em',
      fontVariantNumeric: 'tabular-nums',
      minWidth: '0',
    });

    const onFocus = () => {
      inputArea.style.outline = '1px solid ' + tv(V.border);
      inputArea.style.background = tv(V.border);
    };
    const onBlur = () => {
      inputArea.style.outline = 'none';
      inputArea.style.background = tv(V.surfaceHover);
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

    inputArea.appendChild(input);
    wrapper.appendChild(inputArea);

    // Right: chevron trigger (32x32)
    const chevronTrigger = document.createElement('div');
    Object.assign(chevronTrigger.style, {
      width: '32px',
      height: '32px',
      borderRadius: '0 8px 8px 0',
      background: tv(V.surfaceHover),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: tv(V.textTertiary),
      flexShrink: '0',
      transition: 'background 0.15s',
    });
    chevronTrigger.appendChild(chevronDown(24));

    const onChevEnter = () => { chevronTrigger.style.background = tv(V.border); };
    const onChevLeave = () => { chevronTrigger.style.background = tv(V.surfaceHover); };
    chevronTrigger.addEventListener('mouseenter', onChevEnter);
    chevronTrigger.addEventListener('mouseleave', onChevLeave);
    this.cleanups.push(() => {
      chevronTrigger.removeEventListener('mouseenter', onChevEnter);
      chevronTrigger.removeEventListener('mouseleave', onChevLeave);
    });

    wrapper.appendChild(chevronTrigger);

    return wrapper;
  }

  // -----------------------------------------------------------------------
  // SelectControl (exact: h32, r8, bg inputBg, 32px chevron area)
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
      background: tv(V.surfaceHover),
      display: 'flex',
      alignItems: 'center',
      flex: '1',
      minWidth: '0',
      cursor: 'pointer',
      padding: '0',
      border: 'none',
      overflow: 'visible',
    });

    const valueText = document.createElement('span');
    valueText.textContent = currentValue;
    Object.assign(valueText.style, {
      flex: '1',
      fontSize: '11px',
      fontWeight: '450',
      letterSpacing: '-0.005em',
      color: tv(V.text),
      paddingLeft: '32px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      textAlign: 'left',
    });

    const chevronWrap = document.createElement('div');
    Object.assign(chevronWrap.style, {
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: tv(V.textSecondary),
      flexShrink: '0',
    });
    chevronWrap.appendChild(chevronDown(24));

    wrapper.appendChild(valueText);
    wrapper.appendChild(chevronWrap);

    const onEnter = () => {
      wrapper.style.background = tv(V.border);
    };
    const onLeave = () => {
      wrapper.style.background = tv(V.surfaceHover);
    };
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
        background: tv(V.surface),
        borderRadius: '8px',
        border: '1px solid ' + tv(V.border),
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        zIndex: '10',
        maxHeight: '200px',
        overflowY: 'auto',
        scrollbarWidth: 'none',
        padding: '4px',
      });

      for (const opt of options) {
        const item = document.createElement('div');
        const isActive = opt === valueText.textContent;
        Object.assign(item.style, {
          padding: '6px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          color: isActive ? tv(V.blueText) : tv(V.textSecondary),
          background: isActive ? tv(V.blueBg) : 'transparent',
          cursor: 'pointer',
        });
        item.textContent = opt;

        const onItemEnter = () => {
          if (!isActive) item.style.background = tv(V.surfaceHover);
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
      setTimeout(
        () => document.addEventListener('click', onDocClick),
        0,
      );
      this.cleanups.push(() =>
        document.removeEventListener('click', onDocClick),
      );
    };

    wrapper.addEventListener('click', onClick);
    this.cleanups.push(() =>
      wrapper.removeEventListener('click', onClick),
    );

    return wrapper;
  }

  // -----------------------------------------------------------------------
  // SegmentedControl with reference icon factory functions
  // -----------------------------------------------------------------------

  private makeSegmentedControlWithIcons(
    items: Array<{ iconFn: () => SVGSVGElement; value: string; label: string }>,
    activeValue: string,
    onChange: (val: string) => void,
  ): HTMLDivElement {
    const outer = document.createElement('div');
    Object.assign(outer.style, {
      position: 'relative',
      display: 'flex',
      height: '32px',
      background: tv(V.surfaceHover),
      borderRadius: '8px',
      overflow: 'hidden',
      flex: '1',
    });

    // Sliding pill (reference: surface bg + border)
    const pill = document.createElement('div');
    Object.assign(pill.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      height: '100%',
      background: tv(V.surface),
      border: '1px solid ' + tv(V.border),
      borderRadius: '8px',
      boxSizing: 'border-box',
      transition: 'transform 200ms cubic-bezier(0.77, 0, 0.175, 1)',
      willChange: 'transform',
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
      Object.assign(btn.style, {
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '32px',
        border: 'none',
        background: 'transparent',
        color: tv(V.text),
        cursor: 'pointer',
        position: 'relative',
        zIndex: '1',
        padding: '0',
        borderRadius: '8px',
        transition: 'color 150ms',
      });
      btn.title = item.label;
      btn.setAttribute('aria-label', item.label);
      btn.appendChild(item.iconFn());

      const onClick = () => {
        activeIdx = i;
        for (let j = 0; j < buttons.length; j++) {
          buttons[j].style.color =
            j === i ? tv(V.text) : tv(V.textTertiary);
        }
        updatePill();
        onChange(item.value);
      };
      btn.addEventListener('click', onClick);
      this.cleanups.push(() =>
        btn.removeEventListener('click', onClick),
      );

      buttons.push(btn);
      outer.appendChild(btn);
    }

    const updatePill = () => {
      if (!buttons[activeIdx]) return;
      const segW = 100 / items.length;
      pill.style.width = segW + '%';
      pill.style.transform =
        'translateX(' + activeIdx * 100 + '%)';
    };

    requestAnimationFrame(updatePill);

    return outer;
  }

  // -----------------------------------------------------------------------
  // Alignment 3x3 grid with reference iconDot/iconPosition* icons
  // -----------------------------------------------------------------------

  private makeAlignmentGrid(
    cs: Record<string, string>,
  ): HTMLDivElement {
    const grid = document.createElement('div');
    Object.assign(grid.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridTemplateRows: 'repeat(3, 1fr)',
      background: tv(V.surfaceHover),
      borderRadius: '8px',
      width: '100%',
      height: '72px',
    });

    const BLUE = '#0D99FF';
    const GRAY = '#a8a29e';

    // Each position maps to jc+ai values and a position-specific icon
    const positionIcons = [
      { jc: 'flex-start', ai: 'flex-start', icon: (c: string) => iconPositionTop(16, c) },
      { jc: 'center', ai: 'flex-start', icon: (c: string) => iconPositionCenterV(16, c) },
      { jc: 'flex-end', ai: 'flex-start', icon: (c: string) => iconPositionBottom(16, c) },
      { jc: 'flex-start', ai: 'center', icon: (c: string) => iconPositionTop(16, c) },
      { jc: 'center', ai: 'center', icon: (c: string) => iconPositionCenterV(16, c) },
      { jc: 'flex-end', ai: 'center', icon: (c: string) => iconPositionBottom(16, c) },
      { jc: 'flex-start', ai: 'flex-end', icon: (c: string) => iconPositionTop(16, c) },
      { jc: 'center', ai: 'flex-end', icon: (c: string) => iconPositionCenterV(16, c) },
      { jc: 'flex-end', ai: 'flex-end', icon: (c: string) => iconPositionBottom(16, c) },
    ];

    const currentJC = getVal(cs, 'justify-content') || 'flex-start';
    const currentAI = getVal(cs, 'align-items') || 'flex-start';

    const cells: HTMLButtonElement[] = [];

    for (let idx = 0; idx < positionIcons.length; idx++) {
      const pos = positionIcons[idx];
      const cell = document.createElement('button');
      const isActive = pos.jc === currentJC && pos.ai === currentAI;
      Object.assign(cell.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        background: 'transparent',
        padding: '0',
        cursor: 'pointer',
        overflow: 'hidden',
      });

      // Active: show position icon in blue. Inactive: show dot in gray.
      if (isActive) {
        cell.appendChild(pos.icon(BLUE));
      } else {
        cell.appendChild(iconDot(16, GRAY));
      }

      const onCellEnter = () => {
        if (!isActive) cell.style.color = tv(V.text);
      };
      const onCellLeave = () => {
        if (!isActive) cell.style.color = tv(V.textTertiary);
      };
      const onCellClick = () => {
        this.emitChange('justify-content', pos.jc);
        this.emitChange('align-items', pos.ai);
        for (let i = 0; i < cells.length; i++) {
          const c = cells[i];
          const p = positions[i];
          const active = p.jc === pos.jc && p.ai === pos.ai;
          c.style.color = active ? tv(V.text) : tv(V.textTertiary);
        }
      };
      cell.addEventListener('mouseenter', onCellEnter);
      cell.addEventListener('mouseleave', onCellLeave);
      cell.addEventListener('click', onCellClick);
      this.cleanups.push(() => {
        cell.removeEventListener('mouseenter', onCellEnter);
        cell.removeEventListener('mouseleave', onCellLeave);
        cell.removeEventListener('click', onCellClick);
      });

      cells.push(cell);
      grid.appendChild(cell);
    }

    return grid;
  }

  // -----------------------------------------------------------------------
  // ColorInput (exact: swatch + hex + opacity, split into two sections)
  // -----------------------------------------------------------------------

  private makeColorInput(
    property: string,
    computedStyles: Record<string, string>,
  ): HTMLDivElement {
    const rawValue = getVal(computedStyles, property);
    const hexValue = parseColor(rawValue);
    const opacityVal = parseOpacity(rawValue);

    // Container row
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      height: '32px',
      gap: '1px',
    });

    // Left: hex section (swatch + hex input)
    const hexSection = document.createElement('div');
    Object.assign(hexSection.style, {
      flex: '1',
      display: 'flex',
      alignItems: 'center',
      minWidth: '0',
      height: '32px',
      position: 'relative',
      background: tv(V.surfaceHover),
      borderRadius: '8px 0 0 8px',
      transition: 'background 0.15s',
    });

    const onHexEnter = () => { hexSection.style.background = tv(V.border); };
    const onHexLeave = () => {
      if (hexSection.querySelector('input:focus')) return;
      hexSection.style.background = tv(V.surfaceHover);
    };
    hexSection.addEventListener('mouseenter', onHexEnter);
    hexSection.addEventListener('mouseleave', onHexLeave);
    this.cleanups.push(() => {
      hexSection.removeEventListener('mouseenter', onHexEnter);
      hexSection.removeEventListener('mouseleave', onHexLeave);
    });

    // Swatch container (32px wide, centers 20x20 swatch)
    const swatchContainer = document.createElement('div');
    Object.assign(swatchContainer.style, {
      width: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
      position: 'relative',
    });

    // Swatch inner (20x20 rounded square)
    const swatchInner = document.createElement('div');
    Object.assign(swatchInner.style, {
      width: '20px',
      height: '20px',
      borderRadius: '2px',
      background: hexValue,
      position: 'relative',
      overflow: 'hidden',
    });

    // Hidden native color input over swatch
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
    swatchContainer.appendChild(swatchInner);
    swatchContainer.appendChild(colorInput);

    // Hex text input
    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.value = hexValue;
    Object.assign(hexInput.style, {
      flex: '1',
      height: '100%',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      color: tv(V.text),
      fontSize: '11px',
      fontWeight: '450',
      fontFamily: FONT,
      padding: '0',
      boxSizing: 'border-box',
      letterSpacing: '-0.005em',
    });

    const onColorInput = () => {
      swatchInner.style.background = colorInput.value;
      hexInput.value = colorInput.value;
      this.emitChange(property, colorInput.value);
    };
    colorInput.addEventListener('input', onColorInput);
    this.cleanups.push(() =>
      colorInput.removeEventListener('input', onColorInput),
    );

    const onHexChange = () => {
      const val = hexInput.value.trim();
      if (/^#[0-9a-fA-F]{3,6}$/.test(val)) {
        const normalized =
          val.length === 4
            ? '#' +
              val[1] +
              val[1] +
              val[2] +
              val[2] +
              val[3] +
              val[3]
            : val;
        swatchInner.style.background = normalized;
        colorInput.value = normalized;
        this.emitChange(property, normalized);
      }
    };
    hexInput.addEventListener('change', onHexChange);
    this.cleanups.push(() =>
      hexInput.removeEventListener('change', onHexChange),
    );

    // Focus style on hex section
    const onFocus = () => {
      hexSection.style.outline = '1px solid ' + tv(V.border);
    };
    const onBlur = () => {
      hexSection.style.outline = 'none';
      hexSection.style.background = tv(V.surfaceHover);
    };
    hexInput.addEventListener('focus', onFocus);
    hexInput.addEventListener('blur', onBlur);
    this.cleanups.push(() => {
      hexInput.removeEventListener('focus', onFocus);
      hexInput.removeEventListener('blur', onBlur);
    });

    hexSection.appendChild(swatchContainer);
    hexSection.appendChild(hexInput);
    row.appendChild(hexSection);

    // Right: opacity section
    const opSection = document.createElement('div');
    Object.assign(opSection.style, {
      display: 'flex',
      alignItems: 'center',
      height: '32px',
      background: tv(V.surfaceHover),
      borderRadius: '0 8px 8px 0',
      padding: '0 8px 0 4px',
      transition: 'background 0.15s',
    });

    const onOpEnter = () => { opSection.style.background = tv(V.border); };
    const onOpLeave = () => {
      if (opSection.querySelector('input:focus')) return;
      opSection.style.background = tv(V.surfaceHover);
    };
    opSection.addEventListener('mouseenter', onOpEnter);
    opSection.addEventListener('mouseleave', onOpLeave);
    this.cleanups.push(() => {
      opSection.removeEventListener('mouseenter', onOpEnter);
      opSection.removeEventListener('mouseleave', onOpLeave);
    });

    const opInput = document.createElement('input');
    opInput.type = 'text';
    opInput.value = String(opacityVal);
    Object.assign(opInput.style, {
      width: '28px',
      height: '100%',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      color: tv(V.text),
      fontSize: '11px',
      fontWeight: '450',
      fontFamily: FONT,
      textAlign: 'right',
      letterSpacing: '-0.005em',
      fontVariantNumeric: 'tabular-nums',
    });

    const pctLabel = document.createElement('span');
    pctLabel.textContent = '%';
    Object.assign(pctLabel.style, {
      fontSize: '11px',
      color: tv(V.textTertiary),
    });

    opSection.appendChild(opInput);
    opSection.appendChild(pctLabel);
    row.appendChild(opSection);

    return row;
  }

  // -----------------------------------------------------------------------
  // Change emission
  // -----------------------------------------------------------------------

  private emitChange(property: string, value: string): void {
    this.changeCallback?.(property, value);
  }
}
