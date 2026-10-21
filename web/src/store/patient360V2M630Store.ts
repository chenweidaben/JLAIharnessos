/**
 * 健澜科技 jlmedaios - 患者 360 视图 v2 Zustand store（M630，P0 合规）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import { fetchPatientSummary, type PatientSummary } from '@/services/api/patient360V2M630';

interface Patient360V2M630State {
  patientId: string;
  summary: PatientSummary | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePatient360V2M630Store = create<Patient360V2M630State>((set, get) => ({
  patientId: 'P10001',
  summary: null,
  loading: false,
  error: null,
  demo: false,

  load: async (patientId) => {
    const pid = (patientId ?? get().patientId).trim() || 'P10001';
    set({ patientId: pid, loading: true, error: null });
    try {
      const res = await fetchPatientSummary(pid);
      set({ summary: res, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '患者 360 聚合加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
