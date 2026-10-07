/**
 * 健澜科技 jlmedaios - VTE 智能防治工作站页面测试（M13-A / M13A_TEST）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：在线健康标签/高危看板加载；风险评估实时算分 + 提交；就诊详情机械执行/药物确认；
 * 质控指标分子分母；断库离线 Alert；权限入口隐藏（vte:prevent 缺省时无确认按钮）。
 *
 * BFF 经 vi.mock 隔离；真实断库 / 权限另有 HTTP 端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

import VtePage from '@/pages/vte';
import { useAuthStore } from '@/store/authStore';
import type {
  VteAssessment,
  VteHighRiskItem,
  VteMetricsResponse,
  VtePrevention,
  VteVisitDetail,
} from '@/types/vte';

vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

vi.mock('@/services/api/vte', () => ({
  assessVte: vi.fn(),
  listAssessments: vi.fn(),
  listHighRisk: vi.fn(),
  getVteMetrics: vi.fn(),
  getVisitDetail: vi.fn(),
  getAssessment: vi.fn(),
  addPrevention: vi.fn(),
  listPreventions: vi.fn(),
  confirmPrevention: vi.fn(),
  executePrevention: vi.fn(),
  contraindicatePrevention: vi.fn(),
  recordOutcome: vi.fn(),
  listOutcomes: vi.fn(),
  extractFactors: vi.fn(),
}));

import { getSystemHealth } from '@/services/api/pharmacy';
import * as api from '@/services/api/vte';

const healthMock = vi.mocked(getSystemHealth);
const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

function highRisk(over: Partial<VteHighRiskItem> = {}): VteHighRiskItem {
  return {
    visitId: 'visit-high-0001',
    patientId: 'p1',
    patientName: '张三',
    department: '普外科',
    assessmentId: 'a1',
    vteLevel: 'very_high',
    vteScore: 7,
    scale: 'caprini',
    assessedAt: '2026-10-01T08:00:00.000Z',
    preventionMismatch: true,
    ...over,
  };
}

function prevention(over: Partial<VtePrevention> = {}): VtePrevention {
  return {
    id: 'p1',
    visitId: 'v1',
    patientId: 'p1',
    assessmentId: 'a1',
    preventionNo: 'VP-1',
    category: 'mechanical',
    method: 'ipc',
    status: 'suggested',
    dosage: null,
    frequency: null,
    orderId: null,
    nursingTaskId: null,
    suggestedBy: 'doctor',
    confirmedBy: null,
    executedBy: null,
    confirmedAt: null,
    executedAt: null,
    contraindicationNote: null,
    createdAt: '2026-10-01T08:00:00.000Z',
    ...over,
  };
}

function visitDetailOf(): VteVisitDetail {
  const assessment: VteAssessment = {
    id: 'a1', visitId: 'v1', patientId: 'p1', department: '普外科',
    assessmentNo: 'VA-1', scale: 'caprini', occasion: 'admission',
    vteScore: 7, vteLevel: 'very_high',
    vteFactors: [{ key: 'prior_vte', label: '既往 VTE', points: 3 }],
    bleedingLevel: 'low', bleedingFactors: [],
    alertRaised: true, version: 1, assessedBy: 'doctor',
    assessedAt: '2026-10-01T08:00:00.000Z', note: null,
    createdAt: '2026-10-01T08:00:00.000Z',
  };
  return {
    assessments: [assessment],
    preventions: [
      prevention({ id: 'p_mech', category: 'mechanical', method: 'ipc' }),
      prevention({ id: 'p_drug', category: 'pharmacological', method: 'lmwh' }),
    ],
    outcomes: [],
  };
}

function metricsOf(): VteMetricsResponse {
  return {
    period: { from: '2026-10-01T00:00:00Z', to: '2026-10-31T00:00:00Z' },
    discharges: 100,
    metrics: {
      riskAssessmentRate: 95,
      highRiskPreventionRate: 80,
      hospitalVteRate: 2,
      fractions: {
        riskAssessmentRate: { numerator: 95, denominator: 100 },
        highRiskPreventionRate: { numerator: 16, denominator: 20 },
        hospitalVteRate: { numerator: 2, denominator: 100 },
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
  useAuthStore.setState({ permissions: ['*'] });
  healthMock.mockResolvedValue({ status: 'ok', demoMode: false, db: 'up' });
  m.listHighRisk.mockResolvedValue([highRisk()]);
  m.getVteMetrics.mockResolvedValue(metricsOf());
  m.getVisitDetail.mockResolvedValue(visitDetailOf());
  m.assessVte.mockResolvedValue(visitDetailOf().assessments[0]);
  m.confirmPrevention.mockResolvedValue(prevention({ id: 'p_drug', status: 'confirmed' }));
  m.executePrevention.mockResolvedValue(prevention({ id: 'p_mech', status: 'executed' }));
  m.contraindicatePrevention.mockResolvedValue(prevention({ id: 'p_mech', status: 'contraindicated' }));
  m.recordOutcome.mockResolvedValue({
    id: 'o1', visitId: 'v1', patientId: 'p1', eventType: 'dvt', severity: null,
    source: 'hospital_acquired', imagingReportId: null, labResultId: null,
    description: null, recordedBy: null, occurredAt: null, createdAt: '2026-10-01T08:00:00Z',
  });
});

it('在线：健康标签 + 高危看板加载', async () => {
  render(<VtePage />);
  expect(await screen.findByTestId('vte-health-tag')).toHaveTextContent('BFF/DB 正常 (up)');
  await waitFor(() => expect(m.listHighRisk).toHaveBeenCalled());
  await switchTab('高危看板');
  expect(await screen.findByTestId('vte-mismatch-tag')).toHaveTextContent('高危未预防');
});

it('风险评估：勾选因素实时算分 + 提交', async () => {
  render(<VtePage />);
  await screen.findByTestId('vte-health-tag');
  // 默认即在"风险评估"Tab
  const panel = activePanel();

  // 就诊 ID
  fireEvent.change(within(panel).getByTestId('vte-assess-visit'), { target: { value: 'v1' } });

  // 勾选 既往VTE(3分) + 活动性肿瘤(2分) => 5 分极高危
  fireEvent.click(screen.getByText('既往 VTE（DVT/PE）（3分）'));
  fireEvent.click(screen.getByText('活动性肿瘤（2分）'));

  await waitFor(() => expect(screen.getByTestId('vte-live-score')).toHaveTextContent('5'));
  expect(screen.getByTestId('vte-live-level')).toHaveTextContent('极高危');

  fireEvent.click(within(panel).getByTestId('vte-assess-submit'));
  await waitFor(() =>
    expect(m.assessVte).toHaveBeenCalledWith(
      expect.objectContaining({
        visitId: 'v1',
        scale: 'caprini',
        vteFactorKeys: expect.arrayContaining(['prior_vte', 'active_cancer']),
      }),
    ),
  );
});

it('就诊详情：机械预防执行 + 药物预防确认', async () => {
  render(<VtePage />);
  await screen.findByTestId('vte-health-tag');
  await switchTab('就诊详情');
  const panel = activePanel();

  fireEvent.change(within(panel).getByTestId('vte-detail-visit'), { target: { value: 'v1' } });
  fireEvent.click(within(panel).getByTestId('vte-detail-load'));
  await waitFor(() => expect(m.getVisitDetail).toHaveBeenCalledWith('v1'));

  // 机械执行 + 药物确认按钮均在（* 权限）
  const execBtn = await screen.findByTestId('vte-execute-btn');
  fireEvent.click(execBtn);
  await waitFor(() => expect(m.executePrevention).toHaveBeenCalledWith('p_mech'));

  fireEvent.click(screen.getByTestId('vte-confirm-btn'));
  await waitFor(() => expect(m.confirmPrevention).toHaveBeenCalledWith('p_drug', undefined));
});

it('质控指标：加载 + 指标卡 + 分子分母表', async () => {
  render(<VtePage />);
  await screen.findByTestId('vte-health-tag');
  await switchTab('质控指标');
  const panel = activePanel();

  fireEvent.click(within(panel).getByTestId('vte-metrics-load'));
  await waitFor(() => expect(m.getVteMetrics).toHaveBeenCalled());
  // 指标卡标题 + 分数表"指标"列各出现一次
  expect((await screen.findAllByText('风险评估率')).length).toBeGreaterThanOrEqual(2);
  expect(screen.getByRole('columnheader', { name: '分子' })).toBeTruthy();
  expect(screen.getByRole('columnheader', { name: '分母' })).toBeTruthy();
});

it('权限：无 vte:prevent 时药物确认按钮隐藏，机械执行仍在', async () => {
  useAuthStore.setState({ permissions: ['vte:read', 'vte:assess', 'vte:execute'] });
  render(<VtePage />);
  await screen.findByTestId('vte-health-tag');
  await switchTab('就诊详情');
  const panel = activePanel();
  fireEvent.change(within(panel).getByTestId('vte-detail-visit'), { target: { value: 'v1' } });
  fireEvent.click(within(panel).getByTestId('vte-detail-load'));
  await waitFor(() => expect(m.getVisitDetail).toHaveBeenCalled());

  await screen.findByTestId('vte-execute-btn');
  expect(screen.queryByTestId('vte-confirm-btn')).toBeNull();
});

it('断库：离线 Alert 且不渲染业务内容', async () => {
  healthMock.mockRejectedValue(new Error('ECONNREFUSED'));
  render(<VtePage />);
  expect(await screen.findByTestId('vte-offline-alert')).toBeTruthy();
  expect(screen.queryByTestId('vte-assess-submit')).toBeNull();
});
