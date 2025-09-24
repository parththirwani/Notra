"use client";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";

// styles for code highlighting and math rendering
import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";

interface MarkdownMessageProps {
	content: string;
	isDark?: boolean;
}

function normalizeMarkdownContent(input: string): string {
	let text = input;
	// Ensure a space after end punctuation if missing (e.g., "today?Its" -> "today? Its")
	text = text.replace(/([a-zA-Z0-9])([.!?])(\S)/g, "$1$2 $3");
	// Convert lines that start with a bullet dot to markdown dashes
	text = text.replace(/^\s*•\s+/gm, "- ");
	// Insert newline before numbered list tokens that are jammed together
	text = text.replace(/(?<!^)(?<!\n)(\s*)(\d+\.)\s+/g, (m, s, num) => `\n${num} `);
	// Insert newline before dash bullets when jammed
	text = text.replace(/(?<!\n)(\s*)-\s+/g, "\n- ");
	// Ensure headings start on their own line
	text = text.replace(/(?<!^)(?<!\n)(\s*)(#{1,6}\s)/g, (m, s, h) => `\n${h}`);
	// Convert orphan hr/--- stuck to text or headings into clean separators
	// e.g. ":---##" -> "\n\n##"
	text = text.replace(/\s*---+\s*(?=(#{1,6}\s))/g, "\n\n");
	// Or convert lone --- to a paragraph gap
	text = text.replace(/(^|\n)\s*---+\s*(\n|$)/g, "\n\n");
	// Collapse blank lines between consecutive list items
	text = text.replace(/(\n-\s+[^\n]+)\n\s*\n(\s*-\s+)/g, "$1\n$2");
	text = text.replace(/(\n\d+\.\s+[^\n]+)\n\s*\n(\s*\d+\.\s+)/g, "$1\n$2");
	// Remove excessive blank line immediately after headings
	text = text.replace(/(\n#{1,6}[^\n]*?)\n\s*\n/g, "$1\n");
	// Collapse 3+ newlines to max 2
	text = text.replace(/\n{3,}/g, "\n\n");
	return text;
}

function applySoftBreaks(input: string): string {
	// Add markdown soft breaks only for plain text lines. Do not add before structural lines.
	const lines = input.split(/\n/);
	let out: string[] = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const next = lines[i + 1] ?? "";
		const nextIsStructural = /^(\s*[-*+]\s|\s*\d+\.\s|\s*>\s|\s*#{1,6}\s|\s*```|\s*$)/.test(next);
		if (!nextIsStructural) {
			out.push(line + "  ");
		} else {
			out.push(line);
		}
	}
	return out.join("\n");
}

const MarkdownMessage = ({ content, isDark }: MarkdownMessageProps) => {
	const normalized = normalizeMarkdownContent(content);
	const prepared = applySoftBreaks(normalized);
	return (
		<div className={isDark ? "prose-invert" : undefined}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm, remarkMath]}
				rehypePlugins={[rehypeKatex, rehypeHighlight]}
				components={{
					// Headers
					h1: ({ node, ...props }) => (
						<h1 className="text-[1.15rem] font-semibold mt-3 mb-2 first:mt-0 border-b border-gray-600/20 pb-1" {...props} />
					),
					h2: ({ node, ...props }) => (
						<h2 className="text-[1.05rem] font-semibold mt-2.5 mb-1.5 first:mt-0" {...props} />
					),
					h3: ({ node, ...props }) => (
						<h3 className="text-[1rem] font-semibold mt-2 mb-1 first:mt-0" {...props} />
					),
					// Paragraphs
					p: ({ node, ...props }) => (
						<p className="mb-2 leading-relaxed last:mb-0" {...props} />
					),
					strong: ({ node, ...props }) => (
						<strong className="font-semibold" {...props} />
					),
					em: ({ node, ...props }) => <em className="italic opacity-90" {...props} />,
					// Lists
					ul: ({ node, ...props }) => (
						<ul className="my-1 space-y-0.5 ml-5 list-disc" {...props} />
					),
					ol: ({ node, ...props }) => (
						<ol className="my-1 space-y-0.5 ml-5 list-decimal" {...props} />
					),
					li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
					// Code (inline and block)
					code: ({ className, children, ...props }) => (
						codeRenderer({ className, children, props })
					),
					pre: ({ node, ...props }) => (
						<pre className="bg-black/80 text-white text-xs rounded-md p-3 overflow-x-auto my-2 border border-white/10" {...props} />
					),
					// Tables
					table: ({ node, ...props }) => (
						<table className="w-full border-collapse my-3 text-sm" {...props} />
					),
					thead: ({ node, ...props }) => <thead className="bg-black/10" {...props} />,
					tbody: ({ node, ...props }) => <tbody className="divide-y divide-black/10 dark:divide-white/10" {...props} />,
					tr: ({ node, ...props }) => <tr className="hover:bg-black/5 dark:hover:bg-white/5" {...props} />,
					th: ({ node, ...props }) => (
						<th className="border px-3 py-2 font-semibold" {...props} />
					),
					td: ({ node, ...props }) => (
						<td className="border px-3 py-2 align-top" {...props} />
					),
					// Links
					a: ({ node, ...props }) => (
						<a className="underline underline-offset-2 hover:opacity-90" target="_blank" rel="noreferrer" {...props} />
					),
					// Quotes
					blockquote: ({ node, ...props }) => (
						<blockquote className="border-l-4 pl-3 italic opacity-90 my-2" {...props} />
					),
					// Horizontal rule
					hr: (props) => <hr className="border-t my-3 opacity-30" {...props} />,
				}}
			>
				{prepared}
			</ReactMarkdown>
		</div>
	);
};

function codeRenderer({ className, children, props }: { className?: string; children: React.ReactNode; props: any; }) {
	const isBlock = !!(className && className.includes("language-"));
	if (!isBlock) {
		return (
			<code className="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 text-[0.85em]" {...props}>
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