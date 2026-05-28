#!/usr/bin/env bash
# T-0022 extension smoke test - live JSON-RPC exchange against the 5 new
# tools (state_set/get/delete/list_keys + ast_grep).
#
# Usage:  bash __tests__/smoke-t0022.sh [path/to/index.js]

set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ENTRY="${1:-$HERE/../dist/index.js}"

if [[ ! -f "$ENTRY" ]]; then
  echo "ERROR: server entry not found at $ENTRY (run npm run build first)" >&2
  exit 2
fi

(
cat <<EOF
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke-shell-t0022","version":"0.0.0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"sidecoach_state_set","arguments":{"key":"smoke:project","value":"sidecoach-mcp","ttlMs":600000}}}
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"sidecoach_state_set","arguments":{"key":"smoke:phase","value":"t0022-extension","ttlMs":600000}}}
{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"sidecoach_state_list_keys","arguments":{"prefix":"smoke:"}}}
{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"sidecoach_state_get","arguments":{"key":"smoke:project"}}}
{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"sidecoach_state_delete","arguments":{"key":"smoke:phase"}}}
{"jsonrpc":"2.0","id":8,"method":"tools/call","params":{"name":"sidecoach_state_list_keys","arguments":{"prefix":"smoke:"}}}
{"jsonrpc":"2.0","id":9,"method":"tools/call","params":{"name":"sidecoach_ast_grep","arguments":{"pattern":"export const definition","language":"typescript","path":"src/tools","maxResults":20}}}
{"jsonrpc":"2.0","id":10,"method":"tools/call","params":{"name":"sidecoach_state_set","arguments":{"key":"","value":"v"}}}
EOF
sleep 0.5
) | SIDECOACH_MCP_LOG_LEVEL=warn SIDECOACH_PROJECT_ROOT="$HERE/.." node "$ENTRY"
