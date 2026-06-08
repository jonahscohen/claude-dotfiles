import type { AIProvider, ChatMessage, ToolDefinition, ProviderOptions, StreamChunk } from './base';
import { fetchWithRetry } from './base';

export const openaiProvider: AIProvider = {
  name: 'openai',

  async *sendMessage(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    options: ProviderOptions,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    const oaiMessages = messages.map(m => {
      if (m.role === 'tool') {
        return {
          role: 'tool' as const,
          tool_call_id: m.toolCallId,
          content: m.content,
        };
      }
      if (m.toolCalls && m.toolCalls.length > 0) {
        return {
          role: 'assistant' as const,
          content: m.content || null,
          tool_calls: m.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: tc.arguments },
          })),
        };
      }
      // Multi-part content when attachments are present
      if (m.attachments && m.attachments.length > 0 && m.role === 'user') {
        const parts: Record<string, unknown>[] = [];
        if (m.content) parts.push({ type: 'text', text: m.content });
        for (const att of m.attachments) {
          if (att.type === 'image') {
            parts.push({ type: 'image_url', image_url: { url: att.data, detail: 'auto' } });
          } else if (att.type === 'code') {
            parts.push({ type: 'text', text: `\n--- Reference file: ${att.name} ---\n${att.data}\n---` });
          }
        }
        return { role: m.role, content: parts };
      }
      return { role: m.role, content: m.content };
    });

    // Post-process: inject image user messages after groups of tool results
    // OpenAI doesn't support images in tool result messages, so we add a
    // follow-up user message with the screenshot after the tool result group.
    const enrichedMessages: typeof oaiMessages = [];
    let pendingImages: Record<string, unknown>[] = [];

    for (let i = 0; i < oaiMessages.length; i++) {
      enrichedMessages.push(oaiMessages[i]);

      // Map oaiMessages index to source messages index (accounting for system message pass-through)
      const srcMsg = messages[i];
      if (srcMsg?.role === 'tool' && srcMsg.attachments?.some(a => a.type === 'image')) {
        for (const att of srcMsg.attachments) {
          if (att.type === 'image') {
            pendingImages.push({ type: 'image_url', image_url: { url: att.data, detail: 'auto' } });
          }
        }
      }

      // Flush accumulated images when the next message is NOT a tool result
      const nextMsg = i + 1 < messages.length ? messages[i + 1] : null;
      if (pendingImages.length > 0 && (!nextMsg || nextMsg.role !== 'tool')) {
        enrichedMessages.push({
          role: 'user' as const,
          content: [
            { type: 'text', text: '[Screenshot from tool call for visual QA verification. Analyze this image.]' },
            ...pendingImages,
          ],
        } as any);
        pendingImages = [];
      }
    }

    // GPT-5.x, o-series, and Codex models require max_completion_tokens.
    // GPT-4.1 and earlier use max_tokens. Detect based on model name prefix.
    const model = options.model;
    const usesNewTokenParam = model.startsWith('gpt-5') || model.startsWith('o3') || model.startsWith('o4');
    const tokenLimit = options.maxTokens ?? 16384;

    const body: Record<string, unknown> = {
      model,
      ...(usesNewTokenParam
        ? { max_completion_tokens: tokenLimit }
        : { max_tokens: tokenLimit }),
      temperature: options.temperature ?? 0.7,
      stream: true,
      messages: enrichedMessages,
    };

    if (tools.length > 0) {
      body.tools = tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }

    const response = await fetchWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify(body),
      },
      signal,
    );

    if (!response.ok) {
      const error = await response.text();
      yield { type: 'error', error: `OpenAI API error ${response.status}: ${error}` };
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const activeToolCalls = new Map<number, { id: string; name: string; args: string }>();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            // Finalize any pending tool calls
            for (const [, tc] of activeToolCalls) {
              yield { type: 'tool_call_end', toolCallId: tc.id };
            }
            yield { type: 'done' };
            return;
          }

          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta;

            if (!delta) continue;

            // Text content
            if (delta.content) {
              yield { type: 'text', text: delta.content };
            }

            // Tool calls
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;

                if (tc.id) {
                  // New tool call
                  activeToolCalls.set(idx, {
                    id: tc.id,
                    name: tc.function?.name ?? '',
                    args: tc.function?.arguments ?? '',
                  });
                  yield {
                    type: 'tool_call_start',
                    toolCallId: tc.id,
                    toolCallName: tc.function?.name ?? '',
                  };
                } else if (tc.function?.arguments) {
                  // Tool call argument delta
                  const existing = activeToolCalls.get(idx);
                  if (existing) {
                    existing.args += tc.function.arguments;
                    yield {
                      type: 'tool_call_delta',
                      toolCallId: existing.id,
                      toolCallArgs: tc.function.arguments,
                    };
                  }
                }
              }
            }

            // Usage info
            if (chunk.usage) {
              yield {
                type: 'done',
                usage: {
                  inputTokens: chunk.usage.prompt_tokens ?? 0,
                  outputTokens: chunk.usage.completion_tokens ?? 0,
                },
              };
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { type: 'done' };
  },

  async testConnection(options: ProviderOptions): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model,
          ...(options.model.startsWith('gpt-5') || options.model.startsWith('o3') || options.model.startsWith('o4')
            ? { max_completion_tokens: 10 }
            : { max_tokens: 10 }),
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
