/**
 * 健澜科技 jlmedaios - 营养科会诊 store（M58-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { consultNutrition, followupNutritionConsult, listNutritionConsult } from '@/services/api/nutritionConsult';
import type { NutritionConsult } from '@/types/nutritionConsult';

interface NutritionState {
  dbUp: boolean | null;
  visitId: string;
  items: NutritionConsult[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  setVisit: (visitId: string) => Promise<void>;
  consult: (input: { nutritionDiagnosis: string; plan: string; caloriesPerDay: number; followupDays?: number }) => Promise<void>;
  followup: (id: string) => Promise<void>;
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
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
    if (!visitId) return;
    if (get().dbUp !== true) return;
    set({ loading: true, error: null });
    try { set({ items: await listNutritionConsult(visitId) }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  consult: async (input) => {
    const { visitId, dbUp } = get();
    if (!visitId) throw new Error('缺少 visitId');
    if (dbUp !== true) throw new Error('数据库不可用');
    await consultNutrition({ ...input, visitId });
    await get().setVisit(visitId);
  },
  followup: async (id) => {
    const { visitId, dbUp } = get();
    if (dbUp !== true) throw new Error('数据库不可用');
    await followupNutritionConsult(id);
    await get().setVisit(visitId);
  },
}));
