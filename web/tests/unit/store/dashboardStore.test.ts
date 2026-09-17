/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * dashboardStore 测试：统计数据 / 待办 / 通知
 */
import { describe, it, expect } from 'vitest';
import {
  useDashboardStore,
  selectUnreadCount,
  selectUrgentTodoCount,
  selectPendingTodoCount,
} from '@/store/dashboardStore';

describe('dashboardStore 待办管理', () => {
  it('markTodoDone 标记待办完成', () => {
    useDashboardStore.getState().markTodoDone('t01');
    const todo = useDashboardStore.getState().data.todos.find((t) => t.id === 't01');
    expect(todo?.done).toBe(true);
  });

  it('markTodoIgnored 移除待办', () => {
    useDashboardStore.getState().markTodoIgnored('t02');
    const exists = useDashboardStore.getState().data.todos.some((t) => t.id === 't02');
    expect(exists).toBe(false);
  });
});

describe('dashboardStore 通知管理', () => {
  it('markNotificationRead 标记单条已读', () => {
    useDashboardStore.getState().markNotificationRead('n01');
    const ntf = useDashboardStore.getState().data.notifications.find((n) => n.id === 'n01');
    expect(ntf?.read).toBe(true);
  });

  it('markAllNotificationsRead 全部已读', () => {
    useDashboardStore.getState().markAllNotificationsRead();
    const allRead = useDashboardStore.getState().data.notifications.every((n) => n.read);
    expect(allRead).toBe(true);
  });
});

describe('dashboardStore 推送计数', () => {
  it('resetPushCount 清零', () => {
    useDashboardStore.setState({ pushCount: 5 });
    useDashboardStore.getState().resetPushCount();
    expect(useDashboardStore.getState().pushCount).toBe(0);
  });
});

describe('dashboardStore 选择器', () => {
  it('selectUnreadCount 统计未读通知', () => {
    const count = selectUnreadCount(useDashboardStore.getState());
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('selectUrgentTodoCount 统计紧急待办', () => {
    const count = selectUrgentTodoCount(useDashboardStore.getState());
    expect(typeof count).toBe('number');
  });

  it('selectPendingTodoCount 统计未完成待办', () => {
    const count = selectPendingTodoCount(useDashboardStore.getState());
    expect(typeof count).toBe('number');
  });
});

describe('dashboardStore 异步加载', () => {
  it('fetchDashboardData 设置 loading', async () => {
    const p = useDashboardStore.getState().fetchDashboardData();
    expect(useDashboardStore.getState().loading).toBe(true);
    await p;
    expect(useDashboardStore.getState().loading).toBe(false);
  });

  it('fetchNotifications 更新通知', async () => {
    await useDashboardStore.getState().fetchNotifications();
    expect(useDashboardStore.getState().lastUpdated).not.toBeNull();
  });
});
