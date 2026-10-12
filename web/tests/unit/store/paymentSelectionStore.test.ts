/**
 * 健澜科技 jlmedaios - 病组选择 store 单测（M23-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/paymentSelection', () => ({ list: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as sApi from '@/services/api/paymentSelection';
import { useSelectionStore } from '@/store/paymentSelectionStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const s = sApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  useSelectionStore.setState({ dbUp: null, rows: [], loading: false, error: null });
});

describe('M23-B selection store', () => {
  it('db=up', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    expect(await useSelectionStore.getState().checkHealth()).toBe(true);
  });
  it('load 落 rows', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    s.list.mockResolvedValueOnce([{ id: 'x', selectedPath: 'auto_drg' }]);
    await useSelectionStore.getState().checkHealth();
    await useSelectionStore.getState().load();
    expect(useSelectionStore.getState().rows).toHaveLength(1);
  });
  it('dbUp!=true load 拒绝', async () => {
    await useSelectionStore.getState().load();
    expect(useSelectionStore.getState().error).toMatch(/不可用/);
  });
});
