/**
 * section.tsx - panel layout primitives for the ported Retune Design panel.
 *
 * Ported near-verbatim from Retune's ui/section.tsx (React -> Preact:
 * ReactNode becomes ComponentChildren) per spec 02-section-framework.md.
 *
 *   Section   - group with header label + optional action (NO collapse chevron;
 *               sections are conditionally rendered, never collapsed - plan (f))
 *   Row       - universal horizontal container, optional shared label
 *   Field     - label-above-input pair, used inside Row
 *   RowAction - 32x32 button on the right edge of a Row
 *
 * CSS lives in core/manipulate/styles/sections.css (shipped on the shadow
 * root's adoptedStyleSheets alongside panel-shell.css).
 */

import type { ComponentChildren } from 'preact';

export function Section({ label, gap, action, children }: { label: string; gap?: number; action?: ComponentChildren; children?: ComponentChildren }) {
  return (
    <div className="retune-section">
      <div className="retune-section-header">
        <span className="retune-section-title">{label}</span>
        {action}
      </div>
      {children && (
        <div className="retune-section-body" style={gap != null ? { gap } : undefined}>
          {children}
        </div>
      )}
    </div>
  );
}

export function Row({ label, children }: { label?: string; children: ComponentChildren }) {
  if (label) {
    return (
      <div className="retune-row-group">
        <div className="retune-group-label-inline">{label}</div>
        {children}
      </div>
    );
  }
  return (
    <div className="retune-section-row">
      <div className="retune-row">
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ComponentChildren }) {
  return (
    <div className="retune-field">
      <span className="retune-field-label">{label}</span>
      {children}
    </div>
  );
}

export function RowAction({ onClick, active, children }: { onClick: () => void; active?: boolean; children: ComponentChildren }) {
  return (
    <button className={`retune-row-action${active ? ' active' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

/** @deprecated Use Row with label prop instead */
export const RowGroup = Row;

/** @deprecated Use Row label prop instead */
export function GroupLabel({ children }: { children: ComponentChildren }) {
  return (
    <div className="retune-group-label">{children}</div>
  );
}
