/**
 * 健澜科技 jlmedaios - AI 智能解读工作站页面测试（M12-A）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 在线健康标签 + 双队列加载；
 *  - 检验生成（LLM 成功标注 / 未配置 LLM 降级标注）+ 趋势表渲染；
 *  - 模式（自动/仅规则/强制 LLM）与视角（医生/患者）切换；
 *  - 患者端通俗版、隐藏整体印象/队列/签名；
 *  - 影像解读（所见解释/可能方向）；
 *  - 待复核队列：签名/退回；
 *  - 无权限：生成/签名按钮入口隐藏；
 *  - 断库离线 Alert（不渲染业务内容）。
 *
 * BFF 经 vi.mock 隔离；真实断库 / 权限另有 HTTP 端到端与路由取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

import InterpretPage from '@/pages/interpret';
import { useLabInterpStore } from '@/store/labInterpStore';
import { useImagingInterpretStore } from '@/store/imagingInterpretStore';
import { useAuthStore } from '@/store/authStore';
import type { LabInterpretation } from '@/types/labInterpret';
import type { ImagingInterpretation } from '@/types/imagingInterpret';

vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

vi.mock('@/services/api/labInterpret', () => ({
  fetchLabInterpQueue: vi.fn(),
  generateLabInterp: vi.fn(),
  fetchLabInterp: vi.fn(),
  signLabInterp: vi.fn(),
  rejectLabInterp: vi.fn(),
}));

vi.mock('@/services/api/imagingInterpret', () => ({
  fetchImagingInterpQueue: vi.fn(),
  generateImagingInterp: vi.fn(),
  fetchImagingInterp: vi.fn(),
  signImagingInterp: vi.fn(),
  rejectImagingInterp: vi.fn(),
}));

import { getSystemHealth } from '@/services/api/pharmacy';
import * as labApi from '@/services/api/labInterpret';
import * as imagingApi from '@/services/api/imagingInterpret';

const healthMock = vi.mocked(getSystemHealth);
const lab = labApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const imaging = imagingApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

/* ------------------------------ 夹具 ------------------------------ */

function labInterp(over: Partial<LabInterpretation> = {}): LabInterpretation {
  return {
    id: 'li1', visitId: 'v1', patientId: 'p1', department: '心血管内科',
    itemCount: 5, abnormalCount: 1, criticalCount: 1,
    summary: '共5项，异常1项，危急1项。',
    abnormalItems: [],
    criticalItems: [
      { item: '肌钙蛋白I', code: 'cTnI', value: '0.15', unit: 'ng/mL', refLow: '0', refHigh: '0.04', flag: 'HH' },
    ],
    engineVersion: 'lab-rule-1.0',
    status: 'pending_review', generatedAt: '2026-10-09T09:00:00.000Z',
    reviewedBy: null, reviewedAt: null, rejectReason: null,
    audience: 'doctor',
    overallImpression: '心肌损伤可能，建议结合心电图与心内科会诊',
    itemExplanations: [{ code: 'cTnI', name: '肌钙蛋白I', meaning: '心肌损伤特异性标志物，升高提示心肌受损' }],
    trends: [
      { code: 'cTnI', name: '肌钙蛋白I', previous: 0.03, current: 0.15, unit: 'ng/mL', delta: 0.12, pct: 400, direction: 'rising', resultTime: '2026-10-02T09:00:00.000Z' },
    ],
    recommendations: [{ level: 'urgent', text: '立即心内科会诊，排查急性冠脉综合征' }],
    plainLanguageSummary: '您的心肌相关指标明显升高，请尽快到心内科就诊，不要自行处理。',
    deepSource: 'llm', model: 'deepseek-chat', llmStatus: 'llm_ok',
    ...over,
  };
}

function imagingInterp(over: Partial<ImagingInterpretation> = {}): ImagingInterpretation {
  return {
    id: 'ii1', reportId: 'rep1', visitId: 'v1', patientId: 'p1', department: '放射科',
    audience: 'doctor', modality: 'CT', examName: '头颅CT平扫', bodyPart: '头颅',
    explainedFindings: [{ finding: '右肺微小结节，边界清晰', explanation: '直径约3mm，形态规则，多为良性增殖灶' }],
    overallDirection: '倾向良性结节，建议随访观察（非确诊）',
    plainLanguageSummary: '影像发现一个很小的结节，大多是良性的，按医生建议定期复查即可。',
    recommendations: [{ level: 'medium', text: '3-6个月复查胸部CT' }],
    deepSource: 'llm', model: 'deepseek-chat', llmStatus: 'llm_ok',
    status: 'pending_review', generatedAt: '2026-10-09T09:00:00.000Z',
    reviewedBy: null, reviewedAt: null, rejectReason: null,
    ...over,
  };
}

const labQueueItem = {
  id: 'q1', visitId: 'v1', visitNo: 'V001', patientName: '张**',
  department: '心血管内科', abnormalCount: 1, criticalCount: 1,
  status: 'pending_review', updatedAt: '2026-10-09T09:00:00.000Z',
};
const imagingQueueItem = {
  id: 'q2', reportId: 'rep1', patientName: '张**', department: '放射科',
  modality: 'CT', examName: '头颅CT平扫', status: 'pending_review',
  updatedAt: '2026-10-09T09:00:00.000Z',
};

/* ------------------------------ 辅助 ------------------------------ */

function activePanel(): HTMLElement {
  return document.querySelector('.ant-tabs-tabpane-active') as HTMLElement;
}
async function switchTab(label: string) {
  fireEvent.click(await screen.findByText(label, { selector: '.ant-tabs-tab-btn' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ permissions: ['*'] });
  useLabInterpStore.setState({
    items: [], current: null, loading: false, error: null, dbUp: false,
  });
  useImagingInterpretStore.setState({ items: [], current: null, loading: false, error: null });

  healthMock.mockResolvedValue({ status: 'ok', demoMode: false, db: 'up' });
  lab.fetchLabInterpQueue.mockResolvedValue({ items: [labQueueItem] });
  lab.generateLabInterp.mockResolvedValue(labInterp());
  lab.fetchLabInterp.mockResolvedValue(labInterp());
  lab.signLabInterp.mockResolvedValue(labInterp({ status: 'signed' }));
  lab.rejectLabInterp.mockResolvedValue(labInterp({ status: 'rejected' }));

  imaging.fetchImagingInterpQueue.mockResolvedValue({ items: [imagingQueueItem] });
  imaging.generateImagingInterp.mockResolvedValue(imagingInterp());
  imaging.fetchImagingInterp.mockResolvedValue(imagingInterp());
  imaging.signImagingInterp.mockResolvedValue(imagingInterp({ status: 'signed' }));
  imaging.rejectImagingInterp.mockResolvedValue(imagingInterp({ status: 'rejected' }));
});

/* ------------------------------ 用例 ------------------------------ */

it('在线：健康标签 up + 双队列加载', async () => {
  render(<InterpretPage />);
  expect(await screen.findByTestId('interpret-health-tag')).toHaveTextContent('BFF/DB 正常 (up)');
  await waitFor(() => expect(lab.fetchLabInterpQueue).toHaveBeenCalledWith(undefined, 'doctor'));
  await waitFor(() => expect(imaging.fetchImagingInterpQueue).toHaveBeenCalledWith(undefined, 'doctor'));
});

it('检验生成：LLM 成功标注 + 整体印象 + 趋势表 + 分级建议', async () => {
  render(<InterpretPage />);
  await screen.findByTestId('interpret-health-tag');
  const panel = activePanel();

  fireEvent.change(within(panel).getByTestId('lab-visit-input'), { target: { value: 'v1' } });
  fireEvent.click(within(panel).getByTestId('lab-generate-btn'));

  await waitFor(() =>
    expect(lab.generateLabInterp).toHaveBeenCalledWith('v1', 'doctor', 'auto'),
  );
  // LLM 成功标注 + 模型
  expect(await screen.findByTestId('llm-badge')).toHaveTextContent('LLM 深度解读');
  expect(screen.getByTestId('llm-model')).toHaveTextContent('deepseek-chat');
  // 整体印象 / 逐项解释 / 趋势表 / 建议
  expect(screen.getByTestId('lab-overall-impression')).toHaveTextContent('心肌损伤可能');
  expect(screen.getByText('心肌损伤特异性标志物，升高提示心肌受损')).toBeTruthy();
  expect(screen.getByText('+400%')).toBeTruthy();
  expect(screen.getByText(/立即心内科会诊/)).toBeTruthy();
}, 30000);

it('检验生成：未配置 LLM 时显示降级标注（不冒充 LLM 文本）', async () => {
  lab.generateLabInterp.mockResolvedValue(
    labInterp({ deepSource: 'rule', model: null, llmStatus: 'llm_not_configured' }),
  );
  render(<InterpretPage />);
  await screen.findByTestId('interpret-health-tag');
  const panel = activePanel();

  fireEvent.change(within(panel).getByTestId('lab-visit-input'), { target: { value: 'v1' } });
  fireEvent.click(within(panel).getByTestId('lab-generate-btn'));

  expect(await screen.findByTestId('llm-badge')).toHaveTextContent('规则解读（降级标注）');
  // 未配置 LLM 时不显示模型标签
  expect(screen.queryByTestId('llm-model')).toBeNull();
}, 30000);

it('模式切换：强制 LLM 生成时透传 mode=llm', async () => {
  render(<InterpretPage />);
  await screen.findByTestId('interpret-health-tag');

  fireEvent.click(screen.getByText('强制 LLM'));
  const panel = activePanel();
  fireEvent.change(within(panel).getByTestId('lab-visit-input'), { target: { value: 'v1' } });
  fireEvent.click(within(panel).getByTestId('lab-generate-btn'));

  await waitFor(() =>
    expect(lab.generateLabInterp).toHaveBeenCalledWith('v1', 'doctor', 'llm'),
  );
}, 30000);

it('视角切换：患者端显示通俗版、隐藏整体印象与待复核队列', async () => {
  render(<InterpretPage />);
  await screen.findByTestId('interpret-health-tag');
  // 医生视角默认有“待复核队列”Tab
  expect(await screen.findByText('待复核队列')).toBeTruthy();

  // 切到患者视角
  fireEvent.click(screen.getByText('患者视角'));
  await waitFor(() => expect(screen.queryByText('待复核队列')).toBeNull());

  // 患者端生成：调用 audience=patient
  const panel = activePanel();
  fireEvent.change(within(panel).getByTestId('lab-visit-input'), { target: { value: 'v1' } });
  fireEvent.click(within(panel).getByTestId('lab-generate-btn'));
  await waitFor(() =>
    expect(lab.generateLabInterp).toHaveBeenCalledWith('v1', 'patient', 'auto'),
  );

  // 通俗版渲染、医生端整体印象不渲染
  expect(await screen.findByTestId('lab-plain-summary')).toHaveTextContent('尽快到心内科就诊');
  expect(screen.queryByTestId('lab-overall-impression')).toBeNull();
}, 30000);

it('影像解读：生成后渲染所见解释与可能方向', async () => {
  render(<InterpretPage />);
  await screen.findByTestId('interpret-health-tag');
  await switchTab('影像解读');
  const panel = activePanel();

  fireEvent.change(within(panel).getByTestId('imaging-report-input'), { target: { value: 'rep1' } });
  fireEvent.click(within(panel).getByTestId('imaging-generate-btn'));

  await waitFor(() =>
    expect(imaging.generateImagingInterp).toHaveBeenCalledWith('rep1', 'doctor', 'auto'),
  );
  expect(await screen.findByText('右肺微小结节，边界清晰')).toBeTruthy();
  expect(screen.getByTestId('imaging-overall-direction')).toHaveTextContent('倾向良性结节');
}, 30000);

it('待复核队列：检验/影像 签名与退回', async () => {
  render(<InterpretPage />);
  await screen.findByTestId('interpret-health-tag');
  await switchTab('待复核队列');

  // 检验签名
  fireEvent.click(await screen.findByTestId('lab-sign-q1'));
  await waitFor(() => expect(lab.signLabInterp).toHaveBeenCalledWith('q1'));

  // 检验退回（填原因）
  const rejectInput = document.querySelector('input[placeholder="退回原因"]') as HTMLInputElement;
  fireEvent.change(rejectInput, { target: { value: '数值存疑需重测' } });
  fireEvent.click(await screen.findByTestId('lab-reject-q1'));
  await waitFor(() => expect(lab.rejectLabInterp).toHaveBeenCalledWith('q1', '数值存疑需重测'));

  // 影像签名
  fireEvent.click(await screen.findByTestId('imaging-sign-q2'));
  await waitFor(() => expect(imaging.signImagingInterp).toHaveBeenCalledWith('q2'));
}, 30000);

it('无权限：无 sign 权限时隐藏生成与签名按钮', async () => {
  // 仅查看权限，无签名/生成权限
  useAuthStore.setState({ permissions: ['lab:interpret:view', 'imaging:interpret:view'] });
  render(<InterpretPage />);
  await screen.findByTestId('interpret-health-tag');

  // 检验生成按钮隐藏
  expect(screen.queryByTestId('lab-generate-btn')).toBeNull();
  // 队列 Tab 仍在（医生视角），但签名按钮隐藏
  await switchTab('待复核队列');
  await waitFor(() => expect(screen.queryByTestId('lab-sign-q1')).toBeNull());
  expect(screen.queryByTestId('imaging-sign-q2')).toBeNull();
});

it('断库：离线 Alert 且不渲染业务内容', async () => {
  healthMock.mockRejectedValue(new Error('数据库不可用'));
  render(<InterpretPage />);
  expect(await screen.findByTestId('interpret-offline-alert')).toBeTruthy();
  expect(screen.queryByTestId('lab-generate-btn')).toBeNull();
  expect(screen.queryByText('待复核队列')).toBeNull();
});
