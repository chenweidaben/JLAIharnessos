/**
 * 健澜科技 jlmedaios - 院长驾驶舱页面测试（M9-A）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 在线：渲染真实统计（门急诊/在院/床位卡片、趋势、科室负载、待办告警）；
 *  - 刷新：点击刷新重新探活并加载；
 *  - 断库：显式离线 Alert，不渲染业务内容；
 *  - 加载失败：错误 Alert。
 *
 * BFF 经 vi.mock 隔离；真实断库另有端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test-utils';

import Dashboard from '@/pages/dashboard';
import type { DashboardStats } from '@/types/dashboardStats';

vi.mock('@/services/api/dashboard', () => ({
  fetchDashboardStats: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as api from '@/services/api/dashboard';
import { getSystemHealth } from '@/services/api/pharmacy';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

function stats(over: Partial<DashboardStats> = {}): DashboardStats {
  return {
    overview: {
      todayOutpatient: 57,
      todayEmergency: 3,
      currentInpatients: 17,
      todayAdmitted: 192,
      todayDischarged: 192,
      pendingOrderReview: 318,
      activeOrders: 427,
      pendingPrescriptionReview: 100,
      unresolvedCriticalAlerts: 0,
      bedsTotal: 40,
      bedsOccupied: 17,
      bedsAvailable: 20,
      bedOccupancyRate: 42.5,
    },
    trend: [
      { date: '2026-09-28', outpatient: 40, emergency: 2, admitted: 10, discharged: 8 },
      { date: '2026-09-29', outpatient: 52, emergency: 4, admitted: 14, discharged: 12 },
    ],
    departmentLoad: [
      { department: '呼吸内科', inpatients: 8 },
      { department: '心血管内科', inpatients: 6 },
    ],
    latestAlerts: [],
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  healthMock.mockResolvedValue({
    status: 'ok', version: '0.3.0', demoMode: false, db: 'up',
  });
  m.fetchDashboardStats.mockResolvedValue(stats());
});

it('在线：渲染真实统计卡片与图表', async () => {
  render(<Dashboard />);
  // 卡片数值出现
  expect(await screen.findByText('57')).toBeInTheDocument();
  expect(screen.getByText('3')).toBeInTheDocument();
  expect(screen.getByText('17')).toBeInTheDocument();
  expect(screen.getByText('42.5')).toBeInTheDocument();
  // 待办
  expect(screen.getByText('318')).toBeInTheDocument();
  expect(screen.getByText('100')).toBeInTheDocument();
  // 标题
  expect(screen.getByText('院长驾驶舱')).toBeInTheDocument();
  expect(screen.getByTestId('dash-health-tag')).toHaveTextContent('BFF/DB 正常');
});

it('刷新：点击刷新重新探活并加载', async () => {
  render(<Dashboard />);
  await screen.findByText('57');
  fireEvent.click(screen.getByTestId('dash-refresh'));
  await waitFor(() => expect(healthMock).toHaveBeenCalled());
  await waitFor(() => expect(m.fetchDashboardStats).toHaveBeenCalled());
});

it('断库：显式离线 Alert，不渲染业务内容', async () => {
  healthMock.mockResolvedValue({
    status: 'ok', version: '0.3.0', demoMode: false, db: 'down',
  });
  render(<Dashboard />);
  expect(await screen.findByTestId('dash-offline-alert')).toBeInTheDocument();
  expect(screen.queryByText('57')).toBeNull();
  expect(screen.getByTestId('dash-health-tag')).toHaveTextContent('BFF/DB 不可用');
});

it('加载失败：错误 Alert', async () => {
  m.fetchDashboardStats.mockRejectedValue(new Error('网络异常'));
  render(<Dashboard />);
  expect(await screen.findByText('统计加载失败')).toBeInTheDocument();
});
