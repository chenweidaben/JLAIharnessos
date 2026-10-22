/**
 * 健澜科技 jlmedaios - 审计 Zustand store（M907）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchAuditWorkload,
  type AuditWorkload,
} from '@/services/api/auditWorkloadM907';

interface AuditWorkloadM907State {
  items: AuditWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useAuditWorkloadM907Store = create<AuditWorkloadM907State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchAuditWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '审计工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
