/**
 * 健澜科技 jlmedaios - 用药指导 Zustand store（M621，P12）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import { fetchMedicationGuidance, type MedicationGuidance } from '@/services/api/medicationGuidanceM621';

interface MedicationGuidanceM621State {
  patientId: string;
  items: MedicationGuidance[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useMedicationGuidanceM621Store = create<MedicationGuidanceM621State>((set, get) => ({
  patientId: 'P10001',
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async (patientId) => {
    const pid = (patientId ?? get().patientId).trim() || 'P10001';
    set({ patientId: pid, loading: true, error: null });
    try {
      const res = await fetchMedicationGuidance(pid);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '用药指导加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
