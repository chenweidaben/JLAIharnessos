/**
 * 健澜科技 jlmedaios - 临床用血质量工作站页面测试（M10-B）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 在线：健康标签、列表加载；
 *  - 质控指标：加载指标、指标卡与分数表；
 *  - 疗效评估：加载详情、手动录入、评估；
 *  - 合理性评价：人工确认指征、备注、提交；
 *  - 断库离线 Alert（不渲染业务内容）。
 *
 * BFF 经 vi.mock 隔离；真实断库另有 HTTP 端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

import BloodQualityPage from '@/pages/bloodQuality';
import type {
  EfficacyAssessment,
  UtilizationReview,
  BloodQualityDetail,
  QualityMetricsResponse,
} from '@/types/bloodQuality';

vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

vi.mock('@/services/api/bloodQuality', () => ({
  assessEfficacy: vi.fn(),
  listEfficacy: vi.fn(),
  reviewUtilization: vi.fn(),
  listUtilization: vi.fn(),
  getQualityMetrics: vi.fn(),
  getBloodQualityDetail: vi.fn(),
}));

import { getSystemHealth } from '@/services/api/pharmacy';
import * as api from '@/services/api/bloodQuality';

const healthMock = vi.mocked(getSystemHealth);
const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

function efficacy(over: Partial<EfficacyAssessment> = {}): EfficacyAssessment {
  return {
    id: 'e1', transfusionId: 'tr1', requestId: 'r1', visitId: 'v1', patientId: 'p1',
    assessedBy: 'doctor_chen', component: 'red_cell',
    preMetric: 65, postMetric: 86, metricUnit: 'g/L',
    expectedDelta: 20, actualDelta: 21, efficacyGrade: 'effective',
    preResultId: null, postResultId: null, note: '达预期',
    assessedAt: '2026-10-01T12:00:00.000Z',
    createdAt: '2026-10-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z',
    ...over,
  };
}
function utilization(over: Partial<UtilizationReview> = {}): UtilizationReview {
  return {
    id: 'u1', requestId: 'r1', visitId: 'v1', patientId: 'p1',
    reviewedBy: 'admin', indicationCompliant: true, dosageCompliant: true,
    preTestComplete: true, efficacyGrade: 'effective', conclusion: 'rational',
    issues: [], conclusionNote: '合理', reviewedAt: '2026-10-01T12:00:00.000Z',
    createdAt: '2026-10-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z',
    ...over,
  };
}
function detailOf(over: Partial<BloodQualityDetail> = {}): BloodQualityDetail {
  return {
    req: { id: 'r1', component: 'red_cell', unit_count: 2, urgency: 'routine' },
    transfusion: { status: 'completed', start_at: '2026-10-01T09:00:00Z', end_at: '2026-10-01T11:00:00Z' },
    efficacy: efficacy(),
    utilization: utilization(),
    ...over,
  };
}
function metricsOf(): QualityMetricsResponse {
  return {
    period: { from: '2026-10-01T00:00:00Z', to: '2026-10-31T00:00:00Z' },
    inpatientDischarges: 50,
    totalRequests: 10,
    metrics: {
      componentTransfusionRate: 100,
      indicationPassRate: 90,
      preTestRate: 100,
      reactionRate: 0,
      efficacyAssessmentRate: 100,
      inpatientTransfusionRate: 20,
      fractions: {
        componentTransfusionRate: { numerator: 10, denominator: 10 },
        indicationPassRate: { numerator: 9, denominator: 10 },
        preTestRate: { numerator: 10, denominator: 10 },
        reactionRate: { numerator: 0, denominator: 10 },
        efficacyAssessmentRate: { numerator: 10, denominator: 10 },
        inpatientTransfusionRate: { numerator: 10, denominator: 50 },
      },
    },
  };
}

function activePanel(): HTMLElement {
  return document.querySelector('.ant-tabs-tabpane-active') as HTMLElement;
}
async function switchTab(label: string) {
  fireEvent.click(await screen.findByText(label, { selector: '.ant-tabs-tab-btn' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  healthMock.mockResolvedValue({ status: 'ok', demoMode: false, db: 'up' });
  m.listEfficacy.mockResolvedValue([efficacy()]);
  m.listUtilization.mockResolvedValue([utilization()]);
  m.getBloodQualityDetail.mockResolvedValue(detailOf());
  m.getQualityMetrics.mockResolvedValue(metricsOf());
  m.assessEfficacy.mockResolvedValue({ assessment: efficacy(), created: true, reasons: [] });
  m.reviewUtilization.mockResolvedValue({ review: utilization(), created: true });
});

it('在线：健康标签 + 列表加载', async () => {
  render(<BloodQualityPage />);
  expect(await screen.findByTestId('blood-quality-health-tag')).toHaveTextContent('BFF/DB 正常 (up)');
  await waitFor(() => expect(m.listEfficacy).toHaveBeenCalled());
  await waitFor(() => expect(m.listUtilization).toHaveBeenCalled());
});

it('质控指标：加载指标 + 指标卡与分数表', async () => {
  render(<BloodQualityPage />);
  await screen.findByTestId('blood-quality-health-tag');
  fireEvent.click(screen.getByRole('button', { name: '加载质控指标' }));
  await waitFor(() => expect(m.getQualityMetrics).toHaveBeenCalled());
  // 指标卡标题 + 分数表"指标"列各出现一次
  expect((await screen.findAllByText('成分输血率')).length).toBeGreaterThanOrEqual(2);
  expect(screen.getAllByText('输血指征合格率').length).toBeGreaterThanOrEqual(2);
  // 分数表
  expect(screen.getByText('分子/分母（可核查）')).toBeTruthy();
  expect(screen.getByRole('columnheader', { name: '分子' })).toBeTruthy();
  expect(screen.getByRole('columnheader', { name: '分母' })).toBeTruthy();
});

it('疗效评估：加载详情 + 手动录入 + 评估', async () => {
  render(<BloodQualityPage />);
  await screen.findByTestId('blood-quality-health-tag');
  await switchTab('疗效评估');
  const panel = activePanel();

  // 输入申请 ID 并加载详情
  const idInput = within(panel).getByPlaceholderText('输入输血申请 UUID');
  fireEvent.change(idInput, { target: { value: 'r1' } });
  fireEvent.click(within(panel).getByRole('button', { name: '加载详情' }));
  await waitFor(() => expect(m.getBloodQualityDetail).toHaveBeenCalledWith('r1'));

  // 手动录入 pre/post（两个 placeholder "手动值"）
  const manualInputs = within(panel).getAllByPlaceholderText('手动值');
  fireEvent.change(manualInputs[0], { target: { value: '60' } });
  fireEvent.change(manualInputs[1], { target: { value: '82' } });

  fireEvent.click(within(panel).getByRole('button', { name: '评估疗效' }));
  await waitFor(() => expect(m.assessEfficacy).toHaveBeenCalledWith(
    expect.objectContaining({ requestId: 'r1', manualPre: 60, manualPost: 82 }),
  ));
});

it('合理性评价：人工确认指征 + 备注 + 提交', async () => {
  render(<BloodQualityPage />);
  await screen.findByTestId('blood-quality-health-tag');
  await switchTab('合理性评价');
  const panel = activePanel();

  const idInput = within(panel).getByPlaceholderText('输入输血申请 UUID');
  fireEvent.change(idInput, { target: { value: 'r1' } });
  fireEvent.click(within(panel).getByRole('button', { name: '加载详情' }));
  await waitFor(() => expect(m.getBloodQualityDetail).toHaveBeenCalled());

  // 勾选人工确认指征
  fireEvent.click(within(panel).getByRole('checkbox'));
  // 备注
  fireEvent.change(within(panel).getByPlaceholderText('补充临床依据或整改要求'), {
    target: { value: '急诊抢救，有手术记录' },
  });

  fireEvent.click(within(panel).getByRole('button', { name: '提交合理性评价' }));
  await waitFor(() => expect(m.reviewUtilization).toHaveBeenCalledWith(
    expect.objectContaining({ requestId: 'r1', manualIndication: true, conclusionNote: '急诊抢救，有手术记录' }),
  ));
});

it('断库：离线 Alert 且不渲染业务内容', async () => {
  healthMock.mockRejectedValue(new Error('数据库不可用'));
  render(<BloodQualityPage />);
  expect(await screen.findByTestId('blood-quality-offline-alert')).toBeTruthy();
  expect(screen.queryByText('加载质控指标')).toBeNull();
});
