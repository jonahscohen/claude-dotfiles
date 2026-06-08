export interface Attachment {
  type: 'image' | 'code';
  /** For images: full data URI (data:image/png;base64,...). For code: raw file contents. */
  data: string;
  /** For images: mime type extracted from data URI. For code: filename (e.g. Button.tsx). */
  name: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  attachments?: Attachment[];
  toolCallId?: string;
  toolCallName?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  /** Gemini thought_signature - must be echoed back in subsequent turns */
  thoughtSignature?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface StreamChunk {
  type: 'text' | 'tool_call_start' | 'tool_call_delta' | 'tool_call_end' | 'done' | 'error';
  text?: string;
  toolCallId?: string;
  toolCallName?: string;
  toolCallArgs?: string;
  /** Gemini thought_signature for function calls */
  thoughtSignature?: string;
  error?: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface ProviderOptions {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIProvider {
  name: string;
  sendMessage(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    options: ProviderOptions,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk>;
  testConnection(options: ProviderOptions): Promise<boolean>;
}

/**
 * Fetch wrapper that retries on HTTP 429 (rate limit) with exponential backoff.
 * Reads the Retry-After header when available; otherwise backs off 2s, 4s, 8s.
 * Respects AbortSignal during wait periods.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  signal?: AbortSignal,
  maxRetries = 3,
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const response = await fetch(url, { ...init, signal });

    if (response.status !== 429 || attempt === maxRetries) {
      return response;
    }

    // Parse wait duration from Retry-After header or use exponential backoff
    const retryAfter = response.headers.get('retry-after');
    const waitMs = retryAfter
      ? parseInt(retryAfter) * 1000
      : Math.min(2000 * Math.pow(2, attempt), 30000);

    // Wait with abort support
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, waitMs);
      const onAbort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  // Unreachable, but TypeScript needs it
  throw new Error('fetchWithRetry: exceeded max retries');
}
