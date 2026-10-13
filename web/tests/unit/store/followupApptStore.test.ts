/**
 * 健澜科技 jlmedaios - 复诊预约 store 单测（M62-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/followupAppt', () => ({
  recommendFollowup: vi.fn(), bookFollowupAppt: vi.fn(),
  listFollowupAppt: vi.fn(), cancelFollowupAppt: vi.fn(),
}));

import * as careApi from '@/services/api/care';
import * as faApi from '@/services/api/followupAppt';
import { useFollowupStore } from '@/store/followupApptStore';

const opt = {
  scheduleId: 's1', appointmentDate: '2026-11-01', department: '内分泌科', remaining: 5,
};
const booked = {
  id: 'f1', dischargePlanId: 'p1', scheduleId: 's1', appointmentDate: '2026-11-01',
  department: '内分泌科', status: 'booked' as const, bookedBy: 'u1', createdAt: 'now',
};

describe('followupApptStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFollowupStore.setState({
      dbUp: null, visitId: '', planId: '', options: [], suggested: null,
      items: [], loading: false, error: null,
    });
  });

  it('setVisit 拉列表并推荐号源', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (faApi.listFollowupAppt as ReturnType<typeof vi.fn>).mockResolvedValue([booked]);
    (faApi.recommendFollowup as ReturnType<typeof vi.fn>).mockResolvedValue({ options: [opt], suggested: opt });
    await useFollowupStore.getState().checkHealth();
    await useFollowupStore.getState().setVisit('v1', 'p1');
    expect(faApi.recommendFollowup).toHaveBeenCalledWith('p1');
    expect(useFollowupStore.getState().options[0].remaining).toBe(5);
  });

  it('book 预约后刷新', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (faApi.bookFollowupAppt as ReturnType<typeof vi.fn>).mockResolvedValue(booked);
    (faApi.listFollowupAppt as ReturnType<typeof vi.fn>).mockResolvedValue([booked]);
    (faApi.recommendFollowup as ReturnType<typeof vi.fn>).mockResolvedValue({ options: [opt], suggested: opt });
    await useFollowupStore.getState().checkHealth();
    await useFollowupStore.getState().setVisit('v1', 'p1');
    await useFollowupStore.getState().book(opt);
    expect(faApi.bookFollowupAppt).toHaveBeenCalledWith('p1', expect.objectContaining({ scheduleId: 's1' }));
  });
});
