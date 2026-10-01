/**
 * 健澜科技 jlmedaios - 互联网在线报告页面测试（M3-N）
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 覆盖：
 *  - 患者：实名档案解析 → 本人报告（检验表格 + 异常 Alert + AI 解读 + 影像）；
 *  - 未实名患者：提示先实名建档；
 *  - 医护：输入患者 ID 查询报告；
 *  - 断库：离线 Alert，不渲染业务内容。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test-utils';

import InternetReportsWorkbench from '@/pages/internetReports';

vi.mock('@/services/api/system', () => ({
  systemApi: { health: vi.fn() },
}));
vi.mock('@/services/api/internetDelivery', () => ({
  internetDeliveryApi: {
    myReports: vi.fn(),
    staffReports: vi.fn(),
  },
}));
vi.mock('@/services/api/internetPayment', () => ({
  internetPaymentApi: {
    patientProfile: vi.fn(),
  },
}));

const mockUser = vi.hoisted(() => ({
  user: {
    id: 'acc1',
    realName: '测试用户',
    roleCodes: [] as string[],
    permissions: [] as string[],
  },
}));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (sel?: (s: { user: typeof mockUser.user }) => unknown) =>
    sel ? sel({ user: mockUser.user }) : mockUser.user,
}));

import { systemApi } from '@/services/api/system';
import { internetDeliveryApi } from '@/services/api/internetDelivery';
import { internetPaymentApi } from '@/services/api/internetPayment';
import { useInternetDeliveryStore } from '@/store/internetDeliveryStore';

const sysM = vi.mocked(systemApi);
const apiM = vi.mocked(internetDeliveryApi);
const payM = vi.mocked(internetPaymentApi);

const healthUp = { status: 'healthy' as const, version: '1.0.0', uptimeSeconds: 10 };

const reports = {
  labs: [
    { id: 'l1', itemName: '白细胞计数', value: '13.5', unit: '10^9/L', refLow: '3.5', refHigh: '9.5', abnormalFlag: 'H', isCritical: false, resultTime: '2026-10-01T08:00:00Z' },
    { id: 'l2', itemName: '血红蛋白', value: '140', unit: 'g/L', refLow: '120', refHigh: '160', abnormalFlag: 'N', isCritical: false, resultTime: '2026-10-01T08:00:00Z' },
  ],
  imaging: [
    { id: 'im1', examName: '胸部CT平扫', modality: 'CT', bodyPart: '胸部', findings: '两肺纹理清晰', impression: '未见明显异常', isCritical: false, aiFindings: {} },
  ],
  interpretations: [
    { id: 'in1', summary: '白细胞升高提示感染可能', department: '检验科', abnormalItems: ['白细胞计数'], criticalItems: [], status: 'reviewed', generatedAt: '2026-10-01T08:00:00Z', reviewedAt: '2026-10-01T09:00:00Z' },
  ],
};

beforeEach(() => {
  useInternetDeliveryStore.getState().reset();
  vi.clearAllMocks();
  sysM.health.mockResolvedValue(healthUp as never);
});

describe('互联网在线报告 · 患者视图', () => {
  beforeEach(() => {
    mockUser.user.roleCodes = ['patient'];
    mockUser.user.permissions = [];
    payM.patientProfile.mockResolvedValue({ patientId: 'pt1' } as never);
  });

  it('实名患者：展示本人报告（异常 Alert + 检验表格 + AI 解读 + 影像）', async () => {
    apiM.myReports.mockResolvedValue(reports as never);
    render(<InternetReportsWorkbench />);
    expect(await screen.findByText(/1 项异常/)).toBeTruthy();
    expect(screen.getByText('白细胞计数')).toBeTruthy();
    expect(screen.getByText('H')).toBeTruthy();
    expect(screen.getByText(/AI 检验解读/)).toBeTruthy();
    expect(screen.getByText(/胸部CT平扫/)).toBeTruthy();
  });

  it('未实名患者：提示先实名建档', async () => {
    payM.patientProfile.mockRejectedValue({ code: 404 } as never);
    render(<InternetReportsWorkbench />);
    expect(await screen.findByText(/实名建档/)).toBeTruthy();
  });

  it('断库：离线 Alert，不渲染报告', async () => {
    sysM.health.mockResolvedValue({ status: 'error', db: 'down' } as never);
    render(<InternetReportsWorkbench />);
    expect(await screen.findByText(/报告查询已暂停/)).toBeTruthy();
    expect(screen.queryByText('白细胞计数')).toBeNull();
  });
});

describe('互联网在线报告 · 医护视图', () => {
  beforeEach(() => {
    mockUser.user.roleCodes = ['doctor'];
    mockUser.user.permissions = ['internet:report:view'];
    payM.patientProfile.mockResolvedValue({ patientId: 'pt1' } as never);
  });

  it('输入患者 ID 查询报告', async () => {
    apiM.staffReports.mockResolvedValue(reports as never);
    render(<InternetReportsWorkbench />);
    const input = await screen.findByPlaceholderText(/患者 ID/);
    fireEvent.change(input, { target: { value: 'pt9' } });
    fireEvent.click(screen.getByRole('button', { name: /查询报告/ }));
    await waitFor(() =>
      expect(apiM.staffReports).toHaveBeenCalledWith('pt9', undefined),
    );
    expect(await screen.findByText('白细胞计数')).toBeTruthy();
  });
});
