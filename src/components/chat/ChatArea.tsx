"use client";
import { Message } from "./types";
import { cn } from "@/lib/utils";
import { MessageRole } from "@prisma/client";
import MarkdownMessage from "./MarkdownMessage";
import InteractiveMessage from "./InteractiveMessage";

interface ChatAreaProps {
	messages: Message[];
}

function formatLocalTimestamp(timestamp?: string): string {
	if (!timestamp) return "";
	try {
		const d = new Date(timestamp);
		return d.toLocaleString(undefined, {
			year: "numeric",
			month: "short",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return timestamp;
	}
}

const ChatArea = ({ messages }: ChatAreaProps) => {
	return (
		<div className="flex flex-col gap-4 p-4">
			{messages.map((message) => (
				<div
					key={message.id}
					className={cn(
						"flex",
						message.role === MessageRole.user ? "justify-end" : "justify-start"
					)}
				>
					<div
						className={cn(
							"rounded-2xl px-4 py-3 text-sm shadow-md max-w-[75%] whitespace-normal break-words leading-relaxed",
							message.role === MessageRole.user
								? "bg-blue-500 text-white self-end"
								: "bg-gray-200 text-gray-900 self-start dark:bg-[#2a2a2a] dark:text-white"
						)}
					>
						<div className={cn("markdown-body", message.role === MessageRole.user ? "text-white" : "")}> 
							{message.role === MessageRole.assistant ? (
								<InteractiveMessage content={message.content} />
							) : (
								<MarkdownMessage content={message.content} isDark={false} />
							)}
						</div>
						<div className="text-xs opacity-70 mt-2 text-right">
							{formatLocalTimestamp(message.timestamp)}
						</div>
					</div>
				</div>
			))}
		</div>
	);
};

export default ChatArea;
