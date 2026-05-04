import { DetectedControls, ControlDefinition } from './control-detector.js';
import { attachScrub, parseNumericValue, formatNumericValue } from './scrub.js';

type PropertyChangeCallback = (property: string, value: string) => void;

function rgbToHex(rgb: string): string {
  const match = rgb.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (!match) return '#000000';
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
}

export class PropertyPanel {
  private shadow: ShadowRoot;
  private container: HTMLDivElement;
  private cleanups: Array<() => void> = [];
  private changeCallback: PropertyChangeCallback | null = null;

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
      'width: 240px',
      'max-height: 80vh',
      'overflow-y: auto',
      'background: #1a1a2e',
      'border: 1px solid #333',
      'border-radius: 10px',
      'box-shadow: 0 8px 32px rgba(0,0,0,0.4)',
      'pointer-events: auto',
      'font-size: 12px',
      'font-family: system-ui, sans-serif',
      'color: #ccc',
      'z-index: 2147483647',
    ].join(';');
  }

  render(controls: DetectedControls, computedStyles: Record<string, string>): void {
    // Clear previous content and all scrub cleanups
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups = [];
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    for (const group of controls.groups) {
      const section = document.createElement('div');
      section.style.cssText = 'padding: 10px 12px 4px;';

      const label = document.createElement('div');
      label.textContent = group.name.toUpperCase();
      label.style.cssText = [
        'font-size: 10px',
        'color: #666',
        'font-weight: bold',
        'letter-spacing: 0.06em',
        'margin-bottom: 6px',
      ].join(';');
      section.appendChild(label);

      for (const control of group.controls) {
        const row = this.buildControlRow(control, computedStyles);
        if (row) {
          section.appendChild(row);
        }
      }

      this.container.appendChild(section);
    }
  }

  private buildControlRow(
    control: ControlDefinition,
    computedStyles: Record<string, string>,
  ): HTMLDivElement | null {
    const camelProp = control.property.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    const rawValue = computedStyles[camelProp] ?? computedStyles[control.property] ?? '';

    const row = document.createElement('div');
    row.style.cssText = [
      'display: flex',
      'align-items: center',
      'justify-content: space-between',
      'padding: 3px 0',
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
            const formatted = formatNumericValue(val, unit);
            valueSpan.textContent = formatted;
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
      const input = document.createElement('input');
      input.type = 'color';
      input.value = rawValue.startsWith('rgb') ? rgbToHex(rawValue) : rawValue || '#000000';
      input.style.cssText = [
        'width: 32px',
        'height: 20px',
        'border: none',
        'border-radius: 4px',
        'cursor: pointer',
        'padding: 0',
        'background: none',
      ].join(';');

      const onInput = () => {
        this.changeCallback?.(control.property, input.value);
      };
      input.addEventListener('input', onInput);
      this.cleanups.push(() => input.removeEventListener('input', onInput));

      row.appendChild(input);
    } else if (control.type === 'select') {
      const select = document.createElement('select');
      select.style.cssText = [
        'background: #222',
        'color: #ccc',
        'border: 1px solid #444',
        'border-radius: 4px',
        'font-size: 11px',
        'padding: 1px 4px',
        'cursor: pointer',
        'max-width: 120px',
      ].join(';');

      for (const option of control.options ?? []) {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        if (rawValue === option) {
          opt.selected = true;
        }
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

  show(): void {
    this.container.style.display = '';
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  destroy(): void {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups = [];
    this.changeCallback = null;
    if (this.shadow.contains(this.container)) {
      this.shadow.removeChild(this.container);
    }
  }
}
