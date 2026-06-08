import React, { useState, useCallback } from 'react';
import type { Settings, AIProvider } from '../hooks/useSettings';
import type { McpStatus } from '../lib/mcp-bridge';

const MCP_COMMAND = 'npm run mcp';

const MODEL_DISPLAY: Record<string, string> = {
  'claude-opus-4-8': 'Claude Opus 4.8',
  'claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'claude-haiku-4-6': 'Claude Haiku 4.6',
  'gpt-5.5': 'ChatGPT 5.5',
  'gpt-5.2': 'ChatGPT 5.2',
  'gpt-5': 'ChatGPT 5',
  'gemini-3.1-pro-preview': 'Gemini 3.1 Pro',
  'gemini-3-flash-preview': 'Gemini 3 Flash',
  'gemini-2.5-pro-preview-06-05': 'Gemini 2.5 Pro',
  'gemini-2.5-flash-preview-05-20': 'Gemini 2.5 Flash',
};

interface SettingsPanelProps {
  settings: Settings;
  mcpStatus?: McpStatus;
  mcpLogs?: string[];
  onMcpRetry?: () => void;
}

const PROVIDER_INFO: Record<AIProvider, { name: string; placeholder: string; models: string[] }> = {
  anthropic: {
    name: 'Anthropic (Claude)',
    placeholder: 'sk-ant-...',
    models: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-6'],
  },
  openai: {
    name: 'OpenAI',
    placeholder: 'sk-...',
    models: ['gpt-5.5', 'gpt-5.2', 'gpt-5'],
  },
  google: {
    name: 'Google (Gemini)',
    placeholder: 'AIza...',
    models: ['gemini-3.1-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-pro-preview-06-05', 'gemini-2.5-flash-preview-05-20'],
  },
};

export function SettingsPanel({ settings, mcpStatus, mcpLogs, onMcpRetry }: SettingsPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto px-3 py-3">
      <div className="space-y-4">
        {(Object.keys(PROVIDER_INFO) as AIProvider[]).map(provider => (
          <ProviderSection
            key={provider}
            provider={provider}
            info={PROVIDER_INFO[provider]}
            config={settings.providers[provider]}
            isActive={settings.activeProvider === provider}
            onSetActive={() => settings.setActiveProvider(provider)}
            onSetKey={(key) => settings.setApiKey(provider, key)}
            onSetModel={(model) => settings.setModel(provider, model)}
          />
        ))}
      </div>

      <p className="mt-4 text-2xs text-figma-text-tertiary leading-relaxed">
        API keys are encrypted with AES-256-GCM and stored locally via Figma's client storage.
        Keys never leave your device unencrypted. You are responsible for your own API costs.
      </p>

      {/* MCP Bridge */}
      <div className="mt-4 pt-4 border-t border-figma-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-figma-text">MCP Bridge</span>
          {mcpStatus === 'connected' ? (
            <span className="text-2xs px-2 py-0.5 rounded-full bg-green-600 text-white">Connected</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xs px-2 py-0.5 rounded-full bg-figma-bg-tertiary text-figma-text-tertiary">Disconnected</span>
              {onMcpRetry && (
                <button
                  onClick={onMcpRetry}
                  className="text-2xs text-figma-brand hover:text-figma-brand-hover cursor-pointer"
                >
                  Retry
                </button>
              )}
            </div>
          )}
        </div>
        {mcpStatus !== 'connected' && (
          <>
            <p className="mb-2 text-2xs text-figma-text-tertiary leading-relaxed">
              Start the bridge server from your project root:
            </p>
            <CopyCommand command={MCP_COMMAND} />
            <p className="mt-2 text-2xs text-figma-text-tertiary leading-relaxed">
              Auto-connects when the server is detected.
            </p>
          </>
        )}
        <p className="mt-2 text-2xs text-figma-text-tertiary leading-relaxed">
          Lets Cursor, Claude Code, or Windsurf control Figma through MCP.
        </p>
        {mcpLogs && mcpLogs.length > 0 && (
          <McpConsole logs={mcpLogs} />
        )}
      </div>
    </div>
  );
}

function ProviderSection({
  provider,
  info,
  config,
  isActive,
  onSetActive,
  onSetKey,
  onSetModel,
}: {
  provider: AIProvider;
  info: typeof PROVIDER_INFO.anthropic;
  config: { apiKey: string; model: string; enabled: boolean };
  isActive: boolean;
  onSetActive: () => void;
  onSetKey: (key: string) => Promise<void>;
  onSetModel: (model: string) => void;
}) {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveKey = useCallback(async () => {
    if (!keyInput.trim()) return;
    setSaving(true);
    await onSetKey(keyInput.trim());
    setKeyInput('');
    setSaving(false);
  }, [keyInput, onSetKey]);

  const handleClearKey = useCallback(async () => {
    await onSetKey('');
  }, [onSetKey]);

  return (
    <div className={`rounded-lg border p-3 ${
      isActive ? 'border-figma-brand bg-figma-brand/5' : 'border-figma-border'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-figma-text">{info.name}</span>
        <button
          onClick={onSetActive}
          className={`text-2xs px-2 py-0.5 rounded-full ${
            isActive
              ? 'bg-figma-brand text-white'
              : 'bg-figma-bg-secondary text-figma-text-secondary hover:bg-figma-bg-tertiary'
          }`}
        >
          {isActive ? 'Active' : 'Set Active'}
        </button>
      </div>

      {/* API Key */}
      <div className="mb-2">
        <label className="text-2xs text-figma-text-secondary mb-1 block">API Key</label>
        {config.enabled ? (
          <div className="flex items-center gap-1.5">
            <div className="flex-1 bg-figma-bg-secondary rounded px-2 py-1.5 text-2xs text-figma-text-secondary font-mono">
              {showKey ? config.apiKey : '\u2022'.repeat(Math.min(config.apiKey.length, 24))}
            </div>
            <button
              onClick={() => setShowKey(!showKey)}
              className="text-2xs text-figma-text-tertiary hover:text-figma-text p-1"
              title={showKey ? 'Hide' : 'Show'}
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
            <button
              onClick={handleClearKey}
              className="text-2xs text-figma-danger hover:opacity-80 p-1"
            >
              Clear
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <input
              type="password"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder={info.placeholder}
              className="flex-1 bg-figma-bg-secondary rounded px-2 py-1.5 text-2xs text-figma-text font-mono outline-none focus:ring-1 focus:ring-figma-brand"
              onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
            />
            <button
              onClick={handleSaveKey}
              disabled={!keyInput.trim() || saving}
              className="text-2xs bg-figma-brand text-white px-2 py-1 rounded hover:bg-figma-brand-hover disabled:opacity-30"
            >
              {saving ? '...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Model Selector */}
      <div>
        <label className="text-2xs text-figma-text-secondary mb-1 block">Model</label>
        <select
          value={config.model}
          onChange={e => onSetModel(e.target.value)}
          className="w-full bg-figma-bg-secondary rounded px-2 py-1.5 text-2xs text-figma-text outline-none focus:ring-1 focus:ring-figma-brand"
        >
          {info.models.map(m => (
            <option key={m} value={m}>{MODEL_DISPLAY[m] || m}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function McpConsole({ logs }: { logs: string[] }) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  return (
    <div
      ref={scrollRef}
      className="mt-2 rounded bg-[#0d0d0d] border border-figma-border max-h-[120px] overflow-y-auto px-2 py-1.5"
    >
      {logs.map((line, i) => (
        <p
          key={i}
          className={`text-2xs font-mono leading-relaxed whitespace-pre-wrap ${
            line.includes('failed') || line.includes('Failed') || line.includes('Lost')
              ? 'text-red-400'
              : line.includes('Connected')
                ? 'text-green-400'
                : 'text-figma-text-tertiary'
          }`}
        >
          {line}
        </p>
      ))}
    </div>
  );
}

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [command]);

  return (
    <div
      onClick={handleCopy}
      className="flex items-center justify-between bg-figma-bg-secondary rounded px-2.5 py-2 cursor-pointer hover:bg-figma-bg-tertiary transition-colors"
    >
      <code className="text-2xs text-figma-text font-mono">{command}</code>
      <span className="text-2xs text-figma-text-tertiary ml-2 shrink-0">
        {copied ? 'Copied' : 'Copy'}
      </span>
    </div>
  );
}
