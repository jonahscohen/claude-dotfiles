import { useMemo } from 'react';
import type { Settings, AIProvider as AIProviderName } from './useSettings';
import type { AIProvider, ProviderOptions } from '../providers/base';
import { getProvider } from '../providers/manager';

export interface ActiveProvider {
  provider: AIProvider | null;
  options: ProviderOptions;
  name: AIProviderName;
  connected: boolean;
}

export function useProvider(settings: Settings): ActiveProvider {
  return useMemo(() => {
    const config = settings.providers[settings.activeProvider];
    const provider = getProvider(settings.activeProvider);

    return {
      provider,
      options: {
        apiKey: config.apiKey,
        model: config.model,
        maxTokens: 16384,
        temperature: 0.7,
      },
      name: settings.activeProvider,
      connected: config.enabled && !!config.apiKey,
    };
  }, [settings.activeProvider, settings.providers]);
}
