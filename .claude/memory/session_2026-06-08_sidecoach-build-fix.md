---
name: Fixed sidecoach tsc build error (t16 bench test rootDir)
description: sidecoach `npm run build` was failing on TS6059; excluded the bench test from the build like its t13 sibling already was
type: project
relates_to: [session_2026-06-08_rename-to-improv-plan.md]
---

Collaborator: Jonah. 2026-06-08.

`cd sidecoach && npm run build` (tsc) failed with TS6059: `src/__tests__/t16-bench-ledger.test.ts` imports `../../benchmarks/runner/run-all` and `score`, which live OUTSIDE `rootDir: ./src`. Pre-existing (NOT caused by the claude-dotfiles -> Improv rename).

**Root cause + fix:** the project already excludes the analogous `src/__tests__/t13-bench-harness.test.ts` from `tsconfig.json` for the exact same reason - those bench tests reach into `benchmarks/` and are compiled/run via a SEPARATE `benchmarks/tsconfig.bench.json` (`npm run test:bench` uses ts-node with that project), never the main build. `t16` was just never added to the exclude list. Fix = add `"src/__tests__/t16-bench-ledger.test.ts"` to `tsconfig.json` `exclude` (one line, mirroring t13).

**Verified:** `npm run build` exit 0, tsc clean. Clean rebuild (`rm -rf dist && tsc`) -> 196 dist .js, `dist/intent-detector.js` (package main) present, 0 `claude-dotfiles` in dist, improv paths intact. Git delta = tsconfig.json (M) + removal of 5 orphaned `dist/__tests__/t16-bench-ledger.*` compiled artifacts (they had been committed before the exclude and were the source of an earlier stale-path warning). 196 production files byte-identical to committed -> nothing else changed.

Note: there is a separate `sidecoach/mcp-server` build; not part of this error.

Files: sidecoach/tsconfig.json; removed stale sidecoach/dist/__tests__/t16-bench-ledger.* + a fixture.
