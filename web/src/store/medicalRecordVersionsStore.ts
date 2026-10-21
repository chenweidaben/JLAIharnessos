/**
 * 健澜科技 jlmedaios - 病历版本管理 Zustand store（M542，P0）
 *
 * 三态：loading / detailLoading / error / demo；版本列表 + 选中版本详情（Drawer）。
 * 错误只经 store.error 由页面 Alert 展示，禁止页面内 JSON.stringify。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchVersionDetail,
  fetchVersions,
  type RecordVersion,
} from '@/services/api/medicalRecordVersions';

interface MedicalRecordVersionsState {
  recordId: string;
  currentVersionNo: number;
  versions: RecordVersion[];
  selected: RecordVersion | null;
  loading: boolean;
  detailLoading: boolean;
  error: string | null;
  demo: boolean;
  load: (recordId?: string) => Promise<void>;
  openVersion: (versionNo: number) => Promise<void>;
  closeVersion: () => void;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useMedicalRecordVersionsStore = create<MedicalRecordVersionsState>((set, get) => ({
  recordId: 'MR-001',
  currentVersionNo: 0,
  versions: [],
  selected: null,
  loading: false,
  detailLoading: false,
  error: null,
  demo: false,

  load: async (recordId) => {
    const id = (recordId ?? get().recordId).trim() || 'MR-001';
    set({ loading: true, error: null, recordId: id });
    try {
      const res = await fetchVersions(id);
      set({
        versions: res.versions,
        currentVersionNo: res.currentVersionNo,
        loading: false,
        demo: false,
      });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '病历版本列表加载失败') });
    }
  },

  openVersion: async (versionNo) => {
    set({ detailLoading: true, error: null });
    try {
      const res = await fetchVersionDetail(get().recordId, versionNo);
      set({ selected: res.version, detailLoading: false });
    } catch (e) {
      set({ detailLoading: false, error: errMsg(e, '版本详情加载失败') });
    }
  },

  closeVersion: () => set({ selected: null }),
  clearError: () => set({ error: null }),
}));
