/**
 * 健澜科技 jlmedaios - 满意度评价页面测试（M3-O）
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 覆盖：
 *  - 在线：统计 Tab（总数/平均/好评率）、维度表、明细表；
 *  - 来源切换（门诊/住院/问诊）；
 *  - 演示 Tab 提示；
 *  - 断库：离线 Alert，不渲染业务内容。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@test-utils';

import SatisfactionPage from '@/pages/satisfaction';

vi.mock('@/services/api/system', () => ({
  systemApi: { health: vi.fn() },
}));
vi.mock('@/services/api/satisfaction', () => ({
  submitMySurveyApi: vi.fn(),
  submitSurveyByStaffApi: vi.fn(),
  listMySurveysApi: vi.fn(),
  listSurveysApi: vi.fn(),
  getSatisfactionStatsApi: vi.fn(),
}));

const mockUser = vi.hoisted(() => ({
  user: {
    id: 'admin1',
    realName: '管理员',
    roleCodes: ['admin'] as string[],
    permissions: ['satisfaction:view'] as string[],
  },
}));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (sel?: (s: { user: typeof mockUser.user }) => unknown) =>
    sel ? sel({ user: mockUser.user }) : mockUser.user,
}));

import { systemApi } from '@/services/api/system';
import {
  listSurveysApi,
  getSatisfactionStatsApi,
} from '@/services/api/satisfaction';

const sysM = vi.mocked(systemApi);

const stats = {
  total: 12,
  overallAvg: 4.55,
  medicalAvg: 4.7,
  serviceAvg: 4.6,
  environmentAvg: 4.4,
  processAvg: 4.3,
  waitAvg: 4.1,
  positiveRate: 91.7,
};

const survey = (over: Record<string, unknown> = {}) => ({
  id: 'sv1',
  surveyNo: 'SV20261001001',
  patientId: 'pt1',
  visitId: 'v1',
  consultId: null,
  sourceType: 'outpatient',
  overallScore: 5,
  medicalScore: 5,
  serviceScore: 5,
  environmentScore: 4,
  processScore: 4,
  waitScore: 4,
  comment: '医生很耐心',
  status: 'submitted',
  submittedBy: 'acc1',
  submittedAt: '2026-10-01T08:00:00Z',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
});

it('在线：统计 Tab 渲染关键指标与表格', async () => {
  sysM.health.mockResolvedValue({ status: 'healthy', db: 'up' } as never);
  vi.mocked(getSatisfactionStatsApi).mockResolvedValue(stats as never);
  vi.mocked(listSurveysApi).mockResolvedValue([survey()] as never);

  render(<SatisfactionPage />);

  await waitFor(() => {
    expect(screen.getByTestId('satisfaction-content')).toBeInTheDocument();
  });

  await waitFor(() => {
    expect(screen.getByTestId('stat-total')).toHaveTextContent('12');
  });
  expect(screen.getByTestId('stat-positive')).toHaveTextContent('91.7');
  // 维度表
  expect(screen.getByText('总体满意度')).toBeInTheDocument();
  expect(screen.getByText('医疗质量')).toBeInTheDocument();
  // 明细表
  expect(screen.getByText('医生很耐心')).toBeInTheDocument();
});

it('来源切换：点击门诊按钮触发重新加载', async () => {
  sysM.health.mockResolvedValue({ status: 'healthy', db: 'up' } as never);
  vi.mocked(getSatisfactionStatsApi).mockResolvedValue(stats as never);
  vi.mocked(listSurveysApi).mockResolvedValue([survey()] as never);

  render(<SatisfactionPage />);
  await waitFor(() => screen.getByTestId('satisfaction-content'));

  const outpatientBtn = screen.getByRole('radio', { name: '门诊' });
  fireEvent.click(outpatientBtn);

  await waitFor(() => {
    expect(getSatisfactionStatsApi).toHaveBeenCalledWith('outpatient');
  });
});

it('演示 Tab：患者评价入口提示', async () => {
  sysM.health.mockResolvedValue({ status: 'healthy', db: 'up' } as never);
  vi.mocked(getSatisfactionStatsApi).mockResolvedValue(stats as never);
  vi.mocked(listSurveysApi).mockResolvedValue([survey()] as never);

  render(<SatisfactionPage />);
  await waitFor(() => screen.getByTestId('satisfaction-content'));

  fireEvent.click(screen.getByRole('tab', { name: /患者评价/ }));
  expect(screen.getByText(/实际患者评价入口/)).toBeInTheDocument();
});

it('断库：离线 Alert，不渲染业务内容', async () => {
  sysM.health.mockResolvedValue({ status: 'healthy', db: 'down' } as never);

  render(<SatisfactionPage />);

  await waitFor(() => {
    expect(screen.getByTestId('satisfaction-offline-alert')).toBeInTheDocument();
  });
  expect(screen.queryByTestId('satisfaction-content')).not.toBeInTheDocument();
});
