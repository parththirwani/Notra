"use client";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";

import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";

interface MarkdownMessageProps {
  content: string;
  isDark?: boolean;
}

function normalizeMarkdownContent(input: string): string {
  let text = input;

  // Fix missing space after punctuation
  text = text.replace(/([a-zA-Z0-9])([.!?])(\S)/g, "$1$2 $3");

  // Convert bullet dots to dashes
  text = text.replace(/^\s*•\s+/gm, "- ");

  // Fix ( X ) single letter math notation -> bold
  text = text.replace(/\(\s*([A-Za-z])\s*\)/g, "**$1**");

  // Fix ( expr ) math expressions -> LaTeX
  text = text.replace(
    /\(\s*([A-Za-z0-9][^()]{0,30})\s*\)/g,
    (match, inner) => {
      const trimmed = inner.trim();
      if (/[+\-*/\\^_=<>]/.test(trimmed) || /^\d/.test(trimmed)) {
        return `$${trimmed}$`;
      }
      return match;
    }
  );

  // Ensure code fences are on their own lines
  text = text.replace(/([^\n])```/g, "$1\n```");
  text = text.replace(/```([^\n`])/g, "```\n$1");

  // ── KEY FIX: detect "1. Foo:* bar" pattern — bullet jammed after numbered item
  // Split "1. Title:* bullet" into proper structure
  text = text.replace(
    /^(\d+)\.\s+(.+?):\s*\n?\s*\*\s+/gm,
    (_, num, title) => `${num}. **${title}:**\n\n   - `
  );

  // Fix bullets that appear inline after a colon on the same line
  // e.g. "Purpose:**ijkstra" -> fix the broken bold too
  text = text.replace(/\*\*([^*]+)\*\*([a-z])/g, "**$1** $2");

  // Fix numbered lists that restart after bullet interruption
  // Renumber sequences that restart at 1 when they shouldn't
  text = (() => {
    const lines = text.split("\n");
    const out: string[] = [];
    let numberedCounter = 0;
    let inNumberedList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const numberedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      const isBullet = /^\s*[-*]\s+/.test(line);
      const isEmpty = line.trim() === "";

      if (numberedMatch) {
        const [, indent, , content] = numberedMatch;
        if (!inNumberedList || numberedMatch[2] === "1") {
          if (!inNumberedList) {
            numberedCounter = 1;
            inNumberedList = true;
          } else if (numberedMatch[2] === "1" && numberedCounter > 1) {
            // Restart detected — continue numbering instead
            numberedCounter++;
          } else {
            numberedCounter = 1;
          }
        } else {
          numberedCounter++;
        }
        out.push(`${indent}${numberedCounter}. ${content}`);
      } else {
        if (!isBullet && !isEmpty) {
          inNumberedList = false;
          numberedCounter = 0;
        }
        out.push(line);
      }
    }
    return out.join("\n");
  })();

  // Insert newline before numbered list items jammed together
  text = text.replace(/([^\n])(\n?)(\d+)\.\s+/g, (match, before, nl, num) => {
    if (nl === "\n") return match;
    return `${before}\n${num}. `;
  });

  // Insert newline before dash bullets when jammed
  text = text.replace(/([^\n])\n?(\s*)-\s+/g, (match, before, indent) => {
    if (before === "\n" || before === "") return match;
    return `${before}\n${indent}- `;
  });

  // Ensure headings start on their own line
  text = text.replace(
    /(?<!^)(?<!\n)(\s*)(#{1,6}\s)/g,
    (m, s, h) => `\n${h}`
  );

  // Fix "**Purpose:**ijkstra" broken bold (letter immediately after closing **)
  text = text.replace(/\*\*([^*\n]+)\*\*([A-Za-z])/g, "**$1** $2");

  // Fix lines that end with "**" and next line starts mid-word (broken bold across lines)
  text = text.replace(/\*\*\n([a-z])/g, "** $1");

  // Clean orphan ---
  text = text.replace(/\s*---+\s*(?=(#{1,6}\s))/g, "\n\n");
  text = text.replace(/(^|\n)\s*---+\s*(\n|$)/g, "\n\n");

  // Collapse blank lines between consecutive list items
  text = text.replace(/(\n-\s+[^\n]+)\n\s*\n(\s*-\s+)/g, "$1\n$2");
  text = text.replace(
    /(\n\d+\.\s+[^\n]+)\n\s*\n(\s*\d+\.\s+)/g,
    "$1\n$2"
  );

  // Remove excessive blank line after headings
  text = text.replace(/(\n#{1,6}[^\n]*?)\n\s*\n/g, "$1\n");

  // Ensure blank line before headings
  text = text.replace(/([^\n])\n(#{1,6}\s)/g, "$1\n\n$2");

  // Ensure blank line before numbered lists
  text = text.replace(/([^\n])\n(\d+\.\s)/g, "$1\n\n$2");

  // Ensure blank line before bullet lists
  text = text.replace(/([^\n])\n(-\s)/g, "$1\n\n$2");

  // Collapse 3+ newlines to max 2
  text = text.replace(/\n{3,}/g, "\n\n");

  return text;
}

function hasIncompleteTable(content: string): boolean {
  const lines = content.split("\n");
  let inTable = false;
  let hasHeaderSeparator = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes("|") && line.length > 1) {
      if (!inTable) {
        inTable = true;
        hasHeaderSeparator = false;
      }
      if (line.match(/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/)) {
        hasHeaderSeparator = true;
      }
    } else if (inTable && line === "") {
      continue;
    } else if (inTable && !line.includes("|")) {
      inTable = false;
    }
  }

  if (inTable && hasHeaderSeparator) {
    const lastTableLine = lines[lines.length - 1];
    if (lastTableLine && lastTableLine.includes("|")) {
      const trimmed = lastTableLine.trim();
      const pipeCount = (trimmed.match(/\|/g) || []).length;
      if (!trimmed.endsWith("|") || pipeCount < 2) {
        return true;
      }
    }
  }

  return false;
}

function preprocessContent(content: string): string {
  if (hasIncompleteTable(content)) {
    const lines = content.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.includes("|")) {
        lines.splice(i, 1);
        break;
      }
    }
    return lines.join("\n");
  }
  return content;
}

const MarkdownMessage = ({ content, isDark }: MarkdownMessageProps) => {
  const normalized = normalizeMarkdownContent(content);
  const preprocessed = preprocessContent(normalized);

  return (
    <div className={isDark ? "prose-invert" : undefined}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          h1: ({ node, ...props }) => (
            <h1
              className="text-[1.15rem] font-semibold mt-3 mb-2 first:mt-0 border-b border-gray-600/20 pb-1"
              {...props}
            />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          h2: ({ node, ...props }) => (
            <h2
              className="text-[1.05rem] font-semibold mt-2.5 mb-1.5 first:mt-0"
              {...props}
            />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          h3: ({ node, ...props }) => (
            <h3
              className="text-[1rem] font-semibold mt-2 mb-1 first:mt-0"
              {...props}
            />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          p: ({ node, ...props }) => (
            <p className="mb-2 leading-relaxed last:mb-0" {...props} />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          strong: ({ node, ...props }) => (
            <strong className="font-semibold" {...props} />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          em: ({ node, ...props }) => (
            <em className="italic opacity-90" {...props} />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ul: ({ node, ...props }) => (
            <ul className="my-1 space-y-0.5 ml-5 list-disc" {...props} />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ol: ({ node, ...props }) => (
            <ol className="my-1 space-y-0.5 ml-5 list-decimal" {...props} />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          li: ({ node, ...props }) => (
            <li className="leading-relaxed" {...props} />
          ),
          code: ({ className, children, ...rest }) =>
            codeRenderer({ className, children, props: rest }),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          pre: ({ node, ...props }) => (
            <pre
              className="bg-black/80 text-white text-xs rounded-md p-3 overflow-x-auto my-2 border border-white/10"
              {...props}
            />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          table: ({ node, ...props }) => (
            <table
              className="w-full border-collapse my-3 text-sm"
              {...props}
            />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          thead: ({ node, ...props }) => (
            <thead className="bg-black/10" {...props} />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          tbody: ({ node, ...props }) => <tbody {...props} />,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          tr: ({ node, ...props }) => (
            <tr
              className="hover:bg-black/5 dark:hover:bg-white/5"
              {...props}
            />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          th: ({ node, ...props }) => (
            <th className="border px-3 py-2 font-semibold" {...props} />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          td: ({ node, ...props }) => (
            <td className="border px-3 py-2 align-top" {...props} />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 pl-3 italic opacity-90 my-2"
              {...props}
            />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          hr: ({ node, ...props }) => (
            <hr className="border-t my-3 opacity-30" {...props} />
          ),
        }}
      >
        {preprocessed}
      </ReactMarkdown>
    </div>
  );
};

function codeRenderer({
  className,
  children,
  props,
}: {
  className?: string;
  children: React.ReactNode;
  props: React.HTMLAttributes<HTMLElement>;
}) {
  const isBlock = !!(className && className.includes("language-"));
  if (!isBlock) {
    return (
      <code
        className="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 text-[0.85em]"
        {...props}
      >
        {children}
      </code>
    );
  }
  const lang = className?.replace("language-", "") || "code";
  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 text-[10px] uppercase tracking-wide opacity-60 bg-black/40 text-white px-2 py-0.5 rounded group-hover:opacity-90">
        {lang}
      </div>
      <pre className="bg-black/80 rounded-md overflow-x-auto my-2 text-xs border border-white/10">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

export default MarkdownMessage;