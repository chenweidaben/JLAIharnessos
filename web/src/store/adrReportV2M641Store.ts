/**
 * 健澜科技 jlmedaios - ADR 药品不良反应 v2 Zustand store（M641）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createAdrReport,
  fetchAdrReports,
  type AdrCreateInput,
  type AdrReport,
} from '@/services/api/adrReportV2M641';

interface AdrReportV2M641State {
  patientId: string;
  items: AdrReport[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  create: (input: AdrCreateInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useAdrReportV2M641Store = create<AdrReportV2M641State>((set, get) => ({
  patientId: 'P10001',
  items: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,

  load: async (patientId) => {
    const pid = (patientId ?? get().patientId).trim() || 'P10001';
    set({ patientId: pid, loading: true, error: null });
    try {
      const res = await fetchAdrReports(pid);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, 'ADR 列表加载失败') });
    }
  },

  create: async (input) => {
    set({ acting: true, error: null });
    try {
      await createAdrReport(input);
      set({ acting: false });
      await get().load(input.patientId);
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, 'ADR 上报失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
