/**
 * 健澜科技 jlmedaios - DRG store 单测（M3-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDrgStore } from '@/store/drgStore';

vi.mock('@/services/api/drg', () => ({
  fetchDrgRules: vi.fn(),
  fetchDrgResults: vi.fn(),
  runDrgGroup: vi.fn(),
  confirmDrgResult: vi.fn(),
  rejectDrgResult: vi.fn(),
}));

import {
  confirmDrgResult,
  fetchDrgResults,
  fetchDrgRules,
  rejectDrgResult,
  runDrgGroup,
} from '@/services/api/drg';

beforeEach(() => {
  useDrgStore.setState({ rules: [], results: [], loading: false, error: null });
  vi.mocked(fetchDrgRules).mockResolvedValue({ rules: [{ groupCode: 'UZ00', groupName: '未入组', mdc: 'Z', dxPrefixes: [], requiresOrp: false, weight: '1', avgPayment: '7000' }] });
  vi.mocked(fetchDrgResults).mockResolvedValue({ results: [] });
  vi.mocked(runDrgGroup).mockResolvedValue({
    id: 'r1', visitId: 'v1', department: '心血管内科', primaryDxCode: 'I50.9',
    hasOrp: false, groupCode: 'FB29', groupName: '内科-心衰', mdc: 'F',
    grouperVersion: 'local-1.0', weight: '0.9', estimatedPayment: '9000',
    totalFee: '8000', balance: '1000', explanation: {}, status: 'grouped', groupedAt: new Date().toISOString(),
  });
  vi.mocked(confirmDrgResult).mockResolvedValue({} as never);
  vi.mocked(rejectDrgResult).mockResolvedValue({} as never);
});

describe('drgStore', () => {
  it('loadRules 拉取规则', async () => {
    await useDrgStore.getState().loadRules();
    expect(useDrgStore.getState().rules).toHaveLength(1);
  });

  it('groupVisit 运行分组并返回结果', async () => {
    const r = await useDrgStore.getState().groupVisit('v1');
    expect(r.groupCode).toBe('FB29');
    expect(runDrgGroup).toHaveBeenCalledWith('v1');
  });

  it('API 失败时写入 error 且不吞', async () => {
    vi.mocked(fetchDrgResults).mockRejectedValueOnce(new Error('Connection refused'));
    await expect(useDrgStore.getState().loadResults()).rejects.toThrow('Connection refused');
    expect(useDrgStore.getState().error).toBe('Connection refused');
  });
});
