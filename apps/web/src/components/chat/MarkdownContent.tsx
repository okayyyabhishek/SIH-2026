"use client";

import React from "react";

interface MarkdownContentProps {
  content: string;
  isUser?: boolean;
}

/**
 * Format inline markdown tokens: **bold**, *italic*, `code`, and links
 */
function renderInlineFormatted(text: string, isUser = false): React.ReactNode[] {
  // Regex to split by bold (**text**), inline code (`code`), or italic (*text*)
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      const boldText = part.slice(2, -2);
      return (
        <strong
          key={index}
          className={`font-bold ${isUser ? "text-white" : "text-slate-900 dark:text-white"}`}
        >
          {boldText}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      const codeText = part.slice(1, -1);
      return (
        <code
          key={index}
          className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${
            isUser
              ? "bg-blue-800/60 text-white"
              : "bg-slate-100 dark:bg-sentinel-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-sentinel-700/60"
          }`}
        >
          {codeText}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      const italicText = part.slice(1, -1);
      return (
        <em key={index} className="italic">
          {italicText}
        </em>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

/**
 * Robust markdown block renderer that formats headers, lists, and paragraphs
 * without showing unsightly raw markdown characters like ### or **.
 */
export function MarkdownContent({ content, isUser = false }: MarkdownContentProps) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let currentListItems: React.ReactNode[] = [];

  const flushList = (keyPrefix: number) => {
    if (currentListItems.length > 0) {
      elements.push(
        <ul key={`list-${keyPrefix}`} className="space-y-1.5 my-2.5">
          {currentListItems}
        </ul>
      );
      currentListItems = [];
    }
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    if (!line) {
      flushList(idx);
      return;
    }

    // Header 3: ### Heading
    if (line.startsWith("### ")) {
      flushList(idx);
      const title = line.slice(4).trim();
      elements.push(
        <h3
          key={`h3-${idx}`}
          className={`text-sm sm:text-base font-bold tracking-tight mt-3 mb-1.5 pb-1 flex items-center gap-1.5 ${
            isUser
              ? "text-white"
              : "text-slate-900 dark:text-white border-b border-slate-200/80 dark:border-sentinel-800/80"
          }`}
        >
          {renderInlineFormatted(title, isUser)}
        </h3>
      );
      return;
    }

    // Header 2: ## Heading
    if (line.startsWith("## ")) {
      flushList(idx);
      const title = line.slice(3).trim();
      elements.push(
        <h2
          key={`h2-${idx}`}
          className={`text-base sm:text-lg font-bold tracking-tight mt-3.5 mb-2 pb-1 ${
            isUser
              ? "text-white"
              : "text-slate-900 dark:text-white border-b border-slate-200 dark:border-sentinel-800"
          }`}
        >
          {renderInlineFormatted(title, isUser)}
        </h2>
      );
      return;
    }

    // Header 1: # Heading
    if (line.startsWith("# ")) {
      flushList(idx);
      const title = line.slice(2).trim();
      elements.push(
        <h1
          key={`h1-${idx}`}
          className={`text-lg sm:text-xl font-extrabold tracking-tight mt-4 mb-2 pb-1.5 ${
            isUser
              ? "text-white"
              : "text-slate-900 dark:text-white border-b border-slate-200 dark:border-sentinel-800"
          }`}
        >
          {renderInlineFormatted(title, isUser)}
        </h1>
      );
      return;
    }

    // Bullet List items: - item or * item
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const itemText = line.slice(2).trim();
      currentListItems.push(
        <li
          key={`li-${idx}`}
          className={`flex items-start gap-2 text-xs leading-relaxed ${
            isUser ? "text-blue-50" : "text-slate-700 dark:text-slate-200"
          }`}
        >
          <span
            className={`font-bold select-none leading-4 ${
              isUser ? "text-amber-300" : "text-emerald-500 dark:text-emerald-400"
            }`}
          >
            •
          </span>
          <div className="flex-1">{renderInlineFormatted(itemText, isUser)}</div>
        </li>
      );
      return;
    }

    // Numbered List items: 1. item
    const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      const num = numberedMatch[1];
      const itemText = numberedMatch[2];
      currentListItems.push(
        <li
          key={`num-li-${idx}`}
          className={`flex items-start gap-2 text-xs leading-relaxed ${
            isUser ? "text-blue-50" : "text-slate-700 dark:text-slate-200"
          }`}
        >
          <span
            className={`font-mono text-[11px] font-bold select-none min-w-[18px] ${
              isUser ? "text-amber-300" : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {num}.
          </span>
          <div className="flex-1">{renderInlineFormatted(itemText, isUser)}</div>
        </li>
      );
      return;
    }

    // Plain paragraph text
    flushList(idx);
    elements.push(
      <p
        key={`p-${idx}`}
        className={`leading-relaxed my-1.5 text-xs sm:text-[13px] ${
          isUser ? "text-white" : "text-slate-800 dark:text-slate-200"
        }`}
      >
        {renderInlineFormatted(line, isUser)}
      </p>
    );
  });

  flushList(lines.length);

  return <div className="space-y-1">{elements}</div>;
}
