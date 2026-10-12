/**
 * 健澜科技 jlmedaios - 护士站四合一屏 Zustand store（M18-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { wardBoard } from '@/services/api/nurseStation';
import type { WardRow } from '@/types/nurseStation';

interface HealthInfo { status: string; version: string; db: 'up' | 'down' | 'skipped'; }

interface NurseStationState {
  dbUp: boolean | null;
  health: HealthInfo | null;
  items: WardRow[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: () => Promise<void>;
}

export const useNurseStationStore = create<NurseStationState>((set, get) => ({
  dbUp: null,
  health: null,
  items: [],
  loading: false,
  error: null,

  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as HealthInfo;
      const up = h && h.db === 'up';
      set({ dbUp: up, health: h, error: up ? null : '数据库连接异常' });
      return up;
    } catch (err) {
      set({ dbUp: false, health: null, error: err instanceof Error ? err.message : '健康检查失败' });
      return false;
    }
  },

  load: async () => {
    if (get().dbUp !== true) { set({ error: '数据库不可用' }); return; }
    set({ loading: true, error: null });
    try {
      const r = await wardBoard();
      set({ items: r.items });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },
}));
