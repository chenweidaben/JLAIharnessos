/**
 * 健澜科技 jlmedaios - 通知 store 单测（M20-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/notification', () => ({ listNotifications: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as nApi from '@/services/api/notification';
import { useNotificationStore } from '@/store/notificationStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const n = nApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  useNotificationStore.setState({ dbUp: null, items: [], unread: 0, loading: false, error: null });
});

describe('M20-A notification store', () => {
  it('db=up', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    expect(await useNotificationStore.getState().checkHealth()).toBe(true);
  });
  it('load 落 items+unread', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    n.listNotifications.mockResolvedValueOnce({ items: [{ id: 'n1' }], unread: 1 });
    await useNotificationStore.getState().checkHealth();
    await useNotificationStore.getState().load('p1');
    expect(useNotificationStore.getState().unread).toBe(1);
  });
  it('dbUp!=true read 拒绝', async () => {
    await expect(useNotificationStore.getState().read('n1', 'p1')).rejects.toThrow(/不可用/);
  });
});
