/**
 * 健澜科技 jlmedaios - 护理管理后台工作站页面测试（M16-B / M16B_TEST）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：健康标签；断库红 Alert 不渲染业务；排班合规结果展示；无权限写按钮隐藏；
 * 指标人工录入分母校验拦截；未接入数据源显式标注；写失败错误 Alert。
 * BFF 经 vi.mock 隔离；真实断库 / 权限 / HTTP 闭环另有端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test-utils';

import NursingAdminPage from '@/pages/nursingAdmin';
import { useAuthStore } from '@/store/authStore';
import { useNursingAdminStore } from '@/store/nursingAdminStore';
import type { ScheduleBoard, IndicatorLibraryView } from '@/types/nursingAdmin';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/nursingAdmin', () => ({
  getScheduleBoard: vi.fn(),
  upsertShift: vi.fn(),
  assignShift: vi.fn(),
  removeAssignment: vi.fn(),
  createLeave: vi.fn(),
  publishSchedule: vi.fn(),
  getIndicatorLibrary: vi.fn(),
  submitIndicatorEntry: vi.fn(),
  verifyIndicatorEntry: vi.fn(),
}));

import { getSystemHealth } from '@/services/api/care';
import * as api from '@/services/api/nursingAdmin';

const healthMock = vi.mocked(getSystemHealth);
const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

function boardFixture(over: Partial<ScheduleBoard> = {}): ScheduleBoard {
  return {
    wardCode: 'NW1',
    wardName: '内科一病区',
    shifts: [{ id: 's1', wardCode: 'NW1', name: '早班', startTime: '08:00', endTime: '16:00', color: '#fff', isNight: false, hours: 8 }],
    assignments: [
      { id: 'as1', wardCode: 'NW1', nurseId: 'n1', nurseName: '护士甲', date: '2026-10-12', shiftId: 's1', shiftName: '早班', isNight: false, hours: 8 },
    ],
    leaves: [],
    publishes: [{ id: 'pb1', wardCode: 'NW1', period: '2026-10-12', publishedBy: '护士长', publishedAt: '2026-10-05T08:00:00Z' }],
    requiredStaff: { 早班: 1 },
    ...over,
  };
}

function libraryFixture(over: Partial<IndicatorLibraryView> = {}): IndicatorLibraryView {
  return {
    indicators: [
      { code: 'N001', name: '压力性损伤发生率', numeratorDesc: '新发压疮患者数', denominatorDesc: '住院患者总数', unit: '%', direction: 'low_good', frequency: 'month', source: 'manual', target: 5 },
      { code: 'N002', name: '护理不良事件上报及时率', numeratorDesc: '24h内上报数', denominatorDesc: '不良事件总数', unit: '%', direction: 'high_good', frequency: 'month', source: 'auto', target: 95 },
    ],
    entries: [
      { id: 'e1', indicatorCode: 'N001', period: '2026-09', numerator: 2, denominator: 100, value: 2, source: 'manual', verified: false, status: 'draft', recordedAt: '2026-10-01T00:00:00Z' },
    ],
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ permissions: ['*'] });
  useNursingAdminStore.setState({ dbUp: null, board: null, library: null, error: null });
  healthMock.mockResolvedValue({ status: 'ok', demoMode: false, db: 'up' });
  m.getScheduleBoard.mockResolvedValue(boardFixture());
  m.getIndicatorLibrary.mockResolvedValue(libraryFixture());
  m.assignShift.mockResolvedValue({ id: 'new' });
  m.publishSchedule.mockResolvedValue({ id: 'pb2' });
  m.submitIndicatorEntry.mockResolvedValue({ id: 'e2' });
  m.verifyIndicatorEntry.mockResolvedValue({ id: 'e1' });
});

async function renderUp() {
  render(<NursingAdminPage />);
  await waitFor(() => expect(useNursingAdminStore.getState().dbUp).toBe(true));
}

it('M16B_TEST 在线 → 渲染两个 Tab 与合规结果', async () => {
  await renderUp();
  expect(await screen.findByTestId('mng-health-tag')).toHaveTextContent('BFF/DB 正常');
  expect(await screen.findByTestId('mng-compliance-list')).toBeTruthy();
  expect(screen.getByText('排班管理')).toBeTruthy();
  expect(screen.getByText('敏感指标')).toBeTruthy();
});

it('M16B_TEST 断库 → 红 Alert 不渲染业务', async () => {
  healthMock.mockResolvedValue({ status: 'ok', demoMode: false, db: 'down' });
  render(<NursingAdminPage />);
  expect(await screen.findByTestId('mng-offline-alert')).toBeTruthy();
  expect(screen.queryByTestId('mng-compliance-list')).toBeNull();
});

it('M16B_TEST 无排班权限 → 排班/发布按钮 disabled', async () => {
  useAuthStore.setState({ permissions: ['nursing_admin:view'] });
  await renderUp();
  expect(await screen.findByTestId('mng-assign-btn')).toBeDisabled();
  expect(screen.getByTestId('mng-publish-btn')).toBeDisabled();
});

it('M16B_TEST 指标：未接入源显式标注待人工录入', async () => {
  await renderUp();
  fireEvent.click(await screen.findByText('敏感指标', { selector: '.ant-tabs-tab-btn' }));
  await waitFor(() => expect(screen.getAllByText('需人工录入/待接入').length).toBeGreaterThan(0));
});

it('M16B_TEST 指标录入：分子>分母 → 错误提示且提交禁用', async () => {
  await renderUp();
  fireEvent.click(await screen.findByText('敏感指标', { selector: '.ant-tabs-tab-btn' }));
  await screen.findByTestId('mng-entry-num');
  fireEvent.change(screen.getByTestId('mng-entry-num'), { target: { value: '11' } });
  fireEvent.change(screen.getByTestId('mng-entry-den'), { target: { value: '10' } });
  await waitFor(() => expect(screen.getByTestId('mng-entry-error')).toHaveTextContent('分子不可大于分母'));
  expect(screen.getByTestId('mng-entry-submit')).toBeDisabled();
});

it('M16B_TEST 写失败 → 错误 Alert', async () => {
  m.publishSchedule.mockRejectedValue(new Error('发布冲突：本周已发布'));
  await renderUp();
  fireEvent.click(screen.getByTestId('mng-publish-btn'));
  await waitFor(() => expect(screen.getByTestId('mng-error-alert')).toHaveTextContent('发布冲突'));
});
