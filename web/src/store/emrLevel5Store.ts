/**
 * 健澜科技 jlmedaios - 电子病历五级评审自评仪表盘 store（M90-A + M93-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getEmrLevel5Dashboard, type EmrLevel5Dashboard } from '@/services/api/emrLevel5';

interface EmrLevel5State {
  data: EmrLevel5Dashboard | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
}

export const useEmrLevel5Store = create<EmrLevel5State>((set) => ({
  data: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ data: await getEmrLevel5Dashboard() });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },
}));
