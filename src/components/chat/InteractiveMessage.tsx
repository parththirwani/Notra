"use client";
import { useMemo, useState } from "react";
import MarkdownMessage from "./MarkdownMessage";
import { Button } from "../ui/button";

type MCQSchemaV1 = {
	type: "mcq" | "mcw";
	question: string;
	options: { text: string; correct?: boolean }[] | string[];
	multipleCorrect?: boolean;
};

type FlashcardSchemaV1 = {
	type: "flashcard";
	front: string;
	back: string;
};

type ParsedPayload = MCQSchemaV1 | FlashcardSchemaV1;

function isParsedPayload(value: any): value is ParsedPayload {
	return value && typeof value === "object" && typeof value.type === "string";
}

function normalizeMCQ(payload: MCQSchemaV1) {
	const options = (payload.options as any[]).map((opt) =>
		typeof opt === "string" ? { text: opt, correct: false } : { text: opt.text, correct: !!opt.correct }
	);
	const hasAnyCorrect = options.some((o) => o.correct);
	return {
		question: payload.question,
		options,
		multiple: payload.multipleCorrect || options.filter((o) => o.correct).length > 1,
		answerKeyAvailable: hasAnyCorrect,
	};
}

export default function InteractiveMessage({ content }: { content: string }) {
	const parsed = useMemo(() => {
		try {
			const obj = JSON.parse(content);
			if (isParsedPayload(obj)) return obj as ParsedPayload;
			return null;
		} catch {
			return null;
		}
	}, [content]);

	if (!parsed) {
		return <MarkdownMessage content={content} isDark />;
	}

	if (parsed.type === "flashcard") {
		return <Flashcard front={parsed.front} back={parsed.back} />;
	}

	// treat "mcw" as mcq
	if (parsed.type === "mcq" || parsed.type === "mcw") {
		const mcq = normalizeMCQ(parsed as MCQSchemaV1);
		return <MCQCard question={mcq.question} options={mcq.options} multiple={mcq.multiple} showAnswer={mcq.answerKeyAvailable} />;
	}

	return <MarkdownMessage content={content} isDark />;
}

function Flashcard({ front, back }: { front: string; back: string }) {
	const [flipped, setFlipped] = useState(false);
	return (
		<div className="w-full max-w-xl">
			<button
				onClick={() => setFlipped((f) => !f)}
				className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-left transition-transform duration-300"
			>
				<div className="text-xs uppercase tracking-wide opacity-70 mb-1">{flipped ? "Back" : "Front"}</div>
				<div className="whitespace-pre-wrap leading-relaxed">
					{flipped ? back : front}
				</div>
				<div className="mt-3 text-xs opacity-70">Click to flip</div>
			</button>
		</div>
	);
}

function MCQCard({ question, options, multiple, showAnswer }: { question: string; options: { text: string; correct?: boolean }[]; multiple: boolean; showAnswer: boolean; }) {
	const [selected, setSelected] = useState<number[]>([]);
	const [revealed, setRevealed] = useState(false);

	const toggle = (idx: number) => {
		setSelected((prev) => {
			if (multiple) {
				return prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx];
			}
			return prev.includes(idx) ? [] : [idx];
		});
	};

	const isCorrect = (idx: number) => !!options[idx]?.correct;

	return (
		<div className="w-full max-w-xl">
			<div className="mb-2 font-medium">{question}</div>
			<div className="space-y-2">
				{options.map((opt, idx) => {
					const active = selected.includes(idx);
					const stateClass = revealed && showAnswer
						? isCorrect(idx)
							? "border-green-500/60 bg-green-500/10"
							: active
								? "border-red-500/60 bg-red-500/10"
								: ""
						: active ? "border-blue-500/60 bg-blue-500/10" : "";
					return (
						<button
							key={idx}
							onClick={() => toggle(idx)}
							className={`w-full text-left border border-white/10 rounded-md px-3 py-2 transition-colors ${stateClass}`}
						>
							<div className="flex items-start gap-2">
								<div className={`mt-0.5 h-4 w-4 rounded-sm border ${active ? "bg-blue-500 border-blue-500" : "border-white/40"}`} />
								<div className="flex-1 whitespace-pre-wrap">{opt.text}</div>
							</div>
						</button>
					);
				})}
			</div>
			<div className="mt-3 flex gap-2">
				<Button size="sm" variant="secondary" onClick={() => setSelected([])}>Clear</Button>
				{showAnswer && (
					<Button size="sm" onClick={() => setRevealed((r) => !r)}>{revealed ? "Hide answer" : "Check answer"}</Button>
				)}
			</div>
		</div>
	);
} 