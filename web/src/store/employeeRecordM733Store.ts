/**
 * 健澜科技 jlmedaios - 员工档案 Zustand store（M733）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchEmployees,
  type EmployeeRecord,
} from '@/services/api/employeeRecordM733';

interface EmployeeRecordM733State {
  items: EmployeeRecord[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useEmployeeRecordM733Store = create<EmployeeRecordM733State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchEmployees();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '员工档案加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
