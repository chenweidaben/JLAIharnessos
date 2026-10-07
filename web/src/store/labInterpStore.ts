/**
 * 健澜科技 jlmedaios - 检查检验结果 AI 智能解读状态（M3-E → M12-A）
 *
 * 健康门禁（BFF/DB 探活）+ 队列/当前解读草稿加载 + 签名/退回动作。
 * 写操作失败时 set error 并 rethrow，供页面/用例断言断库 Alert，不以空数组冒充。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/pharmacy';
import type {
  InterpretAudience,
  InterpretMode,
  LabInterpretation,
  LabInterpQueueItem,
} from '@/types/labInterpret';
import {
  fetchLabInterpQueue,
  generateLabInterp,
  fetchLabInterp,
  signLabInterp,
  rejectLabInterp,
} from '@/services/api/labInterpret';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface LabInterpState {
  dbUp: boolean;
  healthChecking: boolean;
  loading: boolean;
  error: string | null;

  items: LabInterpQueueItem[];
  /** 当前就诊已生成/加载的解读草稿（含 LLM 三态标注） */
  current: LabInterpretation | null;

  checkHealth: () => Promise<boolean>;
  loadQueue: (status?: string, audience?: InterpretAudience) => Promise<void>;
  generate: (
    visitId: string,
    audience?: InterpretAudience,
    mode?: InterpretMode,
  ) => Promise<LabInterpretation>;
  fetchCurrent: (visitId: string, audience?: InterpretAudience) => Promise<LabInterpretation>;
  sign: (id: string) => Promise<void>;
  reject: (id: string, reason: string) => Promise<void>;
}

export const useLabInterpStore = create<LabInterpState>()((set, get) => ({
  dbUp: false,
  healthChecking: false,
  loading: false,
  error: null,

  items: [],
  current: null,

  checkHealth: async () => {
    set({ healthChecking: true });
    try {
      const health = await getSystemHealth();
      const dbUp = health.db === 'up';
      set({ dbUp, healthChecking: false, error: null });
      return dbUp;
    } catch (e) {
      set({ dbUp: false, healthChecking: false, error: `BFF/数据库连接失败：${errMsg(e)}` });
      return false;
    }
  },

  async loadQueue(status?: string, audience?: InterpretAudience) {
    set({ loading: true, error: null });
    try {
      const { items } = await fetchLabInterpQueue(status, audience);
      set({ items, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '加载解读队列失败' });
      throw e;
    }
  },

  async generate(visitId: string, audience?: InterpretAudience, mode?: InterpretMode) {
    set({ loading: true, error: null });
    try {
      // 向后兼容：无视角/模式时仅传 visitId（旧单测断言精确参数）。
      const r =
        audience || mode
          ? await generateLabInterp(visitId, audience, mode)
          : await generateLabInterp(visitId);
      set({ current: r, loading: false });
      return r;
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '生成解读失败' });
      throw e;
    }
  },

  async fetchCurrent(visitId: string, audience?: InterpretAudience) {
    set({ loading: true, error: null });
    try {
      const r = await fetchLabInterp(visitId, audience);
      set({ current: r, loading: false });
      return r;
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '加载解读失败' });
      throw e;
    }
  },

  async sign(id: string) {
    set({ error: null });
    try {
      await signLabInterp(id);
      await get().loadQueue();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '签名失败' });
      throw e;
    }
  },

  async reject(id: string, reason: string) {
    set({ error: null });
    try {
      await rejectLabInterp(id, reason);
      await get().loadQueue();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '退回失败' });
      throw e;
    }
  },
}));
