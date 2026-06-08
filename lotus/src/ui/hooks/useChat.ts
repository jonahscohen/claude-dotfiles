import { useState, useCallback, useRef } from 'react';
import type { PluginBridge } from './usePlugin';
import type { ActiveProvider } from './useProvider';
import type { AppMode } from '../App';
import type { ChatMessage, StreamChunk, ToolCall, Attachment } from '../providers/base';
import type { SerializedNode } from '../../plugin/types';
import { buildSystemPrompt } from '../agent/system-prompt';
import { getToolDefinitions } from '../agent/tools';
import { buildContext } from '../agent/context';
import { executeToolCall } from '../agent/executor';

export interface DisplayAttachment {
  type: 'image' | 'code';
  name: string;
  /** For images: data URI for thumbnail preview */
  preview?: string;
}

export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  streaming?: boolean;
  attachments?: DisplayAttachment[];
  toolCalls?: { name: string; status: 'running' | 'done' | 'error'; result?: string }[];
}

export interface ConversationSnapshot {
  displayMessages: DisplayMessage[];
  chatHistory: ChatMessage[];
  tokenUsage: { input: number; output: number };
}

export interface ChatState {
  messages: DisplayMessage[];
  isStreaming: boolean;
  sendMessage: (content: string, imageData?: string, codeFiles?: { name: string; content: string }[]) => Promise<void>;
  cancelStream: () => void;
  clearHistory: () => void;
  tokenUsage: { input: number; output: number };
  getSnapshot: () => ConversationSnapshot;
  restore: (snapshot: ConversationSnapshot) => void;
  injectMcpAction: (action: { tool: string; summary: string }) => void;
}

let msgCounter = 0;

export function useChat(
  plugin: PluginBridge,
  activeProvider: ActiveProvider,
  mode: AppMode,
  selection: SerializedNode[]
): ChatState {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0 });
  const abortRef = useRef<AbortController | null>(null);
  const historyRef = useRef<ChatMessage[]>([]);

  const sendMessage = useCallback(async (content: string, imageData?: string, codeFiles?: { name: string; content: string }[]) => {
    if (isStreaming) return;

    if (!activeProvider.provider || !activeProvider.connected) {
      const errorId = `msg_${++msgCounter}`;
      setMessages(prev => [...prev,
        {
          id: `msg_${++msgCounter}`,
          role: 'user' as const,
          content,
          timestamp: Date.now(),
        },
        {
          id: errorId,
          role: 'assistant' as const,
          content: '[Error: No AI provider configured. Open Settings and add an API key.]',
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    const userMsgId = `msg_${++msgCounter}`;
    const assistantMsgId = `msg_${++msgCounter}`;

    // Build attachments from image + code file params
    const attachments: Attachment[] = [];
    if (imageData) {
      const mimeType = imageData.match(/data:([^;]+)/)?.[1] ?? 'image/png';
      attachments.push({ type: 'image', data: imageData, name: mimeType });
    }
    if (codeFiles?.length) {
      for (const cf of codeFiles) {
        attachments.push({ type: 'code', data: cf.content, name: cf.name });
      }
    }

    // Add user message to display (with attachment metadata for rendering)
    setMessages(prev => [...prev, {
      id: userMsgId,
      role: 'user' as const,
      content,
      timestamp: Date.now(),
      ...(attachments.length > 0 ? {
        attachments: attachments.map(a => ({
          type: a.type,
          name: a.name,
          preview: a.type === 'image' ? a.data : undefined,
        })),
      } : {}),
    }]);

    // Build context and system prompt
    const context = await buildContext(plugin, mode, selection);
    const systemPrompt = buildSystemPrompt(mode, context);
    const tools = getToolDefinitions(mode);

    const systemMsg: ChatMessage = { role: 'system', content: systemPrompt };
    historyRef.current.push({
      role: 'user',
      content,
      ...(attachments.length > 0 ? { attachments } : {}),
    });

    // Start streaming
    setIsStreaming(true);
    const abortController = new AbortController();
    abortRef.current = abortController;

    let cumulativeText = '';
    const displayToolCalls: DisplayMessage['toolCalls'] = [];

    // Add streaming assistant placeholder
    setMessages(prev => [...prev, {
      id: assistantMsgId,
      role: 'assistant' as const,
      content: '',
      timestamp: Date.now(),
      streaming: true,
      toolCalls: [],
    }]);

    // ── Agentic loop: keep calling the model until it stops using tools ──
    const MAX_ROUNDS = 15;
    let completedRounds = 0;
    let totalToolCalls = 0;
    let createDesignRootId: string | null = null; // Track successful create_design
    let createDesignAttempts = 0; // Hard cap on create_design calls

    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        completedRounds = round + 1;
        if (abortController.signal.aborted) break;

        // Build fresh message list each round (includes tool results from prior rounds)
        const apiMessages: ChatMessage[] = [systemMsg, ...historyRef.current];

        // Remove create_design from available tools after:
        // (a) a successful call (has rootNodeId), OR
        // (b) 2 total attempts (prevent infinite failure loops)
        const lockCreateDesign = createDesignRootId !== null || createDesignAttempts >= 2;
        const roundTools = lockCreateDesign
          ? tools.filter(t => t.name !== 'create_design')
          : tools;

        const stream = activeProvider.provider.sendMessage(
          apiMessages,
          roundTools,
          activeProvider.options,
          abortController.signal
        );

        let roundText = '';
        const roundToolCalls: { id: string; name: string; args: string; thoughtSignature?: string; result?: string; imageAttachment?: Attachment }[] = [];

        for await (const chunk of stream) {
          if (abortController.signal.aborted) break;

          switch (chunk.type) {
            case 'text': {
              // Insert paragraph break between text from different rounds
              // so follow-up replies don't run together ("...fonts.Good, both...")
              if (!roundText && cumulativeText.trim()) {
                cumulativeText += '\n\n';
              }
              roundText += chunk.text ?? '';
              cumulativeText += chunk.text ?? '';
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, content: cumulativeText, toolCalls: [...(displayToolCalls ?? [])] }
                  : m
              ));
              break;
            }

            case 'tool_call_start': {
              roundToolCalls.push({
                id: chunk.toolCallId!,
                name: chunk.toolCallName!,
                args: '',
                ...(chunk.thoughtSignature ? { thoughtSignature: chunk.thoughtSignature } : {}),
              });
              displayToolCalls.push({
                name: chunk.toolCallName!,
                status: 'running',
              });
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, toolCalls: [...displayToolCalls] }
                  : m
              ));
              break;
            }

            case 'tool_call_delta': {
              const tc = roundToolCalls.find(t => t.id === chunk.toolCallId);
              if (tc) tc.args += chunk.toolCallArgs ?? '';
              break;
            }

            case 'tool_call_end': {
              const tc = roundToolCalls.find(t => t.id === chunk.toolCallId);
              if (!tc) break;

              // Progress callback: updates the chat message in real-time as
              // create_design creates nodes one by one on canvas.
              const handleProgress = (progressMsg: string) => {
                const dtcIdx = displayToolCalls.findIndex(
                  dtc => dtc.name === tc.name && dtc.status === 'running'
                );
                if (dtcIdx >= 0) {
                  displayToolCalls[dtcIdx] = { name: tc.name, status: 'running', result: progressMsg };
                }
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, toolCalls: [...displayToolCalls] }
                    : m
                ));
              };

              // Count create_design attempts BEFORE execution (covers both success and failure)
              if (tc.name === 'create_design') createDesignAttempts++;

              try {
                const result = await executeToolCall(plugin, tc.name, tc.args, handleProgress);
                const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

                // Lock create_design after first success
                if (tc.name === 'create_design' && typeof result === 'object' && result !== null) {
                  const rid = (result as Record<string, unknown>).rootNodeId as string | undefined;
                  if (rid) createDesignRootId = rid;
                }

                // Extract image data from tool results (e.g., screenshot_node)
                // Store as attachment so providers can send it as a visual to the AI
                if (typeof result === 'object' && result !== null) {
                  const r = result as Record<string, unknown>;
                  if (typeof r.imageDataUri === 'string' && (r.imageDataUri as string).startsWith('data:image/')) {
                    tc.imageAttachment = {
                      type: 'image',
                      data: r.imageDataUri as string,
                      name: 'screenshot',
                    };
                    // Strip large base64 from text result to save context tokens
                    const textOnly = { ...r };
                    delete textOnly.imageDataUri;
                    tc.result = JSON.stringify(textOnly);
                  } else {
                    tc.result = resultStr;
                  }
                } else {
                  tc.result = resultStr;
                }

                const idx = displayToolCalls.findIndex(
                  dtc => dtc.name === tc.name && dtc.status === 'running'
                );
                if (idx >= 0) {
                  displayToolCalls[idx] = { name: tc.name, status: 'done', result: tc.result };
                }
              } catch (err) {
                tc.result = `Error: ${String(err)}`;
                const idx = displayToolCalls.findIndex(
                  dtc => dtc.name === tc.name && dtc.status === 'running'
                );
                if (idx >= 0) {
                  displayToolCalls[idx] = { name: tc.name, status: 'error', result: String(err) };
                }
              }

              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, toolCalls: [...displayToolCalls] }
                  : m
              ));
              break;
            }

            case 'done': {
              if (chunk.usage) {
                setTokenUsage(prev => ({
                  input: prev.input + chunk.usage!.inputTokens,
                  output: prev.output + chunk.usage!.outputTokens,
                }));
              }
              break;
            }

            case 'error': {
              cumulativeText += `\n\n[Error: ${chunk.error}]`;
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId ? { ...m, content: cumulativeText, streaming: false } : m
              ));
              break;
            }
          }
        }

        // ── Post-stream: detect empty responses ──
        if (round === 0 && roundToolCalls.length === 0 && !roundText.trim()) {
          cumulativeText += '[No response from AI. The model returned empty output. This may indicate the tool schema is too complex for the current provider. Try again or switch providers in Settings.]';
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId ? { ...m, content: cumulativeText } : m
          ));
          break;
        }

        totalToolCalls += roundToolCalls.length;

        // ── Decide whether to continue the agentic loop ──
        if (roundToolCalls.length > 0) {
          // Add the assistant's response (with all tool calls) to history
          historyRef.current.push({
            role: 'assistant',
            content: roundText,
            toolCalls: roundToolCalls.map(tc => ({
              id: tc.id,
              name: tc.name,
              arguments: tc.args,
              ...(tc.thoughtSignature ? { thoughtSignature: tc.thoughtSignature } : {}),
            })),
          });

          // ── Evict old screenshot images before adding new tool results ──
          // Screenshots are the #1 token cost driver. Each inline image can be
          // 50-150k tokens, and they get resent on every subsequent round.
          // Only the LATEST round's screenshots matter for QA -- older ones
          // have already been analyzed and serve no further purpose.
          for (const msg of historyRef.current) {
            if (msg.role === 'tool' && msg.attachments) {
              delete msg.attachments;
            }
          }

          // Add each tool result so the model can see them on the next round
          // Tool results are capped at 3000 chars to prevent verbose JSON
          // (find_nodes, read_node_properties) from ballooning context.
          const MAX_TOOL_RESULT_CHARS = 3000;
          for (const tc of roundToolCalls) {
            let resultContent = tc.result ?? '';
            if (resultContent.length > MAX_TOOL_RESULT_CHARS) {
              resultContent = resultContent.slice(0, MAX_TOOL_RESULT_CHARS) + '\n...[truncated]';
            }
            historyRef.current.push({
              role: 'tool',
              content: resultContent,
              toolCallId: tc.id,
              toolCallName: tc.name,
              ...(tc.imageAttachment ? { attachments: [tc.imageAttachment] } : {}),
            });
          }

          // Continue loop -- the model will receive tool results and keep building
        } else {
          // Model responded with text only (no tool calls) -- design is complete
          if (roundText) {
            historyRef.current.push({ role: 'assistant', content: roundText });
          }
          break;
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        cumulativeText += `\n\n[Error: ${(err as Error).message}]`;
      }
    }

    // ── Force a completion summary if the model used tools but produced no text ──
    // Instead of resending the full conversation history (which can be 500k+ tokens
    // of tool results and screenshots), build a CONDENSED context with just:
    // 1. The user's original request
    // 2. A compact list of tool calls made (names + brief results)
    // 3. An explicit instruction to summarize
    if (totalToolCalls > 0 && !cumulativeText.trim() && !abortController.signal.aborted) {
      try {
        // Extract the user's original message
        const userMsg = historyRef.current.find(m => m.role === 'user');
        const userRequest = userMsg?.content ?? 'Unknown request';

        // Build a compact action log from history (tool name + truncated result)
        const actionLog: string[] = [];
        for (const msg of historyRef.current) {
          if (msg.role === 'tool') {
            const snippet = (msg.content ?? '').slice(0, 200).replace(/\n/g, ' ');
            actionLog.push(`- ${msg.toolCallName}: ${snippet}`);
          }
        }

        const condensedMessages: ChatMessage[] = [
          {
            role: 'system',
            content: 'You are Lotus, a Figma design agent. The user asked you to perform a design task. You completed it using tool calls. Now summarize what you did. Never use emojis or emdashes.',
          },
          {
            role: 'user',
            content: `My original request: "${userRequest}"\n\nTool calls executed (${totalToolCalls} total across ${completedRounds} rounds):\n${actionLog.join('\n')}\n\nProvide a completion summary with:\n1. REQUEST: What I asked for (one sentence).\n2. ACTIONS: What you did (bullet list of key steps).\n3. RESULT: What I should see on the canvas.`,
          },
        ];

        const summaryStream = activeProvider.provider.sendMessage(
          condensedMessages,
          [], // No tools -- forces text-only response
          activeProvider.options,
          abortController.signal
        );

        for await (const chunk of summaryStream) {
          if (abortController.signal.aborted) break;
          if (chunk.type === 'text') {
            cumulativeText += chunk.text ?? '';
            setMessages(prev => prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, content: cumulativeText, toolCalls: [...(displayToolCalls ?? [])] }
                : m
            ));
          }
          if (chunk.type === 'error') {
            cumulativeText += `\n\n[Summary error: ${chunk.error}]`;
            break;
          }
        }

        if (cumulativeText.trim()) {
          historyRef.current.push({ role: 'assistant', content: cumulativeText });
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          cumulativeText += `\n\n[Error fetching summary: ${(err as Error).message}]`;
        }
      }
    }

    // Append round summary for diagnostic visibility
    if (totalToolCalls > 0) {
      cumulativeText += `\n\n[${completedRounds} round${completedRounds > 1 ? 's' : ''}, ${totalToolCalls} tool call${totalToolCalls > 1 ? 's' : ''}]`;
    }

    // Finalize assistant message
    setMessages(prev => prev.map(m =>
      m.id === assistantMsgId ? { ...m, content: cumulativeText, streaming: false } : m
    ));
    setIsStreaming(false);
    abortRef.current = null;
  }, [activeProvider, isStreaming, plugin, mode, selection]);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
    setTokenUsage({ input: 0, output: 0 });
  }, []);

  const getSnapshot = useCallback((): ConversationSnapshot => ({
    displayMessages: messages,
    chatHistory: historyRef.current.slice(),
    tokenUsage,
  }), [messages, tokenUsage]);

  const restore = useCallback((snapshot: ConversationSnapshot) => {
    setMessages(snapshot.displayMessages);
    historyRef.current = snapshot.chatHistory.slice();
    setTokenUsage(snapshot.tokenUsage);
  }, []);

  const injectMcpAction = useCallback((action: { tool: string; summary: string }) => {
    const id = `msg_${++msgCounter}`;
    setMessages(prev => [...prev, {
      id,
      role: 'system' as const,
      content: `[MCP] ${action.summary}`,
      timestamp: Date.now(),
    }]);
  }, []);

  return { messages, isStreaming, sendMessage, cancelStream, clearHistory, tokenUsage, getSnapshot, restore, injectMcpAction };
}
