/**
 * 健澜科技 jlmedaios - 续方流转 store（M21-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { dispense, listMine, pay } from '@/services/api/renewal';
import type { RenewalItem } from '@/types/renewal';

interface RenewalState {
  dbUp: boolean | null;
  items: RenewalItem[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: (patientId: string) => Promise<void>;
  doPay: (id: string, patientId: string) => Promise<void>;
  doDispense: (id: string, patientId: string) => Promise<void>;
}

export const useRenewalStore = create<RenewalState>((set, get) => ({
  dbUp: null,
  items: [],
  loading: false,
  error: null,
  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as { db: 'up' | 'down' };
      const up = h && h.db === 'up';
      set({ dbUp: up }); return up;
    } catch { set({ dbUp: false }); return false; }
  },
  load: async (patientId) => {
    if (get().dbUp !== true) { set({ error: '数据库不可用' }); return; }
    set({ loading: true });
    try {
      const r = await listMine(patientId);
      set({ items: r });
    } catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  doPay: async (id, patientId) => {
    if (get().dbUp !== true) throw new Error('数据库不可用');
    await pay(id);
    await get().load(patientId);
  },
  doDispense: async (id, patientId) => {
    if (get().dbUp !== true) throw new Error('数据库不可用');
    await dispense(id);
    await get().load(patientId);
  },
}));
