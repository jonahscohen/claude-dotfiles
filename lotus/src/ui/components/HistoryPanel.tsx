import React, { useCallback } from 'react';
import type { ConversationMeta } from '../hooks/useHistory';

interface HistoryPanelProps {
  conversations: ConversationMeta[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function HistoryPanel({ conversations, onSelect, onDelete }: HistoryPanelProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="flex flex-col items-center justify-center h-full text-figma-text-secondary px-4">
          <HistoryEmptyIcon />
          <p className="text-sm mt-3 text-center">No conversations yet.</p>
          <p className="text-2xs mt-1 text-figma-text-tertiary text-center">
            Conversations are saved when you start a new task.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3">
      <div className="space-y-2">
        {conversations.map(conv => (
          <ConversationCard
            key={conv.id}
            conversation={conv}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

function ConversationCard({
  conversation,
  onSelect,
  onDelete,
}: {
  conversation: ConversationMeta;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(conversation.id);
  }, [conversation.id, onDelete]);

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className="w-full text-left rounded-lg border border-figma-border p-3 hover:border-figma-text-tertiary transition-colors cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-figma-text leading-snug flex-1" style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {conversation.title}
        </p>
        <button
          type="button"
          onClick={handleDelete}
          className="shrink-0 p-1 text-figma-text-tertiary opacity-0 group-hover:opacity-100 hover:text-figma-danger transition-all cursor-pointer"
          title="Delete conversation"
        >
          <TrashIcon />
        </button>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-2xs text-figma-text-tertiary">
          {formatRelativeDate(conversation.createdAt)}
        </span>
        {conversation.model && (
          <>
            <span className="text-2xs text-figma-text-tertiary">-</span>
            <span className="text-2xs text-figma-text-tertiary">
              {conversation.model}
            </span>
          </>
        )}
        <span className="text-2xs text-figma-text-tertiary">-</span>
        <span className="text-2xs text-figma-text-tertiary">
          {conversation.messageCount} msg{conversation.messageCount !== 1 ? 's' : ''}
        </span>
      </div>
    </button>
  );
}

function formatRelativeDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/** Lucide trash-2 icon (ISC License) - https://lucide.dev/icons/trash-2 */
function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

/** Lucide history icon (ISC License) - https://lucide.dev/icons/history */
function HistoryEmptyIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 text-figma-text-secondary">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
