/**
 * 健澜科技 jlmedaios - 配药任务 store 单测（M21-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/pharmacyTask', () => ({ listPendingTasks: vi.fn(), completeTask: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as pApi from '@/services/api/pharmacyTask';
import { usePharmacyTaskStore } from '@/store/pharmacyTaskStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const p = pApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  usePharmacyTaskStore.setState({ dbUp: null, items: [], loading: false, error: null });
});

describe('M21-B pharmacy task store', () => {
  it('db=up', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    expect(await usePharmacyTaskStore.getState().checkHealth()).toBe(true);
  });
  it('load 落 items', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    p.listPendingTasks.mockResolvedValueOnce([{ id: 't1' }]);
    await usePharmacyTaskStore.getState().checkHealth();
    await usePharmacyTaskStore.getState().load();
    expect(usePharmacyTaskStore.getState().items).toHaveLength(1);
  });
  it('dbUp!=true complete 拒绝', async () => {
    await expect(usePharmacyTaskStore.getState().complete('t1')).rejects.toThrow(/不可用/);
  });
});
