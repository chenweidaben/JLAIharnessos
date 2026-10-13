/**
 * 健澜科技 jlmedaios - SBAR store 单测（M73-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/sbar', () => ({
  closeSbar: vi.fn(), createSbar: vi.fn(), listSbar: vi.fn(), receiveSbar: vi.fn(),
}));

import * as careApi from '@/services/api/care';
import * as sApi from '@/services/api/sbar';
import { useSbarStore } from '@/store/sbarStore';

describe('sbarStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSbarStore.setState({
      dbUp: null, visitId: '', items: [], loading: false, error: null,
    });
  });

  it('setVisit 拉交接列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (sApi.listSbar as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'h1', status: 'pending', fromUnit: '急诊', toUnit: 'ICU' },
    ]);
    await useSbarStore.getState().checkHealth();
    await useSbarStore.getState().setVisit('v1');
    expect(useSbarStore.getState().items[0].fromUnit).toBe('急诊');
  });

  it('create 提交后刷新列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (sApi.createSbar as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (sApi.listSbar as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await useSbarStore.getState().checkHealth();
    await useSbarStore.getState().setVisit('v1');
    await useSbarStore.getState().create({
      fromUnit: '急诊', toUnit: 'ICU', situation: 's', background: 'b', assessment: 'a', recommendation: 'r',
    });
    expect(sApi.createSbar).toHaveBeenCalled();
  });
});
