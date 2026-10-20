/**
 * 健澜科技 jlmedaios - 医生工作台待办中心 Zustand store（M471）
 *
 * 聚合四个 workflow 端点：todo-center / approval-chain / role-handoff / activity-log。
 * BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchActivityLog,
  fetchApprovalChain,
  fetchRoleHandoff,
  fetchTodoCenter,
  type ActivityEntry,
  type ApprovalNode,
  type HandoffRecord,
  type TodoItem,
} from '@/services/api/workflow';

interface TodoCenterState {
  todos: TodoItem[];
  approvalChain: ApprovalNode[];
  handoffs: HandoffRecord[];
  activities: ActivityEntry[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useTodoCenterStore = create<TodoCenterState>((set) => ({
  todos: [],
  approvalChain: [],
  handoffs: [],
  activities: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [t, a, h, l] = await Promise.all([
        fetchTodoCenter(),
        fetchApprovalChain(),
        fetchRoleHandoff(),
        fetchActivityLog(),
      ]);
      set({
        todos: t.data,
        approvalChain: a.data,
        handoffs: h.data,
        activities: l.data,
        demo: t.demo || a.demo || h.demo || l.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '待办中心加载失败',
      });
    }
  },
}));
