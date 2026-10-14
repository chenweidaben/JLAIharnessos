/* ============================================================================
 * 健澜科技数智医院智能体 - 系统健康监控状态（Zustand）
 *
 * 真实 BFF：GET /api/v1/system/health；失败显式报错，不以假数据冒充正常。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 * ==========================================================================*/

import { create } from 'zustand';
import { fetchSystemHealth, type SystemHealth } from '@/services/api/systemHealth';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface SystemHealthState {
  health: SystemHealth | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  clearError: () => void;
}

export const useSystemHealthStore = create<SystemHealthState>((set) => ({
  health: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const health = await fetchSystemHealth();
      set({ health, loading: false });
    } catch (e) {
      set({ loading: false, error: `健康状态加载失败：${errMsg(e)}` });
    }
  },

  clearError: () => set({ error: null }),
}));
