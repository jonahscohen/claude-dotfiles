import type { AIProvider, ChatMessage, ToolDefinition, ProviderOptions, StreamChunk } from './base';
import { fetchWithRetry } from './base';

export const anthropicProvider: AIProvider = {
  name: 'anthropic',

  async *sendMessage(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    options: ProviderOptions,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => {
        if (m.role === 'tool') {
          // Anthropic natively supports images in tool_result content blocks
          let toolContent: unknown = m.content;
          if (m.attachments?.some(a => a.type === 'image')) {
            const parts: Record<string, unknown>[] = [];
            if (m.content) parts.push({ type: 'text', text: m.content });
            for (const att of m.attachments) {
              if (att.type === 'image') {
                const base64Data = att.data.split(',')[1] ?? att.data;
                const mediaType = att.data.match(/data:([^;]+)/)?.[1] ?? 'image/png';
                parts.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } });
              }
            }
            toolContent = parts;
          }
          return {
            role: 'user' as const,
            content: [{
              type: 'tool_result' as const,
              tool_use_id: m.toolCallId,
              content: toolContent,
            }],
          };
        }
        if (m.toolCalls && m.toolCalls.length > 0) {
          return {
            role: 'assistant' as const,
            content: m.toolCalls.map(tc => ({
              type: 'tool_use' as const,
              id: tc.id,
              name: tc.name,
              input: JSON.parse(tc.arguments),
            })),
          };
        }
        // Multi-part content when attachments are present
        if (m.attachments && m.attachments.length > 0 && m.role === 'user') {
          const parts: Record<string, unknown>[] = [];
          if (m.content) parts.push({ type: 'text', text: m.content });
          for (const att of m.attachments) {
            if (att.type === 'image') {
              const base64Data = att.data.split(',')[1] ?? att.data;
              const mediaType = att.data.match(/data:([^;]+)/)?.[1] ?? 'image/png';
              parts.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } });
            } else if (att.type === 'code') {
              parts.push({ type: 'text', text: `\n--- Reference file: ${att.name} ---\n${att.data}\n---` });
            }
          }
          return { role: 'user' as const, content: parts };
        }
        return { role: m.role as 'user' | 'assistant', content: m.content };
      });

    const body: Record<string, unknown> = {
      model: options.model,
      max_tokens: options.maxTokens ?? 16384,
      temperature: options.temperature ?? 0.7,
      stream: true,
      messages: chatMessages,
    };

    if (systemMsg) {
      body.system = systemMsg.content;
    }

    if (tools.length > 0) {
      body.tools = tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));
    }

    const response = await fetchWithRetry(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': options.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
      },
      signal,
    );

    if (!response.ok) {
      const error = await response.text();
      yield { type: 'error', error: `Anthropic API error ${response.status}: ${error}` };
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentToolCallId = '';
    let currentToolCallName = '';

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
            yield { type: 'done' };
            return;
          }

          try {
            const event = JSON.parse(data);

            switch (event.type) {
              case 'content_block_start': {
                if (event.content_block?.type === 'tool_use') {
                  currentToolCallId = event.content_block.id;
                  currentToolCallName = event.content_block.name;
                  yield {
                    type: 'tool_call_start',
                    toolCallId: currentToolCallId,
                    toolCallName: currentToolCallName,
                  };
                }
                break;
              }
              case 'content_block_delta': {
                if (event.delta?.type === 'text_delta') {
                  yield { type: 'text', text: event.delta.text };
                } else if (event.delta?.type === 'input_json_delta') {
                  yield {
                    type: 'tool_call_delta',
                    toolCallId: currentToolCallId,
                    toolCallArgs: event.delta.partial_json,
                  };
                }
                break;
              }
              case 'content_block_stop': {
                if (currentToolCallId) {
                  yield { type: 'tool_call_end', toolCallId: currentToolCallId };
                  currentToolCallId = '';
                  currentToolCallName = '';
                }
                break;
              }
              case 'message_delta': {
                if (event.usage) {
                  yield {
                    type: 'done',
                    usage: {
                      inputTokens: event.usage.input_tokens ?? 0,
                      outputTokens: event.usage.output_tokens ?? 0,
                    },
                  };
                }
                break;
              }
              case 'message_stop': {
                yield { type: 'done' };
                break;
              }
              case 'error': {
                yield { type: 'error', error: event.error?.message ?? 'Unknown error' };
                break;
              }
            }
          } catch {
            // Skip malformed JSON lines
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
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': options.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: options.model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
