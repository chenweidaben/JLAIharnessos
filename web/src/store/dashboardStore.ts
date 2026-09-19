/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 工作台仪表盘 - Zustand 状态管理
 */

import { create } from 'zustand';
import type { DashboardData } from '@/types/dashboard';
import { mockDashboardData } from '@/mock/dashboardMock';

interface DashboardState {
  data: DashboardData;
  loading: boolean;
  lastUpdated: Date | null;
  /** 实时推送的新危急值/待办计数 */
  pushCount: number;

  // Actions
  fetchDashboardData: () => Promise<void>;
  fetchTodos: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markTodoDone: (id: string) => void;
  markTodoIgnored: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  /** 接收 WebSocket 实时推送的通知（危急值/药物预警等），按 id 去重后插入头部 */
  addNotification: (n: DashboardData['notifications'][number]) => void;
  resetPushCount: () => void;
}

export const useDashboardStore = create<DashboardState>()((set) => ({
  data: mockDashboardData,
  loading: false,
  lastUpdated: new Date(),
  pushCount: 0,

  fetchDashboardData: async () => {
    set({ loading: true });
    // 模拟网络请求延迟
    await new Promise((r) => setTimeout(r, 600));
    set({
      data: mockDashboardData,
      loading: false,
      lastUpdated: new Date(),
    });
  },

  fetchTodos: async () => {
    set({ loading: true });
    await new Promise((r) => setTimeout(r, 300));
    set((state) => ({
      data: { ...state.data, todos: mockDashboardData.todos },
      loading: false,
      lastUpdated: new Date(),
    }));
  },

  fetchNotifications: async () => {
    await new Promise((r) => setTimeout(r, 200));
    set((state) => ({
      data: { ...state.data, notifications: mockDashboardData.notifications },
      lastUpdated: new Date(),
    }));
  },

  markTodoDone: (id) => {
    set((state) => ({
      data: {
        ...state.data,
        todos: state.data.todos.map((t) => (t.id === id ? { ...t, done: true } : t)),
      },
    }));
  },

  markTodoIgnored: (id) => {
    set((state) => ({
      data: {
        ...state.data,
        todos: state.data.todos.filter((t) => t.id !== id),
      },
    }));
  },

  markNotificationRead: (id) => {
    set((state) => ({
      data: {
        ...state.data,
        notifications: state.data.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        ),
      },
    }));
  },

  markAllNotificationsRead: () => {
    set((state) => ({
      data: {
        ...state.data,
        notifications: state.data.notifications.map((n) => ({ ...n, read: true })),
      },
    }));
  },

  addNotification: (n) => {
    set((state) => {
      // 按 id 去重，避免重连/重复推送产生重复条目
      if (state.data.notifications.some((x) => x.id === n.id)) return state;
      const next = [n, ...state.data.notifications].slice(0, 100);
      return {
        pushCount: state.pushCount + 1,
        data: { ...state.data, notifications: next },
      };
    });
  },

  resetPushCount: () => set({ pushCount: 0 }),
}));

// ============ Selectors ============
export const selectUnreadCount = (s: DashboardState) =>
  s.data.notifications.filter((n) => !n.read).length;

export const selectUrgentTodoCount = (s: DashboardState) =>
  s.data.todos.filter((t) => !t.done && t.priority === 'urgent').length;

export const selectPendingTodoCount = (s: DashboardState) =>
  s.data.todos.filter((t) => !t.done).length;
