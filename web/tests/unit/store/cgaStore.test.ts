/**
 * 健澜科技 jlmedaios - CGA store 单测（M56-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/cga', () => ({ assessCga: vi.fn(), listCga: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as cgaApi from '@/services/api/cga';
import { useCgaStore } from '@/store/cgaStore';

const fakeItem = {
  id: 'c1', visitId: 'v1', adlScore: 50, iadlScore: 20, mmseScore: 28,
  fallRisk: false, mnaScore: 13, gdsScore: 2, riskLevel: 'high' as const, assessor: 'u1', createdAt: 'now',
};

describe('cgaStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCgaStore.setState({ dbUp: null, visitId: '', items: [], loading: false, error: null });
  });

  it('setVisit 拉取评估列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (cgaApi.listCga as ReturnType<typeof vi.fn>).mockResolvedValue([fakeItem]);
    await useCgaStore.getState().checkHealth();
    await useCgaStore.getState().setVisit('v1');
    expect(cgaApi.listCga).toHaveBeenCalledWith('v1');
    expect(useCgaStore.getState().items[0].riskLevel).toBe('high');
  });

  it('assess 提交后刷新列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (cgaApi.assessCga as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (cgaApi.listCga as ReturnType<typeof vi.fn>).mockResolvedValue([fakeItem]);
    await useCgaStore.getState().checkHealth();
    await useCgaStore.getState().setVisit('v1');
    await useCgaStore.getState().assess({ adlScore: 50, iadlScore: 20, mmseScore: 28, mnaScore: 13, gdsScore: 2 });
    expect(cgaApi.assessCga).toHaveBeenCalledWith(expect.objectContaining({ visitId: 'v1' }));
  });
});
