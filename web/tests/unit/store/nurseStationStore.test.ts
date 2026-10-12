/**
 * 健澜科技 jlmedaios - 护士站 store 单测（M18-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/nurseStation', () => ({ wardBoard: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as nsApi from '@/services/api/nurseStation';
import { useNurseStationStore } from '@/store/nurseStationStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const ns = nsApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

const health = (db: 'up' | 'down' = 'up') => ({ status: 'ok', version: '0.3.0', db });

beforeEach(() => {
  vi.clearAllMocks();
  useNurseStationStore.setState({ dbUp: null, health: null, items: [], loading: false, error: null });
});

describe('M18-B nurse station store', () => {
  it('db=up', async () => {
    care.getSystemHealth.mockResolvedValue(health('up'));
    expect(await useNurseStationStore.getState().checkHealth()).toBe(true);
  });
  it('db=down', async () => {
    care.getSystemHealth.mockRejectedValue(new Error('x'));
    expect(await useNurseStationStore.getState().checkHealth()).toBe(false);
  });
  it('load 落 items', async () => {
    care.getSystemHealth.mockResolvedValue(health('up'));
    ns.wardBoard.mockResolvedValueOnce({ items: [{ visitId: 'v1', outstanding: 5 }] });
    await useNurseStationStore.getState().checkHealth();
    await useNurseStationStore.getState().load();
    expect(useNurseStationStore.getState().items).toHaveLength(1);
  });
});
