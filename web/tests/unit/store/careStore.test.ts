/**
 * 健澜科技 jlmedaios - 在院诊疗 careStore 单元测试（M1-B2）
 *
 * mock 掉 services/api/care，验证 Zustand store 的：
 *  - 健康探活门禁（成功/skip/失败）；
 *  - 选择就诊后并行加载查房/护理记录/护理任务/医嘱；
 *  - 写操作必须在 ready=true 且已选患者时进行，成功后刷新对应读模型；
 *  - 错误分支（未就绪、未选患者、列表失败）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({
  getSystemHealth: vi.fn(),
  listRounds: vi.fn(),
  createRound: vi.fn(),
  signRound: vi.fn(),
  countersignRound: vi.fn(),
  returnRound: vi.fn(),
  listNursingRecords: vi.fn(),
  createNursingRecord: vi.fn(),
  signNursingRecord: vi.fn(),
  listNursingTasks: vi.fn(),
  createNursingTask: vi.fn(),
  executeNursingTask: vi.fn(),
  getOrderView: vi.fn(),
  createOrder: vi.fn(),
  reviewOrder: vi.fn(),
  rejectOrder: vi.fn(),
  administerOrder: vi.fn(),
  stopOrder: vi.fn(),
}));

import * as api from '@/services/api/care';
import { useCareStore } from '@/store/careStore';
import type {
  InpatientOrderView,
  NursingRecordDto,
  NursingTaskDto,
  OrderDto,
  WardRoundDto,
} from '@/types/care';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

const health = (db: 'up' | 'down' | 'skipped' = 'up') => ({
  status: 'ok',
  version: '0.3.0',
  demoMode: false,
  db,
});

const round = (over: Partial<WardRoundDto> = {}): WardRoundDto => ({
  id: 'r1',
  visitId: 'v1',
  patientId: 'p1',
  roundNo: 'R-0001',
  roundType: 'routine',
  isSuperior: false,
  roundAt: '2026-09-27T08:00:00Z',
  symptomChange: null,
  physicalExam: {},
  assessment: '病情平稳',
  diagnosis: null,
  planAdjustment: null,
  aiAssisted: false,
  aiSuggestion: {},
  status: 'draft',
  authorId: 'doc',
  signedBy: null,
  signedAt: null,
  countersignedBy: null,
  countersignedAt: null,
  returnReason: null,
  version: 1,
  createdAt: '',
  updatedAt: '',
  ...over,
});

const record = (over: Partial<NursingRecordDto> = {}): NursingRecordDto => ({
  id: 'n1',
  visitId: 'v1',
  patientId: 'p1',
  recordNo: 'NR-0001',
  recordedAt: '2026-09-27T08:00:00Z',
  shift: 'day',
  nursingLevel: 'level2',
  vitals: {},
  intake: {},
  output: {},
  measures: null,
  pressureSoreRisk: 'low',
  fallRisk: 'low',
  riskAssessment: {},
  aiAssisted: false,
  status: 'draft',
  nurseId: 'nurse',
  signedBy: null,
  signedAt: null,
  createdAt: '',
  updatedAt: '',
  ...over,
});

const task = (over: Partial<NursingTaskDto> = {}): NursingTaskDto => ({
  id: 't1',
  visitId: 'v1',
  patientId: 'p1',
  taskNo: 'NT-0001',
  taskType: 'vitals',
  content: '测血压',
  scheduledAt: '',
  status: 'pending',
  idempotencyKey: 'k1',
  result: null,
  executedBy: null,
  executedAt: null,
  createdAt: '',
  updatedAt: '',
  ...over,
});

const order = (over: Partial<OrderDto> = {}): OrderDto => ({
  id: 'o1',
  visitId: 'v1',
  orderNo: 'O-0001',
  orderType: 'drug',
  content: '长期医嘱',
  detail: {},
  priority: 'routine',
  status: 'pending_review',
  category: 'long_term',
  doctorId: 'doc',
  reviewerId: null,
  reviewedAt: null,
  rejectReason: null,
  requiresDoubleCheck: false,
  startAt: null,
  stopAt: null,
  createdAt: '',
  updatedAt: '',
  ...over,
});

const orderView: InpatientOrderView = {
  visitId: 'v1',
  longTerm: [{ ...order(), administrations: [] }],
  shortTerm: [],
};

function resetStore(): void {
  useCareStore.setState({
    ready: null,
    health: null,
    selectedVisitId: null,
    rounds: [],
    nursingRecords: [],
    nursingTasks: [],
    orderView: null,
    loadingHealth: false,
    loadingRounds: false,
    loadingRecords: false,
    loadingTasks: false,
    loadingOrders: false,
    acting: false,
    error: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetStore();
});

describe('careStore 健康探活', () => {
  it('探活成功且 db=up → ready=true，写入 health', async () => {
    m.getSystemHealth.mockResolvedValue(health('up'));
    await useCareStore.getState().checkHealth();
    const s = useCareStore.getState();
    expect(s.ready).toBe(true);
    expect(s.health?.db).toBe('up');
    expect(s.error).toBeNull();
  });

  it('db=skipped 也视为就绪', async () => {
    m.getSystemHealth.mockResolvedValue(health('skipped'));
    await useCareStore.getState().checkHealth();
    expect(useCareStore.getState().ready).toBe(true);
  });

  it('探活抛错 → ready=false 并记录错误', async () => {
    m.getSystemHealth.mockRejectedValue(new Error('网络错误'));
    await useCareStore.getState().checkHealth();
    const s = useCareStore.getState();
    expect(s.ready).toBe(false);
    expect(s.error).toBe('网络错误');
  });
});

describe('careStore 选择就诊与加载', () => {
  it('selectVisit(null) 清空全部读模型', async () => {
    useCareStore.setState({
      selectedVisitId: 'v1',
      rounds: [round()],
      nursingRecords: [record()],
      nursingTasks: [task()],
      orderView,
    });
    await useCareStore.getState().selectVisit(null);
    const s = useCareStore.getState();
    expect(s.selectedVisitId).toBeNull();
    expect(s.rounds).toEqual([]);
    expect(s.nursingRecords).toEqual([]);
    expect(s.nursingTasks).toEqual([]);
    expect(s.orderView).toBeNull();
  });

  it('selectVisit(id) 并行加载四类数据并写入 state', async () => {
    m.listRounds.mockResolvedValue([round()]);
    m.listNursingRecords.mockResolvedValue([record()]);
    m.listNursingTasks.mockResolvedValue([task()]);
    m.getOrderView.mockResolvedValue(orderView);
    await useCareStore.getState().selectVisit('v1');
    const s = useCareStore.getState();
    expect(s.selectedVisitId).toBe('v1');
    expect(m.listRounds).toHaveBeenCalledWith('v1');
    expect(m.listNursingRecords).toHaveBeenCalledWith('v1');
    expect(m.listNursingTasks).toHaveBeenCalledWith('v1');
    expect(m.getOrderView).toHaveBeenCalledWith('v1');
    expect(s.rounds).toHaveLength(1);
    expect(s.nursingRecords).toHaveLength(1);
    expect(s.nursingTasks).toHaveLength(1);
    expect(s.orderView?.visitId).toBe('v1');
  });

  it('fetchRounds 未选患者 → 抛错', async () => {
    await expect(useCareStore.getState().fetchRounds()).rejects.toThrow('请先选择在院患者');
  });

  it('列表加载失败 → 记录 error 但不抛出', async () => {
    useCareStore.setState({ selectedVisitId: 'v1' });
    m.listRounds.mockRejectedValue(new Error('查房加载失败'));
    m.listNursingRecords.mockResolvedValue([]);
    m.listNursingTasks.mockResolvedValue([]);
    m.getOrderView.mockResolvedValue(orderView);
    await useCareStore.getState().fetchRounds('v1');
    expect(useCareStore.getState().error).toBe('查房加载失败');
  });
});

describe('careStore 查房写操作', () => {
  beforeEach(() => {
    useCareStore.setState({ ready: true, selectedVisitId: 'v1' });
  });

  it('未就绪时 createRound 抛错且不调用 api', async () => {
    useCareStore.setState({ ready: false, error: '离线' });
    await expect(
      useCareStore.getState().createRound({ visitId: 'v1', assessment: 'x' }),
    ).rejects.toThrow('离线');
    expect(m.createRound).not.toHaveBeenCalled();
  });

  it('createRound 成功后刷新查房列表并返回结果', async () => {
    m.createRound.mockResolvedValue(round());
    m.listRounds.mockResolvedValue([round()]);
    const r = await useCareStore.getState().createRound({
      visitId: 'v1',
      assessment: '病情平稳',
    });
    expect(m.createRound).toHaveBeenCalledWith({ visitId: 'v1', assessment: '病情平稳' });
    expect(r.id).toBe('r1');
    expect(m.listRounds).toHaveBeenCalled();
    expect(useCareStore.getState().rounds).toHaveLength(1);
  });

  it('signRound / countersignRound / returnRound 调用 api 并刷新', async () => {
    m.signRound.mockResolvedValue(round({ status: 'signed', signedBy: 'doc' }));
    m.listRounds.mockResolvedValue([round({ status: 'signed' })]);
    const signed = await useCareStore.getState().signRound('r1');
    expect(m.signRound).toHaveBeenCalledWith('r1');
    expect(signed.status).toBe('signed');

    m.countersignRound.mockResolvedValue(round({ status: 'countersigned' }));
    const cs = await useCareStore.getState().countersignRound('r1');
    expect(m.countersignRound).toHaveBeenCalledWith('r1');
    expect(cs.status).toBe('countersigned');

    m.returnRound.mockResolvedValue(round({ status: 'returned', returnReason: '补充' }));
    const rt = await useCareStore.getState().returnRound('r1', '补充');
    expect(m.returnRound).toHaveBeenCalledWith('r1', '补充');
    expect(rt.status).toBe('returned');
  });
});

describe('careStore 护理写操作', () => {
  beforeEach(() => {
    useCareStore.setState({ ready: true, selectedVisitId: 'v1' });
  });

  it('createNursingRecord / signNursingRecord 调用 api 并刷新', async () => {
    m.createNursingRecord.mockResolvedValue(record());
    m.listNursingRecords.mockResolvedValue([record()]);
    const r = await useCareStore.getState().createNursingRecord({
      visitId: 'v1',
      nursingLevel: 'level2',
    });
    expect(m.createNursingRecord).toHaveBeenCalledWith({
      visitId: 'v1',
      nursingLevel: 'level2',
    });
    expect(r.id).toBe('n1');
    expect(m.listNursingRecords).toHaveBeenCalled();

    m.signNursingRecord.mockResolvedValue(record({ status: 'signed' }));
    const signed = await useCareStore.getState().signNursingRecord('n1');
    expect(m.signNursingRecord).toHaveBeenCalledWith('n1');
    expect(signed.status).toBe('signed');
  });

  it('createNursingTask / executeNursingTask 调用 api 并刷新任务', async () => {
    m.createNursingTask.mockResolvedValue(task());
    m.listNursingTasks.mockResolvedValue([task()]);
    const t = await useCareStore.getState().createNursingTask({
      visitId: 'v1',
      content: '测血压',
      idempotencyKey: 'k1',
    });
    expect(m.createNursingTask).toHaveBeenCalledWith({
      visitId: 'v1',
      content: '测血压',
      idempotencyKey: 'k1',
    });
    expect(t.id).toBe('t1');

    const done = task({ status: 'done', result: '120/80', executedBy: 'nurse' });
    m.executeNursingTask.mockResolvedValue({ task: done, deduplicated: false });
    m.listNursingTasks.mockResolvedValue([done]);
    const r = await useCareStore.getState().executeNursingTask('t1', '120/80');
    expect(m.executeNursingTask).toHaveBeenCalledWith('t1', '120/80');
    expect(r.deduplicated).toBe(false);
    expect(r.task.status).toBe('done');
  });
});

describe('careStore 医嘱写操作', () => {
  beforeEach(() => {
    useCareStore.setState({ ready: true, selectedVisitId: 'v1' });
  });

  it('createOrder / reviewOrder / rejectOrder 调用 api 并刷新医嘱', async () => {
    m.createOrder.mockResolvedValue(order());
    m.getOrderView.mockResolvedValue(orderView);
    const o = await useCareStore.getState().createOrder({
      visitId: 'v1',
      orderType: 'drug',
      content: '长期医嘱',
    });
    expect(m.createOrder).toHaveBeenCalledWith({
      visitId: 'v1',
      orderType: 'drug',
      content: '长期医嘱',
    });
    expect(o.id).toBe('o1');

    m.reviewOrder.mockResolvedValue(order({ status: 'active', reviewerId: 'doc' }));
    const active = await useCareStore.getState().reviewOrder('o1');
    expect(m.reviewOrder).toHaveBeenCalledWith('o1');
    expect(active.status).toBe('active');

    m.rejectOrder.mockResolvedValue(order({ status: 'rejected', rejectReason: '调整' }));
    const rejected = await useCareStore.getState().rejectOrder('o1', '调整');
    expect(m.rejectOrder).toHaveBeenCalledWith('o1', '调整');
    expect(rejected.status).toBe('rejected');
  });

  it('administerOrder 返回 order 并刷新；stopOrder 调用 api', async () => {
    const activeOrder = order({ status: 'active' });
    m.administerOrder.mockResolvedValue({
      order: activeOrder,
      administration: { id: 'a1' },
      deduplicated: false,
    });
    m.getOrderView.mockResolvedValue({
      visitId: 'v1',
      longTerm: [{ ...activeOrder, administrations: [{ id: 'a1' }] }],
      shortTerm: [],
    });
    const r = await useCareStore.getState().administerOrder('o1', { slot: '08:00' });
    expect(m.administerOrder).toHaveBeenCalledWith('o1', { slot: '08:00' });
    expect(r.status).toBe('active');

    m.stopOrder.mockResolvedValue(order({ status: 'stopped' }));
    const stopped = await useCareStore.getState().stopOrder('o1');
    expect(m.stopOrder).toHaveBeenCalledWith('o1');
    expect(stopped.status).toBe('stopped');
  });
});
