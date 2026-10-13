/**
 * 健澜科技 jlmedaios - MDT store 单测（M66-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/mdt', () => ({
  createMdt: vi.fn(), listMdt: vi.fn(), scheduleMdt: vi.fn(), minutesMdt: vi.fn(),
}));

import * as careApi from '@/services/api/care';
import * as mApi from '@/services/api/mdt';
import { useMdtStore } from '@/store/mdtStore';

describe('mdtStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMdtStore.setState({
      dbUp: null, visitId: '', items: [], loading: false, error: null,
    });
  });

  it('setVisit 拉会诊列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (mApi.listMdt as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'c1', title: '肺癌讨论', status: 'requested' },
    ]);
    await useMdtStore.getState().checkHealth();
    await useMdtStore.getState().setVisit('v1');
    expect(useMdtStore.getState().items[0].title).toBe('肺癌讨论');
  });

  it('create 提交后刷新列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (mApi.createMdt as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (mApi.listMdt as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await useMdtStore.getState().checkHealth();
    await useMdtStore.getState().setVisit('v1');
    await useMdtStore.getState().create({ title: '胃癌', reason: '手术', departments: [] });
    expect(mApi.createMdt).toHaveBeenCalled();
  });
});
