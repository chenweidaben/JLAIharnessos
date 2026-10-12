/**
 * 健澜科技 jlmedaios - 医嘱开方 CDS Zustand store（M18-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { listByVisit, overrideAlert } from '@/services/api/orderCds';
import type { OrderCdsAlert } from '@/types/orderCds';

interface HealthInfo { status: string; version: string; demoMode: boolean; db: 'up' | 'down' | 'skipped'; }

interface OrderCdsState {
  dbUp: boolean | null;
  health: HealthInfo | null;
  alerts: OrderCdsAlert[];
  unresolvedHard: number;
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: (visitId: string) => Promise<void>;
  override: (id: string, reason: string, visitId: string) => Promise<void>;
}

export const useOrderCdsStore = create<OrderCdsState>((set, get) => ({
  dbUp: null,
  health: null,
  alerts: [],
  unresolvedHard: 0,
  loading: false,
  error: null,

  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as HealthInfo;
      const up = h && h.db === 'up';
      set({ dbUp: up, health: h, error: up ? null : '数据库连接异常，业务数据不可用' });
      return up;
    } catch (err) {
      set({ dbUp: false, health: null, error: err instanceof Error ? err.message : '健康检查失败' });
      return false;
    }
  },

  load: async (visitId) => {
    set({ loading: true, error: null });
    try {
      const r = await listByVisit(visitId);
      set({ alerts: r.alerts, unresolvedHard: r.unresolvedHard });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },

  override: async (id, reason, visitId) => {
    if (get().dbUp !== true) throw new Error('数据库不可用，禁止操作');
    try {
      await overrideAlert(id, reason);
      await get().load(visitId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'override 失败';
      set({ error: msg });
      throw err;
    }
  },
}));
