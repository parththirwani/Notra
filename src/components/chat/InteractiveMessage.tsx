"use client";
import { useMemo, useState } from "react";
import MarkdownMessage from "./MarkdownMessage";
import { Button } from "../ui/button";
import { CheckCircle2, Circle, XCircle, RotateCcw, ArrowRight, Trophy, Star } from "lucide-react";

type MCQSchemaV1 = {
	type: "mcq" | "mcw";
	question: string;
	options: { text: string; correct?: boolean }[] | string[];
	multipleCorrect?: boolean;
};

type QuizSchemaV1 = {
	type: "quiz";
	title: string;
	questions: Array<{
		question: string;
		options: Array<{ text: string; correct?: boolean } | string>;
		multipleCorrect?: boolean;
	}>;
};

type FlashcardSchemaV1 = {
	type: "flashcard";
	front: string;
	back: string;
};

type ParsedPayload = MCQSchemaV1 | QuizSchemaV1 | FlashcardSchemaV1;

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

// Helper function to check if JSON appears complete
function isCompleteJSON(content: string): boolean {
	const trimmed = content.trim();
	if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
		return false;
	}
	
	// Count braces to check if they're balanced
	let braceCount = 0;
	let inString = false;
	let escaped = false;
	
	for (let i = 0; i < trimmed.length; i++) {
		const char = trimmed[i];
		
		if (escaped) {
			escaped = false;
			continue;
		}
		
		if (char === '\\') {
			escaped = true;
			continue;
		}
		
		if (char === '"') {
			inString = !inString;
			continue;
		}
		
		if (!inString) {
			if (char === '{') {
				braceCount++;
			} else if (char === '}') {
				braceCount--;
			}
		}
	}
	
	return braceCount === 0;
}

export default function InteractiveMessage({ content }: { content: string }) {
	const parsed = useMemo(() => {
		// Only attempt JSON parsing if the content appears to be complete JSON
		if (!isCompleteJSON(content)) {
			return null;
		}
		
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

	if (parsed.type === "quiz") {
		return <QuizCard quiz={parsed as QuizSchemaV1} />;
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
				className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-left transition-all duration-500 hover:scale-[1.02] hover:shadow-lg"
			>
				<div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">{flipped ? "Back" : "Front"}</div>
				<div className="whitespace-pre-wrap leading-relaxed text-sm">
					{flipped ? back : front}
				</div>
				<div className="mt-3 text-[11px] opacity-70">Click to flip</div>
			</button>
		</div>
	);
}

function QuizCard({ quiz }: { quiz: QuizSchemaV1 }) {
	const [currentQuestion, setCurrentQuestion] = useState(0);
	const [selectedAnswers, setSelectedAnswers] = useState<number[][]>([]);
	const [revealed, setRevealed] = useState(false);
	const [animating, setAnimating] = useState<string | null>(null);
	const [score, setScore] = useState(0);
	const [completed, setCompleted] = useState(false);

	const question = quiz.questions[currentQuestion];
	const options = (question.options as any[]).map((opt) =>
		typeof opt === "string" ? { text: opt, correct: false } : { text: opt.text, correct: !!opt.correct }
	);
	const selected = selectedAnswers[currentQuestion] || [];
	const isLastQuestion = currentQuestion === quiz.questions.length - 1;

	const toggle = (idx: number) => {
		if (revealed) return;
		
		setSelectedAnswers(prev => {
			const newAnswers = [...prev];
			if (!newAnswers[currentQuestion]) newAnswers[currentQuestion] = [];
			
			const current = newAnswers[currentQuestion];
			if (current.includes(idx)) {
				newAnswers[currentQuestion] = current.filter(i => i !== idx);
			} else {
				newAnswers[currentQuestion] = [...current, idx];
			}
			return newAnswers;
		});
	};

	const checkAnswer = () => {
		if (revealed) return;
		
		const correct = options.findIndex(opt => opt.correct);
		const selectedCorrect = selected.includes(correct);
		
		setAnimating(selectedCorrect ? 'correct' : 'incorrect');
		setRevealed(true);
		
		if (selectedCorrect) {
			setScore(prev => prev + 1);
		}
		
		setTimeout(() => setAnimating(null), 1500);
	};

	const nextQuestion = () => {
		if (isLastQuestion) {
			setCompleted(true);
		} else {
			setCurrentQuestion(prev => prev + 1);
			setRevealed(false);
			setAnimating(null);
		}
	};

	const resetQuiz = () => {
		setCurrentQuestion(0);
		setSelectedAnswers([]);
		setRevealed(false);
		setAnimating(null);
		setScore(0);
		setCompleted(false);
	};

	const letter = (i: number) => String.fromCharCode("A".charCodeAt(0) + i);
	const isCorrect = (idx: number) => !!options[idx]?.correct;

	if (completed) {
		const percentage = Math.round((score / quiz.questions.length) * 100);
		const isExcellent = percentage >= 80;
		const isGood = percentage >= 60;
		
		return (
			<div className="w-full max-w-2xl">
				<div className="text-center p-8 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl border border-blue-400/20">
					<div className="mb-6">
						<Trophy className={`w-16 h-16 mx-auto mb-4 ${isExcellent ? 'text-yellow-400' : isGood ? 'text-blue-400' : 'text-gray-400'} animate-bounce`} />
						<h3 className="text-2xl font-bold mb-2">Quiz Complete!</h3>
						<p className="text-lg opacity-80">You scored {score} out of {quiz.questions.length}</p>
					</div>
					
					<div className="mb-6">
						<div className="text-4xl font-bold mb-2">{percentage}%</div>
						<div className="w-full bg-gray-200 rounded-full h-3 mb-4">
							<div 
								className={`h-3 rounded-full transition-all duration-1000 ${
									isExcellent ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
									isGood ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
									'bg-gradient-to-r from-red-400 to-red-500'
								}`}
								style={{ width: `${percentage}%` }}
							/>
						</div>
						<p className={`text-sm font-medium ${
							isExcellent ? 'text-yellow-400' : 
							isGood ? 'text-blue-400' : 
							'text-red-400'
						}`}>
							{isExcellent ? 'Excellent work! 🌟' : 
							 isGood ? 'Good job! 👍' : 
							 'Keep practicing! 💪'}
						</p>
					</div>
					
					<Button onClick={resetQuiz} className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
						<RotateCcw className="w-4 h-4 mr-2" />
						Take Quiz Again
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full max-w-2xl">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-blue-500/15 to-purple-500/15 text-blue-300 border border-blue-400/30">
						<Star className="w-4 h-4 mr-2" />
						{quiz.title}
					</span>
					<span className="text-sm opacity-70 bg-white/5 px-3 py-1 rounded-full">
						{currentQuestion + 1} of {quiz.questions.length}
					</span>
				</div>
				<Button size="sm" variant="ghost" onClick={resetQuiz} className="text-xs hover:bg-white/10">
					<RotateCcw size={14} className="mr-1" />
					Reset
				</Button>
			</div>

			<div className="mb-6">
				<div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
					<div 
						className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-700 ease-out"
						style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
					/>
				</div>
			</div>

			<div className={`mb-6 font-medium text-lg transition-all duration-500 ${
				animating === 'correct' ? 'text-emerald-400 scale-105' : 
				animating === 'incorrect' ? 'text-rose-400 scale-105' : 
				'text-white'
			}`}>
				{question.question}
			</div>

			<div className="space-y-3 mb-6">
				{options.map((opt, idx) => {
					const active = selected.includes(idx);
					const correctNow = revealed && isCorrect(idx);
					const wrongNow = revealed && active && !isCorrect(idx);
					const border = correctNow
						? "border-emerald-500/60"
						: wrongNow
							? "border-rose-500/60"
							: active
								? "border-blue-500/60"
								: "border-white/10";
					const bg = correctNow
						? "bg-emerald-500/10"
						: wrongNow
							? "bg-rose-500/10"
							: active
								? "bg-blue-500/10"
								: "hover:bg-white/5";
					
					return (
						<div key={idx} className={`border ${border} rounded-xl transition-all duration-300 ${bg} ${
							animating && (correctNow || wrongNow) ? 'animate-pulse scale-105' : ''
						} ${revealed ? 'cursor-default' : 'cursor-pointer hover:scale-[1.02]'}`}>
							<button
								onClick={() => toggle(idx)}
								className="w-full text-left px-4 py-3"
								disabled={revealed}
							>
								<div className="flex items-start gap-4">
									<div className={`h-8 w-8 rounded-lg grid place-items-center text-sm font-bold transition-all duration-300 ${
										active ? "bg-blue-500 text-white scale-110" : "bg-white/10"
									} ${animating && (correctNow || wrongNow) ? 'scale-125' : ''}`}>
										{letter(idx)}
									</div>
									<div className="flex-1 whitespace-pre-wrap text-sm leading-relaxed">{opt.text}</div>
									{revealed && (
										<div className="ml-3">
											{correctNow ? (
												<CheckCircle2 className="text-emerald-400 animate-bounce" size={20} />
											) : active ? (
												<XCircle className="text-rose-400 animate-bounce" size={20} />
											) : (
												<Circle className="text-white/30" size={20} />
											)}
										</div>
									)}
								</div>
							</button>
						</div>
					);
				})}
			</div>

			<div className="flex gap-3">
				{!revealed ? (
					<Button 
						size="lg" 
						onClick={checkAnswer} 
						disabled={selected.length === 0}
						className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50"
					>
						Check Answer
					</Button>
				) : (
					<Button 
						size="lg" 
						onClick={nextQuestion}
						className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
					>
						{isLastQuestion ? 'Finish Quiz' : 'Next Question'}
						<ArrowRight className="w-4 h-4 ml-2" />
					</Button>
				)}
			</div>
		</div>
	);
}

function MCQCard({ question, options, multiple, showAnswer }: { question: string; options: { text: string; correct?: boolean }[]; multiple: boolean; showAnswer: boolean; }) {
	const [selected, setSelected] = useState<number[]>([]);
	const [revealed, setRevealed] = useState(false);
	const [animating, setAnimating] = useState<string | null>(null);

	const toggle = (idx: number) => {
		if (revealed) return;
		setSelected((prev) => {
			if (multiple) {
				return prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx];
			}
			return prev.includes(idx) ? [] : [idx];
		});
	};

	const checkAnswer = () => {
		if (revealed) return;
		
		const correct = options.findIndex(opt => opt.correct);
		const selectedCorrect = selected.includes(correct);
		
		setAnimating(selectedCorrect ? 'correct' : 'incorrect');
		setRevealed(true);
		
		setTimeout(() => setAnimating(null), 1500);
	};

	const isCorrect = (idx: number) => !!options[idx]?.correct;
	const letter = (i: number) => String.fromCharCode("A".charCodeAt(0) + i);

	return (
		<div className="w-full max-w-xl">
			<div className="flex items-center gap-2 mb-4">
				<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500/15 to-purple-500/15 text-blue-300 border border-blue-400/30">
					{multiple ? "Multiple Select" : "Multiple Choice"}
				</span>
				{showAnswer && <span className="text-xs opacity-70">Answer key available</span>}
			</div>
			<div className={`mb-4 font-medium text-lg transition-all duration-500 ${
				animating === 'correct' ? 'text-emerald-400 scale-105' : 
				animating === 'incorrect' ? 'text-rose-400 scale-105' : 
				'text-white'
			}`}>
				{question}
			</div>
			<div className="space-y-3">
				{options.map((opt, idx) => {
					const active = selected.includes(idx);
					const correctNow = revealed && showAnswer && isCorrect(idx);
					const wrongNow = revealed && showAnswer && active && !isCorrect(idx);
					const border = correctNow
						? "border-emerald-500/60"
						: wrongNow
							? "border-rose-500/60"
							: active
								? "border-blue-500/60"
								: "border-white/10";
					const bg = correctNow
						? "bg-emerald-500/10"
						: wrongNow
							? "bg-rose-500/10"
							: active
								? "bg-blue-500/10"
								: "hover:bg-white/5";
					return (
						<div key={idx} className={`border ${border} rounded-xl transition-all duration-300 ${bg} ${
							animating && (correctNow || wrongNow) ? 'animate-pulse scale-105' : ''
						} ${revealed ? 'cursor-default' : 'cursor-pointer hover:scale-[1.02]'}`}>
							<button
								onClick={() => toggle(idx)}
								className="w-full text-left px-4 py-3"
								disabled={revealed}
							>
								<div className="flex items-start gap-4">
									<div className={`h-8 w-8 rounded-lg grid place-items-center text-sm font-bold transition-all duration-300 ${
										active ? "bg-blue-500 text-white scale-110" : "bg-white/10"
									} ${animating && (correctNow || wrongNow) ? 'scale-125' : ''}`}>
										{letter(idx)}
									</div>
									<div className="flex-1 whitespace-pre-wrap text-sm leading-relaxed">{opt.text}</div>
									{revealed && showAnswer && (
										<div className="ml-3">
											{correctNow ? (
												<CheckCircle2 className="text-emerald-400 animate-bounce" size={20} />
											) : active ? (
												<XCircle className="text-rose-400 animate-bounce" size={20} />
											) : (
												<Circle className="text-white/30" size={20} />
											)}
										</div>
									)}
								</div>
							</button>
						</div>
					);
				})}
			</div>
			<div className="mt-4 flex gap-3">
				<Button 
					size="sm" 
					variant="secondary" 
					onClick={() => { setSelected([]); setRevealed(false); setAnimating(null); }}
					className="hover:bg-white/10"
				>
					Clear
				</Button>
				{showAnswer && (
					<Button 
						size="sm" 
						onClick={checkAnswer} 
						disabled={selected.length === 0 || revealed}
						className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50"
					>
						{revealed ? "Hide answer" : "Check answer"}
					</Button>
				)}
			</div>
		</div>
	);
}
