/**
 * 健澜科技 jlmedaios - CDI 用药审查 store 单测（M70-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/cdi', () => ({
  listCdi: vi.fn(), resolveCdi: vi.fn(), reviewDrug: vi.fn(),
}));

import * as careApi from '@/services/api/care';
import * as cApi from '@/services/api/cdi';
import { useCdiStore } from '@/store/cdiStore';

describe('cdiStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCdiStore.setState({
      dbUp: null, patientId: '', items: [], loading: false, error: null,
    });
  });

  it('setPatient 拉审查列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (cApi.listCdi as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'r1', drugName: 'metformin', severity: 'info', resolved: false },
    ]);
    await useCdiStore.getState().checkHealth();
    await useCdiStore.getState().setPatient('p1');
    expect(useCdiStore.getState().items[0].drugName).toBe('metformin');
  });

  it('review 提交后刷新列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (cApi.reviewDrug as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (cApi.listCdi as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await useCdiStore.getState().checkHealth();
    await useCdiStore.getState().setPatient('p1');
    await useCdiStore.getState().review({ drugName: 'aspirin' });
    expect(cApi.reviewDrug).toHaveBeenCalled();
  });
});
