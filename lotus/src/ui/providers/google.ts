import type { AIProvider, ChatMessage, ToolDefinition, ProviderOptions, StreamChunk } from './base';
import { fetchWithRetry } from './base';

export const googleProvider: AIProvider = {
  name: 'google',

  async *sendMessage(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    options: ProviderOptions,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    const systemMsg = messages.find(m => m.role === 'system');

    // Build Gemini message array, merging consecutive function responses
    // into a single "function" message (Gemini API requirement).
    const chatMessages: { role: string; parts: Record<string, unknown>[] }[] = [];
    for (const m of messages.filter(msg => msg.role !== 'system')) {
      if (m.role === 'tool') {
        const part = {
          functionResponse: {
            name: m.toolCallName ?? 'tool',
            response: { result: m.content },
          },
        };
        // Merge into previous function message if it exists
        const prev = chatMessages[chatMessages.length - 1];
        if (prev && prev.role === 'function') {
          prev.parts.push(part);
        } else {
          chatMessages.push({ role: 'function', parts: [part] });
        }
        // If tool result has image attachments (e.g., screenshot_node),
        // inject a user turn with the image after the function response group.
        // Gemini doesn't support images in function responses natively.
        if (m.attachments?.some(a => a.type === 'image')) {
          const nonSystemMsgs = messages.filter(msg => msg.role !== 'system');
          const currentIdx = nonSystemMsgs.indexOf(m);
          const nextMsg = currentIdx >= 0 ? nonSystemMsgs[currentIdx + 1] : undefined;
          const nextIsAlsoTool = nextMsg?.role === 'tool';
          // Only inject after the last tool in a consecutive group
          if (!nextIsAlsoTool) {
            const imgParts: Record<string, unknown>[] = [
              { text: '[Screenshot from tool call for visual QA verification. Analyze this image.]' },
            ];
            for (const att of m.attachments) {
              if (att.type === 'image') {
                const base64Data = att.data.split(',')[1] ?? att.data;
                const mimeType = att.data.match(/data:([^;]+)/)?.[1] ?? 'image/png';
                imgParts.push({ inlineData: { mimeType, data: base64Data } });
              }
            }
            chatMessages.push({ role: 'user', parts: imgParts });
          }
        }
      } else if (m.toolCalls && m.toolCalls.length > 0) {
        // Model message with function calls (include text if present)
        const parts: Record<string, unknown>[] = [];
        if (m.content) {
          parts.push({ text: m.content });
        }
        for (const tc of m.toolCalls) {
          const fc: Record<string, unknown> = { name: tc.name, args: JSON.parse(tc.arguments) };
          // thoughtSignature is a part-level sibling of functionCall, NOT inside it
          const part: Record<string, unknown> = { functionCall: fc };
          if (tc.thoughtSignature) part.thoughtSignature = tc.thoughtSignature;
          parts.push(part);
        }
        chatMessages.push({ role: 'model', parts });
      } else {
        const parts: Record<string, unknown>[] = [{ text: m.content }];
        // Add attachment parts for user messages with images/code
        if (m.attachments && m.attachments.length > 0 && m.role === 'user') {
          for (const att of m.attachments) {
            if (att.type === 'image') {
              const base64Data = att.data.split(',')[1] ?? att.data;
              const mimeType = att.data.match(/data:([^;]+)/)?.[1] ?? 'image/png';
              parts.push({ inlineData: { mimeType, data: base64Data } });
            } else if (att.type === 'code') {
              parts.push({ text: `\n--- Reference file: ${att.name} ---\n${att.data}\n---` });
            }
          }
        }
        chatMessages.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts,
        });
      }
    }

    const body: Record<string, unknown> = {
      contents: chatMessages,
      generationConfig: {
        maxOutputTokens: options.maxTokens ?? 16384,
        temperature: options.temperature ?? 0.7,
      },
    };

    if (systemMsg) {
      body.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }

    if (tools.length > 0) {
      body.tools = [{
        functionDeclarations: tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      }];
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:streamGenerateContent?alt=sse&key=${options.apiKey}`;

    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      signal,
    );

    if (!response.ok) {
      const error = await response.text();
      yield { type: 'error', error: `Google API error ${response.status}: ${error}` };
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

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
          if (!data) continue;

          try {
            const chunk = JSON.parse(data);

            // Surface API errors embedded in SSE stream
            if (chunk.error) {
              yield { type: 'error', error: `Gemini error ${chunk.error.code}: ${chunk.error.message}` };
              return;
            }

            // Surface prompt blocks (safety filter, etc.)
            if (chunk.promptFeedback && chunk.promptFeedback.blockReason) {
              yield { type: 'error', error: `Prompt blocked: ${chunk.promptFeedback.blockReason}` };
              return;
            }

            const candidates = chunk.candidates;
            if (!candidates || candidates.length === 0) {
              // No candidates but also no error -- might be a usage-only chunk
              if (chunk.usageMetadata) {
                yield {
                  type: 'done',
                  usage: {
                    inputTokens: chunk.usageMetadata.promptTokenCount ?? 0,
                    outputTokens: chunk.usageMetadata.candidatesTokenCount ?? 0,
                  },
                };
              }
              continue;
            }

            const candidate = candidates[0];

            // Check for non-STOP finish reasons
            if (candidate.finishReason && candidate.finishReason !== 'STOP') {
              const reason = candidate.finishReason;
              if (reason === 'SAFETY' || reason === 'RECITATION' || reason === 'OTHER') {
                yield { type: 'error', error: `Response blocked: ${reason}` };
              }
              // MAX_TOKENS is expected when output is long -- not an error
            }

            const parts = candidate.content && candidate.content.parts;
            if (!parts) continue;

            for (const part of parts) {
              if (part.text) {
                yield { type: 'text', text: part.text };
              }
              if (part.functionCall) {
                const callId = `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                yield {
                  type: 'tool_call_start',
                  toolCallId: callId,
                  toolCallName: part.functionCall.name,
                  // Preserve thoughtSignature so it can be echoed in subsequent turns
                  // (lives at the part level, NOT inside functionCall)
                  ...(part.thoughtSignature
                    ? { thoughtSignature: part.thoughtSignature }
                    : {}),
                };
                yield {
                  type: 'tool_call_delta',
                  toolCallId: callId,
                  toolCallArgs: JSON.stringify(part.functionCall.args),
                };
                yield { type: 'tool_call_end', toolCallId: callId };
              }
            }

            // Usage
            if (chunk.usageMetadata) {
              yield {
                type: 'done',
                usage: {
                  inputTokens: chunk.usageMetadata.promptTokenCount ?? 0,
                  outputTokens: chunk.usageMetadata.candidatesTokenCount ?? 0,
                },
              };
            }
          } catch (parseErr) {
            // Surface JSON parse errors instead of swallowing
            yield { type: 'error', error: `Stream parse error: ${String(parseErr)}` };
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
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${options.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
