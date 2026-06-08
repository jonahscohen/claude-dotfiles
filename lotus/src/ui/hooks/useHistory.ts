import { useState, useEffect, useCallback, useRef } from 'react';
import type { PluginBridge } from './usePlugin';
import type { ChatMessage } from '../providers/base';
import type { DisplayMessage, ConversationSnapshot } from './useChat';

export interface ConversationMeta {
  id: string;
  title: string;
  createdAt: number;
  messageCount: number;
  provider?: string;
  model?: string;
}

export interface ArchivedConversation {
  displayMessages: DisplayMessage[];
  chatHistory: ChatMessage[];
  tokenUsage: { input: number; output: number };
}

const INDEX_KEY = 'chat-history-index';
const CONV_PREFIX = 'chat-history-';
const MAX_CONVERSATIONS = 50;
const TITLE_MAX_LENGTH = 60;

function generateId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function extractTitle(messages: DisplayMessage[]): string {
  const firstUser = messages.find(m => m.role === 'user');
  if (!firstUser) return 'Untitled conversation';
  const text = firstUser.content.trim();
  if (text.length <= TITLE_MAX_LENGTH) return text;
  return text.slice(0, TITLE_MAX_LENGTH).trimEnd() + '...';
}

/** Strip large base64 image data from chat history attachments before storage. */
function stripImageData(history: ChatMessage[]): ChatMessage[] {
  return history.map(msg => {
    if (!msg.attachments?.length) return msg;
    return {
      ...msg,
      attachments: msg.attachments.map(a =>
        a.type === 'image'
          ? { ...a, data: '[image stripped for storage]' }
          : a
      ),
    };
  });
}

export interface HistoryState {
  index: ConversationMeta[];
  loaded: boolean;
  saveConversation: (
    snapshot: ConversationSnapshot,
    provider?: string,
    model?: string,
    existingId?: string,
  ) => Promise<string | null>;
  loadConversation: (id: string) => Promise<ArchivedConversation | null>;
  deleteConversation: (id: string) => Promise<void>;
}

export function useHistory(plugin: PluginBridge): HistoryState {
  const [index, setIndex] = useState<ConversationMeta[]>([]);
  const [loaded, setLoaded] = useState(false);
  const indexRef = useRef<ConversationMeta[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  // Load index on mount
  useEffect(() => {
    if (!plugin.ready) return;
    (async () => {
      try {
        const raw = await plugin.loadSetting(INDEX_KEY);
        if (raw) {
          const parsed: ConversationMeta[] = JSON.parse(raw);
          setIndex(parsed);
          indexRef.current = parsed;
        }
      } catch (err) {
        console.warn('[history] Failed to load index:', err);
      }
      setLoaded(true);
    })();
  }, [plugin.ready]);

  const persistIndex = useCallback(async (newIndex: ConversationMeta[]) => {
    setIndex(newIndex);
    indexRef.current = newIndex;
    try {
      await plugin.saveSetting(INDEX_KEY, JSON.stringify(newIndex));
    } catch (err) {
      console.warn('[history] Failed to save index:', err);
    }
  }, [plugin]);

  const saveConversation = useCallback(async (
    snapshot: ConversationSnapshot,
    provider?: string,
    model?: string,
    existingId?: string,
  ): Promise<string | null> => {
    if (snapshot.displayMessages.length === 0) return null;

    const id = existingId ?? generateId();
    const meta: ConversationMeta = {
      id,
      title: extractTitle(snapshot.displayMessages),
      createdAt: existingId
        ? (indexRef.current.find(c => c.id === existingId)?.createdAt ?? Date.now())
        : Date.now(),
      messageCount: snapshot.displayMessages.length,
      provider,
      model,
    };

    const archived: ArchivedConversation = {
      displayMessages: snapshot.displayMessages,
      chatHistory: stripImageData(snapshot.chatHistory),
      tokenUsage: snapshot.tokenUsage,
    };

    try {
      await plugin.saveSetting(`${CONV_PREFIX}${id}`, JSON.stringify(archived));
    } catch (err) {
      console.warn('[history] Failed to save conversation:', err);
      return null;
    }

    let newIndex: ConversationMeta[];
    if (existingId) {
      // Update the existing entry in place (preserves list order, no duplicates)
      newIndex = indexRef.current.map(c => c.id === existingId ? meta : c);
    } else {
      // Prepend new conversation, enforce cap
      newIndex = [meta, ...indexRef.current];
      if (newIndex.length > MAX_CONVERSATIONS) {
        const removed = newIndex.splice(MAX_CONVERSATIONS);
        for (const old of removed) {
          plugin.saveSetting(`${CONV_PREFIX}${old.id}`, '').catch(() => {});
        }
      }
    }

    await persistIndex(newIndex);
    return id;
  }, [plugin, persistIndex]);

  const loadConversation = useCallback(async (id: string): Promise<ArchivedConversation | null> => {
    try {
      const raw = await plugin.loadSetting(`${CONV_PREFIX}${id}`);
      if (!raw) return null;
      return JSON.parse(raw) as ArchivedConversation;
    } catch (err) {
      console.warn('[history] Failed to load conversation:', err);
      return null;
    }
  }, [plugin]);

  const deleteConversation = useCallback(async (id: string) => {
    const newIndex = indexRef.current.filter(c => c.id !== id);
    await persistIndex(newIndex);
    try {
      await plugin.saveSetting(`${CONV_PREFIX}${id}`, '');
    } catch (err) {
      console.warn('[history] Failed to delete conversation data:', err);
    }
  }, [persistIndex, plugin]);

  return { index, loaded, saveConversation, loadConversation, deleteConversation };
}
