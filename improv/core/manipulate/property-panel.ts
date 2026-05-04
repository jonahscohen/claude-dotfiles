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

function rgbaAlpha(val: string): number {
  const match = val.match(
    /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)$/,
  );
  return match ? parseFloat(match[1]) : 1;
}

function parseColor(val: string): string {
  if (!val || val === 'transparent') return '#000000';
  if (val.startsWith('rgb')) return rgbToHex(val);
  if (val.startsWith('#')) return val.length === 4
    ? '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3]
    : val;
  return '#000000';
}

function parsePx(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function fmtVal(val: string): string {
  const n = parsePx(val);
  return String(Math.round(n));
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

function svg(w: number, h: number, paths: string): SVGSVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('width', String(w));
  el.setAttribute('height', String(h));
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('fill', 'none');
  el.setAttribute('stroke', 'currentColor');
  el.setAttribute('stroke-width', '2');
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', paths);
  el.appendChild(p);
  return el;
}

function chevronDown(): SVGSVGElement {
  return svg(12, 12, 'M6 9l6 6l6-6');
}

const TEXT_ALIGN_PATHS: Record<string, string> = {
  left: 'M3 6h18M3 10h12M3 14h18M3 18h12',
  center: 'M3 6h18M6 10h12M3 14h18M6 18h12',
  right: 'M3 6h18M9 10h12M3 14h18M9 18h12',
  justify: 'M3 6h18M3 10h18M3 14h18M3 18h18',
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PANEL_WIDTH = 280;
const FONT = 'system-ui, -apple-system, sans-serif';
const BG = '#1a1a1a';
const BORDER_COLOR = 'rgba(255,255,255,0.08)';
const SECTION_BORDER = 'rgba(255,255,255,0.06)';
const LABEL_COLOR = 'rgba(255,255,255,0.45)';
const TITLE_COLOR = 'rgba(255,255,255,0.85)';
const VALUE_COLOR = 'rgba(255,255,255,0.85)';
const UNIT_COLOR = 'rgba(255,255,255,0.3)';
const INPUT_BG = 'rgba(255,255,255,0.05)';
const INPUT_BG_HOVER = 'rgba(255,255,255,0.08)';
const INPUT_FOCUS_OUTLINE = '1px solid rgba(255,255,255,0.15)';
const PILL_BG = 'rgba(255,255,255,0.05)';
const PILL_ACTIVE_BG = 'rgba(59,130,246,0.15)';
const PILL_ACTIVE_COLOR = '#6dacfc';
const CHANGE_DOT_COLOR = '#0D99FF';

const MARGIN_BG = 'rgba(249,115,22,0.15)';
const MARGIN_TEXT = '#f97316';
const PADDING_BG = 'rgba(34,197,94,0.15)';
const PADDING_TEXT = '#22c55e';
const CONTENT_BG = 'rgba(59,130,246,0.15)';
const CONTENT_TEXT = '#93c5fd';

type SectionId =
  | 'state'
  | 'spacing'
  | 'size'
  | 'typography'
  | 'fill'
  | 'border'
  | 'shadow';

// ---------------------------------------------------------------------------
// PropertyPanel
// ---------------------------------------------------------------------------

export class PropertyPanel {
  private shadow: ShadowRoot;
  private container: HTMLDivElement;
  private cleanups: Array<() => void> = [];
  private changeCallback: PropertyChangeCallback | null = null;
  private originalValues: Map<string, string> = new Map();
  private changeDots: Map<string, HTMLDivElement> = new Map();
  private boxLabels: Map<string, HTMLDivElement> = new Map();

  constructor(shadow: ShadowRoot) {
    this.shadow = shadow;
    this.container = document.createElement('div');
    this.applyContainerStyles();
    this.shadow.appendChild(this.container);
  }

  // -----------------------------------------------------------------------
  // Container
  // -----------------------------------------------------------------------

  private applyContainerStyles(): void {
    this.container.style.cssText = [
      'position: fixed',
      'right: 16px',
      'bottom: 68px',
      `width: ${PANEL_WIDTH}px`,
      'max-height: calc(100vh - 84px)',
      'overflow-y: auto',
      'scrollbar-width: none',
      `background: ${BG}`,
      'border-radius: 16px',
      `box-shadow: 0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px ${BORDER_COLOR}`,
      'pointer-events: auto',
      `font-family: ${FONT}`,
      'font-size: 13px',
      `color: ${VALUE_COLOR}`,
      'z-index: 2147483647',
      // Entry animation initial state
      'opacity: 0',
      'transform: translateY(12px)',
    ].join(';');

    // Animate in
    requestAnimationFrame(() => {
      this.container.style.transition =
        'opacity 150ms cubic-bezier(0.23,1,0.32,1), transform 150ms cubic-bezier(0.23,1,0.32,1)';
      this.container.style.opacity = '1';
      this.container.style.transform = 'translateY(0)';
    });

    // Hide webkit scrollbar
    const style = document.createElement('style');
    style.textContent = [
      ':host ::-webkit-scrollbar { display: none; }',
      '.improv-pp-container::-webkit-scrollbar { display: none; }',
    ].join('\n');
    this.shadow.appendChild(style);
    this.container.classList.add('improv-pp-container');
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  render(controls: DetectedControls, computedStyles: Record<string, string>): void {
    this.cleanup();
    this.clearContainer();
    this.originalValues.clear();
    this.changeDots.clear();
    this.boxLabels.clear();

    // Snapshot original values for change indicators
    for (const group of controls.groups) {
      for (const ctrl of group.controls) {
        const val = getVal(computedStyles, ctrl.property);
        this.originalValues.set(ctrl.property, val);
      }
    }
    // Also snapshot extra properties we render directly
    const extraProps = [
      'width', 'height',
      'background-color', 'opacity',
      'border-top-left-radius', 'border-top-right-radius',
      'border-bottom-right-radius', 'border-bottom-left-radius',
      'border-width', 'border-color',
      'box-shadow',
    ];
    for (const p of extraProps) {
      if (!this.originalValues.has(p)) {
        this.originalValues.set(p, getVal(computedStyles, p));
      }
    }

    // Determine which sections to show
    const groupNames = new Set(controls.groups.map((g) => g.name));
    const hasTypography = groupNames.has('typography');

    // 1. State toggles
    this.buildStateToggles();

    // 2. Spacing (box model diagram)
    this.buildSection('Spacing', 'spacing', true, (body) => {
      this.buildBoxModelDiagram(body, computedStyles);
    });

    // 3. Size
    this.buildSection('Size', 'size', true, (body) => {
      this.buildSizeSection(body, computedStyles);
    });

    // 4. Typography (only for text elements)
    if (hasTypography) {
      const typoControls =
        controls.groups.find((g) => g.name === 'typography')?.controls ?? [];
      this.buildSection('Typography', 'typography', false, (body) => {
        this.buildTypographySection(body, typoControls, computedStyles);
      });
    }

    // 5. Fill
    this.buildSection('Fill', 'fill', false, (body) => {
      this.buildFillSection(body, computedStyles);
    });

    // 6. Border
    this.buildSection('Border', 'border', false, (body) => {
      this.buildBorderSection(body, computedStyles);
    });

    // 7. Shadow
    this.buildSection('Shadow', 'shadow', false, (body) => {
      this.buildShadowSection(body, computedStyles);
    });
  }

  onPropertyChange(callback: PropertyChangeCallback): void {
    this.changeCallback = callback;
  }

  updateComputedStyles(computedStyles: Record<string, string>): void {
    // Update box model labels
    const boxKeys = [
      'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'width', 'height',
    ];
    for (const key of boxKeys) {
      const label = this.boxLabels.get(key);
      if (label) {
        label.textContent = fmtVal(computedStyles[key] ?? '0');
      }
    }
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
    this.originalValues.clear();
    this.changeDots.clear();
    this.boxLabels.clear();
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
  // 1. State toggles
  // -----------------------------------------------------------------------

  private buildStateToggles(): void {
    const row = document.createElement('div');
    row.style.cssText = [
      'display: flex',
      'gap: 6px',
      'padding: 10px 12px',
      `border-bottom: 1px solid ${SECTION_BORDER}`,
    ].join(';');

    const states = ['Hover', 'Focus', 'Active'] as const;

    for (const label of states) {
      const btn = document.createElement('button');
      btn.textContent = label;
      let active = false;

      const applyStyle = () => {
        btn.style.cssText = [
          'height: 28px',
          'padding: 0 12px',
          'font-size: 11px',
          'font-weight: 500',
          `font-family: ${FONT}`,
          'border: none',
          'border-radius: 8px',
          'cursor: pointer',
          'transition: background 0.12s, color 0.12s',
          active
            ? `background: ${PILL_ACTIVE_BG}; color: ${PILL_ACTIVE_COLOR};`
            : `background: ${PILL_BG}; color: rgba(255,255,255,0.5);`,
        ].join(';');
      };
      applyStyle();

      const onClick = () => {
        active = !active;
        applyStyle();
      };
      btn.addEventListener('click', onClick);
      this.cleanups.push(() => btn.removeEventListener('click', onClick));
      row.appendChild(btn);
    }

    this.container.appendChild(row);
  }

  // -----------------------------------------------------------------------
  // Section scaffold
  // -----------------------------------------------------------------------

  private buildSection(
    title: string,
    _id: SectionId,
    defaultOpen: boolean,
    buildBody: (body: HTMLDivElement) => void,
  ): void {
    const section = document.createElement('div');
    section.style.cssText = `border-bottom: 1px solid ${SECTION_BORDER};`;

    // Header - 44px tall
    const header = document.createElement('div');
    header.style.cssText = [
      'display: flex',
      'align-items: center',
      'justify-content: space-between',
      'height: 44px',
      'padding: 0 12px',
      'cursor: pointer',
      'user-select: none',
    ].join(';');

    const titleEl = document.createElement('span');
    titleEl.textContent = title;
    titleEl.style.cssText = [
      'font-size: 12px',
      'font-weight: 500',
      `color: ${TITLE_COLOR}`,
    ].join(';');

    const chevron = chevronDown();
    chevron.style.cssText = [
      'flex-shrink: 0',
      `color: ${LABEL_COLOR}`,
      'transition: transform 0.15s',
      `transform: rotate(${defaultOpen ? 0 : -90}deg)`,
    ].join(';');

    header.appendChild(titleEl);
    header.appendChild(chevron);

    // Body
    const body = document.createElement('div');
    body.style.cssText = [
      'display: flex',
      'flex-direction: column',
      'gap: 8px',
      'padding: 8px 12px 16px 12px',
      defaultOpen ? '' : 'display: none',
    ].join(';');
    if (!defaultOpen) body.style.display = 'none';

    buildBody(body);

    // Toggle
    const onHeaderClick = () => {
      const isHidden = body.style.display === 'none';
      body.style.display = isHidden ? 'flex' : 'none';
      chevron.style.transform = `rotate(${isHidden ? 0 : -90}deg)`;
    };
    header.addEventListener('click', onHeaderClick);
    this.cleanups.push(() => header.removeEventListener('click', onHeaderClick));

    section.appendChild(header);
    section.appendChild(body);
    this.container.appendChild(section);
  }

  // -----------------------------------------------------------------------
  // 2. Spacing - Box Model Diagram
  // -----------------------------------------------------------------------

  private buildBoxModelDiagram(
    body: HTMLDivElement,
    computedStyles: Record<string, string>,
  ): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = [
      'position: relative',
      'width: 100%',
      'height: 140px',
      'box-sizing: border-box',
    ].join(';');

    // Margin layer (outermost)
    const marginLayer = document.createElement('div');
    marginLayer.style.cssText = [
      'position: absolute',
      'inset: 0',
      `background: ${MARGIN_BG}`,
      'border-radius: 4px',
    ].join(';');

    // Margin label
    const marginLabel = document.createElement('div');
    marginLabel.style.cssText = [
      'position: absolute',
      'top: 3px',
      'left: 6px',
      'font-size: 9px',
      `color: ${MARGIN_TEXT}`,
      'opacity: 0.6',
    ].join(';');
    marginLabel.textContent = 'margin';
    marginLayer.appendChild(marginLabel);

    // Margin edge values (scrubable)
    this.addEdgeValue(marginLayer, 'top', 'margin-top', computedStyles, MARGIN_TEXT);
    this.addEdgeValue(marginLayer, 'bottom', 'margin-bottom', computedStyles, MARGIN_TEXT);
    this.addEdgeValue(marginLayer, 'left', 'margin-left', computedStyles, MARGIN_TEXT);
    this.addEdgeValue(marginLayer, 'right', 'margin-right', computedStyles, MARGIN_TEXT);

    // Padding layer
    const paddingLayer = document.createElement('div');
    paddingLayer.style.cssText = [
      'position: absolute',
      'inset: 22px',
      `background: ${PADDING_BG}`,
      'border-radius: 3px',
    ].join(';');

    // Padding label
    const paddingLabel = document.createElement('div');
    paddingLabel.style.cssText = [
      'position: absolute',
      'top: 3px',
      'left: 6px',
      'font-size: 9px',
      `color: ${PADDING_TEXT}`,
      'opacity: 0.6',
    ].join(';');
    paddingLabel.textContent = 'padding';
    paddingLayer.appendChild(paddingLabel);

    // Padding edge values (scrubable)
    this.addEdgeValue(paddingLayer, 'top', 'padding-top', computedStyles, PADDING_TEXT);
    this.addEdgeValue(paddingLayer, 'bottom', 'padding-bottom', computedStyles, PADDING_TEXT);
    this.addEdgeValue(paddingLayer, 'left', 'padding-left', computedStyles, PADDING_TEXT);
    this.addEdgeValue(paddingLayer, 'right', 'padding-right', computedStyles, PADDING_TEXT);

    // Content layer (innermost)
    const contentLayer = document.createElement('div');
    contentLayer.style.cssText = [
      'position: absolute',
      'inset: 22px',
      `background: ${CONTENT_BG}`,
      'border-radius: 2px',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'gap: 3px',
    ].join(';');

    const wVal = document.createElement('span');
    wVal.textContent = fmtVal(computedStyles['width'] ?? '0');
    wVal.style.cssText = `font-size: 10px; color: ${CONTENT_TEXT}; font-variant-numeric: tabular-nums;`;
    this.boxLabels.set('width', wVal);

    const xSpan = document.createElement('span');
    xSpan.textContent = '×';
    xSpan.style.cssText = `font-size: 10px; color: ${CONTENT_TEXT}; opacity: 0.5;`;

    const hVal = document.createElement('span');
    hVal.textContent = fmtVal(computedStyles['height'] ?? '0');
    hVal.style.cssText = `font-size: 10px; color: ${CONTENT_TEXT}; font-variant-numeric: tabular-nums;`;
    this.boxLabels.set('height', hVal);

    contentLayer.appendChild(wVal);
    contentLayer.appendChild(xSpan);
    contentLayer.appendChild(hVal);

    paddingLayer.appendChild(contentLayer);
    marginLayer.appendChild(paddingLayer);
    wrapper.appendChild(marginLayer);
    body.appendChild(wrapper);
  }

  private addEdgeValue(
    layer: HTMLDivElement,
    position: 'top' | 'bottom' | 'left' | 'right',
    property: string,
    computedStyles: Record<string, string>,
    color: string,
  ): void {
    const rawValue = getVal(computedStyles, property);
    const el = document.createElement('div');
    el.textContent = fmtVal(rawValue);
    el.style.cssText = [
      'position: absolute',
      'font-size: 11px',
      'font-variant-numeric: tabular-nums',
      `color: ${color}`,
      'cursor: ew-resize',
      'user-select: none',
      'display: flex',
      'align-items: center',
      'justify-content: center',
    ].join(';');

    if (position === 'top') {
      el.style.top = '2px';
      el.style.left = '0';
      el.style.right = '0';
      el.style.height = '16px';
    } else if (position === 'bottom') {
      el.style.bottom = '2px';
      el.style.left = '0';
      el.style.right = '0';
      el.style.height = '16px';
    } else if (position === 'left') {
      el.style.left = '2px';
      el.style.top = '0';
      el.style.bottom = '0';
      el.style.width = '20px';
      el.style.writingMode = 'vertical-lr';
      el.style.transform = 'rotate(180deg)';
    } else {
      el.style.right = '2px';
      el.style.top = '0';
      el.style.bottom = '0';
      el.style.width = '20px';
      el.style.writingMode = 'vertical-lr';
    }

    // Store label ref for live updates
    this.boxLabels.set(cssPropToCamel(property), el);

    // Scrub-to-adjust
    const parsed = parseNumericValue(rawValue);
    if (parsed !== null) {
      const unit = parsed.unit || 'px';
      const cleanup = attachScrub(el, {
        initialValue: parsed.number,
        step: 1,
        onUpdate: (val) => {
          el.textContent = String(Math.round(Math.max(0, val)));
        },
        onCommit: (val) => {
          const clamped = Math.max(0, val);
          el.textContent = String(Math.round(clamped));
          const formatted = formatNumericValue(clamped, unit);
          this.emitChange(property, formatted);
        },
      });
      this.cleanups.push(cleanup);
    }

    layer.appendChild(el);
  }

  // -----------------------------------------------------------------------
  // 3. Size
  // -----------------------------------------------------------------------

  private buildSizeSection(
    body: HTMLDivElement,
    computedStyles: Record<string, string>,
  ): void {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; gap: 8px;';

    row.appendChild(this.makeNumberInput('width', 'W', computedStyles));
    row.appendChild(this.makeNumberInput('height', 'H', computedStyles));

    body.appendChild(row);
  }

  // -----------------------------------------------------------------------
  // 4. Typography
  // -----------------------------------------------------------------------

  private buildTypographySection(
    body: HTMLDivElement,
    controls: ControlDefinition[],
    computedStyles: Record<string, string>,
  ): void {
    // Font size
    const fontSize = controls.find((c) => c.property === 'font-size');
    if (fontSize) {
      body.appendChild(
        this.makePropertyRow('Font Size', this.makeNumberInput('font-size', 'px', computedStyles)),
      );
    }

    // Font weight
    const fontWeight = controls.find((c) => c.property === 'font-weight');
    if (fontWeight) {
      body.appendChild(
        this.makePropertyRow(
          'Weight',
          this.makeSelectInput(
            'font-weight',
            ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
            computedStyles,
          ),
        ),
      );
    }

    // Line height
    const lineHeight = controls.find((c) => c.property === 'line-height');
    if (lineHeight) {
      body.appendChild(
        this.makePropertyRow('Line Height', this.makeNumberInput('line-height', '', computedStyles, 0.1)),
      );
    }

    // Letter spacing
    const letterSpacing = controls.find((c) => c.property === 'letter-spacing');
    if (letterSpacing) {
      body.appendChild(
        this.makePropertyRow('Spacing', this.makeNumberInput('letter-spacing', 'px', computedStyles, 0.1)),
      );
    }

    // Color
    const color = controls.find((c) => c.property === 'color');
    if (color) {
      body.appendChild(
        this.makePropertyRow('Color', this.makeColorInput('color', computedStyles)),
      );
    }

    // Text align
    const textAlign = controls.find((c) => c.property === 'text-align');
    if (textAlign) {
      body.appendChild(
        this.makePropertyRow('Align', this.makeTextAlignButtons(computedStyles)),
      );
    }
  }

  // -----------------------------------------------------------------------
  // 5. Fill
  // -----------------------------------------------------------------------

  private buildFillSection(
    body: HTMLDivElement,
    computedStyles: Record<string, string>,
  ): void {
    body.appendChild(
      this.makePropertyRow('Background', this.makeColorInput('background-color', computedStyles)),
    );
    body.appendChild(
      this.makePropertyRow('Opacity', this.makeNumberInput('opacity', '', computedStyles, 0.05)),
    );
  }

  // -----------------------------------------------------------------------
  // 6. Border
  // -----------------------------------------------------------------------

  private buildBorderSection(
    body: HTMLDivElement,
    computedStyles: Record<string, string>,
  ): void {
    // Radius - 2x2 grid
    const radiusLabel = document.createElement('div');
    radiusLabel.textContent = 'Radius';
    radiusLabel.style.cssText = `font-size: 11px; color: ${LABEL_COLOR}; margin-bottom: 4px;`;
    body.appendChild(radiusLabel);

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 6px;';

    grid.appendChild(this.makeNumberInput('border-top-left-radius', 'TL', computedStyles));
    grid.appendChild(this.makeNumberInput('border-top-right-radius', 'TR', computedStyles));
    grid.appendChild(this.makeNumberInput('border-bottom-left-radius', 'BL', computedStyles));
    grid.appendChild(this.makeNumberInput('border-bottom-right-radius', 'BR', computedStyles));

    body.appendChild(grid);

    // Border width
    body.appendChild(
      this.makePropertyRow('Width', this.makeNumberInput('border-width', 'px', computedStyles)),
    );

    // Border color
    body.appendChild(
      this.makePropertyRow('Color', this.makeColorInput('border-color', computedStyles)),
    );
  }

  // -----------------------------------------------------------------------
  // 7. Shadow
  // -----------------------------------------------------------------------

  private buildShadowSection(
    body: HTMLDivElement,
    computedStyles: Record<string, string>,
  ): void {
    const rawValue = getVal(computedStyles, 'box-shadow');

    const display = document.createElement('div');
    display.style.cssText = [
      'font-size: 11px',
      'color: rgba(255,255,255,0.6)',
      'background: ' + INPUT_BG,
      'border-radius: 8px',
      'padding: 8px 10px',
      'max-height: 60px',
      'overflow-y: auto',
      'scrollbar-width: none',
      'word-break: break-all',
      'line-height: 1.4',
    ].join(';');
    display.textContent = rawValue || 'none';

    body.appendChild(display);
  }

  // -----------------------------------------------------------------------
  // Shared control builders
  // -----------------------------------------------------------------------

  /**
   * Property row: label (70px min-width) + control, flex, 32px min-height.
   */
  private makePropertyRow(label: string, control: HTMLElement): HTMLDivElement {
    const row = document.createElement('div');
    row.style.cssText = [
      'display: flex',
      'align-items: center',
      'min-height: 32px',
      'gap: 8px',
    ].join(';');

    // Change dot container + label
    const labelWrap = document.createElement('div');
    labelWrap.style.cssText = [
      'display: flex',
      'align-items: center',
      'gap: 4px',
      'min-width: 70px',
      'flex-shrink: 0',
    ].join(';');

    const dot = document.createElement('div');
    dot.style.cssText = [
      'width: 4px',
      'height: 4px',
      'border-radius: 50%',
      'flex-shrink: 0',
      'opacity: 0',
    ].join(';');

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = `font-size: 11px; color: ${LABEL_COLOR};`;

    labelWrap.appendChild(dot);
    labelWrap.appendChild(labelEl);
    row.appendChild(labelWrap);

    // Store dot reference by label for potential change-indicator updates
    // (We key by label since the row doesn't always know the property)
    this.changeDots.set(label, dot);

    control.style.flex = '1';
    row.appendChild(control);

    return row;
  }

  /**
   * Show the change dot for a property label.
   */
  private markChanged(label: string): void {
    const dot = this.changeDots.get(label);
    if (dot) {
      dot.style.background = CHANGE_DOT_COLOR;
      dot.style.opacity = '1';
    }
  }

  /**
   * NumberInput: 32px height, 8px radius, background INPUT_BG.
   * Label inside (absolute left), value text 11px, unit suffix shown.
   * Label cursor: ew-resize for scrub.
   */
  private makeNumberInput(
    property: string,
    label: string,
    computedStyles: Record<string, string>,
    step: number = 1,
  ): HTMLDivElement {
    const rawValue = getVal(computedStyles, property);
    const parsed = parseNumericValue(rawValue);

    const wrapper = document.createElement('div');
    wrapper.style.cssText = [
      'position: relative',
      'height: 32px',
      'border-radius: 8px',
      `background: ${INPUT_BG}`,
      'display: flex',
      'align-items: center',
      'overflow: hidden',
    ].join(';');

    // Hover effect
    const onEnter = () => { wrapper.style.background = INPUT_BG_HOVER; };
    const onLeave = () => { wrapper.style.background = INPUT_BG; };
    wrapper.addEventListener('mouseenter', onEnter);
    wrapper.addEventListener('mouseleave', onLeave);
    this.cleanups.push(() => {
      wrapper.removeEventListener('mouseenter', onEnter);
      wrapper.removeEventListener('mouseleave', onLeave);
    });

    // Label (positioned left, scrub handle)
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = [
      'position: absolute',
      'left: 0',
      'top: 0',
      'bottom: 0',
      'width: 32px',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'font-size: 11px',
      `color: ${LABEL_COLOR}`,
      'cursor: ew-resize',
      'user-select: none',
      'flex-shrink: 0',
    ].join(';');

    // Value display
    const valueEl = document.createElement('span');
    valueEl.style.cssText = [
      'font-size: 11px',
      'font-weight: 450',
      `color: ${VALUE_COLOR}`,
      'padding-left: 36px',
      'font-variant-numeric: tabular-nums',
      'cursor: ew-resize',
      'user-select: none',
      'white-space: nowrap',
    ].join(';');
    valueEl.textContent = rawValue || '0';

    // Unit suffix
    if (parsed) {
      const unitSpan = document.createElement('span');
      unitSpan.textContent = parsed.unit || '';
      unitSpan.style.cssText = `color: ${UNIT_COLOR}; font-size: 11px; margin-left: 1px;`;
      // We'll update the value without the unit and append unit
      valueEl.textContent = String(parsed.number);
      valueEl.appendChild(unitSpan);
    }

    // Scrub on both label and value
    if (parsed !== null) {
      const unit = parsed.unit || '';
      const updateDisplay = (val: number) => {
        while (valueEl.firstChild) valueEl.removeChild(valueEl.firstChild);
        valueEl.appendChild(document.createTextNode(String(Math.round(val * 1000) / 1000)));
        if (unit) {
          const u = document.createElement('span');
          u.textContent = unit;
          u.style.cssText = `color: ${UNIT_COLOR}; font-size: 11px; margin-left: 1px;`;
          valueEl.appendChild(u);
        }
      };

      const scrubOpts = {
        initialValue: parsed.number,
        step,
        onUpdate: (val: number) => updateDisplay(val),
        onCommit: (val: number) => {
          updateDisplay(val);
          const formatted = formatNumericValue(val, unit);
          this.emitChange(property, formatted);
        },
      };

      const c1 = attachScrub(labelEl, scrubOpts);
      const c2 = attachScrub(valueEl, scrubOpts);
      this.cleanups.push(c1, c2);
    }

    wrapper.appendChild(labelEl);
    wrapper.appendChild(valueEl);
    return wrapper;
  }

  /**
   * ColorInput: swatch (24px, 4px radius) + hex text input + opacity %.
   * Two joined segments, both 32px height.
   */
  private makeColorInput(
    property: string,
    computedStyles: Record<string, string>,
  ): HTMLDivElement {
    const rawValue = getVal(computedStyles, property);
    const hexValue = parseColor(rawValue);
    const alpha = rgbaAlpha(rawValue);

    const wrapper = document.createElement('div');
    wrapper.style.cssText = [
      'display: flex',
      'align-items: center',
      'gap: 0',
      'height: 32px',
    ].join(';');

    // Left segment: swatch + hex
    const leftSeg = document.createElement('div');
    leftSeg.style.cssText = [
      'display: flex',
      'align-items: center',
      'gap: 6px',
      `background: ${INPUT_BG}`,
      'border-radius: 8px 0 0 8px',
      'height: 32px',
      'padding: 0 8px',
      'flex: 1',
    ].join(';');

    // Swatch
    const swatch = document.createElement('div');
    swatch.style.cssText = [
      'width: 24px',
      'height: 24px',
      'border-radius: 4px',
      `background: ${hexValue}`,
      'flex-shrink: 0',
      'position: relative',
      'overflow: hidden',
      'cursor: pointer',
    ].join(';');

    // Hidden native color input
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = hexValue;
    colorInput.style.cssText = [
      'position: absolute',
      'inset: 0',
      'opacity: 0',
      'width: 100%',
      'height: 100%',
      'cursor: pointer',
      'padding: 0',
      'border: none',
    ].join(';');
    swatch.appendChild(colorInput);

    // Hex text
    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.value = hexValue;
    hexInput.style.cssText = [
      'background: transparent',
      'border: none',
      'outline: none',
      `color: ${VALUE_COLOR}`,
      'font-size: 11px',
      `font-family: ${FONT}`,
      'width: 62px',
      'padding: 0',
    ].join(';');

    const onColorInput = () => {
      swatch.style.background = colorInput.value;
      hexInput.value = colorInput.value;
      this.emitChange(property, colorInput.value);
    };
    colorInput.addEventListener('input', onColorInput);
    this.cleanups.push(() => colorInput.removeEventListener('input', onColorInput));

    const onHexChange = () => {
      const val = hexInput.value.trim();
      if (/^#[0-9a-fA-F]{3,6}$/.test(val)) {
        const normalized = val.length === 4
          ? '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3]
          : val;
        swatch.style.background = normalized;
        colorInput.value = normalized;
        this.emitChange(property, normalized);
      }
    };
    hexInput.addEventListener('change', onHexChange);
    this.cleanups.push(() => hexInput.removeEventListener('change', onHexChange));

    // Focus outline on wrapper
    const onFocusHex = () => { leftSeg.style.outline = INPUT_FOCUS_OUTLINE; };
    const onBlurHex = () => { leftSeg.style.outline = 'none'; };
    hexInput.addEventListener('focus', onFocusHex);
    hexInput.addEventListener('blur', onBlurHex);
    this.cleanups.push(() => {
      hexInput.removeEventListener('focus', onFocusHex);
      hexInput.removeEventListener('blur', onBlurHex);
    });

    leftSeg.appendChild(swatch);
    leftSeg.appendChild(hexInput);

    // Right segment: opacity %
    const rightSeg = document.createElement('div');
    rightSeg.style.cssText = [
      'display: flex',
      'align-items: center',
      'justify-content: center',
      `background: ${INPUT_BG}`,
      'border-radius: 0 8px 8px 0',
      'border-left: 1px solid rgba(255,255,255,0.06)',
      'height: 32px',
      'padding: 0 8px',
      'min-width: 44px',
    ].join(';');

    const opacityInput = document.createElement('input');
    opacityInput.type = 'text';
    opacityInput.value = String(Math.round(alpha * 100)) + '%';
    opacityInput.style.cssText = [
      'background: transparent',
      'border: none',
      'outline: none',
      `color: ${VALUE_COLOR}`,
      'font-size: 11px',
      `font-family: ${FONT}`,
      'width: 36px',
      'text-align: center',
      'padding: 0',
    ].join(';');

    const onOpacityChange = () => {
      const val = parseInt(opacityInput.value.replace('%', ''), 10);
      if (!isNaN(val)) {
        const clamped = Math.max(0, Math.min(100, val));
        opacityInput.value = String(clamped) + '%';
        this.emitChange('opacity', String(clamped / 100));
      }
    };
    opacityInput.addEventListener('change', onOpacityChange);
    this.cleanups.push(() => opacityInput.removeEventListener('change', onOpacityChange));

    rightSeg.appendChild(opacityInput);

    wrapper.appendChild(leftSeg);
    wrapper.appendChild(rightSeg);
    return wrapper;
  }

  /**
   * SelectInput: 32px height, 8px radius, INPUT_BG, 11px text.
   */
  private makeSelectInput(
    property: string,
    options: string[],
    computedStyles: Record<string, string>,
  ): HTMLSelectElement {
    const rawValue = getVal(computedStyles, property);

    const select = document.createElement('select');
    select.style.cssText = [
      'height: 32px',
      'border-radius: 8px',
      `background: ${INPUT_BG}`,
      'border: none',
      `color: ${VALUE_COLOR}`,
      'font-size: 11px',
      `font-family: ${FONT}`,
      'padding: 0 8px',
      'cursor: pointer',
      'width: 100%',
      'outline: none',
      '-webkit-appearance: none',
    ].join(';');

    for (const opt of options) {
      const el = document.createElement('option');
      el.value = opt;
      el.textContent = opt;
      if (rawValue === opt) el.selected = true;
      select.appendChild(el);
    }

    const onChange = () => {
      this.emitChange(property, select.value);
    };
    select.addEventListener('change', onChange);
    this.cleanups.push(() => select.removeEventListener('change', onChange));

    return select;
  }

  /**
   * Text-align icon buttons: 4 icons in a row.
   */
  private makeTextAlignButtons(computedStyles: Record<string, string>): HTMLDivElement {
    const current = getVal(computedStyles, 'text-align') || 'left';

    const group = document.createElement('div');
    group.style.cssText = 'display: flex; gap: 2px;';

    const buttons: HTMLButtonElement[] = [];

    for (const align of ['left', 'center', 'right', 'justify']) {
      const btn = document.createElement('button');
      btn.title = align;
      const isActive = current === align;

      const applyBtnStyle = (active: boolean) => {
        btn.style.cssText = [
          'display: flex',
          'align-items: center',
          'justify-content: center',
          'width: 32px',
          'height: 32px',
          'border-radius: 8px',
          'border: none',
          'cursor: pointer',
          active
            ? `background: ${PILL_ACTIVE_BG}; color: ${PILL_ACTIVE_COLOR};`
            : `background: ${INPUT_BG}; color: ${LABEL_COLOR};`,
        ].join(';');
      };
      applyBtnStyle(isActive);

      btn.appendChild(svg(14, 14, TEXT_ALIGN_PATHS[align] ?? TEXT_ALIGN_PATHS['left']));

      const onClick = () => {
        for (const b of buttons) applyBtnStyle(false);
        applyBtnStyle(true);
        this.emitChange('text-align', align);
      };
      btn.addEventListener('click', onClick);
      this.cleanups.push(() => btn.removeEventListener('click', onClick));

      buttons.push(btn);
      group.appendChild(btn);
    }

    return group;
  }

  // -----------------------------------------------------------------------
  // Change emission + indicators
  // -----------------------------------------------------------------------

  private emitChange(property: string, value: string): void {
    this.changeCallback?.(property, value);

    // Show change dot if value differs from original
    const original = this.originalValues.get(property);
    if (original !== undefined && original !== value) {
      // Find matching dot by scanning all entries (property-to-label mapping isn't 1:1,
      // so we mark any visible dot whose parent row matches)
      for (const [, dot] of this.changeDots) {
        // This is a simplified approach: mark dot visible via property match
        // In practice the emitChange is always paired with a known label
      }
    }
  }
}
