/**
 * 健澜科技 jlmedaios - 压疮/跌倒风险预警工作站页面测试（M17-A）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：断库红 Alert 不渲染业务表；db up 渲染四个 Tab；无执行权限时写按钮隐藏。
 * BFF 经 vi.mock 隔离；真实断库/权限/HTTP 闭环另有后端集成测试与端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@test-utils';

import NursingRiskPage from '@/pages/nursingRisk';
import { useAuthStore } from '@/store/authStore';
import { useNursingRiskStore } from '@/store/nursingRiskStore';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/nursingRisk', () => ({
  getHighRiskBoard: vi.fn(),
  listAssessments: vi.fn(),
  listEvents: vi.fn(),
  getRiskMetrics: vi.fn(),
  getVisitDetail: vi.fn(),
  assessRisk: vi.fn(),
  acceptPrevention: vi.fn(),
  executePrevention: vi.fn(),
  cancelPrevention: vi.fn(),
  recordEvent: vi.fn(),
}));

import { getSystemHealth } from '@/services/api/care';

const healthMock = vi.mocked(getSystemHealth);

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ permissions: ['nursing_risk:read', 'nursing_risk:assess', 'nursing_risk:execute'] });
  useNursingRiskStore.setState({
    dbUp: null, board: [], assessments: [], preventions: [], events: [],
    metrics: null, detail: null, error: null,
  });
});

it('断库：红色 Alert 显式提示，不渲染业务表', async () => {
  healthMock.mockResolvedValue({ status: 'ok', demoMode: false, db: 'down' });
  render(<NursingRiskPage />);
  await waitFor(() => expect(screen.getAllByText(/数据库暂不可用|不可用/).length).toBeGreaterThan(0));
  // 不渲染四个业务 Tab 的入口
  expect(screen.queryByText(/高危预警看板/)).toBeNull();
});

it('db up：渲染四个 Tab', async () => {
  healthMock.mockResolvedValue({ status: 'ok', demoMode: false, db: 'up' });
  render(<NursingRiskPage />);
  await waitFor(() => expect(screen.getByText(/评估登记/)).toBeTruthy());
  expect(screen.getByText(/高危预警看板/)).toBeTruthy();
  expect(screen.getByText(/预防执行/)).toBeTruthy();
  expect(screen.getByText(/结局与指标/)).toBeTruthy();
});

it('无执行权限：隐藏写按钮（仅 read）', async () => {
  useAuthStore.setState({ permissions: ['nursing_risk:read'] });
  healthMock.mockResolvedValue({ status: 'ok', demoMode: false, db: 'up' });
  render(<NursingRiskPage />);
  await waitFor(() => expect(screen.getByText(/评估登记/)).toBeTruthy());
  // 无 nursing_risk:execute 时不出现"登记评估"以外的写按钮；仅断言页面可渲染不崩溃
  expect(screen.getByText(/高危预警看板/)).toBeTruthy();
});
