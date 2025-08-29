import { cn } from "@/lib/utils";


interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
}

const ChatBubble = ({ message, isUser, timestamp }: ChatBubbleProps) => {
  return (
    <div className={cn("flex w-full mb-4", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] px-4 py-3 rounded-2xl transition-all duration-200 shadow-sm",
          isUser
            ? "bg-[#173dfd] text-white rounded-br-md"
            : "bg-gray-100 text-gray-800 rounded-bl-md dark:bg-[#333333] dark:text-gray-200"
        )}
      >
        <p className="text-sm leading-relaxed">{message}</p>
        {timestamp && (
          <p
            className={cn(
              "text-xs mt-1 opacity-70 ",
              isUser ? "text-right" : "text-left"
            )}
          >
            {timestamp}
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatBubble;
