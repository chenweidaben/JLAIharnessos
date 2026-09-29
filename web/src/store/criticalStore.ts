/**
 * 健澜科技 jlmedaios - 危急值闭环状态（M3-F）
 *
 * 队列加载与签收/处置动作；错误透传供断库 Alert，不以空数组冒充。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import type { CriticalAlertItem } from '@/types/criticalValue';
import {
  fetchCriticalAlerts,
  scanCritical,
  ackCritical,
  resolveCritical,
} from '@/services/api/criticalValue';

interface CriticalState {
  items: CriticalAlertItem[];
  loading: boolean;
  error: string | null;

  loadQueue: (status?: string) => Promise<void>;
  scan: () => Promise<number>;
  ack: (id: string) => Promise<void>;
  resolve: (id: string, note: string) => Promise<void>;
}

export const useCriticalStore = create<CriticalState>()((set, get) => ({
  items: [],
  loading: false,
  error: null,

  async loadQueue(status?: string) {
    set({ loading: true, error: null });
    try {
      const { items } = await fetchCriticalAlerts(status);
      set({ items, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '加载危急值队列失败' });
      throw e;
    }
  },

  async scan() {
    set({ loading: true, error: null });
    try {
      const { raised } = await scanCritical();
      set({ loading: false });
      return raised;
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '扫描危急值失败' });
      throw e;
    }
  },

  async ack(id: string) {
    set({ error: null });
    await ackCritical(id);
    await get().loadQueue();
  },

  async resolve(id: string, note: string) {
    set({ error: null });
    await resolveCritical(id, note);
    await get().loadQueue();
  },
}));
