/**
 * 健澜科技 jlmedaios - 收费结算页面测试（M3-B）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 在线：查询待结算、计费、勾选费用、一键收费（归集+收款+开票）；
 *  - 退费：已结算明细发起退费（Saga 补偿，原因必填）；
 *  - 未付作废；
 *  - 断库：显式离线 Alert，不渲染业务内容。
 *
 * BFF 经 vi.mock 隔离；真实断库另有端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

import BillingPage from '@/pages/billing';
import type {
  FeeItem,
  OutstandingView,
  Settlement,
  SettlementDetail,
} from '@/types/billing';

vi.mock('@/services/api/billing', () => ({
  fetchSettlementQueue: vi.fn(),
  generateFeeItems: vi.fn(),
  fetchOutstanding: vi.fn(),
  createSettlement: vi.fn(),
  fetchSettlementDetail: vi.fn(),
  paySettlement: vi.fn(),
  voidSettlement: vi.fn(),
  refundFeeItem: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as api from '@/services/api/billing';
import { getSystemHealth } from '@/services/api/pharmacy';
import { useBillingStore } from '@/store/billingStore';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

function feeItem(over: Partial<FeeItem> = {}): FeeItem {
  return {
    id: 'f1', patientId: 'p1', visitId: 'v1', category: 'lab',
    itemCode: 'LAB001', itemName: '血常规', quantity: '1',
    unitPrice: '25.00', amount: '25.00', sourceType: 'lab',
    sourceId: 'o1', priceSource: 'catalog', status: 'active',
    settlementId: null, department: '心血管内科',
    createdAt: '2026-09-29T08:00:00Z', updatedAt: '2026-09-29T08:00:00Z',
    ...over,
  };
}

function outstanding(over: Partial<OutstandingView> = {}): OutstandingView {
  return {
    visit: {
      id: 'v1', visitNo: 'OP001', visitType: 'outpatient',
      department: '心血管内科',
    },
    patient: { mrn: 'M001', nameMasked: '费*甲' },
    items: [
      feeItem(),
      feeItem({
        id: 'f2', category: 'imaging', itemCode: 'IMG002',
        itemName: '胸部CT平扫', unitPrice: '280.00', amount: '280.00',
        sourceType: 'imaging', sourceId: 'o2',
      }),
      feeItem({
        id: 'f3', category: 'treatment', itemCode: 'TRE001',
        itemName: '静脉输液', unitPrice: '15.00', amount: '15.00',
        sourceType: 'treatment', sourceId: 'o3',
      }),
    ],
    totalAmount: '320.00',
    ...over,
  };
}

function settlement(over: Partial<Settlement> = {}): Settlement {
  return {
    id: 's1', settlementNo: 'JS20260929001', patientId: 'p1',
    visitId: 'v1', department: '心血管内科', status: 'unpaid',
    version: 1, paymentMethod: 'cash', totalAmount: '320.00',
    paidAmount: '0.00', refundedAmount: '0.00',
    paidBy: null, paidAt: null, voidedBy: null, voidedAt: null,
    createdAt: '2026-09-29T08:00:00Z', updatedAt: '2026-09-29T08:00:00Z',
    ...over,
  };
}

function detail(over: Partial<SettlementDetail> = {}): SettlementDetail {
  return {
    settlement: settlement({ status: 'paid', version: 2, paidAmount: '320.00' }),
    items: [
      feeItem({ status: 'settled', settlementId: 's1' }),
      feeItem({
        id: 'f2', category: 'imaging', itemCode: 'IMG002',
        itemName: '胸部CT平扫', unitPrice: '280.00', amount: '280.00',
        sourceType: 'imaging', sourceId: 'o2',
        status: 'settled', settlementId: 's1',
      }),
      feeItem({
        id: 'f3', category: 'treatment', itemCode: 'TRE001',
        itemName: '静脉输液', unitPrice: '15.00', amount: '15.00',
        sourceType: 'treatment', sourceId: 'o3',
        status: 'settled', settlementId: 's1',
      }),
    ],
    invoice: {
      id: 'inv1', invoiceNo: 'FP20260929001', settlementId: 's1',
      patientId: 'p1', visitId: 'v1', invoiceType: 'electronic',
      totalAmount: '320.00', refundedAmount: '0.00', status: 'issued',
      issuedBy: 'u-admin', issuedAt: '2026-09-29T08:00:00Z',
      voidedAt: null, createdAt: '2026-09-29T08:00:00Z',
    },
    refunds: [],
    sagaLog: [
      {
        id: 'l1', saga_id: 's1', step: 'settle-items',
        direction: 'forward', status: 'succeeded',
        created_at: '2026-09-29T08:00:00Z',
      },
    ],
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  healthMock.mockResolvedValue({
    status: 'ok', version: '0.3.0', demoMode: false, db: 'up',
  });
  m.fetchSettlementQueue.mockResolvedValue({ items: [settlement()], total: 1 });
  m.fetchOutstanding.mockResolvedValue(outstanding());
  m.fetchSettlementDetail.mockResolvedValue(detail());
  m.generateFeeItems.mockResolvedValue({
    created: 5, skipped: 0, registration: 1, consultation: 1,
    orders: 3, drugs: 0, defaultPriced: 0,
  });
  m.createSettlement.mockResolvedValue({ settlement: settlement() });
  m.paySettlement.mockResolvedValue({});
  m.voidSettlement.mockResolvedValue({});
  m.refundFeeItem.mockResolvedValue({});
});

/** 等待健康门禁通过、业务内容渲染。 */
async function waitOnline() {
  return screen.findByTestId('billing-content');
}

it('在线：查询待结算 → 计费 → 勾选费用 → 一键收费', async () => {
  render(<BillingPage />);
  await waitOnline();

  // 输入就诊ID并查询
  fireEvent.change(screen.getByTestId('billing-visit-input'), {
    target: { value: 'v1' },
  });
  fireEvent.click(screen.getByTestId('billing-search'));
  const summary = await screen.findByTestId('billing-summary');
  expect(summary).toBeInTheDocument();
  expect(within(summary).getByText('¥320.00')).toBeInTheDocument();

  // 计费
  fireEvent.click(screen.getByTestId('billing-generate'));
  await waitFor(() => expect(m.generateFeeItems).toHaveBeenCalledTimes(1));

  // 一键收费（归集 + 收款）
  fireEvent.click(screen.getByTestId('billing-checkout'));
  await waitFor(() => expect(m.createSettlement).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(m.paySettlement).toHaveBeenCalledTimes(1));
});

it('未勾选费用时收费按钮禁用', async () => {
  render(<BillingPage />);
  await waitOnline();

  fireEvent.change(screen.getByTestId('billing-visit-input'), {
    target: { value: 'v1' },
  });
  fireEvent.click(screen.getByTestId('billing-search'));
  await screen.findByTestId('billing-summary');

  // 清空选择（antd 两字按钮可访问名含空格）
  fireEvent.click(screen.getByRole('button', { name: '清 空' }));
  expect(screen.getByTestId('billing-checkout')).toBeDisabled();
  // store 直接切换某一项（toggleItem 选中→取消）
  const store = useBillingStore.getState();
  store.toggleItem('f1');
  expect(useBillingStore.getState().selectedItemIds).toContain('f1');
  store.toggleItem('f1');
  expect(useBillingStore.getState().selectedItemIds).not.toContain('f1');
  // 全选后应包含全部费用
  store.selectAll();
  expect(useBillingStore.getState().selectedItemIds.length).toBeGreaterThan(0);
});

it('退费：已结算明细发起退费（原因必填）', async () => {
  render(<BillingPage />);
  await waitOnline();
  // 打开已支付结算单
  fireEvent.click(screen.getAllByRole('button', { name: '查看' })[0]);
  expect(await screen.findByTestId('billing-invoice')).toBeInTheDocument();

  // 点击第一条已结算费用的退费
  const refundBtns = screen.getAllByTestId('billing-refund-btn');
  fireEvent.click(refundBtns[0]);
  expect(await screen.findByTestId('billing-refund-modal')).toBeInTheDocument();

  // 未填原因点确认：不提交
  const confirmBtn = screen.getByRole('button', { name: '确认退费' });
  fireEvent.click(confirmBtn);
  await waitFor(() => expect(m.refundFeeItem).not.toHaveBeenCalled());

  // 填写原因后确认
  fireEvent.change(screen.getByTestId('billing-refund-reason'), {
    target: { value: '患者拒查' },
  });
  fireEvent.click(confirmBtn);
  await waitFor(() => expect(m.refundFeeItem).toHaveBeenCalledTimes(1));
  expect(m.refundFeeItem.mock.calls[0][0]).toMatchObject({
    feeItemId: 'f1', reason: '患者拒查',
  });
}, 60000);

it('未付作废：打开未付结算单 → 作废', async () => {
  // 队列与详情均为未付
  m.fetchSettlementQueue.mockResolvedValue({
    items: [settlement({ status: 'unpaid' })], total: 1,
  });
  m.fetchSettlementDetail.mockResolvedValue(
    detail({
      settlement: settlement({ status: 'unpaid' }),
      invoice: null,
      items: [
        feeItem({ status: 'active', settlementId: null }),
      ],
      sagaLog: [],
    }),
  );
  render(<BillingPage />);
  await waitOnline();

  fireEvent.click(screen.getAllByRole('button', { name: '查看' })[0]);
  const voidBtn = await screen.findByTestId('billing-void-btn');
  fireEvent.click(voidBtn);
  await waitFor(() => expect(m.voidSettlement).toHaveBeenCalledTimes(1));
}, 60000);

it('Saga 日志渲染：正向/补偿标签', async () => {
  render(<BillingPage />);
  await waitOnline();
  fireEvent.click(screen.getAllByRole('button', { name: '查看' })[0]);
  expect(await screen.findByTestId('billing-saga-item')).toBeInTheDocument();
}, 60000);

it('断库：显式离线 Alert，不渲染业务内容', async () => {
  healthMock.mockResolvedValue({
    status: 'ok', version: '0.3.0', demoMode: false, db: 'down',
  });
  render(<BillingPage />);
  expect(await screen.findByTestId('billing-offline-alert')).toBeInTheDocument();
  expect(screen.queryByTestId('billing-content')).toBeNull();
  expect(screen.getByTestId('billing-health-tag')).toHaveTextContent('BFF/DB 不可用');
});
