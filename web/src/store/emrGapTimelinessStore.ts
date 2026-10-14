/**
 * 健澜科技 jlmedaios - 文书时效监控 store（M87-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { listTimeliness, scanTimeliness } from '@/services/api/emrGap';
import type { TimelinessItem } from '@/types/emrGap';

interface EmrGapTimelinessState {
  rows: TimelinessItem[];
  loading: boolean;
  scanning: boolean;
  error: string | null;
  load: () => Promise<void>;
  scan: () => Promise<void>;
}

export const useEmrGapTimelinessStore = create<EmrGapTimelinessState>((set) => ({
  rows: [],
  loading: false,
  scanning: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ rows: await listTimeliness() });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },

  scan: async () => {
    set({ scanning: true, error: null });
    try {
      await scanTimeliness();
      // 扫描后刷新待处理台账
      set({ rows: await listTimeliness() });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '扫描失败' });
    } finally {
      set({ scanning: false });
    }
  },
}));
