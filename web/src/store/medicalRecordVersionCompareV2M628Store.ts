/**
 * 健澜科技 jlmedaios - 病历版本对比 v2 Zustand store（M628，P0 合规）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  diffStructured,
  fetchVersionsForCompare,
  type RecordVersion,
  type VersionCompareRow,
} from '@/services/api/medicalRecordVersionCompareV2M628';

interface MedicalRecordVersionCompareV2M628State {
  recordId: string;
  versions: RecordVersion[];
  leftNo: number | null;
  rightNo: number | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: (recordId?: string) => Promise<void>;
  selectLeft: (no: number) => void;
  selectRight: (no: number) => void;
  rows: () => VersionCompareRow[];
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useMedicalRecordVersionCompareV2M628Store = create<MedicalRecordVersionCompareV2M628State>((set, get) => ({
  recordId: 'MR-001',
  versions: [],
  leftNo: null,
  rightNo: null,
  loading: false,
  error: null,
  demo: false,

  load: async (recordId) => {
    const rid = (recordId ?? get().recordId).trim() || 'MR-001';
    set({ recordId: rid, loading: true, error: null });
    try {
      const res = await fetchVersionsForCompare(rid);
      const versions = res.versions;
      const sorted = [...versions].sort((a, b) => a.versionNo - b.versionNo);
      set({
        versions: sorted,
        demo: res.demo || get().demo,
        loading: false,
        leftNo: sorted[sorted.length - 2]?.versionNo ?? null,
        rightNo: sorted[sorted.length - 1]?.versionNo ?? null,
      });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '版本列表加载失败') });
    }
  },

  selectLeft: (no) => set({ leftNo: no }),
  selectRight: (no) => set({ rightNo: no }),

  rows: () => {
    const s = get();
    const left = s.versions.find((v) => v.versionNo === s.leftNo) ?? null;
    const right = s.versions.find((v) => v.versionNo === s.rightNo) ?? null;
    return diffStructured(left, right);
  },

  clearError: () => set({ error: null }),
}));
