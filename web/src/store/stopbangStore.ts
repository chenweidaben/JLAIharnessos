/**
 * 健澜科技 jlmedaios - STOP-BANG 筛查 store（M59-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { assessStopbang, listStopbang } from '@/services/api/stopbang';
import type { StopBangScreening } from '@/types/stopbang';

interface StopBangState {
  dbUp: boolean | null;
  visitId: string;
  items: StopBangScreening[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  setVisit: (visitId: string) => Promise<void>;
  assess: (flags: Record<string, boolean>) => Promise<void>;
}

export const useStopbangStore = create<StopBangState>((set, get) => ({
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
    try { set({ items: await listStopbang(visitId) }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  assess: async (flags) => {
    const { visitId, dbUp } = get();
    if (!visitId) throw new Error('缺少 visitId');
    if (dbUp !== true) throw new Error('数据库不可用');
    await assessStopbang({
      visitId,
      sSnoring: Boolean(flags.sSnoring), tTired: Boolean(flags.tTired),
      oObserved: Boolean(flags.oObserved), pPressure: Boolean(flags.pPressure),
      bBmi: Boolean(flags.bBmi), aAge: Boolean(flags.aAge),
      nNeck: Boolean(flags.nNeck), gGender: Boolean(flags.gGender),
    });
    await get().setVisit(visitId);
  },
}));
