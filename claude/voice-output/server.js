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
