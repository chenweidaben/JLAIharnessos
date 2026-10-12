/**
 * 健澜科技 jlmedaios - 改进任务 store 单测（M22-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/improvementTask', () => ({ listMine: vi.fn(), transition: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as iApi from '@/services/api/improvementTask';
import { useImprovementStore } from '@/store/improvementTaskStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const i = iApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  useImprovementStore.setState({ dbUp: null, tasks: [], loading: false, error: null });
});

describe('M22-D improvement store', () => {
  it('db=up', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    expect(await useImprovementStore.getState().checkHealth()).toBe(true);
  });
  it('load 落 tasks', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    i.listMine.mockResolvedValueOnce([{ id: 't1', status: 'open' }]);
    await useImprovementStore.getState().checkHealth();
    await useImprovementStore.getState().load();
    expect(useImprovementStore.getState().tasks).toHaveLength(1);
  });
  it('dbUp!=true act 拒绝', async () => {
    await expect(useImprovementStore.getState().act('t1', 'accepted')).rejects.toThrow(/不可用/);
  });
});
