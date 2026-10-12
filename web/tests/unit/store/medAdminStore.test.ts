/**
 * 健澜科技 jlmedaios - 给药三查七对 Zustand store 单测（M17-B）
 *
 * mock services/api/medAdmin 与 services/api/care，验证：
 *  - 健康探活门禁（up/down）；
 *  - 记录/指标加载与错误落 error；
 *  - execute 在 dbUp!=true 时拒绝，成功 rethrow 不吞。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/medAdmin', () => ({
  executeMed: vi.fn(),
  listMedAdmins: vi.fn(),
  getMedAdmin: vi.fn(),
  getMedErrorMetrics: vi.fn(),
}));

import * as careApi from '@/services/api/care';
import * as adminApi from '@/services/api/medAdmin';
import { useMedAdminStore } from '@/store/medAdminStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const api = adminApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

const health = (db: 'up' | 'down' | 'skipped' = 'up') => ({ status: 'ok', version: '0.3.0', demoMode: false, db });

beforeEach(() => {
  vi.clearAllMocks();
  useMedAdminStore.setState({
    dbUp: null, health: null, records: [], metrics: null,
    loadingRecords: false, acting: false, error: null,
  });
});

describe('M17-B store 健康门禁', () => {
  it('db=up => dbUp=true', async () => {
    care.getSystemHealth.mockResolvedValue(health('up'));
    expect(await useMedAdminStore.getState().checkHealth()).toBe(true);
    expect(useMedAdminStore.getState().dbUp).toBe(true);
  });
  it('db=down => dbUp=false 并记 error', async () => {
    care.getSystemHealth.mockRejectedValue(new Error('ECONNREFUSED'));
    expect(await useMedAdminStore.getState().checkHealth()).toBe(false);
    expect(useMedAdminStore.getState().dbUp).toBe(false);
  });
});

describe('M17-B store 加载', () => {
  it('loadRecords 落 records', async () => {
    api.listMedAdmins.mockResolvedValue([{ id: 'r1', medName: 'x' }]);
    await useMedAdminStore.getState().loadRecords();
    expect(useMedAdminStore.getState().records).toHaveLength(1);
  });
  it('loadMetrics 落 metrics', async () => {
    api.getMedErrorMetrics.mockResolvedValue({
      totalAdministrations: 3,
      metrics: { medErrorRate: 33.33, fractions: { medErrorRate: { numerator: 1, denominator: 3 } } },
    });
    await useMedAdminStore.getState().loadMetrics();
    expect(useMedAdminStore.getState().metrics?.metrics.medErrorRate).toBe(33.33);
  });
});

describe('M17-B store 写门禁', () => {
  it('dbUp!=true 时 execute 拒绝', async () => {
    await expect(useMedAdminStore.getState().execute({
      orderId: 'o', visitId: 'v', wristbandPatientId: 'p', medName: 'm', dose: 'd',
      signature: 's', idempotencyKey: 'k',
    })).rejects.toThrow(/不可用/);
  });
  it('dbUp=true 时 execute 成功并 rethrow 错误', async () => {
    care.getSystemHealth.mockResolvedValue(health('up'));
    await useMedAdminStore.getState().checkHealth();
    api.executeMed.mockRejectedValue(new Error('五对核对未通过'));
    await expect(useMedAdminStore.getState().execute({
      orderId: 'o', visitId: 'v', wristbandPatientId: 'p', medName: 'm', dose: 'd',
      signature: 's', idempotencyKey: 'k',
    })).rejects.toThrow('五对核对未通过');
    expect(useMedAdminStore.getState().error).toContain('五对核对未通过');
  });
});
