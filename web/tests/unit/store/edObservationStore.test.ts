/**
 * 健澜科技 jlmedaios - 急诊留观 store 单测（M74-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/edObservation', () => ({
  closeEdObservation: vi.fn(), listEdObservations: vi.fn(), registerEdObservation: vi.fn(),
}));

import * as careApi from '@/services/api/care';
import * as eApi from '@/services/api/edObservation';
import { useEdObsStore } from '@/store/edObservationStore';

describe('edObservationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEdObsStore.setState({
      dbUp: null, patientId: '', items: [], loading: false, error: null,
    });
  });

  it('setPatient 拉留观列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (eApi.listEdObservations as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'o1', triageLevel: 'III', status: 'observing' },
    ]);
    await useEdObsStore.getState().checkHealth();
    await useEdObsStore.getState().setPatient('p1');
    expect(useEdObsStore.getState().items[0].triageLevel).toBe('III');
  });

  it('register 提交后刷新列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (eApi.registerEdObservation as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (eApi.listEdObservations as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await useEdObsStore.getState().checkHealth();
    await useEdObsStore.getState().setPatient('p1');
    await useEdObsStore.getState().register({ triageLevel: 'III' });
    expect(eApi.registerEdObservation).toHaveBeenCalled();
  });
});
