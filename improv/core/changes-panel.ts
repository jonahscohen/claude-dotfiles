interface ChangeEntry {
  promptId: string;
  summary: string;
  filesChanged: string[];
  changes: Array<{ selector: string; property: string; oldValue: string; newValue: string }>;
  status: 'completed' | 'needsInfo' | 'failed';
  question?: string;
  reviewed: boolean;
}

type ReplyCallback = (promptId: string, text: string) => void;

export class ChangesPanel {
  private container: HTMLDivElement;
  private listEl: HTMLDivElement;
  private bottomBar: HTMLDivElement;
  private shadowRoot: ShadowRoot;
  private visible = false;
  private focusedIndex = -1;
  private entries: ChangeEntry[] = [];
  private filteredEntries: ChangeEntry[] = [];
  private onReplyCallback: ReplyCallback | null = null;
  private onDoneCallback: ((promptId: string) => void) | null = null;
  private onRevertCallback: ((promptId: string, changes: any[]) => void) | null = null;
  private onPreviewToggleCallback: ((promptId: string, changes: any[], showOld: boolean) => void) | null = null;
  private onClearReviewedCallback: (() => void) | null = null;
  private onSelectCallback: ((selectors: string[]) => void) | null = null;
  private _clearReviewedBtn: HTMLButtonElement | null = null;
  private revertedPrompts = new Set<string>();
  private expandedPrompts = new Set<string>();
  private previewingPrompts = new Set<string>();
  private getMarkerColor: () => string;
  private boundKeydown: (e: KeyboardEvent) => void;

  constructor(shadowRoot: ShadowRoot, getMarkerColor: () => string) {
    this.shadowRoot = shadowRoot;
    this.getMarkerColor = getMarkerColor;

    this.container = document.createElement('div');
    this.container.setAttribute('role', 'dialog');
    this.container.setAttribute('aria-label', 'Changes from Claude');
    this.container.style.cssText =
      'position:fixed;bottom:68px;left:20px;width:360px;max-height:480px;' +
      'background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);border-radius:16px;' +
      'box-shadow:0 8px 32px rgba(0,0,0,0.5);display:none;flex-direction:column;' +
      'z-index:2147483647;pointer-events:all;font-family:system-ui,-apple-system,sans-serif;' +
      'overflow:hidden;opacity:0;transform:translateY(8px);' +
      'transition:opacity 200ms ease,transform 200ms ease';

    const header = document.createElement('div');
    header.style.cssText =
      'padding:14px 16px 10px;border-bottom:1px solid rgba(255,255,255,0.1);' +
      'display:flex;align-items:center;justify-content:space-between;flex-shrink:0';

    const titleWrap = document.createElement('div');
    titleWrap.style.cssText = 'display:flex;align-items:center;gap:8px';
    const title = document.createElement('span');
    title.id = 'improv-changes-title';
    title.textContent = 'Changes';
    title.style.cssText = 'font-size:13px;font-weight:600;color:rgba(255,255,255,0.85)';
    titleWrap.appendChild(title);
    header.appendChild(titleWrap);
    this.container.setAttribute('aria-labelledby', 'improv-changes-title');

    const closeBtn = document.createElement('button');
    closeBtn.setAttribute('aria-label', 'Close changes panel');
    closeBtn.style.cssText =
      'width:24px;height:24px;border:none;background:transparent;border-radius:6px;' +
      'cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;' +
      'color:rgba(255,255,255,0.5);transition:background 120ms ease;outline:none';
    const closeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    closeSvg.setAttribute('width', '14');
    closeSvg.setAttribute('height', '14');
    closeSvg.setAttribute('viewBox', '0 0 24 24');
    closeSvg.setAttribute('fill', 'none');
    closeSvg.setAttribute('stroke', 'currentColor');
    closeSvg.setAttribute('stroke-width', '2.5');
    closeSvg.setAttribute('stroke-linecap', 'round');
    const cp1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    cp1.setAttribute('d', 'M18 6 6 18');
    closeSvg.appendChild(cp1);
    const cp2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    cp2.setAttribute('d', 'm6 6 12 12');
    closeSvg.appendChild(cp2);
    closeBtn.appendChild(closeSvg);
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = 'rgba(255,255,255,0.08)'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'transparent'; });
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(closeBtn);
    this.container.appendChild(header);

    this.listEl = document.createElement('div');
    this.listEl.setAttribute('role', 'list');
    this.listEl.style.cssText = 'overflow-y:auto;flex:1;padding:8px';
    this.container.appendChild(this.listEl);

    // Bottom bar for the clear button (below the list)
    this.bottomBar = document.createElement('div');
    this.bottomBar.style.cssText =
      'padding:10px 16px;border-top:1px solid rgba(255,255,255,0.1);flex-shrink:0;display:none';
    this._clearReviewedBtn = document.createElement('button');
    this._clearReviewedBtn.textContent = 'Clear Completed Tasks';
    this._clearReviewedBtn.setAttribute('aria-label', 'Clear all reviewed changes');
    this._clearReviewedBtn.style.cssText =
      'border:none;background:none;color:rgba(255,255,255,0.3);font-size:10px;cursor:pointer;' +
      'padding:0;font-family:system-ui,sans-serif;outline:none';
    this._clearReviewedBtn.addEventListener('mouseenter', () => { this._clearReviewedBtn!.style.color = 'rgba(255,255,255,0.6)'; });
    this._clearReviewedBtn.addEventListener('mouseleave', () => { this._clearReviewedBtn!.style.color = 'rgba(255,255,255,0.3)'; });
    this._clearReviewedBtn.addEventListener('click', () => {
      this.entries = this.entries.filter(e => !e.reviewed);
      if (this.onClearReviewedCallback) this.onClearReviewedCallback();
      this.filterEntries();
      if (this.filteredEntries.length === 0) {
        this.hide();
      } else {
        this.render();
        this._updateClearBtn();
      }
    });
    this.bottomBar.appendChild(this._clearReviewedBtn);
    this.container.appendChild(this.bottomBar);

    this.boundKeydown = this.handleKeydown.bind(this);
    shadowRoot.appendChild(this.container);
  }

  private handleKeydown(e: KeyboardEvent) {
    if (!this.visible) return;
    const active = this.shadowRoot.activeElement ?? document.activeElement;
    const tag = (active as HTMLElement)?.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || (active as HTMLElement)?.isContentEditable;
    if (inInput && e.key !== 'Escape') return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.hide();
    } else if (e.key === 'j' || e.key === 'J') {
      e.preventDefault();
      this.moveFocus(1);
    } else if (e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      this.moveFocus(-1);
    } else if (e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      if (this.focusedIndex >= 0 && this.focusedIndex < this.filteredEntries.length) {
        this.markDone(this.filteredEntries[this.focusedIndex].promptId);
      }
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      if (this.focusedIndex >= 0 && this.focusedIndex < this.filteredEntries.length) {
        this.startReply(this.focusedIndex);
      }
    }
  }

  private moveFocus(dir: number) {
    if (this.filteredEntries.length === 0) return;
    this.focusedIndex = Math.max(0, Math.min(this.filteredEntries.length - 1, this.focusedIndex + dir));
    this.render();
    const items = this.listEl.querySelectorAll('[role="listitem"]');
    if (items[this.focusedIndex]) {
      (items[this.focusedIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }

  /** Filter entries to only actionable ones */
  private filterEntries(): void {
    this.filteredEntries = this.entries.filter(entry => {
      if (entry.status === 'completed' && entry.changes.length > 0) return true;
      if (entry.status === 'needsInfo') return true;
      return false;
    });
  }

  show(entries: ChangeEntry[]) {
    this.entries = entries;
    this.filterEntries();
    if (this.filteredEntries.length === 0) {
      this.hide();
      return;
    }
    this.visible = true;
    this.container.style.display = 'flex';
    this.container.getBoundingClientRect();
    this.container.style.opacity = '1';
    this.container.style.transform = 'translateY(0)';
    this.render();
    document.addEventListener('keydown', this.boundKeydown, true);
    this.listEl.scrollTop = this.listEl.scrollHeight;
  }

  hide() {
    this.visible = false;
    this.container.style.opacity = '0';
    this.container.style.transform = 'translateY(8px)';
    setTimeout(() => { if (!this.visible) this.container.style.display = 'none'; }, 200);
    this.focusedIndex = -1;
    if (this.onSelectCallback) this.onSelectCallback([]);
    document.removeEventListener('keydown', this.boundKeydown, true);
  }

  toggle(entries: ChangeEntry[]) {
    if (this.visible) this.hide();
    else this.show(entries);
  }

  isVisible() { return this.visible; }

  setOnReply(cb: ReplyCallback) { this.onReplyCallback = cb; }
  setOnDone(cb: (promptId: string) => void) { this.onDoneCallback = cb; }
  setOnRevert(cb: (promptId: string, changes: any[]) => void) { this.onRevertCallback = cb; }
  setOnPreviewToggle(cb: (promptId: string, changes: any[], showOld: boolean) => void) { this.onPreviewToggleCallback = cb; }
  setOnClearReviewed(cb: () => void) { this.onClearReviewedCallback = cb; }
  setOnSelect(cb: (selectors: string[]) => void) { this.onSelectCallback = cb; }

  private markDone(promptId: string) {
    if (this.onDoneCallback) this.onDoneCallback(promptId);
    // Re-sync entries from source and re-render
    this.filterEntries();
    this.render();
  }

  private startReply(index: number) {
    const entry = this.filteredEntries[index];
    if (!entry) return;
    const items = this.listEl.querySelectorAll('[role="listitem"]');
    const item = items[index] as HTMLElement;
    if (!item) return;

    let replyWrap = item.querySelector('.improv-reply-wrap') as HTMLDivElement;
    if (replyWrap) { replyWrap.querySelector('input')?.focus(); return; }

    replyWrap = document.createElement('div');
    replyWrap.className = 'improv-reply-wrap';
    replyWrap.style.cssText = 'display:flex;gap:6px;margin-top:8px';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Reply to this change...';
    input.setAttribute('aria-label', 'Reply to change');
    input.style.cssText =
      'flex:1;background:#252525;border:1px solid rgba(255,255,255,0.12);border-radius:8px;' +
      'padding:6px 10px;font-size:12px;color:rgba(255,255,255,0.85);outline:none;' +
      'font-family:system-ui,sans-serif';
    const mc = this.getMarkerColor;
    input.addEventListener('focus', () => { input.style.borderColor = mc(); });
    input.addEventListener('blur', () => { input.style.borderColor = 'rgba(255,255,255,0.12)'; });
    input.addEventListener('keydown', (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter' && input.value.trim()) {
        const replyText = input.value.trim();
        input.disabled = true;
        input.value = 'Sending...';
        input.style.color = 'rgba(255,255,255,0.35)';
        if (this.onReplyCallback) this.onReplyCallback(entry.promptId, replyText);
        setTimeout(() => {
          input.value = 'Sent';
          input.style.color = '#22c55e';
          setTimeout(() => replyWrap.remove(), 800);
        }, 300);
      } else if (e.key === 'Escape') {
        replyWrap.remove();
      }
    });

    replyWrap.appendChild(input);
    item.appendChild(replyWrap);
    input.focus();
  }

  private render() {
    // Bug fix #3: save scroll position before rebuilding
    const savedScrollTop = this.listEl.scrollTop;

    while (this.listEl.firstChild) this.listEl.removeChild(this.listEl.firstChild);

    // Bug fix #1: filter entries to only actionable ones
    this.filterEntries();

    const mc = this.getMarkerColor();

    if (this.filteredEntries.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:24px 16px;text-align:center;color:rgba(255,255,255,0.35);font-size:12px';
      empty.textContent = 'No changes yet';
      this.listEl.appendChild(empty);
      this._updateClearBtn();
      // Bug fix #3: restore scroll position
      this.listEl.scrollTop = savedScrollTop;
      return;
    }

    this.filteredEntries.forEach((entry, i) => {
      const isReverted = this.revertedPrompts.has(entry.promptId);
      const isExpanded = this.expandedPrompts.has(entry.promptId);
      const isPreviewing = this.previewingPrompts.has(entry.promptId);

      const item = document.createElement('div');
      item.setAttribute('role', 'listitem');
      item.setAttribute('tabindex', '0');

      // Bug fix #4: visual indicator for reverted entries
      let bgColor: string;
      if (isReverted) {
        bgColor = 'rgba(239,68,68,0.08)';
      } else if (i === this.focusedIndex) {
        bgColor = 'rgba(255,255,255,0.06)';
      } else {
        bgColor = 'rgba(255,255,255,0.02)';
      }

      item.style.cssText =
        'padding:10px 12px;border-radius:10px;margin-bottom:6px;' +
        'background:' + bgColor + ';' +
        'transition:background 80ms ease;' +
        'opacity:' + (entry.reviewed ? '0.4' : '1');

      const topRow = document.createElement('div');
      topRow.style.cssText = 'display:flex;align-items:flex-start;gap:8px';

      const numCircle = document.createElement('div');
      numCircle.style.cssText =
        'width:20px;height:20px;border-radius:50%;display:flex;align-items:center;' +
        'justify-content:center;flex-shrink:0;background:#D97757';
      numCircle.setAttribute('aria-label', entry.status);
      const numSpan = document.createElement('span');
      numSpan.style.cssText =
        'font-size:10px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums;' +
        'font-family:system-ui,sans-serif';
      numSpan.textContent = String(i + 1);
      numCircle.appendChild(numSpan);
      topRow.appendChild(numCircle);

      const summaryEl = document.createElement('div');
      summaryEl.style.cssText = 'flex:1;min-width:0';

      const summaryText = document.createElement('div');
      summaryText.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.85);line-height:1.4';
      summaryText.textContent = entry.summary;
      summaryEl.appendChild(summaryText);

      if (entry.filesChanged.length > 0) {
        const files = document.createElement('div');
        files.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.35);margin-top:3px';
        files.textContent = entry.filesChanged.join(', ');
        summaryEl.appendChild(files);
      }

      if (entry.changes.length > 0 && !isExpanded) {
        const changesWrap = document.createElement('div');
        changesWrap.style.cssText = 'margin-top:6px;display:flex;flex-wrap:wrap;gap:4px';
        for (const c of entry.changes.slice(0, 4)) {
          const pill = document.createElement('span');
          pill.style.cssText =
            'font-size:10px;padding:2px 6px;border-radius:4px;' +
            'background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.5);' +
            'font-family:ui-monospace,monospace;white-space:nowrap';
          pill.textContent = c.property + ': ' + c.oldValue + ' -> ' + c.newValue;
          changesWrap.appendChild(pill);
        }
        if (entry.changes.length > 4) {
          const more = document.createElement('span');
          more.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.3);padding:2px 4px';
          more.textContent = '+' + (entry.changes.length - 4) + ' more';
          changesWrap.appendChild(more);
        }
        summaryEl.appendChild(changesWrap);
      }

      if (entry.status === 'needsInfo' && entry.question) {
        const q = document.createElement('div');
        q.style.cssText =
          'margin-top:6px;padding:6px 10px;border-radius:8px;font-size:11px;' +
          'background:' + mc + '15;color:' + mc + ';border-left:2px solid ' + mc;
        q.textContent = entry.question;
        summaryEl.appendChild(q);
      }

      topRow.appendChild(summaryEl);
      item.appendChild(topRow);

      // Bug fix #6: expanded changes detail view
      if (isExpanded && entry.changes.length > 0) {
        const detailWrap = document.createElement('div');
        detailWrap.style.cssText =
          'margin-top:8px;padding-left:16px;border-left:2px solid rgba(255,255,255,0.08)';

        for (const c of entry.changes) {
          const row = document.createElement('div');
          row.style.cssText =
            'display:flex;flex-direction:column;gap:2px;padding:4px 0;' +
            'border-bottom:1px solid rgba(255,255,255,0.04);font-size:10px';

          const selectorEl = document.createElement('div');
          selectorEl.style.cssText =
            'color:rgba(255,255,255,0.4);font-family:ui-monospace,monospace;' +
            'white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
          selectorEl.textContent = c.selector;
          row.appendChild(selectorEl);

          const valuesRow = document.createElement('div');
          valuesRow.style.cssText = 'display:flex;gap:6px;align-items:center';

          const propEl = document.createElement('span');
          propEl.style.cssText =
            'color:rgba(255,255,255,0.6);font-family:ui-monospace,monospace;font-weight:500';
          propEl.textContent = c.property;
          valuesRow.appendChild(propEl);

          const oldEl = document.createElement('span');
          oldEl.style.cssText =
            'color:#ef4444;text-decoration:line-through;font-family:ui-monospace,monospace';
          oldEl.textContent = c.oldValue;
          valuesRow.appendChild(oldEl);

          const arrowEl = document.createElement('span');
          arrowEl.style.cssText = 'color:rgba(255,255,255,0.25)';
          arrowEl.textContent = '->';
          valuesRow.appendChild(arrowEl);

          const newEl = document.createElement('span');
          newEl.style.cssText =
            'color:#22c55e;font-family:ui-monospace,monospace';
          newEl.textContent = c.newValue;
          valuesRow.appendChild(newEl);

          row.appendChild(valuesRow);
          detailWrap.appendChild(row);
        }

        // Preview toggle button
        const previewBtn = document.createElement('button');
        previewBtn.textContent = isPreviewing ? 'Showing Before' : 'Preview';
        previewBtn.style.cssText =
          'border:none;border-radius:6px;padding:4px 10px;font-size:10px;cursor:pointer;' +
          'font-family:system-ui,sans-serif;margin-top:6px;outline:none;' +
          'transition:background 120ms ease;' +
          (isPreviewing
            ? 'background:rgba(239,68,68,0.15);color:#ef4444;'
            : 'background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.6);');
        previewBtn.addEventListener('mouseenter', () => {
          previewBtn.style.background = isPreviewing
            ? 'rgba(239,68,68,0.25)'
            : 'rgba(255,255,255,0.1)';
        });
        previewBtn.addEventListener('mouseleave', () => {
          previewBtn.style.background = isPreviewing
            ? 'rgba(239,68,68,0.15)'
            : 'rgba(255,255,255,0.06)';
        });
        previewBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isPreviewing) {
            this.previewingPrompts.delete(entry.promptId);
            // Restore new values
            if (this.onPreviewToggleCallback) {
              this.onPreviewToggleCallback(entry.promptId, entry.changes, false);
            }
          } else {
            this.previewingPrompts.add(entry.promptId);
            // Apply old values to show "before"
            if (this.onPreviewToggleCallback) {
              this.onPreviewToggleCallback(entry.promptId, entry.changes, true);
            }
          }
          this.render();
        });
        detailWrap.appendChild(previewBtn);

        item.appendChild(detailWrap);
      }

      if (!entry.reviewed) {
        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:6px;margin-top:8px;padding-left:16px';

        // Bug fix #5: rename "Done" to "Mark Done"
        const doneBtn = this.makeActionBtn('Mark Done', () => this.markDone(entry.promptId));
        doneBtn.setAttribute('aria-label', 'Mark change as reviewed');
        actions.appendChild(doneBtn);

        if (entry.changes && entry.changes.length > 0) {
          // Bug fix #4: reverted state for revert button
          if (isReverted) {
            const revertedBtn = this.makeActionBtn('Reverted', () => {});
            revertedBtn.disabled = true;
            revertedBtn.style.opacity = '0.4';
            revertedBtn.style.cursor = 'default';
            revertedBtn.setAttribute('aria-label', 'Change has been reverted');
            actions.appendChild(revertedBtn);
          } else {
            const revertBtn = this.makeActionBtn('Revert', () => {
              if (this.onRevertCallback) this.onRevertCallback(entry.promptId, entry.changes);
              this.revertedPrompts.add(entry.promptId);
              this.render();
            });
            revertBtn.setAttribute('aria-label', 'Revert this change preview');
            actions.appendChild(revertBtn);
          }

          // Bug fix #6: Show Changes / Hide Changes toggle
          const showChangesBtn = this.makeActionBtn(
            isExpanded ? 'Hide Changes' : 'Show Changes',
            () => {
              if (isExpanded) {
                this.expandedPrompts.delete(entry.promptId);
                // If previewing, restore new values when collapsing
                if (this.previewingPrompts.has(entry.promptId)) {
                  this.previewingPrompts.delete(entry.promptId);
                  if (this.onPreviewToggleCallback) {
                    this.onPreviewToggleCallback(entry.promptId, entry.changes, false);
                  }
                }
              } else {
                this.expandedPrompts.add(entry.promptId);
              }
              this.render();
            }
          );
          showChangesBtn.setAttribute('aria-label', isExpanded ? 'Hide change details' : 'Show change details');
          actions.appendChild(showChangesBtn);
        }

        const replyBtn = this.makeActionBtn('Reply', () => this.startReply(i));
        replyBtn.setAttribute('aria-label', 'Reply to this change');
        actions.appendChild(replyBtn);

        item.appendChild(actions);
      }

      item.addEventListener('click', () => {
        this.focusedIndex = i;
        this.render();
        const selectors = [...new Set(entry.changes.map(c => c.selector))];
        if (this.onSelectCallback) this.onSelectCallback(selectors);
      });

      this.listEl.appendChild(item);
    });
    this._updateClearBtn();

    // Bug fix #3: restore scroll position after rebuilding
    this.listEl.scrollTop = savedScrollTop;
  }

  private _updateClearBtn(): void {
    if (!this._clearReviewedBtn || !this.bottomBar) return;
    const hasReviewed = this.entries.some(e => e.reviewed);
    this.bottomBar.style.display = hasReviewed ? '' : 'none';
  }

  private makeActionBtn(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText =
      'border:none;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.6);' +
      'border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;' +
      'font-family:system-ui,sans-serif;transition:background 120ms ease;outline:none';
    btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,0.1)'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(255,255,255,0.06)'; });
    btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
    return btn;
  }

  destroy() {
    this.hide();
    this.container.remove();
  }
}
