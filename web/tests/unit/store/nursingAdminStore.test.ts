/* ============================================================================
 * 健澜科技 jlmedaios - 护理管理后台 store 单测（M16-B / M16B_TEST）
 *
 * 覆盖：健康门禁（探活成功/失败）、看板与指标库加载（成功/失败）、
 * 全部写 action（班次/排班/取消/休假/发布/指标录入/核实）的成功、离线门禁、
 * 失败 set error 并 rethrow（不吞、不假成功）。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNursingAdminStore } from '@/store/nursingAdminStore';

vi.mock('@/services/api/nursingAdmin', () => ({
  getScheduleBoard: vi.fn(),
  upsertShift: vi.fn(),
  assignShift: vi.fn(),
  removeAssignment: vi.fn(),
  createLeave: vi.fn(),
  publishSchedule: vi.fn(),
  getIndicatorLibrary: vi.fn(),
  submitIndicatorEntry: vi.fn(),
  verifyIndicatorEntry: vi.fn(),
}));
vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));

import * as api from '@/services/api/nursingAdmin';
import { getSystemHealth } from '@/services/api/care';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

beforeEach(() => {
  vi.clearAllMocks();
  useNursingAdminStore.setState({
    dbUp: null,
    health: null,
    loadingHealth: false,
    board: null,
    library: null,
    loadingBoard: false,
    loadingLibrary: false,
    acting: false,
    error: null,
  });
});

describe('M16B_TEST 健康门禁', () => {
  it('探活成功（db=up）→ dbUp=true', async () => {
    healthMock.mockResolvedValue({ status: 'ok', demoMode: false, db: 'up' });
    const up = await useNursingAdminStore.getState().checkHealth();
    expect(up).toBe(true);
    expect(useNursingAdminStore.getState().dbUp).toBe(true);
  });

  it('探活成功（db=skipped）→ dbUp=true', async () => {
    healthMock.mockResolvedValue({ status: 'ok', demoMode: true, db: 'skipped' });
    const up = await useNursingAdminStore.getState().checkHealth();
    expect(up).toBe(true);
  });

  it('探活抛错 → dbUp=false、error 记录、不抛', async () => {
    healthMock.mockRejectedValue(new Error('网络错误'));
    const up = await useNursingAdminStore.getState().checkHealth();
    expect(up).toBe(false);
    expect(useNursingAdminStore.getState().dbUp).toBe(false);
    expect(useNursingAdminStore.getState().error).toBe('网络错误');
  });
});

describe('M16B_TEST 看板与指标库加载', () => {
  it('loadBoard 成功 → board 落库', async () => {
    m.getScheduleBoard.mockResolvedValue({ wardCode: 'NW1' });
    await useNursingAdminStore.getState().loadBoard('NW1', '2026-10-12');
    expect(useNursingAdminStore.getState().board).toEqual({ wardCode: 'NW1' });
    expect(useNursingAdminStore.getState().loadingBoard).toBe(false);
  });

  it('loadBoard 失败 → error 记录、不抛', async () => {
    m.getScheduleBoard.mockRejectedValue(new Error('看板加载失败'));
    await useNursingAdminStore.getState().loadBoard('NW1', '2026-10-12');
    expect(useNursingAdminStore.getState().error).toBe('看板加载失败');
    expect(useNursingAdminStore.getState().loadingBoard).toBe(false);
  });

  it('loadLibrary 成功 → library 落库', async () => {
    m.getIndicatorLibrary.mockResolvedValue({ indicators: [] });
    await useNursingAdminStore.getState().loadLibrary();
    expect(useNursingAdminStore.getState().library).toEqual({ indicators: [] });
  });

  it('loadLibrary 失败 → error 记录、不抛', async () => {
    m.getIndicatorLibrary.mockRejectedValue(new Error('指标库加载失败'));
    await useNursingAdminStore.getState().loadLibrary();
    expect(useNursingAdminStore.getState().error).toBe('指标库加载失败');
  });
});

describe('M16B_TEST 写 action 离线门禁（dbUp!=true 一律拒绝）', () => {
  const s = useNursingAdminStore;
  it('离线时 upsertShift 抛错', async () => {
    await expect(s.getState().upsertShift({ name: '早班' })).rejects.toThrow('禁止写操作');
  });
  it('离线时 assignShift 抛错', async () => {
    await expect(s.getState().assignShift({ nurseId: 'n1' })).rejects.toThrow('禁止写操作');
  });
  it('离线时 removeAssignment 抛错', async () => {
    await expect(s.getState().removeAssignment('as1')).rejects.toThrow('禁止写操作');
  });
  it('离线时 createLeave 抛错', async () => {
    await expect(
      s.getState().createLeave({
        wardCode: 'NW1',
        nurseId: 'n1',
        nurseName: '护士甲',
        startDate: '2026-10-12',
        endDate: '2026-10-13',
        type: 'annual',
      }),
    ).rejects.toThrow('禁止写操作');
  });
  it('离线时 publish 抛错', async () => {
    await expect(s.getState().publish('NW1', '2026-10-12')).rejects.toThrow('禁止写操作');
  });
  it('离线时 submitEntry 抛错', async () => {
    await expect(
      s.getState().submitEntry({
        indicatorCode: 'N001',
        period: '2026-09',
        numerator: 1,
        denominator: 10,
      }),
    ).rejects.toThrow('禁止写操作');
  });
  it('离线时 verifyEntry 抛错', async () => {
    await expect(s.getState().verifyEntry('e1')).rejects.toThrow('禁止写操作');
  });
});

describe('M16B_TEST 写 action 在线成功', () => {
  beforeEach(() => {
    useNursingAdminStore.setState({ dbUp: true });
  });
  const s = useNursingAdminStore;

  it('upsertShift 成功', async () => {
    m.upsertShift.mockResolvedValue({ id: 's1' });
    const r = await s.getState().upsertShift({ name: '早班' });
    expect(r).toEqual({ id: 's1' });
    expect(useNursingAdminStore.getState().acting).toBe(false);
  });

  it('assignShift 成功', async () => {
    m.assignShift.mockResolvedValue({ id: 'as1' });
    const r = await s.getState().assignShift({ nurseId: 'n1' });
    expect(r).toEqual({ id: 'as1' });
  });

  it('removeAssignment 成功', async () => {
    m.removeAssignment.mockResolvedValue(undefined);
    await s.getState().removeAssignment('as1');
    expect(m.removeAssignment).toHaveBeenCalledWith('as1');
  });

  it('createLeave 成功', async () => {
    m.createLeave.mockResolvedValue({ id: 'lv1' });
    const payload = {
      wardCode: 'NW1',
      nurseId: 'n1',
      nurseName: '护士甲',
      startDate: '2026-10-12',
      endDate: '2026-10-13',
      type: 'annual' as const,
    };
    const r = await s.getState().createLeave(payload);
    expect(r).toEqual({ id: 'lv1' });
  });

  it('publish 成功', async () => {
    m.publishSchedule.mockResolvedValue({ id: 'pb1' });
    const r = await s.getState().publish('NW1', '2026-10-12', '备注');
    expect(r).toEqual({ id: 'pb1' });
    expect(m.publishSchedule).toHaveBeenCalledWith({
      wardCode: 'NW1',
      period: '2026-10-12',
      note: '备注',
    });
  });

  it('submitEntry 成功', async () => {
    m.submitIndicatorEntry.mockResolvedValue({ id: 'e2' });
    const payload = {
      indicatorCode: 'N001',
      period: '2026-09',
      numerator: 2,
      denominator: 100,
    };
    const r = await s.getState().submitEntry(payload);
    expect(r).toEqual({ id: 'e2' });
    expect(m.submitIndicatorEntry).toHaveBeenCalledWith(payload);
  });

  it('verifyEntry 成功', async () => {
    m.verifyIndicatorEntry.mockResolvedValue({ id: 'e1', status: 'verified' });
    const r = await s.getState().verifyEntry('e1');
    expect(r).toEqual({ id: 'e1', status: 'verified' });
    expect(m.verifyIndicatorEntry).toHaveBeenCalledWith('e1');
  });
});

describe('M16B_TEST 写 action 在线失败 → error 记录并 rethrow', () => {
  beforeEach(() => {
    useNursingAdminStore.setState({ dbUp: true });
  });
  const s = useNursingAdminStore;

  it('upsertShift 失败', async () => {
    m.upsertShift.mockRejectedValue(new Error('班次编码冲突'));
    await expect(s.getState().upsertShift({ name: '早班' })).rejects.toThrow('班次编码冲突');
    expect(useNursingAdminStore.getState().error).toBe('班次编码冲突');
    expect(useNursingAdminStore.getState().acting).toBe(false);
  });

  it('assignShift 失败', async () => {
    m.assignShift.mockRejectedValue(new Error('排班失败'));
    await expect(s.getState().assignShift({ nurseId: 'n1' })).rejects.toThrow('排班失败');
  });

  it('removeAssignment 失败', async () => {
    m.removeAssignment.mockRejectedValue(new Error('取消排班失败'));
    await expect(s.getState().removeAssignment('as1')).rejects.toThrow('取消排班失败');
  });

  it('createLeave 失败', async () => {
    m.createLeave.mockRejectedValue(new Error('休假日期冲突'));
    await expect(
      s.getState().createLeave({
        wardCode: 'NW1',
        nurseId: 'n1',
        nurseName: '护士甲',
        startDate: '2026-10-12',
        endDate: '2026-10-13',
        type: 'annual',
      }),
    ).rejects.toThrow('休假日期冲突');
  });

  it('publish 失败', async () => {
    m.publishSchedule.mockRejectedValue(new Error('本周已发布'));
    await expect(s.getState().publish('NW1', '2026-10-12')).rejects.toThrow('本周已发布');
  });

  it('submitEntry 失败', async () => {
    m.submitIndicatorEntry.mockRejectedValue(new Error('指标录入失败'));
    await expect(
      s.getState().submitEntry({
        indicatorCode: 'N001',
        period: '2026-09',
        numerator: 1,
        denominator: 10,
      }),
    ).rejects.toThrow('指标录入失败');
  });

  it('verifyEntry 失败', async () => {
    m.verifyIndicatorEntry.mockRejectedValue(new Error('指标核实/上报失败'));
    await expect(s.getState().verifyEntry('e1')).rejects.toThrow('指标核实/上报失败');
  });
});
