/**
 * 健澜科技 jlmedaios - 合同 Zustand store（M906）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchContractWorkload,
  type ContractWorkload,
} from '@/services/api/contractWorkloadM906';

interface ContractWorkloadM906State {
  items: ContractWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useContractWorkloadM906Store = create<ContractWorkloadM906State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchContractWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '合同工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
