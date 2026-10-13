/**
 * 健澜科技 jlmedaios - MDT 治疗方案 store（M67-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { confirmPlan, draftPlan, listPlans } from '@/services/api/mdtTreatmentPlan';
import type { TreatmentPlan } from '@/types/mdtTreatmentPlan';

interface TreatmentPlanState {
  dbUp: boolean | null;
  visitId: string;
  items: TreatmentPlan[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  setVisit: (visitId: string) => Promise<void>;
  create: (input: { mdtConsultId: string; departments: string[]; conclusion: string }) => Promise<void>;
  confirm: (id: string, scheduledAt: string) => Promise<void>;
}

export const useTreatmentPlanStore = create<TreatmentPlanState>((set, get) => ({
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
    try { set({ items: await listPlans(visitId) }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  create: async (input) => {
    if (get().dbUp !== true) throw new Error('不可用');
    await draftPlan({ visitId: get().visitId, ...input });
    await get().setVisit(get().visitId);
  },
  confirm: async (id, scheduledAt) => {
    if (get().dbUp !== true) throw new Error('不可用');
    await confirmPlan(id, scheduledAt);
    await get().setVisit(get().visitId);
  },
}));
