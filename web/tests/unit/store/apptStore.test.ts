/**
 * 健澜科技 jlmedaios - 预约随访 store 单测（M3-I）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useApptStore } from '@/store/apptStore';

vi.mock('@/services/api/appt', () => ({
  listAppointments: vi.fn(),
  createAppointment: vi.fn(),
  confirmAppointment: vi.fn(),
  completeAppointment: vi.fn(),
  cancelAppointment: vi.fn(),
  listFollowUpPlans: vi.fn(),
  createFollowUpPlan: vi.fn(),
  recordFollowUp: vi.fn(),
}));

vi.mock('@/services/api/pharmacy', () => ({
  getSystemHealth: vi.fn(),
}));

import * as api from '@/services/api/appt';
import { getSystemHealth } from '@/services/api/pharmacy';

const appt = {
  id: 'a1',
  appointmentNo: 'APT-0001',
  patientId: 'p1',
  visitId: null,
  scheduledAt: '',
  department: '门诊',
  purpose: '复查',
  status: 'scheduled' as const,
  createdAt: '',
};

const plan = {
  id: 'pl1',
  planNo: 'FU-0001',
  patientId: 'p1',
  scheduledDate: '2026-10-10',
  content: '血压监测',
  status: 'pending' as const,
  createdAt: '',
};

describe('apptStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useApptStore.setState({
      list: [], plans: [], error: null, loading: false,
      dbUp: false, submitting: false, currentId: null,
    });
  });

  it('checkHealth 成功时 dbUp=true', async () => {
    (getSystemHealth as any).mockResolvedValue({ status: 'ok', db: 'up' });
    const up = await useApptStore.getState().checkHealth();
    expect(up).toBe(true);
    expect(useApptStore.getState().dbUp).toBe(true);
  });

  it('checkHealth 失败时 dbUp=false 且报错', async () => {
    (getSystemHealth as any).mockRejectedValue(new Error('BFF 不可达'));
    const up = await useApptStore.getState().checkHealth();
    expect(up).toBe(false);
    expect(useApptStore.getState().dbUp).toBe(false);
    expect(useApptStore.getState().error).toContain('不可达');
  });

  it('load 拉取预约与随访计划', async () => {
    (api.listAppointments as any).mockResolvedValue([appt]);
    (api.listFollowUpPlans as any).mockResolvedValue([plan]);
    await useApptStore.getState().load();
    expect(useApptStore.getState().list).toHaveLength(1);
    expect(useApptStore.getState().plans).toHaveLength(1);
    expect(useApptStore.getState().error).toBeNull();
  });

  it('接口失败透传错误而非空数组', async () => {
    (api.listAppointments as any).mockRejectedValue(new Error('断库 Connection refused'));
    (api.listFollowUpPlans as any).mockRejectedValue(new Error('断库'));
    await useApptStore.getState().load();
    expect(useApptStore.getState().list).toHaveLength(0);
    expect(useApptStore.getState().error).toContain('断库');
  });

  it('dbUp=false 时 createAppt 被拦截', async () => {
    const ok = await useApptStore.getState().createAppt({} as never);
    expect(ok).toBe(false);
    expect(api.createAppointment).not.toHaveBeenCalled();
  });

  it('confirm 后刷新列表', async () => {
    useApptStore.setState({ dbUp: true });
    (api.confirmAppointment as any).mockResolvedValue({ ...appt, status: 'confirmed' });
    (api.listAppointments as any).mockResolvedValue([{ ...appt, status: 'confirmed' }]);
    (api.listFollowUpPlans as any).mockResolvedValue([]);
    const ok = await useApptStore.getState().confirm('a1');
    expect(ok).toBe(true);
    expect(api.confirmAppointment).toHaveBeenCalledWith('a1');
    expect(useApptStore.getState().list[0].status).toBe('confirmed');
  });

  it('complete 调用对应 outcome', async () => {
    useApptStore.setState({ dbUp: true });
    (api.completeAppointment as any).mockResolvedValue({ ...appt, status: 'completed' });
    (api.listAppointments as any).mockResolvedValue([]);
    (api.listFollowUpPlans as any).mockResolvedValue([]);
    const ok = await useApptStore.getState().complete('a1', 'absent');
    expect(ok).toBe(true);
    expect(api.completeAppointment).toHaveBeenCalledWith('a1', 'absent');
  });

  it('recordFollowUp 后刷新', async () => {
    useApptStore.setState({ dbUp: true });
    (api.recordFollowUp as any).mockResolvedValue({ ...plan, status: 'completed' });
    (api.listAppointments as any).mockResolvedValue([]);
    (api.listFollowUpPlans as any).mockResolvedValue([{ ...plan, status: 'completed' }]);
    const ok = await useApptStore.getState().recordFollowUp('pl1', '血压良好');
    expect(ok).toBe(true);
    expect(api.recordFollowUp).toHaveBeenCalledWith('pl1', '血压良好', undefined);
    expect(useApptStore.getState().plans[0].status).toBe('completed');
  });
});
