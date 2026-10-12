/**
 * 健澜科技 jlmedaios - 患者端住院费用 store（M50-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { fetchPatientBilling } from '@/services/api/patientBilling';
import type { PatientBillingView } from '@/types/patientBilling';

interface PatientBillingState {
  dbUp: boolean | null;
  view: PatientBillingView | null;
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: (patientId: string) => Promise<void>;
}

export const usePatientBillingStore = create<PatientBillingState>((set, get) => ({
  dbUp: null,
  view: null,
  loading: false,
  error: null,
  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as { db: 'up' | 'down' };
      const up = Boolean(h && h.db === 'up');
      set({ dbUp: up }); return up;
    } catch { set({ dbUp: false }); return false; }
  },
  load: async (patientId) => {
    if (!patientId) { set({ error: '缺少就诊人 patientId' }); return; }
    if (get().dbUp !== true) { set({ error: '数据库不可用' }); return; }
    set({ loading: true, error: null });
    try {
      const r = await fetchPatientBilling(patientId);
      set({ view: r });
    } catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
}));
