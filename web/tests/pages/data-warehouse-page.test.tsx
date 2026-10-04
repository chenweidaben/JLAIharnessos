/* ============================================================================
 * 健澜科技杠OS - 数据湖仓页面测试（M5-D）
 *
 * 覆盖：
 *  - 在线：指标/汇总/运行/血缘 Tab 渲染、统计数据；
 *  - 增量/全量加工、单作业重跑：点击触发对应 API；
 *  - 加工结果展示；
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
  vitestIt(name, fn, 60000);

import DataWarehousePage from '@/pages/dataWarehouse';
import type {
  DeptDailySummaryView,
  HospitalDailyMetricView,
  JobRunView,
  LineageView,
} from '@/types/dataWarehouse';

vi.mock('@/services/api/dataWarehouse', () => ({
  runPipelineApi: vi.fn(),
  runJobApi: vi.fn(),
  fetchJobRuns: vi.fn(),
  fetchLineage: vi.fn(),
  fetchHospitalMetrics: vi.fn(),
  fetchDeptSummary: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as api from '@/services/api/dataWarehouse';
import { getSystemHealth } from '@/services/api/pharmacy';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

function metric(over: Partial<HospitalDailyMetricView> = {}): HospitalDailyMetricView {
  return {
    statDate: '2026-10-01',
    outpatientVisits: 100,
    inpatientVisits: 200,
    emergencyVisits: 10,
    totalVisits: 310,
    totalRevenue: 5000,
    avgFeePerVisit: 16.13,
    ...over,
  };
}

function dept(over: Partial<DeptDailySummaryView> = {}): DeptDailySummaryView {
  return {
    statDate: '2026-10-01',
    department: '内科',
    visitType: 'outpatient',
    visitCount: 50,
    feeTotal: 1000,
    ...over,
  };
}

function run(over: Partial<JobRunView> = {}): JobRunView {
  return {
    runId: 'run1',
    jobCode: 'dwd_visit',
    runMode: 'incremental',
    status: 'success',
    rowsRead: 0,
    rowsWritten: 0,
    watermarkFrom: null,
    watermarkTo: '2026-10-01T08:00:00.000Z',
    errorMessage: null,
    startedAt: '2026-10-01T08:00:00.000Z',
    finishedAt: '2026-10-01T08:00:01.000Z',
    ...over,
  };
}

function lineage(over: Partial<LineageView> = {}): LineageView {
  return {
    id: 'lin1',
    jobCode: 'dwd_visit',
    sourceTable: 'clinical.visits',
    targetTable: 'dwd.visit_detail',
    transformation: '就诊明细抽取',
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

beforeEach(() => {
  vi.clearAllMocks();
  healthUp();
  m.fetchHospitalMetrics.mockResolvedValue([metric()]);
  m.fetchDeptSummary.mockResolvedValue([dept()]);
  m.fetchJobRuns.mockResolvedValue([run()]);
  m.fetchLineage.mockResolvedValue([lineage()]);
  m.runPipelineApi.mockResolvedValue({
    mode: 'incremental',
    jobs: [{ jobCode: 'dwd_visit', rowsRead: 0, rowsWritten: 0 }],
  });
  m.runJobApi.mockResolvedValue({
    mode: 'incremental',
    jobs: [{ jobCode: 'dws_dept_daily', rowsRead: 1, rowsWritten: 1 }],
  });
});

async function waitOnline() {
  return screen.findByTestId('dw-content');
}

it('在线：渲染指标 Tab 与统计数据', async () => {
  render(<DataWarehousePage />);
  await waitOnline();
  expect(screen.getByText('院级日指标')).toBeInTheDocument();
  // 310 同时出现在统计卡片与表格中
  expect(screen.getAllByText('310').length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText('5000.00')).toBeInTheDocument();
});

it('切换 Tab：科室汇总渲染', async () => {
  render(<DataWarehousePage />);
  await waitOnline();
  fireEvent.click(screen.getByText('科室日汇总'));
  expect(await screen.findByText('内科')).toBeInTheDocument();
});

it('切换 Tab：运行历史渲染', async () => {
  render(<DataWarehousePage />);
  await waitOnline();
  fireEvent.click(screen.getByText('作业运行历史'));
  // DWD 就诊明细同时出现在单作业重跑按钮与表格中
  const matches = await screen.findAllByText('DWD 就诊明细');
  expect(matches.length).toBeGreaterThanOrEqual(2);
});

it('切换 Tab：血缘渲染', async () => {
  render(<DataWarehousePage />);
  await waitOnline();
  fireEvent.click(screen.getByText('数据血缘'));
  expect(await screen.findByText('clinical.visits')).toBeInTheDocument();
  expect(screen.getByText('dwd.visit_detail')).toBeInTheDocument();
});

it('增量加工：点击触发 runPipelineApi(incremental)', async () => {
  render(<DataWarehousePage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: /增量加工/ }));
  await waitFor(() =>
    expect(m.runPipelineApi).toHaveBeenCalledWith('incremental'),
  );
});

it('全量加工：点击触发 runPipelineApi(full)', async () => {
  render(<DataWarehousePage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: /全量重算/ }));
  await waitFor(() => expect(m.runPipelineApi).toHaveBeenCalledWith('full'));
});

it('单作业重跑：点击触发 runJobApi', async () => {
  render(<DataWarehousePage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: /DWS 科室日汇总/ }));
  await waitFor(() =>
    expect(m.runJobApi).toHaveBeenCalledWith('dws_dept_daily'),
  );
});

it('加工完成：展示结果提示', async () => {
  render(<DataWarehousePage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: /增量加工/ }));
  expect(await screen.findByTestId('dw-last-run')).toBeInTheDocument();
});

it('断库：显式离线 Alert，不渲染业务内容', async () => {
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.5.0',
    demoMode: false,
    db: 'down',
  });
  render(<DataWarehousePage />);
  expect(await screen.findByTestId('dw-offline-alert')).toBeInTheDocument();
  expect(screen.queryByTestId('dw-content')).toBeNull();
  expect(screen.getByTestId('dw-health-tag')).toHaveTextContent(
    'BFF/DB 不可用',
  );
});
