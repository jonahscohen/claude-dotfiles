#!/usr/bin/env bash
# T-0025 Python REPL extension smoke test - live JSON-RPC exchange exercising
# the containerized python tool. Mirrors smoke-t0022.sh / smoke-t0026.sh.
#
# The tool requires a container runtime (docker or podman) on PATH. With the
# daemon up you see a real `print(2+2)` -> "4" round-trip; a forbidden import
# is rejected by the static screen; a network attempt is blocked by
# --network none. With no runtime, every call degrades to a structured
# DOWNSTREAM_UNAVAILABLE - itself a valid, graceful outcome this test shows.
#
# Usage:  bash __tests__/smoke-t0025.sh [path/to/index.js]

set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ENTRY="${1:-$HERE/../dist/index.js}"

if [[ ! -f "$ENTRY" ]]; then
  echo "ERROR: server entry not found at $ENTRY (run npm run build first)" >&2
  exit 2
fi

(
cat <<EOF
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke-shell-t0025","version":"0.0.0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"sidecoach_python_repl_execute","arguments":{"code":"print(2 + 2)"}}}
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"sidecoach_python_repl_execute","arguments":{"code":"import os\nprint(os.getcwd())"}}}
{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"sidecoach_python_repl_execute","arguments":{"code":"import urllib.request\ntry:\n    urllib.request.urlopen('http://example.com', timeout=3)\n    print('REACHED_NETWORK')\nexcept Exception as e:\n    print('BLOCKED:', type(e).__name__)\n","timeoutMs":9000}}}
{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"sidecoach_python_repl_execute","arguments":{"code":""}}}
EOF
sleep 8
) | SIDECOACH_MCP_LOG_LEVEL=warn SIDECOACH_PROJECT_ROOT="$HERE/.." node "$ENTRY"
