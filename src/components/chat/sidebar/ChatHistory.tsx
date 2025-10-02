"use client";
import { MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Subject {
	id: string;
	title: string;
	lastMessage?: string;
	timestamp?: string;
	isActive?: boolean;
}

interface SidebarChatHistoryProps {
	subjects: Subject[];
	onSubjectSelect: (id: string) => void;
	onDeleteSubject?: (id: string) => void;
}

const SidebarChatHistory = ({ subjects, onSubjectSelect, onDeleteSubject }: SidebarChatHistoryProps) => {
	return (
		<div className="flex-1 overflow-y-auto">
			<div className="p-2">
				{subjects.map((subject) => (
					<div key={subject.id} className="group">
						<div
							role="button"
							tabIndex={0}
							onClick={() => onSubjectSelect(subject.id)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									onSubjectSelect(subject.id);
								}
							}}
							className={cn(
								"w-full p-3 rounded-lg text-left transition-all duration-200 mb-1 flex items-start justify-between cursor-pointer",
								"hover:bg-gray-100 dark:hover:bg-gray-800",
								subject.isActive ? "bg-gray-100 shadow-sm dark:bg-gray-800" : ""
							)}
						>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 mb-1">
									<MessageSquare
										size={16}
										className="text-gray-500 shrink-0 dark:text-gray-400"
									/>
									<h3 className="font-medium text-sm text-gray-900 truncate dark:text-white">
										{subject.title}
									</h3>
								</div>
								{subject.lastMessage && (
									<p className="text-xs text-gray-500 truncate dark:text-gray-400">
										{subject.lastMessage}
									</p>
								)}
								{subject.timestamp && (
									<p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
										{subject.timestamp}
									</p>
								)}
							</div>
							<div className="opacity-0 group-hover:opacity-100 transition-all duration-200">
								<button
									onClick={(e) => {
										e.stopPropagation();
										onDeleteSubject?.(subject.id);
									}}
									className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-red-500"
									aria-label="Delete conversation"
								>
									<Trash2 size={16} />
								</button>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default SidebarChatHistory;