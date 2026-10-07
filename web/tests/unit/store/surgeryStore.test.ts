/**
 * 健澜科技 jlmedaios - 手术麻醉 store 测试（M9-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 覆盖：健康门禁 / 列表加载 / 详情加载 / 全生命周期动作（排班→三方核对→诱导→
 * 术中事件→阶段推进→PACU 评分→双签→离室→取消）/ 失败路径。
 * 真实落库由后端集成测试与 HTTP 取证覆盖。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSurgeryStore, SURGERY_STATUS_META } from '@/store/surgeryStore';
import type { SurgeryRequest } from '@/types/surgery';

vi.mock('@/services/api/pharmacy', () => ({
  getSystemHealth: vi.fn(async () => ({ status: 'healthy', db: 'up' })),
}));

vi.mock('@/services/api/surgery', async () => {
  // 夹具定义在工厂内部（vi.mock 被 hoist，禁止引用外部顶层变量）
  const base = (): SurgeryRequest => ({
    id: 's1',
    requestNo: 'SUR001',
    visitId: 'v1',
    patientId: 'p1',
    surgeryType: 'elective',
    plannedProcedure: '腹腔镜胆囊切除术',
    diagnosis: '胆囊结石伴胆囊炎',
    plannedDate: '2026-10-10',
    department: '普外科',
    surgeonId: null,
    anesthetistId: null,
    anesthesiaMethod: null,
    status: 'requested',
    precheck: {},
    surgeonSignedAt: null,
    anesthetistSignedAt: null,
    createdAt: '2026-10-01T08:00:00.000Z',
  });
  const detailOfInner = (r: SurgeryRequest) => ({ req: r, events: [] });
  let list: SurgeryRequest[] = [base()];
  const detailMap = new Map<string, { req: SurgeryRequest; events: Array<{ id: string; eventType: string; occurredAt: string; payload: Record<string, unknown> }> }>();
  return {
    submitSurgery: vi.fn(async (input: Record<string, unknown>) => {
      const r: SurgeryRequest = {
        ...base(),
        id: `s${list.length + 1}`,
        requestNo: String(input.requestNo),
        visitId: String(input.visitId),
        patientId: String(input.patientId),
        plannedProcedure: String(input.plannedProcedure),
        surgeryType: String(input.surgeryType) as 'elective',
      };
      list = [...list, r];
      detailMap.set(r.id, detailOfInner(r));
      return r;
    }),
    listSurgeries: vi.fn(async () => list),
    getSurgery: vi.fn(async (id: string) => detailMap.get(id) ?? detailOfInner(list.find((r) => r.id === id) ?? base())),
    scheduleSurgery: vi.fn(async (id: string, body: Record<string, unknown>) => {
      const r = list.find((x) => x.id === id) ?? base();
      const next: SurgeryRequest = {
        ...r, status: 'scheduled',
        surgeonId: (body.surgeonId as string | null) ?? null,
        anesthetistId: (body.anesthetistId as string | null) ?? null,
        anesthesiaMethod: (body.anesthesiaMethod as string | null) ?? null,
        plannedDate: (body.plannedDate as string | null) ?? null,
      };
      list = list.map((x) => (x.id === id ? next : x));
      detailMap.set(id, detailOfInner(next));
      return next;
    }),
    precheckSurgery: vi.fn(async (id: string, precheck: Record<string, unknown>) => {
      const r = list.find((x) => x.id === id) ?? base();
      const next: SurgeryRequest = { ...r, status: 'prechecked', precheck };
      list = list.map((x) => (x.id === id ? next : x));
      detailMap.set(id, detailOfInner(next));
      return next;
    }),
    inductionSurgery: vi.fn(async (id: string) => {
      const r = list.find((x) => x.id === id) ?? base();
      const next: SurgeryRequest = { ...r, status: 'induction' };
      list = list.map((x) => (x.id === id ? next : x));
      detailMap.set(id, detailOfInner(next));
      return next;
    }),
    stageSurgery: vi.fn(async (id: string, to: 'maintenance' | 'recovery' | 'pacu') => {
      const r = list.find((x) => x.id === id) ?? base();
      const next: SurgeryRequest = { ...r, status: to };
      list = list.map((x) => (x.id === id ? next : x));
      detailMap.set(id, detailOfInner(next));
      return next;
    }),
    eventSurgery: vi.fn(async (id: string, eventType: string) => {
      const r = list.find((x) => x.id === id) ?? base();
      const d = detailMap.get(id) ?? detailOfInner(r);
      detailMap.set(id, { req: d.req, events: [...d.events, { id: 'e1', eventType, occurredAt: new Date().toISOString(), payload: {} }] });
      return d.req;
    }),
    pacuAssess: vi.fn(async (id: string, aldrete: number) => {
      const r = list.find((x) => x.id === id) ?? base();
      const can = aldrete >= 9 && r.surgeonSignedAt != null && r.anesthetistSignedAt != null;
      return { req: r, canDischarge: can };
    }),
    signSurgery: vi.fn(async (id: string, role: 'surgeon' | 'anesthetist') => {
      const r = list.find((x) => x.id === id) ?? base();
      const next: SurgeryRequest = role === 'surgeon'
        ? { ...r, surgeonSignedAt: new Date().toISOString() }
        : { ...r, anesthetistSignedAt: new Date().toISOString() };
      list = list.map((x) => (x.id === id ? next : x));
      detailMap.set(id, detailOfInner(next));
      return next;
    }),
    dischargeSurgery: vi.fn(async (id: string) => {
      const r = list.find((x) => x.id === id) ?? base();
      const next: SurgeryRequest = { ...r, status: 'discharged' };
      list = list.map((x) => (x.id === id ? next : x));
      detailMap.set(id, detailOfInner(next));
      return next;
    }),
    cancelSurgery: vi.fn(async (id: string) => {
      const r = list.find((x) => x.id === id) ?? base();
      const next: SurgeryRequest = { ...r, status: 'cancelled' };
      list = list.map((x) => (x.id === id ? next : x));
      detailMap.set(id, detailOfInner(next));
      return next;
    }),
  };
});

function resetStore() {
  useSurgeryStore.setState({
    list: [],
    detail: null,
    error: null,
    loading: false,
    dbUp: false,
    healthChecking: false,
  });
}

beforeEach(resetStore);

describe('状态机元数据', () => {
  it('覆盖全部 9 个状态', () => {
    expect(Object.keys(SURGERY_STATUS_META)).toHaveLength(9);
    expect(SURGERY_STATUS_META.discharged.label).toBe('已离室');
    expect(SURGERY_STATUS_META.cancelled.step).toBe(-1);
  });
});

describe('健康门禁与列表', () => {
  it('checkHealth 置 dbUp 并返回 true', async () => {
    const ok = await useSurgeryStore.getState().checkHealth();
    expect(ok).toBe(true);
    expect(useSurgeryStore.getState().dbUp).toBe(true);
  });

  it('load 加载列表并切换 loading', async () => {
    const p = useSurgeryStore.getState().load();
    expect(useSurgeryStore.getState().loading).toBe(true);
    await p;
    expect(useSurgeryStore.getState().list.length).toBeGreaterThanOrEqual(1);
    expect(useSurgeryStore.getState().loading).toBe(false);
  });

  it('checkHealth 失败时 dbUp=false 且返回 false', async () => {
    const { getSystemHealth } = await import('@/services/api/pharmacy');
    vi.mocked(getSystemHealth).mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const ok = await useSurgeryStore.getState().checkHealth();
    expect(ok).toBe(false);
    expect(useSurgeryStore.getState().dbUp).toBe(false);
    expect(useSurgeryStore.getState().error).toContain('ECONNREFUSED');
  });
});

describe('全生命周期动作', () => {
  it('submit 提交申请并刷新列表', async () => {
    const r = await useSurgeryStore.getState().submit({
      requestNo: 'SURX1', visitId: 'v9', patientId: 'p9', surgeryType: 'elective',
      plannedProcedure: '阑尾切除术', department: '普外科',
    });
    expect(r.requestNo).toBe('SURX1');
    expect(useSurgeryStore.getState().list.some((x) => x.requestNo === 'SURX1')).toBe(true);
  });

  it('loadDetail 加载详情', async () => {
    await useSurgeryStore.getState().load();
    const id = useSurgeryStore.getState().list[0].id;
    await useSurgeryStore.getState().loadDetail(id);
    expect(useSurgeryStore.getState().detail?.req.id).toBe(id);
  });

  it('schedule 排程后 status=scheduled', async () => {
    const r = await useSurgeryStore.getState().schedule('s1', { surgeonId: 'u1', anesthesiaMethod: '全身麻醉' });
    expect(r.status).toBe('scheduled');
    expect(useSurgeryStore.getState().detail?.req.status).toBe('scheduled');
  });

  it('precheck 三方核对后 status=prechecked 且保存核对项', async () => {
    await useSurgeryStore.getState().precheck('s1', { patient: true, procedure: true, anesthesiaMethod: true, surgeon: true, antibiotic: true, skinTest: true });
    const r = useSurgeryStore.getState().detail?.req;
    expect(r?.status).toBe('prechecked');
    expect((r?.precheck as Record<string, unknown>).patient).toBe(true);
  });

  it('induction 麻醉诱导后 status=induction', async () => {
    await useSurgeryStore.getState().induction('s1', '丙泊酚 120mg 静注');
    expect(useSurgeryStore.getState().detail?.req.status).toBe('induction');
  });

  it('event 记录术中事件并追加时间线', async () => {
    await useSurgeryStore.getState().event('s1', '血压波动', { note: 'SBP 90mmHg' });
    expect(useSurgeryStore.getState().detail?.events.length).toBe(1);
    expect(useSurgeryStore.getState().detail?.events[0].eventType).toBe('血压波动');
  });

  it('stage 推进到 maintenance/recovery/pacu', async () => {
    await useSurgeryStore.getState().stage('s1', 'maintenance');
    expect(useSurgeryStore.getState().detail?.req.status).toBe('maintenance');
    await useSurgeryStore.getState().stage('s1', 'recovery');
    expect(useSurgeryStore.getState().detail?.req.status).toBe('recovery');
    await useSurgeryStore.getState().stage('s1', 'pacu');
    expect(useSurgeryStore.getState().detail?.req.status).toBe('pacu');
  });

  it('pacu 评分返回 canDischarge 标志（双签未齐时 false）', async () => {
    const r = await useSurgeryStore.getState().pacu('s1', 10);
    expect(r.canDischarge).toBe(false);
  });

  it('sign 双签后 canDischarge 变 true', async () => {
    await useSurgeryStore.getState().sign('s1', 'surgeon');
    await useSurgeryStore.getState().sign('s1', 'anesthetist');
    const r = await useSurgeryStore.getState().pacu('s1', 10);
    expect(r.canDischarge).toBe(true);
    expect(useSurgeryStore.getState().detail?.req.surgeonSignedAt).not.toBeNull();
    expect(useSurgeryStore.getState().detail?.req.anesthetistSignedAt).not.toBeNull();
  });

  it('discharge 离室后 status=discharged', async () => {
    await useSurgeryStore.getState().discharge('s1');
    expect(useSurgeryStore.getState().detail?.req.status).toBe('discharged');
  });

  it('cancel 取消后 status=cancelled', async () => {
    await useSurgeryStore.getState().cancel('s1', '患者暂缓手术');
    expect(useSurgeryStore.getState().detail?.req.status).toBe('cancelled');
  });

  it('失败路径：submit 抛错并置 error', async () => {
    const { submitSurgery } = await import('@/services/api/surgery');
    vi.mocked(submitSurgery).mockRejectedValueOnce(new Error('术式不能为空'));
    await expect(useSurgeryStore.getState().submit({ requestNo: 'X', visitId: 'v', patientId: 'p', surgeryType: 'elective', plannedProcedure: '' })).rejects.toThrow();
    expect(useSurgeryStore.getState().error).toContain('术式不能为空');
  });
});
