/**
 * 健澜科技 jlmedaios - 医生站工作台 store 单测（M79-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/doctorWorkbench', () => ({ getDoctorWorkbench: vi.fn() }));

import * as wApi from '@/services/api/doctorWorkbench';
import { useDoctorWorkbenchStore } from '@/store/doctorWorkbenchStore';

describe('doctorWorkbenchStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDoctorWorkbenchStore.setState({ data: null, loading: false, error: null });
  });

  it('load 拉工作台聚合', async () => {
    (wApi.getDoctorWorkbench as ReturnType<typeof vi.fn>).mockResolvedValue({
      openTasksCount: 3, unreadNotifications: 2, activeObservations: 1,
      pendingPlans: 0, departmentKpis: [],
      summary: { urgentAlerts: 1, followupsToday: 0, kpis: 0 },
    });
    await useDoctorWorkbenchStore.getState().load();
    expect(useDoctorWorkbenchStore.getState().data?.openTasksCount).toBe(3);
  });

  it('错误置 error', async () => {
    (wApi.getDoctorWorkbench as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('403'));
    await useDoctorWorkbenchStore.getState().load();
    expect(useDoctorWorkbenchStore.getState().error).toBe('403');
  });
});
