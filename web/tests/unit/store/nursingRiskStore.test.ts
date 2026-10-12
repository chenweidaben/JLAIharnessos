/**
 * 健澜科技 jlmedaios - 压疮/跌倒风险预警 Zustand store 单测（M17-A）
 *
 * mock 掉 services/api/nursingRisk 与 services/api/care，验证：
 *  - 健康探活门禁（up/skipped/down）；
 *  - 看板/列表/指标/详情加载与错误落 error；
 *  - 写操作在 dbUp!=true 时拒绝（requireReady），成功后 rethrow 不吞。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({
  getSystemHealth: vi.fn(),
}));

vi.mock('@/services/api/nursingRisk', () => ({
  getHighRiskBoard: vi.fn(),
  listAssessments: vi.fn(),
  listEvents: vi.fn(),
  getRiskMetrics: vi.fn(),
  getVisitDetail: vi.fn(),
  assessRisk: vi.fn(),
  acceptPrevention: vi.fn(),
  executePrevention: vi.fn(),
  cancelPrevention: vi.fn(),
  recordEvent: vi.fn(),
}));

import * as careApi from '@/services/api/care';
import * as riskApi from '@/services/api/nursingRisk';
import { useNursingRiskStore } from '@/store/nursingRiskStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const risk = riskApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

const health = (db: 'up' | 'down' | 'skipped' = 'up') => ({ status: 'ok', version: '0.3.0', demoMode: false, db });

beforeEach(() => {
  vi.clearAllMocks();
  useNursingRiskStore.setState({
    dbUp: null, health: null, board: [], assessments: [], preventions: [], events: [],
    metrics: null, detail: null, loadingBoard: false, acting: false, error: null,
  });
});

describe('M17-A store 健康门禁', () => {
  it('db=up => dbUp=true', async () => {
    care.getSystemHealth.mockResolvedValue(health('up'));
    const up = await useNursingRiskStore.getState().checkHealth();
    expect(up).toBe(true);
    expect(useNursingRiskStore.getState().dbUp).toBe(true);
  });
  it('db=skipped 视为可用', async () => {
    care.getSystemHealth.mockResolvedValue(health('skipped'));
    expect(await useNursingRiskStore.getState().checkHealth()).toBe(true);
  });
  it('db=down => dbUp=false 并记 error', async () => {
    care.getSystemHealth.mockResolvedValue(health('down'));
    const up = await useNursingRiskStore.getState().checkHealth();
    expect(up).toBe(false);
    expect(useNursingRiskStore.getState().dbUp).toBe(false);
  });
  it('探活异常 => dbUp=false', async () => {
    care.getSystemHealth.mockRejectedValue(new Error('ECONNREFUSED'));
    const up = await useNursingRiskStore.getState().checkHealth();
    expect(up).toBe(false);
    expect(useNursingRiskStore.getState().error).toContain('ECONNREFUSED');
  });
});

describe('M17-A store 读模型加载', () => {
  it('loadBoard 成功落 board', async () => {
    risk.getHighRiskBoard.mockResolvedValue([{ assessment: { id: 'a1' }, warning: { warning: true, reason: 'x' } }]);
    await useNursingRiskStore.getState().loadBoard();
    expect(useNursingRiskStore.getState().board).toHaveLength(1);
  });
  it('loadBoard 失败落 error 不抛', async () => {
    risk.getHighRiskBoard.mockRejectedValue(new Error('boom'));
    await expect(useNursingRiskStore.getState().loadBoard()).resolves.toBeUndefined();
    expect(useNursingRiskStore.getState().error).toContain('boom');
  });
  it('loadMetrics 成功落 metrics', async () => {
    risk.getRiskMetrics.mockResolvedValue({ totalVisits: 10, metrics: { fractions: {} } });
    await useNursingRiskStore.getState().loadMetrics('2026-01-01', '2026-12-31');
    expect(useNursingRiskStore.getState().metrics).toBeTruthy();
  });
});

describe('M17-A store 写操作门禁', () => {
  it('dbUp!=true 时 assess 拒绝写', async () => {
    useNursingRiskStore.setState({ dbUp: false });
    await expect(
      useNursingRiskStore.getState().assess({ visitId: 'v1', riskType: 'fall', items: {} }),
    ).rejects.toThrow('不可用');
    expect(risk.assessRisk).not.toHaveBeenCalled();
  });
  it('dbUp=true 时 execute 调 api 并 rethrow 失败', async () => {
    useNursingRiskStore.setState({ dbUp: true });
    risk.executePrevention.mockRejectedValueOnce(new Error('409 conflict'));
    await expect(useNursingRiskStore.getState().execute('p1', 'sig')).rejects.toThrow('409');
    expect(useNursingRiskStore.getState().error).toContain('409');
  });
  it('dbUp=true 时 recordEvent 成功透传', async () => {
    useNursingRiskStore.setState({ dbUp: true });
    risk.recordEvent.mockResolvedValue({ id: 'e1' });
    const ev = await useNursingRiskStore.getState().recordEvent({ visitId: 'v1', eventType: 'fall' });
    expect(ev.id).toBe('e1');
  });
});
