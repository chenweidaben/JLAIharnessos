/* ============================================================================
 * 健澜科技杠OS - 数据治理页面测试（M5-E）
 *
 * 覆盖：
 *  - 在线：评分统计、趋势/结果/规则/分级 Tab 渲染；
 *  - 执行质量检测、扫描分级、人工修正分级（Modal 留痕）；
 *  - 失败样本展开；
 *  - 断库：显式离线 Alert，不渲染业务内容。
 *
 * BFF 经 vi.mock 隔离；真实断库/HTTP 另有端到端取证。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/
import { it as vitestIt, expect, beforeEach, vi } from 'vitest';
import type { TestFunction } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test-utils';

// 重型页面（健康门禁 + 异步渲染）：提至 30s 避免计时抖动。
const it = (name: string, fn: TestFunction) =>
  vitestIt(name, fn, 30000);

import DataGovernancePage from '@/pages/dataGovernance';
import { useDataGovernanceStore } from '@/store/dataGovernanceStore';
import type {
  ClassificationView,
  DqRuleView,
  QualityRunSummary,
  QualityRunView,
  RuleResultView,
} from '@/types/dataGovernance';

vi.mock('@/services/api/dataGovernance', () => ({
  runQualityCheckApi: vi.fn(),
  fetchLatestRun: vi.fn(),
  fetchQualityTrend: vi.fn(),
  fetchRunResults: vi.fn(),
  fetchRules: vi.fn(),
  scanClassificationApi: vi.fn(),
  fetchClassification: vi.fn(),
  overrideClassificationApi: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as api from '@/services/api/dataGovernance';
import { getSystemHealth } from '@/services/api/pharmacy';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

function qrun(over: Partial<QualityRunView> = {}): QualityRunView {
  return {
    runId: 'run1',
    status: 'success',
    totalRules: 15,
    passedRules: 14,
    failedRules: 1,
    score: 93.33,
    startedAt: '2026-10-01T08:00:00.000Z',
    finishedAt: '2026-10-01T08:00:01.000Z',
    ...over,
  };
}

function result(over: Partial<RuleResultView> = {}): RuleResultView {
  return {
    ruleCode: 'PAT_MRN_NOT_NULL',
    ruleName: '患者MRN非空',
    dimension: 'completeness',
    severity: 'critical',
    target: 'clinical.patients.mrn',
    totalRows: 100,
    passedRows: 100,
    failedRows: 0,
    passRate: 100,
    status: 'pass',
    failedSample: [],
    ...over,
  };
}

function rule(over: Partial<DqRuleView> = {}): DqRuleView {
  return {
    ruleCode: 'PAT_MRN_NOT_NULL',
    ruleName: '患者MRN非空',
    dimension: 'completeness',
    targetSchema: 'clinical',
    targetTable: 'patients',
    targetColumn: 'mrn',
    checkType: 'not_null',
    params: {},
    severity: 'critical',
    enabled: true,
    ...over,
  };
}

function classification(over: Partial<ClassificationView> = {}): ClassificationView {
  return {
    schemaName: 'clinical',
    tableName: 'patients',
    columnName: 'id_card_hash',
    level: 4,
    source: 'auto',
    reason: '患者标识信息：居民身份证号码',
    overriddenByName: null,
    updatedAt: '2026-10-01T08:00:00.000Z',
    ...over,
  };
}

function healthUp() {
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.5.0',
    demoMode: false,
    db: 'up',
  });
}

function summary(over: Partial<QualityRunSummary> = {}): QualityRunSummary {
  return {
    ...qrun(),
    results: [result()],
    ...over,
  } as QualityRunSummary;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Zustand store 是模块级单例，重置到初始状态，避免测试间状态污染。
  useDataGovernanceStore.setState({
    health: null,
    dbUp: false,
    healthChecking: false,
    latestRun: null,
    trend: [],
    detailRun: null,
    detailResults: [],
    rules: [],
    classification: [],
    lastSummary: null,
    loading: false,
    running: false,
    error: null,
  });
  healthUp();
  m.fetchLatestRun.mockResolvedValue(qrun());
  m.fetchQualityTrend.mockResolvedValue([qrun()]);
  m.fetchRunResults.mockResolvedValue({
    run: qrun(),
    results: [result()],
  });
  m.fetchRules.mockResolvedValue([rule()]);
  m.fetchClassification.mockResolvedValue([classification()]);
  m.runQualityCheckApi.mockResolvedValue(summary());
  m.scanClassificationApi.mockResolvedValue({ scanned: 50, classified: 50 });
  m.overrideClassificationApi.mockResolvedValue({
    ...classification(),
    level: 2,
    source: 'manual',
  });
});

async function waitOnline() {
  return screen.findByTestId('gov-content');
}

it('在线：渲染评分统计与初始趋势 Tab', async () => {
  render(<DataGovernancePage />);
  await waitOnline();
  expect(screen.getByText('最新质量评分')).toBeInTheDocument();
  expect(screen.getByText('93.33')).toBeInTheDocument();
  // 通过规则 14（统计卡片）
  expect(screen.getByText('通过规则')).toBeInTheDocument();
  expect(screen.getByText('已分级字段')).toBeInTheDocument();
});

it('切换 Tab：检测结果渲染', async () => {
  render(<DataGovernancePage />);
  await waitOnline();
  // 趋势行的「查看结果」按钮
  fireEvent.click(screen.getByRole('button', { name: '查看结果' }));
  expect(await screen.findByText('PAT_MRN_NOT_NULL')).toBeInTheDocument();
  expect(screen.getByText('clinical.patients.mrn')).toBeInTheDocument();
});

it('切换 Tab：质量规则渲染', async () => {
  render(<DataGovernancePage />);
  await waitOnline();
  fireEvent.click(screen.getByText('质量规则'));
  expect(await screen.findByText('not_null')).toBeInTheDocument();
});

it('切换 Tab：隐私分级台账渲染', async () => {
  render(<DataGovernancePage />);
  await waitOnline();
  fireEvent.click(screen.getByText('隐私分级台账'));
  expect(await screen.findByText('id_card_hash')).toBeInTheDocument();
});

it('执行质量检测：点击触发 runQualityCheckApi', async () => {
  render(<DataGovernancePage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: /执行质量检测/ }));
  await waitFor(() => expect(m.runQualityCheckApi).toHaveBeenCalled());
});

it('扫描分级：点击触发 scanClassificationApi', async () => {
  render(<DataGovernancePage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: /扫描隐私分级/ }));
  await waitFor(() => expect(m.scanClassificationApi).toHaveBeenCalled());
});

it('人工修正分级：Modal 打开并保存留痕', async () => {
  render(<DataGovernancePage />);
  await waitOnline();
  fireEvent.click(screen.getByText('隐私分级台账'));
  // 等待行内修正按钮
  const editBtn = await screen.findByRole('button', { name: '修正分级' });
  fireEvent.click(editBtn);
  // Modal 出现
  expect(await screen.findByText('人工修正字段分级')).toBeInTheDocument();
  // 填写依据
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: '测试修正依据' },
  });
  fireEvent.click(screen.getByRole('button', { name: '保存（留痕）' }));
  await waitFor(() =>
    expect(m.overrideClassificationApi).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaName: 'clinical',
        tableName: 'patients',
        columnName: 'id_card_hash',
        reason: '测试修正依据',
      }),
    ),
  );
});

it('失败样本：有失败样本时可展开', async () => {
  const failed = result({
    ruleCode: 'PAT_GENDER_VALID',
    failedRows: 2,
    passRate: 98,
    status: 'fail',
    failedSample: [{ mrn: 'M001', gender: 'X' }],
  });
  m.fetchRunResults.mockResolvedValue({ run: qrun(), results: [failed] });
  render(<DataGovernancePage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: '查看结果' }));
  const code = await screen.findByText('PAT_GENDER_VALID');
  expect(code).toBeInTheDocument();
  // 点击展开按钮（antd 表格展开图标）
  const expandBtns = document.querySelectorAll('.ant-table-row-expand-icon');
  fireEvent.click(expandBtns[expandBtns.length - 1]);
  expect(await screen.findByTestId('failed-sample')).toBeInTheDocument();
});

it('全数据丰富渲染：所有 Tab 的维度/严重级/状态/分级/手动分支全覆盖', async () => {
  // 高分 latestRun（覆盖 scoreColor 高分分支）
  m.fetchLatestRun.mockResolvedValue(qrun({ runId: 'r0', score: 98, passedRules: 15, failedRules: 0 }));
  // 趋势：覆盖 95+/85+/<85 三档
  m.fetchQualityTrend.mockResolvedValue([
    qrun({ runId: 'r1', score: 98 }),
    qrun({ runId: 'r2', score: 90 }),
    qrun({ runId: 'r3', score: 80, failedRules: 2, passedRules: 13 }),
  ]);
  // 丰富结果：五维 + 三严重级 + pass/fail
  m.fetchRunResults.mockResolvedValue({
    run: qrun({ runId: 'r0', score: 98 }),
    results: [
      result({ ruleCode: 'C1', dimension: 'completeness', severity: 'critical', status: 'pass' }),
      result({ ruleCode: 'C2', dimension: 'uniqueness', severity: 'major', status: 'fail', failedRows: 1, failedSample: [{ x: 1 }] }),
      result({ ruleCode: 'C3', dimension: 'validity', severity: 'minor', status: 'pass' }),
      result({ ruleCode: 'C4', dimension: 'consistency', severity: 'major', status: 'pass' }),
      result({ ruleCode: 'C5', dimension: 'timeliness', severity: 'minor', status: 'pass' }),
    ],
  });
  // 丰富规则：有/无 targetColumn + enabled true/false
  m.fetchRules.mockResolvedValue([
    rule({ ruleCode: 'C1', dimension: 'completeness', targetColumn: 'mrn', enabled: true }),
    rule({ ruleCode: 'C2', dimension: 'uniqueness', targetColumn: null, enabled: false, checkType: 'unique' }),
    rule({ ruleCode: 'C3', dimension: 'validity', targetColumn: 'gender', enabled: true }),
  ]);
  // 丰富分类：L1-L4 + manual/auto + 有/无 reason
  m.fetchClassification.mockResolvedValue([
    classification({ columnName: 'name', level: 4, source: 'auto' }),
    classification({ columnName: 'note', level: 1, source: 'auto' }),
    classification({ columnName: 'dept', level: 2, source: 'auto' }),
    classification({ columnName: 'dx', level: 3, source: 'auto' }),
    classification({
      columnName: 'blood', level: 2, source: 'manual',
      reason: '人工修正依据', overriddenByName: '管理员',
    }),
  ]);

  render(<DataGovernancePage />);
  await waitOnline();
  // 等待初始 loadOverview + loadClassification 完成（探针验证约 300ms）。
  await new Promise((r) => setTimeout(r, 300));
  // 切到检测结果（初始为空，触发懒加载）
  fireEvent.click(screen.getByRole('tab', { name: '检测结果' }));
  await waitFor(() => expect(m.fetchRunResults).toHaveBeenCalled());
  expect(await screen.findByText('C1')).toBeInTheDocument();
  // 切到规则
  fireEvent.click(screen.getByRole('tab', { name: '质量规则' }));
  expect(await screen.findByText('unique')).toBeInTheDocument();
  // 切到分级台账
  fireEvent.click(screen.getByRole('tab', { name: '隐私分级台账' }));
  expect(await screen.findByText('blood')).toBeInTheDocument();
  // 手动记录的修正人/依据
  expect(screen.getByText('管理员')).toBeInTheDocument();
  // 点击有 reason 的手动记录的修正按钮（覆盖 reason 非空分支）
  const rows = screen.getAllByRole('button', { name: '修正分级' });
  fireEvent.click(rows[rows.length - 1]);
  expect(await screen.findByText('人工修正字段分级')).toBeInTheDocument();
  // 表单中 reason 已带入
  expect(screen.getByDisplayValue('人工修正依据')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }));
});

it('加载规则按钮：点击触发 loadRules 并切到规则 Tab', async () => {
  render(<DataGovernancePage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: '加载规则' }));
  expect(await screen.findByText('not_null')).toBeInTheDocument();
});

it('执行检测失败：显示错误 Alert，关闭后消失', async () => {
  m.runQualityCheckApi.mockRejectedValue(new Error('检测服务异常'));
  render(<DataGovernancePage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: /执行质量检测/ }));
  expect(await screen.findByText('检测服务异常')).toBeInTheDocument();
  // 关闭 Alert
  const closeBtn = document.querySelector('.ant-alert-close-icon');
  expect(closeBtn).toBeTruthy();
  fireEvent.click(closeBtn!);
  await waitFor(() =>
    expect(screen.queryByText('检测服务异常')).toBeNull(),
  );
});

it('修正 Modal：点击取消关闭', async () => {
  render(<DataGovernancePage />);
  await waitOnline();
  fireEvent.click(screen.getByText('隐私分级台账'));
  const editBtn = await screen.findByRole('button', { name: '修正分级' });
  fireEvent.click(editBtn);
  expect(await screen.findByText('人工修正字段分级')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }));
  // antd Modal 关闭后节点保留（display:none），断言标题不可见而非移除。
  await waitFor(() =>
    expect(
      screen.queryByText('人工修正字段分级'),
    ).not.toBeVisible(),
  );
});

it('断库恢复：点击刷新，DB 恢复后加载内容', async () => {
  // 初始断库
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.5.0',
    demoMode: false,
    db: 'down',
  });
  render(<DataGovernancePage />);
  expect(await screen.findByTestId('gov-offline-alert')).toBeInTheDocument();
  // 点击 Alert 中的刷新（此时仍断库）
  fireEvent.click(screen.getByRole('button', { name: /刷\s*新/ }));
  // 模拟 DB 恢复
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.5.0',
    demoMode: false,
    db: 'up',
  });
  fireEvent.click(screen.getByRole('button', { name: /刷\s*新/ }));
  expect(await screen.findByTestId('gov-content')).toBeInTheDocument();
});

it('断库：显式离线 Alert，不渲染业务内容', async () => {
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.5.0',
    demoMode: false,
    db: 'down',
  });
  render(<DataGovernancePage />);
  expect(await screen.findByTestId('gov-offline-alert')).toBeInTheDocument();
  expect(screen.queryByTestId('gov-content')).toBeNull();
  expect(screen.getByTestId('gov-health-tag')).toHaveTextContent(
    'BFF/DB 不可用',
  );
});
