/**
 * 健澜科技 jlmedaios - 药房调剂发药工作站页面测试（M2-A）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖健康门禁与全部读模型渲染：
 *  - 在线：探活通过后，五个 Tab（待发药/待审方/库存/库存流水/发药记录）表格逐一切换，
 *    非空数据触发全部列渲染函数（含红/绿/橙标签、override 标签分支）；刷新与动作按钮可用；
 *  - 断库/连不上 BFF：显式离线 Alert + Watermark，不渲染任何业务数据，不造假。
 *
 * BFF 经 vi.mock 隔离；真实断库行为另有端到端取证。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

import PharmacyWorkbench from '@/pages/pharmacy';
import type {
  DispensingDto,
  InventoryDto,
  InventoryMovementDto,
  PharmacyQueueItem,
} from '@/types/pharmacy';

vi.mock('@/services/api/pharmacy', () => ({
  getSystemHealth: vi.fn(),
  fetchDispenseQueue: vi.fn(),
  fetchReviewQueue: vi.fn(),
  reviewPrescription: vi.fn(),
  previewCds: vi.fn(),
  dispense: vi.fn(),
  fetchDispensings: vi.fn(),
  fetchInventory: vi.fn(),
  fetchMovements: vi.fn(),
  fetchPrescriptionsByVisit: vi.fn(),
}));

import * as api from '@/services/api/pharmacy';

const healthUp = {
  status: 'ok',
  version: '0.3.0',
  demoMode: false,
  db: 'up' as const,
};

function queueItem(
  status: PharmacyQueueItem['prescription']['status'],
  over: { id?: string; rxNo?: string; patientName?: string } = {},
): PharmacyQueueItem {
  return {
    prescription: {
      id: over.id ?? 'rx1',
      visitId: 'v1',
      rxNo: over.rxNo ?? 'RX20260927001',
      prescriberId: 'doc1',
      status,
      reviewerId: 'ph1',
      reviewLevel: null,
      riskLevel: null,
      auditResult: {},
      counsel: null,
      totalFee: null,
      items: [
        {
          id: 'it1',
          drugCode: 'D021',
          drugName: '对乙酰氨基酚',
          specification: null,
          dosage: null,
          dosageUnit: null,
          frequency: 'qd',
          route: null,
          daysSupply: null,
          quantity: 4,
          quantityUnit: '片',
          skinTest: false,
          remark: null,
        },
      ],
      createdAt: '2026-09-27T08:00:00Z',
      updatedAt: '2026-09-27T08:00:00Z',
    },
    patientName: over.patientName ?? '测*甲',
    department: '内科',
  };
}

const invRows: InventoryDto[] = [
  {
    id: 'inv1', drugId: 'drug1', drugCode: 'D021', genericName: '对乙酰氨基酚',
    warehouse: '中心药房', batchNo: 'LOT-A', quantity: 0, unit: '片',
    expiryDate: '2027-06-01', createdAt: '', updatedAt: '',
  },
  {
    id: 'inv2', drugId: 'drug2', drugCode: 'D022', genericName: '奥美拉唑',
    warehouse: '中心药房', batchNo: 'LOT-B', quantity: 50, unit: '片',
    expiryDate: '2026-01-01', createdAt: '', updatedAt: '',
  },
];

const moveRows: InventoryMovementDto[] = [
  {
    id: 'mv1', drugId: 'drug1', warehouse: '中心药房', batchNo: 'LOT-A',
    changeQty: -4, balanceAfter: 96, reason: 'dispense', refType: 'prescription',
    refId: 'rx1', actorId: 'ph1', createdAt: '2026-09-27T08:05:00Z',
  },
  {
    id: 'mv2', drugId: 'drug2', warehouse: '中心药房', batchNo: 'LOT-B',
    changeQty: 10, balanceAfter: 60, reason: 'receive', refType: null,
    refId: null, actorId: 'ph1', createdAt: '2026-09-27T07:05:00Z',
  },
];

const dispRows: DispensingDto[] = [
  {
    id: 'd1', prescriptionId: 'rx1', itemId: 'it1', drugId: 'drug1', drugCode: 'D021',
    drugName: '对乙酰氨基酚', warehouse: '中心药房', batchNo: 'LOT-A', quantity: 4, unit: '片',
    dispensedBy: 'ph1', dispensedAt: '2026-09-27T08:05:00Z', idempotencyKey: 'k1',
    overrideReason: '重症感染确需使用', overrideBy: 'doc1', cdsHits: [],
    createdAt: '2026-09-27T08:05:00Z',
  },
  {
    id: 'd2', prescriptionId: 'rx2', itemId: 'it2', drugId: 'drug2', drugCode: 'D022',
    drugName: '奥美拉唑', warehouse: '中心药房', batchNo: 'LOT-B', quantity: 2, unit: '片',
    dispensedBy: 'ph1', dispensedAt: '2026-09-27T09:05:00Z', idempotencyKey: 'k2',
    overrideReason: null, overrideBy: null, cdsHits: [],
    createdAt: '2026-09-27T09:05:00Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PharmacyWorkbench 健康门禁与读模型', () => {
  it('在线：五个 Tab 表格逐一切换渲染全部列，刷新与动作按钮可用', async () => {
    vi.mocked(api.getSystemHealth).mockResolvedValue(healthUp);
    vi.mocked(api.fetchDispenseQueue).mockResolvedValue([
      queueItem('approved', { id: 'rx1', rxNo: 'RX-DISP-1' }),
    ]);
    vi.mocked(api.fetchReviewQueue).mockResolvedValue([
      queueItem('pending_review', { id: 'rx2', rxNo: 'RX-REV-1' }),
    ]);
    vi.mocked(api.fetchInventory).mockResolvedValue(invRows);
    vi.mocked(api.fetchMovements).mockResolvedValue(moveRows);
    vi.mocked(api.fetchDispensings).mockResolvedValue(dispRows);
    vi.mocked(api.previewCds).mockResolvedValue({
      passed: true, maxLevel: null, blocks: [], hits: [],
    });

    render(<PharmacyWorkbench />);

    expect(await screen.findByTestId('pharmacy-content')).toBeInTheDocument();

    const panelEl = (key: string) =>
      document.getElementById(`rc-tabs-test-panel-${key}`)!;

    // 默认待发药 Tab：处方号与调剂发药动作渲染
    expect(await within(panelEl('dispense')).findByText('RX-DISP-1')).toBeInTheDocument();
    expect(within(panelEl('dispense')).getByRole('button', { name: /调剂发药/ })).toBeInTheDocument();

    // 切到待审方：审方动作渲染
    fireEvent.click(screen.getByRole('tab', { name: /待审方/ }));
    expect(await within(panelEl('review')).findByText('RX-REV-1')).toBeInTheDocument();
    expect(within(panelEl('review')).getByRole('button', { name: /审\s*方/ })).toBeInTheDocument();

    // 切到库存：两批次（0 红标签 / 50 绿标签、近效期橙标签）
    fireEvent.click(screen.getByRole('tab', { name: /^库存$/ }));
    expect(await within(panelEl('inventory')).findByText('对乙酰氨基酚')).toBeInTheDocument();
    expect(within(panelEl('inventory')).getByText('奥美拉唑')).toBeInTheDocument();

    // 切到库存流水：出库红 / 入库绿标签、原因渲染
    fireEvent.click(screen.getByRole('tab', { name: /库存流水/ }));
    expect(await within(panelEl('movements')).findByText('dispense')).toBeInTheDocument();
    expect(within(panelEl('movements')).getByText('receive')).toBeInTheDocument();

    // 切到发药记录：override 紫标签 / 正常绿标签
    fireEvent.click(screen.getByRole('tab', { name: /发药记录/ }));
    expect(await within(panelEl('records')).findByText('override')).toBeInTheDocument();
    expect(within(panelEl('records')).getByText('正常')).toBeInTheDocument();

    // 刷新按钮：再次探活与加载
    fireEvent.click(screen.getByRole('button', { name: /刷\s*新/ }));
    await waitFor(() => expect(api.getSystemHealth).toHaveBeenCalledTimes(2));

    // 动作按钮：打开调剂弹窗后关闭（页面与弹窗集成）
    fireEvent.click(screen.getByRole('tab', { name: /待发药/ }));
    fireEvent.click(await screen.findByRole('button', { name: /调剂发药/ }));
    expect(await screen.findByText('处方调剂发药确认', { selector: '.ant-modal-title' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }));
    await waitFor(() =>
      expect(screen.queryByText('处方调剂发药确认', { selector: '.ant-modal-title' })).not.toBeInTheDocument(),
    );
  }, 60000);

  it('断库/连不上 BFF：显式离线 Alert + Watermark，不渲染业务数据', async () => {
    vi.mocked(api.getSystemHealth).mockRejectedValue(new Error('network down'));

    render(<PharmacyWorkbench />);

    expect(await screen.findByTestId('pharmacy-offline-alert')).toBeInTheDocument();
    expect(screen.getByText(/无法连接 BFF 或数据库，药房工作站不可用/)).toBeInTheDocument();
    expect(screen.queryByTestId('pharmacy-content')).not.toBeInTheDocument();

    await waitFor(
      () =>
        expect(document.querySelector('[style*="background-image"]')).toBeInTheDocument(),
      { timeout: 5000, interval: 100 },
    );
  });
});
