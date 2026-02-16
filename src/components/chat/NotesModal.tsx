"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import MarkdownMessage from "./MarkdownMessage";

interface NotesModalProps {
	conversationId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function NotesModal({ conversationId, open, onOpenChange }: NotesModalProps) {
	const [loading, setLoading] = useState(false);
	const [markdown, setMarkdown] = useState<string>("");
	const canFetch = useMemo(() => !!conversationId && open, [conversationId, open]);
	const contentRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		let aborted = false;
		async function run() {
			if (!canFetch) return;
			setLoading(true);
			setMarkdown("");
			try {
				const res = await fetch(`/api/chat/${conversationId}/notes`, { method: "POST", headers: { "Content-Type": "application/json" } });
				if (!res.ok) throw new Error("Failed to generate notes");
				const data = await res.json();
				if (!aborted) setMarkdown(data.markdown ?? "");
			} catch (error) {
				if (!aborted) setMarkdown("Failed to generate notes. Please try again.");
				console.error(error)
			} finally {
				if (!aborted) setLoading(false);
			}
		}
		run();
		return () => { aborted = true; };
	}, [canFetch, conversationId]);

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(markdown);
		} catch {}
	};

	const downloadPdf = async () => {
		const htmlContent = contentRef.current?.innerHTML ?? "<p>No content</p>";
		const w = window.open("", "_blank");
		if (!w) return;
		w.document.write(`<!doctype html>
<html>
<head>
<meta charset='utf-8'>
<title>Notes</title>
<style>
  @page { margin: 24mm; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; color: #111; }
  .markdown { max-width: 800px; margin: 0 auto; }
  h1,h2,h3,h4 { font-weight: 700; margin: 16px 0 8px; }
  h1 { font-size: 28px; }
  h2 { font-size: 22px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  h3 { font-size: 18px; }
  p { margin: 8px 0; line-height: 1.6; }
  ul,ol { margin: 8px 0 8px 20px; }
  li { margin: 4px 0; }
  code { background: #f3f4f6; padding: 2px 4px; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 90%; }
  pre { background: #0b1220; color: #f9fafb; padding: 12px; border-radius: 8px; overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
  blockquote { border-left: 4px solid #e5e7eb; padding-left: 12px; color: #374151; margin: 8px 0; }
</style>
</head>
<body>
  <div class="markdown">${htmlContent}</div>
</body>
</html>`);
		w.document.close();
		w.focus();
		w.print();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] max-w-4xl md:w-[80vw]">
				<DialogHeader>
					<DialogTitle>Chat Notes</DialogTitle>
				</DialogHeader>
				<div className="flex flex-wrap items-center gap-2 mb-3">
					<Button size="sm" onClick={copyToClipboard} disabled={!markdown || loading}>Copy Markdown</Button>
					<Button size="sm" variant="secondary" onClick={downloadPdf} disabled={!markdown || loading}>Download PDF</Button>
				</div>
				<div ref={contentRef} className="min-h-40 max-h-[70vh] overflow-auto border rounded-md p-4 bg-white dark:bg-[#0b0b0b] text-black dark:text-white">
					{loading ? (
						<div className="text-sm opacity-70">Generating notes…</div>
					) : (
						<MarkdownMessage content={markdown || ""} isDark />
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
} 