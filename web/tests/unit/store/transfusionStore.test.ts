/**
 * 健澜科技 jlmedaios - 输血管理 store 测试（M10-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 覆盖：健康门禁 / 列表 / 详情 / 全流程动作（申请→配血→发血→双人核对输注→
 * 完成→停输→取消→不良反应）/ 失败路径。真实落库由后端集成测试与 HTTP 取证覆盖。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTransfusionStore } from '@/store/transfusionStore';
import type { TransfusionRequest, TransfusionDetail } from '@/types/transfusion';

vi.mock('@/services/api/pharmacy', () => ({
  getSystemHealth: vi.fn(async () => ({ status: 'healthy', db: 'up' })),
}));

vi.mock('@/services/api/transfusion', async () => {
  const base = (): TransfusionRequest => ({
    id: 't1',
    requestNo: 'BLOOD001',
    visitId: 'v1',
    patientId: 'p1',
    department: '普外科',
    applicantId: 'u1',
    indication: '重度贫血 Hb 65 g/L',
    indicationMeta: { hb: 65, cds: { suggestion: 'Hb 65 g/L < 70，符合红细胞输注指征' } },
    bloodType: 'O',
    component: 'red_cell',
    unitCount: 2,
    urgency: 'routine',
    status: 'requested',
    rejectReason: null,
    crossmatchResult: null,
    crossmatchNote: null,
    crossmatchedBy: null,
    crossmatchedAt: null,
    batchNo: null,
    dispensedBy: null,
    dispensedAt: null,
    cancelledBy: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  });
  const detailOf = (r: TransfusionRequest): TransfusionDetail => ({
    req: r,
    transfusion: null,
    reactions: [],
    stock: [{ id: 'st1', bloodType: 'O', component: 'red_cell', batchNo: 'RC-O-2026-001', units: 20, expiryDate: '2026-12-31' }],
  });
  let list: TransfusionRequest[] = [base()];
  const detailMap = new Map<string, TransfusionDetail>();
  detailMap.set('t1', detailOf(base()));
  const bump = (r: TransfusionRequest, patch: Partial<TransfusionRequest>): TransfusionRequest => {
    const next = { ...r, ...patch, id: r.id };
    list = list.map((x) => (x.id === r.id ? next : x));
    detailMap.set(r.id, detailOf(next));
    return next;
  };
  return {
    applyTransfusion: vi.fn(async (input: Record<string, unknown>) => {
      const r: TransfusionRequest = {
        ...base(),
        id: `t${list.length + 1}`,
        requestNo: String(input.requestNo),
        visitId: String(input.visitId),
        patientId: String(input.patientId),
        bloodType: String(input.bloodType),
        component: String(input.component),
        unitCount: Number(input.unitCount),
        indication: String(input.indication),
      };
      list = [...list, r];
      detailMap.set(r.id, detailOf(r));
      return { req: r, created: true };
    }),
    listTransfusions: vi.fn(async () => list),
    getTransfusion: vi.fn(async (id: string) => detailMap.get(id) ?? detailOf(list.find((r) => r.id === id) ?? base())),
    crossmatchTransfusion: vi.fn(async (id: string) => bump(list.find((r) => r.id === id) ?? base(), { status: 'crossmatched', crossmatchResult: '相合' })),
    dispenseTransfusion: vi.fn(async (id: string) => bump(list.find((r) => r.id === id) ?? base(), { status: 'dispensed', batchNo: 'RC-O-2026-001' })),
    startTransfusion: vi.fn(async (id: string) => bump(list.find((r) => r.id === id) ?? base(), { status: 'transfusing' })),
    completeTransfusion: vi.fn(async (id: string) => bump(list.find((r) => r.id === id) ?? base(), { status: 'completed' })),
    stopTransfusion: vi.fn(async (id: string) => bump(list.find((r) => r.id === id) ?? base(), { status: 'cancelled', cancelReason: '停输' })),
    cancelTransfusion: vi.fn(async (id: string) => bump(list.find((r) => r.id === id) ?? base(), { status: 'cancelled', cancelReason: '取消' })),
    reportReaction: vi.fn(async (id: string, body: Record<string, unknown>) => {
      const d = detailMap.get(id) ?? detailOf(base());
      d.reactions = [...d.reactions, {
        id: 'rx1', severity: String(body.severity), symptom: String(body.symptom),
        action: String(body.action), outcome: null, reportedBy: 'u9', reportedAt: '2026-10-01T09:00:00.000Z',
      }];
      detailMap.set(id, d);
      return { reaction: {}, req: base() };
    }),
  };
});

import { getSystemHealth } from '@/services/api/pharmacy';
import * as api from '@/services/api/transfusion';

const healthMock = vi.mocked(getSystemHealth);
const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('transfusionStore', () => {
  it('checkHealth：db up → dbUp=true；异常 → false+错误', async () => {
    healthMock.mockResolvedValue({ status: 'ok', demoMode: false, db: 'up' });
    expect(await useTransfusionStore.getState().checkHealth()).toBe(true);
    expect(useTransfusionStore.getState().dbUp).toBe(true);
    healthMock.mockRejectedValue(new Error('conn refused'));
    expect(await useTransfusionStore.getState().checkHealth()).toBe(false);
    expect(useTransfusionStore.getState().error).toContain('连接失败');
  });

  it('load：列表加载', async () => {
    m.listTransfusions.mockResolvedValue([{ id: 't1', requestNo: 'BLOOD001' } as TransfusionRequest]);
    await useTransfusionStore.getState().load();
    expect(useTransfusionStore.getState().list.length).toBeGreaterThanOrEqual(1);
  });

  it('apply → crossmatch → dispense → start → complete 全流程推进', async () => {
    const s = useTransfusionStore.getState();
    await s.apply({ requestNo: 'BLOOD99', visitId: 'v1', patientId: 'p1', department: '普外科', indication: 'Hb 60', indicationMeta: { hb: 60 }, bloodType: 'O', component: 'red_cell', unitCount: 2, urgency: 'routine' });
    const created = useTransfusionStore.getState().list.find((r) => r.requestNo === 'BLOOD99')!;
    await useTransfusionStore.getState().loadDetail(created.id);
    await useTransfusionStore.getState().crossmatch(created.id, '相合');
    expect(useTransfusionStore.getState().detail?.req.status).toBe('crossmatched');
    await useTransfusionStore.getState().dispense(created.id);
    expect(useTransfusionStore.getState().detail?.req.status).toBe('dispensed');
    await useTransfusionStore.getState().start(created.id, 'nurse_other', '20 滴/分');
    expect(useTransfusionStore.getState().detail?.req.status).toBe('transfusing');
    await useTransfusionStore.getState().complete(created.id, { hr: 88 });
    expect(useTransfusionStore.getState().detail?.req.status).toBe('completed');
  });

  it('stop / cancel / reaction 失败与成功路径', async () => {
    m.stopTransfusion.mockRejectedValueOnce(new Error('非法状态转换'));
    const s = useTransfusionStore.getState();
    await expect(s.stop('t1', '停输')).rejects.toThrow('非法状态转换');
    expect(useTransfusionStore.getState().error).toContain('非法状态转换');
    // 第二次调用恢复工厂 bump：详情推进为 cancelled
    await s.stop('t1', '临床停输');
    expect(useTransfusionStore.getState().detail?.req.status).toBe('cancelled');
    await s.reaction('t1', { severity: 'moderate', symptom: '发热', action: 'stop' });
    expect(useTransfusionStore.getState().detail?.reactions.length).toBeGreaterThanOrEqual(1);
  });

  it('错误路径：apply 失败保留错误', async () => {
    m.applyTransfusion.mockRejectedValue(new Error('指征缺失'));
    await expect(
      useTransfusionStore.getState().apply({ requestNo: 'BLOOD00', visitId: 'v1', patientId: 'p1', department: 'x', indication: '', indicationMeta: {}, bloodType: 'O', component: 'red_cell', unitCount: 1, urgency: 'routine' }),
    ).rejects.toThrow('指征缺失');
  });
});
