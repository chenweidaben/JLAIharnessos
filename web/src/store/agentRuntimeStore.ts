/**
 * 健澜科技 jlmedaios - 智能体运行时状态管理（M4-C）
 *
 * 真实 BFF：触发已发布智能体执行、实例列表、节点记录与结果回放。
 * 健康门禁：BFF/DB 不可用时阻断执行并显式报错，绝不以假数据冒充。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { create } from 'zustand';
import * as rtApi from '@/services/api/agentRuntime';
import { getSystemHealth } from '@/services/api/pharmacy';
import type {
  RunDetailView,
  StartRunRequest,
  WorkflowInstanceView,
} from '@/types/agentRuntime';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface AgentRuntimeState {
  health: { status: string; db: string } | null;
  dbUp: boolean;
  healthChecking: boolean;

  instances: WorkflowInstanceView[];
  loading: boolean;

  detail: RunDetailView | null;
  currentId: string | null;

  running: boolean;
  error: string | null;

  checkHealth: () => Promise<boolean>;
  loadInstances: (filter?: { agentId?: string; state?: string }) => Promise<void>;
  openInstance: (id: string) => Promise<boolean>;
  runAgent: (agentId: string, body?: StartRunRequest) => Promise<boolean>;
  cancelInstance: (id: string, reason?: string) => Promise<boolean>;
  clearError: () => void;
}

export const useAgentRuntimeStore = create<AgentRuntimeState>((set, get) => ({
  health: null,
  dbUp: false,
  healthChecking: false,

  instances: [],
  loading: false,

  detail: null,
  currentId: null,

  running: false,
  error: null,

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

  loadInstances: async (filter) => {
    set({ loading: true, error: null });
    try {
      const instances = await rtApi.listAgentRunsApi(filter ?? {});
      set({ instances, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  openInstance: async (id) => {
    set({ loading: true, error: null, currentId: id });
    try {
      const detail = await rtApi.getAgentRunApi(id);
      set({ detail, loading: false });
      return true;
    } catch (e) {
      set({ loading: false, detail: null, error: errMsg(e) });
      return false;
    }
  },

  runAgent: async (agentId, body) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法执行智能体' });
      return false;
    }
    set({ running: true, error: null });
    try {
      const detail = await rtApi.startAgentRunApi(agentId, body ?? {});
      set({ running: false, detail, currentId: detail.instance.id });
      await get().loadInstances();
      return detail.instance.state === 'completed';
    } catch (e) {
      set({ running: false, error: errMsg(e) });
      return false;
    }
  },

  cancelInstance: async (id, reason) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法取消' });
      return false;
    }
    set({ running: true, error: null });
    try {
      await rtApi.cancelAgentRunApi(id, reason);
      set({ running: false });
      await get().loadInstances();
      // 重新获取详情，避免依赖取消端点返回体的完整性
      await get().openInstance(id);
      return true;
    } catch (e) {
      set({ running: false, error: errMsg(e) });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
