/**
 * 健澜科技 jlmedaios - 会议管理 Zustand store（M748）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchMeetings,
  type Meeting,
} from '@/services/api/meetingM748';

interface MeetingM748State {
  items: Meeting[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useMeetingM748Store = create<MeetingM748State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchMeetings();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '会议加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
