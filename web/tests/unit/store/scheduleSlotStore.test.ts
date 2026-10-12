/**
 * 健澜科技 jlmedaios - 号源 store 单测（M19-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/scheduleSlot', () => ({ listSlots: vi.fn(), bookSlot: vi.fn(), cancelSlot: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as schedApi from '@/services/api/scheduleSlot';
import { useScheduleSlotStore } from '@/store/scheduleSlotStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const sched = schedApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

const health = (db: 'up' | 'down' = 'up') => ({ status: 'ok', db });

beforeEach(() => {
  vi.clearAllMocks();
  useScheduleSlotStore.setState({ dbUp: null, slots: [], loading: false, error: null });
});

describe('M19-A schedule store', () => {
  it('db=up', async () => {
    care.getSystemHealth.mockResolvedValue(health('up'));
    expect(await useScheduleSlotStore.getState().checkHealth()).toBe(true);
  });
  it('load 落 slots', async () => {
    care.getSystemHealth.mockResolvedValue(health('up'));
    sched.listSlots.mockResolvedValueOnce([{ id: 's1', remaining: 5, available: true }]);
    await useScheduleSlotStore.getState().checkHealth();
    await useScheduleSlotStore.getState().load();
    expect(useScheduleSlotStore.getState().slots).toHaveLength(1);
  });
  it('dbUp!=true book 拒绝', async () => {
    await expect(useScheduleSlotStore.getState().book('s1')).rejects.toThrow(/不可用/);
  });
});
