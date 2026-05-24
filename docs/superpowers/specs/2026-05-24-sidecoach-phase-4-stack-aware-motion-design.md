# Sidecoach Phase 4: Stack-Aware Motion - Design Spec

**Date:** 2026-05-24
**Project:** Sidecoach (`/Users/spare3/Documents/Github/claude-dotfiles/sidecoach`)
**Sprint:** Sprint 3 proper (Phase 4 of `~/.claude/plans/misty-jingling-plum.md`)
**Status:** Approved by Jonah; ready for implementation planning.

## Goal

Make `flow-handler-motion-integration` (flowH) emit framework-appropriate GSAP loading + cleanup code based on the project's detected tech stack. The user's animation intent stays constant (entrance reveal, scroll trigger, hover transition, etc.); the code idiom adapts so a WordPress engagement gets `wp_enqueue_script` + jQuery noConflict and a Drupal engagement gets `Drupal.behaviors` attach/detach.

This expands the original Phase 4 scope (vanilla vs React) to cover Yes&'s actual client mix: WordPress, HubSpot, Drupal, Angular - alongside the existing SPA frameworks.

## Why this matters

The current flowH emits the same motion guidance regardless of stack. The example snippets default to a generic "import gsap; gsap.from(...)" pattern that's not directly usable in WordPress theme code (needs jQuery noConflict + enqueue), Drupal modules (needs behaviors API), or HubSpot modules (needs their script loader). Yes&'s real engagements span all four CMS platforms plus Angular, so a stack-agnostic recommendation means every engagement repeats the same adaptation work.

The fix is detection-driven: read the tech stack from `ProjectContext`, look up the matching idiom from a data module, append a "Stack-specific implementation" block to flowH's guidance with the right loading + cleanup pattern + a concrete snippet.

## Architecture

```
ProjectContext.techStack
       │
       ▼
detectTechStack(projectPath)             // project-context.ts (extend)
  ├── detectStackFromFilesystem(path)    // NEW helper, runs FIRST
  │     ├── angular.json           → 'angular'
  │     ├── wp-config.php OR
  │     │   style.css w/ WP theme  → 'wordpress'
  │     ├── composer.json w/ drupal/* OR
  │     │   *.info.yml             → 'drupal'
  │     ├── theme.json HubSpot OR
  │     │   hubl_modules/ OR
  │     │   hs-config*             → 'hubspot'
  │     └── (no match)             → null, fall through
  └── (existing) package.json sniff for next/remix/astro/svelte/vue/react/vanilla
       │
       ▼
context.metadata.techStack = { framework: ..., animationLib: ..., ... }
       │
       ▼ (injected by enrichContextForHandler at handler dispatch)
FlowHMotionIntegrationHandler.execute(context)
       │
       ▼
getMotionIdiom(context.metadata.techStack.framework)  // motion-stack-idioms.ts (NEW)
       │
       ▼
guidance += [
  '',
  `Stack-specific implementation (framework=${framework}):`,
  `- Loading: ${idiom.loadingPattern}`,
  `- Cleanup: ${idiom.cleanupPattern}`,
  `- Scope boundary: ${idiom.scopeBoundary}`,
  '',
  'Example:',
  ...idiom.exampleSnippet.split('\n').map(l => '  ' + l),
  ...idiom.notes.map(n => `- Note: ${n}`),
]
artifacts.push(this.createArtifact(
  'template',
  `Motion code template: ${framework}`,
  idiom.exampleSnippet,
  `${framework} idiom for GSAP loading + cleanup`
))
```

The detection runs FIRST in `detectTechStack` so CMS markers win over `package.json` keys. This matters: a WordPress site can also have `package.json` (e.g., `@wordpress/scripts` for the Gutenberg block editor). Without priority ordering, the existing `react` sniff would clobber the WordPress detection.

## Data model

### Extended `TechStack.framework` union

In `sidecoach/src/project-context.ts`:

```typescript
// Before
framework: 'react' | 'next' | 'vue' | 'svelte' | 'astro' | 'remix' | 'vanilla' | 'unknown';

// After
framework:
  | 'react' | 'next' | 'vue' | 'svelte' | 'astro' | 'remix'  // existing SPA frameworks
  | 'angular'                                                  // NEW: framework
  | 'wordpress' | 'drupal' | 'hubspot'                         // NEW: CMS platforms
  | 'vanilla' | 'unknown';                                     // existing fallbacks
```

12-value union. Adding to a TypeScript union forces every place that switches on `framework` to either handle the new case explicitly or be marked exhaustive-with-fallback - that's the compiler-enforced safety net.

### New `MotionIdiom` interface

In `sidecoach/src/motion-stack-idioms.ts`:

```typescript
import { TechStack } from './project-context';

export interface MotionIdiom {
  framework: TechStack['framework'];
  loadingPattern: string;       // one-sentence description of how to get GSAP onto the page
  cleanupPattern: string;       // one-sentence description of how to dispose timelines
  scopeBoundary: string;        // what "component lifecycle" maps to in this stack
  exampleSnippet: string;       // 10-25 line concrete code template
  notes: string[];              // 0-3 gotchas, performance hints, version caveats
}

export function getMotionIdiom(framework: TechStack['framework']): MotionIdiom;
```

`getMotionIdiom` falls back to the `vanilla` idiom when called with `'unknown'`. All other framework values have a matching record (verified by unit test).

## Detection rules (priority order)

`detectStackFromFilesystem(projectPath)` runs BEFORE the existing `package.json` sniff inside `detectTechStack`. It returns `'angular' | 'wordpress' | 'drupal' | 'hubspot' | null`. Null means "no CMS/Angular marker found - fall through to the package.json sniff."

Detection rules, in order. The first rule that matches wins:

1. **Angular** - `angular.json` exists at `projectPath`.
2. **WordPress** - `wp-config.php` exists, OR `style.css` exists and its first 50 lines contain a `Theme Name:` line. (The WordPress theme header is a standardized convention; `style.css` is mandatory in every theme.)
3. **Drupal** - `composer.json` exists and contains a `drupal/` package key under `require` or `require-dev`, OR any top-level `.info.yml` file exists. (Both are standard Drupal project signatures.)
4. **HubSpot** - `theme.json` exists with a HubSpot-specific top-level key (e.g., `cms`, `template_types`), OR a `hubl_modules/` directory exists, OR a file matching `hs-config*` exists at root. (HubSpot CLI conventions.)

If none match, return `null` and let the existing `package.json` detection run.

## Idiom catalog

The data module `motion-stack-idioms.ts` ships **one `MotionIdiom` record per framework value in the union (11 records covering the 12-value union, with `unknown` resolving to `vanilla` via the accessor rather than a duplicate record)**. Some records share their `exampleSnippet` text - react/next/remix all use the `useGSAP` hook pattern - but each framework gets its own entry so `getMotionIdiom(framework)` always returns a non-null record without needing an alias map. The full snippet text (~10-25 lines per snippet, with realistic GSAP API calls) is written in the implementation plan task for T2; this spec captures the structure and the per-stack pattern summary below.

| Framework key(s) | Loading | Cleanup | Scope boundary |
|---|---|---|---|
| `react`, `next`, `remix` | npm `gsap` + `@gsap/react`; `useGSAP` hook inside component | useGSAP auto-disposes | component unmount |
| `vue` | npm `gsap`; import in `<script setup>` | `onBeforeUnmount` + `ctx.revert()` | component unmount |
| `svelte` | npm `gsap`; import in `<script>` | `onMount` returns a cleanup fn that runs `ctx.revert()` | component unmount |
| `astro` | `<script>` in client island OR `is:inline` script | manual `ctx.revert()` on `astro:before-swap` event | page navigation (View Transitions API) |
| `angular` | npm `gsap`; import in `@Component`, use `gsap.context()` manually | `ngOnDestroy()` + `ctx.revert()` | component destroy |
| `wordpress` | `wp_enqueue_script('gsap', 'https://cdn...', [], '3.x', true)` in `functions.php`; in JS wrap in `(function($){ ... })(jQuery)` | `$(window).on('beforeunload', () => ctx.revert())` | page lifecycle |
| `drupal` | declare in `MODULE.libraries.yml` with GSAP as external dep; in JS use `Drupal.behaviors.X = { attach, detach }` | `detach(context)` runs `ctx.revert()` (also fires on AJAX content removal) | behavior detach |
| `hubspot` | HubSpot module's JS field + load GSAP via their template loader OR CDN; no jQuery dep | `window.addEventListener('pagehide', () => ctx.revert())` | page lifecycle |
| `vanilla` | `<script src="https://cdn...">` OR ES module import + `DOMContentLoaded` listener | manual `ctx.revert()` on `beforeunload` | page lifecycle |
| `unknown` | (fallback to `vanilla`) | | |

Two records (`hubspot` and `angular`) are the ones I'm least sure on - I'll write the snippets carefully and Jonah will eyeball them before the spec is locked. The others mirror well-documented standards.

## flowH handler integration

`sidecoach/src/flow-handler-motion-integration.ts` gains one import and one block appended to its guidance:

```typescript
import { getMotionIdiom } from './motion-stack-idioms';

// inside execute(), after the existing motion-domain guidance + DESIGN.md citations:
const framework = (context.metadata?.techStack as any)?.framework ?? 'unknown';
const idiom = getMotionIdiom(framework);
guidance.push(
  '',
  `Stack-specific implementation (framework=${framework}):`,
  `- Loading: ${idiom.loadingPattern}`,
  `- Cleanup: ${idiom.cleanupPattern}`,
  `- Scope boundary: ${idiom.scopeBoundary}`,
  '',
  'Example:',
  ...idiom.exampleSnippet.split('\n').map((l) => '  ' + l),
);
idiom.notes.forEach((n) => guidance.push(`- Note: ${n}`));

artifacts.push(
  this.createArtifact(
    'template',
    `Motion code template: ${framework}`,
    idiom.exampleSnippet,
    `${framework} idiom for GSAP loading + cleanup`
  )
);
```

All existing flowH output stays. The framework-aware block is purely additive. If `techStack` is missing entirely (e.g., a context without `metadata.techStack`), `framework` defaults to `'unknown'` and the catalog returns the `vanilla` idiom. No crash path.

## Tests

Three new test files, one per layer, mirroring Sprint 2's pattern:

1. **`sprint3-motion-stack-detection.test.ts`** - Detection unit test.
   - Creates four temp project dirs via `os.tmpdir()` + `fs.mkdtempSync`, populates each with the marker file for one stack (wp-config.php, angular.json, composer.json with `drupal/core`, theme.json with HubSpot fields).
   - Asserts `detectTechStack(tempPath).framework` returns the right value for each.
   - Regression case: a project with BOTH `wp-config.php` AND `package.json` containing `react` returns `'wordpress'` (proves CMS detection wins over package.json sniff).
   - Edge case: a project with NEITHER returns the existing `'vanilla'` fallback.

2. **`sprint3-motion-stack-idioms.test.ts`** - Data module unit test.
   - Iterates all framework values in the union, calls `getMotionIdiom(framework)` for each, asserts a non-null record is returned with all required string fields populated (no empty strings, no undefined).
   - Spot-checks at least 4 stacks' snippets contain stack-specific keywords: WordPress snippet has `wp_enqueue_script` OR `jQuery`; Drupal snippet has `Drupal.behaviors`; React snippet has `useGSAP`; vanilla snippet has `DOMContentLoaded` OR `<script>`.

3. **`sprint3-motion-stack-integration.test.ts`** - Handler integration test.
   - Instantiates `FlowHMotionIntegrationHandler` directly (handler-level test, not process()-path - the process()-path is covered by the existing T3 sprint3-process-path test).
   - Calls `handler.execute(ctx)` with two contexts (`metadata.techStack.framework = 'drupal'`, then `'wordpress'`).
   - Asserts each result's `guidance` joined string contains both the framework name AND a snippet keyword for that framework.
   - Asserts a `'template'` artifact named `Motion code template: <framework>` is present.

## Out of scope (filed as Sprint 3 follow-ups)

- Mixed-stack monorepo handling (e.g., a WordPress site that ALSO has a separate React app under `apps/`).
- Multi-stack composite recommendations (when both Angular and WordPress markers are present at root - falls back to whichever rule fires first in priority order).
- Closing the `flowW`/`flowX` intent-detector wiring gap that Sprint 3 prep flagged (see `session_2026-05-24_sprint3_prep_closed.md`).
- Snippet accuracy verification for Astro/Remix/Svelte/Vue (we ship the snippets per spec but they haven't been battle-tested in real Yes& engagements as of this design).
- Block editor (Gutenberg) work that lives inside a WordPress project but uses React idioms. Phase 4 emits the WordPress idiom for WordPress projects; React-in-WordPress is a future task.
- Detecting the `animationLib` per-stack (e.g., WordPress with GSAP already enqueued vs WordPress without). Current detection only sniffs `package.json` for animationLib; CMS-loaded GSAP via CDN won't be detected. Out of scope for this sprint.

## Estimated tasks (will become the implementation plan)

1. **T1** Extend `TechStack.framework` union + add `detectStackFromFilesystem()` helper + detection priority + unit test. (1 modified file, 1 new test)
2. **T2** Build `motion-stack-idioms.ts` data module with 9 idiom records + accessor + unit test. (1 new file, 1 new test)
3. **T3** Update `flow-handler-motion-integration.ts` to consume idioms + emit stack-specific guidance and artifact + handler integration test. (1 modified file, 1 new test)
4. **T4** Full Sprint 1+2+3 prep+3 proper suite green check + sprint-close memory + MEMORY.md index entry.

4 tasks (the original Phase 4 estimate). T4 doesn't get its own integration test - the three task-level tests in T1-T3 plus the existing `sprint3-process-path.test.ts` (which already exercises flowH through `engine.process()`) cover the surface.

## Files

**New (5):**
- `sidecoach/src/motion-stack-idioms.ts`
- `sidecoach/src/__tests__/sprint3-motion-stack-detection.test.ts`
- `sidecoach/src/__tests__/sprint3-motion-stack-idioms.test.ts`
- `sidecoach/src/__tests__/sprint3-motion-stack-integration.test.ts`
- `.claude/memory/session_2026-05-24_sprint3_proper_closed.md`

**Modified (3):**
- `sidecoach/src/project-context.ts` (extend union + add detection helper)
- `sidecoach/src/flow-handler-motion-integration.ts` (consume idioms, emit stack-specific block)
- `.claude/memory/MEMORY.md` (add Sprint 3 proper close index entry)

## Open questions resolved during brainstorming

- **Q: What should flowH do differently per stack?** A: Emit framework-appropriate code patterns. Same animation intent, idiom-correct code.
- **Q: Where does Yes& open Claude in CMS projects?** A: At the CMS root (containing wp-config.php / theme.json / composer.json + drupal/* / etc.). Detection sniffs top-level markers.
- **Q: GSAP everywhere or CSS-first for CMSes?** A: GSAP everywhere, adapt the loading + cleanup idiom. One canonical toolchain across engagements.

## Risk / confidence flags

- **High confidence:** detection priority logic, the React/WordPress/Drupal idiom snippets (all reference well-documented standard patterns), the additive nature of the flowH change (existing output preserved).
- **Medium confidence:** the HubSpot script-loader snippet (their docs are sparse on motion patterns) and the Angular `gsap.context()` integration snippet (no canonical "useGSAP for Angular" exists, so the lifecycle wrapper is hand-rolled). Jonah will spot-check both before they ship.
- **Lower confidence:** Astro/Svelte/Vue snippet accuracy in real engagements - these go in per spec but haven't been validated.

## Next step

Invoke the `superpowers:writing-plans` skill to convert this spec into a task-by-task implementation plan (~4 tasks per the estimate above).
