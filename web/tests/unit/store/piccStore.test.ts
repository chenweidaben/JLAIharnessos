/**
 * 健澜科技 jlmedaios - PICC 维护 store 单测（M68-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/picc', () => ({
  listPicc: vi.fn(), recordPicc: vi.fn(),
}));

import * as careApi from '@/services/api/care';
import * as pApi from '@/services/api/picc';
import { usePiccStore } from '@/store/piccStore';

describe('piccStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePiccStore.setState({
      dbUp: null, patientId: '', items: [], loading: false, error: null,
    });
  });

  it('setPatient 拉维护列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (pApi.listPicc as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'm1', deviceType: 'picc', complication: 'none', lastMaintainedAt: '2026-10-10' },
    ]);
    await usePiccStore.getState().checkHealth();
    await usePiccStore.getState().setPatient('p1');
    expect(usePiccStore.getState().items[0].deviceType).toBe('picc');
  });

  it('record 提交后刷新列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (pApi.recordPicc as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (pApi.listPicc as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await usePiccStore.getState().checkHealth();
    await usePiccStore.getState().setPatient('p1');
    await usePiccStore.getState().record({ deviceType: 'picc', insertedAt: '2026-09-01', lastMaintainedAt: '2026-10-10' });
    expect(pApi.recordPicc).toHaveBeenCalled();
  });
});
