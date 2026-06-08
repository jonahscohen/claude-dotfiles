import React from 'react';

interface DesignPreviewProps {
  pending: boolean;
  description?: string;
}

export function DesignPreview({ pending, description }: DesignPreviewProps) {
  if (!pending) return null;

  return (
    <div className="mx-3 my-2 p-2 rounded-md bg-figma-bg-secondary border border-figma-border">
      <div className="flex items-center gap-2 text-2xs text-figma-text-secondary">
        <svg className="w-3 h-3 animate-spin" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3" />
          <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>{description ?? 'Creating design on canvas...'}</span>
      </div>
    </div>
  );
}
