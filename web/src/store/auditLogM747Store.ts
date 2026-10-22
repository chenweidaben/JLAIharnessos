/**
 * 健澜科技 jlmedaios - 日志审计 Zustand store（M747）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchAuditLogs,
  type AuditLog,
} from '@/services/api/auditLogM747';

interface AuditLogM747State {
  items: AuditLog[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useAuditLogM747Store = create<AuditLogM747State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchAuditLogs();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '审计日志加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
