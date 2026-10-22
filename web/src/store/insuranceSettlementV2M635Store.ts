/**
 * 健澜科技 jlmedaios - 医保结算看板 v2 Zustand store（M635）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchInsuranceBundle,
  type Preauth,
  type Settlement,
} from '@/services/api/insuranceSettlementV2M635';

interface InsuranceSettlementV2M635State {
  settlements: Settlement[];
  preauths: Preauth[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useInsuranceSettlementV2M635Store = create<InsuranceSettlementV2M635State>((set) => ({
  settlements: [],
  preauths: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchInsuranceBundle();
      set({ settlements: res.settlements, preauths: res.preauths, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '医保结算加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
