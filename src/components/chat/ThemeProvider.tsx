"use client";

import { createContext, useContext, useState } from "react";

type ChatTheme = "light" | "dark";

const ChatThemeContext = createContext<{
  theme: ChatTheme;
  toggleTheme: () => void;
}>({
  theme: "light",
  toggleTheme: () => {},
});

export const useChatTheme = () => useContext(ChatThemeContext);

export function ChatThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ChatTheme>("light");

  const toggleTheme = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));

  return (
    <ChatThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={theme === "dark" ? "dark" : ""}>{children}</div>
    </ChatThemeContext.Provider>
  );
}
