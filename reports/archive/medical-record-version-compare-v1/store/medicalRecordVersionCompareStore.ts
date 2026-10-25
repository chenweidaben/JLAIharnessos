/**
 * 健澜科技 jlmedaios - 病历版本对比 Zustand store（M615，P0）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import { fetchVersionDetail, loadVersionsForCompare, diffVersions, type VersionDiffRow } from '@/services/api/medicalRecordVersionCompare';
import type { RecordVersion } from '@/services/api/medicalRecordVersions';

interface MedicalRecordVersionCompareState {
  recordId: string;
  versions: RecordVersion[];
  leftNo: number | null;
  rightNo: number | null;
  left: RecordVersion | null;
  right: RecordVersion | null;
  rows: VersionDiffRow[];
  loading: boolean;
  error: string | null;
  load: (recordId?: string) => Promise<void>;
  setLeft: (versionNo: number) => Promise<void>;
  setRight: (versionNo: number) => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useMedicalRecordVersionCompareStore = create<MedicalRecordVersionCompareState>((set, get) => ({
  recordId: 'MR-001',
  versions: [],
  leftNo: null,
  rightNo: null,
  left: null,
  right: null,
  rows: [],
  loading: false,
  error: null,

  load: async (recordId) => {
    const id = (recordId ?? get().recordId).trim() || 'MR-001';
    set({ loading: true, error: null, recordId: id });
    try {
      const versions = await loadVersionsForCompare(id);
      set({ versions, loading: false });
      if (versions.length >= 2) {
        await get().setLeft(versions[versions.length - 2].versionNo);
        await get().setRight(versions[versions.length - 1].versionNo);
      }
    } catch (e) {
      set({ loading: false, error: errMsg(e, '版本列表加载失败') });
    }
  },

  setLeft: async (versionNo) => {
    set({ leftNo: versionNo, loading: true });
    try {
      const res = await fetchVersionDetail(get().recordId, versionNo);
      const left = res.version;
      set({ left, loading: false });
      if (get().right) set({ rows: diffVersions(left, get().right as RecordVersion) });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '左侧版本加载失败') });
    }
  },

  setRight: async (versionNo) => {
    set({ rightNo: versionNo, loading: true });
    try {
      const res = await fetchVersionDetail(get().recordId, versionNo);
      const right = res.version;
      set({ right, loading: false });
      if (get().left) set({ rows: diffVersions(get().left as RecordVersion, right) });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '右侧版本加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
