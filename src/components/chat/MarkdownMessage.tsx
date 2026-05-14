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

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZER
// ─────────────────────────────────────────────────────────────────────────────

function normalize(raw: string): string {
  let t = raw;

  // 0. Line endings
  t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 1. Bullet-dot → dash
  t = t.replace(/^\s*[•·]\s+/gm, "- ");

  // 2. Fix stray space inside bold: "** Label**" → "**Label**"
  //    Must run BEFORE the inline-splitter so bold tokens are clean.
  t = t.replace(/\*\* ([^*\n]+)\*\*/g, "**$1**");

  // ── 3. CORE FIX ─────────────────────────────────────────────────────────
  // LLMs collapse sub-items onto a single line in two patterns:
  //
  // Pattern A – dash delimiter (most common):
  //   "1. Nodes and Edges: - **Nodes**: desc - **Edges**: desc"
  //   "Some text - **Label**: desc - **Label2**: desc"
  //
  // Pattern B – period delimiter:
  //   "1. Vertices: intro. **Edges:** desc. **Degree:** desc"
  //
  // We explode each into one parent line + indented bullet sub-items.
  t = t
    .split("\n")
    .flatMap((line): string[] => {
      const indent = (line.match(/^(\s*)/) ?? ["", ""])[1];
      const isNumbered = /^\s*\d+\.\s/.test(line);

      // ── Pattern A: " - **" ───────────────────────────────────────────────
      if (/ - \*\*/.test(line)) {
        const segments = line.split(/ - (?=\*\*)/);
        if (segments.length > 1) {
          const result: string[] = [];
          const parent = segments[0].replace(/:\s*$/, "").trim();
          if (parent) result.push(parent);
          for (let i = 1; i < segments.length; i++) {
            const sub = segments[i].trim();
            if (sub) result.push(`${indent}   - ${sub}`);
          }
          if (result.length > 1) return result;
        }
      }

      // ── Pattern B: ". **" on a numbered line ─────────────────────────────
      if (isNumbered && /\. \*\*/.test(line)) {
        const segments = line.split(/\. (?=\*\*)/);
        if (segments.length > 1) {
          const result: string[] = [];
          const first = segments[0].trim();
          result.push(first.endsWith(".") ? first : first + ".");
          for (let i = 1; i < segments.length; i++) {
            const sub = segments[i].trim();
            if (sub) result.push(`${indent}   - ${sub}`);
          }
          if (result.length > 1) return result;
        }
      }

      return [line];
    })
    .join("\n");

  // 4. Fix bold immediately followed by non-space: "**Word:**text" → "**Word:** text"
  t = t.replace(/(\*\*[^*\n]+\*\*)([^\s*\n,.])/g, "$1 $2");

  // 5. Code fence isolation
  t = t.replace(/([^\n])```/g, "$1\n```");
  t = t.replace(/```([^\n`])/g, "```\n$1");

  // 6. Blank line before headings
  t = t.replace(/([^\n])\n(#{1,6} )/g, "$1\n\n$2");

  // 7. Blank line before numbered lists
  t = t.replace(/([^\n])\n(\d+\. )/g, "$1\n\n$2");

  // 8. Blank line before bullet lists
  t = t.replace(/([^\n])\n([ \t]*- )/g, "$1\n\n$2");

  // 9. Strip orphaned --- adjacent to headings
  t = t.replace(/\n---+\n(#{1,6} )/g, "\n\n$1");
  t = t.replace(/(#{1,6} [^\n]+)\n---+\n/g, "$1\n\n");

  // 10. Collapse 3+ blank lines → 2
  t = t.replace(/\n{3,}/g, "\n\n");

  // 11. Math: ( expr ) → $expr$ when it looks mathematical
  t = t.replace(/\(\s*([A-Za-z0-9][^()]{0,30})\s*\)/g, (match, inner) => {
    const trimmed = inner.trim();
    if (/[+\-*/\\^_=<>]/.test(trimmed) || /^\d/.test(trimmed)) {
      return `$${trimmed}$`;
    }
    return match;
  });

  return t.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLE GUARD — drop last incomplete row during streaming
// ─────────────────────────────────────────────────────────────────────────────

function guardIncompleteTable(content: string): string {
  const lines = content.split("\n");
  let inTable = false;
  let sepSeen = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes("|") && trimmed.length > 1) {
      if (!inTable) { inTable = true; sepSeen = false; }
      if (/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(trimmed)) sepSeen = true;
    } else if (inTable && trimmed !== "") {
      inTable = false;
    }
  }

  if (inTable && sepSeen) {
    const last = lines[lines.length - 1].trim();
    if (last.includes("|")) {
      const pipes = (last.match(/\|/g) ?? []).length;
      if (!last.endsWith("|") || pipes < 2) {
        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i].trim().includes("|")) { lines.splice(i, 1); break; }
        }
      }
    }
  }
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// CODE BLOCK RENDERER
// ─────────────────────────────────────────────────────────────────────────────

function CodeBlock({
  className,
  children,
  rest,
}: {
  className?: string;
  children: React.ReactNode;
  rest: React.HTMLAttributes<HTMLElement>;
}) {
  const isBlock = !!(className?.includes("language-"));
  if (!isBlock) {
    return (
      <code
        className="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 text-[0.85em] font-mono"
        {...rest}
      >
        {children}
      </code>
    );
  }
  const lang = className?.replace("language-", "") ?? "code";
  return (
    <div className="relative group my-2">
      <div className="absolute top-2 right-2 text-[10px] uppercase tracking-wide opacity-60 bg-black/40 text-white px-2 py-0.5 rounded group-hover:opacity-90 select-none">
        {lang}
      </div>
      <pre className="bg-black/80 rounded-md overflow-x-auto text-xs border border-white/10 p-3">
        <code className={className} {...rest}>
          {children}
        </code>
      </pre>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const MarkdownMessage = ({ content, isDark }: MarkdownMessageProps) => {
  const processed = guardIncompleteTable(normalize(content));

  return (
    <div className={isDark ? "prose-invert" : undefined}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          h1: ({ node, ...props }) => (
            <h1 className="text-[1.15rem] font-semibold mt-3 mb-2 first:mt-0 border-b border-gray-600/20 pb-1" {...props} />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          h2: ({ node, ...props }) => (
            <h2 className="text-[1.05rem] font-semibold mt-2.5 mb-1.5 first:mt-0" {...props} />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          h3: ({ node, ...props }) => (
            <h3 className="text-[1rem] font-semibold mt-2 mb-1 first:mt-0" {...props} />
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
            <ul className="my-1.5 space-y-1 ml-5 list-disc" {...props} />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ol: ({ node, ...props }) => (
            <ol className="my-1.5 space-y-1 ml-5 list-decimal" {...props} />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          li: ({ node, ...props }) => (
            <li className="leading-relaxed pl-0.5" {...props} />
          ),
          code: ({ className, children, ...rest }) => (
            <CodeBlock className={className} rest={rest}>
              {children}
            </CodeBlock>
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          pre: ({ node, ...props }) => <>{props.children}</>,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-3">
              <table className="w-full border-collapse text-sm" {...props} />
            </div>
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          thead: ({ node, ...props }) => (
            <thead className="bg-black/10 dark:bg-white/10" {...props} />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          tbody: ({ node, ...props }) => <tbody {...props} />,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-black/5 dark:hover:bg-white/5" {...props} />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          th: ({ node, ...props }) => (
            <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 font-semibold text-left" {...props} />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          td: ({ node, ...props }) => (
            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 align-top" {...props} />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-gray-400/40 pl-3 italic opacity-90 my-2" {...props} />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          hr: ({ node, ...props }) => (
            <hr className="border-t border-gray-400/20 my-3" {...props} />
          ),
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          a: ({ node, ...props }) => (
            <a className="underline underline-offset-2 opacity-90 hover:opacity-100" target="_blank" rel="noopener noreferrer" {...props} />
          ),
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownMessage;