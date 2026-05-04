import type { ImprovMode } from './types';

type ModeCallback = (mode: ImprovMode | null) => void;
type ActionCallback = () => void;

// SVG path data sourced verbatim from Heroicons (stroke-based, 24x24 viewBox)
const MODE_ICONS: Record<string, string> = {
  // Heroicons: arrows-up-down
  manipulate:
    'M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 3L16.5 21m0 0L12 16.5m4.5 4.5V7.5',
  // Heroicons: chat-bubble-left
  prompt:
    'M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z',
  // Heroicons: pencil-square
  annotate:
    'M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10',
  // Heroicons: squares-plus
  layout:
    'M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z',
};

// Heroicons: cog-6-tooth (two paths for outline + inner circle)
const GEAR_ICON_OUTER =
  'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z';
const GEAR_ICON_INNER = 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z';

// Heroicons: arrow-left
const BACK_ARROW_ICON = 'M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18';

const MODE_LABELS: Record<string, string> = {
  manipulate: 'Manipulate',
  prompt: 'Prompt',
  annotate: 'Annotate',
  layout: 'Layout',
};

const MODES: ImprovMode[] = ['manipulate', 'prompt', 'annotate', 'layout'];

const VERBOSITY_OPTIONS = ['compact', 'standard', 'detailed', 'forensic'] as const;

export class Toolbar {
  private el: HTMLDivElement;
  private activeMode: ImprovMode | null = null;

  // Callback registries
  private modeCallbacks: ModeCallback[] = [];
  private applyCallbacks: ActionCallback[] = [];
  private sendToClaudeCallbacks: ActionCallback[] = [];
  private clearAllCallbacks: ActionCallback[] = [];

  // DOM references
  private statusDot: HTMLDivElement;
  private badge: HTMLSpanElement;
  private applyBtn: HTMLButtonElement;
  private sendBtn: HTMLButtonElement;
  private modeButtons = new Map<ImprovMode, HTMLButtonElement>();

  // Panels
  private modePanel: HTMLDivElement;
  private settingsPanel: HTMLDivElement;

  // Settings state
  private verbosity: (typeof VERBOSITY_OPTIONS)[number] = 'standard';

  constructor(shadowRoot: ShadowRoot) {
    // Root container
    this.el = document.createElement('div');
    this.applyStyles(this.el, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '200px',
      display: 'flex',
      flexDirection: 'column',
      background: '#1a1a2e',
      border: '1px solid #333',
      borderRadius: '14px',
      padding: '0',
      boxShadow: '0 12px 48px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.4)',
      backdropFilter: 'blur(12px)',
      pointerEvents: 'all',
      userSelect: 'none',
      zIndex: '2147483647',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflow: 'hidden',
    });

    // -- Header --
    const header = this.buildHeader();
    this.el.appendChild(header);

    // -- Mode panel (default view) --
    this.modePanel = this.buildModePanel();
    this.el.appendChild(this.modePanel);

    // -- Settings panel (hidden by default) --
    this.settingsPanel = this.buildSettingsPanel();
    this.settingsPanel.style.display = 'none';
    this.el.appendChild(this.settingsPanel);

    // -- Divider --
    this.el.appendChild(this.createDivider());

    // -- Action area --
    const actionArea = document.createElement('div');
    this.applyStyles(actionArea, {
      padding: '8px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    });

    // Apply button
    this.applyBtn = document.createElement('button');
    this.applyBtn.textContent = 'Apply';
    this.applyStyles(this.applyBtn, {
      display: 'none',
      width: '100%',
      border: 'none',
      background: '#22c55e',
      color: '#fff',
      fontSize: '12px',
      fontFamily: 'system-ui, sans-serif',
      fontWeight: '600',
      borderRadius: '8px',
      padding: '8px 12px',
      cursor: 'pointer',
      transition: 'background 120ms ease, transform 80ms ease',
    });
    this.addButtonInteraction(this.applyBtn, '#22c55e', '#16a34a');
    this.applyBtn.addEventListener('click', () => {
      this.applyCallbacks.forEach((cb) => cb());
    });
    actionArea.appendChild(this.applyBtn);

    // Send to Claude button
    this.sendBtn = document.createElement('button');
    this.sendBtn.textContent = 'Send to Claude';
    this.applyStyles(this.sendBtn, {
      display: 'none',
      width: '100%',
      border: 'none',
      background: '#3b82f6',
      color: '#fff',
      fontSize: '12px',
      fontFamily: 'system-ui, sans-serif',
      fontWeight: '600',
      borderRadius: '8px',
      padding: '8px 12px',
      cursor: 'pointer',
      transition: 'background 120ms ease, transform 80ms ease',
    });
    this.addButtonInteraction(this.sendBtn, '#3b82f6', '#2563eb');
    this.sendBtn.addEventListener('click', () => {
      this.sendToClaudeCallbacks.forEach((cb) => cb());
    });
    actionArea.appendChild(this.sendBtn);

    this.el.appendChild(actionArea);

    // -- Footer --
    const footer = document.createElement('div');
    this.applyStyles(footer, {
      padding: '4px 10px 8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });

    this.badge = document.createElement('span');
    this.applyStyles(this.badge, {
      display: 'none',
      background: 'rgba(59,130,246,0.2)',
      color: '#93b4f8',
      fontSize: '10px',
      fontFamily: 'system-ui, sans-serif',
      fontWeight: '600',
      borderRadius: '10px',
      padding: '2px 8px',
      lineHeight: '14px',
      fontVariantNumeric: 'tabular-nums',
    });
    footer.appendChild(this.badge);

    this.el.appendChild(footer);

    // Drag behavior (header area only)
    this.initDrag(header);

    // Status dot is created inside buildHeader, referenced there
    // (it's assigned in buildHeader via this.statusDot)

    shadowRoot.appendChild(this.el);
  }

  // ---- Header ----

  private buildHeader(): HTMLDivElement {
    const header = document.createElement('div');
    this.applyStyles(header, {
      display: 'flex',
      alignItems: 'center',
      padding: '10px 10px 6px',
      cursor: 'grab',
      gap: '8px',
    });

    // Label
    const label = document.createElement('span');
    label.textContent = 'IMPROV';
    this.applyStyles(label, {
      fontSize: '10px',
      fontWeight: '700',
      color: '#666',
      letterSpacing: '1.2px',
      textTransform: 'uppercase',
      fontFamily: 'system-ui, sans-serif',
      flex: '1',
    });
    header.appendChild(label);

    // Status dot
    this.statusDot = document.createElement('div');
    this.applyStyles(this.statusDot, {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: '#ef4444',
      flexShrink: '0',
    });
    header.appendChild(this.statusDot);

    // Gear button
    const gearBtn = document.createElement('button');
    this.applyStyles(gearBtn, {
      width: '24px',
      height: '24px',
      border: 'none',
      background: 'transparent',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0',
      color: '#666',
      transition: 'background 120ms ease, color 120ms ease',
      flexShrink: '0',
    });
    gearBtn.appendChild(this.createGearIcon());
    gearBtn.addEventListener('mouseenter', () => {
      gearBtn.style.background = 'rgba(255,255,255,0.07)';
      gearBtn.style.color = '#aaa';
    });
    gearBtn.addEventListener('mouseleave', () => {
      gearBtn.style.background = 'transparent';
      gearBtn.style.color = '#666';
    });
    gearBtn.addEventListener('click', () => {
      this.toggleSettings(true);
    });
    header.appendChild(gearBtn);

    return header;
  }

  // ---- Mode Panel ----

  private buildModePanel(): HTMLDivElement {
    const panel = document.createElement('div');
    this.applyStyles(panel, {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      padding: '0 6px',
    });

    for (const mode of MODES) {
      const btn = this.createModeButton(mode);
      this.modeButtons.set(mode, btn);
      panel.appendChild(btn);
    }

    return panel;
  }

  private createModeButton(mode: ImprovMode): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.dataset['mode'] = mode;
    this.applyStyles(btn, {
      width: '100%',
      height: '32px',
      border: 'none',
      background: 'transparent',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '0 10px',
      transition: 'background 120ms ease, transform 80ms ease',
      color: '#aaa',
    });

    // Icon
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.style.flexShrink = '0';

    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', MODE_ICONS[mode]);
    svg.appendChild(pathEl);
    btn.appendChild(svg);

    // Label text
    const labelSpan = document.createElement('span');
    labelSpan.textContent = MODE_LABELS[mode];
    this.applyStyles(labelSpan, {
      fontSize: '12px',
      fontWeight: '500',
      fontFamily: 'system-ui, sans-serif',
      lineHeight: '1',
    });
    btn.appendChild(labelSpan);

    // Click handler
    btn.addEventListener('click', () => {
      const next = this.activeMode === mode ? null : mode;
      this.setActiveMode(next);
      this.modeCallbacks.forEach((cb) => cb(next));
    });

    // Hover
    btn.addEventListener('mouseenter', () => {
      if (this.activeMode !== mode) {
        btn.style.background = 'rgba(255,255,255,0.05)';
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (this.activeMode !== mode) {
        btn.style.background = 'transparent';
      }
    });

    // Press
    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'scale(0.96)';
    });
    btn.addEventListener('mouseup', () => {
      btn.style.transform = '';
    });

    return btn;
  }

  // ---- Settings Panel ----

  private buildSettingsPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    this.applyStyles(panel, {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      padding: '0 10px 6px',
    });

    // Back button row
    const backRow = document.createElement('div');
    this.applyStyles(backRow, {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    });

    const backBtn = document.createElement('button');
    this.applyStyles(backBtn, {
      width: '24px',
      height: '24px',
      border: 'none',
      background: 'transparent',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0',
      color: '#aaa',
      transition: 'background 120ms ease',
    });
    backBtn.appendChild(this.createBackIcon());
    backBtn.addEventListener('mouseenter', () => {
      backBtn.style.background = 'rgba(255,255,255,0.07)';
    });
    backBtn.addEventListener('mouseleave', () => {
      backBtn.style.background = 'transparent';
    });
    backBtn.addEventListener('click', () => {
      this.toggleSettings(false);
    });
    backRow.appendChild(backBtn);

    const backLabel = document.createElement('span');
    backLabel.textContent = 'Settings';
    this.applyStyles(backLabel, {
      fontSize: '11px',
      fontWeight: '600',
      color: '#999',
      fontFamily: 'system-ui, sans-serif',
    });
    backRow.appendChild(backLabel);

    panel.appendChild(backRow);

    // Verbosity selector
    panel.appendChild(this.buildSettingsSection('Verbosity', () => {
      const select = document.createElement('select');
      this.applyStyles(select, {
        width: '100%',
        background: '#252540',
        color: '#ccc',
        border: '1px solid #444',
        borderRadius: '6px',
        padding: '4px 6px',
        fontSize: '11px',
        fontFamily: 'system-ui, sans-serif',
        outline: 'none',
        cursor: 'pointer',
      });

      for (const opt of VERBOSITY_OPTIONS) {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
        if (opt === this.verbosity) {
          option.selected = true;
        }
        select.appendChild(option);
      }

      select.addEventListener('change', () => {
        this.verbosity = select.value as (typeof VERBOSITY_OPTIONS)[number];
      });

      return select;
    }));

    // Theme (static for now)
    panel.appendChild(this.buildSettingsSection('Theme', () => {
      const themeLabel = document.createElement('span');
      themeLabel.textContent = 'Dark';
      this.applyStyles(themeLabel, {
        fontSize: '11px',
        color: '#888',
        fontFamily: 'system-ui, sans-serif',
      });
      return themeLabel;
    }));

    // Connection info
    panel.appendChild(this.buildSettingsSection('Connection', () => {
      const infoBlock = document.createElement('div');
      this.applyStyles(infoBlock, {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      });

      const items = [
        { key: 'Server', value: 'localhost' },
        { key: 'Port', value: '3901' },
        { key: 'ID', value: '--' },
      ];

      for (const item of items) {
        const row = document.createElement('div');
        this.applyStyles(row, {
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          fontFamily: 'system-ui, sans-serif',
        });

        const keySpan = document.createElement('span');
        keySpan.textContent = item.key;
        keySpan.style.color = '#666';
        row.appendChild(keySpan);

        const valSpan = document.createElement('span');
        valSpan.textContent = item.value;
        valSpan.style.color = '#999';
        valSpan.style.fontVariantNumeric = 'tabular-nums';
        row.appendChild(valSpan);

        infoBlock.appendChild(row);
      }

      return infoBlock;
    }));

    // Project info
    panel.appendChild(this.buildSettingsSection('Project', () => {
      const infoBlock = document.createElement('div');
      this.applyStyles(infoBlock, {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      });

      const items = [
        { key: 'Stack', value: 'detecting...' },
        { key: '.improv', value: 'none' },
      ];

      for (const item of items) {
        const row = document.createElement('div');
        this.applyStyles(row, {
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          fontFamily: 'system-ui, sans-serif',
        });

        const keySpan = document.createElement('span');
        keySpan.textContent = item.key;
        keySpan.style.color = '#666';
        row.appendChild(keySpan);

        const valSpan = document.createElement('span');
        valSpan.textContent = item.value;
        valSpan.style.color = '#999';
        row.appendChild(valSpan);

        infoBlock.appendChild(row);
      }

      return infoBlock;
    }));

    // Clear All button
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear All';
    this.applyStyles(clearBtn, {
      width: '100%',
      border: '1px solid #552222',
      background: 'rgba(239,68,68,0.1)',
      color: '#ef4444',
      fontSize: '11px',
      fontFamily: 'system-ui, sans-serif',
      fontWeight: '600',
      borderRadius: '8px',
      padding: '6px 12px',
      cursor: 'pointer',
      transition: 'background 120ms ease, transform 80ms ease',
      marginTop: '2px',
    });
    clearBtn.addEventListener('mouseenter', () => {
      clearBtn.style.background = 'rgba(239,68,68,0.2)';
    });
    clearBtn.addEventListener('mouseleave', () => {
      clearBtn.style.background = 'rgba(239,68,68,0.1)';
    });
    clearBtn.addEventListener('mousedown', () => {
      clearBtn.style.transform = 'scale(0.96)';
    });
    clearBtn.addEventListener('mouseup', () => {
      clearBtn.style.transform = '';
    });
    clearBtn.addEventListener('click', () => {
      this.clearAllCallbacks.forEach((cb) => cb());
    });
    panel.appendChild(clearBtn);

    return panel;
  }

  private buildSettingsSection(
    title: string,
    buildContent: () => HTMLElement,
  ): HTMLDivElement {
    const section = document.createElement('div');
    this.applyStyles(section, {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    });

    const heading = document.createElement('span');
    heading.textContent = title;
    this.applyStyles(heading, {
      fontSize: '10px',
      fontWeight: '600',
      color: '#555',
      textTransform: 'uppercase',
      letterSpacing: '0.8px',
      fontFamily: 'system-ui, sans-serif',
    });
    section.appendChild(heading);

    section.appendChild(buildContent());

    return section;
  }

  private toggleSettings(show: boolean): void {
    if (show) {
      this.modePanel.style.display = 'none';
      this.settingsPanel.style.display = 'flex';
    } else {
      this.settingsPanel.style.display = 'none';
      this.modePanel.style.display = 'flex';
    }
  }

  // ---- SVG Icon Helpers ----

  private createGearIcon(): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    const outerPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    outerPath.setAttribute('d', GEAR_ICON_OUTER);
    svg.appendChild(outerPath);

    const innerPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    innerPath.setAttribute('d', GEAR_ICON_INNER);
    svg.appendChild(innerPath);

    return svg;
  }

  private createBackIcon(): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', BACK_ARROW_ICON);
    svg.appendChild(pathEl);

    return svg;
  }

  // ---- Utility Helpers ----

  private createDivider(): HTMLDivElement {
    const divider = document.createElement('div');
    this.applyStyles(divider, {
      height: '1px',
      background: '#333',
      margin: '4px 10px',
      flexShrink: '0',
    });
    return divider;
  }

  private applyStyles(el: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
    for (const [key, value] of Object.entries(styles)) {
      if (value !== undefined) {
        (el.style as Record<string, string>)[key] = value;
      }
    }
  }

  private addButtonInteraction(
    btn: HTMLButtonElement,
    normalBg: string,
    hoverBg: string,
  ): void {
    btn.addEventListener('mouseenter', () => {
      btn.style.background = hoverBg;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = normalBg;
    });
    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'scale(0.96)';
    });
    btn.addEventListener('mouseup', () => {
      btn.style.transform = '';
    });
  }

  // ---- Drag ----

  private initDrag(dragHandle: HTMLElement): void {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let origRight = 20;
    let origBottom = 20;

    dragHandle.addEventListener('mousedown', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button')) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origRight = parseInt(this.el.style.right || '20', 10);
      origBottom = parseInt(this.el.style.bottom || '20', 10);
      dragHandle.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      this.el.style.right = `${origRight - dx}px`;
      this.el.style.bottom = `${origBottom - dy}px`;
    });

    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        dragHandle.style.cursor = 'grab';
      }
    });
  }

  // ---- Public API ----

  setActiveMode(mode: ImprovMode | null): void {
    this.activeMode = mode;
    this.modeButtons.forEach((btn, m) => {
      if (m === mode) {
        btn.style.background = 'rgba(59,130,246,0.2)';
        btn.style.color = '#6dacfc';
      } else {
        btn.style.background = 'transparent';
        btn.style.color = '#aaa';
      }
    });

    // Show Send to Claude in annotate/prompt modes
    const showSend = mode === 'annotate' || mode === 'prompt';
    this.sendBtn.style.display = showSend ? 'block' : 'none';
  }

  getActiveMode(): ImprovMode | null {
    return this.activeMode;
  }

  onMode(callback: ModeCallback): void {
    this.modeCallbacks.push(callback);
  }

  onApply(callback: ActionCallback): void {
    this.applyCallbacks.push(callback);
  }

  onSendToClaude(callback: ActionCallback): void {
    this.sendToClaudeCallbacks.push(callback);
  }

  onClearAll(callback: ActionCallback): void {
    this.clearAllCallbacks.push(callback);
  }

  showSendButton(visible: boolean): void {
    this.sendBtn.style.display = visible ? 'block' : 'none';
  }

  setConnected(connected: boolean): void {
    this.statusDot.style.background = connected ? '#22c55e' : '#ef4444';
  }

  setBadge(count: number): void {
    if (count > 0) {
      this.badge.style.display = 'inline-block';
      this.badge.textContent = `${count} pending`;
      this.applyBtn.style.display = 'block';
      this.applyBtn.textContent = `Apply (${count})`;
    } else {
      this.badge.style.display = 'none';
      this.badge.textContent = '';
      this.applyBtn.style.display = 'none';
    }
  }

  destroy(): void {
    this.el.remove();
  }
}
