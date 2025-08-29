export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp?: string;
}

export interface Subject {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp?: string;
  isActive?: boolean;
}
