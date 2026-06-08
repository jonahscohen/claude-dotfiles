import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chat } from './components/Chat';
import { SettingsPanel } from './components/SettingsPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { usePlugin } from './hooks/usePlugin';
import { useSettings } from './hooks/useSettings';
import { useProvider } from './hooks/useProvider';
import { useChat } from './hooks/useChat';
import { useHistory } from './hooks/useHistory';
import { McpBridgeClient } from './lib/mcp-bridge';
import type { McpStatus, McpAction, McpUiHandlers } from './lib/mcp-bridge';
import type { AIProvider } from './hooks/useSettings';
import type { SerializedNode } from '../plugin/types';

export type AppMode = 'generate' | 'modify' | 'style-transfer' | 'components' | 'code-export' | 'audit' | 'critique';
export type AppView = 'chat' | 'settings' | 'history';

export function App() {
  const [mode, setMode] = useState<AppMode>('generate');
  const modeRef = useRef<AppMode>('generate');
  const [view, setView] = useState<AppView>('chat');
  const [selection, setSelection] = useState<SerializedNode[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const plugin = usePlugin();

  // Fetch the current Figma user ID for user-derived encryption
  useEffect(() => {
    if (!plugin.ready) return;
    plugin.request(rid => ({
      type: 'get-current-user' as const,
      requestId: rid,
    })).then((result: any) => {
      if (result?.id) setUserId(result.id);
    }).catch(() => {});
  }, [plugin, plugin.ready]);

  // ── MCP Bridge ─────────────────────────────────────────────────────────
  const [mcpStatus, setMcpStatus] = useState<McpStatus>('disconnected');
  const [mcpLogs, setMcpLogs] = useState<string[]>([]);
  const mcpBridgeRef = useRef<McpBridgeClient | null>(null);

  // Keep a stable ref so the MCP bridge effect doesn't re-fire on every render
  const pluginRef = useRef(plugin);
  pluginRef.current = plugin;

  // Auto-connect MCP bridge exactly once when plugin becomes ready
  const mcpInitialized = useRef(false);
  useEffect(() => {
    if (!plugin.ready) return;
    if (mcpInitialized.current) return;
    mcpInitialized.current = true;

    const handleStatusChange = (status: McpStatus) => {
      setMcpStatus(status);
      if (status === 'disconnected') {
        mcpSessionActiveRef.current = false;
      }
    };

    const handleMcpAction = (action: McpAction) => {
      const currentChat = chatRef.current;

      if (!mcpSessionActiveRef.current) {
        if (currentChat.messages.length > 0 && !currentChat.isStreaming) {
          const snapshot = currentChat.getSnapshot();
          historyRef.current.saveConversation(
            snapshot,
            providerRef.current.name,
            providerRef.current.options.model,
            activeConversationIdRef.current ?? undefined,
          );
          currentChat.clearHistory();
          setActiveConversationId(null);
        }
        mcpSessionActiveRef.current = true;

        currentChat.injectMcpAction({
          tool: action.toolType,
          summary: `External MCP session started - ${action.summary}`,
        });
      } else {
        currentChat.injectMcpAction({
          tool: action.toolType,
          summary: action.summary,
        });
      }

      setView('chat');
    };

    const handleLog = (msg: string) => {
      const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setMcpLogs(prev => [...prev.slice(-49), `[${ts}] ${msg}`]);
    };

    const uiHandlers: McpUiHandlers = {
      onPrompt: async (prompt: string) => {
        const currentChat = chatRef.current;
        if (currentChat.isStreaming) {
          throw new Error('Agent is currently busy with another request');
        }
        await currentChat.sendMessage(prompt);
      },
      onCancelStream: () => {
        chatRef.current.cancelStream();
      },
      onClearChat: () => {
        chatRef.current.clearHistory();
        mcpSessionActiveRef.current = false;
      },
      onNewConversation: async () => {
        const currentChat = chatRef.current;
        if (currentChat.isStreaming) return;
        if (currentChat.messages.length > 0) {
          const snapshot = currentChat.getSnapshot();
          await historyRef.current.saveConversation(
            snapshot,
            providerRef.current.name,
            providerRef.current.options.model,
            activeConversationIdRef.current ?? undefined,
          );
        }
        setActiveConversationId(null);
        mcpSessionActiveRef.current = false;
        currentChat.clearHistory();
      },
      onGetChatStatus: () => {
        const currentChat = chatRef.current;
        return {
          isStreaming: currentChat.isStreaming,
          messageCount: currentChat.messages.length,
          tokenUsage: currentChat.tokenUsage,
        };
      },
      onGetChatMessages: (limit?: number) => {
        const msgs = chatRef.current.messages;
        const slice = limit ? msgs.slice(-limit) : msgs;
        return slice.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }));
      },
      onSetMode: (newMode: string) => {
        setMode(newMode as AppMode);
      },
      onGetMode: () => {
        return modeRef.current;
      },
      onListConversations: () => {
        return historyRef.current.index.map(c => ({
          id: c.id,
          title: c.title,
          createdAt: c.createdAt,
          messageCount: c.messageCount,
        }));
      },
      onLoadConversation: async (id: string) => {
        const currentChat = chatRef.current;
        if (currentChat.messages.length > 0) {
          const snapshot = currentChat.getSnapshot();
          await historyRef.current.saveConversation(
            snapshot,
            providerRef.current.name,
            providerRef.current.options.model,
            activeConversationIdRef.current ?? undefined,
          );
        }
        const conversation = await historyRef.current.loadConversation(id);
        if (conversation) {
          currentChat.restore({
            displayMessages: conversation.displayMessages,
            chatHistory: conversation.chatHistory,
            tokenUsage: conversation.tokenUsage,
          });
          setActiveConversationId(id);
          return true;
        }
        return false;
      },
      onSaveConversation: async () => {
        const currentChat = chatRef.current;
        if (currentChat.messages.length === 0) return null;
        const snapshot = currentChat.getSnapshot();
        return historyRef.current.saveConversation(
          snapshot,
          providerRef.current.name,
          providerRef.current.options.model,
          activeConversationIdRef.current ?? undefined,
        );
      },
      onDeleteConversation: async (id: string) => {
        await historyRef.current.deleteConversation(id);
      },
    };

    const bridge = new McpBridgeClient(9527, handleStatusChange, handleMcpAction, handleLog, uiHandlers);
    mcpBridgeRef.current = bridge;
    bridge.connect(pluginRef.current);
    return () => {
      bridge.disconnect();
      mcpBridgeRef.current = null;
      mcpInitialized.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plugin.ready]);

  const settings = useSettings(plugin, userId ?? undefined);
  const provider = useProvider(settings);
  const chat = useChat(plugin, provider, mode, selection);
  const history = useHistory(plugin);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Refs for MCP action tracking - avoids stale closures in the bridge callback
  modeRef.current = mode;
  const chatRef = useRef(chat);
  chatRef.current = chat;
  const historyRef = useRef(history);
  historyRef.current = history;
  const providerRef = useRef(provider);
  providerRef.current = provider;
  const activeConversationIdRef = useRef(activeConversationId);
  activeConversationIdRef.current = activeConversationId;
  const mcpSessionActiveRef = useRef(false);

  // Build the list of providers that have API keys configured
  const enabledProviders = useMemo(() => {
    const all: AIProvider[] = ['anthropic', 'openai', 'google'];
    return all
      .filter(p => settings.providers[p].enabled)
      .map(p => ({ name: p, model: settings.providers[p].model }));
  }, [settings.providers]);

  const handleProviderChange = useCallback((name: string) => {
    settings.setActiveProvider(name as AIProvider);
  }, [settings.setActiveProvider]);

  // Listen for selection changes from plugin
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      if (!msg) return;
      if (msg.type === 'selection-changed') {
        setSelection(msg.selection);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleSettingsToggle = useCallback(() => {
    setView(v => v === 'settings' ? 'chat' : 'settings');
  }, []);

  const handleHistoryToggle = useCallback(() => {
    setView(v => v === 'history' ? 'chat' : 'history');
  }, []);

  const handleNewTask = useCallback(async () => {
    if (chat.isStreaming) return;
    if (chat.messages.length > 0) {
      const snapshot = chat.getSnapshot();
      await history.saveConversation(
        snapshot,
        provider.name,
        provider.options.model,
        activeConversationId ?? undefined,
      );
    }
    setActiveConversationId(null);
    mcpSessionActiveRef.current = false;
    chat.clearHistory();
  }, [chat, history, provider.name, provider.options.model, activeConversationId]);

  const handleHistorySelect = useCallback(async (id: string) => {
    // Archive current conversation first (update in place if it came from history)
    if (chat.messages.length > 0) {
      const snapshot = chat.getSnapshot();
      await history.saveConversation(
        snapshot,
        provider.name,
        provider.options.model,
        activeConversationId ?? undefined,
      );
    }

    // Load selected conversation
    const conversation = await history.loadConversation(id);
    if (conversation) {
      chat.restore({
        displayMessages: conversation.displayMessages,
        chatHistory: conversation.chatHistory,
        tokenUsage: conversation.tokenUsage,
      });
      setActiveConversationId(id);
    }

    setView('chat');
  }, [chat, history, provider.name, provider.options.model, activeConversationId]);

  const handleHistoryDelete = useCallback(async (id: string) => {
    await history.deleteConversation(id);
  }, [history]);

  // Slide-fade animation for overlay panels (settings, history)
  const contentRef = useRef<HTMLDivElement>(null);
  const [displayedView, setDisplayedView] = useState<AppView>(view);
  const prevViewRef = useRef(view);

  useEffect(() => {
    if (view === prevViewRef.current) return;
    prevViewRef.current = view;
    const el = contentRef.current;
    if (!el) { setDisplayedView(view); return; }

    if (view === 'settings' || view === 'history') {
      // Opening overlay: swap content immediately, slide-fade down from top
      setDisplayedView(view);
      el.animate(
        [
          { opacity: 0, transform: 'translateY(-14px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 200, easing: 'ease-out', fill: 'forwards' }
      );
    } else {
      // Closing overlay: slide-fade up and out, then swap to chat
      const slideOut = el.animate(
        [
          { opacity: 1, transform: 'translateY(0)' },
          { opacity: 0, transform: 'translateY(-14px)' },
        ],
        { duration: 160, easing: 'ease-in', fill: 'forwards' }
      );
      slideOut.onfinish = () => {
        setDisplayedView('chat');
        el.animate(
          [
            { opacity: 0, transform: 'translateY(0)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          { duration: 120, easing: 'ease-out', fill: 'forwards' }
        );
      };
    }
  }, [view]);

  return (
    <div className="flex flex-col h-full bg-figma-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-figma-border">
        {view === 'settings' ? (
          <>
            <h2 className="text-sm font-semibold text-figma-text">Settings</h2>
            <button
              onClick={() => setView('chat')}
              className="text-figma-text-secondary hover:text-figma-text p-1 cursor-pointer"
            >
              <CloseIcon />
            </button>
          </>
        ) : view === 'history' ? (
          <>
            <h2 className="text-sm font-semibold text-figma-text">History</h2>
            <button
              onClick={() => setView('chat')}
              className="text-figma-text-secondary hover:text-figma-text p-1 cursor-pointer"
            >
              <CloseIcon />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleNewTask}
                disabled={chat.isStreaming}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] border border-figma-border text-xs text-figma-text-secondary hover:text-figma-text hover:border-figma-text-tertiary transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="New Task"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M7 2v10M2 7h10" />
                </svg>
                <span>New Task</span>
              </button>
              <button
                onClick={handleHistoryToggle}
                disabled={chat.isStreaming}
                className="p-1.5 rounded hover:bg-figma-bg-secondary text-figma-text-secondary hover:text-figma-text transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="History"
              >
                <HistoryIcon />
              </button>
            </div>
            <div className="relative">
              <button
                onClick={handleSettingsToggle}
                disabled={chat.isStreaming}
                className="p-1 rounded hover:bg-figma-bg-secondary text-figma-text-secondary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Settings"
              >
                <SettingsIcon />
              </button>
              {mcpStatus === 'connected' && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </div>
          </>
        )}
      </div>

      {/* Main Content */}
      <div ref={contentRef} className="flex flex-col flex-1 min-h-0">
        {displayedView === 'settings' ? (
          <SettingsPanel
            settings={settings}
            mcpStatus={mcpStatus}
            mcpLogs={mcpLogs}
            onMcpRetry={() => {
              const bridge = mcpBridgeRef.current;
              if (bridge && !bridge.isConnected && pluginRef.current) {
                setMcpLogs([]);
                bridge.disconnect();
                bridge.connect(pluginRef.current);
              }
            }}
          />
        ) : displayedView === 'history' ? (
          <HistoryPanel
            conversations={history.index}
            onSelect={handleHistorySelect}
            onDelete={handleHistoryDelete}
          />
        ) : (
          <Chat
            chat={chat}
            mode={mode}
            onModeChange={setMode}
            selection={selection}
            provider={provider}
            enabledProviders={enabledProviders}
            onProviderChange={handleProviderChange}
          />
        )}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3l8 8M11 3l-8 8" />
    </svg>
  );
}

/** Lucide history icon (ISC License) - https://lucide.dev/icons/history */
function HistoryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

{/* Gear icon from Bootstrap Icons (MIT License) */}
function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0" />
      <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z" />
    </svg>
  );
}
