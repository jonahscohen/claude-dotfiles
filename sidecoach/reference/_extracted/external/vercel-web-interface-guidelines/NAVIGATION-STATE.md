---
name: Navigation & URL-State Guidelines
description: URL-as-state rules from the Vercel Web Interface Guidelines - persist filters/tabs/pagination in the URL, deep-linkable UI, scroll restoration, real links, safe destructive actions, optimistic updates
source: https://github.com/vercel-labs/web-interface-guidelines
source_license: MIT
type: reference
domain: navigation
extracted: 2026-05-28
extracted_by: Jonah
source_note: Vercel Labs web interface guidelines, navigation/URL-state subset; React/Next-flavored (nuqs), down-weight to advisory for vanilla
---

# Navigation & URL-State Guidelines

Navigation and URL-as-state rules distilled into Sidecoach's reference layer. These are React/Next-flavored in places (the nuqs library is the idiomatic tool there); down-weight them to advisory for vanilla output, where `URLSearchParams` and the History API cover the same ground.

## Source

The patterns below distilled from the Vercel Web Interface Guidelines navigation section.

## URL as State

- Persist meaningful UI state in the URL: active filters, selected tab, pagination page/cursor, sort order, and expanded panels. A teammate pasting the URL should see the same view.
- Treat the URL as the source of truth for that state; derive component state from it on load rather than holding a separate copy that can drift.
- Keep transient, non-shareable state (hover, focus, in-progress text) out of the URL.
- In React/Next, `nuqs` binds `useState`-style hooks to query params. In vanilla, read/write with `URLSearchParams` and `history.replaceState` / `history.pushState`.

```js
/* vanilla: reflect a filter in the URL without a full navigation */
function setFilter(key, value) {
  const url = new URL(location.href);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  history.replaceState(null, '', url); /* replaceState for filter tweaks; pushState for distinct views */
}
function readFilter(key) {
  return new URLSearchParams(location.search).get(key);
}
```

- Use `replaceState` for incremental tweaks (typing in a filter) so you do not flood the back stack; use `pushState` for distinct navigable views (changing tab, opening a detail panel) so Back works as expected.

## Deep-Linking useState-Backed UI

- Any UI a user might want to share or bookmark (a specific tab, an opened accordion section, a filtered table) must be reachable directly from a URL, not only by clicking through from a default state.
- On load, hydrate the UI from the URL before first paint where possible so the deep-linked state does not flash the default first.

## Scroll-Position Restoration

- Restore scroll position on back/forward navigation so returning to a list lands where the user left it.
- Browsers do this natively when you let them: set `history.scrollRestoration = 'auto'` (the default) and avoid clobbering it. Only switch to `'manual'` if you are managing scroll yourself, and then you must restore it explicitly.

```js
/* manual restoration keyed to history state */
history.scrollRestoration = 'manual';
addEventListener('scroll', () => history.replaceState({ y: scrollY }, ''));
addEventListener('popstate', (e) => scrollTo(0, e.state?.y ?? 0));
```

## Links Must Be Real Links

- Anything that navigates must be an `<a>` (or framework `<Link>`), not a `<div>`/`<button>` with an onClick. Real links give cmd/ctrl-click (open in new tab), middle-click, right-click "open in new tab", and "copy link address" for free.
- A `button` that calls `router.push` breaks all of the above and is an accessibility regression. Reserve `button` for in-page actions that do not change the URL.
- Use `<Link prefetch>` (Next) or `rel="prefetch"` hints judiciously for likely next navigations.

## Destructive Actions Need Confirm or Undo

- A destructive navigation or action (delete, leave-without-saving, irreversible state change) must be guarded by either a confirmation step or an undo affordance.
- Prefer undo (optimistic delete plus a timed "Undo" toast) over a blocking confirm dialog where the operation is reversible within a short window; fall back to confirm when it truly cannot be undone.

## Optimistic Updates With Rollback

- Apply the expected result immediately for snappy navigation/state changes, then reconcile with the server response.
- On failure, roll back to the prior state and surface the error inline; never leave the optimistic state stuck if the request failed.
- Only go optimistic when the operation is reversible and failure is recoverable; for irreversible operations, wait for confirmation.

```js
/* optimistic toggle with rollback */
const prev = item.starred;
item.starred = !prev; render();
try { await api.setStar(item.id, item.starred); }
catch (err) { item.starred = prev; render(); showError('Could not update. Try again.'); }
```

## Sidecoach Application

- Surface these rules in Flow M (responsive/navigation validation) and wherever navigation state is generated.
- React/Next idioms (nuqs, `<Link>`, `router`) are advisory for vanilla output; the `URLSearchParams` + History API equivalents above are the required baseline there.
- Down-weight nuqs-specific guidance to advisory; keep the URL-as-state, real-links, scroll-restoration, destructive-guard, and optimistic-rollback principles as the cross-stack requirements.
