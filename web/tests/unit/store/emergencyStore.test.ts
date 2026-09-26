/**
 * 健澜科技 jlmedaios - 急诊核心事务状态管理测试（M1-B1）
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * emergencyStore 测试：健康探活（BFF/DB 不可用显式报错 ready=false）、
 * 队列 / 统计 / 通道类型 / 绿色通道 / 抢救 / 留观读模型加载与失败，
 * 以及接诊、分诊、通道、抢救、留观、转归写操作成功后自动刷新对应读模型。
 * 通过 vi.mock 隔离 BFF，真实落库由后端集成测试与 E2E 覆盖。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useEmergencyStore } from '@/store/emergencyStore';
import type {
  ChannelTypeDto,
  EmergencyHealth,
  EmergencyQueueItem,
  EmergencyStatsDto,
  GreenChannelDto,
  ObservationDto,
  ResuscitationDto,
} from '@/types/emergency';

vi.mock('@/services/api/emergency', () => ({
  getSystemHealth: vi.fn(),
  getQueue: vi.fn(),
  getStats: vi.fn(),
  getChannelTypes: vi.fn(),
  createArrival: vi.fn(),
  submitTriage: vi.fn(),
  fetchAiAdvice: vi.fn(),
  listGreenChannels: vi.fn(),
  startGreenChannel: vi.fn(),
  recordGreenChannelNode: vi.fn(),
  closeGreenChannel: vi.fn(),
  listResuscitations: vi.fn(),
  startResuscitation: vi.fn(),
  addResusEvent: vi.fn(),
  addResusMedication: vi.fn(),
  completeResuscitation: vi.fn(),
  listObservations: vi.fn(),
  startObservation: vi.fn(),
  updateObservation: vi.fn(),
  endObservation: vi.fn(),
  recordDisposition: vi.fn(),
}));

import * as api from '@/services/api/emergency';

/* ------------------------------ 夹具 ------------------------------ */

const health: EmergencyHealth = {
  status: 'ok',
  version: '0.3.0',
  demoMode: false,
  db: 'up',
};

const queueItem: EmergencyQueueItem = {
  visitId: 'v1',
  patientId: 'p1',
  triageNo: 'FN305',
  patientName: '急*诊',
  gender: '男',
  age: '63岁',
  chiefComplaint: '持续胸痛',
  arriveTime: '2026-09-26T01:00:00.000Z',
  triageTime: '2026-09-26T01:03:00.000Z',
  level: 1,
  levelLabel: 'Ⅰ级（濒危）',
  emStatus: 'triaged',
  greenChannelActive: false,
  vitals: { systolic: 85 },
  newsScore: 7,
  gcsTotal: 15,
  waitMinutes: 3,
  deadline: '2026-09-26T01:00:00.000Z',
  remainingMinutes: -3,
  overdue: true,
};

const stats: EmergencyStatsDto = {
  activeCount: 5,
  waitingCount: 2,
  resusCount: 1,
  obsCount: 3,
  greenChannelCount: 2,
  levelCounts: { 1: 1, 2: 2, 3: 3, 4: 1 },
  dispositionCounts: { admitted: 2, discharged: 3 },
};

const channelType: ChannelTypeDto = {
  type: 'chest_pain',
  name: '胸痛绿色通道',
  subtypes: ['STEMI', 'NSTEMI'],
};

const greenChannel: GreenChannelDto = {
  id: 'gc1',
  channelNo: 'GC501',
  visitId: 'v1',
  patientId: 'p1',
  type: 'chest_pain',
  subtype: 'STEMI',
  status: 'active',
  arriveTime: '2026-09-26T01:00:00.000Z',
  activateTime: '2026-09-26T01:01:00.000Z',
  endTime: null,
  notifiedTeams: ['心血管内科', '导管室'],
  dbnMinutes: null,
  dctMinutes: null,
  dntMinutes: null,
  outcome: null,
  qualityNote: null,
  nodes: [
    {
      id: 'n1',
      channelId: 'gc1',
      nodeKey: 'arrive',
      label: '到达急诊',
      targetMinutes: 0,
      actualTime: '2026-09-26T01:00:00.000Z',
      sortOrder: 0,
      overdue: false,
    },
  ],
  createdAt: '2026-09-26T01:00:00.000Z',
  updatedAt: '2026-09-26T01:01:00.000Z',
};

const resuscitation: ResuscitationDto = {
  id: 'rs1',
  resusNo: 'RS701',
  visitId: 'v2',
  patientId: 'p2',
  bedNo: 'ER-RS-02',
  bedId: null,
  startTime: '2026-09-26T02:00:00.000Z',
  endTime: null,
  diagnosis: '急性呼吸衰竭',
  leadDoctorId: 'd1',
  leadNurseId: null,
  status: 'resuscitating',
  events: [
    { time: '2026-09-26T02:01:00.000Z', type: 'vitals', content: 'SpO2 88%' },
  ],
  vitalTrend: [
    { time: '2026-09-26T02:01:00.000Z', pulse: 118, systolic: 96, spo2: 88 },
  ],
  medications: [
    { name: '肾上腺素', dose: '1mg', route: 'IV', time: '2026-09-26T02:02:00.000Z' },
  ],
  team: ['李医生'],
  outcome: null,
  summary: null,
  createdAt: '2026-09-26T02:00:00.000Z',
  updatedAt: '2026-09-26T02:00:00.000Z',
};

const observation: ObservationDto = {
  id: 'ob1',
  obsNo: 'OB901',
  visitId: 'v3',
  patientId: 'p3',
  bedNo: 'ER-OB-03',
  startTime: '2026-09-26T03:00:00.000Z',
  endTime: null,
  diagnosis: '呼吸困难待查',
  nursingLevel: 'level1',
  vitals: { spo2: 95 },
  ivStatus: '已停吸氧',
  pendingTasks: [
    { id: 't1', content: '30分钟复测血氧', done: false },
  ],
  status: 'observing',
  expectedOutcome: '血氧稳定后离院',
  createdAt: '2026-09-26T03:00:00.000Z',
  updatedAt: '2026-09-26T03:00:00.000Z',
};

const arrivalResult = {
  triage: {
    id: 'tr1',
    triageNo: 'FN306',
    visitId: 'v9',
    patientId: 'p9',
    triageNurseId: null,
    arriveTime: '2026-09-26T04:00:00.000Z',
    triageTime: null,
    chiefComplaint: '新发胸痛',
    vitals: {},
    gcsEye: null,
    gcsVerbal: null,
    gcsMotor: null,
    gcsTotal: null,
    newsScore: null,
    strokeScale: {},
    level: null,
    ruleSuggestedLevel: null,
    aiSuggestedLevel: null,
    aiAdvice: {},
    vitalScore: null,
    complaintScore: null,
    totalScore: null,
    basis: null,
    confirmed: false,
    greenChannelActive: false,
    emStatus: 'waiting_triage' as const,
    createdAt: '2026-09-26T04:00:00.000Z',
    updatedAt: '2026-09-26T04:00:00.000Z',
  },
};

const triageResult = {
  triage: { ...arrivalResult.triage, emStatus: 'triaged' as const, level: 1, triageTime: '2026-09-26T04:02:00.000Z' },
  assessment: {
    news: { score: 7, risk: 'high' as const, breakdown: { spo2: 3 } },
    gcs: { total: 15, eye: 4, verbal: 5, motor: 6 },
    fast: { face: false, arm: false, speech: false, positive: false },
    lams: { total: 0, lvoLikelihood: 'low' as const },
    rule: { level: 1 as const, objectiveReasons: ['低血压'] },
    vitalScore: 60,
    complaintScore: 20,
    totalScore: 80,
  },
};

const initialState = useEmergencyStore.getState();

beforeEach(() => {
  useEmergencyStore.setState({ ...initialState });
  vi.mocked(api.getSystemHealth).mockResolvedValue(health);
  vi.mocked(api.getQueue).mockResolvedValue([queueItem]);
  vi.mocked(api.getStats).mockResolvedValue(stats);
  vi.mocked(api.getChannelTypes).mockResolvedValue([channelType]);
  vi.mocked(api.listGreenChannels).mockResolvedValue({ items: [greenChannel] });
  vi.mocked(api.listResuscitations).mockResolvedValue({ items: [resuscitation] });
  vi.mocked(api.listObservations).mockResolvedValue({ items: [observation] });
  vi.mocked(api.createArrival).mockResolvedValue(arrivalResult);
  vi.mocked(api.submitTriage).mockResolvedValue(triageResult);
  vi.mocked(api.startGreenChannel).mockResolvedValue({ channel: greenChannel });
  vi.mocked(api.recordGreenChannelNode).mockResolvedValue({ channel: greenChannel });
  vi.mocked(api.closeGreenChannel).mockResolvedValue({
    channel: { ...greenChannel, status: 'completed' as const, dbnMinutes: 75, endTime: '2026-09-26T01:00:00.000Z' },
  });
  vi.mocked(api.startResuscitation).mockResolvedValue({ resuscitation });
  vi.mocked(api.addResusEvent).mockResolvedValue({ resuscitation });
  vi.mocked(api.addResusMedication).mockResolvedValue({ resuscitation });
  vi.mocked(api.completeResuscitation).mockResolvedValue({
    resuscitation: { ...resuscitation, status: 'stabilized' as const, endTime: '2026-09-26T02:30:00.000Z' },
  });
  vi.mocked(api.startObservation).mockResolvedValue({ observation });
  vi.mocked(api.updateObservation).mockResolvedValue({
    observation: { ...observation, vitals: { spo2: 95 } },
  });
  vi.mocked(api.endObservation).mockResolvedValue({
    observation: { ...observation, status: 'discharged' as const, endTime: '2026-09-26T03:30:00.000Z' },
  });
  vi.mocked(api.recordDisposition).mockResolvedValue({ disposition: {} as never });
});

/* ---------------------------- 初始状态 ---------------------------- */

describe('emergencyStore 初始状态', () => {
  it('数据字段为空态、ready 为探测中', () => {
    const s = useEmergencyStore.getState();
    expect(s.ready).toBeNull();
    expect(s.health).toBeNull();
    expect(s.queue).toEqual([]);
    expect(s.stats).toBeNull();
    expect(s.channelTypes).toEqual([]);
    expect(s.greenChannels).toEqual([]);
    expect(s.resuscitations).toEqual([]);
    expect(s.observations).toEqual([]);
    expect(s.error).toBeNull();
    expect(s.acting).toBe(false);
  });
});

/* ---------------------------- 健康探活 ---------------------------- */

describe('emergencyStore 健康探活', () => {
  it('db=up → ready=true 并记录 health', async () => {
    await useEmergencyStore.getState().checkHealth();
    const s = useEmergencyStore.getState();
    expect(s.ready).toBe(true);
    expect(s.health?.db).toBe('up');
    expect(s.loadingHealth).toBe(false);
  });

  it('db=skipped（演示模式）→ ready=true', async () => {
    vi.mocked(api.getSystemHealth).mockResolvedValueOnce({ ...health, db: 'skipped' });
    await useEmergencyStore.getState().checkHealth();
    expect(useEmergencyStore.getState().ready).toBe(true);
  });

  it('BFF/数据库不可用 → ready=false 且显式报错，不造假成功', async () => {
    vi.mocked(api.getSystemHealth).mockRejectedValueOnce(new Error('网络错误'));
    await useEmergencyStore.getState().checkHealth();
    const s = useEmergencyStore.getState();
    expect(s.ready).toBe(false);
    expect(s.error).toBe('网络错误');
  });

  it('探活抛出非 Error 对象 → 使用兜底报错文案', async () => {
    vi.mocked(api.getSystemHealth).mockRejectedValueOnce('string-error');
    await useEmergencyStore.getState().checkHealth();
    expect(useEmergencyStore.getState().error).toBe('BFF 或数据库不可用');
  });
});

/* ---------------------------- 读模型 ---------------------------- */

describe('emergencyStore 读模型加载', () => {
  it('fetchQueue 成功填充队列', async () => {
    await useEmergencyStore.getState().fetchQueue();
    const s = useEmergencyStore.getState();
    expect(s.queue).toHaveLength(1);
    expect(s.queue[0].triageNo).toBe('FN305');
    expect(s.loadingQueue).toBe(false);
  });

  it('fetchQueue 失败设置错误', async () => {
    vi.mocked(api.getQueue).mockRejectedValueOnce(new Error('队列加载失败'));
    await useEmergencyStore.getState().fetchQueue();
    expect(useEmergencyStore.getState().error).toBe('队列加载失败');
  });

  it('fetchStats 成功填充统计', async () => {
    await useEmergencyStore.getState().fetchStats();
    expect(useEmergencyStore.getState().stats?.resusCount).toBe(1);
  });

  it('fetchStats 失败设置错误', async () => {
    vi.mocked(api.getStats).mockRejectedValueOnce(new Error('统计失败'));
    await useEmergencyStore.getState().fetchStats();
    expect(useEmergencyStore.getState().error).toBe('统计失败');
  });

  it('fetchChannelTypes 成功填充元数据', async () => {
    await useEmergencyStore.getState().fetchChannelTypes();
    expect(useEmergencyStore.getState().channelTypes[0].type).toBe('chest_pain');
  });

  it('fetchChannelTypes 失败被静默（不阻断主流程、不写 error）', async () => {
    vi.mocked(api.getChannelTypes).mockRejectedValueOnce(new Error('x'));
    await useEmergencyStore.getState().fetchChannelTypes();
    expect(useEmergencyStore.getState().error).toBeNull();
  });

  it('fetchGreenChannels 成功填充列表', async () => {
    await useEmergencyStore.getState().fetchGreenChannels();
    const s = useEmergencyStore.getState();
    expect(s.greenChannels).toHaveLength(1);
    expect(s.loadingGc).toBe(false);
  });

  it('fetchGreenChannels 失败设置错误', async () => {
    vi.mocked(api.listGreenChannels).mockRejectedValueOnce(new Error('gc失败'));
    await useEmergencyStore.getState().fetchGreenChannels();
    expect(useEmergencyStore.getState().error).toBe('gc失败');
  });

  it('fetchResuscitations 成功填充列表', async () => {
    await useEmergencyStore.getState().fetchResuscitations();
    expect(useEmergencyStore.getState().resuscitations[0].status).toBe('resuscitating');
  });

  it('fetchResuscitations 失败设置错误', async () => {
    vi.mocked(api.listResuscitations).mockRejectedValueOnce(new Error('rs失败'));
    await useEmergencyStore.getState().fetchResuscitations();
    expect(useEmergencyStore.getState().error).toBe('rs失败');
  });

  it('fetchObservations 成功填充列表', async () => {
    await useEmergencyStore.getState().fetchObservations();
    expect(useEmergencyStore.getState().observations[0].status).toBe('observing');
  });

  it('fetchObservations 失败设置错误', async () => {
    vi.mocked(api.listObservations).mockRejectedValueOnce(new Error('ob失败'));
    await useEmergencyStore.getState().fetchObservations();
    expect(useEmergencyStore.getState().error).toBe('ob失败');
  });

  it('refreshAll 并行刷新全部读模型', async () => {
    await useEmergencyStore.getState().refreshAll();
    const s = useEmergencyStore.getState();
    expect(s.queue).toHaveLength(1);
    expect(s.stats).not.toBeNull();
    expect(s.greenChannels).toHaveLength(1);
    expect(s.resuscitations).toHaveLength(1);
    expect(s.observations).toHaveLength(1);
  });
});

/* ----------------------- 接诊 / 分诊 / AI ----------------------- */

describe('emergencyStore 接诊分诊', () => {
  it('createArrival 调用服务、返回结果并刷新队列与统计', async () => {
    const payload = { newPatient: { nameMasked: '测*试', gender: '男' as const }, chiefComplaint: '胸痛' };
    const r = await useEmergencyStore.getState().createArrival(payload);
    expect(vi.mocked(api.createArrival)).toHaveBeenCalledWith(payload);
    expect(r.triage.visitId).toBe('v9');
    expect(vi.mocked(api.getQueue)).toHaveBeenCalled();
    expect(vi.mocked(api.getStats)).toHaveBeenCalled();
    expect(useEmergencyStore.getState().acting).toBe(false);
  });

  it('submitTriage 调用服务、返回分级结果并刷新', async () => {
    const payload = { vitals: { systolic: 85 }, level: 1 as const };
    const r = await useEmergencyStore.getState().submitTriage('v9', payload);
    expect(vi.mocked(api.submitTriage)).toHaveBeenCalledWith('v9', payload);
    expect(r.triage.level).toBe(1);
  });

  it('fetchAiAdvice 直接委托服务层', async () => {
    const payload = { vitals: {} };
    vi.mocked(api.fetchAiAdvice).mockResolvedValueOnce({
      source: 'rule_fallback',
      suggestedLevel: 2,
      advice: { immediate: 'a', workup: 'b', differential: 'c', risk: 'd' },
    });
    const r = await useEmergencyStore.getState().fetchAiAdvice('v9', payload);
    expect(vi.mocked(api.fetchAiAdvice)).toHaveBeenCalledWith('v9', payload);
    expect(r.source).toBe('rule_fallback');
  });
});

/* ---------------------------- 绿色通道 ---------------------------- */

describe('emergencyStore 绿色通道', () => {
  it('startGreenChannel 以 {type,subtype} 调用服务并刷新，返回通道', async () => {
    const r = await useEmergencyStore.getState().startGreenChannel('v1', 'chest_pain', 'STEMI');
    expect(vi.mocked(api.startGreenChannel)).toHaveBeenCalledWith('v1', {
      type: 'chest_pain',
      subtype: 'STEMI',
    });
    expect(r.id).toBe('gc1');
  });

  it('recordNode 调用服务并刷新通道列表，返回通道', async () => {
    const t = '2026-09-26T01:08:00.000Z';
    const r = await useEmergencyStore.getState().recordNode('gc1', 'ecg', t);
    expect(vi.mocked(api.recordGreenChannelNode)).toHaveBeenCalledWith('gc1', 'ecg', t);
    expect(r.id).toBe('gc1');
  });

  it('closeGreenChannel 以 {outcome,qualityNote} 调用服务并刷新，返回 completed 通道', async () => {
    const r = await useEmergencyStore.getState().closeGreenChannel('gc1', '已行PCI', 'note');
    expect(vi.mocked(api.closeGreenChannel)).toHaveBeenCalledWith('gc1', {
      outcome: '已行PCI',
      qualityNote: 'note',
    });
    expect(r.status).toBe('completed');
    expect(r.dbnMinutes).toBe(75);
  });
});

/* ---------------------------- 抢救 ---------------------------- */

describe('emergencyStore 抢救', () => {
  it('startResuscitation 以 {bedNo,diagnosis} 调用服务并刷新，返回记录', async () => {
    const r = await useEmergencyStore.getState().startResuscitation('v2', 'ER-RS-02', '急性呼衰');
    expect(vi.mocked(api.startResuscitation)).toHaveBeenCalledWith('v2', {
      bedNo: 'ER-RS-02',
      diagnosis: '急性呼衰',
    });
    expect(r.status).toBe('resuscitating');
  });

  it('addResusEvent 调用服务并刷新，返回记录', async () => {
    const ev = { time: '2026-09-26T02:01:00.000Z', type: 'vitals', content: 'SpO2 88%' };
    await useEmergencyStore.getState().addResusEvent('rs1', ev);
    expect(vi.mocked(api.addResusEvent)).toHaveBeenCalledWith('rs1', ev);
  });

  it('addResusMedication 调用服务并刷新，返回记录', async () => {
    const med = { name: '肾上腺素', dose: '1mg', route: 'IV', time: '2026-09-26T02:02:00.000Z' };
    await useEmergencyStore.getState().addResusMedication('rs1', med);
    expect(vi.mocked(api.addResusMedication)).toHaveBeenCalledWith('rs1', med);
  });

  it('completeResuscitation 以 body 调用服务并刷新队列/抢救/统计，返回 stabilized', async () => {
    const body = { status: 'stabilized' as const, outcome: '趋稳' };
    const r = await useEmergencyStore.getState().completeResuscitation('rs1', body);
    expect(vi.mocked(api.completeResuscitation)).toHaveBeenCalledWith('rs1', body);
    expect(r.status).toBe('stabilized');
    expect(vi.mocked(api.getStats)).toHaveBeenCalled();
  });
});

/* ---------------------------- 留观 ---------------------------- */

describe('emergencyStore 留观', () => {
  it('startObservation 以 body 调用服务并刷新，返回记录', async () => {
    const body = { bedNo: 'ER-OB-03', nursingLevel: 'level1' };
    const r = await useEmergencyStore.getState().startObservation('v3', body);
    expect(vi.mocked(api.startObservation)).toHaveBeenCalledWith('v3', body);
    expect(r.status).toBe('observing');
  });

  it('updateObservation 以 patch 调用服务并刷新，返回更新后记录', async () => {
    const patch = { vitals: { spo2: 95 }, ivStatus: '已停吸氧' };
    const r = await useEmergencyStore.getState().updateObservation('ob1', patch);
    expect(vi.mocked(api.updateObservation)).toHaveBeenCalledWith('ob1', patch);
    expect(r.vitals.spo2).toBe(95);
  });

  it('endObservation 以状态调用服务并刷新队列/留观/统计，返回 discharged', async () => {
    const r = await useEmergencyStore.getState().endObservation('ob1', 'discharged');
    expect(vi.mocked(api.endObservation)).toHaveBeenCalledWith('ob1', 'discharged');
    expect(r.status).toBe('discharged');
  });
});

/* ---------------------------- 转归 ---------------------------- */

describe('emergencyStore 转归', () => {
  it('recordDisposition 调用服务并刷新队列与统计', async () => {
    const body = { disposition: 'admitted' as const, destination: 'CCU' };
    await useEmergencyStore.getState().recordDisposition('v1', body);
    expect(vi.mocked(api.recordDisposition)).toHaveBeenCalledWith('v1', body);
    expect(vi.mocked(api.getQueue)).toHaveBeenCalled();
    expect(vi.mocked(api.getStats)).toHaveBeenCalled();
    expect(useEmergencyStore.getState().acting).toBe(false);
  });
});
