"use client";

import { useState, useEffect, useCallback } from "react";
import { MODEL } from "@/types/chat";

const STORAGE_KEY = "notra_preferred_model";
const DEFAULT_MODEL: MODEL = "openai/gpt-4o";

/**
 * Hook that persists the user's preferred AI model in localStorage.
 * Falls back to DEFAULT_MODEL if stored value is invalid.
 */
export function useModelPreference() {
  const [model, setModelState] = useState<MODEL>(DEFAULT_MODEL);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as MODEL | null;
      const validModels: MODEL[] = [
        "openai/gpt-4o",
        "google/gemini-2.5-flash",
        "deepseek/deepseek-chat-v3.1",
      ];
      if (stored && validModels.includes(stored)) {
        setModelState(stored);
      }
    } catch {
      // localStorage unavailable (SSR or private browsing)
    }
    setHydrated(true);
  }, []);

  const setModel = useCallback((m: MODEL) => {
    setModelState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      // ignore write failures
    }
  }, []);

  return { model, setModel, hydrated };
}