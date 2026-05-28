# sidecoach-mcp-server

Hardened Model Context Protocol server exposing sidecoach's design-
orchestration capabilities (registries, keyword resolution, validators, cost
ledger, cheatsheet) as MCP tools.

The server is rule-based and read-mostly. It does NOT call any LLM by itself;
it presents the rule-based building blocks that sidecoach uses today as
callable tools, so an MCP client (Claude Code, the desktop app, a test
harness) can invoke them directly.

This file documents installation, configuration, and the tool catalog. The
architecture decisions live in `DESIGN.md` next door.

---

## Install

```
cd sidecoach/mcp-server
npm install
npm run build
```

The build prerequisite is that the parent `sidecoach` package is itself built.
The MCP server imports from `../../dist/` rather than `../../src/` so the
mcp-server's build does not depend on the parent's source compiling cleanly.

```
cd sidecoach
npm run build
cd mcp-server
npm run build
```

The built entry is `sidecoach/mcp-server/dist/index.js` with a node shebang
and executable bit set. Smoke-test it manually:

```
node dist/index.js < /dev/null
# server boots, logs to stderr, exits on EOF
```

---

## Configure (wire it up to Claude Code)

Claude Code reads MCP server definitions from two places:

1. `~/.claude/settings.json` under the `mcpServers` key (global).
2. `.mcp.json` in the current working directory (per-project).

Either of these snippets works. The absolute-path version is portable across
machines that have this dotfiles checkout at the same path; the env-var
version is portable across users.

### Snippet A - absolute path (this machine)

```json
{
  "mcpServers": {
    "sidecoach": {
      "command": "node",
      "args": [
        "/Users/spare3/Documents/Github/claude-dotfiles/sidecoach/mcp-server/dist/index.js"
      ],
      "env": {
        "SIDECOACH_MCP_LOG_LEVEL": "info"
      }
    }
  }
}
```

### Snippet B - env-var-driven (portable)

```json
{
  "mcpServers": {
    "sidecoach": {
      "command": "node",
      "args": [
        "${DOTFILES_ROOT}/sidecoach/mcp-server/dist/index.js"
      ],
      "env": {
        "SIDECOACH_MCP_LOG_LEVEL": "info"
      }
    }
  }
}
```

After editing settings.json, restart your Claude Code session so the host
re-spawns the MCP server and reads the new config.

### Env vars

| Variable | Default | Purpose |
|---|---|---|
| `SIDECOACH_MCP_LOG_LEVEL` | `info` | One of `error` / `warn` / `info` / `debug`. Higher = more verbose stderr logs. |
| `SIDECOACH_MCP_TIMEOUT_MS` | `30000` | Default per-tool timeout in milliseconds. Per-tool timeouts override this (5s for read tools, 30s for validators). |
| `SIDECOACH_PROJECT_ROOT` | `process.cwd()` | Filesystem boundary for `sidecoach_ast_grep`. Any `path` argument is resolved against this root, realpath-followed, and rejected if it escapes via `..` or a symlink that points outside. Set to your repo root when launching the server so `ast_grep` queries scope to your project. Wrong value (missing dir, file instead of dir) returns `INVALID_INPUT` on the first ast_grep call. |

---

## Tool catalog

All tools use the `sidecoach_` prefix. None of these tools mutate sidecoach
state (the cost ledger is read-only from this surface).

### `sidecoach_list_verbs`

Return all 22 sidecoach verbs from the canonical registry.

- Input: `{ phase?: string }` (optional phase filter)
- Output: `{ count, total, verbs: [{ verb, pattern, phase, description, oneLineExplanation }] }`
- Errors: `DOWNSTREAM_UNAVAILABLE` if `claude/hooks/sidecoach-verbs.json` is missing.
- Timeout: 5s.

### `sidecoach_list_modes`

Return all 5 sidecoach modes (forge / kiln / bloom / canvas / trim).

- Input: `{}` (no params)
- Output: `{ count, modes: [{ mode, pattern, description, oneLineExplanation, chain }] }`
- Errors: none in normal operation.
- Timeout: 5s.

### `sidecoach_list_flows`

Return all flows from `sidecoach/src/flows.ts` with their model-routing config.

- Input: `{ tier?: number, idPrefix?: string }`
- Output: `{ count, total, flows: [{ id, name, description, tier, modelConfig }] }`
- Errors: `DOWNSTREAM_UNAVAILABLE` if flow registry could not be loaded.
- Timeout: 5s.

### `sidecoach_resolve_keyword`

Resolve a free-text phrase against the verb/mode registries using the same
sanitize + word-boundary + informational-suppression logic as the
UserPromptSubmit hook.

- Input: `{ phrase: string }` (1-4000 chars)
- Output: `{ match: { kind: "verb"|"mode"|"none", name?, chain?, reason? } }`
- Errors: `INVALID_INPUT` (empty/too long), `DOWNSTREAM_UNAVAILABLE` (both registries empty).
- Timeout: 5s.

### `sidecoach_validate_polish_standard`

Run the 22-Point Polish Standard validator against provided HTML / CSS /
design tokens.

- Input: `{ html?, css?, designTokens?, contextOverrides? }` (at least one of html/css/designTokens required)
- Output: `{ report: PolishValidationReport }`
- Errors: `INVALID_INPUT` (all-empty), `VALIDATOR_FAILURE` (validator throw).
- Timeout: 30s.

### `sidecoach_validate_extended_domain`

Run the 112-rule Extended Domain validator across 10 design domains.

- Input: `{ html?, css?, designTokens?, typography?, colors?, spacing?, motion?, accessibility?, contrast?, performance?, visualization?, internationalization? }`
- Output: `{ report: DomainValidationReport }` - `status: "skipped"` if no inputs provided.
- Errors: `VALIDATOR_FAILURE`.
- Timeout: 30s.

### `sidecoach_validate_taste`

Run the taste validator (anti-AI-slop heuristics).

- Input: `{ html: string, css?: string, iconLibrary?: string }`
- Output: `{ violationCount, violations, formatted }`
- Errors: `INVALID_INPUT` (missing html), `VALIDATOR_FAILURE`.
- Timeout: 30s.

### `sidecoach_get_cost_ledger`

Read the in-process session cost ledger from model-routing.

- Input: `{ format?: "raw"|"summary" }` (default `summary`)
- Output: `{ format, totals: { calls, inputTokens, outputTokens, estimatedCostUsd }, entries, summary }`
- Errors: `VALIDATOR_FAILURE` if the ledger module fails (defense in depth).
- Timeout: 5s.

### `sidecoach_get_cheatsheet`

Return the CHEATSHEET.md content, optionally filtered to one section.

- Input: `{ section?: "modes"|"verbs"|"flows"|"routing"|"all" }` (default `all`)
- Output: `{ section, source, content }`
- Errors: `DOWNSTREAM_UNAVAILABLE` if CHEATSHEET.md missing or section unknown.
- Timeout: 5s.

### `sidecoach_get_flow_metadata`

Return metadata for a single flow by ID.

- Input: `{ flowId: string }`
- Output: `{ flow: { id, name, description, triggers, tier, modelConfig } }`
- Errors: `INVALID_INPUT` if flowId is unknown.
- Timeout: 5s.

### `sidecoach_state_set` (T-0022)

Write a key/value pair to the in-process MCP session state store.

- Input: `{ key: string, value: string, ttlMs?: number }`
- Output: `{ key, expiresAt, totalEntries }`
- Caps: key 4 KiB, value 64 KiB, TTL 1ms..24h (default 30 min), total entries 1000.
- Errors: `INVALID_INPUT` (oversize key/value/TTL), `VALIDATOR_FAILURE` (store at total-entry cap).
- Timeout: 5s.
- Lifetime: the store lives on the MCP server's process heap. New stdio
  connection = new process = empty store. No on-disk artifact.

### `sidecoach_state_get` (T-0022)

Read a key from the state store. Missing or expired keys return `value: null`.

- Input: `{ key: string }`
- Output: `{ key, value: string | null, expiresAt? }`
- Errors: `INVALID_INPUT` (oversize key). Missing keys are NOT errors.
- Timeout: 5s.
- Expiry is lazy: a read on an expired key drops it and returns null.

### `sidecoach_state_delete` (T-0022)

Drop a key from the state store. Deleting a missing key is idempotent.

- Input: `{ key: string }`
- Output: `{ key, deleted: boolean }`
- Errors: `INVALID_INPUT` (oversize key).
- Timeout: 5s.

### `sidecoach_state_list_keys` (T-0022)

Enumerate currently-live keys. Optional prefix filter. Capped at 100 keys per call.

- Input: `{ prefix?: string }`
- Output: `{ keys: [{ key, expiresAt }], totalMatches, truncated }`
- Errors: `INVALID_INPUT` (oversize prefix).
- Timeout: 5s.

### `sidecoach_ast_grep` (T-0022)

Run an [ast-grep](https://ast-grep.github.io/) pattern search over project source.

- **Prerequisite:** the `ast-grep` CLI must be on PATH. Install via `brew install ast-grep` or `cargo install ast-grep`. Missing binary returns `DOWNSTREAM_UNAVAILABLE`.
- Input: `{ pattern: string, language?: enum, path?: string, maxResults?: number }`
- Output: `{ pattern, language, path, projectRoot, matchCount, truncated, matches: [{ file, startLine, endLine, startColumn, endColumn, text, language }], durationMs, linesSeen, linesSkipped }`
- Path scoping: relative paths resolve against `SIDECOACH_PROJECT_ROOT` (defaults to cwd). Absolute paths must resolve inside the root. Symlinks are followed before comparison. `..` escape attempts are rejected.
- Caps: 10s timeout, max 100 results (default 50), per-match text capped at 500 chars with `...[truncated]` suffix, max 4 MiB stdout buffered.
- Errors: `DOWNSTREAM_UNAVAILABLE` (binary missing or vanished mid-call), `INVALID_INPUT` (path escape), `TIMEOUT` (slow query), `VALIDATOR_FAILURE` (CLI non-zero exit).
- Search-only - no replace. T-0022 v1 ships search; replace will land in a follow-up if demand surfaces.

---

## Error taxonomy

Every tool error response uses the shape `{ isError: true, content: [{ type: "text", text: <JSON> }] }` where the JSON body is a `ToolError`:

```ts
{
  code: "INVALID_INPUT" | "DOWNSTREAM_UNAVAILABLE" | "VALIDATOR_FAILURE" | "TIMEOUT" | "INTERNAL_ERROR",
  message: string,
  // optional context per code:
  validationIssues?: ValidationIssue[],
  resource?: string,
  validator?: string,
  errorMessage?: string,
  timeoutMs?: number,
  requestId?: string,
}
```

Clients should `JSON.parse(content[0].text)` to handle errors programmatically.

---

## Logging

Structured JSON-per-line to stderr. stdout is reserved for JSON-RPC framing.
Set `SIDECOACH_MCP_LOG_LEVEL=debug` for stack traces on internal errors.

The logger explicitly does NOT log tool input bodies or output bodies (only
byte counts) so HTML/CSS that contains user data does not land on disk via
log redirection. Apparent secrets (Bearer tokens, `api_key=` patterns,
`sk-...` strings) are redacted defensively from any error message before
logging.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot find module ../../dist/flows` | Parent sidecoach not built | `cd sidecoach && npm run build` |
| `sidecoach is not connected` in Claude Code | settings.json snippet has wrong path | Verify the absolute path resolves; restart session |
| All tool calls return `DOWNSTREAM_UNAVAILABLE` | Registries failed to load (check stderr at startup) | Confirm `claude/hooks/sidecoach-verbs.json` exists and is readable |
| Tools time out | A validator is genuinely slow on a pathological input | Increase `SIDECOACH_MCP_TIMEOUT_MS` for that session, or shrink the input |
| `tools/list` returns 0 tools | `npm install` skipped | `npm install && npm run build` |

---

## Development

```
npm test               # runs unit + integration + fault-injection
npm run test:unit
npm run test:integration
npm run test:fault
```

Unit tests do not touch the SDK. Integration tests spin up either an
in-memory transport pair or a real subprocess (see
`__tests__/integration/stdio.test.ts`).

Architecture decisions are documented in `DESIGN.md`. Read it before making
non-trivial changes to the server's surface or error taxonomy.
