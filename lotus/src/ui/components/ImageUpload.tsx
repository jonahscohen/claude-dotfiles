import React, { useCallback, useRef, useState } from 'react';

interface ImageUploadProps {
  onImageData: (base64: string) => void;
}

export function ImageUpload({ onImageData }: ImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as string;
      setPreview(data);
      onImageData(data);
    };
    reader.readAsDataURL(file);
  }, [onImageData]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) handleFile(file);
        break;
      }
    }
  }, [handleFile]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      onPaste={handlePaste}
      className="relative"
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Reference"
            className="max-h-20 rounded border border-figma-border"
          />
          <button
            onClick={() => { setPreview(null); }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-figma-danger text-white rounded-full text-2xs flex items-center justify-center"
          >
            x
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="p-1 rounded hover:bg-figma-bg-secondary text-figma-text-tertiary"
          title="Attach reference image"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="1" y="2" width="12" height="10" rx="1.5" />
            <circle cx="4.5" cy="5.5" r="1" />
            <path d="M1 10l3.5-3.5L7 9l2.5-2.5L13 10" />
          </svg>
        </button>
      )}
    </div>
  );
}
