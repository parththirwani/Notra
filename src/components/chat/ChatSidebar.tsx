"use client";

import { useState } from "react";
import SidebarHeader from "./sidebar/SidebarHeader";
import SidebarChatHistory from "./sidebar/ChatHistory";
import SidebarUserSection from "./sidebar/UserSection";

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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`transition-all duration-300 h-full border-r border-gray-300 dark:border-gray-700
      ${collapsed ? "w-20" : "w-80"} bg-gray-50 dark:bg-[#1a1a1a] flex flex-col`}
    >
      {/* Header */}
      <SidebarHeader
        onNewSubject={onNewSubject}
        onCollapse={() => setCollapsed(!collapsed)}
        collapsed={collapsed}
      />

      {/* Chat list */}
      {!collapsed && (
        <SidebarChatHistory subjects={subjects} onSubjectSelect={onSubjectSelect} />
      )}

      {/* User section */}
      <SidebarUserSection collapsed={collapsed} />
    </div>
  );
};

export default ChatSidebar;
