/**
 * 健澜科技 jlmedaios - 整改升级 store 单测（M22-F）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/escalation', () => ({ getChain: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as eApi from '@/services/api/escalation';
import { useEscalationStore } from '@/store/escalationStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const e = eApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  useEscalationStore.setState({ dbUp: null, chain: [], loading: false, error: null });
});

describe('M22-F escalation store', () => {
  it('db=up', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    expect(await useEscalationStore.getState().checkHealth()).toBe(true);
  });
  it('loadChain 落 chain', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    e.getChain.mockResolvedValueOnce([{ id: 't1', escalationLevel: 1 }]);
    await useEscalationStore.getState().checkHealth();
    await useEscalationStore.getState().loadChain('t1');
    expect(useEscalationStore.getState().chain).toHaveLength(1);
  });
  it('dbUp!=true loadChain 拒绝', async () => {
    await useEscalationStore.getState().loadChain('t1');
    expect(useEscalationStore.getState().error).toMatch(/不可用/);
  });
});
