/**
 * 健澜科技 jlmedaios - 出院计划 store（M61-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { createDischargePlan, listDischargePlan, pushDischargePlan } from '@/services/api/dischargePlan';
import type { DischargePlan } from '@/types/dischargePlan';

interface DischargeState {
  dbUp: boolean | null;
  visitId: string;
  items: DischargePlan[];
  suggestedDate: string;
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  setVisit: (visitId: string) => Promise<void>;
  create: (input: { medicationSummary: string; diagnoses?: string[] }) => Promise<void>;
  push: (id: string) => Promise<void>;
}

export const useDischargeStore = create<DischargeState>((set, get) => ({
  dbUp: null,
  visitId: '',
  items: [],
  suggestedDate: '',
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
    try { set({ items: await listDischargePlan(visitId) }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  create: async (input) => {
    const { visitId, dbUp } = get();
    if (!visitId) throw new Error('缺少 visitId');
    if (dbUp !== true) throw new Error('数据库不可用');
    const r = await createDischargePlan({ ...input, visitId });
    set({ suggestedDate: r.suggestedFollowupDate });
    await get().setVisit(visitId);
  },
  push: async (id) => {
    const { visitId, dbUp } = get();
    if (dbUp !== true) throw new Error('数据库不可用');
    await pushDischargePlan(id);
    await get().setVisit(visitId);
  },
}));
