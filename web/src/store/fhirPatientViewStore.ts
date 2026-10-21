/**
 * 健澜科技 jlmedaios - FHIR R4 Patient Zustand store（M541，P0）
 *
 * state：当前 Patient / 选中 id / loading / error / demo。
 * 404（未知 id）与网络异常统一由 service 层降级镜像，页面只经 Alert 展示 error。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import { fetchFhirPatient, type FhirPatient } from '@/services/api/fhirPatientView';

interface FhirPatientViewState {
  current: FhirPatient | null;
  selectedId: string;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: (id?: string) => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useFhirPatientViewStore = create<FhirPatientViewState>((set, get) => ({
  current: null,
  selectedId: 'P10001',
  loading: false,
  error: null,
  demo: false,

  load: async (id) => {
    const pid = (id ?? get().selectedId).trim() || 'P10001';
    set({ loading: true, error: null, selectedId: pid });
    try {
      const res = await fetchFhirPatient(pid);
      set({ current: res.patient, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, 'FHIR Patient 资源加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
