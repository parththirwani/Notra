import { MessageRole } from "@prisma/client";

export interface Message {
  id: string;
  content: string;
  role: MessageRole
  timestamp?: string;
}

export interface Subject {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp?: string;
  isActive?: boolean;
}
