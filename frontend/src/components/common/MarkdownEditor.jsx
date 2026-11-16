import React, { useState } from 'react';
import { FileEdit, Eye } from 'lucide-react';
import MarkdownContent from './MarkdownContent';

export default function MarkdownEditor({
  label,
  subLabel,
  value = '',
  onChange,
  name,
  placeholder,
  rows = 4,
  maxLength,
  required = false,
  className = '',
  labelClassName = '',
  textareaClassName = '',
  minPreviewHeight = 'min-h-[110px]',
  disabled = false,
}) {
  const [tab, setTab] = useState('write'); // 'write' | 'preview'

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Header with Label and Write/Preview Tab Switcher */}
      <div className="flex items-center justify-between gap-2">
        <div>
          {label && (
            <label className={labelClassName || "block text-xs font-semibold uppercase text-[#71787e] tracking-wider"}>
              {label} {required && <span className="text-[#ba1a1a]">*</span>}
            </label>
          )}
          {subLabel && (
            <p className="text-[11px] text-[#71787e] mt-0.5">{subLabel}</p>
          )}
        </div>

        {/* Tab Switcher (Write / Preview) */}
        <div className="flex items-center gap-1 bg-[#f1f4f6] p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setTab('write')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              tab === 'write'
                ? 'bg-white text-[#0058be] shadow-xs'
                : 'text-[#71787e] hover:text-[#191c1e]'
            }`}
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              tab === 'preview'
                ? 'bg-white text-[#0058be] shadow-xs'
                : 'text-[#71787e] hover:text-[#191c1e]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* Editor Body: Write Mode or Preview Mode */}
      {tab === 'write' ? (
        <textarea
          name={name}
          rows={rows}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          required={required}
          disabled={disabled}
          className={
            textareaClassName ||
            "w-full px-4 py-3 rounded-2xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] placeholder:text-[#9199a1] focus:outline-hidden focus:border-[#0058be] font-sans leading-relaxed"
          }
        />
      ) : (
        <div
          className={`p-4 rounded-2xl border border-[#e0e3e5] bg-[#f7f9fb] ${minPreviewHeight} text-xs text-[#191c1e] overflow-y-auto leading-relaxed`}
        >
          {value && value.trim() ? (
            <MarkdownContent content={value} />
          ) : (
            <span className="text-[#71787e] italic text-xs">
              Nothing to preview yet. Switch to &quot;Write&quot; to add content.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
