/**
 * 健澜科技 jlmedaios - 检验检查申请 v2 Zustand store（M645）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchLabRadiologyOrders,
  type LabRadiologyOrder,
} from '@/services/api/labRadiologyOrderV2M645';

interface LabRadiologyOrderV2M645State {
  patientId: string;
  items: LabRadiologyOrder[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useLabRadiologyOrderV2M645Store = create<LabRadiologyOrderV2M645State>((set, get) => ({
  patientId: 'P10001',
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async (patientId) => {
    const pid = (patientId ?? get().patientId).trim() || 'P10001';
    set({ patientId: pid, loading: true, error: null });
    try {
      const res = await fetchLabRadiologyOrders(pid);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '检验检查申请加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
