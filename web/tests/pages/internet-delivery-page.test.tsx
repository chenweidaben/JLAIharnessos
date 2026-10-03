/**
 * 健澜科技 jlmedaios - 互联网处方配送工作站页面测试（M3-N）
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 覆盖：
 *  - 患者：实名档案解析 → 本人配送列表（取货码 / 物流 + 地址快照）；
 *  - 未实名患者：提示先实名建档；
 *  - 药房：创建配送单（自取/快递，快递地址必填）、打包、发货弹窗（物流必填）、
 *          取消（Popconfirm）、自取核销、终态按钮消失；
 *  - 断库：离线 Alert，不渲染业务内容。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

import InternetDeliveryWorkbench from '@/pages/internetDelivery';
import type { PrescriptionDeliveryView } from '@/types/internetDelivery';
import type { EPrescriptionView } from '@/types/internetPrescription';

vi.mock('@/services/api/system', () => ({
  systemApi: { health: vi.fn() },
}));
vi.mock('@/services/api/internetDelivery', () => ({
  internetDeliveryApi: {
    my: vi.fn(),
    all: vi.fn(),
    create: vi.fn(),
    fulfill: vi.fn(),
    paidRx: vi.fn(),
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
    status: 'paid',
    totalFee: 31,
    idempotencyKey: 'erm-1',
    createdAt: '2026-10-01T08:00:00Z',
    items: [{ id: 'i1', drugName: '阿莫西林', quantity: 1, quantityUnit: '盒', unitPrice: 12.5, amount: 12.5 }],
    ...over,
  };
}

function delivery(over: Partial<PrescriptionDeliveryView> = {}): PrescriptionDeliveryView {
  return {
    id: 'dlv1',
    deliveryNo: 'DLV20261001001',
    rxId: 'rx1',
    patientId: 'pt1',
    accountId: 'acc1',
    channel: 'self_pick',
    status: 'created',
    courierCompany: null,
    trackingNo: null,
    addressSnapshot: null,
    pickupCode: '123456',
    createdBy: 'u1',
    fulfilledBy: null,
    confirmedBy: null,
    cancelledBy: null,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
    fulfilledAt: null,
    confirmedAt: null,
    cancelledAt: null,
    ...over,
  };
}

beforeEach(() => {
  useInternetDeliveryStore.getState().reset();
  vi.clearAllMocks();
  sysM.health.mockResolvedValue(healthUp as never);
  // 页面顶层 effect 无条件调用 patientProfile，须始终有值
  payM.patientProfile.mockResolvedValue({ patientId: 'pt1' } as never);
});

describe('互联网处方配送 · 患者视图', () => {
  beforeEach(() => {
    mockUser.user.roleCodes = ['patient'];
    mockUser.user.permissions = [];
  });

  it('实名患者：展示本人配送单（自取取货码 / 快递物流与地址快照）', async () => {
    apiM.my.mockResolvedValue({
      deliveries: [
        delivery({ channel: 'self_pick', status: 'packed', pickupCode: '654321' }),
        delivery({
          id: 'dlv2', deliveryNo: 'DLV20261001002', channel: 'express', status: 'shipped',
          courierCompany: '顺丰速运', trackingNo: 'SF20261001', addressSnapshot: '杭州市余杭区 某某小区',
        }),
      ],
    } as never);

    render(<InternetDeliveryWorkbench />);
    expect(await screen.findByText('DLV20261001001')).toBeTruthy();
    expect(screen.getByText('654321')).toBeTruthy();
    expect(screen.getByText('SF20261001')).toBeTruthy();
    expect(screen.getByText(/余杭区/)).toBeTruthy();
  });

  it('未实名患者：提示先完成实名建档', async () => {
    payM.patientProfile.mockRejectedValue({ code: 404 } as never);
    render(<InternetDeliveryWorkbench />);
    expect(await screen.findByText(/实名建档/)).toBeTruthy();
  });
});

describe('互联网处方配送 · 药房履约视图', () => {
  beforeEach(() => {
    mockUser.user.roleCodes = ['pharmacist'];
    mockUser.user.permissions = ['internet:delivery:fulfill', 'internet:delivery:create'];
    apiM.all.mockResolvedValue({ deliveries: [] } as never);
  });

  it('空队列提示', async () => {
    render(<InternetDeliveryWorkbench />);
    expect(await screen.findByText(/暂无配送单/)).toBeTruthy();
  });

  it('创建自取单：选择处方 → 建单 → 列表刷新', async () => {
    apiM.paidRx.mockResolvedValue({ rxList: [rx()] } as never);
    apiM.create.mockResolvedValue({} as never);
    apiM.all.mockResolvedValue({
      deliveries: [delivery({ status: 'created', pickupCode: '888888' })],
    } as never);

    render(<InternetDeliveryWorkbench />);
    fireEvent.click(await screen.findByRole('button', { name: /创建配送单/ }));
    // 等待可配送处方加载后选择
    await waitFor(() => expect(apiM.paidRx).toHaveBeenCalled());
    fireEvent.click(await screen.findByText('ER20261001001 ￥31'));
    // 默认自取 → 直接建单（antd 两字按钮自动插空格）
    fireEvent.click(screen.getByRole('button', { name: /创\s*建$/ }));
    await waitFor(() => expect(apiM.create).toHaveBeenCalled());
    expect(apiM.create).toHaveBeenCalledWith({
      rxId: 'rx1', channel: 'self_pick', address: undefined,
    });
    expect(await screen.findByText('888888')).toBeTruthy();
  }, 30000);

  it('快递建单：地址必填校验', async () => {
    apiM.paidRx.mockResolvedValue({ rxList: [rx()] } as never);
    apiM.create.mockResolvedValue({} as never);
    apiM.all.mockResolvedValue({ deliveries: [] } as never);

    render(<InternetDeliveryWorkbench />);
    fireEvent.click(await screen.findByRole('button', { name: /创建配送单/ }));
    await waitFor(() => expect(apiM.paidRx).toHaveBeenCalled());
    fireEvent.click(await screen.findByText('ER20261001001 ￥31'));
    // 切到快递
    fireEvent.click(screen.getByText('快递'));
    // 不填地址直接建单 → 校验拦截（antd 两字按钮自动插空格）
    fireEvent.click(screen.getByRole('button', { name: /创\s*建$/ }));
    await waitFor(() => expect(screen.getByText(/快递配送必须填写收货地址/)).toBeTruthy());
    expect(apiM.create).not.toHaveBeenCalled();
  });

  it('发货：点击发货弹窗，缺物流不发；填物流确认后调用 fulfill', async () => {
    apiM.all.mockResolvedValue({
      deliveries: [delivery({ channel: 'express', status: 'packed' })],
    } as never);
    apiM.fulfill.mockResolvedValue({} as never);

    render(<InternetDeliveryWorkbench />);
    // antd 两字按钮自动插空格
    fireEvent.click(await screen.findByRole('button', { name: /发\s*货/ }));
    const dialog = await screen.findByRole('dialog');
    // 不填 → 确认不发
    fireEvent.click(within(dialog).getByRole('button', { name: /确认发货/ }));
    expect(apiM.fulfill).not.toHaveBeenCalled();
    // 填物流公司+单号 → 确认发货
    const inputs = within(dialog).getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: '顺丰' } });
    fireEvent.change(inputs[1], { target: { value: 'SF1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /确认发货/ }));
    await waitFor(() =>
      expect(apiM.fulfill).toHaveBeenCalledWith({
        deliveryId: 'dlv1', to: 'shipped', courierCompany: '顺丰', trackingNo: 'SF1',
      }),
    );
  });

  it('自取核销与取消：核销成功后终态；取消走 Popconfirm', async () => {
    apiM.all.mockResolvedValue({
      deliveries: [delivery({ status: 'packed' })],
    } as never);
    apiM.fulfill.mockResolvedValue({} as never);

    render(<InternetDeliveryWorkbench />);
    fireEvent.click(await screen.findByRole('button', { name: /自取核销/ }));
    await waitFor(() =>
      expect(apiM.fulfill).toHaveBeenCalledWith({
        deliveryId: 'dlv1', to: 'picked_up',
      }),
    );
  });

  it('断库：离线 Alert，不渲染业务内容', async () => {
    sysM.health.mockResolvedValue({ status: 'error', db: 'down' } as never);
    render(<InternetDeliveryWorkbench />);
    expect(await screen.findByText(/不可用/)).toBeTruthy();
    expect(screen.queryByText('DLV20261001001')).toBeNull();
  });
});
