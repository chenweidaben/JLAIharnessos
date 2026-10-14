/**
 * 健澜科技 jlmedaios - 科研专病队列导出状态管理
 *
 * 纳排条件筛选 → 预览命中队列 → 导出 CSV（浏览器下载）。
 * 错误显式上报，绝不以假数据冒充真实队列。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { create } from 'zustand';
import {
  downloadCohortCsv,
  previewCohort,
  type CohortExportFilters,
  type CohortExportRow,
} from '@/services/api/researchExport';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface CohortExportState {
  rows: CohortExportRow[];
  loading: boolean;
  exporting: boolean;
  error: string | null;
  /** 当前已应用的纳排条件 */
  filters: CohortExportFilters;

  setFilters: (patch: Partial<CohortExportFilters>) => void;
  /** 按当前纳排条件刷新预览 */
  loadPreview: () => Promise<void>;
  /** 导出 CSV（浏览器下载） */
  exportCsv: () => Promise<boolean>;
  clearError: () => void;
}

export const useCohortExportStore = create<CohortExportState>((set, get) => ({
  rows: [],
  loading: false,
  exporting: false,
  error: null,
  filters: { disease: '', gender: '', minAge: undefined, maxAge: undefined, minLos: undefined, department: '' },

  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),

  loadPreview: async () => {
    set({ loading: true, error: null });
    try {
      const rows = await previewCohort(get().filters);
      set({ rows, loading: false });
    } catch (e) {
      set({ rows: [], loading: false, error: errMsg(e) });
    }
  },

  exportCsv: async () => {
    set({ exporting: true, error: null });
    try {
      await downloadCohortCsv(get().filters);
      set({ exporting: false });
      return true;
    } catch (e) {
      set({ exporting: false, error: errMsg(e) });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
