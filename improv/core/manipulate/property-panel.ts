import { DetectedControls, ControlDefinition, ControlGroup } from './control-detector.js';
import { attachScrub, parseNumericValue, formatNumericValue } from './scrub.js';
import { BoxModel } from './box-model.js';
import { StateToggle } from './state-toggle.js';

type PropertyChangeCallback = (property: string, value: string) => void;

function rgbToHex(rgb: string): string {
  const match = rgb.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (!match) return '#000000';
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
}

function parseColor(val: string): string {
  if (!val || val === 'transparent') return '#000000';
  if (val.startsWith('rgb')) return rgbToHex(val);
  if (val.startsWith('#')) return val;
  return '#000000';
}

// Chevron SVG - down when open, right when closed
function makeChevron(open: boolean): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.style.cssText = `transition: transform 0.15s; transform: rotate(${open ? 0 : -90}deg); flex-shrink: 0;`;

  const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  poly.setAttribute('points', '6 9 12 15 18 9');
  svg.appendChild(poly);
  return svg;
}

// Text-align icon paths (Heroicons-style, verbatim)
const TEXT_ALIGN_ICONS: Record<string, string> = {
  left: 'M3 6h18M3 10h12M3 14h18M3 18h12',
  center: 'M3 6h18M6 10h12M3 14h18M6 18h12',
  right: 'M3 6h18M9 10h12M3 14h18M9 18h12',
  justify: 'M3 6h18M3 10h18M3 14h18M3 18h18',
};

function makeAlignIcon(align: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', TEXT_ALIGN_ICONS[align] ?? TEXT_ALIGN_ICONS['left']);
  svg.appendChild(path);
  return svg;
}

const SECTION_ORDER: ControlGroup[] = ['box', 'typography', 'flex', 'grid', 'image', 'position'];
const SECTION_LABELS: Record<ControlGroup, string> = {
  box: 'Box',
  typography: 'Typography',
  flex: 'Flex',
  grid: 'Grid',
  image: 'Image',
  position: 'Position',
};

export class PropertyPanel {
  private shadow: ShadowRoot;
  private container: HTMLDivElement;
  private cleanups: Array<() => void> = [];
  private changeCallback: PropertyChangeCallback | null = null;
  private boxModel: BoxModel | null = null;
  private stateToggle: StateToggle | null = null;

  constructor(shadow: ShadowRoot) {
    this.shadow = shadow;
    this.container = document.createElement('div');
    this.applyContainerStyles();
    this.shadow.appendChild(this.container);
  }

  private applyContainerStyles(): void {
    this.container.style.cssText = [
      'position: fixed',
      'top: 20px',
      'right: 20px',
      'width: 260px',
      'max-height: 70vh',
      'overflow-y: auto',
      'background: rgba(18, 18, 30, 0.96)',
      'border: 1px solid rgba(255,255,255,0.08)',
      'border-radius: 12px',
      'box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
      'pointer-events: auto',
      'font-size: 12px',
      'font-family: system-ui, sans-serif',
      'color: #ccc',
      'z-index: 2147483647',
      'backdrop-filter: blur(12px)',
      '-webkit-backdrop-filter: blur(12px)',
    ].join(';');

    // Scrollbar styling via a style element inside shadow
    const style = document.createElement('style');
    style.textContent = `
      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
    `;
    this.container.appendChild(style);
  }

  render(controls: DetectedControls, computedStyles: Record<string, string>): void {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];

    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    // Re-apply scrollbar style after clearing
    const style = document.createElement('style');
    style.textContent = `
      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
    `;
    this.container.appendChild(style);

    // State toggle row at the top
    this.stateToggle = new StateToggle();
    this.container.appendChild(this.stateToggle.render());

    // Build group map for ordered rendering
    const groupMap = new Map<ControlGroup, ControlDefinition[]>();
    for (const group of controls.groups) {
      groupMap.set(group.name, group.controls);
    }

    for (const groupName of SECTION_ORDER) {
      if (!groupMap.has(groupName)) continue;
      const groupControls = groupMap.get(groupName)!;
      const section = this.buildSection(groupName, groupControls, computedStyles);
      this.container.appendChild(section);
    }
  }

  private buildSection(
    name: ControlGroup,
    controls: ControlDefinition[],
    computedStyles: Record<string, string>,
  ): HTMLDivElement {
    const isBox = name === 'box';
    const isOpen = isBox; // box expanded by default, others collapsed

    const section = document.createElement('div');
    section.style.cssText = 'border-bottom: 1px solid rgba(255,255,255,0.05);';

    // Header
    const header = document.createElement('div');
    header.style.cssText = [
      'display: flex',
      'align-items: center',
      'justify-content: space-between',
      'padding: 8px 12px',
      'cursor: pointer',
      'user-select: none',
    ].join(';');

    const headerLabel = document.createElement('span');
    headerLabel.textContent = SECTION_LABELS[name];
    headerLabel.style.cssText = [
      'font-size: 11px',
      'font-weight: 600',
      'color: #999',
      'letter-spacing: 0.04em',
      'text-transform: uppercase',
    ].join(';');

    const chevron = makeChevron(isOpen);
    chevron.style.color = '#555';

    header.appendChild(headerLabel);
    header.appendChild(chevron);

    // Body
    const body = document.createElement('div');
    body.style.cssText = [
      'overflow: hidden',
      `display: ${isOpen ? 'block' : 'none'}`,
      'padding: 4px 12px 10px',
    ].join(';');

    if (isBox) {
      this.buildBoxSection(body, controls, computedStyles);
    } else if (name === 'typography') {
      this.buildTypographySection(body, controls, computedStyles);
    } else {
      for (const control of controls) {
        const row = this.buildControlRow(control, computedStyles);
        if (row) body.appendChild(row);
      }
    }

    // Toggle open/close
    const onHeaderClick = () => {
      const open = body.style.display === 'none';
      body.style.display = open ? 'block' : 'none';
      chevron.style.transform = `rotate(${open ? 0 : -90}deg)`;
    };
    header.addEventListener('click', onHeaderClick);
    this.cleanups.push(() => header.removeEventListener('click', onHeaderClick));

    section.appendChild(header);
    section.appendChild(body);
    return section;
  }

  private buildBoxSection(
    body: HTMLDivElement,
    controls: ControlDefinition[],
    computedStyles: Record<string, string>,
  ): void {
    // Box model diagram
    this.boxModel = new BoxModel();
    const diagram = this.boxModel.render(computedStyles);
    body.appendChild(diagram);

    // Border radius - 4 corner inputs
    const radiusLabel = this.makeSectionSubLabel('Border Radius');
    body.appendChild(radiusLabel);

    const radiusGrid = document.createElement('div');
    radiusGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px;';

    const radiusProps = [
      { property: 'border-top-left-radius', label: 'TL' },
      { property: 'border-top-right-radius', label: 'TR' },
      { property: 'border-bottom-left-radius', label: 'BL' },
      { property: 'border-bottom-right-radius', label: 'BR' },
    ];

    for (const rp of radiusProps) {
      const cell = this.buildCompactNumber(rp.property, rp.label, computedStyles);
      if (cell) radiusGrid.appendChild(cell);
    }
    body.appendChild(radiusGrid);

    // Background color
    const bgColorControl = controls.find((c) => c.property === 'background-color');
    if (bgColorControl) {
      const row = this.buildColorRow(bgColorControl, computedStyles);
      if (row) body.appendChild(row);
    }

    // Opacity as slider
    const opacityControl = controls.find((c) => c.property === 'opacity');
    if (opacityControl) {
      body.appendChild(this.buildOpacityRow(opacityControl, computedStyles));
    }

    // Shadow as scrubable text
    const shadowControl = controls.find((c) => c.property === 'box-shadow');
    if (shadowControl) {
      const row = this.buildTextRow(shadowControl, computedStyles);
      if (row) body.appendChild(row);
    }

    // Z-index
    const zControl = controls.find((c) => c.property === 'z-index');
    if (zControl) {
      const row = this.buildControlRow(zControl, computedStyles);
      if (row) body.appendChild(row);
    }
  }

  private buildTypographySection(
    body: HTMLDivElement,
    controls: ControlDefinition[],
    computedStyles: Record<string, string>,
  ): void {
    for (const control of controls) {
      if (control.property === 'color') {
        const row = this.buildColorRow(control, computedStyles);
        if (row) body.appendChild(row);
      } else if (control.property === 'text-align') {
        body.appendChild(this.buildTextAlignRow(control, computedStyles));
      } else {
        const row = this.buildControlRow(control, computedStyles);
        if (row) body.appendChild(row);
      }
    }
  }

  private makeSectionSubLabel(text: string): HTMLDivElement {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = [
      'font-size: 9px',
      'color: #555',
      'font-weight: 600',
      'letter-spacing: 0.06em',
      'text-transform: uppercase',
      'margin: 4px 0 4px',
    ].join(';');
    return el;
  }

  private buildCompactNumber(
    property: string,
    label: string,
    computedStyles: Record<string, string>,
  ): HTMLDivElement | null {
    const camel = property.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    const rawValue = computedStyles[camel] ?? computedStyles[property] ?? '';
    const parsed = parseNumericValue(rawValue);

    const cell = document.createElement('div');
    cell.style.cssText = [
      'display: flex',
      'align-items: center',
      'gap: 4px',
      'background: rgba(255,255,255,0.04)',
      'border-radius: 5px',
      'padding: 3px 6px',
    ].join(';');

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = 'font-size: 9px; color: #555; font-weight: 600; flex-shrink: 0;';

    const valueEl = document.createElement('span');
    valueEl.textContent = rawValue || '0';
    valueEl.style.cssText = [
      'font-variant-numeric: tabular-nums',
      'font-size: 11px',
      'color: #ddd',
      'cursor: ew-resize',
      'user-select: none',
      'margin-left: auto',
    ].join(';');

    if (parsed !== null) {
      const unit = parsed.unit || 'px';
      const cleanup = attachScrub(valueEl, {
        initialValue: parsed.number,
        step: 1,
        onUpdate: (val) => {
          valueEl.textContent = formatNumericValue(Math.max(0, val), unit);
        },
        onCommit: (val) => {
          const formatted = formatNumericValue(Math.max(0, val), unit);
          valueEl.textContent = formatted;
          this.changeCallback?.(property, formatted);
        },
      });
      this.cleanups.push(cleanup);
    }

    cell.appendChild(labelEl);
    cell.appendChild(valueEl);
    return cell;
  }

  private buildColorRow(
    control: ControlDefinition,
    computedStyles: Record<string, string>,
  ): HTMLDivElement | null {
    const camel = control.property.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    const rawValue = computedStyles[camel] ?? computedStyles[control.property] ?? '';
    const hexValue = parseColor(rawValue);

    const row = document.createElement('div');
    row.style.cssText = [
      'display: flex',
      'align-items: center',
      'justify-content: space-between',
      'padding: 4px 0',
      'gap: 8px',
    ].join(';');

    const labelSpan = document.createElement('span');
    labelSpan.textContent = control.label;
    labelSpan.style.cssText = 'color: #999; font-size: 11px; flex-shrink: 0;';
    row.appendChild(labelSpan);

    const right = document.createElement('div');
    right.style.cssText = 'display: flex; align-items: center; gap: 5px;';

    // Color swatch
    const swatch = document.createElement('div');
    swatch.style.cssText = [
      'width: 20px',
      'height: 20px',
      'border-radius: 4px',
      `background: ${hexValue}`,
      'border: 1px solid rgba(255,255,255,0.1)',
      'cursor: pointer',
      'flex-shrink: 0',
      'position: relative',
      'overflow: hidden',
    ].join(';');

    // Hidden color input triggered by swatch click
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

    const onColorInput = () => {
      swatch.style.background = colorInput.value;
      hexText.value = colorInput.value;
      this.changeCallback?.(control.property, colorInput.value);
    };
    colorInput.addEventListener('input', onColorInput);
    this.cleanups.push(() => colorInput.removeEventListener('input', onColorInput));
    swatch.appendChild(colorInput);

    // Hex text input
    const hexText = document.createElement('input');
    hexText.type = 'text';
    hexText.value = hexValue;
    hexText.style.cssText = [
      'background: rgba(255,255,255,0.05)',
      'border: 1px solid rgba(255,255,255,0.1)',
      'border-radius: 4px',
      'color: #ddd',
      'font-size: 11px',
      'font-family: monospace',
      'padding: 2px 5px',
      'width: 70px',
      'text-align: center',
    ].join(';');

    const onHexChange = () => {
      const val = hexText.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        swatch.style.background = val;
        colorInput.value = val;
        this.changeCallback?.(control.property, val);
      }
    };
    hexText.addEventListener('change', onHexChange);
    this.cleanups.push(() => hexText.removeEventListener('change', onHexChange));

    right.appendChild(swatch);
    right.appendChild(hexText);
    row.appendChild(right);
    return row;
  }

  private buildOpacityRow(
    control: ControlDefinition,
    computedStyles: Record<string, string>,
  ): HTMLDivElement {
    const camel = control.property.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    const rawValue = computedStyles[camel] ?? computedStyles[control.property] ?? '1';
    const numVal = parseFloat(rawValue);

    const row = document.createElement('div');
    row.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 4px 0;';

    const labelSpan = document.createElement('span');
    labelSpan.textContent = 'Opacity';
    labelSpan.style.cssText = 'color: #999; font-size: 11px; flex-shrink: 0; min-width: 48px;';
    row.appendChild(labelSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.01';
    slider.value = String(isNaN(numVal) ? 1 : numVal);
    slider.style.cssText = [
      'flex: 1',
      'height: 3px',
      'accent-color: #3b82f6',
      'cursor: pointer',
    ].join(';');

    const valueLabel = document.createElement('span');
    valueLabel.textContent = String(Math.round((isNaN(numVal) ? 1 : numVal) * 100) + '%');
    valueLabel.style.cssText = 'font-size: 11px; color: #ddd; font-variant-numeric: tabular-nums; min-width: 32px; text-align: right;';

    const onSlider = () => {
      const val = parseFloat(slider.value);
      valueLabel.textContent = `${Math.round(val * 100)}%`;
      this.changeCallback?.(control.property, String(val));
    };
    slider.addEventListener('input', onSlider);
    this.cleanups.push(() => slider.removeEventListener('input', onSlider));

    row.appendChild(slider);
    row.appendChild(valueLabel);
    return row;
  }

  private buildTextAlignRow(
    control: ControlDefinition,
    computedStyles: Record<string, string>,
  ): HTMLDivElement {
    const camel = control.property.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    const currentValue = computedStyles[camel] ?? computedStyles[control.property] ?? 'left';

    const row = document.createElement('div');
    row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 4px 0;';

    const labelSpan = document.createElement('span');
    labelSpan.textContent = 'Align';
    labelSpan.style.cssText = 'color: #999; font-size: 11px; flex-shrink: 0;';
    row.appendChild(labelSpan);

    const buttonGroup = document.createElement('div');
    buttonGroup.style.cssText = 'display: flex; gap: 2px;';

    for (const align of ['left', 'center', 'right', 'justify']) {
      const btn = document.createElement('button');
      btn.title = align;
      const isActive = currentValue === align;
      btn.style.cssText = [
        'display: flex',
        'align-items: center',
        'justify-content: center',
        'width: 26px',
        'height: 22px',
        'border-radius: 4px',
        'border: none',
        'cursor: pointer',
        isActive ? 'background: #3b82f6; color: #fff;' : 'background: rgba(255,255,255,0.05); color: #888;',
      ].join(';');

      btn.appendChild(makeAlignIcon(align));

      const onClick = () => {
        // Deactivate all
        for (const child of buttonGroup.children) {
          (child as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
          (child as HTMLButtonElement).style.color = '#888';
        }
        btn.style.background = '#3b82f6';
        btn.style.color = '#fff';
        this.changeCallback?.(control.property, align);
      };
      btn.addEventListener('click', onClick);
      this.cleanups.push(() => btn.removeEventListener('click', onClick));
      buttonGroup.appendChild(btn);
    }

    row.appendChild(buttonGroup);
    return row;
  }

  private buildTextRow(
    control: ControlDefinition,
    computedStyles: Record<string, string>,
  ): HTMLDivElement | null {
    const camel = control.property.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    const rawValue = computedStyles[camel] ?? computedStyles[control.property] ?? '';

    const row = document.createElement('div');
    row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 4px 0; gap: 8px;';

    const labelSpan = document.createElement('span');
    labelSpan.textContent = control.label;
    labelSpan.style.cssText = 'color: #999; font-size: 11px; flex-shrink: 0;';
    row.appendChild(labelSpan);

    const valueSpan = document.createElement('span');
    valueSpan.textContent = rawValue || 'none';
    valueSpan.style.cssText = [
      'font-size: 10px',
      'color: #777',
      'max-width: 140px',
      'overflow: hidden',
      'text-overflow: ellipsis',
      'white-space: nowrap',
      'text-align: right',
    ].join(';');

    row.appendChild(valueSpan);
    return row;
  }

  private buildControlRow(
    control: ControlDefinition,
    computedStyles: Record<string, string>,
  ): HTMLDivElement | null {
    const camel = control.property.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    const rawValue = computedStyles[camel] ?? computedStyles[control.property] ?? '';

    const row = document.createElement('div');
    row.style.cssText = [
      'display: flex',
      'align-items: center',
      'justify-content: space-between',
      'padding: 4px 0',
      'gap: 8px',
    ].join(';');

    const labelSpan = document.createElement('span');
    labelSpan.textContent = control.label;
    labelSpan.style.cssText = 'color: #999; font-size: 11px; flex-shrink: 0;';
    row.appendChild(labelSpan);

    if (control.type === 'number') {
      const valueSpan = document.createElement('span');
      valueSpan.textContent = rawValue || '0';
      valueSpan.style.cssText = [
        'font-variant-numeric: tabular-nums',
        'font-size: 11px',
        'min-width: 50px',
        'text-align: right',
        'cursor: ew-resize',
        'color: #ddd',
        'user-select: none',
      ].join(';');

      const parsed = parseNumericValue(rawValue);
      if (parsed !== null) {
        const unit = parsed.unit || (control.unit ?? '');
        const step = control.step ?? 1;

        const cleanup = attachScrub(valueSpan, {
          initialValue: parsed.number,
          step,
          onUpdate: (val) => {
            valueSpan.textContent = formatNumericValue(val, unit);
          },
          onCommit: (val) => {
            const formatted = formatNumericValue(val, unit);
            valueSpan.textContent = formatted;
            this.changeCallback?.(control.property, formatted);
          },
        });
        this.cleanups.push(cleanup);
      }

      row.appendChild(valueSpan);
    } else if (control.type === 'color') {
      return this.buildColorRow(control, computedStyles);
    } else if (control.type === 'select') {
      const select = document.createElement('select');
      select.style.cssText = [
        'background: #2a2a3e',
        'color: #e0e0e0',
        'border: 1px solid #444',
        'border-radius: 5px',
        'font-size: 11px',
        'font-family: system-ui, sans-serif',
        'padding: 2px 6px',
        'cursor: pointer',
        'max-width: 130px',
      ].join(';');

      for (const option of control.options ?? []) {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        if (rawValue === option) opt.selected = true;
        select.appendChild(opt);
      }

      const onChange = () => {
        this.changeCallback?.(control.property, select.value);
      };
      select.addEventListener('change', onChange);
      this.cleanups.push(() => select.removeEventListener('change', onChange));
      row.appendChild(select);
    } else {
      return null;
    }

    return row;
  }

  onPropertyChange(callback: PropertyChangeCallback): void {
    this.changeCallback = callback;
  }

  updateComputedStyles(computedStyles: Record<string, string>): void {
    if (this.boxModel) {
      this.boxModel.update(computedStyles);
    }
  }

  show(): void {
    this.container.style.display = '';
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  destroy(): void {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
    this.changeCallback = null;
    this.boxModel = null;
    if (this.stateToggle) {
      this.stateToggle.destroy();
      this.stateToggle = null;
    }
    if (this.shadow.contains(this.container)) {
      this.shadow.removeChild(this.container);
    }
  }
}
