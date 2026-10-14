/**
 * 健澜科技 jlmedaios - 质控整改闭环看板 Zustand store（215）
 *
 * 看板全量列表 + 新建整改任务 + 卡片状态流转（open→fixed→reviewed→closed）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import {
  createRectification, listRectifications, transitionRectification,
} from '@/services/api/qcRectification';
import type { CreateRectificationReq, QcRectification } from '@/types/qcRectification';

interface QcRectificationState {
  records: QcRectification[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  load: () => Promise<void>;
  create: (body: CreateRectificationReq) => Promise<void>;
  advance: (id: string, note?: string) => Promise<void>;
}

export const useQcRectificationStore = create<QcRectificationState>((set, get) => ({
  records: [],
  loading: false,
  acting: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ records: await listRectifications() });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },

  create: async (body) => {
    set({ acting: true, error: null });
    try {
      await createRectification(body);
      await get().load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '新建失败';
      set({ error: msg });
      throw err;
    } finally {
      set({ acting: false });
    }
  },

  advance: async (id, note) => {
    set({ acting: true, error: null });
    try {
      await transitionRectification(id, note ? { note } : {});
      await get().load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '流转失败';
      set({ error: msg });
      throw err;
    } finally {
      set({ acting: false });
    }
  },
}));
