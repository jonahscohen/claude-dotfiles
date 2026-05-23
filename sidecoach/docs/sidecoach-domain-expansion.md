# Sidecoach Domain Expansion Framework
## 10 Design Domains, 112 Rules (22 Polish + 90 Domain Extensions)

**Status:** Phase C Design Specification  
**Scope:** Expand base 7 domains (42 rules) to 86 rules + 3 new domains (26 rules) = 112 total rules  
**Integration:** Extended domain validator (TypeScript) + memory tracking per domain  

---

## Domain Organization

### Base 7 Domains (86 rules total, ~12 rules per domain)

#### Domain 1: Typography (16 rules)
Extracted from fontshare.json + Flow C handler

**Existing in Polish Standard (3):**
- Tabular numbers on dynamic data (rule #7)
- Text wrap balance on headings (rule #8)
- Font smoothing (rule #11)

**Expansion Rules (13):**
- T1: Modular scale consistency (1.25, 1.33, 1.618 ratios)
- T2: Line height to font size ratio (1.4-1.6 for body, 1.2-1.3 for headings)
- T3: Letter spacing adjustment per font (tracking, optical tightness)
- T4: X-height/cap-height alignment (optical proportion checks)
- T5: Paragraph spacing = line-height × font-size
- T6: Single vs double spaces after punctuation (disabled post-single-space era)
- T7: Widow/orphan control (min 2 words on orphan lines)
- T8: Hyphenation rules (language-specific, avoid 2-char fragments)
- T9: Font weight contrast (light/regular/bold minimum 200+ diff)
- T10: Display vs body typography separation (contrast in personality)
- T11: Readability min font size (16px on 1x, 12px+ on mobile)
- T12: Dyslexia-friendly font selection (high x-height, distinct characters)
- T13: Variable font axis usage (weight range, optical size response)

---

#### Domain 2: Color (18 rules)
Extracted from design-references.json + Flow D handler

**Existing in Polish Standard (2):**
- Image outlines in rgba(0,0,0,0.1) (rule #4)
- Color contrast (WCAG AA/AAA) (rule #20)

**Expansion Rules (16):**
- C1: Semantic color naming (primary, secondary, accent, danger, success, warning)
- C2: Color accessibility (WCAG AA 4.5:1 text, 3:1 large text, 3:1 interactive)
- C3: Dark mode color inversion strategy (token-based, not hard-coded)
- C4: Colorblind-safe palettes (avoid red-green as only differentiator)
- C5: Contrast ratio minimums (body text 4.5:1, disabled text 3:1)
- C6: Color psychology consistency (warm/cool palette coherence)
- C7: Saturation consistency (avoid mixing highly saturated + desaturated in same section)
- C8: Tint/shade generation (consistent lightness ramps, no manual adjustment)
- C9: Opacity/transparency usage (consistent alpha levels: 10%, 30%, 50%, 70%, 100%)
- C10: Brand color palette limits (3-5 primary + 5-10 secondary, avoid unlimited custom)
- C11: Neutral color family (gray, beige, blue-gray - avoid pure black except text/borders)
- C12: Color state indication (hover: +10% lightness, active: +20%, disabled: 50% opacity)
- C13: Semantic status colors (error red, success green, warning yellow, info blue)
- C14: Gradient avoidance (unless explicitly designed, avoid trendy gradients)
- C15: Background color separation (interactive elements 3:1 WCAG from background)
- C16: Text on image overlays (use scrim/dark overlay for contrast, never bare text)

---

#### Domain 3: Spatial (14 rules)
Extracted from design-references.json + Flow D handler

**Existing in Polish Standard (0):**

**Rules (14):**
- S1: Grid system consistency (4px or 8px baseline, all measurements multiples)
- S2: Padding/margin ratio (padding > margin for contained elements)
- S3: Aspect ratio maintenance (images 4:3, video 16:9, square 1:1)
- S4: Whitespace hierarchy (active > inactive > passive sections)
- S5: Alignment precision (left, center, right - avoid micro-adjustments)
- S6: Spacing scale (linear: 4, 8, 12, 16, 24, 32, 48, 64 - no arbitrary sizes)
- S7: Container max-width (limit line length to 65-75 chars for readability)
- S8: Nested spacing rules (child margins collapse to parent padding)
- S9: Gutter spacing (columns 16px-32px gap, responsive to viewport)
- S10: Z-index management (documented layers: base 0, overlay 100, modal 1000)
- S11: Responsive spacing adjustments (scale down 50% on mobile, maintain ratios)
- S12: Symmetry vs asymmetry (consistent visual weight distribution)
- S13: Safe areas (notch/safe-inset awareness on mobile)
- S14: Density consistency (comfortable for touch: 44x44px minimum interactive area)

---

#### Domain 4: Motion (20 rules)
Extracted from motion-reference.json + Flow E handler

**Existing in Polish Standard (5):**
- Icon swap via opacity + scale + blur (rule #3)
- Staggered enter animations (rule #9)
- Subtle exit animations (rule #10)
- AnimatePresence initial={false} (rule #12)
- Reduced motion respect (rule #19)

**Expansion Rules (15):**
- M1: Exponential easing only (no linear, no cubic-bezier approximations)
- M2: Duration consistency (micro 100-150ms, macro 300-500ms, full 600-800ms)
- M3: Ease curve selection (ease-out for enters, ease-in for exits)
- M4: Choreography timing (1st item t=0, 2nd t+30ms, 3rd t+60ms, etc.)
- M5: Motion purpose clarity (entrance, exit, update, feedback - not decoration)
- M6: Velocity perception (same distance = same duration across sizes)
- M7: Gesture response timing (instant < 100ms, quick 100-300ms, deliberate 300ms+)
- M8: Loading state indication (spinner, progress bar, or skeleton - 3 choices)
- M9: Transition trigger clarity (hover, focus, active, click - explicit states)
- M10: Transform origin consistency (center for scales, edges for slides)
- M11: GPU acceleration (transform/opacity only, avoid layout-triggering props)
- M12: Accessibility motion testing (VoiceOver/screen reader announce states)
- M13: Performance budgets (60fps @ 120fps capable, 30fps min on low-end)
- M14: Momentum vs spring (momentum for flicks, spring for interactive drags)
- M15: Reduced motion fallback (instant transitions, no animations, state still visible)

---

#### Domain 5: Interaction (15 rules)
Extracted from component-gallery.json + Flow B handler

**Existing in Polish Standard (4):**
- Scale on press (rule #1)
- Minimum hit area 40x40px (rule #5)
- No transition: all (rule #6)
- Focus visible (rule #18)

**Expansion Rules (11):**
- I1: 8-state completeness (default, hover, focus, active, disabled, loading, error, success)
- I2: Cursor indication (pointer for interactive, text for inputs, default for disabled)
- I3: Focus ring visibility (2px offset, currentColor, always visible on keyboard)
- I4: Disabled state clarity (greyed out + lower opacity + pointer disabled)
- I5: Loading state indication (spinner/skeleton inside element, not replacing)
- I6: Error messaging (inline + color + icon, accessible to screen readers)
- I7: Success confirmation (brief visual + optional toast, auto-dismiss after 4s)
- I8: Form validation strategy (on blur for initial, on change for corrections)
- I9: Doubleclick prevention (disable button during submit, show loading state)
- I10: Keyboard navigation completeness (all interactive elements keyboard accessible)
- I11: Mobile touch interactions (long-press, swipe, pinch, tap - documented per element)

---

#### Domain 6: Responsive (12 rules)
New domain expansion

**Rules (12):**
- R1: Breakpoint consistency (defined in DESIGN.md tokens)
- R2: Mobile-first approach (base styles mobile, media queries for larger screens)
- R3: Touch target scaling (40x40px minimum at all breakpoints)
- R4: Font size scaling (base 16px desktop, scale down 12-14px mobile)
- R5: Container queries (if used, document intent per container)
- R6: Flex/grid responsiveness (auto-columns, minmax ranges, no fixed widths)
- R7: Image responsiveness (srcset, sizes, max-width 100%)
- R8: Viewport meta tag (width=device-width, initial-scale=1, no user-scalable=no)
- R9: Orientation handling (portrait vs landscape, test landscape on tablets)
- R10: Padding/margin responsiveness (scale down gutter widths on mobile)
- R11: Typography scaling (limit scaling range, test readability at all sizes)
- R12: Layout direction support (ltr/rtl consistency, test Arabic/Hebrew)

---

#### Domain 7: UX Writing (11 rules)
New domain expansion

**Rules (11):**
- W1: Voice consistency (tone of voice matrix: professional/friendly/playful)
- W2: Microcopy standards (error messages, help text, empty states - one template each)
- W3: CTA clarity (action verbs, avoid "OK/Submit", use specific language)
- W4: Error message formula (problem + reason + solution, always constructive)
- W5: Empty state messaging (explanation + suggested action + reassurance)
- W6: Loading state messaging (progress indication + estimated time + context)
- W7: Confirmation dialogs (dangerous actions: delete require explicit "Type DELETE")
- W8: Success messaging (brief positive acknowledgment, auto-dismiss 3-4s)
- W9: Help text guidelines (concise, action-oriented, example provided)
- W10: Label clarity (avoid abbreviations, be specific: "First Name" not "Name")
- W11: Capitalization consistency (title case for headings, sentence case for body)

---

### New 3 Domains (26 rules total)

#### Domain 8: Performance (9 rules)

**Rules (9):**
- P1: Bundle size targets (JS < 100KB gzipped, CSS < 30KB gzipped)
- P2: Image optimization (modern formats: WebP/AVIF, lazy loading)
- P3: Font loading strategy (system fonts, woff2 only, font-display: swap)
- P4: CSS-in-JS evaluation (compiled CSS preferred, runtime overhead measured)
- P5: Animation GPU cost (only transform/opacity, test on mid-range devices)
- P6: Component lazy loading (code-split heavy components, Suspense boundaries)
- P7: Interaction latency (< 100ms response time, perceptible feedback always)
- P8: Memory footprint (no memory leaks, monitor with DevTools heap snapshots)
- P9: Network waterfall optimization (critical path identified, async/defer used)

---

#### Domain 9: Data Visualization (10 rules)

**Rules (10):**
- D1: Color accessibility in charts (use colorblind-safe palettes, add texture/pattern)
- D2: Legend clarity (always provided, positioned logically)
- D3: Axis labels (always present, units specified, no ambiguity)
- D4: Data precision (avoid excessive decimals, 2-3 significant figures typical)
- D5: Chart type selection (bar for categories, line for trends, scatter for correlation)
- D6: Interactive tooltips (clear label + value + context + timestamp if relevant)
- D7: Responsive charts (reflow to vertical on mobile, test at all breakpoints)
- D8: Animation clarity (ease-in-out for value changes, clear state transitions)
- D9: Accessibility text (table fallback, aria-label per series, screen reader text)
- D10: Zero/null handling (consistent treatment, documented in legend/footnote)

---

#### Domain 10: Internationalization (7 rules)

**Rules (7):**
- I1: Text expansion buffers (German 20%, Chinese 10%, Arabic right-to-left)
- I2: Number/date/time formatting (locale-aware, respect user preferences)
- I3: Language selector placement (header, persistent across sessions)
- I4: Translated asset storage (images with text, consider localization cost)
- I5: Keyboard layouts (support alternative IME inputs for CJK)
- I6: Font coverage (ensure font supports all target languages)
- I7: Pluralization rules (CLDR-compliant, not English-centric "s" suffix)

---

## Implementation Phases

### Phase C1: Expand Base 7 Domains (10 days)
- Days 1-2: Typography rules (16 total)
- Days 3-4: Color rules (18 total)
- Days 5-6: Spatial rules (14 total)
- Days 7-8: Motion rules (20 total)
- Days 9-10: Interaction + Responsive + UX Writing rules (15 + 12 + 11 = 38 total)

Total: 86 rules documented with check functions

### Phase C2: Implement 3 New Domains (10 days)
- Days 1-3: Performance (9 rules)
- Days 4-7: Data Visualization (10 rules)
- Days 8-10: Internationalization (7 rules)

Total: 26 rules documented with check functions

### Phase C3: Validation Matrix (5 days)
- Day 1-2: Create extended-domain-validator.ts with all 112 rules
- Day 3: Integration into orchestrator flows (B-J)
- Day 4: Memory tracking per domain
- Day 5: E2E testing and documentation

---

## Technical Implementation

### Extended Domain Validator Structure

```typescript
interface DomainValidationRule {
  id: string; // "TYPOGRAPHY_01", "COLOR_01", etc.
  domain: string; // "typography", "color", "spatial", etc.
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  checkFunction: (context: DomainCheckContext) => DomainCheckResult;
}

interface DomainValidationReport {
  totalRules: number;
  passedRules: number;
  violationsByDomain: Record<string, number>;
  passRateByDomain: Record<string, string>;
  results: DomainCheckResult[];
  summary: string;
}

class ExtendedDomainValidator {
  static validateAll(context: DomainCheckContext): DomainValidationReport;
  static getDomains(): string[];
  static getRulesByDomain(domain: string): DomainValidationRule[];
  static getSummary(): string;
}
```

---

## Files to Create/Modify

**New Files:**
- `/sidecoach/src/extended-domain-validator.ts` (112 rules, ~3500 lines)
- `/sidecoach/docs/domain-expansion-ruleset.md` (rule specifications, rationale)
- `/sidecoach/docs/domain-validation-checklist.md` (implementation checklist)

**Modified Files:**
- `/sidecoach/src/sidecoach-orchestrator.ts` (integrate ExtendedDomainValidator)
- `/sidecoach/docs/DESIGN.md` (add domain configuration tokens)

---

## Memory Tracking

Session memory will be updated per domain:
- `session_2026-05-23_phase_c1_typography.md` (after day 2)
- `session_2026-05-23_phase_c1_color.md` (after day 4)
- `session_2026-05-23_phase_c1_spatial.md` (after day 6)
- etc.

Final Phase C completion memory: `session_2026-05-23_phase_c_complete.md`

---

## Verification Checklist

- [ ] All 112 rules documented with descriptions
- [ ] Check functions implemented for each rule (testable, not subjective)
- [ ] Severity levels assigned consistently
- [ ] Remediation suggestions provided per rule
- [ ] TypeScript compilation: zero errors
- [ ] Integration test: orchestrator accepts ExtendedDomainValidator calls
- [ ] Memory files created for each sub-phase
- [ ] DESIGN.md updated with domain tokens

---

**Next Step:** Begin C1 implementation starting with Typography domain (16 rules)
