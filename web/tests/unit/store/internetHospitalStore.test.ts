/**
 * 健澜科技 jlmedaios - 互联网医院管理端 store 单测（M3-J）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useInternetHospitalStore } from '@/store/internetHospitalStore';

vi.mock('@/services/api/internetHospital', () => ({
  listPractitioners: vi.fn(),
  auditPractitioner: vi.fn(),
  getMyPractitioner: vi.fn(),
  submitPractitioner: vi.fn(),
}));

vi.mock('@/services/api/pharmacy', () => ({
  getSystemHealth: vi.fn(),
}));

import * as api from '@/services/api/internetHospital';
import { getSystemHealth } from '@/services/api/pharmacy';

const practitioner = {
  id: 'pr1',
  userId: 'u1',
  practitionerNo: '110000000000001',
  practitionerType: 'doctor' as const,
  practiceScope: '内科',
  practiceYears: 10,
  auditStatus: 'pending' as const,
  auditReason: null,
  approvedAt: null,
  approvedBy: null,
  validFrom: null,
  validTo: null,
  createdAt: '',
};

describe('internetHospitalStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useInternetHospitalStore.setState({
      list: [],
      error: null,
      loading: false,
      dbUp: false,
      auditing: false,
      statusFilter: undefined,
      health: null,
    });
  });

  it('checkHealth 成功时 dbUp=true', async () => {
    (getSystemHealth as any).mockResolvedValue({ status: 'ok', db: 'up' });
    const up = await useInternetHospitalStore.getState().checkHealth();
    expect(up).toBe(true);
    expect(useInternetHospitalStore.getState().dbUp).toBe(true);
  });

  it('checkHealth 失败时 dbUp=false', async () => {
    (getSystemHealth as any).mockRejectedValue(new Error('BFF 不可达'));
    const up = await useInternetHospitalStore.getState().checkHealth();
    expect(up).toBe(false);
    expect(useInternetHospitalStore.getState().error).toContain('不可达');
  });

  it('load 拉取资质列表', async () => {
    (api.listPractitioners as any).mockResolvedValue([practitioner]);
    await useInternetHospitalStore.getState().load();
    expect(useInternetHospitalStore.getState().list).toHaveLength(1);
  });

  it('接口失败透传错误而非空数组', async () => {
    (api.listPractitioners as any).mockRejectedValue(new Error('断库'));
    await useInternetHospitalStore.getState().load();
    expect(useInternetHospitalStore.getState().error).toContain('断库');
  });

  it('dbUp=false 时 audit 被拦截', async () => {
    const ok = await useInternetHospitalStore.getState().audit('pr1', 'approved');
    expect(ok).toBe(false);
    expect(api.auditPractitioner).not.toHaveBeenCalled();
  });

  it('audit 通过后刷新列表', async () => {
    useInternetHospitalStore.setState({ dbUp: true });
    (api.auditPractitioner as any).mockResolvedValue({
      ...practitioner,
      auditStatus: 'approved',
    });
    (api.listPractitioners as any).mockResolvedValue([]);
    const ok = await useInternetHospitalStore.getState().audit('pr1', 'approved');
    expect(ok).toBe(true);
    expect(api.auditPractitioner).toHaveBeenCalledWith('pr1', 'approved', undefined);
  });

  it('audit 接口失败时返回 false 并设置错误', async () => {
    useInternetHospitalStore.setState({ dbUp: true });
    (api.auditPractitioner as any).mockRejectedValue(new Error('冲突'));
    const ok = await useInternetHospitalStore.getState().audit('pr1', 'approved');
    expect(ok).toBe(false);
    expect(useInternetHospitalStore.getState().auditing).toBe(false);
    expect(useInternetHospitalStore.getState().error).toContain('冲突');
  });

  it('setStatusFilter 触发重新加载', async () => {
    (api.listPractitioners as any).mockResolvedValue([]);
    await useInternetHospitalStore.getState().setStatusFilter('pending');
    expect(useInternetHospitalStore.getState().statusFilter).toBe('pending');
    expect(api.listPractitioners).toHaveBeenCalledWith('pending');
  });
});
