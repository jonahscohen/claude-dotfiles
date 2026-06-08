/**
 * ScopeSection - element scope/target selection (the Target rail with the bridge
 * animation) + the forced pseudo-state Trigger dropdown.
 *
 * Ported from Retune ui/sections/ScopeSection.tsx per spec 05 (section 4) +
 * spec 10 (scope/forced-state). React -> Preact.
 *
 * ADAPTATION (behavior-identical): Retune calls hooks inside an IIFE within JSX
 * (only when scopeLevels.length > 1). That violates the rules-of-hooks if the
 * condition flips between renders. Here the rail body lives in an internal
 * <ScopeRail> component rendered conditionally, so its hooks are unconditional.
 * Same bridge animation, same timings, same DOM.
 *
 * Bridge animation: 320ms cubic-bezier(0.77, 0, 0.175, 1), EXTEND=6px, with pill
 * colors frozen to pre-change appearance and unfrozen at the midpoint when the
 * bridge set updates (Web Animations API). Default selected index is computed by
 * the parent via defaultScopeIndex(levels) (scope-levels.ts) = levels.length - 2.
 *
 * INTEGRATION HOOKS the parent (panel spine, #28) must wire - documented here,
 * NOT wired in this standalone component:
 *  - selected scope -> getScopedStyles(element, level.selector) so edits change
 *    the RULE (siblings update), not just the instance; non-null class selector
 *    only (skip when selector has a descendant combinator / is null).
 *  - onScopeLevelChange(index) -> set active index + (if level.selector)
 *    picker.showScopeHighlights(level.selector, element) to paint matches;
 *    onScopeLevelHover(index|null) -> transient highlight.
 *  - forcedState -> read getPseudoStateStyles(element, state) and apply those
 *    inline on the element (forced :hover/:focus/:active preview); clear inline
 *    when state returns to null / element changes.
 */

import { useState, useRef, useEffect } from "preact/hooks";
import { Fragment } from "preact";
import type { ScopeSectionProps, ScopeLevel, ForcedState } from "./section-props.js";
import { Section, Row } from "../section.js";
import { SelectInput } from "../select-input.js";
import { Tooltip } from "../tooltip.js";

/** Middle-truncate a string, preserving start and end for readability. */
function middleTruncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  const keep = maxLen - 1; // 1 char for ellipsis
  const start = Math.ceil(keep * 0.4);
  const end = Math.floor(keep * 0.6);
  return str.slice(0, start) + "…" + str.slice(-end);
}

function ScopeRail({
  scopeLevels,
  activeLevelIndex,
  onScopeLevelChange,
  onScopeLevelHover,
}: {
  scopeLevels: ScopeLevel[];
  activeLevelIndex: number;
  onScopeLevelChange: (index: number) => void;
  onScopeLevelHover?: (index: number | null) => void;
}) {
  const prevLevelRef = useRef(activeLevelIndex);
  const fieldRef = useRef<HTMLDivElement>(null);

  const computeBridgesForLevel = (level: number) => {
    if (scopeLevels[level]?.selector === null) return new Set<number>(); // "This element" - no bridges
    const bridges = new Set<number>();
    for (let i = 0; i < scopeLevels.length - 1; i++) {
      const cur = scopeLevels[i];
      const nxt = scopeLevels[i + 1];
      if (cur.selector !== null && nxt && nxt.selector !== null && i < level && (i + 1) <= level) {
        bridges.add(i);
      }
    }
    return bridges;
  };
  const [bridgeVisible, setBridgeVisible] = useState<Set<number>>(() => computeBridgesForLevel(activeLevelIndex));

  // Capture pill colors after paint for the NEXT transition
  const pillColorsRef = useRef<Map<number, { bg: string; color: string }>>(new Map());
  useEffect(() => {
    const f = fieldRef.current;
    if (!f) return;
    const colors = new Map<number, { bg: string; color: string }>();
    f.querySelectorAll<HTMLElement>('[data-level-index]').forEach(pill => {
      const idx = parseInt(pill.dataset.levelIndex || '0', 10);
      const style = getComputedStyle(pill);
      colors.set(idx, { bg: style.backgroundColor, color: style.color });
    });
    pillColorsRef.current = colors;
  });

  // Animate on level change
  useEffect(() => {
    const prev = prevLevelRef.current;
    prevLevelRef.current = activeLevelIndex;
    if (prev === activeLevelIndex) return;

    const oldBridges = computeBridgesForLevel(prev);
    const newBridges = computeBridgesForLevel(activeLevelIndex);

    const appearing: number[] = [];
    const disappearing: number[] = [];
    newBridges.forEach(b => { if (!oldBridges.has(b)) appearing.push(b); });
    oldBridges.forEach(b => { if (!newBridges.has(b)) disappearing.push(b); });

    if (appearing.length === 0 && disappearing.length === 0) {
      setBridgeVisible(newBridges);
      return;
    }

    const field = fieldRef.current;
    if (!field) { setBridgeVisible(newBridges); return; }

    const DURATION = 320;
    const EASING = 'cubic-bezier(0.77, 0, 0.175, 1)';
    const EXTEND = 6;
    const getPill = (idx: number) => field.querySelector<HTMLElement>(`[data-level-index="${idx}"]`);

    const allBridges = [...appearing, ...disappearing];
    const pillSides = new Map<number, Set<'left' | 'right'>>();
    for (const bridgeIdx of allBridges) {
      if (!pillSides.has(bridgeIdx)) pillSides.set(bridgeIdx, new Set());
      pillSides.get(bridgeIdx)!.add('right');
      if (!pillSides.has(bridgeIdx + 1)) pillSides.set(bridgeIdx + 1, new Set());
      pillSides.get(bridgeIdx + 1)!.add('left');
    }

    // Freeze pill colors to pre-change appearance
    const snapshotColors = pillColorsRef.current;
    const frozenPills: HTMLElement[] = [];
    for (const [pillIdx] of pillSides) {
      const pill = getPill(pillIdx);
      if (!pill) continue;
      const old = snapshotColors.get(pillIdx);
      if (old) {
        pill.style.backgroundColor = old.bg;
        pill.style.color = old.color;
        frozenPills.push(pill);
      }
    }

    // Animate box-shadow + border-radius
    for (const [pillIdx, sides] of pillSides) {
      const pill = getPill(pillIdx);
      if (!pill) continue;
      const bg = snapshotColors.get(pillIdx)?.bg || '#f5f5f4';

      const shadows: string[] = [];
      if (sides.has('right')) shadows.push(`${EXTEND}px 0 0 0 ${bg}`);
      if (sides.has('left')) shadows.push(`-${EXTEND}px 0 0 0 ${bg}`);
      const peakShadow = shadows.join(', ');
      const zeroShadows = shadows.map(() => `0px 0 0 0 ${bg}`).join(', ');

      const R = '8px';
      const Z = '0px';
      const peakRadius = `${sides.has('left') ? Z : R} ${sides.has('right') ? Z : R} ${sides.has('right') ? Z : R} ${sides.has('left') ? Z : R}`;

      pill.animate([
        { boxShadow: zeroShadows, borderRadius: `${R} ${R} ${R} ${R}` },
        { boxShadow: peakShadow, borderRadius: peakRadius },
        { boxShadow: zeroShadows, borderRadius: `${R} ${R} ${R} ${R}` },
      ], { duration: DURATION, easing: EASING });
    }

    // Midpoint: unfreeze colors + update bridges
    const timer = setTimeout(() => {
      for (const pill of frozenPills) {
        pill.style.removeProperty('background-color');
        pill.style.removeProperty('color');
      }
      setBridgeVisible(newBridges);
    }, DURATION / 2);

    // Cleanup: cancel stale timeout if level changes again before animation finishes
    return () => clearTimeout(timer);
  }, [activeLevelIndex, scopeLevels]);

  return (
    <Row label="Target">
      <div className="retune-selector-field" ref={fieldRef}>
        {scopeLevels.map((level, index) => {
          const isActive = index === activeLevelIndex;
          const isElementLevel = level.selector === null;
          const activeIsElementLevel = scopeLevels[activeLevelIndex]?.selector === null;
          const isIncluded = index < activeLevelIndex && !activeIsElementLevel;
          const showBridge = bridgeVisible.has(index);
          return (
            <Fragment key={level.selector ?? "__element"}>
              {isElementLevel && scopeLevels.length > 1 && (
                <span className="retune-selector-divider" />
              )}
              <button
                className={`retune-selector-tag${isActive ? " active" : ""}${isIncluded ? " included" : ""}`}
                data-level-index={index}
                onClick={() => onScopeLevelChange(index)}
                onPointerEnter={() => onScopeLevelHover?.(index)}
                onPointerLeave={() => onScopeLevelHover?.(null)}
              >
                {level.label.length > 24 ? (
                  <Tooltip content={level.label} side="bottom" delay={300}>
                    <span className="retune-selector-tag-name">
                      {middleTruncate(level.label, 24)}
                    </span>
                  </Tooltip>
                ) : (
                  <span className="retune-selector-tag-name">
                    {level.label}
                  </span>
                )}
                {level.count > 1 && (
                  <Tooltip content={`${level.count} elements match this selector`} side="bottom" delay={300}>
                    <span className="retune-selector-tag-count">{level.count}</span>
                  </Tooltip>
                )}
              </button>
              {showBridge && (
                <span className="retune-selector-bridge filled" />
              )}
            </Fragment>
          );
        })}
      </div>
    </Row>
  );
}

export function ScopeSection({
  element,
  scopeLevels,
  activeLevelIndex,
  onScopeLevelChange,
  onScopeLevelHover,
  forcedState,
  onForcedStateChange,
}: ScopeSectionProps) {
  return (
    <Section label={element.reactComponents?.[0] ? "Scope" : element.tagName.toLowerCase()}>
      {scopeLevels.length > 1 && onScopeLevelChange && (
        <ScopeRail
          scopeLevels={scopeLevels}
          activeLevelIndex={activeLevelIndex}
          onScopeLevelChange={onScopeLevelChange}
          onScopeLevelHover={onScopeLevelHover}
        />
      )}
      {onForcedStateChange && (
        <Row label="Trigger">
          <div className="retune-row">
            <SelectInput
              prop="__state"
              value={forcedState ? ({ ":hover": "Hover", ":focus": "Focus", ":active": "Active" } as Record<string, string>)[forcedState] ?? "None" : "None"}
              options={["None", "Hover", "Focus", "Active"]}
              onChange={(_, val) => {
                const map: Record<string, string | null> = { None: null, Hover: ":hover", Focus: ":focus", Active: ":active" };
                onForcedStateChange(map[val] as ForcedState | null);
              }}
            />
          </div>
        </Row>
      )}
    </Section>
  );
}
