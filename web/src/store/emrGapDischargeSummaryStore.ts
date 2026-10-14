/**
 * 健澜科技 jlmedaios - 出院小结 store
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import {
  getDischargeSummary,
  submitDischargeSummary,
  upsertDischargeSummary,
  verifyDischargeSummary,
} from '@/services/api/emrGap';
import type { DischargeSummary, DischargeSummaryPayload } from '@/types/emrGap';

interface EmrGapDischargeSummaryState {
  summary: DischargeSummary | null;
  visitId: string;
  searched: boolean;
  loading: boolean;
  acting: boolean;
  error: string | null;
  search: (visitId: string) => Promise<void>;
  save: (payload: DischargeSummaryPayload) => Promise<void>;
  submit: () => Promise<void>;
  verify: () => Promise<void>;
  reset: () => void;
}

/** BFF 404「出院小结不存在」视为可新建，不当作错误红条 */
function isNotFound(err: unknown): boolean {
  return err instanceof Error && err.message.includes('不存在');
}

export const useEmrGapDischargeSummaryStore = create<EmrGapDischargeSummaryState>((set, get) => ({
  summary: null,
  visitId: '',
  searched: false,
  loading: false,
  acting: false,
  error: null,

  search: async (visitId) => {
    set({ loading: true, error: null, visitId });
    try {
      const s = await getDischargeSummary(visitId);
      set({ summary: s, searched: true });
    } catch (err) {
      if (isNotFound(err)) {
        // 无小结：进入新建态
        set({ summary: null, searched: true, error: null });
      } else {
        set({ summary: null, searched: true, error: err instanceof Error ? err.message : '查询失败' });
      }
    } finally {
      set({ loading: false });
    }
  },

  save: async (payload) => {
    set({ acting: true, error: null });
    try {
      set({ summary: await upsertDischargeSummary(payload) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '保存失败' });
      throw err;
    } finally {
      set({ acting: false });
    }
  },

  submit: async () => {
    const cur = get().summary;
    if (!cur) return;
    set({ acting: true, error: null });
    try {
      set({ summary: await submitDischargeSummary(cur.id) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '提交失败' });
      throw err;
    } finally {
      set({ acting: false });
    }
  },

  verify: async () => {
    const cur = get().summary;
    if (!cur) return;
    set({ acting: true, error: null });
    try {
      set({ summary: await verifyDischargeSummary(cur.id) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '审核失败' });
      throw err;
    } finally {
      set({ acting: false });
    }
  },

  reset: () => set({ summary: null, visitId: '', searched: false, error: null }),
}));
