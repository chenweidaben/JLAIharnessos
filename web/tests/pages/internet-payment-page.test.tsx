/**
 * 健澜科技 jlmedaios - 互联网在线支付工作站页面测试（M3-M）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 患者在线：实名档案解析 → 待支付处方 → 去支付成功（票据号展示）；
 *  - 未实名患者：提示先完成实名建档；
 *  - 药师在线：支付队列、冲正弹窗（原因必填）、冲正成功；
 *  - 断库：离线 Alert，不渲染业务内容、不假成功；
 *  - 无权限角色：提示无访问权限。
 *
 * BFF 经 vi.mock 隔离；真实断库/越权另有端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test-utils';

import InternetPaymentWorkbench from '@/pages/internetPayment';
import type { OnlinePaymentView, EInvoiceView } from '@/types/internetPayment';
import type { EPrescriptionView } from '@/types/internetPrescription';

vi.mock('@/services/api/system', () => ({
  systemApi: { health: vi.fn() },
}));
vi.mock('@/services/api/internetPayment', () => ({
  internetPaymentApi: {
    patientProfile: vi.fn(),
    create: vi.fn(),
    cancel: vi.fn(),
    refund: vi.fn(),
    payable: vi.fn(),
    my: vi.fn(),
    myInvoices: vi.fn(),
    financeQueue: vi.fn(),
    financeInvoices: vi.fn(),
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
import { internetPaymentApi } from '@/services/api/internetPayment';
import { useInternetPaymentStore } from '@/store/internetPaymentStore';

const sysM = vi.mocked(systemApi);
const payM = vi.mocked(internetPaymentApi);

const healthUp = { status: 'healthy' as const, version: '1.0.0', uptimeSeconds: 10 };

function rx(over: Partial<EPrescriptionView> = {}): EPrescriptionView {
  return {
    id: 'rx1',
    rxNo: 'ER20261001001',
    sessionId: 's1',
    patientId: 'pt1',
    patientName: '测试患者',
    prescriberId: 'd1',
    prescriberName: '李医生',
    department: '心血管内科',
    status: 'approved',
    totalFee: 31,
    idempotencyKey: 'erm-1',
    createdAt: '2026-10-01T08:00:00Z',
    items: [{ id: 'i1', drugName: '阿莫西林', quantity: 1, quantityUnit: '盒', unitPrice: 12.5, amount: 12.5 }],
    ...over,
  };
}

function payment(over: Partial<OnlinePaymentView> = {}): OnlinePaymentView {
  return {
    id: 'pay1',
    payNo: 'OP20261001001',
    sourceType: 'internet_prescription',
    sourceId: 'rx1',
    patientId: 'pt1',
    accountId: 'acc1',
    amount: '31.00',
    medicarePaid: '18.60',
    selfPaid: '12.40',
    channel: 'mock',
    status: 'paid',
    idempotencyKey: 'erm-1',
    channelTxnNo: 'MOCK-1',
    paidBy: 'acc1',
    paidAt: '2026-10-01T08:05:00Z',
    cancelledBy: null,
    cancelledAt: null,
    createdAt: '2026-10-01T08:05:00Z',
    updatedAt: '2026-10-01T08:05:00Z',
    ...over,
  };
}

function invoice(over: Partial<EInvoiceView> = {}): EInvoiceView {
  return {
    id: 'inv1',
    invoiceNo: 'INV20261001001',
    paymentId: 'pay1',
    patientId: 'pt1',
    sourceType: 'internet_prescription',
    sourceId: 'rx1',
    amount: '31.00',
    medicarePaid: '18.60',
    selfPaid: '12.40',
    status: 'issued',
    reversalOf: null,
    reversedAt: null,
    issuedBy: 'acc1',
    issuedAt: '2026-10-01T08:05:00Z',
    createdAt: '2026-10-01T08:05:00Z',
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useInternetPaymentStore.getState().reset();
  mockUser.user.roleCodes = ['patient'];
  mockUser.user.permissions = [];
  sysM.health.mockResolvedValue(healthUp);
  payM.patientProfile.mockResolvedValue({ accountId: 'acc1', patientId: 'pt1' });
  payM.payable.mockResolvedValue({ payable: [rx()] });
  payM.my.mockResolvedValue({ payments: [] });
  payM.myInvoices.mockResolvedValue({ invoices: [] });
  payM.financeQueue.mockResolvedValue({ payments: [] });
  payM.financeInvoices.mockResolvedValue({ invoices: [] });
});

it('患者在线：待支付处方 → 去支付成功并展示票据', async () => {
  payM.create.mockResolvedValue({
    payment: payment(),
    invoice: invoice(),
    rx: { id: 'rx1', rxNo: 'ER20261001001', status: 'paid', totalFee: '31.00' },
  });
  payM.my.mockResolvedValue({ payments: [payment()] });
  payM.myInvoices.mockResolvedValue({ invoices: [invoice()] });

  render(<InternetPaymentWorkbench />);
  // 待支付处方出现
  expect(await screen.findByText('ER20261001001')).toBeTruthy();
  // 去支付
  fireEvent.click(screen.getByRole('button', { name: /去支付/ }));
  // 支付成功 → 票据号
  expect(await screen.findByText('INV20261001001')).toBeTruthy();
  expect(payM.create).toHaveBeenCalledWith(
    'pt1',
    expect.objectContaining({ prescriptionId: 'rx1', channel: 'mock' }),
  );
});

it('未实名患者：提示先完成实名建档，不渲染业务', async () => {
  payM.patientProfile.mockRejectedValue(
    Object.assign(new Error('尚未完成实名建档'), { code: 40400, status: 404 }),
  );
  render(<InternetPaymentWorkbench />);
  expect(await screen.findByText(/尚未完成实名建档/)).toBeTruthy();
  expect(payM.payable).not.toHaveBeenCalled();
});

it('断库：离线 Alert，不渲染业务内容、不假成功', async () => {
  sysM.health.mockRejectedValue(new Error('network down'));
  render(<InternetPaymentWorkbench />);
  expect(await screen.findByText(/后端服务或数据库不可用/)).toBeTruthy();
  expect(screen.queryByText('ER20261001001')).toBeNull();
});

it('药师在线：支付队列加载、冲正弹窗原因必填、冲正成功', async () => {
  mockUser.user.roleCodes = ['pharmacist'];
  mockUser.user.permissions = ['internet:payment:refund', 'internet:invoice:view'];
  payM.financeQueue.mockResolvedValue({ payments: [payment()] });
  payM.financeInvoices.mockResolvedValue({ invoices: [invoice()] });
  payM.refund.mockResolvedValue({
    payment: payment({ status: 'cancelled', cancelledAt: '2026-10-01T09:00:00Z' }),
    invoice: invoice({ status: 'reversed', reversalOf: 'inv1' }),
  });

  render(<InternetPaymentWorkbench />);
  // 支付队列显示
  expect(await screen.findByText('OP20261001001')).toBeTruthy();
  // 打开冲正弹窗
  fireEvent.click(screen.getByRole('button', { name: /冲\s*正/ }));
  expect(await screen.findByText(/冲正后：支付单取消/)).toBeTruthy();
  // 原因必填
  fireEvent.click(screen.getByRole('button', { name: /确认冲正/ }));
  expect(await screen.findByText(/请填写冲正原因/)).toBeTruthy();
  expect(payM.refund).not.toHaveBeenCalled();
  // 填写原因并确认
  fireEvent.change(screen.getByPlaceholderText(/冲正原因/), {
    target: { value: '患者拒付' },
  });
  fireEvent.click(screen.getByRole('button', { name: /确认冲正/ }));
  await waitFor(() =>
    expect(payM.refund).toHaveBeenCalledWith({ paymentId: 'pay1', reason: '患者拒付' }),
  );
  // 冲正成功提示（原票据已冲红）
  expect(await screen.findByText(/冲正完成/)).toBeTruthy();
}, 60000);

it('患者在线：在途支付单可取消', async () => {
  payM.payable.mockResolvedValue({ payable: [] });
  payM.my.mockResolvedValue({
    payments: [payment({ status: 'pending', channelTxnNo: null, paidBy: null, paidAt: null })],
  });
  payM.myInvoices.mockResolvedValue({ invoices: [] });
  payM.cancel.mockResolvedValue({
    payment: payment({ status: 'cancelled', cancelledAt: '2026-10-01T09:00:00Z' }),
  });

  render(<InternetPaymentWorkbench />);
  expect(await screen.findByText('OP20261001001')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /取消支付单/ }));
  await waitFor(() => expect(payM.cancel).toHaveBeenCalledWith('pt1', 'pay1'));
  expect(await screen.findByText('支付单已取消')).toBeTruthy();
});

it('药师在线：非已支付状态不显示冲正按钮', async () => {
  mockUser.user.roleCodes = ['pharmacist'];
  mockUser.user.permissions = ['internet:payment:refund', 'internet:invoice:view'];
  payM.financeQueue.mockResolvedValue({
    payments: [
      payment({ status: 'paid' }),
      payment({ id: 'pay2', payNo: 'OP20261001002', status: 'cancelled' }),
      payment({ id: 'pay3', payNo: 'OP20261001003', status: 'pending', channelTxnNo: null }),
    ],
  });
  payM.financeInvoices.mockResolvedValue({ invoices: [] });

  render(<InternetPaymentWorkbench />);
  expect(await screen.findByText('OP20261001001')).toBeTruthy();
  // 仅 paid 行有冲正按钮
  expect(screen.queryAllByRole('button', { name: /冲\s*正/ }).length).toBe(1);
  expect(screen.getAllByText('已取消').length).toBeGreaterThan(0);
});

it('患者在线：取消支付单失败时给出错误提示', async () => {
  payM.payable.mockResolvedValue({ payable: [] });
  payM.my.mockResolvedValue({
    payments: [payment({ status: 'pending', channelTxnNo: null, paidBy: null, paidAt: null })],
  });
  payM.myInvoices.mockResolvedValue({ invoices: [] });
  payM.cancel.mockRejectedValue(new Error('支付单已关闭'));

  render(<InternetPaymentWorkbench />);
  expect(await screen.findByText('OP20261001001')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /取消支付单/ }));
  expect(await screen.findByText('支付单已关闭')).toBeTruthy();
});

it('药师在线：冲正失败时给出错误提示', async () => {
  mockUser.user.roleCodes = ['pharmacist'];
  mockUser.user.permissions = ['internet:payment:refund', 'internet:invoice:view'];
  payM.financeQueue.mockResolvedValue({ payments: [payment()] });
  payM.financeInvoices.mockResolvedValue({ invoices: [] });
  payM.refund.mockRejectedValue(new Error('冲正冲突，请刷新后重试'));

  render(<InternetPaymentWorkbench />);
  expect(await screen.findByText('OP20261001001')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /冲\s*正/ }));
  fireEvent.change(await screen.findByPlaceholderText(/冲正原因/), {
    target: { value: '重复支付' },
  });
  fireEvent.click(screen.getByRole('button', { name: /确认冲正/ }));
  expect(await screen.findByText('冲正冲突，请刷新后重试')).toBeTruthy();
});

it('无权限角色：提示无访问权限', async () => {
  mockUser.user.roleCodes = ['doctor'];
  render(<InternetPaymentWorkbench />);
  expect(await screen.findByText(/无在线支付访问权限/)).toBeTruthy();
});
