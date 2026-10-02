/**
 * 健澜科技 jlmedaios - 人工工单中心状态管理（M4-D）
 *
 * 真实 BFF：列出待办、工单详情、认领、批准/驳回。
 * 健康门禁：BFF/DB 不可用时阻断处理并显式报错，绝不以假数据冒充。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { create } from 'zustand';
import * as htApi from '@/services/api/humanTask';
import { getSystemHealth } from '@/services/api/pharmacy';
import type { HumanTaskDetailView, HumanTaskView } from '@/types/humanTask';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface HumanTaskState {
  health: { status: string; db: string } | null;
  dbUp: boolean;
  healthChecking: boolean;

  tasks: HumanTaskView[];
  loading: boolean;

  detail: HumanTaskDetailView | null;
  currentId: string | null;

  acting: boolean;
  error: string | null;

  checkHealth: () => Promise<boolean>;
  loadTasks: (status?: string) => Promise<void>;
  openTask: (id: string) => Promise<boolean>;
  claimTask: (id: string) => Promise<boolean>;
  resolveTask: (
    id: string,
    body: { approved: boolean; comment?: string; formData?: Record<string, unknown> },
  ) => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
}

const initial = {
  health: null,
  dbUp: false,
  healthChecking: false,
  tasks: [],
  loading: false,
  detail: null,
  currentId: null,
  acting: false,
  error: null,
};

export const useHumanTaskStore = create<HumanTaskState>((set, get) => ({
  ...initial,

  checkHealth: async () => {
    set({ healthChecking: true });
    try {
      const health = await getSystemHealth();
      const dbUp = health.db === 'up';
      set({ health, dbUp, healthChecking: false, error: null });
      return dbUp;
    } catch (e) {
      set({
        health: null,
        dbUp: false,
        healthChecking: false,
        error: `BFF/数据库连接失败：${errMsg(e)}`,
      });
      return false;
    }
  },

  loadTasks: async (status) => {
    set({ loading: true, error: null });
    try {
      const tasks = await htApi.listMyHumanTasksApi({ status: status ?? 'pending' });
      set({ tasks, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  openTask: async (id) => {
    set({ loading: true, error: null, currentId: id });
    try {
      const detail = await htApi.getHumanTaskApi(id);
      set({ detail, loading: false });
      return true;
    } catch (e) {
      set({ loading: false, detail: null, error: errMsg(e) });
      return false;
    }
  },

  claimTask: async (id) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法认领工单' });
      return false;
    }
    set({ acting: true, error: null });
    try {
      const detail = await htApi.claimHumanTaskApi(id);
      set({ acting: false, detail });
      await get().loadTasks();
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e) });
      return false;
    }
  },

  resolveTask: async (id, body) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法处理工单' });
      return false;
    }
    set({ acting: true, error: null });
    try {
      const detail = await htApi.resolveHumanTaskApi(id, body);
      set({ acting: false, detail });
      await get().loadTasks();
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e) });
      return false;
    }
  },

  clearError: () => set({ error: null }),
  reset: () => set(initial),
}));
