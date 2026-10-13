/**
 * 健澜科技 jlmedaios - 患者端门户 store 单测（M80-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/patientPortal', () => ({ getPatientPortalApi: vi.fn() }));

import * as pApi from '@/services/api/patientPortal';
import { usePatientPortalStore } from '@/store/patientPortalStore';

describe('patientPortalStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePatientPortalStore.setState({ data: null, loading: false, error: null });
  });

  it('load 拉门户聚合', async () => {
    (pApi.getPatientPortalApi as ReturnType<typeof vi.fn>).mockResolvedValue({
      upcomingAppointments: 1, unreadReportsCount: 0, unreadNotificationsCount: 2,
      depositBalance: 100, pendingFollowups: 1, pendingSurveys: 0,
      pending: { upcomingAppt: 1, unreadReports: 0, unreadNotifs: 2, depositDue: 0, followupDue: 1, surveyDue: 0 },
    });
    await usePatientPortalStore.getState().load();
    expect(usePatientPortalStore.getState().data?.upcomingAppointments).toBe(1);
  });

  it('错误置 error', async () => {
    (pApi.getPatientPortalApi as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('403'));
    await usePatientPortalStore.getState().load();
    expect(usePatientPortalStore.getState().error).toBe('403');
  });
});
