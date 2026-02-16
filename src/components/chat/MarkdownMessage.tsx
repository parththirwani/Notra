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
	const lines = input.split("\n");
	const out: string[] = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line.trim() === "" || line.match(/^\s*[#-]/) || line.match(/^\s*\d+\./)) {
			out.push(line);
		} else {
			out.push(line);
		}
	}
	return out.join("\n");
}

// Helper function to detect incomplete tables
function hasIncompleteTable(content: string): boolean {
	const lines = content.split('\n');
	let inTable = false;
	let hasHeaderSeparator = false;
	
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		
		// Check if line looks like a table row
		if (line.includes('|') && line.length > 1) {
			if (!inTable) {
				inTable = true;
				hasHeaderSeparator = false;
			}
			
			// Check if this is a header separator line (like | --- | --- |)
			if (line.match(/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/)) {
				hasHeaderSeparator = true;
			}
		} else if (inTable && line === '') {
			// Empty line might be end of table or just spacing
			continue;
		} else if (inTable && !line.includes('|')) {
			// Non-table line after table content - table is complete
			inTable = false;
		}
	}
	
	// If we're still in a table at the end, check if it's incomplete
	if (inTable && hasHeaderSeparator) {
		const lastTableLine = lines[lines.length - 1];
		// Incomplete if: has pipes but doesn't end with pipe, OR has odd number of pipes
		if (lastTableLine && lastTableLine.includes('|')) {
			const trimmed = lastTableLine.trim();
			const pipeCount = (trimmed.match(/\|/g) || []).length;
			// Table row should have pipes at start/end and between cells
			// If it doesn't end with |, or has inconsistent pipe count, it's incomplete
			if (!trimmed.endsWith('|') || pipeCount < 2) {
				return true;
			}
		}
	}
	
	return false;
}

// Helper function to clean up incomplete table rows
function preprocessContent(content: string): string {
	if (hasIncompleteTable(content)) {
		const lines = content.split('\n');
		
		// Find the last table line and remove it if incomplete
		for (let i = lines.length - 1; i >= 0; i--) {
			const line = lines[i].trim();
			if (line.includes('|')) {
				// Remove incomplete row to prevent malformed rendering
				lines.splice(i, 1);
				break;
			}
		}
		
		return lines.join('\n');
	}
	
	return content;
}

const MarkdownMessage = ({ content, isDark }: MarkdownMessageProps) => {
	const normalized = normalizeMarkdownContent(content);
	const preprocessed = preprocessContent(normalized);
	const prepared = applySoftBreaks(preprocessed);
	
	return (
		<div className={isDark ? "prose-invert" : undefined}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm, remarkMath]}
				rehypePlugins={[rehypeKatex, rehypeHighlight]}
				components={{
					// Headers
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
					// Paragraphs
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					p: ({ node, ...props }) => (
						<p className="mb-2 leading-relaxed last:mb-0" {...props} />
					),
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					strong: ({ node, ...props }) => (
						<strong className="font-semibold" {...props} />
					),
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					em: ({ node, ...props }) => <em className="italic opacity-90" {...props} />,
					// Lists
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					ul: ({ node, ...props }) => (
						<ul className="my-1 space-y-0.5 ml-5 list-disc" {...props} />
					),
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					ol: ({ node, ...props }) => (
						<ol className="my-1 space-y-0.5 ml-5 list-decimal" {...props} />
					),
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
					// Code (inline and block)
					code: ({ className, children, ...props }) => (
						codeRenderer({ className, children, props })
					),
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					pre: ({ node, ...props }) => (
						<pre className="bg-black/80 text-white text-xs rounded-md p-3 overflow-x-auto my-2 border border-white/10" {...props} />
					),
					// Tables
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					table: ({ node, ...props }) => (
						<table className="w-full border-collapse my-3 text-sm" {...props} />
					),
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					thead: ({ node, ...props }) => <thead className="bg-black/10" {...props} />,
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					tbody: ({ node, ...props }) => <tbody {...props} />,
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					tr: ({ node, ...props }) => <tr className="hover:bg-black/5 dark:hover:bg-white/5" {...props} />,
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					th: ({ node, ...props }) => (
						<th className="border px-3 py-2 font-semibold" {...props} />
					),
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					td: ({ node, ...props }) => (
						<td className="border px-3 py-2 align-top" {...props} />
					),
					// Links
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					a: ({ node, ...props }) => (
						<a className="underline underline-offset-2 hover:opacity-90" target="_blank" rel="noreferrer" {...props} />
					),
					// Quotes
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					blockquote: ({ node, ...props }) => (
						<blockquote className="border-l-4 pl-3 italic opacity-90 my-2" {...props} />
					),
					// Horizontal rule
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					hr: ({ node, ...props }) => <hr className="border-t my-3 opacity-30" {...props} />,
				}}
			>
				{prepared}
			</ReactMarkdown>
		</div>
	);
};

function codeRenderer({ className, children, props }: { className?: string; children: React.ReactNode; props: Record<string, unknown>; }) {
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