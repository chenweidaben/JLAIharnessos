/**
 * 健澜科技 jlmedaios - 患者端住院费用 store 单元测试（M50-A）
 *
 * mock 掉 services/api/patientBilling 与 care 健康探活，验证：
 *  - checkHealth 门禁；
 *  - load 成功写 view、失败写 error；
 *  - 空 patientId / dbDown 分支不发起请求。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/patientBilling', () => ({ fetchPatientBilling: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as billingApi from '@/services/api/patientBilling';
import { usePatientBillingStore } from '@/store/patientBillingStore';

const fakeView = {
  patientId: 'p1', visitId: 'v1', visitStatus: 'ongoing',
  breakdown: { byCategory: { drug: 50, exam: 30, treatment: 20, material: 0, other: 0 }, total: 100 },
  insuranceEstimate: { estimatedInsurancePaid: 60, patientOutOfPocket: 40, rate: 0.6 },
  deposit: { paid: 200, balance: 100 },
  itemCount: 3,
};

describe('patientBillingStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePatientBillingStore.setState({ dbUp: null, view: null, loading: false, error: null });
  });

  it('checkHealth 成功置 dbUp=true', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    const up = await usePatientBillingStore.getState().checkHealth();
    expect(up).toBe(true);
    expect(usePatientBillingStore.getState().dbUp).toBe(true);
  });

  it('dbDown 时 load 不发请求并写错误', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'down' });
    await usePatientBillingStore.getState().checkHealth();
    await usePatientBillingStore.getState().load('p1');
    expect(billingApi.fetchPatientBilling).not.toHaveBeenCalled();
    expect(usePatientBillingStore.getState().error).toBeTruthy();
  });

  it('load 成功写入 view', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (billingApi.fetchPatientBilling as ReturnType<typeof vi.fn>).mockResolvedValue(fakeView);
    await usePatientBillingStore.getState().checkHealth();
    await usePatientBillingStore.getState().load('p1');
    expect(billingApi.fetchPatientBilling).toHaveBeenCalledWith('p1');
    expect(usePatientBillingStore.getState().view).toEqual(fakeView);
  });

  it('空 patientId 不发请求', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    await usePatientBillingStore.getState().checkHealth();
    await usePatientBillingStore.getState().load('');
    expect(billingApi.fetchPatientBilling).not.toHaveBeenCalled();
  });
});
