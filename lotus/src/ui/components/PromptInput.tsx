import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { AppMode } from '../App';

interface CodeFile {
  name: string;
  content: string;
}

export interface EnabledProvider {
  name: string;
  model: string;
}

interface PromptInputProps {
  onSend: (content: string, imageData?: string, codeFiles?: CodeFile[]) => Promise<void>;
  onCancel: () => void;
  isStreaming: boolean;
  placeholder: string;
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  activeProvider: string;
  activeModel: string;
  enabledProviders: EnabledProvider[];
  onProviderChange: (name: string) => void;
  tokenUsageInput: number;
  tokenUsageOutput: number;
  prefill?: string;
  onPrefillConsumed?: () => void;
}

const MODE_LABELS: Record<AppMode, string> = {
  generate: 'Design',
  modify: 'Modify',
  'style-transfer': 'Style Transfer',
  components: 'Components',
  'code-export': 'Code Export',
  audit: 'Conformance',
  critique: 'Critique',
};

// Human-friendly labels for provider + model combinations
const MODEL_DISPLAY: Record<string, string> = {
  'claude-opus-4-8': 'Claude Opus 4.8',
  'claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'claude-haiku-4-6': 'Claude Haiku 4.6',
  'gpt-5.5': 'ChatGPT 5.5',
  'gpt-5.2': 'ChatGPT 5.2',
  'gpt-5': 'ChatGPT 5',
  'gemini-3.1-pro-preview': 'Gemini 3.1 Pro',
  'gemini-3-flash-preview': 'Gemini 3 Flash',
  'gemini-2.5-pro-preview-06-05': 'Gemini 2.5 Pro',
  'gemini-2.5-flash-preview-05-20': 'Gemini 2.5 Flash',
};

export function PromptInput({
  onSend, onCancel, isStreaming, placeholder,
  mode, onModeChange,
  activeProvider, activeModel, enabledProviders, onProviderChange,
  tokenUsageInput, tokenUsageOutput,
  prefill, onPrefillConsumed,
}: PromptInputProps) {
  const [value, setValue] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const [codeFiles, setCodeFiles] = useState<CodeFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(
      trimmed,
      imageData ?? undefined,
      codeFiles.length > 0 ? codeFiles : undefined
    );
    setValue('');
    setImageData(null);
    setCodeFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, isStreaming, onSend, imageData, codeFiles]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && isStreaming) {
      onCancel();
    }
  }, [handleSend, isStreaming, onCancel]);

  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as string;
      setImageData(data);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCodeFiles = useCallback((files: FileList) => {
    const newFiles: CodeFile[] = [];
    let remaining = files.length;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        newFiles.push({ name: file.name, content });
        remaining--;
        if (remaining === 0) {
          setCodeFiles(prev => [...prev, ...newFiles]);
        }
      };
      reader.readAsText(file);
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleImageFile(file);
        return;
      }
    }
  }, [handleImageFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageFile(file);
    }
  }, [handleImageFile]);

  const removeCodeFile = useCallback((index: number) => {
    setCodeFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [value]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Consume prefill from empty-state hint clicks
  useEffect(() => {
    if (prefill) {
      setValue(prefill);
      onPrefillConsumed?.();
      textareaRef.current?.focus();
    }
  }, [prefill, onPrefillConsumed]);

  const hasAttachments = imageData || codeFiles.length > 0;
  const hasTokenUsage = tokenUsageInput > 0 || tokenUsageOutput > 0;

  return (
    <div
      className="border-t border-figma-border px-3 pt-2 pb-3"
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
    >
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])}
        className="hidden"
      />
      <input
        ref={codeInputRef}
        type="file"
        accept=".tsx,.ts,.jsx,.js,.css,.scss,.html,.vue,.svelte,.json,.md,.txt"
        multiple
        onChange={e => e.target.files && handleCodeFiles(e.target.files)}
        className="hidden"
      />

      {/* Attachment previews */}
      {hasAttachments && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {imageData && (
            <div className="relative group">
              <img
                src={imageData}
                alt="Attached reference"
                className="h-12 rounded border border-figma-border object-cover"
              />
              <button
                onClick={() => setImageData(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-figma-bg-tertiary border border-figma-border text-figma-text-secondary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-figma-border hover:text-figma-text"
                title="Remove image"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" />
                </svg>
              </button>
            </div>
          )}
          {codeFiles.map((cf, i) => (
            <div
              key={`${cf.name}-${i}`}
              className="flex items-center gap-1 bg-figma-bg-secondary rounded px-1.5 py-0.5 text-2xs text-figma-text group"
            >
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 text-figma-text-tertiary">
                <path d="M4 1h6l4 4v10H4z" />
                <path d="M10 1v4h4" />
              </svg>
              <span className="max-w-[80px] truncate">{cf.name}</span>
              <button
                onClick={() => removeCodeFile(i)}
                className="text-figma-text-tertiary hover:text-figma-danger ml-0.5"
                title="Remove file"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                  <path d="M1.5 0.5L4 3L6.5 0.5L7.5 1.5L5 4L7.5 6.5L6.5 7.5L4 5L1.5 7.5L0.5 6.5L3 4L0.5 1.5Z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Row 1: Attachment buttons (left) + token usage (right) */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          {!isStreaming && (
            <>
              <button
                onClick={() => codeInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] border border-figma-border text-xs text-figma-text-tertiary hover:text-figma-text hover:border-figma-text-tertiary transition-colors"
                title="Attach code files"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 3.5L2 7l3 3.5" />
                  <path d="M9 3.5l3 3.5-3 3.5" />
                </svg>
                <span>Add Code</span>
              </button>
              <button
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] border border-figma-border text-xs text-figma-text-tertiary hover:text-figma-text hover:border-figma-text-tertiary transition-colors"
                title="Attach reference image"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="1" y="2" width="12" height="10" rx="1.5" />
                  <circle cx="4.5" cy="5.5" r="1" />
                  <path d="M1 10l3.5-3.5L7 9l2.5-2.5L13 10" />
                </svg>
                <span>Add Image</span>
              </button>
            </>
          )}
          {isStreaming && (
            <span className="text-xs text-white animate-pulse">Processing...</span>
          )}
        </div>

        {hasTokenUsage && (
          <span className="text-2xs text-figma-text-tertiary" title={`Input: ${formatTokens(tokenUsageInput)} | Output: ${formatTokens(tokenUsageOutput)}`}>
            {formatTokens(tokenUsageInput)}<span className="opacity-40"> in</span>{' / '}{formatTokens(tokenUsageOutput)}<span className="opacity-40"> out</span>
          </span>
        )}
      </div>

      {/* Row 2: Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        disabled={isStreaming}
        rows={1}
        className="w-full resize-none bg-transparent text-sm text-figma-text placeholder:text-figma-text-tertiary outline-none disabled:opacity-50 leading-relaxed"
        style={{ minHeight: '32px', maxHeight: '120px' }}
      />

      {/* Row 3: Provider pill + Mode pill (left) + Send button (right) */}
      <div className="flex items-center justify-between mt-1.5 pt-3 border-t border-figma-border -mx-3 px-3">
        <div className="flex items-center gap-2">
          {/* Provider dropdown pill */}
          <div className="relative">
            <select
              value={activeProvider}
              onChange={e => onProviderChange(e.target.value)}
              disabled={isStreaming || enabledProviders.length <= 1}
              className="appearance-none bg-figma-bg-secondary border border-figma-border rounded-[5px] pl-3 pr-7 py-1.5 text-sm text-figma-text cursor-pointer outline-none focus:ring-1 focus:ring-figma-text-tertiary disabled:opacity-40 disabled:cursor-not-allowed hover:border-figma-text-tertiary transition-colors"
            >
              {enabledProviders.map(p => (
                <option key={p.name} value={p.name}>
                  {MODEL_DISPLAY[p.model] || `${capitalize(p.name)} ${p.model}`}
                </option>
              ))}
              {enabledProviders.length === 0 && (
                <option value="">No provider</option>
              )}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-figma-text-tertiary" />
          </div>

          {/* Mode dropdown pill */}
          <div className="relative">
            <select
              value={mode}
              onChange={e => onModeChange(e.target.value as AppMode)}
              disabled={isStreaming}
              className="appearance-none bg-figma-bg-secondary border border-figma-border rounded-[5px] pl-3 pr-7 py-1.5 text-sm text-figma-text cursor-pointer outline-none focus:ring-1 focus:ring-figma-text-tertiary disabled:opacity-40 disabled:cursor-not-allowed hover:border-figma-text-tertiary transition-colors"
            >
              {(Object.keys(MODE_LABELS) as AppMode[]).map(m => (
                <option key={m} value={m}>{MODE_LABELS[m]}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-figma-text-tertiary" />
          </div>
        </div>

        {/* Send / Cancel */}
        {isStreaming ? (
          <button
            onClick={onCancel}
            className="w-9 h-9 flex items-center justify-center rounded-[5px] bg-white text-figma-bg hover:bg-gray-200 transition-colors"
            title="Cancel (Esc)"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 4l6 6M10 4l-6 6" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim()}
            className="w-9 h-9 flex items-center justify-center rounded-[5px] bg-figma-bg-tertiary text-figma-text-secondary hover:bg-figma-text hover:text-figma-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Send (Enter)"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 12V2M7 2L3 6M7 2l4 4" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2.5 4L5 6.5L7.5 4" />
    </svg>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}


function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
