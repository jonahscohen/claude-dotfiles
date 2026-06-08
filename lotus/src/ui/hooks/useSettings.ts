import { useState, useEffect, useCallback } from 'react';
import type { PluginBridge } from './usePlugin';
import { encryptApiKey, decryptApiKey } from '../crypto/keys';

export type AIProvider = 'anthropic' | 'openai' | 'google';

export interface ProviderConfig {
  apiKey: string;
  model: string;
  enabled: boolean;
}

export interface Settings {
  activeProvider: AIProvider;
  providers: Record<AIProvider, ProviderConfig>;
  setActiveProvider: (provider: AIProvider) => void;
  setApiKey: (provider: AIProvider, key: string) => Promise<void>;
  setModel: (provider: AIProvider, model: string) => void;
  loaded: boolean;
}

const DEFAULT_MODELS: Record<AIProvider, string> = {
  anthropic: 'claude-opus-4-8',
  openai: 'gpt-5.5',
  google: 'gemini-3.1-pro-preview',
};

// Models that don't support /v1/chat/completions (and therefore can't do tool calling).
// If a stored model matches, reset to the default for that provider.
const BLOCKED_MODELS = ['gpt-5.3-codex', 'gpt-5.2-codex'];

function sanitizeModel(stored: string | null, provider: AIProvider): string {
  if (!stored) return DEFAULT_MODELS[provider];
  if (BLOCKED_MODELS.includes(stored)) {
    console.warn(`[settings] Model "${stored}" is not a chat model; resetting to ${DEFAULT_MODELS[provider]}`);
    return DEFAULT_MODELS[provider];
  }
  return stored;
}

/** Load a single setting with timeout resilience. Returns null on failure. */
async function safeLoadSetting(plugin: PluginBridge, key: string): Promise<string | null> {
  try {
    return await plugin.loadSetting(key);
  } catch (err) {
    console.warn(`[settings] Failed to load "${key}":`, err);
    return null;
  }
}

/** Attempt to decrypt an encrypted API key blob, with fallback logic.
 *  Returns { key, migrated } so the caller knows whether to re-encrypt with v2. */
async function recoverKey(
  stored: string | null,
  provider: AIProvider,
  userId?: string,
): Promise<{ key: string; migrated: boolean }> {
  if (!stored) return { key: '', migrated: false };
  try {
    const key = await decryptApiKey(stored, provider, userId);
    // If userId was provided but decryption fell through to v1, we need to migrate.
    // We detect this by trying v2-only decrypt: if it fails, the stored blob is v1.
    let migrated = false;
    if (userId) {
      try {
        await decryptApiKey(stored, provider); // v1 only (no userId)
        // If v1 succeeds, it means the blob was v1 and decryptApiKey fell back.
        migrated = true;
      } catch {
        // v1 fails => the blob was already v2, no migration needed.
      }
    }
    return { key, migrated };
  } catch (err) {
    // Decryption failed. Log the actual error for diagnostics instead of swallowing.
    console.warn(`[settings] Decryption failed for ${provider}:`, err);
    // Value was likely stored unencrypted (Web Crypto unavailable in sandboxed iframes).
    // Check common raw key prefixes across all providers.
    if (stored.startsWith('sk-') || stored.startsWith('AIza')) {
      return { key: stored, migrated: false };
    }
    // Value is an encrypted blob we can't decrypt -- don't discard it.
    // Return empty for this session but leave the stored value intact for retry.
    return { key: '', migrated: false };
  }
}

export function useSettings(plugin: PluginBridge, userId?: string): Settings {
  const [loaded, setLoaded] = useState(false);
  const [activeProvider, setActiveProviderState] = useState<AIProvider>('anthropic');
  const [providers, setProviders] = useState<Record<AIProvider, ProviderConfig>>({
    anthropic: { apiKey: '', model: DEFAULT_MODELS.anthropic, enabled: false },
    openai: { apiKey: '', model: DEFAULT_MODELS.openai, enabled: false },
    google: { apiKey: '', model: DEFAULT_MODELS.google, enabled: false },
  });

  // Load settings from clientStorage on mount.
  // Uses individual safeLoadSetting calls so one failure doesn't kill the rest.
  useEffect(() => {
    if (!plugin.ready) return;

    async function load() {
      // Load all settings independently -- each one can fail without affecting others.
      const [savedProvider, anthKey, oaiKey, gemKey, anthModel, oaiModel, gemModel] =
        await Promise.all([
          safeLoadSetting(plugin, 'active-provider'),
          safeLoadSetting(plugin, 'api-key-anthropic'),
          safeLoadSetting(plugin, 'api-key-openai'),
          safeLoadSetting(plugin, 'api-key-google'),
          safeLoadSetting(plugin, 'model-anthropic'),
          safeLoadSetting(plugin, 'model-openai'),
          safeLoadSetting(plugin, 'model-google'),
        ]);

      if (savedProvider) {
        setActiveProviderState(savedProvider as AIProvider);
      }

      const [anthResult, oaiResult, gemResult] = await Promise.all([
        recoverKey(anthKey, 'anthropic', userId),
        recoverKey(oaiKey, 'openai', userId),
        recoverKey(gemKey, 'google', userId),
      ]);

      // Migrate v1-encrypted keys to v2 (user-derived) if userId is available
      if (userId) {
        const migrations: Array<{ provider: AIProvider; key: string }> = [];
        if (anthResult.migrated && anthResult.key) migrations.push({ provider: 'anthropic', key: anthResult.key });
        if (oaiResult.migrated && oaiResult.key) migrations.push({ provider: 'openai', key: oaiResult.key });
        if (gemResult.migrated && gemResult.key) migrations.push({ provider: 'google', key: gemResult.key });

        for (const { provider, key } of migrations) {
          try {
            const reEncrypted = await encryptApiKey(key, provider, userId);
            await plugin.saveSetting(`api-key-${provider}`, reEncrypted);
            console.info(`[settings] Migrated ${provider} API key from v1 to v2 encryption`);
          } catch (err) {
            console.warn(`[settings] Failed to migrate ${provider} key to v2:`, err);
          }
        }
      }

      setProviders({
        anthropic: {
          apiKey: anthResult.key,
          model: sanitizeModel(anthModel, 'anthropic'),
          enabled: !!anthResult.key,
        },
        openai: {
          apiKey: oaiResult.key,
          model: sanitizeModel(oaiModel, 'openai'),
          enabled: !!oaiResult.key,
        },
        google: {
          apiKey: gemResult.key,
          model: sanitizeModel(gemModel, 'google'),
          enabled: !!gemResult.key,
        },
      });

      setLoaded(true);
    }

    load();
  }, [plugin.ready, userId]);

  const setActiveProvider = useCallback((provider: AIProvider) => {
    setActiveProviderState(provider);
    plugin.saveSetting('active-provider', provider);
  }, [plugin]);

  const setApiKey = useCallback(async (provider: AIProvider, key: string) => {
    // Update React state immediately so the UI reflects the change
    setProviders(prev => ({
      ...prev,
      [provider]: { ...prev[provider], apiKey: key, enabled: !!key },
    }));

    // Persist: encrypt then save with confirmation
    try {
      const encrypted = key ? await encryptApiKey(key, provider, userId) : '';
      await plugin.saveSetting(`api-key-${provider}`, encrypted);
    } catch (err) {
      // Encryption may fail in sandboxed iframes; fall back to raw storage
      console.warn(`[settings] Encryption failed for ${provider}, storing directly:`, err);
      try {
        await plugin.saveSetting(`api-key-${provider}`, key);
      } catch (saveErr) {
        console.error(`[settings] Failed to save API key for ${provider}:`, saveErr);
      }
    }
  }, [plugin, userId]);

  const setModel = useCallback((provider: AIProvider, model: string) => {
    plugin.saveSetting(`model-${provider}`, model);
    setProviders(prev => ({
      ...prev,
      [provider]: { ...prev[provider], model },
    }));
  }, [plugin]);

  return {
    activeProvider,
    providers,
    setActiveProvider,
    setApiKey,
    setModel,
    loaded,
  };
}
