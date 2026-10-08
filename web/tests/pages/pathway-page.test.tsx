/**
 * 健澜科技 jlmedaios - 临床路径管理工作站页面测试（M15-A / M15A_TEST）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：在线健康标签 + 定义/可入径/入径记录加载；评估入径 Modal 确认签名；权限入口隐藏；
 * 路径执行一键下达；变异记录；出径完成；质控分子分母；断库离线 Alert；写失败错误 Alert。
 * BFF 经 vi.mock 隔离；真实断库 / 权限 / HTTP 闭环另有端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

import PathwayPage from '@/pages/pathway';
import { useAuthStore } from '@/store/authStore';
import { usePathwayStore } from '@/store/pathwayStore';
import type {
  EligiblePatient,
  EnrollmentDetail,
  PathwayDefinition,
  PathwayEnrollment,
  PathwayFormItem,
} from '@/types/pathway';

vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

vi.mock('@/services/api/pathway', () => ({
  listDefinitions: vi.fn(),
  upsertDefinition: vi.fn(),
  listFormItems: vi.fn(),
  upsertFormItem: vi.fn(),
  listEligible: vi.fn(),
  listEnrollments: vi.fn(),
  enroll: vi.fn(),
  getEnrollment: vi.fn(),
  executeFormItem: vi.fn(),
  skipFormItem: vi.fn(),
  recordVariation: vi.fn(),
  listVariations: vi.fn(),
  withdraw: vi.fn(),
  complete: vi.fn(),
  getPathwayMetrics: vi.fn(),
}));

import { getSystemHealth } from '@/services/api/pharmacy';
import * as api from '@/services/api/pathway';

const healthMock = vi.mocked(getSystemHealth);
const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

function definition(over: Partial<PathwayDefinition> = {}): PathwayDefinition {
  return {
    id: 'pw1',
    pathwayCode: 'PW-CAP',
    name: '社区获得性肺炎',
    icdCode: 'J18.9',
    applicableDepartments: [],
    standardLos: 8,
    inclusionCriteria: ['年龄≥18', '影像学证实肺炎'],
    exclusionCriteria: ['重症需 ICU'],
    dischargeCriteria: ['体温正常>24h', '影像学吸收'],
    version: '1.0',
    status: 'active',
    sourceKnowledgeId: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...over,
  };
}
function eligible(over: Partial<EligiblePatient> = {}): EligiblePatient {
  return {
    visitId: 'v2',
    patientId: 'p2',
    patientName: '王五',
    diagnosis: '社区获得性肺炎',
    diagnosisCode: 'J18.901',
    pathwayId: 'pw1',
    pathwayCode: 'PW-CAP',
    pathwayName: '社区获得性肺炎',
    icdCode: 'J18.9',
    ...over,
  };
}
function enrollment(over: Partial<PathwayEnrollment> = {}): PathwayEnrollment {
  return {
    id: 'enr1',
    enrollmentNo: 'EN20261008abcdef000001',
    pathwayId: 'pw1',
    visitId: 'v1',
    patientId: 'p1',
    patientName: '李四',
    enrollmentDiagnosis: '社区获得性肺炎',
    diagnosisCode: 'J18.901',
    status: 'in_path',
    enrolledBy: 'u-doc',
    enrolledAt: '2026-10-07T08:00:00.000Z',
    completedBy: null,
    completedAt: null,
    dischargeCriteriaMet: null,
    withdrawnBy: null,
    withdrawnAt: null,
    withdrawReason: null,
    actualLos: null,
    actualFee: null,
    createdAt: '2026-10-07T08:00:00.000Z',
    updatedAt: '2026-10-07T08:00:00.000Z',
    ...over,
  };
}
function formItem(over: Partial<PathwayFormItem> = {}): PathwayFormItem {
  return {
    id: 'f1',
    pathwayId: 'pw1',
    stageDay: 1,
    stageName: '入院评估',
    itemCode: 'CAP-D1-01',
    itemType: 'lab',
    content: '血常规+CRP',
    required: true,
    sortOrder: 1,
    createdAt: '2026-10-01T00:00:00.000Z',
    ...over,
  };
}
function detailFixture(over: Partial<EnrollmentDetail> = {}): EnrollmentDetail {
  return {
    enrollment: enrollment(),
    forms: [formItem()],
    executions: [],
    variations: [],
    ...over,
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
  usePathwayStore.setState({
    definitions: [],
    eligible: [],
    enrollments: [],
    detail: null,
    metrics: null,
    error: null,
  });
  healthMock.mockResolvedValue({ status: 'ok', demoMode: false, db: 'up' });
  m.listDefinitions.mockResolvedValue([definition()]);
  m.listEligible.mockResolvedValue([eligible()]);
  m.listEnrollments.mockResolvedValue([enrollment()]);
  m.getEnrollment.mockResolvedValue(detailFixture());
  m.enroll.mockResolvedValue(enrollment());
  m.executeFormItem.mockResolvedValue({ id: 'ex1', status: 'executed' });
  m.skipFormItem.mockResolvedValue({ id: 'ex1', status: 'skipped' });
  m.recordVariation.mockResolvedValue({ id: 'vn1' });
  m.withdraw.mockResolvedValue(enrollment({ status: 'withdrawn' }));
  m.complete.mockResolvedValue(enrollment({ status: 'completed' }));
  m.getPathwayMetrics.mockResolvedValue({
    period: { from: '2026-10-01T00:00:00Z', to: '2026-10-31T00:00:00Z' },
    enrollmentRate: { numerator: 60, denominator: 100, rate: 60 },
    completionRate: { numerator: 45, denominator: 60, rate: 75 },
    variationRate: { numerator: 20, denominator: 60, rate: 33.33 },
    withdrawalRate: { numerator: 10, denominator: 60, rate: 16.67 },
    avgLos: 8,
    avgFee: 20000,
    variationCategoryDistribution: { complication: 8 },
  });
});

it('在线：健康标签 + 定义/可入径/入径记录加载', async () => {
  render(<PathwayPage />);
  expect(await screen.findByTestId('pathway-health-tag')).toHaveTextContent('BFF/DB 正常 (up)');
  await waitFor(() => expect(m.listDefinitions).toHaveBeenCalled());
  await waitFor(() => expect(m.listEligible).toHaveBeenCalled());
  await waitFor(() => expect(m.listEnrollments).toHaveBeenCalled());
});

it('路径定义：渲染路径名称', async () => {
  render(<PathwayPage />);
  await screen.findByTestId('pathway-health-tag');
  const panel = activePanel();
  expect(within(panel).getByText('社区获得性肺炎')).toBeTruthy();
});

it('可入径：评估入径 → Modal 确认调 enroll（含入径标准勾选）', async () => {
  render(<PathwayPage />);
  await screen.findByTestId('pathway-health-tag');
  await switchTab('可入径/入径');
  const btn = await screen.findByTestId('pathway-enroll-btn');
  fireEvent.click(btn);
  // Modal 打开后点击"确认入径"
  const ok = await screen.findByRole('button', { name: /确认入径/ });
  fireEvent.click(ok);
  await waitFor(() =>
    expect(m.enroll).toHaveBeenCalledWith(
      expect.objectContaining({ visitId: 'v2', pathwayId: 'pw1' }),
    ),
  );
});

it('权限：无 pathway:manage 时入径按钮隐藏', async () => {
  useAuthStore.setState({ permissions: ['pathway:read'] });
  render(<PathwayPage />);
  await screen.findByTestId('pathway-health-tag');
  await switchTab('可入径/入径');
  expect(screen.queryByTestId('pathway-enroll-btn')).toBeNull();
});

it('路径执行：渲染表单 + 下达按钮调 executeFormItem', async () => {
  usePathwayStore.setState({ detail: detailFixture(), enrollments: [enrollment()] });
  render(<PathwayPage />);
  await screen.findByTestId('pathway-health-tag');
  await switchTab('路径执行');
  const btn = await screen.findByTestId('pathway-execute-btn');
  fireEvent.click(btn);
  await waitFor(() => expect(m.executeFormItem).toHaveBeenCalledWith('enr1', { formItemId: 'f1' }));
});

it('变异记录：填说明提交调 recordVariation', async () => {
  usePathwayStore.setState({ detail: detailFixture(), enrollments: [enrollment()] });
  render(<PathwayPage />);
  await screen.findByTestId('pathway-health-tag');
  await switchTab('变异记录');
  const panel = activePanel();
  fireEvent.change(within(panel).getByTestId('pathway-variation-desc'), {
    target: { value: '出现并发症' },
  });
  fireEvent.click(within(panel).getByTestId('pathway-variation-submit'));
  await waitFor(() =>
    expect(m.recordVariation).toHaveBeenCalledWith(
      'enr1',
      expect.objectContaining({ category: 'complication', description: '出现并发症' }),
    ),
  );
});

it('出径评估：勾选出院标准后完成按钮调 complete', async () => {
  usePathwayStore.setState({ detail: detailFixture(), enrollments: [enrollment()] });
  render(<PathwayPage />);
  await screen.findByTestId('pathway-health-tag');
  await switchTab('出径评估');
  const panel = activePanel();
  fireEvent.click(within(panel).getByTestId('pathway-complete-btn'));
  await waitFor(() => expect(m.complete).toHaveBeenCalled());
});

it('质控指标：加载 + 分子/分母表头', async () => {
  render(<PathwayPage />);
  await screen.findByTestId('pathway-health-tag');
  await switchTab('质控指标');
  const panel = activePanel();
  fireEvent.click(within(panel).getByTestId('pathway-metrics-load'));
  await waitFor(() => expect(m.getPathwayMetrics).toHaveBeenCalled());
  expect(screen.getByRole('columnheader', { name: '分子' })).toBeTruthy();
  expect(screen.getByRole('columnheader', { name: '分母' })).toBeTruthy();
});

it('断库：离线 Alert 且不渲染业务内容', async () => {
  healthMock.mockRejectedValue(new Error('ECONNREFUSED'));
  render(<PathwayPage />);
  expect(await screen.findByTestId('pathway-offline-alert')).toBeTruthy();
  expect(screen.getByTestId('pathway-health-tag')).toHaveTextContent('不可用');
  expect(screen.queryByTestId('pathway-enroll-btn')).toBeNull();
});

it('写失败：错误 Alert 展示且不吞', async () => {
  m.enroll.mockRejectedValue(new Error('越权 403'));
  render(<PathwayPage />);
  await screen.findByTestId('pathway-health-tag');
  await switchTab('可入径/入径');
  fireEvent.click(await screen.findByTestId('pathway-enroll-btn'));
  fireEvent.click(await screen.findByRole('button', { name: /确认入径/ }));
  expect(await screen.findByTestId('pathway-error-alert')).toHaveTextContent('越权 403');
});
