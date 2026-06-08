import type { AIProvider, ProviderOptions } from './base';
import { anthropicProvider } from './anthropic';
import { openaiProvider } from './openai';
import { googleProvider } from './google';

const providers: Record<string, AIProvider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  google: googleProvider,
};

export function getProvider(name: string): AIProvider | null {
  return providers[name] ?? null;
}

export function getAvailableProviders(): string[] {
  return Object.keys(providers);
}

export function getAllProviders(): Record<string, AIProvider> {
  return { ...providers };
}
