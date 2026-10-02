/**
 * 健澜科技 jlmedaios - 科研专病队列页面测试（M5-B）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 在线：队列渲染、新建队列（Modal 表单）、点击打开详情；
 *  - 详情：发布、运行匹配、归档、导出脱敏集；
 *  - 断库：显式离线 Alert，不渲染业务内容。
 *
 * BFF 经 vi.mock 隔离；真实断库/HTTP 另有端到端取证。
 */
import { it as vitestIt, expect, beforeEach, vi } from 'vitest';
import type { TestFunction } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

// 重型页面（健康门禁 + 大量异步渲染）：提至 30s 避免计时抖动。
const it = (name: string, fn: TestFunction) =>
  vitestIt(name, fn, 30000);

import ResearchPage from '@/pages/research';
import type { CohortMember, CohortStats, ResearchCohort } from '@/types/research';

vi.mock('@/services/api/research', () => ({
  fetchCohorts: vi.fn(),
  createCohortApi: vi.fn(),
  fetchCohort: vi.fn(),
  updateCohortApi: vi.fn(),
  publishCohort: vi.fn(),
  archiveCohort: vi.fn(),
  runCohort: vi.fn(),
  fetchCohortMembers: vi.fn(),
  fetchCohortStats: vi.fn(),
  exportCohort: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as api from '@/services/api/research';
import { getSystemHealth } from '@/services/api/pharmacy';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

function cohort(over: Partial<ResearchCohort> = {}): ResearchCohort {
  return {
    id: 'c1',
    name: '2型糖尿病队列',
    disease: '2型糖尿病',
    diseaseCode: 'E11',
    criteria: { include: { minAge: 40 }, exclude: {} },
    status: 'draft',
    createdBy: 'u1',
    lastRunAt: null,
    lastRunAdded: 0,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
    ...over,
  };
}

function stats(): CohortStats {
  return {
    total: 1,
    byGender: { 男: 1 },
    ageBuckets: { '<40': 0, '40-59': 1, '60-74': 0, '≥75': 0, 未知: 0 },
    topTags: [{ tag: '糖尿病', count: 1 }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.3.0',
    demoMode: false,
    db: 'up',
  });
  m.fetchCohorts.mockResolvedValue([cohort(), cohort({ id: 'c2', name: '高血压队列' })]);
  m.fetchCohort.mockResolvedValue(cohort());
  m.fetchCohortMembers.mockResolvedValue([]);
  m.fetchCohortStats.mockResolvedValue(stats());
  m.createCohortApi.mockResolvedValue(cohort({ id: 'c3' }));
  m.publishCohort.mockResolvedValue(cohort({ status: 'active' }));
  m.archiveCohort.mockResolvedValue(cohort({ status: 'archived' }));
  m.runCohort.mockResolvedValue({
    cohortId: 'c1',
    scanned: 100,
    added: 3,
    totalMembers: 3,
  });
  m.exportCohort.mockResolvedValue([{ age: 55, gender: '男' }]);
});

async function waitOnline() {
  return screen.findByTestId('research-content');
}

it('在线：渲染队列列表', async () => {
  render(<ResearchPage />);
  await waitOnline();
  expect(screen.getByText('2型糖尿病队列')).toBeInTheDocument();
  expect(screen.getByText('高血压队列')).toBeInTheDocument();
});

it('新建队列：打开 Modal、填写、提交', async () => {
  render(<ResearchPage />);
  await waitOnline();

  fireEvent.click(screen.getByRole('button', { name: /新建队列/ }));
  const modal = await screen.findByRole('dialog', { name: '新建科研专病队列' });
  fireEvent.change(within(modal).getByPlaceholderText('如 2型糖尿病专病队列'), {
    target: { value: '慢阻肺队列' },
  });
  fireEvent.change(within(modal).getByPlaceholderText('如 2型糖尿病'), {
    target: { value: '慢阻肺' },
  });
  fireEvent.click(within(modal).getByRole('button', { name: /创\s*建/ }));
  await waitFor(() => expect(m.createCohortApi).toHaveBeenCalledTimes(1));
});

it('队列：点击打开详情', async () => {
  render(<ResearchPage />);
  await waitOnline();
  fireEvent.click(screen.getAllByText('打开')[0]);
  expect(await screen.findByText('队列详情 · 2型糖尿病队列')).toBeInTheDocument();
});

it('详情：草稿态发布', async () => {
  render(<ResearchPage />);
  await waitOnline();
  fireEvent.click(screen.getAllByText('打开')[0]);
  await screen.findByText('队列详情 · 2型糖尿病队列');

  fireEvent.click(screen.getByRole('button', { name: /发布/ }));
  await waitFor(() => expect(m.publishCohort).toHaveBeenCalledWith('c1'));
});

it('详情：active 态运行匹配', async () => {
  m.fetchCohort.mockResolvedValue(cohort({ status: 'active' }));
  render(<ResearchPage />);
  await waitOnline();
  fireEvent.click(screen.getAllByText('打开')[0]);
  await screen.findByText('队列详情 · 2型糖尿病队列');

  fireEvent.click(screen.getByRole('button', { name: /运行匹配/ }));
  await waitFor(() => expect(m.runCohort).toHaveBeenCalledWith('c1'));
});

it('详情：归档', async () => {
  render(<ResearchPage />);
  await waitOnline();
  fireEvent.click(screen.getAllByText('打开')[0]);
  await screen.findByText('队列详情 · 2型糖尿病队列');

  fireEvent.click(screen.getByRole('button', { name: /归档/ }));
  await waitFor(() => expect(m.archiveCohort).toHaveBeenCalledWith('c1'));
});

it('详情：导出脱敏集', async () => {
  render(<ResearchPage />);
  await waitOnline();
  fireEvent.click(screen.getAllByText('打开')[0]);
  await screen.findByText('队列详情 · 2型糖尿病队列');

  fireEvent.click(screen.getByRole('button', { name: /导出脱敏集/ }));
  await waitFor(() => expect(m.exportCohort).toHaveBeenCalledWith('c1'));
  expect(await screen.findByText(/脱敏数据集（1 行/)).toBeInTheDocument();
});

it('详情：成员表格渲染（含 MRN/性别/年龄/命中规则）', async () => {
  const member: CohortMember = {
    id: 'm1',
    cohortId: 'c1',
    patientId: 'p1',
    matchedAt: '2026-10-01T08:00:00Z',
    matchedRules: ['年龄≥40', '性别=男'],
    dataSnapshot: { mrn: 'MRN001', gender: '男', age: 55 },
  };
  m.fetchCohortMembers.mockResolvedValue([member]);
  render(<ResearchPage />);
  await waitOnline();
  fireEvent.click(screen.getAllByText('打开')[0]);
  await screen.findByText('队列详情 · 2型糖尿病队列');

  // 成员表格内 render 函数执行
  expect(await screen.findByText('MRN001')).toBeInTheDocument();
  expect(screen.getByText('55')).toBeInTheDocument();
  expect(screen.getByText('年龄≥40')).toBeInTheDocument();
  expect(screen.getByText('性别=男')).toBeInTheDocument();
});

it('断库：显式离线 Alert，不渲染业务内容', async () => {
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.3.0',
    demoMode: false,
    db: 'down',
  });
  render(<ResearchPage />);
  expect(await screen.findByTestId('research-offline-alert')).toBeInTheDocument();
  expect(screen.queryByTestId('research-content')).toBeNull();
  expect(screen.getByTestId('research-health-tag')).toHaveTextContent(
    'BFF/DB 不可用',
  );
});
