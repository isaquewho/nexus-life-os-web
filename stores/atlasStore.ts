"use client";
import { create } from "zustand";
import type { AtlasMessage } from "@/types";

interface AtlasState {
  messages: AtlasMessage[];
  isTyping: boolean;
  addMessage: (message: AtlasMessage) => void;
  setMessages: (messages: AtlasMessage[]) => void;
  setTyping: (typing: boolean) => void;
  clearMessages: () => void;
}

export const useAtlasStore = create<AtlasState>((set) => ({
  messages: [],
  isTyping: false,
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  setTyping: (isTyping) => set({ isTyping }),
  clearMessages: () => set({ messages: [] }),
}));
