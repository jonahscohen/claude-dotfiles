/**
 * Engine change-model types (ported from Retune overlay/src/types.ts, subset).
 *
 * These are the rich Retune change shapes used by ChangeTracker + output.
 * They are intentionally local to core/engine so the engine layer is
 * self-contained and does not collide with Justify's existing core/types.ts
 * (which defines the leaner PendingChange used by ChangeBuffer/Transport).
 *
 * INTEGRATION SEAM (not wired yet - later phase): Justify already ships
 * core/change-buffer.ts (PendingChange: {id, selector, property, oldValue,
 * newValue, timestamp}) + Transport, which send flat rows to the daemon.
 * This engine is the richer model. ChangeTracker.getFlatChanges() emits rows
 * shaped exactly like PendingChange (oldValue=from, newValue=to) so a future
 * integration step can feed/supersede ChangeBuffer without reshaping. Do NOT
 * wire it here.
 */

/** A single property change. `property` is camelCase internally; kebab only at the output boundary. */
export interface PropertyChange {
  property: string;
  from: string;
  to: string;
  /** null/undefined = base (widest breakpoint), "768px" = @media (max-width: 768px) override */
  breakpoint?: string | null;
}

/** A lightweight variable reference stored alongside changes (token layer is deferred,
 *  but the data shape is kept so the tracker stays faithful and forward-compatible). */
export interface TrackedVariableRef {
  className: string;
  values: Record<string, string>;
}

export interface ElementChange {
  /** Element identification */
  selector: string;
  tagName: string;
  textContent: string | null;
  classes: string[];
  reactComponents: string[];
  /** What changed (CSS properties) */
  changes: PropertyChange[];
  /** Timestamp */
  timestamp: number;
  /** Source file location (React _debugSource). Empty/omitted on non-React targets. */
  sourceFile?: { fileName: string; lineNumber: number; columnNumber?: number } | null;
  stylingApproach?: string;
  inlineStyles?: string | null;
  elementId?: string | null;
  accessibleName?: string | null;
  parentContext?: string | null;
  childSummary?: string | null;
  domPath?: string;
  nearbySiblings?: string | null;
  position?: { x: number; y: number; width: number; height: number };
  /** Value-only variable associations: camelCase property -> variable ref (token layer, deferred) */
  variableAssociations?: Record<string, TrackedVariableRef>;
  /** Properties whose token/variable binding was explicitly removed (token layer, deferred) */
  unlinkedProperties?: Array<{ property: string; value: string }>;
  /** React component prop edits. Empty on non-React targets. */
  propChanges?: Array<{ prop: string; from: unknown; to: unknown }>;
  /** HTML/SVG attribute edits - kept DISTINCT from CSS `changes`. */
  attributeChanges?: Array<{ attr: string; from: string; to: string }>;
}

/** Flat row shape matching Justify's ChangeBuffer PendingChange (sans id/timestamp).
 *  Produced by ChangeTracker.getFlatChanges() for the Transport/daemon seam. */
export interface FlatChange {
  selector: string;
  property: string;
  oldValue: string;
  newValue: string;
  breakpoint?: string | null;
}
