/**
 * 健澜科技 jlmedaios - 急诊核心组件测试（M1-B1）
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 覆盖：
 *  - TriageStation：待分诊队列 / 过滤切换 / 接诊新患者弹窗 / ready=false 禁用；
 *  - TriageLevel：级别卡片选择、AI 建议获取、确认分诊提交；
 *  - GreenChannel：通道卡片、启动弹窗、节点记录、关闭弹窗（质控）；
 *  - ResuscitationRoom：抢救卡片、抽屉、记事件/用药、结束抢救、启动弹窗；
 *  - Observation：留观表格、开始/更新弹窗、入院/离院；
 *  - EmergencyStats：统计卡片；
 *  - EmergencyRecord：只读档案聚合 / 空态；
 *  - DispositionModal：转归录入。
 *
 * BFF 服务与图表经 vi.mock 隔离；store 直接 setState 注入夹具，真实落库由后端
 * 集成测试与 E2E 覆盖。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App as AntdApp } from 'antd';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

import TriageStation from '@/components/emergency/TriageStation';
import TriageLevel from '@/components/emergency/TriageLevel';
import GreenChannel from '@/components/emergency/GreenChannel';
import ResuscitationRoom from '@/components/emergency/ResuscitationRoom';
import Observation from '@/components/emergency/Observation';
import EmergencyStats from '@/components/emergency/EmergencyStats';
import EmergencyRecord from '@/components/emergency/EmergencyRecord';
import DispositionModal from '@/components/emergency/DispositionModal';
import { useEmergencyStore } from '@/store/emergencyStore';
import type {
  ChannelTypeDto,
  EmergencyQueueItem,
  EmergencyStatsDto,
  GreenChannelDto,
  ObservationDto,
  ResuscitationDto,
} from '@/types/emergency';

vi.mock('@/components/charts', () => ({
  LineChart: () => <div data-testid="line-chart" />,
  PieChart: () => <div data-testid="pie-chart" />,
  BaseChart: () => <div />,
  BarChart: () => <div />,
  GaugeChart: () => <div />,
}));

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

/* 组件使用 App.useApp() 的 message/modal，统一用 antd App 包裹，避免方法缺失 */
function renderWithApp(ui: React.ReactElement) {
  return render(<AntdApp>{ui}</AntdApp>);
}

/* rc-util 的 useId 在 NODE_ENV=test 下对所有弹窗标题返回固定 'test-id'，
 * 抽屉与其中嵌套弹窗的 aria-labelledby 全部碰撞，无法按 accessible name
 * 定位嵌套弹窗。抽屉先挂载、嵌套弹窗后挂载（portal 追加到 body 末尾），
 * 等待出现 2 个 dialog 后取末位即为嵌套弹窗，再在其作用域内查询。 */
async function findNestedDialog(): Promise<HTMLElement> {
  await waitFor(() => {
    expect(screen.getAllByRole('dialog').length).toBeGreaterThanOrEqual(2);
  });
  const list = screen.getAllByRole('dialog');
  return list[list.length - 1];
}

/* ------------------------------ 夹具工厂 ------------------------------ */

let seq = 0;
function makeQueue(over: Partial<EmergencyQueueItem>): EmergencyQueueItem {
  seq += 1;
  const n = 300 + seq;
  return {
    visitId: `v${n}`,
    patientId: `p${n}`,
    triageNo: `FN${n}`,
    patientName: `急*${n}`,
    gender: '男',
    age: '60岁',
    chiefComplaint: '胸痛',
    arriveTime: '2026-09-26T01:00:00.000Z',
    triageTime: null,
    level: null,
    levelLabel: null,
    emStatus: 'waiting_triage',
    greenChannelActive: false,
    vitals: {},
    newsScore: null,
    gcsTotal: null,
    waitMinutes: 5,
    deadline: null,
    remainingMinutes: null,
    overdue: false,
    ...over,
  };
}

const waitingItem = makeQueue({ emStatus: 'waiting_triage' });
const triagedItem = makeQueue({
  emStatus: 'triaged',
  level: 1,
  levelLabel: 'Ⅰ级（濒危）',
  triageTime: '2026-09-26T01:03:00.000Z',
  newsScore: 7,
  remainingMinutes: -3,
  overdue: true,
});
const obsItem = makeQueue({ emStatus: 'observation', level: 2, levelLabel: 'Ⅱ级（危重）' });
const resusItem = makeQueue({ emStatus: 'resuscitation', level: 1, levelLabel: 'Ⅰ级（濒危）' });

const channelType: ChannelTypeDto = {
  type: 'chest_pain',
  name: '胸痛绿色通道',
  subtypes: ['STEMI', 'NSTEMI'],
};

const activeChannel: GreenChannelDto = {
  id: 'gc1',
  channelNo: 'GC501',
  visitId: triagedItem.visitId,
  patientId: triagedItem.patientId,
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
      id: 'n1', channelId: 'gc1', nodeKey: 'arrive', label: '到达急诊',
      targetMinutes: 0, actualTime: '2026-09-26T01:00:00.000Z', sortOrder: 0, overdue: false,
    },
    {
      id: 'n2', channelId: 'gc1', nodeKey: 'ecg', label: '首份心电图',
      targetMinutes: 10, actualTime: null, sortOrder: 2, overdue: false,
    },
  ],
  createdAt: '2026-09-26T01:00:00.000Z',
  updatedAt: '2026-09-26T01:01:00.000Z',
};

const resuscitation: ResuscitationDto = {
  id: 'rs1',
  resusNo: 'RS701',
  visitId: resusItem.visitId,
  patientId: resusItem.patientId,
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
  medications: [],
  team: ['李医生'],
  outcome: null,
  summary: null,
  createdAt: '2026-09-26T02:00:00.000Z',
  updatedAt: '2026-09-26T02:00:00.000Z',
};

const observation: ObservationDto = {
  id: 'ob1',
  obsNo: 'OB901',
  visitId: obsItem.visitId,
  patientId: obsItem.patientId,
  bedNo: 'ER-OB-03',
  startTime: '2026-09-26T03:00:00.000Z',
  endTime: null,
  diagnosis: '呼吸困难待查',
  nursingLevel: 'level1',
  vitals: { spo2: 95 },
  ivStatus: '已停吸氧',
  pendingTasks: [{ id: 't1', content: '30分钟复测血氧', done: false }],
  status: 'observing',
  expectedOutcome: '血氧稳定后离院',
  createdAt: '2026-09-26T03:00:00.000Z',
  updatedAt: '2026-09-26T03:00:00.000Z',
} as ObservationDto;

const statsDto: EmergencyStatsDto = {
  activeCount: 5,
  waitingCount: 2,
  resusCount: 1,
  obsCount: 3,
  greenChannelCount: 2,
  levelCounts: { 1: 1, 2: 2, 3: 3, 4: 1 },
  dispositionCounts: { admitted: 2, discharged: 3 },
};

const initialState = useEmergencyStore.getState();

beforeEach(() => {
  useEmergencyStore.setState({ ...initialState, ready: true });
  vi.mocked(api.getQueue).mockResolvedValue([waitingItem]);
  vi.mocked(api.getChannelTypes).mockResolvedValue([channelType]);
  vi.mocked(api.getStats).mockResolvedValue(statsDto);
  vi.mocked(api.listGreenChannels).mockResolvedValue({ items: [activeChannel] });
  vi.mocked(api.listResuscitations).mockResolvedValue({ items: [resuscitation] });
  vi.mocked(api.listObservations).mockResolvedValue({ items: [observation] });
  vi.mocked(api.createArrival).mockResolvedValue({
    triage: { ...waitingItem, id: 'trnew' } as never,
  });
  vi.mocked(api.submitTriage).mockResolvedValue({
    triage: { ...triagedItem } as never,
    assessment: {} as never,
  });
  vi.mocked(api.fetchAiAdvice).mockResolvedValue({
    source: 'deepseek',
    suggestedLevel: 1,
    advice: { immediate: '即刻监护', workup: '心电图', differential: '心梗', risk: '高危' },
  });
  vi.mocked(api.startGreenChannel).mockResolvedValue({ channel: activeChannel });
  vi.mocked(api.recordGreenChannelNode).mockResolvedValue({ channel: activeChannel });
  vi.mocked(api.closeGreenChannel).mockResolvedValue({
    channel: { ...activeChannel, status: 'completed', dbnMinutes: 75 },
  });
  vi.mocked(api.startResuscitation).mockResolvedValue({ resuscitation });
  vi.mocked(api.addResusEvent).mockResolvedValue({ resuscitation });
  vi.mocked(api.addResusMedication).mockResolvedValue({ resuscitation });
  vi.mocked(api.completeResuscitation).mockResolvedValue({
    resuscitation: { ...resuscitation, status: 'stabilized' },
  });
  vi.mocked(api.startObservation).mockResolvedValue({ observation });
  vi.mocked(api.updateObservation).mockResolvedValue({ observation });
  vi.mocked(api.endObservation).mockResolvedValue({
    observation: { ...observation, status: 'discharged' },
  });
  vi.mocked(api.recordDisposition).mockResolvedValue({ disposition: {} as never });
});

/* ============================ TriageStation ============================ */

describe('TriageStation 分诊台', () => {
  it('渲染待分诊患者与“开始分诊”按钮', async () => {
    renderWithApp(<TriageStation />);
    expect(await screen.findByText(waitingItem.triageNo)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /开始分诊/ })).toBeInTheDocument();
  });

  it('默认仅显示待分诊；切到“全部”显示已分诊患者', async () => {
    vi.mocked(api.getQueue).mockResolvedValue([waitingItem, triagedItem]);
    renderWithApp(<TriageStation />);
    await screen.findByText(waitingItem.triageNo);
    expect(screen.queryByText(triagedItem.triageNo)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('全部'));
    expect(await screen.findByText(triagedItem.triageNo)).toBeInTheDocument();
  });

  it('无患者时显示空状态', async () => {
    vi.mocked(api.getQueue).mockResolvedValue([]);
    renderWithApp(<TriageStation />);
    expect(await screen.findByText('暂无符合条件的患者')).toBeInTheDocument();
  });

  it('接诊新患者弹窗：填写后提交调用 createArrival', async () => {
    renderWithApp(<TriageStation />);
    fireEvent.click(await screen.findByRole('button', { name: /接诊新患者/ }));

    const name = await screen.findByPlaceholderText('如：张*国');
    fireEvent.change(name, { target: { value: '测*试' } });
    const chief = screen.getByPlaceholderText('如：胸痛、呼吸困难、外伤');
    fireEvent.change(chief, { target: { value: '胸痛' } });

    fireEvent.click(screen.getByRole('button', { name: '确认接诊' }));
    await waitFor(() => expect(api.createArrival).toHaveBeenCalled());
    const payload = vi.mocked(api.createArrival).mock.calls[0][0];
    expect(payload.newPatient?.nameMasked).toBe('测*试');
  });

  it('ready=false 时“接诊新患者”禁用', async () => {
    useEmergencyStore.setState({ ready: false });
    renderWithApp(<TriageStation />);
    const btn = await screen.findByRole('button', { name: /接诊新患者/ });
    expect(btn).toBeDisabled();
  });
});

/* ============================= TriageLevel ============================= */

describe('TriageLevel 四级分诊', () => {
  it('渲染患者信息条', async () => {
    renderWithApp(<TriageLevel item={triagedItem} />);
    expect(await screen.findByText(triagedItem.triageNo)).toBeInTheDocument();
  });

  it('获取 AI 分级建议后展示建议内容', async () => {
    renderWithApp(<TriageLevel item={triagedItem} />);
    fireEvent.click(await screen.findByRole('button', { name: /获取 AI 分级建议/ }));
    expect(await screen.findByText('即刻监护')).toBeInTheDocument();
    expect(screen.getByText('DeepSeek')).toBeInTheDocument();
  });

  it('AI 不可用回落规则引擎时标注来源', async () => {
    vi.mocked(api.fetchAiAdvice).mockResolvedValueOnce({
      source: 'rule_fallback',
      suggestedLevel: 2,
      advice: { immediate: 'a', workup: 'b', differential: 'c', risk: 'd' },
    });
    renderWithApp(<TriageLevel item={triagedItem} />);
    fireEvent.click(await screen.findByRole('button', { name: /获取 AI 分级建议/ }));
    expect(await screen.findByText('规则引擎回落')).toBeInTheDocument();
  });

  it('选择级别卡片后确认分诊提交，调用 submitTriage', async () => {
    renderWithApp(<TriageLevel item={triagedItem} />);
    const radios = await screen.findAllByRole('radio');
    fireEvent.click(radios[0]); // Ⅰ级
    fireEvent.click(screen.getByRole('button', { name: /确认分诊并提交/ }));
    await waitFor(() => expect(api.submitTriage).toHaveBeenCalled());
    const payload = vi.mocked(api.submitTriage).mock.calls[0][1];
    expect(payload.level).toBe(1);
  });
});

/* ============================= GreenChannel ============================= */

describe('GreenChannel 绿色通道', () => {
  it('渲染活动通道卡片与“关闭通道”按钮', async () => {
    renderWithApp(<GreenChannel />);
    expect(await screen.findByText(activeChannel.channelNo)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '关闭通道' })).toBeInTheDocument();
  });

  it('无通道时显示空状态', async () => {
    vi.mocked(api.listGreenChannels).mockResolvedValue({ items: [] });
    renderWithApp(<GreenChannel />);
    expect(await screen.findByText('暂无绿色通道')).toBeInTheDocument();
  });

  it('启动弹窗：合格患者已预选，启动调用 startGreenChannel', async () => {
    vi.mocked(api.getQueue).mockResolvedValue([triagedItem]);
    useEmergencyStore.setState({ queue: [triagedItem] });
    renderWithApp(<GreenChannel />);
    fireEvent.click(await screen.findByRole('button', { name: /启动绿色通道/ }));
    fireEvent.click(await screen.findByRole('button', { name: '启动并通知团队' }));
    await waitFor(() => expect(api.startGreenChannel).toHaveBeenCalled());
    const args = vi.mocked(api.startGreenChannel).mock.calls[0];
    expect(args[0]).toBe(triagedItem.visitId);
    expect(args[1]).toEqual({ type: 'chest_pain', subtype: 'STEMI' });
  });

  it('节点“记录”弹窗：保存调用 recordNode', async () => {
    renderWithApp(<GreenChannel />);
    const recordBtn = await screen.findByRole('button', { name: '记录' });
    fireEvent.click(recordBtn);
    fireEvent.click(await screen.findByRole('button', { name: /保\s*存/ }));
    await waitFor(() => expect(api.recordGreenChannelNode).toHaveBeenCalled());
  });

  it('关闭弹窗：填写转归后确认调用 closeGreenChannel', async () => {
    renderWithApp(<GreenChannel />);
    fireEvent.click(await screen.findByRole('button', { name: '关闭通道' }));
    const outcome = await screen.findByPlaceholderText('如：急诊PCI成功，转CCU');
    fireEvent.change(outcome, { target: { value: '已行PCI转CCU' } });
    fireEvent.click(screen.getByRole('button', { name: '确认关闭' }));
    await waitFor(() => expect(api.closeGreenChannel).toHaveBeenCalled());
    const args = vi.mocked(api.closeGreenChannel).mock.calls[0];
    expect(args[0]).toBe('gc1');
    expect(args[1].outcome).toBe('已行PCI转CCU');
  });
});

/* =========================== ResuscitationRoom =========================== */

describe('ResuscitationRoom 抢救室', () => {
  it('渲染抢救卡片与“抢救中”计数', async () => {
    vi.mocked(api.getQueue).mockResolvedValue([resusItem]);
    renderWithApp(<ResuscitationRoom />);
    expect(await screen.findByText(resusItem.patientName)).toBeInTheDocument();
    expect(screen.getByText('ER-RS-02')).toBeInTheDocument();
  });

  it('无活动抢救时显示空状态', async () => {
    vi.mocked(api.listResuscitations).mockResolvedValue({ items: [] });
    renderWithApp(<ResuscitationRoom />);
    expect(await screen.findByText('当前无活动抢救记录')).toBeInTheDocument();
  });

  it('点击卡片打开抽屉，展示抢救团队与时间轴', async () => {
    vi.mocked(api.getQueue).mockResolvedValue([resusItem]);
    renderWithApp(<ResuscitationRoom />);
    fireEvent.click(await screen.findByText(resusItem.patientName));
    expect(await screen.findByText('抢救团队')).toBeInTheDocument();
    expect(screen.getByText('SpO2 88%')).toBeInTheDocument();
  });

  it('抽屉内“记事件”：填写后调用 addResusEvent', async () => {
    vi.mocked(api.getQueue).mockResolvedValue([resusItem]);
    renderWithApp(<ResuscitationRoom />);
    fireEvent.click(await screen.findByText(resusItem.patientName));
    fireEvent.click(await screen.findByRole('button', { name: '记事件' }));
    const dlg = await findNestedDialog();
    fireEvent.change(within(dlg).getByRole('textbox'), { target: { value: '复测血压' } });
    fireEvent.click(within(dlg).getByRole('button', { name: /确\s*定/ }));
    await waitFor(() => expect(api.addResusEvent).toHaveBeenCalled());
  });

  it('抽屉内“记用药”：填写后调用 addResusMedication', async () => {
    vi.mocked(api.getQueue).mockResolvedValue([resusItem]);
    renderWithApp(<ResuscitationRoom />);
    fireEvent.click(await screen.findByText(resusItem.patientName));
    fireEvent.click(await screen.findByRole('button', { name: '记用药' }));
    const dlg = await findNestedDialog();
    const inputs = within(dlg).getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: '肾上腺素' } });
    fireEvent.change(inputs[1], { target: { value: '1mg' } });
    fireEvent.click(within(dlg).getByRole('button', { name: /确\s*定/ }));
    await waitFor(() => expect(api.addResusMedication).toHaveBeenCalled());
  });

  it('抽屉内“结束抢救”：填写转归后调用 completeResuscitation', async () => {
    vi.mocked(api.getQueue).mockResolvedValue([resusItem]);
    renderWithApp(<ResuscitationRoom />);
    fireEvent.click(await screen.findByText(resusItem.patientName));
    fireEvent.click(await screen.findByRole('button', { name: '结束抢救' }));
    const dlg = await findNestedDialog();
    const outcome = within(dlg).getByPlaceholderText('如：ROSC，生命体征趋稳，转留观');
    fireEvent.change(outcome, { target: { value: 'ROSC趋稳' } });
    fireEvent.click(within(dlg).getByRole('button', { name: '结束并归档' }));
    await waitFor(() => expect(api.completeResuscitation).toHaveBeenCalled());
  });

  it('启动抢救弹窗：调用 startResuscitation', async () => {
    vi.mocked(api.getQueue).mockResolvedValue([triagedItem]);
    useEmergencyStore.setState({ queue: [triagedItem] });
    renderWithApp(<ResuscitationRoom />);
    fireEvent.click(await screen.findByRole('button', { name: /启动抢救/ }));
    fireEvent.click(await screen.findByRole('button', { name: '启动并召集团队' }));
    await waitFor(() => expect(api.startResuscitation).toHaveBeenCalled());
  });
});

/* ============================= Observation ============================= */

describe('Observation 留观管理', () => {
  it('渲染留观表格（床位/患者）', async () => {
    vi.mocked(api.getQueue).mockResolvedValue([obsItem]);
    renderWithApp(<Observation />);
    expect(await screen.findByText('ER-OB-03')).toBeInTheDocument();
    expect(await screen.findByText(obsItem.patientName)).toBeInTheDocument();
  });

  it('开始留观弹窗：调用 startObservation', async () => {
    vi.mocked(api.getQueue).mockResolvedValue([triagedItem]);
    useEmergencyStore.setState({ queue: [triagedItem] });
    renderWithApp(<Observation />);
    fireEvent.click(await screen.findByRole('button', { name: /开始留观/ }));
    fireEvent.click(await screen.findByRole('button', { name: '开始留观' }));
    await waitFor(() => expect(api.startObservation).toHaveBeenCalled());
  });

  it('更新留观弹窗：调用 updateObservation', async () => {
    vi.mocked(api.getQueue).mockResolvedValue([obsItem]);
    renderWithApp(<Observation />);
    fireEvent.click(await screen.findByRole('button', { name: '更新' }));
    fireEvent.click(await screen.findByRole('button', { name: /保\s*存/ }));
    await waitFor(() => expect(api.updateObservation).toHaveBeenCalled());
  });

  it('点击“入院”调用 endObservation(admitted)', async () => {
    vi.mocked(api.getQueue).mockResolvedValue([obsItem]);
    renderWithApp(<Observation />);
    fireEvent.click(await screen.findByRole('button', { name: '入院' }));
    await waitFor(() => expect(api.endObservation).toHaveBeenCalled());
    expect(vi.mocked(api.endObservation).mock.calls[0]).toEqual(['ob1', 'admitted']);
  });

  it('点击“离院”调用 endObservation(discharged)', async () => {
    vi.mocked(api.getQueue).mockResolvedValue([obsItem]);
    renderWithApp(<Observation />);
    fireEvent.click(await screen.findByRole('button', { name: '离院' }));
    await waitFor(() => expect(api.endObservation).toHaveBeenCalled());
    expect(vi.mocked(api.endObservation).mock.calls[0]).toEqual(['ob1', 'discharged']);
  });
});

/* ============================= EmergencyStats ============================= */

describe('EmergencyStats 急诊统计', () => {
  it('统计未加载时显示加载态', () => {
    useEmergencyStore.setState({ stats: null });
    renderWithApp(<EmergencyStats />);
    expect(screen.getByText('统计数据加载中…')).toBeInTheDocument();
  });

  it('加载后渲染统计卡片', async () => {
    useEmergencyStore.setState({ stats: statsDto });
    renderWithApp(<EmergencyStats />);
    expect(await screen.findByText('在院急诊')).toBeInTheDocument();
    expect(screen.getByText('留观中')).toBeInTheDocument();
  });
});

/* ============================= EmergencyRecord ============================= */

describe('EmergencyRecord 急诊档案', () => {
  it('有队列时自动选择首位并渲染档案', async () => {
    vi.mocked(api.getQueue).mockResolvedValue([triagedItem]);
    renderWithApp(<EmergencyRecord />);
    expect(await screen.findByText('急诊档案')).toBeInTheDocument();
    expect(screen.getByText(triagedItem.triageNo)).toBeInTheDocument();
  });

  it('队列为空时提示选择就诊', async () => {
    vi.mocked(api.getQueue).mockResolvedValue([]);
    renderWithApp(<EmergencyRecord />);
    expect(await screen.findByText('请选择就诊记录')).toBeInTheDocument();
  });
});

/* ============================= DispositionModal ============================= */

describe('DispositionModal 转归录入', () => {
  it('item 为空时弹窗关闭', () => {
    renderWithApp(<DispositionModal item={null} onClose={() => {}} />);
    expect(screen.queryByText('确认转归')).not.toBeInTheDocument();
  });

  it('填写转归后提交调用 recordDisposition', async () => {
    renderWithApp(<DispositionModal item={triagedItem} onClose={() => {}} />);
    const destination = await screen.findByPlaceholderText('如：CCU、心内科病房、回家');
    fireEvent.change(destination, { target: { value: 'CCU' } });
    fireEvent.click(screen.getByRole('button', { name: '确认转归' }));
    await waitFor(() => expect(api.recordDisposition).toHaveBeenCalled());
    const args = vi.mocked(api.recordDisposition).mock.calls[0];
    expect(args[0]).toBe(triagedItem.visitId);
    expect(args[1].disposition).toBe('admitted');
    expect(args[1].destination).toBe('CCU');
  });
});
