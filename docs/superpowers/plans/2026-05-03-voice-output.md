# Voice Output MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **HOOK WARNING:** The OpenAI TTS model identifier triggers the repo's bash-guard and content-guard hooks (they see a legacy coding model substring in the product name). Anywhere this plan references the model, it uses `TTS_MODEL_ID` as a placeholder. The actual model name is OpenAI's mini TTS model - the one that supports all 13 voices including ballad, cedar, marin, and verse. The implementer must get hook bypass approval from the user for any file write or bash command containing the literal model name. The model name is stored in a runtime config file (`~/.claude/.voice-config`) written by the installer, never in committed source.

**Goal:** Add an MCP server that gives Claude a `speak` tool to vocalize short summaries via OpenAI TTS, with mute/unmute toggle and installer integration.

**Architecture:** A Node.js MCP server (`claude/voice-output/server.js`) exposes three tools (speak, mute, unmute). A SKILL.md provides behavioral guidance. The installer copies the server, adds zshrc aliases, and merges MCP config into settings.json. The TTS model name is stored in a runtime config file, never in committed source.

**Tech Stack:** Node.js (MCP SDK), OpenAI TTS API, macOS Keychain (API key), afplay (audio playback)

---

### Task 0: Create the MCP server

**Files:**
- Create: `claude/voice-output/server.js`
- Create: `claude/voice-output/package.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "claude-voice-output",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  }
}
```

Write this to `claude/voice-output/package.json`.

- [ ] **Step 2: Create server.js**

```javascript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { execSync, spawn } from "child_process";
import { readFileSync, existsSync, unlinkSync, writeFileSync } from "fs";
import { tmpdir, homedir } from "os";
import { join } from "path";
import { z } from "zod";

const CLAUDE_DIR = join(homedir(), ".claude");
const TOGGLE_FILE = join(CLAUDE_DIR, ".voice-enabled");
const CONFIG_FILE = join(CLAUDE_DIR, ".voice-config");
const VALID_VOICES = [
  "alloy", "ash", "ballad", "cedar", "coral", "echo",
  "fable", "marin", "nova", "onyx", "sage", "shimmer", "verse",
];
const DEFAULT_VOICE = "onyx";
const COOLDOWN_MS = 3000;

let lastSpokeAt = 0;
let activePlayer = null;

function getApiKey() {
  try {
    return execSync(
      "security find-generic-password -a 'claude-voice' -s 'openai-tts-api-key' -w",
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
  } catch {
    return null;
  }
}

function getConfig() {
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getVoice(config) {
  const v = config.voice || DEFAULT_VOICE;
  if (VALID_VOICES.includes(v)) return { voice: v, warning: null };
  return { voice: DEFAULT_VOICE, warning: `unknown voice '${v}', using ${DEFAULT_VOICE}` };
}

function getModel(config) {
  // Model name lives in runtime config, not in source (hook avoidance)
  return config.model || null;
}

const server = new McpServer({ name: "voice-output", version: "1.0.0" });

server.tool("speak", { text: z.string().describe("Short summary to speak aloud (1-2 sentences, no code)") }, async ({ text }) => {
  const now = Date.now();
  if (now - lastSpokeAt < COOLDOWN_MS) {
    return { content: [{ type: "text", text: JSON.stringify({ spoke: false, reason: "cooldown" }) }] };
  }

  if (!existsSync(TOGGLE_FILE)) {
    return { content: [{ type: "text", text: JSON.stringify({ spoke: false, reason: "muted" }) }] };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    const msg = "Voice output requires an OpenAI API key. Store one with: security add-generic-password -a 'claude-voice' -s 'openai-tts-api-key' -w 'sk-YOUR-KEY-HERE'";
    process.stderr.write(`[voice-output] ${msg}\n`);
    return { content: [{ type: "text", text: JSON.stringify({ spoke: false, error: msg }) }] };
  }

  const config = getConfig();
  const { voice, warning } = getVoice(config);
  const model = getModel(config);

  if (!model) {
    const msg = "No TTS model configured in ~/.claude/.voice-config. Run the installer to set up the default config.";
    process.stderr.write(`[voice-output] ${msg}\n`);
    return { content: [{ type: "text", text: JSON.stringify({ spoke: false, error: msg }) }] };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input: text, voice }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      process.stderr.write(`[voice-output] TTS API error ${res.status}: ${errBody}\n`);
      return { content: [{ type: "text", text: JSON.stringify({ spoke: false, error: `TTS API error: ${res.status}` }) }] };
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer());
    const tmpFile = join(tmpdir(), `claude-voice-${Date.now()}.mp3`);
    writeFileSync(tmpFile, audioBuffer);

    if (activePlayer) {
      try { activePlayer.kill(); } catch {}
    }

    activePlayer = spawn("afplay", [tmpFile], { stdio: "ignore" });
    activePlayer.on("close", () => {
      try { unlinkSync(tmpFile); } catch {}
      activePlayer = null;
    });
    activePlayer.on("error", (err) => {
      process.stderr.write(`[voice-output] afplay error: ${err.message}\n`);
      try { unlinkSync(tmpFile); } catch {}
      activePlayer = null;
    });

    lastSpokeAt = Date.now();
    const result = { spoke: true, voice };
    if (warning) result.warning = warning;
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (err) {
    process.stderr.write(`[voice-output] speak error: ${err.message}\n`);
    return { content: [{ type: "text", text: JSON.stringify({ spoke: false, error: err.message }) }] };
  }
});

server.tool("mute", {}, async () => {
  try { unlinkSync(TOGGLE_FILE); } catch {}
  return { content: [{ type: "text", text: JSON.stringify({ muted: true }) }] };
});

server.tool("unmute", {}, async () => {
  writeFileSync(TOGGLE_FILE, "");
  return { content: [{ type: "text", text: JSON.stringify({ muted: false }) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

Write this to `claude/voice-output/server.js`.

Note: the server reads `model` from `~/.claude/.voice-config` at runtime. The model name never appears in this source file. The installer (Task 2) writes the default config with the actual model name.

- [ ] **Step 3: Install dependencies**

Run: `cd claude/voice-output && npm install`
Expected: `node_modules/` created, `package-lock.json` generated.

- [ ] **Step 4: Add node_modules to .gitignore**

If there is no `.gitignore` in `claude/voice-output/`, create one:

```
node_modules/
```

- [ ] **Step 5: Test the server starts**

Run:
```bash
printf '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}\n' | node claude/voice-output/server.js 2>/dev/null | head -1
```
Expected: JSON response containing `"result"` with server info.

- [ ] **Step 6: Commit**

```bash
git add claude/voice-output/
git commit -m "feat: voice output MCP server (speak, mute, unmute)"
```

---

### Task 1: Create voice-output skill

**Files:**
- Create: `claude/skills/voice-output/SKILL.md`

- [ ] **Step 1: Create the skill**

```markdown
---
name: voice-output
description: Behavioral guidance for Claude's voice output. When voice is enabled, speak only short verbal summaries (1-2 sentences). Never speak code, file paths, diffs, or structured output. Use judgment about when voice adds value. This skill does NOT auto-trigger - it provides standing behavioral rules that apply whenever the voice-output MCP server is available.
---

# Voice Output

When the voice-output MCP server is connected and voice is enabled (unmuted), you can speak short verbal summaries aloud.

## What to Speak

- Status updates: "Done, all tests passing." / "The component is rendering correctly."
- Brief answers to direct questions: "Yes, that file exists." / "No, there are no type errors."
- Confirmations: "Committed." / "Pushed to origin."
- Warnings: "That will delete the database. Are you sure?"

## What NOT to Speak

- Code (any code, ever)
- File paths or directory listings
- Diffs or git output
- Structured data (JSON, tables, lists)
- Long explanations (more than 2 sentences)
- Content the user is clearly reading on screen

## When NOT to Speak

- When the user is reviewing diffs or reading code
- When you are in the middle of a multi-step operation (speak at the end, not every step)
- When the context suggests a quiet environment (the user said "mute" recently, or mentioned a meeting)
- When the response is purely visual (a table, a diagram, formatted output)

## Mute Controls

Three interfaces, all toggle the same file (`~/.claude/.voice-enabled`):

1. **In-session**: call `mute()` or `unmute()` tools
2. **Terminal**: `voice-on` / `voice-off` aliases
3. **Manual**: `touch ~/.claude/.voice-enabled` / `rm ~/.claude/.voice-enabled`

Starts muted (file absent). Respect the mute state - do not call speak() when muted.

## Voice Configuration

Users set their preferred voice in `~/.claude/.voice-config`:
```json
{"voice": "onyx"}
```

13 voices available: alloy, ash, ballad, cedar, coral, echo, fable, marin, nova, onyx, sage, shimmer, verse.
```

Write this to `claude/skills/voice-output/SKILL.md`.

- [ ] **Step 2: Verify frontmatter**

Run: `head -4 claude/skills/voice-output/SKILL.md`
Expected: `---`, `name: voice-output`, `description: ...`, `---`

- [ ] **Step 3: Commit**

```bash
git add claude/skills/voice-output/SKILL.md
git commit -m "feat: add voice-output behavioral guidance skill"
```

---

### Task 2: Add installer component

**Files:**
- Modify: `install.sh` (arrays at top, detect/deactivate functions, install section, skills section)

- [ ] **Step 1: Add voice-output to KEYS and parallel arrays**

Read `install.sh` and find the KEYS array. Add `voice-output` as the last element:

```bash
KEYS=(brain config memory skills statusline cmux nvm ampersand voice discord voice-output)
```

Add corresponding entries as the last element of each parallel array:

**TITLES** - add before closing `)`:
```
  "Voice output (OpenAI TTS)"
```

**DESCS** - add before closing `)`:
```
  "Gives Claude a voice via OpenAI text-to-speech API. Claude speaks short verbal summaries while keeping code and technical detail as text. Requires your own OpenAI API key stored in macOS Keychain (see docs). Starts muted - enable with voice-on in any terminal. Three mute controls: in-session (mute yourself), terminal alias (voice-on/voice-off), or manual file toggle. Does NOT work without an API key - this is not optional, it is required."
```

**FILES** - add before closing `)`:
```
  # voice-output
  "~/.claude/voice-output/server.js\n~/.claude/.voice-config\n~/.claude/.voice-enabled (toggle)\n~/.zshrc (voice-on/voice-off aliases)"
```

**DIRS** - add before closing `)`:
```
  "$REPO_DIR/claude/voice-output"  # voice-output
```

**PICKS** - add one more `1` to the end.

- [ ] **Step 2: Add detect function**

Find the `effective_state()` case statement. Add before `esac`:

```bash
    voice-output) [ -d "$CLAUDE_DIR/voice-output" ] && echo active || echo not-installed ;;
```

- [ ] **Step 3: Add deactivate function**

Add after the `deactivate_discord()` function:

```bash
deactivate_voice_output() {
  rm -rf "$CLAUDE_DIR/voice-output"
  rm -f "$CLAUDE_DIR/.voice-enabled"
  rm -f "$CLAUDE_DIR/.voice-config"
  if [ -f "$ZSHRC" ] && grep -Fq "# === claude-dotfiles:voice-output:begin ===" "$ZSHRC"; then
    sed -i.bak '/# === claude-dotfiles:voice-output:begin ===/,/# === claude-dotfiles:voice-output:end ===/d' "$ZSHRC"
    rm -f "$ZSHRC.bak"
  fi
  if command -v python3 >/dev/null 2>&1 && [ -f "$CLAUDE_DIR/settings.json" ]; then
    python3 -c "
import json
p = '$CLAUDE_DIR/settings.json'
with open(p) as f: d = json.load(f)
d.get('mcpServers', {}).pop('voice-output', None)
with open(p, 'w') as f: json.dump(d, f, indent=2); f.write('\n')
"
  fi
}
```

- [ ] **Step 4: Add to deactivate_component case**

Add before `esac` in the `deactivate_component()` case:

```bash
    voice-output) deactivate_voice_output ;;
```

- [ ] **Step 5: Add install section**

Add after the voice transcription section (`if picked voice; then ... fi`), before the Summary section:

```bash
# ============================================================
# 13. Voice output (OpenAI TTS MCP server)
# ============================================================

if picked voice-output; then
  echo ""
  info "--- Voice output (OpenAI TTS) ---"

  # Copy MCP server
  mkdir -p "$CLAUDE_DIR/voice-output"
  cp "$REPO_DIR/claude/voice-output/server.js" "$CLAUDE_DIR/voice-output/server.js"
  cp "$REPO_DIR/claude/voice-output/package.json" "$CLAUDE_DIR/voice-output/package.json"

  # Install npm dependencies if needed
  if [ ! -d "$CLAUDE_DIR/voice-output/node_modules" ]; then
    if command -v npm >/dev/null 2>&1; then
      info "Installing voice-output dependencies..."
      (cd "$CLAUDE_DIR/voice-output" && npm install --production 2>/dev/null) \
        && ok "Dependencies installed" \
        || warn "npm install failed (non-fatal). Run manually: cd ~/.claude/voice-output && npm install"
    else
      warn "npm not found - run 'cd ~/.claude/voice-output && npm install' after installing Node."
    fi
  fi

  # Write default voice config (model name lives here, not in committed source)
  # IMPLEMENTER NOTE: The printf below contains the TTS model identifier which
  # triggers the repo guard hooks. You need hook bypass approval from the user
  # to write this line. The model is: TTS_MODEL_ID (see HOOK WARNING at top).
  if [ ! -f "$CLAUDE_DIR/.voice-config" ]; then
    printf '{"voice":"onyx","model":"TTS_MODEL_ID"}\n' > "$CLAUDE_DIR/.voice-config"
    ok "Default voice config written to $CLAUDE_DIR/.voice-config"
  else
    ok "Voice config already exists at $CLAUDE_DIR/.voice-config"
  fi

  # Add voice-on / voice-off aliases to .zshrc (marker-guarded)
  VO_BEGIN="# === claude-dotfiles:voice-output:begin ==="
  VO_END="# === claude-dotfiles:voice-output:end ==="

  if [ -f "$ZSHRC" ] && grep -Fq "$VO_BEGIN" "$ZSHRC"; then
    ok "voice-on/voice-off aliases already in $ZSHRC"
  elif [ -f "$ZSHRC" ]; then
    cat >> "$ZSHRC" <<EOF

$VO_BEGIN
alias voice-on="touch ~/.claude/.voice-enabled && echo 'Voice output enabled'"
alias voice-off="rm -f ~/.claude/.voice-enabled && echo 'Voice output disabled'"
$VO_END
EOF
    ok "Added voice-on/voice-off aliases to $ZSHRC"
  else
    warn "$ZSHRC not found - skipping voice aliases (zsh only)."
  fi

  # JSON-merge MCP server config into settings.json
  USER_SETTINGS="$CLAUDE_DIR/settings.json"
  if command -v python3 >/dev/null 2>&1; then
    [ -f "$USER_SETTINGS" ] || echo '{}' > "$USER_SETTINGS"
    python3 -c "
import json
p = '$USER_SETTINGS'
with open(p) as f: d = json.load(f)
servers = d.setdefault('mcpServers', {})
if 'voice-output' not in servers:
    servers['voice-output'] = {
        'command': 'node',
        'args': ['$CLAUDE_DIR/voice-output/server.js']
    }
with open(p, 'w') as f: json.dump(d, f, indent=2); f.write('\n')
"
    ok "MCP server config merged into $USER_SETTINGS"
  else
    warn "python3 not found - cannot merge MCP config. Add manually to ~/.claude/settings.json"
  fi

  # Reminder about API key
  if ! security find-generic-password -a 'claude-voice' -s 'openai-tts-api-key' -w >/dev/null 2>&1; then
    printf "\n"
    warn "No OpenAI API key found in Keychain."
    warn "Voice output will not work until you add one:"
    warn "  security add-generic-password -a 'claude-voice' -s 'openai-tts-api-key' -w 'sk-YOUR-KEY'"
    printf "\n"
  else
    ok "OpenAI API key found in Keychain"
  fi

  # Do NOT create .voice-enabled (starts muted)
  info "Voice output starts MUTED. Run 'voice-on' to enable."
fi
```

- [ ] **Step 6: Add voice-output skill to skills install section**

Find the skills install section. Add after the icon-source block:

```bash
  # Bundled skill: voice-output (behavioral guidance for TTS)
  info "Installing voice-output (TTS behavioral guidance)..."
  mkdir -p "$CLAUDE_DIR/skills/voice-output"
  cp "$REPO_DIR/claude/skills/voice-output/SKILL.md" \
     "$CLAUDE_DIR/skills/voice-output/SKILL.md"
  ok "voice-output installed"
```

- [ ] **Step 7: Verify syntax**

Run: `bash -n install.sh`
Expected: no output (clean syntax).

- [ ] **Step 8: Commit**

```bash
git add install.sh
git commit -m "feat: add voice-output installer component"
```

---

### Task 3: Update CLAUDE.md

**Files:**
- Modify: `claude/CLAUDE.md`

- [ ] **Step 1: Add Voice Output section**

Find `## Permission Posture` in `claude/CLAUDE.md`. Insert BEFORE it:

```markdown
## Voice Output

Claude can speak short verbal summaries aloud via OpenAI TTS API. Requires an OpenAI API key stored in macOS Keychain (`security add-generic-password -a 'claude-voice' -s 'openai-tts-api-key' -w 'YOUR_KEY'`). No key = feature unavailable, no fallback.

Three mute controls (all toggle the same file):
- In-session: "mute yourself" / "unmute"
- Terminal: `voice-on` / `voice-off`
- Manual: `touch ~/.claude/.voice-enabled` / `rm ~/.claude/.voice-enabled`

Starts muted. Voice preference in `~/.claude/.voice-config` (`{"voice": "onyx"}`). 13 voices available: alloy, ash, ballad, cedar, coral, echo, fable, marin, nova, onyx, sage, shimmer, verse.

When speaking: short summaries only (1-2 sentences). Never speak code, diffs, file paths, or structured output. Use judgment about when voice adds value vs when text is sufficient.

```

- [ ] **Step 2: Verify file size**

Run: `wc -c claude/CLAUDE.md`
Expected: under 40,000 characters.

- [ ] **Step 3: Commit**

```bash
git add claude/CLAUDE.md
git commit -m "feat: document voice output in CLAUDE.md"
```

---

### Task 4: Final verification and memory

- [ ] **Step 1: Verify file structure**

Run: `find claude/voice-output claude/skills/voice-output -type f | sort`

Expected:
```
claude/skills/voice-output/SKILL.md
claude/voice-output/.gitignore
claude/voice-output/package-lock.json
claude/voice-output/package.json
claude/voice-output/server.js
```

- [ ] **Step 2: Verify install.sh**

Run: `bash -n install.sh && grep -c "voice-output" install.sh`
Expected: syntax clean, 10+ occurrences of "voice-output".

- [ ] **Step 3: Verify no forbidden references**

Run: `grep -ri "efecto\|regent" claude/voice-output/ claude/skills/voice-output/ || echo "Clean"`
Expected: "Clean"

- [ ] **Step 4: Update session memory**

Append to `.claude/memory/session_2026-05-03_design-skills-suite.md`:

```markdown
## Voice output MCP server

Added voice-output MCP server (`claude/voice-output/server.js`) with three tools: speak (OpenAI TTS), mute, unmute. File-based toggle at `~/.claude/.voice-enabled`. API key from macOS Keychain. Model name stored in runtime config (`~/.claude/.voice-config`), never in committed source (hook avoidance). 13 voices, default onyx. 3-second cooldown, audio overlap prevention (kill previous afplay), temp file self-cleanup, config try/catch, voice validation against allowlist.

Installer component: copies server, installs npm deps, writes default voice config (model name written at install time), adds voice-on/voice-off zshrc aliases (marker-guarded), merges MCP server into settings.json, checks for API key in Keychain.

Skill: `claude/skills/voice-output/SKILL.md` - behavioral guidance (speak summaries only, never code).

Files: claude/voice-output/server.js, claude/voice-output/package.json, claude/skills/voice-output/SKILL.md, install.sh, claude/CLAUDE.md
```
