/**
 * 健澜科技 jlmedaios - 科主任 agent 驾驶舱 store
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getDeptCockpit, type DeptCockpitData } from '@/services/api/deptCockpit';

interface DeptCockpitState {
  data: DeptCockpitData | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
}

export const useDeptCockpitStore = create<DeptCockpitState>((set) => ({
  data: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ data: await getDeptCockpit() });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },
}));
