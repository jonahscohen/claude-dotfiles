import React, { useRef, useLayoutEffect } from 'react';
import type { DisplayMessage } from '../hooks/useChat';

interface MessageBubbleProps {
  message: DisplayMessage;
}

/** Reusable toast-rise animation: fade in + slide up from below. */
function useToastAnimation(ref: React.RefObject<HTMLElement | null>, distance = 14, duration = 320) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.animate(
      [
        { opacity: 0, transform: `translateY(${distance}px)` },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
    );
  }, []);
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const bubbleRef = useRef<HTMLDivElement>(null);

  useToastAnimation(bubbleRef);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        ref={bubbleRef}
        className={`max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? 'border border-figma-border text-figma-text'
            : 'bg-figma-bg-secondary text-figma-text'
        }`}
      >
        {/* Attachment previews */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {message.attachments.map((att, i) => (
              att.type === 'image' && att.preview ? (
                <img
                  key={i}
                  src={att.preview}
                  alt="Reference image"
                  className="h-16 rounded border border-figma-border object-cover"
                />
              ) : att.type === 'code' ? (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded bg-figma-bg-tertiary"
                >
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M5 3.5L2 7l3 3.5" />
                    <path d="M9 3.5l3 3.5-3 3.5" />
                  </svg>
                  {att.name}
                </span>
              ) : null
            ))}
          </div>
        )}

        {/* Tool calls (listed first for assistant messages) */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-1">
            {message.toolCalls.map((tc, i) => (
              <ToolCallItem key={`${tc.name}-${i}`} tc={tc} />
            ))}
          </div>
        )}

        {/* Message content (model's text response appears below tool calls) */}
        {message.content?.trim() ? (
          <div className={`whitespace-pre-wrap break-words ${
            message.toolCalls && message.toolCalls.length > 0 ? 'mt-1.5 pt-1.5 border-t border-figma-border' : ''
          }`}>
            {renderContent(message.content.trim())}
          </div>
        ) : null}

        {/* Streaming indicator */}
        {message.streaming && !message.content && (
          <div className={`flex gap-1 py-1 ${message.toolCalls && message.toolCalls.length > 0 ? 'mt-3' : ''}`}>
            <span className="w-1.5 h-1.5 bg-figma-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-figma-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-figma-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  );
}

function renderContent(content: string): React.ReactNode {
  if (!content) return null;

  // Basic markdown rendering: **bold**, `code`, code blocks with triple backticks
  const parts: React.ReactNode[] = [];
  let key = 0;

  // Handle code blocks with triple backticks
  const codeBlockPattern = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockPattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++}>{renderInline(content.slice(lastIndex, match.index))}</span>
      );
    }
    parts.push(
      <pre
        key={key++}
        className="mt-1.5 mb-1 bg-figma-bg-tertiary rounded p-2 text-2xs overflow-x-auto font-mono"
      >
        <code>{match[2]}</code>
      </pre>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(<span key={key++}>{renderInline(content.slice(lastIndex))}</span>);
  }

  return parts.length > 0 ? parts : content;
}

function renderInline(text: string): React.ReactNode {
  // Handle inline code and bold
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-figma-bg-tertiary px-1 py-0.5 rounded text-2xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function ToolCallItem({ tc }: { tc: { name: string; status: string; result?: string } }) {
  const ref = useRef<HTMLDivElement>(null);
  useToastAnimation(ref, 10, 260);

  return (
    <div
      ref={ref}
      className={`flex items-center gap-1.5 py-0.5 ${
        tc.status === 'running'
          ? 'text-figma-text-secondary'
          : tc.status === 'error'
          ? 'text-figma-text-tertiary'
          : 'text-figma-text-secondary'
      }`}
    >
      <StatusIcon status={tc.status} />
      <span className="font-medium">{formatToolName(tc.name)}</span>
      {tc.status === 'running' && tc.result && (
        <span className="ml-1 opacity-80">{tc.result}</span>
      )}
      {tc.status === 'running' && !tc.result && (
        <span className="animate-pulse ml-1">...</span>
      )}
    </div>
  );
}

function formatToolName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'running') {
    return (
      <svg className="w-3 h-3 animate-spin" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3" />
        <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (status === 'error') {
    return (
      <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0V5zm.75 6.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
      </svg>
    );
  }
  return (
    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.22 5.28l-4 4a.75.75 0 01-1.06 0l-2-2a.75.75 0 111.06-1.06L6.7 8.69l3.47-3.47a.75.75 0 111.06 1.06z" />
    </svg>
  );
}
