import type { ChatMessage } from '../providers/base';

const MAX_HISTORY_MESSAGES = 40;
const MAX_TOKEN_ESTIMATE = 100_000; // rough char estimate

export function trimHistory(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= MAX_HISTORY_MESSAGES) return messages;

  // Keep the first system message and the most recent messages
  const system = messages.filter(m => m.role === 'system');
  const nonSystem = messages.filter(m => m.role !== 'system');

  // Keep the most recent messages within limits
  const trimmed = nonSystem.slice(-MAX_HISTORY_MESSAGES);

  return [...system, ...trimmed];
}

export function estimateTokens(messages: ChatMessage[]): number {
  // Rough estimate: ~4 chars per token
  const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  return Math.ceil(totalChars / 4);
}

export function shouldSummarize(messages: ChatMessage[]): boolean {
  return estimateTokens(messages) > MAX_TOKEN_ESTIMATE;
}
