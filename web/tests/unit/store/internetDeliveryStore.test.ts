/**
 * 健澜科技 jlmedaios - 互联网配送/报告 Store 单元测试（M3-N）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/system', () => ({
  systemApi: { health: vi.fn() },
}));
vi.mock('@/services/api/internetDelivery', () => ({
  internetDeliveryApi: {
    my: vi.fn(),
    all: vi.fn(),
    create: vi.fn(),
    fulfill: vi.fn(),
    myReports: vi.fn(),
    staffReports: vi.fn(),
  },
}));

import { systemApi } from '@/services/api/system';
import { internetDeliveryApi } from '@/services/api/internetDelivery';
import { useInternetDeliveryStore } from '@/store/internetDeliveryStore';

const sysM = vi.mocked(systemApi);
const apiM = vi.mocked(internetDeliveryApi);

const delivery = (over: Record<string, unknown> = {}) => ({
  id: 'dlv1',
  deliveryNo: 'DLV20261001001',
  rxId: 'rx1',
  patientId: 'pt1',
  accountId: 'acc1',
  channel: 'self_pick',
  status: 'created',
  courierCompany: null,
  trackingNo: null,
  addressSnapshot: null,
  pickupCode: '123456',
  createdAt: '2026-10-01T08:00:00Z',
  updatedAt: '2026-10-01T08:00:00Z',
  ...over,
});

const reports = {
  labs: [{ id: 'l1', itemName: '血常规', value: '5.2', unit: '10^9/L', abnormalFlag: 'N', isCritical: false }],
  imaging: [],
  interpretations: [],
};

beforeEach(() => {
  useInternetDeliveryStore.getState().reset();
  vi.clearAllMocks();
});

describe('internetDeliveryStore', () => {
  it('健康门禁：db=up 时 healthOk=true', async () => {
    sysM.health.mockResolvedValue({ status: 'healthy', db: 'up' } as never);
    await useInternetDeliveryStore.getState().checkHealth();
    expect(useInternetDeliveryStore.getState().healthOk).toBe(true);
  });

  it('健康门禁：异常时 healthOk=false 且提示', async () => {
    sysM.health.mockRejectedValue(new Error('ECONNREFUSED') as never);
    await useInternetDeliveryStore.getState().checkHealth();
    expect(useInternetDeliveryStore.getState().healthOk).toBe(false);
    expect(useInternetDeliveryStore.getState().healthMsg).toContain('不可用');
  });

  it('loadMy：患者配送列表落库', async () => {
    apiM.my.mockResolvedValue({ deliveries: [delivery()] } as never);
    await useInternetDeliveryStore.getState().loadMy('pt1');
    expect(useInternetDeliveryStore.getState().myDeliveries).toHaveLength(1);
  });

  it('loadAll：药房全量列表落库', async () => {
    apiM.all.mockResolvedValue({ deliveries: [delivery({ channel: 'express' })] } as never);
    await useInternetDeliveryStore.getState().loadAll();
    expect(useInternetDeliveryStore.getState().allDeliveries[0].channel).toBe('express');
  });

  it('createDelivery：调 API 后刷新全量列表', async () => {
    apiM.create.mockResolvedValue({} as never);
    apiM.all.mockResolvedValue({ deliveries: [delivery()] } as never);
    await useInternetDeliveryStore.getState().createDelivery({ rxId: 'rx1', channel: 'self_pick' });
    expect(apiM.create).toHaveBeenCalledWith({ rxId: 'rx1', channel: 'self_pick' });
    expect(apiM.all).toHaveBeenCalled();
  });

  it('fulfill：发货传物流字段并刷新', async () => {
    apiM.fulfill.mockResolvedValue({} as never);
    apiM.all.mockResolvedValue({ deliveries: [] } as never);
    await useInternetDeliveryStore.getState().fulfill({
      deliveryId: 'dlv1', to: 'shipped', courierCompany: '顺丰', trackingNo: 'SF1',
    });
    expect(apiM.fulfill).toHaveBeenCalledWith({
      deliveryId: 'dlv1', to: 'shipped', courierCompany: '顺丰', trackingNo: 'SF1',
    });
  });

  it('loadMyReports：患者报告落库', async () => {
    apiM.myReports.mockResolvedValue(reports as never);
    await useInternetDeliveryStore.getState().loadMyReports('pt1', 'v1');
    expect(useInternetDeliveryStore.getState().reports?.labs).toHaveLength(1);
    expect(apiM.myReports).toHaveBeenCalledWith('pt1', 'v1');
  });

  it('loadStaffReports：医护按患者查询落库', async () => {
    apiM.staffReports.mockResolvedValue(reports as never);
    await useInternetDeliveryStore.getState().loadStaffReports('pt2');
    expect(useInternetDeliveryStore.getState().reports).not.toBeNull();
    expect(apiM.staffReports).toHaveBeenCalledWith('pt2', undefined);
  });

  it('空 patientId 不请求', async () => {
    await useInternetDeliveryStore.getState().loadMy('');
    expect(apiM.my).not.toHaveBeenCalled();
  });
});
