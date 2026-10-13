/**
 * 健澜科技 jlmedaios - SBAR 交接 store（M73-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { closeSbar, createSbar, listSbar, receiveSbar } from '@/services/api/sbar';
import type { SbarHandoff } from '@/types/sbar';

interface SbarState {
  dbUp: boolean | null;
  visitId: string;
  items: SbarHandoff[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  setVisit: (visitId: string) => Promise<void>;
  create: (input: { fromUnit: string; toUnit: string; situation: string; background: string; assessment: string; recommendation: string }) => Promise<void>;
  receive: (id: string) => Promise<void>;
  close: (id: string) => Promise<void>;
}

export const useSbarStore = create<SbarState>((set, get) => ({
  dbUp: null,
  visitId: '',
  items: [],
  loading: false,
  error: null,
  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as { db: 'up' | 'down' };
      const up = Boolean(h && h.db === 'up');
      set({ dbUp: up }); return up;
    } catch { set({ dbUp: false }); return false; }
  },
  setVisit: async (visitId) => {
    set({ visitId });
    if (!visitId || get().dbUp !== true) return;
    set({ loading: true, error: null });
    try { set({ items: await listSbar(visitId) }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  create: async (input) => {
    if (get().dbUp !== true) throw new Error('不可用');
    await createSbar({ visitId: get().visitId, ...input });
    await get().setVisit(get().visitId);
  },
  receive: async (id) => {
    if (get().dbUp !== true) throw new Error('不可用');
    await receiveSbar(id);
    await get().setVisit(get().visitId);
  },
  close: async (id) => {
    if (get().dbUp !== true) throw new Error('不可用');
    await closeSbar(id);
    await get().setVisit(get().visitId);
  },
}));
