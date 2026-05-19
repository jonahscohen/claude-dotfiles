---
name: session-2026-05-19-https-for-safari
description: Added HTTPS listener to improv WS server with auto-generated self-signed cert so Safari (and strict Chrome) can load the bundle on HTTPS pages without mixed-content blocking. One-time setup-cert.sh trusts the cert in macOS Keychain.
type: project
relates_to: [session_2026-05-18_cache-block.md, decision_improv_http_polling_watch.md]
---

## 2026-05-19 HTTPS for the improv WS server (Safari fix)

### Why
User opened dishplayscapes in Safari and got `The page at https://dish-playscapes.lndo.site/ requested insecure content from http://localhost:9223/improv-core.js. This content was blocked` - Safari's mixed-content blocker is stricter than Chrome's. The improv toolbar never loaded because the bundle script tag was silently rejected.

### Fix

**`improv/server/ws-server.ts`**:
- Imports: added `createServer as createHttpsServer, type Server as HttpsServer` from 'https', plus `mkdirSync` from 'fs'.
- New private field `httpsServer: HttpsServer | null` + `httpsPort: number | null`.
- `start()` now starts HTTPS on `port + 1` (9224 by default) AFTER successful HTTP listen, wrapped in try/catch so HTTPS failure doesn't kill HTTP-only mode.
- New `tryListenHttps(port)` method - mirrors `tryListen` but uses `createHttpsServer` with the auto-generated cert and re-uses the same `handleHttpRequest` handler.
- New `ensureCert()` method - generates a self-signed cert + key at `dist/server/certs/{cert.pem, key.pem}` on first run via openssl + a written-out openssl.cnf (LibreSSL on macOS doesn't support `-addext`, must use config file for subjectAltName).
- Cert spec: 2048-bit RSA, 10-year validity, CN=localhost, subjectAltName covers `DNS:localhost,IP:127.0.0.1`, extendedKeyUsage=serverAuth.

**`improv/setup-cert.sh`** (new):
- One-time script. Runs `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain` on the auto-generated cert.
- After this, Safari/Chrome trust the cert silently; bundle loads from `https://localhost:9224/improv-core.js` with no warnings, no click-through.
- User runs once per machine. Cert persists across rebuilds (it lives in dist/server/certs/, not in the bundled JS).

**`improv/cli/init.sh`**:
- `IMPROV_URL` default flipped from `http://localhost:9223/...` to `https://localhost:9224/...` for new installs.

**`dishplayscapes/wp-content/themes/dish-wp/functions.php`**:
- Enqueue URL flipped to `https://localhost:9224/improv-core.js`. With cert trusted via setup-cert.sh, Safari now loads the bundle silently.

### User's one-time steps
1. Quit Claude Code (Cmd+Q). This kills the current improv MCP server.
2. Reopen Claude Code. The new MCP server starts, runs `ensureCert()` which generates `~/.claude/improv/dist/server/certs/cert.pem` and starts HTTPS on 9224.
3. Run `bash ~/Documents/Github/claude-dotfiles/improv/setup-cert.sh`. Prompts for admin password ONCE. Adds cert to System Keychain as trustRoot.
4. Reload Safari (or Chrome) on dishplayscapes. Improv toolbar loads silently.

After step 3, no further trust prompts, no click-throughs. Other dev machines repeat steps 1-3 once each.

### Why self-signed over mkcert
User explicitly chose self-signed (no Homebrew dependency, no separate CA install step). Trade-off accepted: one admin-password prompt at setup-cert.sh time. After that, equivalent to mkcert UX.

### Why HTTPS on port+1 instead of replacing HTTP
Backward compatibility. Existing installs pointing at `http://localhost:9223` keep working. New installs / SSL-required sites use HTTPS. The same `handleHttpRequest` (with Cache-Control: no-store and query-string strip from yesterday) serves both.

### Files changed
- `improv/server/ws-server.ts` (HTTPS listener, ensureCert)
- `improv/setup-cert.sh` (new, executable, trusts cert via sudo)
- `improv/cli/init.sh` (default URL flipped to HTTPS)
- `dishplayscapes/wp-content/themes/dish-wp/functions.php` (enqueue URL flipped)
- Server rebuilt via `npm run deploy`; dist synced to `~/.claude/improv/dist/server/`

### What still needs to happen
The MCP server is still running the OLD compiled code (no HTTPS, no ensureCert). User must restart Claude Code for the new server to take effect. Same Node module-cache constraint as before.

Collaborator: Jonah Cohen
