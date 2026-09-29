/**
 * 健澜科技 jlmedaios - 手术麻醉 store 单测（M3-H）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSurgeryStore } from '@/store/surgeryStore';

vi.mock('@/services/api/surgery', () => ({
  listSurgeries: vi.fn(),
  getSurgery: vi.fn(),
  dischargeSurgery: vi.fn(),
}));

import * as api from '@/services/api/surgery';

const req = {
  id: 's1',
  requestNo: 'OP-0001',
  visitId: 'v1',
  patientId: 'p1',
  surgeryType: 'elective',
  plannedProcedure: '阑尾切除术',
  diagnosis: null,
  plannedDate: null,
  department: '外科',
  surgeonId: null,
  anesthetistId: null,
  anesthesiaMethod: null,
  status: 'pacu' as const,
  precheck: {},
  surgeonSignedAt: null,
  anesthetistSignedAt: null,
  createdAt: '',
};

describe('surgeryStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSurgeryStore.setState({ list: [], detail: null, error: null, loading: false });
  });

  it('load 拉取手术列表', async () => {
    (api.listSurgeries as any).mockResolvedValue([req]);
    await useSurgeryStore.getState().load();
    expect(useSurgeryStore.getState().list).toHaveLength(1);
    expect(useSurgeryStore.getState().error).toBeNull();
  });

  it('接口失败透传错误而非空数组', async () => {
    (api.listSurgeries as any).mockRejectedValue(new Error('断库 Connection refused'));
    await useSurgeryStore.getState().load();
    expect(useSurgeryStore.getState().list).toHaveLength(0);
    expect(useSurgeryStore.getState().error).toContain('断库');
  });

  it('discharge 后刷新详情', async () => {
    (api.dischargeSurgery as any).mockResolvedValue({ ...req, status: 'discharged' });
    (api.getSurgery as any).mockResolvedValue({ req: { ...req, status: 'discharged' }, events: [] });
    await useSurgeryStore.getState().discharge('s1');
    expect(api.dischargeSurgery).toHaveBeenCalledWith('s1');
    expect(useSurgeryStore.getState().detail?.req.status).toBe('discharged');
  });
});
