/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 对话状态：会话列表 / 当前会话 / 消息列表 / 流式状态
 */
import { create } from 'zustand';

import type { Conversation, ChatMessage } from '@/types/chat';

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: ChatMessage[];
  streaming: boolean;
  setConversations: (list: Conversation[]) => void;
  selectConversation: (id: string) => void;
  setMessages: (list: ChatMessage[]) => void;
  appendMessage: (msg: ChatMessage) => void;
  upsertMessage: (msg: ChatMessage) => void;
  updateStreaming: (messageId: string, delta: string) => void;
  finishStreaming: (messageId: string) => void;
  setStreaming: (v: boolean) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  streaming: false,

  setConversations: (list) => set({ conversations: list }),
  selectConversation: (id) => set({ currentConversationId: id }),

  setMessages: (list) => set({ messages: list }),

  appendMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),

  upsertMessage: (msg) =>
    set((state) => {
      const idx = state.messages.findIndex((m) => m.id === msg.id);
      if (idx === -1) return { messages: [...state.messages, msg] };
      const next = state.messages.slice();
      next[idx] = { ...next[idx], ...msg };
      return { messages: next };
    }),

  updateStreaming: (messageId, delta) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, content: m.content + delta, delta } : m,
      ),
    })),

  finishStreaming: (messageId) =>
    set((state) => ({
      streaming: false,
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, status: 'done', delta: undefined } : m,
      ),
    })),

  setStreaming: (v) => set({ streaming: v }),
  reset: () => set({ currentConversationId: null, messages: [], streaming: false }),
}));
