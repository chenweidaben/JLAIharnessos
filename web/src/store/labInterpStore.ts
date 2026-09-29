/**
 * 健澜科技 jlmedaios - 检验 AI 辅助解读状态（M3-E）
 *
 * 队列/草稿加载与签名/退回动作；错误透传供断库 Alert，不以空数组冒充。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import type { LabInterpretation, LabInterpQueueItem } from '@/types/labInterpret';
import {
  fetchLabInterpQueue,
  generateLabInterp,
  signLabInterp,
  rejectLabInterp,
} from '@/services/api/labInterpret';

interface LabInterpState {
  items: LabInterpQueueItem[];
  loading: boolean;
  error: string | null;

  loadQueue: (status?: string) => Promise<void>;
  generate: (visitId: string) => Promise<LabInterpretation>;
  sign: (id: string) => Promise<void>;
  reject: (id: string, reason: string) => Promise<void>;
}

export const useLabInterpStore = create<LabInterpState>()((set, get) => ({
  items: [],
  loading: false,
  error: null,

  async loadQueue(status?: string) {
    set({ loading: true, error: null });
    try {
      const { items } = await fetchLabInterpQueue(status);
      set({ items, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '加载解读队列失败' });
      throw e;
    }
  },

  async generate(visitId: string) {
    set({ loading: true, error: null });
    try {
      const r = await generateLabInterp(visitId);
      set({ loading: false });
      return r;
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '生成解读失败' });
      throw e;
    }
  },

  async sign(id: string) {
    set({ error: null });
    await signLabInterp(id);
    await get().loadQueue();
  },

  async reject(id: string, reason: string) {
    set({ error: null });
    await rejectLabInterp(id, reason);
    await get().loadQueue();
  },
}));
