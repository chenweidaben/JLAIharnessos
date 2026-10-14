/**
 * 健澜科技 jlmedaios - 患者360综合时间线 store
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { loadPatient360Timeline, type Patient360TimelineView } from '@/services/api/patient360';

interface Patient360State {
  patientId: string;
  view: Patient360TimelineView | null;
  loading: boolean;
  error: string | null;
  setPatientId: (id: string) => void;
  load: () => Promise<void>;
  reset: () => void;
}

export const usePatient360Store = create<Patient360State>((set, get) => ({
  patientId: '',
  view: null,
  loading: false,
  error: null,

  setPatientId: (id) => set({ patientId: id }),

  load: async () => {
    const { patientId } = get();
    if (!patientId.trim()) {
      set({ view: null, error: '缺少患者 ID' });
      return;
    }
    set({ loading: true, error: null });
    try {
      set({ view: await loadPatient360Timeline(patientId.trim()) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '患者360时间线加载失败' });
    } finally {
      set({ loading: false });
    }
  },

  reset: () => set({ patientId: '', view: null, error: null }),
}));
