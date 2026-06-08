import React, { useState } from 'react';

interface CodePreviewProps {
  code: string;
  framework: string;
}

export function CodePreview({ code, framework }: CodePreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-figma-border">
        <span className="text-xs font-medium text-figma-text">
          {framework.toUpperCase()} Export
        </span>
        <button
          onClick={handleCopy}
          className="text-2xs px-2 py-1 rounded bg-figma-bg-secondary hover:bg-figma-bg-tertiary text-figma-text-secondary"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="flex-1 overflow-auto p-3 text-2xs font-mono text-figma-text bg-figma-bg-secondary leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
