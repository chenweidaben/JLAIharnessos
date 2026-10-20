/**
 * 健澜科技 jlmedaios - 病案管理看板 Zustand store（M491）
 * 聚合 /emr/archive-* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchArchiveStatus,
  fetchBorrow,
  fetchCopy,
  type ArchiveRow,
  type BorrowRow,
  type CopyRow,
} from '@/services/api/medicalRecordBoard';

interface MedicalRecordBoardState {
  archive: ArchiveRow[];
  borrow: BorrowRow[];
  copy: CopyRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useMedicalRecordBoardStore = create<MedicalRecordBoardState>((set) => ({
  archive: [],
  borrow: [],
  copy: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [a, b, c] = await Promise.all([
        fetchArchiveStatus(),
        fetchBorrow(),
        fetchCopy(),
      ]);
      set({
        archive: a.data,
        borrow: b.data,
        copy: c.data,
        demo: a.demo || b.demo || c.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '病案看板加载失败',
      });
    }
  },
}));
