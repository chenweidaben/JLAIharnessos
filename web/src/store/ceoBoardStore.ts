/**
 * 健澜科技 jlmedaios - 院长数据驾驶舱 Store（院长版）
 *
 * 从 BFF 拉取六大核心指标卡；失败显式报错，不显示假数据。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { create } from 'zustand';
import { fetchCeoDashboard, type CeoDashboardView } from '@/services/api/ceoDashboard';

interface CeoBoardState {
  board: CeoDashboardView | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  load: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useCeoBoardStore = create<CeoBoardState>()((set) => ({
  board: null,
  loading: false,
  error: null,
  lastUpdated: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const board = await fetchCeoDashboard();
      set({ board, loading: false, lastUpdated: new Date() });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : '驾驶舱数据加载失败' });
    }
  },

  refresh: async () => {
    await useCeoBoardStore.getState().load();
  },
}));
