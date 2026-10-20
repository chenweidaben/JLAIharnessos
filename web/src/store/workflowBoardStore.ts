/**
 * 健澜科技 jlmedaios - 工作流引擎监控看板 Zustand store（M512）
 * 聚合 /workflow/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchInstances,
  fetchNodes,
  fetchStats,
  type InstanceRow,
  type NodeRow,
  type WorkflowStats,
} from '@/services/api/workflowBoard';

interface WorkflowBoardState {
  instances: InstanceRow[];
  nodes: NodeRow[];
  stats: WorkflowStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useWorkflowBoardStore = create<WorkflowBoardState>((set) => ({
  instances: [],
  nodes: [],
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [i, n, s] = await Promise.all([
        fetchInstances(),
        fetchNodes(),
        fetchStats(),
      ]);
      set({
        instances: i.data,
        nodes: n.data,
        stats: s.data,
        demo: i.demo || n.demo || s.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '工作流看板加载失败',
      });
    }
  },
}));
