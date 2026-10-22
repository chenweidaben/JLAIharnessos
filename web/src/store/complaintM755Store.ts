/**
 * 健澜科技 jlmedaios - 投诉管理 Zustand store（M755）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchComplaints,
  type Complaint,
} from '@/services/api/complaintM755';

interface ComplaintM755State {
  items: Complaint[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useComplaintM755Store = create<ComplaintM755State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchComplaints();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '投诉加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
