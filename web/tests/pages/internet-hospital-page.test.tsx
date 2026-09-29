/**
 * 健澜科技 jlmedaios - 互联网医院管理端页面测试（M3-J）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 在线：资质列表渲染、状态过滤（Segmented）、审核通过；
 *  - 驳回：理由必填（Radio.Button + TextArea）；
 *  - 断库：显式离线 Alert，不渲染业务内容。
 *
 * BFF 经 vi.mock 隔离；真实断库/越权另有端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

import InternetHospitalPage from '@/pages/internetHospital';
import type { InternetPractitionerView } from '@/types/internetHospital';

vi.mock('@/services/api/internetHospital', () => ({
  listPractitioners: vi.fn(),
  auditPractitioner: vi.fn(),
  getMyPractitioner: vi.fn(),
  submitPractitioner: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as api from '@/services/api/internetHospital';
import { getSystemHealth } from '@/services/api/pharmacy';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

function practitioner(over: Partial<InternetPractitionerView> = {}): InternetPractitionerView {
  return {
    id: 'pr1',
    userId: 'u1',
    practitionerNo: '110000000000001',
    practitionerType: 'doctor',
    practiceScope: '内科专业',
    practiceYears: 10,
    auditStatus: 'pending',
    auditReason: null,
    approvedAt: null,
    approvedBy: null,
    validFrom: null,
    validTo: null,
    createdAt: '2026-09-29T08:00:00Z',
    ...over,
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
  m.listPractitioners.mockResolvedValue([
    practitioner(),
    practitioner({
      id: 'pr2',
      auditStatus: 'approved',
      userId: 'u2',
      practitionerType: 'pharmacist',
      practiceScope: '药学',
      practitionerNo: '220000000000002',
    }),
  ]);
  m.auditPractitioner.mockResolvedValue(practitioner({ auditStatus: 'approved' }));
});

async function waitOnline() {
  return screen.findByTestId('internet-content');
}

it('在线：渲染资质列表与类型', async () => {
  render(<InternetHospitalPage />);
  await waitOnline();
  expect(screen.getByText('医师')).toBeInTheDocument();
  expect(screen.getByText('药师')).toBeInTheDocument();
  expect(screen.getByText('内科专业')).toBeInTheDocument();
  expect(screen.getByText('药学')).toBeInTheDocument();
  // “待审核/已通过”同时出现在 Segmented 过滤项与表格状态 Tag 中
  expect(screen.getAllByText('待审核').length).toBeGreaterThanOrEqual(2);
  expect(screen.getAllByText('已通过').length).toBeGreaterThanOrEqual(2);
});

it('在线：审核通过 → 调用接口并刷新', async () => {
  render(<InternetHospitalPage />);
  await waitOnline();

  // 仅 pending 行有"审核"按钮
  fireEvent.click(screen.getByRole('button', { name: '审 核' }));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();

  // 默认通过，直接提交
  fireEvent.click(screen.getByRole('button', { name: '提交审核' }));
  await waitFor(() => expect(m.auditPractitioner).toHaveBeenCalledTimes(1));
  expect(m.auditPractitioner).toHaveBeenCalledWith('pr1', 'approved', undefined);
});

it('驳回：理由必填，未填不提交', async () => {
  render(<InternetHospitalPage />);
  await waitOnline();

  fireEvent.click(screen.getByRole('button', { name: '审 核' }));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();

  // 切换到驳回（Radio.Button）
  fireEvent.click(screen.getByText('驳回'));
  expect(await screen.findByPlaceholderText('请说明驳回原因，便于医护补正')).toBeInTheDocument();

  // 不填理由直接提交：form 校验拦截，不调接口
  fireEvent.click(screen.getByRole('button', { name: '提交审核' }));
  await waitFor(() => expect(m.auditPractitioner).not.toHaveBeenCalled());

  // 填写理由后提交
  fireEvent.change(screen.getByPlaceholderText('请说明驳回原因，便于医护补正'), {
    target: { value: '资料不全' },
  });
  fireEvent.click(screen.getByRole('button', { name: '提交审核' }));
  await waitFor(() => expect(m.auditPractitioner).toHaveBeenCalledTimes(1));
  expect(m.auditPractitioner).toHaveBeenCalledWith('pr1', 'rejected', '资料不全');
});

it('状态过滤：Segmented 点击待审核触发重新加载', async () => {
  const { container } = render(<InternetHospitalPage />);
  await waitOnline();
  // Segmented 选项是 label.ant-segmented-item，按文本定位“待审核”
  const items = Array.from(container.querySelectorAll('.ant-segmented-item'));
  const target = items.find((el) => el.textContent?.includes('待审核'));
  expect(target).not.toBeNull();
  fireEvent.click(target as Element);
  await waitFor(() => expect(m.listPractitioners).toHaveBeenCalledWith('pending'));
});

it('断库：显式离线 Alert，不渲染业务内容', async () => {
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.3.0',
    demoMode: false,
    db: 'down',
  });
  render(<InternetHospitalPage />);
  expect(await screen.findByTestId('internet-offline-alert')).toBeInTheDocument();
  expect(screen.queryByTestId('internet-content')).toBeNull();
  expect(screen.getByTestId('internet-health-tag')).toHaveTextContent('BFF/DB 不可用');
});

it('离线 Alert 点刷新：探活恢复后加载内容', async () => {
  // 初始断库
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.3.0',
    demoMode: false,
    db: 'down',
  });
  render(<InternetHospitalPage />);
  const alert = await screen.findByTestId('internet-offline-alert');
  expect(alert).toBeInTheDocument();

  // 恢复：health 变为 up，点击 Alert 内刷新
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.3.0',
    demoMode: false,
    db: 'up',
  });
  fireEvent.click(within(alert).getByRole('button', { name: '刷 新' }));
  expect(await screen.findByTestId('internet-content')).toBeInTheDocument();
});
