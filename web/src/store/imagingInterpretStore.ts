/**
 * 健澜科技 jlmedaios - 影像报告 AI 智能解读状态（M12-A）
 *
 * 与检验解读 store 对称：队列/当前解读草稿/签名/退回；错误透传供断库 Alert。
 * 健康门禁（dbUp/checkHealth）复用 labInterpStore，避免双探活。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import type {
  InterpretAudience,
  InterpretMode,
} from '@/types/labInterpret';
import type {
  ImagingInterpretation,
  ImagingInterpQueueItem,
} from '@/types/imagingInterpret';
import {
  fetchImagingInterpQueue,
  generateImagingInterp,
  fetchImagingInterp,
  signImagingInterp,
  rejectImagingInterp,
} from '@/services/api/imagingInterpret';

interface ImagingInterpretState {
  loading: boolean;
  error: string | null;

  items: ImagingInterpQueueItem[];
  current: ImagingInterpretation | null;

  loadQueue: (status?: string, audience?: InterpretAudience) => Promise<void>;
  generate: (
    reportId: string,
    audience?: InterpretAudience,
    mode?: InterpretMode,
  ) => Promise<ImagingInterpretation>;
  fetchCurrent: (reportId: string, audience?: InterpretAudience) => Promise<ImagingInterpretation>;
  sign: (id: string) => Promise<void>;
  reject: (id: string, reason: string) => Promise<void>;
}

export const useImagingInterpretStore = create<ImagingInterpretState>()((set, get) => ({
  loading: false,
  error: null,

  items: [],
  current: null,

  async loadQueue(status?: string, audience?: InterpretAudience) {
    set({ loading: true, error: null });
    try {
      const { items } = await fetchImagingInterpQueue(status, audience);
      set({ items, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '加载影像解读队列失败' });
      throw e;
    }
  },

  async generate(reportId: string, audience?: InterpretAudience, mode?: InterpretMode) {
    set({ loading: true, error: null });
    try {
      const r = await generateImagingInterp(reportId, audience, mode);
      set({ current: r, loading: false });
      return r;
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '生成影像解读失败' });
      throw e;
    }
  },

  async fetchCurrent(reportId: string, audience?: InterpretAudience) {
    set({ loading: true, error: null });
    try {
      const r = await fetchImagingInterp(reportId, audience);
      set({ current: r, loading: false });
      return r;
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '加载影像解读失败' });
      throw e;
    }
  },

  async sign(id: string) {
    set({ error: null });
    try {
      await signImagingInterp(id);
      await get().loadQueue();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '影像解读签名失败' });
      throw e;
    }
  },

  async reject(id: string, reason: string) {
    set({ error: null });
    try {
      await rejectImagingInterp(id, reason);
      await get().loadQueue();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '影像解读退回失败' });
      throw e;
    }
  },
}));
