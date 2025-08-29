import { MessageSquare, MoreHorizontal, Plus } from "lucide-react";
import { ThemeToggle } from "../ui/themeToggle";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { UserStatus } from "../ui/userStatus";


interface Subject {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp?: string;
  isActive?: boolean;
}

interface ChatSidebarProps {
  subjects: Subject[];
  onSubjectSelect: (id: string) => void;
  onNewSubject: () => void;
}

const ChatSidebar = ({ subjects, onSubjectSelect, onNewSubject }: ChatSidebarProps) => {
  return (
    <div className="w-80 bg-gray-50 border-r border-gray-300 flex flex-col h-full dark:bg-[#1a1a1a] dark:border-gray-700">
      <div className="p-4 border-b border-gray-300 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">Subjects</h2>
        </div>
        <Button onClick={onNewSubject} className="w-full justify-start gap-3 bg-[#173dfd] text-white hover:bg-blue-600">
          <Plus size={18} />
          New Subject
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {subjects.map((subject) => (
            <button
              key={subject.id}
              onClick={() => onSubjectSelect(subject.id)}
              className={cn(
                "w-full p-3 rounded-lg text-left transition-all duration-200 mb-1 group",
                "hover:bg-gray-100 dark:hover:bg-gray-800",
                subject.isActive ? "bg-gray-100 shadow-sm dark:bg-gray-800" : ""
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare size={16} className="text-gray-500 shrink-0 dark:text-gray-400" />
                    <h3 className="font-medium text-sm text-gray-900 truncate dark:text-white">{subject.title}</h3>
                  </div>
                  {subject.lastMessage && (
                    <p className="text-xs text-gray-500 truncate dark:text-gray-400">{subject.lastMessage}</p>
                  )}
                  {subject.timestamp && (
                    <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">{subject.timestamp}</p>
                  )}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <MoreHorizontal size={16} className="text-gray-500 dark:text-gray-400" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <UserStatus username="John Doe" userId="123" />
    </div>
  );
};

export default ChatSidebar;
