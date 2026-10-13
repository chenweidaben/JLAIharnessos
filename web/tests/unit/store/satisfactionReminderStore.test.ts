/**
 * 健澜科技 jlmedaios - 满意度提醒 store 单测（M64-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/satisfactionReminder', () => ({
  runNotifyScan: vi.fn(), getMyPending: vi.fn(),
}));

import * as careApi from '@/services/api/care';
import * as sApi from '@/services/api/satisfactionReminder';
import { useReminderStore } from '@/store/satisfactionReminderStore';

describe('satisfactionReminderStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useReminderStore.setState({ dbUp: null, items: [], loading: false, error: null });
  });

  it('loadPending 拉待填通知', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (sApi.getMyPending as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'n1', title: '邀请评价', body: '请填写', createdAt: 'now' },
    ]);
    await useReminderStore.getState().checkHealth();
    await useReminderStore.getState().loadPending();
    expect(useReminderStore.getState().items[0].title).toBe('邀请评价');
  });

  it('scan 触发扫描后刷新', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (sApi.runNotifyScan as ReturnType<typeof vi.fn>).mockResolvedValue({ pushed: 1 });
    (sApi.getMyPending as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await useReminderStore.getState().checkHealth();
    await useReminderStore.getState().scan();
    expect(sApi.runNotifyScan).toHaveBeenCalled();
  });
});
