/**
 * 健澜科技 jlmedaios - 输血反应 store 单测（M71-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/transfusionReaction', () => ({
  listTransfusion: vi.fn(), reportTransfusion: vi.fn(),
}));

import * as careApi from '@/services/api/care';
import * as tApi from '@/services/api/transfusionReaction';
import { useTransfusionStore } from '@/store/transfusionReactionStore';

describe('transfusionReactionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTransfusionStore.setState({
      dbUp: null, patientId: '', items: [], loading: false, error: null,
    });
  });

  it('setPatient 拉反应列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (tApi.listTransfusion as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'r1', reactionType: 'fever', severity: 'mild', blocked: false },
    ]);
    await useTransfusionStore.getState().checkHealth();
    await useTransfusionStore.getState().setPatient('p1');
    expect(useTransfusionStore.getState().items[0].reactionType).toBe('fever');
  });

  it('report 提交后刷新列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (tApi.reportTransfusion as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (tApi.listTransfusion as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await useTransfusionStore.getState().checkHealth();
    await useTransfusionStore.getState().setPatient('p1');
    await useTransfusionStore.getState().report({ reactionType: 'fever', severity: 'mild', symptoms: '发热' });
    expect(tApi.reportTransfusion).toHaveBeenCalled();
  });
});
