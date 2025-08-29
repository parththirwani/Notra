import { User } from "lucide-react";

interface UserStatusProps {
  userId: string;
  username?: string;
}

export const UserStatus = ({ userId, username }: UserStatusProps) => {
  return (
    <div className="p-3 border-t border-border bg-chat-sidebar">
      <div className="flex items-center gap-2 text-sm">
        <div className="flex items-center justify-center w-6 h-6 bg-primary/10 rounded-full">
          <User className="w-3 h-3 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          {username && (
            <p className="font-medium text-foreground truncate">{username}</p>
          )}
          <p className="text-xs text-muted-foreground truncate">
            ID: {userId}
          </p>
        </div>
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      </div>
    </div>
  );
};