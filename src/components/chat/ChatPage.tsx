"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatSidebar from "./ChatSidebar";
import ChatArea from "./ChatArea";
import ChatInput from "./ChatInput";
import { Message } from "./types";
import { ThemeProvider } from "next-themes"; 
import { ThemeToggle } from "../ui/themeToggle";
import { Button } from "../ui/button";
import Image from "next/image";
import NotesModal from "./NotesModal";
import { MessageRole } from "@prisma/client";

type Subject = {
	id: string;
	title: string;
	isActive: boolean;
};


const API_BASE = "/api/chat";

const ChatPage = () => {
	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [currentSubjectId, setCurrentSubjectId] = useState<string | null>(null);
	const [messagesByConversation, setMessagesByConversation] = useState<Record<string, Message[]>>({});
	const [isStreaming, setIsStreaming] = useState(false);
	const controllerRef = useRef<AbortController | null>(null);
	const [notesOpen, setNotesOpen] = useState(false);

	// Load conversations from backend
	useEffect(() => {
		(async () => {
			const res = await fetch(API_BASE, { method: "GET" });
			if (!res.ok) return;
			const data = await res.json();
			const conversations: Array<{ id: string; title: string; createdAt: string; messages: Message[] }>= data.conversations ?? [];

			// Normalize messages: ensure role, id, timestamp strings
			const normalizedSubjects: Subject[] = conversations.map((c) => ({
				id: c.id,
				title: c.title ?? "Untitled",
				isActive: false,
			}));
			const normalizedMessages: Record<string, Message[]> = {};
			for (const c of conversations) {
				normalizedMessages[c.id] = (c.messages ?? []).map((m, idx) => ({
					id: m.id ?? `${idx}`,
					content: m.content,
					role: m.role,
					timestamp: typeof m.timestamp === "string" ? m.timestamp : (m as any).createdAt ? new Date((m as any).createdAt).toISOString() : undefined,
					image: m.image,
				}));
			}

			setSubjects(normalizedSubjects);
			setMessagesByConversation(normalizedMessages);
			if (normalizedSubjects.length > 0) {
				setCurrentSubjectId(normalizedSubjects[0].id);
			}
		})();
	}, []);

	const handleSubjectSelect = (id: string) => {
		setSubjects((prev) => prev.map((s) => ({ ...s, isActive: s.id === id })));
		setCurrentSubjectId(id);
	};

	const handleNewSubject = () => {
		setSubjects((prev) => prev.map((s) => ({ ...s, isActive: false })));
		setCurrentSubjectId(null);
	};

	const appendMessage = useCallback((conversationId: string, message: Message) => {
		setMessagesByConversation((prev) => ({
			...prev,
			[conversationId]: [...(prev[conversationId] ?? []), message],
		}));
	}, []);

	// Parse Server-Sent Events (SSE) WITHOUT trimming payload (to preserve spaces)
	const streamResponse = useCallback(async (response: Response, onChunk: (chunk: string) => void) => {
		const reader = response.body!.getReader();
		const decoder = new TextDecoder("utf-8");
		let buffer = "";
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			let index;
			while ((index = buffer.indexOf("\n\n")) !== -1) {
				const sse = buffer.slice(0, index); // don't trim
				buffer = buffer.slice(index + 2);
				if (sse.startsWith("data:")) {
					let payload = sse.slice(5); // content after 'data:'
					if (payload.startsWith(" ")) payload = payload.slice(1); // remove only a single leading space if present
					if (payload === "[DONE]") {
						return;
					}
					// Pass through as-is to preserve spaces/newlines
					onChunk(payload);
				}
			}
		}
	}, []);

	const deleteById = useCallback(async (id: string) => {
		try {
			await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
		} finally {
			setSubjects((prev) => prev.filter((s) => s.id !== id));
			setMessagesByConversation((prev) => {
				const { [id]: _, ...rest } = prev;
				return rest;
			});
			if (currentSubjectId === id) {
				const next = subjects.find((s) => s.id !== id)?.id ?? null;
				setCurrentSubjectId(next);
			}
		}
	}, [currentSubjectId, subjects]);

	const handleSendMessage = useCallback(async (content: string, image?: string) => {
		// Cancel any previous stream
		controllerRef.current?.abort();
		const controller = new AbortController();
		controllerRef.current = controller;
		setIsStreaming(true);

		// If we don't have a conversation yet, create one via POST /api/chat
		if (!currentSubjectId) {
			const res = await fetch(API_BASE, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: content, model: "openai/gpt-4o", image }),
				signal: controller.signal,
			});
			if (!res.ok || !res.body) { setIsStreaming(false); return; }

			let conversationId: string | null = null;
			let assistantBuffer = "";

			await streamResponse(res, (payload) => {
				if (!conversationId && payload.startsWith("{")) {
					try {
						const meta = JSON.parse(payload);
						conversationId = meta.conversationId;
						// set new subject
						setSubjects((prev) => [{ id: meta.conversationId, title: meta.title, isActive: true }, ...prev.map((s) => ({ ...s, isActive: false }))]);
						setCurrentSubjectId(meta.conversationId);
						setMessagesByConversation((prev) => ({ ...prev, [meta.conversationId]: [] }));
						// push user message immediately
						appendMessage(meta.conversationId, {
							id: `${Date.now()}`,
							content,
							role: MessageRole.user,
							timestamp: new Date().toISOString(),
							image,
						});
						return; // do not treat this meta chunk as assistant content
					} catch {
						// fall-through to treat as assistant text
					}
				}
				assistantBuffer += payload;
				if (conversationId) {
					// show as a single growing assistant message
					setMessagesByConversation((prev) => {
						const list = prev[conversationId!] ?? [];
						const last = list[list.length - 1];
						if (last && last.role === MessageRole.assistant) {
							const updated = [...list];
							updated[updated.length - 1] = { ...last, content: assistantBuffer };
							return { ...prev, [conversationId!]: updated };
						} else {
							return {
								...prev,
								[conversationId!]: [
									...(prev[conversationId!] ?? []),
									{ id: `${Date.now()}-asst`, content: assistantBuffer, role: MessageRole.assistant, timestamp: new Date().toISOString() },
								],
							};
						}
					});
				}
			});
			setIsStreaming(false);
			return;
		}

		// Otherwise send to existing conversation
		const conversationId = currentSubjectId;
		// push user message locally first
		appendMessage(conversationId, {
			id: `${Date.now()}`,
			content,
			role: MessageRole.user,
			timestamp: new Date().toISOString(),
			image,
		});

		const res = await fetch(`${API_BASE}/${conversationId}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ message: content, model: "openai/gpt-4o", image }),
			signal: controller.signal,
		});
		if (!res.ok || !res.body) { setIsStreaming(false); return; }

		let assistantBuffer = "";
		await streamResponse(res, (payload) => {
			assistantBuffer += payload;
			setMessagesByConversation((prev) => {
				const list = prev[conversationId] ?? [];
				const last = list[list.length - 1];
				if (last && last.role === MessageRole.assistant) {
					const updated = [...list];
					updated[updated.length - 1] = { ...last, content: assistantBuffer };
					return { ...prev, [conversationId]: updated };
				} else {
					return {
						...prev,
						[conversationId]: [
							...(prev[conversationId] ?? []),
							{ id: `${Date.now()}-asst`, content: assistantBuffer, role: MessageRole.assistant, timestamp: new Date().toISOString() },
						],
					};
				}
			});
		});
		setIsStreaming(false);
	}, [appendMessage, currentSubjectId, streamResponse]);

	const currentMessages = useMemo(() => {
		return currentSubjectId ? (messagesByConversation[currentSubjectId] ?? []) : [];
	}, [currentSubjectId, messagesByConversation]);

	const showBranding = !currentSubjectId || currentMessages.length === 0;

	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="light"
			enableSystem={false} 
		>
			<div className="h-screen flex bg-white text-gray-900 dark:bg-[#121212] dark:text-white">
				<ChatSidebar
					subjects={subjects}
					onSubjectSelect={handleSubjectSelect}
					onNewSubject={handleNewSubject}
					onDeleteSubject={deleteById}
				/>
				<div className="flex-1 flex flex-col">
					<div className="p-2 flex items-center justify-end gap-2 border-b border-gray-200 dark:border-gray-700">
						{currentSubjectId && (
							<Button size="sm" variant="secondary" onClick={() => setNotesOpen(true)}>Notes</Button>
						)}
						<ThemeToggle />
					</div>

					<div className="flex-1 overflow-y-auto bg-white dark:bg-[#121212]">
						{showBranding ? (
							<div className="h-full w-full grid place-items-center relative overflow-hidden">
								<div className="pointer-events-none absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.3)_0,transparent_60%)]" />
								<div className="text-center select-none flex flex-col items-center">
									<div className="relative w-24 h-24 mb-2 opacity-80">
										<Image src="/small-logo.png" alt="notra" fill sizes="64px" style={{ objectFit: "contain" }} />
									</div>
									<div className="text-4xl font-extrabold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent tracking-tight">
										Notra: Notes Ultra
									</div>
									<p className="mt-2 text-md opacity-70">Start a new conversation to get insights, answers, and code.</p>
								</div>
							</div>
						) : (
							<ChatArea messages={currentMessages} />
						)}
					</div>

					<ChatInput onSendMessage={handleSendMessage} disabled={isStreaming} />
				</div>
				<NotesModal conversationId={currentSubjectId} open={notesOpen} onOpenChange={setNotesOpen} />
			</div>
		</ThemeProvider>
	);
};

export default ChatPage;