/**
 * 健澜科技 jlmedaios - 医保对账 store 单测（M3-G）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useReconStore } from '@/store/reconStore';

vi.mock('@/services/api/recon', () => ({
  listReconRuns: vi.fn(),
  triggerReconRun: vi.fn(),
  getReconRun: vi.fn(),
  confirmReconRun: vi.fn(),
  disputeReconRun: vi.fn(),
}));

import * as api from '@/services/api/recon';

const run = {
  id: 'r1',
  runNo: 'RECON-2026-09-29',
  periodLabel: '2026-09-29',
  status: 'draft' as const,
  totalItems: 2,
  matchedItems: 1,
  discrepancyItems: 1,
  totalPosted: '220.00',
  totalExpected: '200.00',
  createdAt: '',
  confirmedAt: null,
  note: null,
};

describe('reconStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useReconStore.setState({ runs: [], detail: null, error: null, loading: false });
  });

  it('load 拉取批次列表', async () => {
    (api.listReconRuns as any).mockResolvedValue([run]);
    await useReconStore.getState().load();
    expect(useReconStore.getState().runs).toHaveLength(1);
    expect(useReconStore.getState().error).toBeNull();
  });

  it('接口失败透传错误而非空数组', async () => {
    (api.listReconRuns as any).mockRejectedValue(new Error('断库 Connection refused'));
    await useReconStore.getState().load();
    expect(useReconStore.getState().runs).toHaveLength(0);
    expect(useReconStore.getState().error).toContain('断库');
  });

  it('confirm 后刷新详情', async () => {
    const confirmed = { ...run, status: 'confirmed' as const };
    (api.confirmReconRun as any).mockResolvedValue(confirmed);
    (api.getReconRun as any).mockResolvedValue({ ...confirmed, items: [] });
    await useReconStore.getState().confirm('r1');
    expect(api.confirmReconRun).toHaveBeenCalledWith('r1');
    expect(useReconStore.getState().detail?.status).toBe('confirmed');
  });
});
