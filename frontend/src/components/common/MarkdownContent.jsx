import React from 'react';

/**
 * Lightweight, zero-dependency Markdown renderer for safe formatted text.
 * Handles:
 * - Headers (# H1, ## H2, ### H3)
 * - Bold (**bold**) and Italic (*italic*)
 * - Unordered bullet lists (- item, * item)
 * - Ordered lists (1. item)
 * - Blockquotes (> quote)
 * - Inline code (`code`)
 * - Links ([text](url))
 * - Paragraphs & line breaks
 */
export default function MarkdownContent({ content, className = '' }) {
  if (!content) return null;

  // Helper to format inline markdown spans (bold, italic, code, links)
  const formatInline = (text) => {
    // Escape standard HTML characters for safety
    let safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Inline Code: `code`
    safe = safe.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 text-[#0058be] font-mono text-[11px]">$1</code>');

    // Bold: **text** or __text__
    safe = safe.replace(/(\*\*|__)(.*?)\1/g, '<strong class="font-bold text-[#191c1e]">$2</strong>');

    // Italic: *text* or _text_
    safe = safe.replace(/(\*|_)(.*?)\1/g, '<em class="italic">$2</em>');

    // Links: [text](url)
    safe = safe.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#0058be] hover:underline font-medium inline-flex items-center gap-0.5">$1</a>'
    );

    return safe;
  };

  const lines = content.split('\n');
  const elements = [];
  let currentList = [];
  let isOrderedList = false;

  const flushList = () => {
    if (currentList.length > 0) {
      if (isOrderedList) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-1 my-2 text-inherit">
            {currentList.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2 text-inherit">
            {currentList.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            ))}
          </ul>
        );
      }
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Empty lines flush active lists
    if (!trimmed) {
      flushList();
      return;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={index} className="text-sm font-bold text-[#191c1e] mt-3 mb-1">
          {trimmed.slice(4)}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={index} className="text-base font-bold text-[#191c1e] mt-4 mb-1.5">
          {trimmed.slice(3)}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={index} className="text-lg font-extrabold text-[#191c1e] mt-4 mb-2">
          {trimmed.slice(2)}
        </h2>
      );
      return;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote
          key={index}
          className="border-l-4 border-[#0058be] pl-3 py-1 my-2 text-xs italic text-[#71787e] bg-slate-50/70 rounded-r-md"
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed.slice(2)) }}
        />
      );
      return;
    }

    // Unordered list (- or *)
    if (/^[-*]\s+/.test(trimmed)) {
      if (isOrderedList) flushList();
      isOrderedList = false;
      currentList.push(trimmed.replace(/^[-*]\s+/, ''));
      return;
    }

    // Ordered list (1. 2. etc.)
    if (/^\d+\.\s+/.test(trimmed)) {
      if (!isOrderedList) flushList();
      isOrderedList = true;
      currentList.push(trimmed.replace(/^\d+\.\s+/, ''));
      return;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p
        key={index}
        className="my-1.5 leading-relaxed text-inherit"
        dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
      />
    );
  });

  flushList();

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}

