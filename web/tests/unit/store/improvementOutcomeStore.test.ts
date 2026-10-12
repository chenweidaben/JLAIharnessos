/**
 * 健澜科技 jlmedaios - 整改效果回看 store 单测（M22-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/improvementOutcome', () => ({ getByTask: vi.fn(), evaluate: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as oApi from '@/services/api/improvementOutcome';
import { useOutcomeStore } from '@/store/improvementOutcomeStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const o = oApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  useOutcomeStore.setState({ dbUp: null, review: null, loading: false, error: null });
});

describe('M22-E outcome store', () => {
  it('db=up', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    expect(await useOutcomeStore.getState().checkHealth()).toBe(true);
  });
  it('load 落 review', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    o.getByTask.mockResolvedValueOnce({ id: 'r1', verdict: 'effective' });
    await useOutcomeStore.getState().checkHealth();
    await useOutcomeStore.getState().load('t1');
    expect(useOutcomeStore.getState().review?.verdict).toBe('effective');
  });
  it('dbUp!=true load 拒绝', async () => {
    await useOutcomeStore.getState().load('t1');
    expect(useOutcomeStore.getState().error).toMatch(/不可用/);
  });
});
