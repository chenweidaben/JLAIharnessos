/**
 * 健澜科技 jlmedaios - 在院诊疗组件测试（M1-B2）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - RoundStation 医生查房：草稿本人签名、上级查房审签入口、空态禁用；
 *  - NursingStation 护士护理：护理记录（体征/出入量/风险标签/本人签名）与护理任务（执行）；
 *  - OrderBoard 医嘱视图：长期/临时、审核驳回、执行核对、停止、执行次数；
 *  - CareWorkbench 健康门禁：在线渲染，离线显式报错 + Watermark + 交互阻断。
 *
 * BFF 经 vi.mock 隔离；store 直接 setState 注入夹具，真实落库由后端集成/E2E 覆盖。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test-utils';

import RoundStation from '@/components/care/RoundStation';
import NursingStation from '@/components/care/NursingStation';
import OrderBoard from '@/components/care/OrderBoard';
import CareWorkbench from '@/components/care/CareWorkbench';
import { useCareStore } from '@/store/careStore';
import type { CareHealth } from '@/types/care';

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

vi.mock('@/services/api/inpatient', () => ({
  getSystemHealth: vi.fn(),
  getBedMap: vi.fn(),
  getInpatients: vi.fn(),
  getInpatient: vi.fn(),
  createAdmission: vi.fn(),
  changeBed: vi.fn(),
  transfer: vi.fn(),
  discharge: vi.fn(),
  setBedStatus: vi.fn(),
}));

import * as careApi from '@/services/api/care';
import * as inpatientApi from '@/services/api/inpatient';

/* ------------------------------ 夹具 ------------------------------ */

const health: CareHealth = {
  status: 'ok',
  version: '0.4.0',
  demoMode: false,
  db: 'up',
};

const draftRound = {
  id: 'wr-draft',
  roundNo: 'WR20260927101',
  visitId: 'v1',
  patientId: 'p1',
  roundType: 'routine' as const,
  isSuperior: false,
  roundAt: '2026-09-27T08:00:00.000Z',
  symptomChange: '胸痛缓解',
  physicalExam: {},
  assessment: '病情评估内容',
  diagnosis: '急性心肌梗死',
  planAdjustment: '继续治疗',
  aiAssisted: false,
  aiSuggestion: {},
  status: 'draft' as const,
  authorId: 'doc1',
  signedBy: null,
  signedAt: null,
  countersignedBy: null,
  countersignedAt: null,
  returnReason: null,
  version: 1,
  createdAt: '2026-09-27T08:00:00.000Z',
  updatedAt: '2026-09-27T08:00:00.000Z',
};

const signedSuperior = {
  ...draftRound,
  id: 'wr-sup',
  roundNo: 'WR20260927102',
  roundType: 'superior' as const,
  isSuperior: true,
  status: 'signed' as const,
  signedBy: 'doc1',
  signedAt: '2026-09-27T08:05:00.000Z',
};

const nursingRecord = {
  id: 'nr1',
  recordNo: 'NR20260927101',
  visitId: 'v1',
  patientId: 'p1',
  recordedAt: '2026-09-27T10:00:00.000Z',
  shift: 'day' as const,
  nursingLevel: 'level1' as const,
  vitals: { temperature: 36.6, pulse: 78, respiration: 18, sbp: 122, dbp: 76, spo2: 97 },
  intake: { oral: 1200, iv: 500, total: 1700 },
  output: { urine: 1450, stool: 100, total: 1550 },
  measures: '翻身拍背、健康教育',
  pressureSoreRisk: 'low' as const,
  fallRisk: 'medium' as const,
  riskAssessment: { braden: 16, morse: 55 },
  aiAssisted: false,
  status: 'draft' as const,
  nurseId: 'nur1',
  signedBy: null,
  signedAt: null,
  createdAt: '2026-09-27T10:00:00.000Z',
  updatedAt: '2026-09-27T10:00:00.000Z',
};

const nursingTask = {
  id: 'nt1',
  taskNo: 'NT20260927101',
  visitId: 'v1',
  patientId: 'p1',
  taskType: 'vitals' as const,
  content: '30 分钟复测血压',
  scheduledAt: '2026-09-27T10:30:00.000Z',
  status: 'pending' as const,
  idempotencyKey: 'key-1',
  result: null,
  executedBy: null,
  executedAt: null,
  createdAt: '2026-09-27T10:00:00.000Z',
  updatedAt: '2026-09-27T10:00:00.000Z',
};

const pendingOrder = {
  id: 'op1',
  orderNo: 'ORD20260927101',
  visitId: 'v1',
  patientId: 'p1',
  orderType: 'drug' as const,
  content: '待审核长期药（虚构）',
  detail: { frequency: 'qd' },
  priority: 'routine' as const,
  status: 'pending_review' as const,
  category: 'long_term' as const,
  doctorId: 'doc1',
  reviewerId: null,
  reviewedAt: null,
  rejectReason: null,
  requiresDoubleCheck: false,
  startAt: '2026-09-27T07:00:00.000Z',
  stopAt: null,
  createdAt: '2026-09-27T07:00:00.000Z',
  updatedAt: '2026-09-27T07:00:00.000Z',
};

const activeOrder = {
  ...pendingOrder,
  id: 'oa1',
  orderNo: 'ORD20260927102',
  content: '那屈肝素钙注射液（高风险，双人核对）',
  status: 'active' as const,
  reviewerId: 'doc2',
  reviewedAt: '2026-09-27T07:10:00.000Z',
  requiresDoubleCheck: true,
};

const shortOrder = {
  ...activeOrder,
  id: 'os1',
  orderNo: 'ORD20260927103',
  content: '床旁心电图 1 次',
  orderType: 'imaging' as const,
  status: 'executed' as const,
  category: 'short_term' as const,
  requiresDoubleCheck: false,
};

const administration = {
  id: 'ad1',
  adminNo: 'ADM20260927101',
  orderId: 'oa1',
  visitId: 'v1',
  patientId: 'p1',
  slot: '2026-09-27T08:00',
  idempotencyKey: 'k1',
  status: 'administered' as const,
  dose: '那屈肝素钙',
  administeredBy: 'nur1',
  checkedBy: 'nur2',
  administeredAt: '2026-09-27T08:00:00.000Z',
  note: null,
  createdAt: '2026-09-27T08:00:00.000Z',
};

const orderView = {
  visitId: 'v1',
  longTerm: [
    { ...pendingOrder, administrations: [] },
    { ...activeOrder, administrations: [administration] },
  ],
  shortTerm: [{ ...shortOrder, administrations: [] }],
};

const careInitial = useCareStore.getState();

beforeEach(() => {
  useCareStore.setState({ ...careInitial });
  vi.mocked(careApi.getSystemHealth).mockResolvedValue(health);
  vi.mocked(careApi.listRounds).mockResolvedValue([draftRound, signedSuperior]);
  vi.mocked(careApi.listNursingRecords).mockResolvedValue([nursingRecord]);
  vi.mocked(careApi.listNursingTasks).mockResolvedValue([nursingTask]);
  vi.mocked(careApi.getOrderView).mockResolvedValue(orderView);
  vi.mocked(careApi.signRound).mockResolvedValue({ ...draftRound, status: 'signed' as const });
  vi.mocked(careApi.countersignRound).mockResolvedValue({ ...signedSuperior, status: 'countersigned' as const });
  vi.mocked(careApi.signNursingRecord).mockResolvedValue({ ...nursingRecord, status: 'signed' as const });
  vi.mocked(careApi.reviewOrder).mockResolvedValue({ ...pendingOrder, status: 'active' as const } as never);
  vi.mocked(careApi.rejectOrder).mockResolvedValue({ ...pendingOrder, status: 'rejected' as const } as never);
  vi.mocked(careApi.administerOrder).mockResolvedValue({ order: { ...activeOrder } } as never);
  vi.mocked(careApi.stopOrder).mockResolvedValue({ ...activeOrder, status: 'stopped' as const } as never);
  vi.mocked(careApi.executeNursingTask).mockResolvedValue({ task: nursingTask, deduplicated: false } as never);
  vi.mocked(careApi.createRound).mockResolvedValue({ ...draftRound, id: 'wr-new' } as never);
  vi.mocked(careApi.returnRound).mockResolvedValue({
    ...signedSuperior,
    status: 'returned' as const,
    returnReason: '查体记录不完整',
  } as never);
  vi.mocked(careApi.createNursingRecord).mockResolvedValue({ ...nursingRecord, id: 'nr-new' } as never);
  vi.mocked(careApi.createNursingTask).mockResolvedValue({ ...nursingTask, id: 'nt-new' } as never);
  vi.mocked(careApi.createOrder).mockResolvedValue({ ...pendingOrder, id: 'op-new' } as never);
  vi.mocked(inpatientApi.getInpatients).mockResolvedValue({
    items: [
      {
        visitId: 'v1',
        nameMasked: '王*',
        bedNo: '0501-1',
        diagnosis: '急性心肌梗死',
      },
    ],
    total: 1,
  } as never);
});

/* --------------------------- RoundStation --------------------------- */

describe('RoundStation 医生查房', () => {
  it('未选患者时新建查房按钮禁用', () => {
    render(<RoundStation />);
    expect(screen.getByRole('button', { name: /新建查房/ })).toBeDisabled();
  });

  it('渲染查房编号与状态，草稿可本人签名', async () => {
    useCareStore.setState({
      ready: true,
      selectedVisitId: 'v1',
      rounds: [draftRound, signedSuperior],
    });
    render(<RoundStation />);
    expect(await screen.findByText('WR20260927101')).toBeInTheDocument();
    const signButton = await screen.findByRole('button', { name: /本人签名/ });
    fireEvent.click(signButton);
    await waitFor(() => expect(careApi.signRound).toHaveBeenCalledWith('wr-draft'));
    expect(await screen.findByText('已本人签名')).toBeInTheDocument();
  });

  it('已签名的上级查房提供上级审签入口', async () => {
    useCareStore.setState({
      ready: true,
      selectedVisitId: 'v1',
      rounds: [signedSuperior],
    });
    render(<RoundStation />);
    const btn = await screen.findByRole('button', { name: /上级审签/ });
    fireEvent.click(btn);
    await waitFor(() => expect(careApi.countersignRound).toHaveBeenCalledWith('wr-sup'));
    expect(await screen.findByText('上级已审签')).toBeInTheDocument();
  });
});

/* --------------------------- NursingStation --------------------------- */

describe('NursingStation 护士护理', () => {
  it('护理记录：体征/出入量/风险标签', async () => {
    useCareStore.setState({
      ready: true,
      selectedVisitId: 'v1',
      nursingRecords: [nursingRecord],
    });
    render(<NursingStation />);
    expect(await screen.findByText('NR20260927101')).toBeInTheDocument();
    expect(screen.getByText(/36\.6/)).toBeInTheDocument();
    expect(screen.getByText(/1200\/500/)).toBeInTheDocument();
    expect(screen.getByText('压疮低危')).toBeInTheDocument();
    expect(screen.getByText('跌倒中危')).toBeInTheDocument();
  });

  it('草稿护理记录可本人签名', async () => {
    useCareStore.setState({
      ready: true,
      selectedVisitId: 'v1',
      nursingRecords: [nursingRecord],
    });
    render(<NursingStation />);
    const btn = await screen.findByRole('button', { name: /本人签名/ });
    fireEvent.click(btn);
    await waitFor(() => expect(careApi.signNursingRecord).toHaveBeenCalledWith('nr1'));
    // 等待 store 链路（含 fetchNursingRecords）完成，避免卸载后竞争
    await waitFor(() => expect(careApi.listNursingRecords).toHaveBeenCalled());
  });

  it('护理任务：显示任务编号与执行按钮', async () => {
    useCareStore.setState({
      ready: true,
      selectedVisitId: 'v1',
      nursingTasks: [nursingTask],
    });
    render(<NursingStation />);
    expect(await screen.findByText('NT20260927101')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /执\s*行/ })).toBeInTheDocument();
  });
});

/* ----------------------------- OrderBoard ----------------------------- */

describe('OrderBoard 医嘱视图', () => {
  it('长期医嘱：待审核显示审核/驳回，执行中显示执行核对/停止与执行次数', async () => {
    useCareStore.setState({
      ready: true,
      selectedVisitId: 'v1',
      orderView,
    });
    render(<OrderBoard />);
    expect(await screen.findByText('待审核长期药（虚构）')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /审核/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /驳回/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /执行 \/ 核对/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /停止/ })).toBeInTheDocument();
    expect(screen.getByText('强制')).toBeInTheDocument();
    expect(screen.getByText(/1 次/)).toBeInTheDocument();
  });

  it('切换到临时医嘱显示已执行条目', async () => {
    useCareStore.setState({
      ready: true,
      selectedVisitId: 'v1',
      orderView,
    });
    render(<OrderBoard />);
    fireEvent.click(screen.getByText('临时医嘱'));
    expect(await screen.findByText('床旁心电图 1 次')).toBeInTheDocument();
  });

  it('点击审核调用 reviewOrder', async () => {
    useCareStore.setState({
      ready: true,
      selectedVisitId: 'v1',
      orderView,
    });
    render(<OrderBoard />);
    const btn = await screen.findByRole('button', { name: /审核/ });
    fireEvent.click(btn);
    await waitFor(() => expect(careApi.reviewOrder).toHaveBeenCalledWith('op1'));
    await waitFor(() => expect(careApi.getOrderView).toHaveBeenCalled());
  });
});

/* --------------------------- CareWorkbench 门禁 --------------------------- */

describe('CareWorkbench 健康门禁', () => {
  it('在线：探活通过后渲染患者选择与三个视图标签', async () => {
    render(<CareWorkbench />);
    expect(
      await screen.findByText('选择在院患者（来自 ADT 在院列表）'),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /医生查房/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /护士护理/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /在院医嘱/ })).toBeInTheDocument();
  });

  it('离线：探活失败显式报错、加水印并阻断交互，不造假', async () => {
    // jsdom 未实现 canvas，注入桩以保证 antd Watermark 正常渲染
    const mockCtx = {
      drawImage: vi.fn(), fillRect: vi.fn(), getImageData: vi.fn(() => ({ data: [] })),
      putImageData: vi.fn(), createImageData: vi.fn(() => []) , setTransform: vi.fn(),
      save: vi.fn(), restore: vi.fn(), fillText: vi.fn(), beginPath: vi.fn(),
      moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(), stroke: vi.fn(),
      translate: vi.fn(), scale: vi.fn(), rotate: vi.fn(), arc: vi.fn(),
      rect: vi.fn(), clip: vi.fn(), measureText: vi.fn(() => ({ width: 0 })),
      createPattern: vi.fn(), transform: vi.fn(), globalAlpha: 1,
    };
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as never;
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock') as never;
    vi.mocked(careApi.getSystemHealth).mockRejectedValueOnce(new Error('网络错误'));
    render(<CareWorkbench />);
    expect(
      await screen.findByText('无法连接在院诊疗后端或真实数据库'),
    ).toBeInTheDocument();
    // Watermark 遮罩存在（antd 5.22 水印节点 removeAttribute('class')，以内联 background-image 的 div 追加；
    // 经 RAF 防抖 + canvas 异步生成，给予充足超时，避免在高负载下竞态）
    await waitFor(
      () =>
        expect(document.querySelector('[style*="background-image"]')).toBeInTheDocument(),
      { timeout: 4000, interval: 100 },
    );
    // 患者选择禁用（combobox），且工作区 pointer-events 被阻断
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(document.querySelector('[style*="pointer-events"]')).toBeInTheDocument();
  });
});

/* ----------------- RoundStation：新建 / 退回闭环 ----------------- */

describe('RoundStation 新建与退回闭环', () => {
  it('新建查房：填写必填评估后保存生成草稿', async () => {
    useCareStore.setState({ ready: true, selectedVisitId: 'v1', rounds: [] });
    render(<RoundStation />);
    fireEvent.click(await screen.findByRole('button', { name: /新建查房/ }));
    expect(await screen.findByText('新建查房记录')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('患者主诉、症状变化（客观记录）'), {
      target: { value: '胸痛较前缓解' },
    });
    fireEvent.change(screen.getByPlaceholderText('评估、分析（必须由医师确认）'), {
      target: { value: '评估：症状缓解，继续当前方案' },
    });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
    await waitFor(() => expect(careApi.createRound).toHaveBeenCalledTimes(1));
    const p = vi.mocked(careApi.createRound).mock.calls[0][0];
    expect(p.assessment).toBe('评估：症状缓解，继续当前方案');
    expect(p.symptomChange).toBe('胸痛较前缓解');
    expect(p.roundType).toBe('routine');
    expect(p.isSuperior).toBe(false);
    expect(await screen.findByText('查房记录草稿已创建，请医师本人签名')).toBeInTheDocument();
  });

  it('新建查房：缺少必填评估时校验拦截，不调用创建', async () => {
    useCareStore.setState({ ready: true, selectedVisitId: 'v1', rounds: [] });
    render(<RoundStation />);
    fireEvent.click(await screen.findByRole('button', { name: /新建查房/ }));
    expect(await screen.findByText('新建查房记录')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
    expect(await screen.findByText('请填写病情评估')).toBeInTheDocument();
    expect(careApi.createRound).not.toHaveBeenCalled();
  });

  it('新建查房：取消关闭弹窗，不创建', async () => {
    useCareStore.setState({ ready: true, selectedVisitId: 'v1', rounds: [] });
    render(<RoundStation />);
    fireEvent.click(await screen.findByRole('button', { name: /新建查房/ }));
    expect(await screen.findByText('新建查房记录')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }));
    expect(careApi.createRound).not.toHaveBeenCalled();
  });

  it('上级退回：填写退回原因后确认退回并记录', async () => {
    useCareStore.setState({ ready: true, selectedVisitId: 'v1', rounds: [signedSuperior] });
    render(<RoundStation />);
    fireEvent.click(await screen.findByRole('button', { name: /退回/ }));
    expect(await screen.findByText('上级退回查房记录')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('请说明退回原因（必填）'), {
      target: { value: '查体记录不完整，请补充' },
    });
    fireEvent.click(screen.getByRole('button', { name: /确认退回/ }));
    await waitFor(() =>
      expect(careApi.returnRound).toHaveBeenCalledWith('wr-sup', '查体记录不完整，请补充'),
    );
    expect(await screen.findByText('已退回并记录原因')).toBeInTheDocument();
  });

  it('上级退回：未填原因给出警告且不退回', async () => {
    useCareStore.setState({ ready: true, selectedVisitId: 'v1', rounds: [signedSuperior] });
    render(<RoundStation />);
    fireEvent.click(await screen.findByRole('button', { name: /退回/ }));
    expect(await screen.findByText('上级退回查房记录')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /确认退回/ }));
    expect(await screen.findByText('请填写退回原因')).toBeInTheDocument();
    expect(careApi.returnRound).not.toHaveBeenCalled();
  });

  it('上级退回：取消关闭弹窗', async () => {
    useCareStore.setState({ ready: true, selectedVisitId: 'v1', rounds: [signedSuperior] });
    render(<RoundStation />);
    fireEvent.click(await screen.findByRole('button', { name: /退回/ }));
    expect(await screen.findByText('上级退回查房记录')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }));
    expect(careApi.returnRound).not.toHaveBeenCalled();
  });
});

/* ----------------- NursingStation：新建 / 执行闭环 ----------------- */

describe('NursingStation 新建与执行闭环', () => {
  it('新建护理记录：体征/出入量/措施/风险评分保存为草稿', async () => {
    useCareStore.setState({
      ready: true,
      selectedVisitId: 'v1',
      nursingRecords: [],
      nursingTasks: [],
    });
    render(<NursingStation />);
    fireEvent.click(await screen.findByRole('button', { name: /新建护理记录/ }));
    expect(
      await screen.findByText('新建护理记录', { selector: '.ant-modal-title' }),
    ).toBeInTheDocument();
    const setNum = (label: RegExp, val: string) =>
      fireEvent.change(screen.getByLabelText(label), { target: { value: val } });
    setNum(/体温/, '36.5');
    setNum(/脉搏/, '78');
    setNum(/口服入量/, '1000');
    setNum(/尿量/, '900');
    setNum(/Braden/, '16');
    setNum(/Morse/, '55');
    fireEvent.change(
      screen.getByPlaceholderText('如：吸氧、心电监护、体位护理、管路护理等'),
      { target: { value: '翻身拍背、健康教育' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /保存草稿/ }));
    await waitFor(() => expect(careApi.createNursingRecord).toHaveBeenCalledTimes(1));
    const p = vi.mocked(careApi.createNursingRecord).mock.calls[0][0];
    expect(p.vitals!.temperature).toBe(36.5);
    expect(p.vitals!.pulse).toBe(78);
    expect(p.intake!.oral).toBe(1000);
    expect(p.output!.urine).toBe(900);
    expect(p.measures).toBe('翻身拍背、健康教育');
    expect(p.riskAssessment!.bradenScore).toBe(16);
    expect(p.riskAssessment!.morseScore).toBe(55);
    expect(await screen.findByText('护理记录草稿已创建，请责任护士签名')).toBeInTheDocument();
  }, 30000);

  it('新建护理记录：取消不保存', async () => {
    useCareStore.setState({
      ready: true,
      selectedVisitId: 'v1',
      nursingRecords: [],
      nursingTasks: [],
    });
    render(<NursingStation />);
    fireEvent.click(await screen.findByRole('button', { name: /新建护理记录/ }));
    expect(
      await screen.findByText('新建护理记录', { selector: '.ant-modal-title' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }));
    expect(careApi.createNursingRecord).not.toHaveBeenCalled();
  });

  it('新建任务：填写内容后创建（携带幂等键）', async () => {
    useCareStore.setState({
      ready: true,
      selectedVisitId: 'v1',
      nursingRecords: [],
      nursingTasks: [],
    });
    render(<NursingStation />);
    fireEvent.click(await screen.findByRole('button', { name: /新建任务/ }));
    expect(await screen.findByText('新建护理任务')).toBeInTheDocument();
    fireEvent.change(
      screen.getByPlaceholderText('如：15:00 测量血压并记录；观察穿刺点有无渗血'),
      { target: { value: '15:00 复测血压并记录' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /创建任务/ }));
    await waitFor(() => expect(careApi.createNursingTask).toHaveBeenCalledTimes(1));
    const p = vi.mocked(careApi.createNursingTask).mock.calls[0][0];
    expect(p.content).toBe('15:00 复测血压并记录');
    expect(typeof p.idempotencyKey).toBe('string');
    expect(p.idempotencyKey.length).toBeGreaterThan(0);
    expect(p.taskType).toBe('vitals');
    expect(await screen.findByText('护理任务已创建')).toBeInTheDocument();
  });

  it('新建任务：缺少任务内容时校验拦截', async () => {
    useCareStore.setState({
      ready: true,
      selectedVisitId: 'v1',
      nursingRecords: [],
      nursingTasks: [],
    });
    render(<NursingStation />);
    fireEvent.click(await screen.findByRole('button', { name: /新建任务/ }));
    expect(await screen.findByText('新建护理任务')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /创建任务/ }));
    expect(await screen.findByText('任务内容不能为空')).toBeInTheDocument();
    expect(careApi.createNursingTask).not.toHaveBeenCalled();
  });

  it('新建任务：取消不创建', async () => {
    useCareStore.setState({
      ready: true,
      selectedVisitId: 'v1',
      nursingRecords: [],
      nursingTasks: [],
    });
    render(<NursingStation />);
    fireEvent.click(await screen.findByRole('button', { name: /新建任务/ }));
    expect(await screen.findByText('新建护理任务')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }));
    expect(careApi.createNursingTask).not.toHaveBeenCalled();
  });

  it('执行任务：点击执行→填写结果→确认执行', async () => {
    useCareStore.setState({
      ready: true,
      selectedVisitId: 'v1',
      nursingRecords: [],
      nursingTasks: [nursingTask],
    });
    render(<NursingStation />);
    fireEvent.click(await screen.findByRole('button', { name: /执\s*行/ }));
    expect(await screen.findByText('执行护理任务')).toBeInTheDocument();
    fireEvent.change(
      screen.getByPlaceholderText('请记录客观执行情况、患者反应和异常处理'),
      { target: { value: '复测血压 120/78，患者无不适' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /确认执行/ }));
    await waitFor(() =>
      expect(careApi.executeNursingTask).toHaveBeenCalledWith('nt1', '复测血压 120/78，患者无不适'),
    );
    expect(await screen.findByText('护理任务已执行')).toBeInTheDocument();
  });

  it('执行任务：并发下他人已执行时为幂等返回提示', async () => {
    vi.mocked(careApi.executeNursingTask).mockResolvedValueOnce({
      task: { ...nursingTask, status: 'executed' },
      deduplicated: true,
    } as never);
    useCareStore.setState({
      ready: true,
      selectedVisitId: 'v1',
      nursingRecords: [],
      nursingTasks: [nursingTask],
    });
    render(<NursingStation />);
    fireEvent.click(await screen.findByRole('button', { name: /执\s*行/ }));
    expect(await screen.findByText('执行护理任务')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /确认执行/ }));
    expect(
      await screen.findByText('任务已由他人执行，本次为幂等返回'),
    ).toBeInTheDocument();
  });

  it('执行任务：取消关闭弹窗', async () => {
    useCareStore.setState({
      ready: true,
      selectedVisitId: 'v1',
      nursingRecords: [],
      nursingTasks: [nursingTask],
    });
    render(<NursingStation />);
    fireEvent.click(await screen.findByRole('button', { name: /执\s*行/ }));
    expect(await screen.findByText('执行护理任务')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }));
    expect(careApi.executeNursingTask).not.toHaveBeenCalled();
  });
});

/* ----------------- OrderBoard：开具 / 驳回 / 执行 / 停止 / 展开 ----------------- */

describe('OrderBoard 全动作闭环', () => {
  it('开具医嘱：填写内容/剂量/频次后提交审核', async () => {
    useCareStore.setState({ ready: true, selectedVisitId: 'v1', orderView });
    render(<OrderBoard />);
    fireEvent.click(await screen.findByRole('button', { name: /开具医嘱/ }));
    expect(await screen.findByText('开具在院医嘱')).toBeInTheDocument();
    fireEvent.change(
      screen.getByPlaceholderText('如：阿司匹林肠溶片 100mg 口服，每日一次'),
      { target: { value: '阿司匹林肠溶片 100mg 口服 每日一次' } },
    );
    fireEvent.change(screen.getByLabelText(/剂量$/), { target: { value: '100mg' } });
    fireEvent.change(screen.getByLabelText(/频次$/), { target: { value: 'qd' } });
    fireEvent.click(screen.getByRole('button', { name: /提交审核/ }));
    await waitFor(() => expect(careApi.createOrder).toHaveBeenCalledTimes(1));
    const p = vi.mocked(careApi.createOrder).mock.calls[0][0];
    expect(p.content).toBe('阿司匹林肠溶片 100mg 口服 每日一次');
    expect(p.detail!.dose).toBe('100mg');
    expect(p.detail!.frequency).toBe('qd');
    expect(p.category).toBe('long_term');
    expect(await screen.findByText('医嘱已提交，待医师审核')).toBeInTheDocument();
  });

  it('开具医嘱：缺少内容时校验拦截', async () => {
    useCareStore.setState({ ready: true, selectedVisitId: 'v1', orderView });
    render(<OrderBoard />);
    fireEvent.click(await screen.findByRole('button', { name: /开具医嘱/ }));
    expect(await screen.findByText('开具在院医嘱')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /提交审核/ }));
    expect(await screen.findByText('医嘱内容不能为空')).toBeInTheDocument();
    expect(careApi.createOrder).not.toHaveBeenCalled();
  });

  it('开具医嘱：取消关闭弹窗', async () => {
    useCareStore.setState({ ready: true, selectedVisitId: 'v1', orderView });
    render(<OrderBoard />);
    fireEvent.click(await screen.findByRole('button', { name: /开具医嘱/ }));
    expect(await screen.findByText('开具在院医嘱')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }));
    expect(careApi.createOrder).not.toHaveBeenCalled();
  });

  it('驳回：填写驳回原因后确认驳回', async () => {
    useCareStore.setState({ ready: true, selectedVisitId: 'v1', orderView });
    render(<OrderBoard />);
    fireEvent.click(await screen.findByRole('button', { name: /驳回/ }));
    expect(await screen.findByText('驳回医嘱')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('请说明医嘱需修正的内容'), {
      target: { value: '剂量与说明书不符，请核对' },
    });
    fireEvent.click(screen.getByRole('button', { name: /确认驳回/ }));
    await waitFor(() =>
      expect(careApi.rejectOrder).toHaveBeenCalledWith('op1', '剂量与说明书不符，请核对'),
    );
    expect(await screen.findByText('医嘱已驳回')).toBeInTheDocument();
  });

  it('驳回：缺少原因时校验拦截', async () => {
    useCareStore.setState({ ready: true, selectedVisitId: 'v1', orderView });
    render(<OrderBoard />);
    fireEvent.click(await screen.findByRole('button', { name: /驳回/ }));
    expect(await screen.findByText('驳回医嘱')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /确认驳回/ }));
    expect(await screen.findByText('驳回原因不能为空')).toBeInTheDocument();
    expect(careApi.rejectOrder).not.toHaveBeenCalled();
  });

  it('驳回：取消关闭弹窗', async () => {
    useCareStore.setState({ ready: true, selectedVisitId: 'v1', orderView });
    render(<OrderBoard />);
    fireEvent.click(await screen.findByRole('button', { name: /驳回/ }));
    expect(await screen.findByText('驳回医嘱')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }));
    expect(careApi.rejectOrder).not.toHaveBeenCalled();
  });

  it('执行/双人核对：高风险药填写核对人后保存执行记录', async () => {
    useCareStore.setState({ ready: true, selectedVisitId: 'v1', orderView });
    render(<OrderBoard />);
    fireEvent.click(await screen.findByRole('button', { name: /执行 \/ 核对/ }));
    expect(await screen.findByText('执行 / 双人核对医嘱')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/实际剂量/), {
      target: { value: '那屈肝素 0.4ml' },
    });
    fireEvent.change(screen.getByLabelText(/双人核对人/), { target: { value: 'nur2' } });
    fireEvent.change(screen.getByPlaceholderText('患者反应、异常情况、暂停/拒绝原因等'), {
      target: { value: '注射后无不良反应' },
    });
    fireEvent.click(screen.getByRole('button', { name: /保存执行记录/ }));
    await waitFor(() => expect(careApi.administerOrder).toHaveBeenCalledTimes(1));
    const [id, p] = vi.mocked(careApi.administerOrder).mock.calls[0];
    expect(id).toBe('oa1');
    expect(p.checkedBy).toBe('nur2');
    expect(p.dose).toBe('那屈肝素 0.4ml');
    expect(p.note).toBe('注射后无不良反应');
    expect(p.status).toBe('administered');
    expect(await screen.findByText('医嘱执行记录已保存')).toBeInTheDocument();
  });

  it('执行/双人核对：高风险药缺核对人时校验拦截', async () => {
    useCareStore.setState({ ready: true, selectedVisitId: 'v1', orderView });
    render(<OrderBoard />);
    fireEvent.click(await screen.findByRole('button', { name: /执行 \/ 核对/ }));
    expect(await screen.findByText('执行 / 双人核对医嘱')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /保存执行记录/ }));
    expect(
      await screen.findByText('高风险药/血制品必须填写核对人'),
    ).toBeInTheDocument();
    expect(careApi.administerOrder).not.toHaveBeenCalled();
  });

  it('执行/双人核对：取消关闭弹窗', async () => {
    useCareStore.setState({ ready: true, selectedVisitId: 'v1', orderView });
    render(<OrderBoard />);
    fireEvent.click(await screen.findByRole('button', { name: /执行 \/ 核对/ }));
    expect(await screen.findByText('执行 / 双人核对医嘱')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }));
    expect(careApi.administerOrder).not.toHaveBeenCalled();
  });

  it('停止长期医嘱：点击停止调用 stopOrder', async () => {
    useCareStore.setState({ ready: true, selectedVisitId: 'v1', orderView });
    render(<OrderBoard />);
    fireEvent.click(await screen.findByRole('button', { name: /停止/ }));
    await waitFor(() => expect(careApi.stopOrder).toHaveBeenCalledWith('oa1'));
  });

  it('展开长期医嘱行显示执行记录（空态显式提示）', async () => {
    useCareStore.setState({ ready: true, selectedVisitId: 'v1', orderView });
    render(<OrderBoard />);
    const icon = await waitFor(() => {
      const el = document.querySelector('.ant-table-row-expand-icon');
      if (!el) throw new Error('expand icon not ready');
      return el;
    });
    fireEvent.click(icon);
    expect(await screen.findByText('暂无执行记录')).toBeInTheDocument();
  });
});

/* ----------------- CareWorkbench：选患者 / 搜索 / 切标签 ----------------- */

describe('CareWorkbench 患者选择与标签切换', () => {
  it('从在院列表选择患者后按 visitId 加载各视图', async () => {
    render(<CareWorkbench />);
    const combobox = await screen.findByRole('combobox');
    await waitFor(() => expect(combobox).toBeEnabled());
    fireEvent.mouseDown(document.querySelector('.ant-select-selector') as Element);
    const option = await waitFor(() => {
      const els = document.querySelectorAll('.ant-select-item-option');
      if (!els.length) throw new Error('options not ready');
      return els[0];
    });
    fireEvent.click(option);
    await waitFor(() => expect(careApi.listRounds).toHaveBeenCalled());
  });

  it('患者下拉支持按姓名/床号/诊断搜索过滤', async () => {
    render(<CareWorkbench />);
    const combobox = await screen.findByRole('combobox');
    await waitFor(() => expect(combobox).toBeEnabled());
    fireEvent.change(combobox, { target: { value: '心肌梗死' } });
    const option = await waitFor(() => {
      const els = document.querySelectorAll('.ant-select-item-option');
      if (!els.length) throw new Error('filtered option not ready');
      return els[0];
    });
    expect(option.textContent).toContain('急性心肌梗死');
  });

  it('切换到护士护理标签挂载护理工作台', async () => {
    render(<CareWorkbench />);
    fireEvent.click(await screen.findByRole('tab', { name: /护士护理/ }));
    expect(
      await screen.findByText('护理记录单 · 生命体征 / 出入量 / 风险评估'),
    ).toBeInTheDocument();
  });
});
