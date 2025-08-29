"use client";
import { useState } from "react";
import ChatSidebar from "./ChatSidebar";
import ChatArea from "./ChatArea";
import ChatInput from "./ChatInput";
import { Subject, Message } from "./types";
import { ThemeProvider } from "next-themes"; 
import { ThemeToggle } from "../ui/themeToggle";


const ChatPage = () => {
  const initialSubjects: Subject[] = [
    { id: "1", title: "General Discussion", lastMessage: "How can I help you today?", timestamp: "2 min ago", isActive: true },
    { id: "2", title: "Project Planning", lastMessage: "Let's discuss the next steps...", timestamp: "1 hour ago" },
    { id: "3", title: "Creative Ideas", lastMessage: "That's a brilliant concept!", timestamp: "Yesterday" },
  ];

  const initialMessages: Record<string, Message[]> = {
    "1": [
      { id: "1", content: "Hello! How can I assist you today?", isUser: false, timestamp: "2:30 PM" },
      { id: "2", content: "Hi there! I'd like to explore some new features for my project.", isUser: true, timestamp: "2:32 PM" },
    ],
    "2": [],
    "3": [],
  };

  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [currentSubjectId, setCurrentSubjectId] = useState("1");
  const [messages, setMessages] = useState<Record<string, Message[]>>(initialMessages);

  const handleSubjectSelect = (id: string) => {
    setSubjects(prev => prev.map(s => ({ ...s, isActive: s.id === id })));
    setCurrentSubjectId(id);
  };

  const handleNewSubject = () => {
    const newId = Date.now().toString();
    const newSubject: Subject = { id: newId, title: "New Subject", isActive: true };

    setSubjects(prev => [newSubject, ...prev.map(s => ({ ...s, isActive: false }))]);
    setCurrentSubjectId(newId);
    setMessages(prev => ({ ...prev, [newId]: [] }));
  };

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages(prev => ({
      ...prev,
      [currentSubjectId]: [...(prev[currentSubjectId] || []), newMessage],
    }));

    setSubjects(prev =>
      prev.map(s =>
        s.id === currentSubjectId ? { ...s, lastMessage: content, timestamp: "Now" } : s
      )
    );

    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: "Thanks for your message! I'm here to help.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages(prev => ({
        ...prev,
        [currentSubjectId]: [...(prev[currentSubjectId] || []), aiResponse],
      }));
    }, 1000);
  };

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false} 
    >
      <div className="h-screen flex bg-white text-gray-900 dark:bg-[#121212] dark:text-white">
        {/* Sidebar with toggle */}
        <ChatSidebar
          subjects={subjects}
          onSubjectSelect={handleSubjectSelect}
          onNewSubject={handleNewSubject}
        />
        <div className="flex-1 flex flex-col">
          {/* Header with theme toggle */}
          <div className="p-2 flex justify-end border-b border-gray-200 dark:border-gray-700">
            <ThemeToggle />
          </div>

          <div className="flex-1 overflow-y-auto bg-white dark:bg-[#121212]">
            <ChatArea messages={messages[currentSubjectId] || []} />
          </div>

          <ChatInput onSendMessage={handleSendMessage} />
        </div>
      </div>
    </ThemeProvider>
  );
};

export default ChatPage;
