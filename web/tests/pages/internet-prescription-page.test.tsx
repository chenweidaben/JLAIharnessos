/**
 * 健澜科技 jlmedaios - 互联网电子处方工作站页面测试（M3-L）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 医生在线：进行中会话选择、开方面板、添加明细、提交审方；
 *  - 药师在线：审方队列加载、打开抽屉、审方动作；
 *  - 断库：离线 Alert，不渲染业务内容、不假成功。
 *
 * BFF 经 vi.mock 隔离；真实断库/越权另有端到端取证。
 */
import { it as vitestIt, expect, beforeEach, vi } from 'vitest';
import type { TestFunction } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test-utils';

// 重型页面（健康门禁 + 角色分流 + 大量异步渲染）：串行/覆盖率插桩下，15s 默认
// 超时会出现计时抖动；统一提至 30s。这些用例单跑均很快，若真挂死 30s 仍会暴露。
const it = (name: string, fn: TestFunction) =>
  vitestIt(name, fn, 60000);

import InternetPrescriptionWorkbench from '@/pages/internetPrescription';
import { useInternetPrescriptionStore } from '@/store/internetPrescriptionStore';
import type { EPrescriptionView } from '@/types/internetPrescription';

vi.mock('@/services/api/internetPrescription', () => ({
  createEPrescription: vi.fn(),
  resubmitEPrescription: vi.fn(),
  cancelEPrescription: vi.fn(),
  listSessionPrescriptions: vi.fn(),
  listAuditQueue: vi.fn(),
  reviewEPrescription: vi.fn(),
}));
vi.mock('@/services/api/consultation', () => ({
  listPendingConsultations: vi.fn(),
  listDoctorConsultations: vi.fn(),
  getConsultation: vi.fn(),
  acceptConsultation: vi.fn(),
  sendDoctorMessage: vi.fn(),
  completeConsultation: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

// 角色分流依赖登录用户：医生 → 开方视图；药师 → 审方队列
const mockUser = vi.hoisted(() => ({
  user: { id: 'u1', realName: '测试用户', roleCodes: ['pharmacist'] as string[] },
}));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (sel?: (s: { user: typeof mockUser.user }) => unknown) =>
    sel ? sel({ user: mockUser.user }) : mockUser.user,
}));

import * as rxApi from '@/services/api/internetPrescription';
import * as consultApi from '@/services/api/consultation';
import { getSystemHealth } from '@/services/api/pharmacy';
import { useConsultationStore } from '@/store/consultationStore';

const rxM = rxApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const consultM = consultApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

function rx(over: Partial<EPrescriptionView> = {}): EPrescriptionView {
  return {
    id: 'rx1',
    rxNo: 'ER20260930001',
    sessionId: 's1',
    patientId: 'pt1',
    patientName: '测试患者',
    prescriberId: 'd1',
    prescriberName: '李医生',
    department: '心血管内科',
    status: 'pending_review',
    riskLevel: 'medium',
    counsel: null,
    totalFee: 31,
    idempotencyKey: 'erlx-1',
    createdAt: '2026-09-30T08:00:00Z',
    items: [
      {
        id: 'i1',
        drugCode: 'D018',
        drugName: '阿莫西林',
        specification: '0.25g*24粒',
        dosage: 0.5,
        dosageUnit: 'g',
        frequency: 'tid',
        route: '口服',
        daysSupply: 7,
        quantity: 1,
        quantityUnit: '盒',
        skinTest: true,
        unitPrice: 12.5,
        amount: 12.5,
      },
    ],
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  healthMock.mockResolvedValue({
    status: 'healthy',
    version: '0.3.0',
    demoMode: false,
    db: 'up',
  });
  useInternetPrescriptionStore.setState({
    sessionPrescriptions: [],
    auditQueue: [],
    currentAudit: null,
    loading: false,
    submitting: false,
    health: { online: false, dbUp: false, checkedAt: null },
    healthChecking: false,
  });
  useConsultationStore.setState({
    pending: [],
    doctorSessions: [],
    current: null,
    input: '',
    loading: false,
    sending: false,
    health: { online: true, dbUp: true, checkedAt: null },
    healthChecking: false,
  });
});

it('断库：离线 Alert，不渲染业务内容', async () => {
  healthMock.mockRejectedValue(new Error('ECONNREFUSED'));
  render(<InternetPrescriptionWorkbench />);
  expect(
    await screen.findByText('后端服务或数据库不可用，电子处方业务已暂停'),
  ).toBeInTheDocument();
  // 不发起业务请求
  await waitFor(() => expect(rxM.listAuditQueue).not.toHaveBeenCalled());
  expect(rxM.createEPrescription).not.toHaveBeenCalled();
});

it('医生在线且无进行中会话：提示先接诊', async () => {
  mockUser.user.roleCodes = ['attending'];
  consultM.listDoctorConsultations.mockResolvedValue([]);
  render(<InternetPrescriptionWorkbench />);
  await waitFor(() => expect(useInternetPrescriptionStore.getState().health.online).toBe(true));
  expect(
    await screen.findByText(/暂无进行中的问诊会话/),
  ).toBeInTheDocument();
});

it('医生在线且有进行中会话：显示开方面板并可提交审方', async () => {
  mockUser.user.roleCodes = ['attending'];
  consultM.listDoctorConsultations.mockResolvedValue([
    {
      id: 's1',
      sessionNo: 'CONS20260930123456',
      accountId: 'a1',
      profileId: 'p1',
      patientId: 'pt1',
      doctorId: 'd1',
      department: '心血管内科',
      visitType: 'followup',
      status: 'in_consultation',
      eligibilityPassed: true,
      lastVisitId: 'v1',
      lastVisitAt: null,
      chiefComplaint: '复诊开药',
      cancelReason: null,
      acceptedAt: '2026-09-30T08:00:00Z',
      completedAt: null,
      cancelledAt: null,
      createdAt: '2026-09-30T08:00:00Z',
      updatedAt: '2026-09-30T08:00:00Z',
    },
  ]);
  consultM.getConsultation.mockResolvedValue({
    session: {
      id: 's1',
      sessionNo: 'CONS20260930123456',
      accountId: 'a1',
      profileId: 'p1',
      patientId: 'pt1',
      doctorId: 'd1',
      department: '心血管内科',
      visitType: 'followup',
      status: 'in_consultation',
      eligibilityPassed: true,
      lastVisitId: 'v1',
      lastVisitAt: null,
      chiefComplaint: '复诊开药',
      cancelReason: null,
      acceptedAt: '2026-09-30T08:00:00Z',
      completedAt: null,
      cancelledAt: null,
      createdAt: '2026-09-30T08:00:00Z',
      updatedAt: '2026-09-30T08:00:00Z',
    },
    messages: [],
  });
  rxM.listSessionPrescriptions.mockResolvedValue([]);
  rxM.createEPrescription.mockResolvedValue(rx({ status: 'pending_review' }));

  render(<InternetPrescriptionWorkbench />);
  await waitFor(() => expect(useInternetPrescriptionStore.getState().health.online).toBe(true));

  // 开方面板出现
  expect(await screen.findByText('开具电子处方')).toBeInTheDocument();
  // 添加一条明细
  fireEvent.change(screen.getByPlaceholderText('药品名称（必填）'), {
    target: { value: '阿莫西林' },
  });
  fireEvent.change(screen.getByPlaceholderText('剂量'), { target: { value: '0.5' } });
  fireEvent.click(screen.getByRole('button', { name: /添加明细/ }));
  expect(await screen.findByText('阿莫西林')).toBeInTheDocument();
  // 提交审方
  fireEvent.click(screen.getByRole('button', { name: /提交审方/ }));
  await waitFor(() =>
    expect(rxM.createEPrescription).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 's1', items: expect.arrayContaining([expect.objectContaining({ drugName: '阿莫西林' })]) }),
    ),
  );
});

it('药师在线：审方队列加载 → 打开抽屉 → 通过', async () => {
  mockUser.user.roleCodes = ['pharmacist'];
  const rx1 = rx({ id: 'rx1', rxNo: 'ER20260930001' });
  rxM.listAuditQueue.mockResolvedValue([rx1]);
  rxM.reviewEPrescription.mockResolvedValue(rx({ status: 'approved' }));

  render(<InternetPrescriptionWorkbench />);
  await waitFor(() => expect(useInternetPrescriptionStore.getState().health.online).toBe(true));

  expect(await screen.findByText('互联网电子处方 · 审方队列')).toBeInTheDocument();
  expect(await screen.findByText('ER20260930001')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /审\s*方/ }));
  expect(await screen.findByText('阿莫西林')).toBeInTheDocument();

  // 输入意见并确认通过（antd 两字按钮自动插空格）
  fireEvent.change(screen.getByPlaceholderText('审核意见（驳回/退回必填）'), {
    target: { value: '用法用量合理' },
  });
  fireEvent.click(screen.getByRole('button', { name: /通\s*过/ }));
  fireEvent.click(await screen.findByRole('button', { name: /确认通过/ }));
  await waitFor(() =>
    expect(rxM.reviewEPrescription).toHaveBeenCalledWith('rx1', 'approved', '用法用量合理'),
  );
});
