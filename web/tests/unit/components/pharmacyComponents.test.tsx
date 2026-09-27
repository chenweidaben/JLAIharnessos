/**
 * 健澜科技 jlmedaios - 药房调剂发药组件测试（M2-A）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - DispenseModal：FEFO 默认选近效期批次并可改选；CDS block 红色警示 + override 必填
 *    （未填禁用确认，填写后放行，提交携带批次/数量/override）；warning 可继续；
 *    无可用批次（断库）禁用确认；取消关闭。
 *  - ReviewModal：审核通过；退回须填原因（按钮禁用兜底）；取消关闭。
 *
 * BFF 经 vi.mock 隔离，store 真实驱动（setState 注入门禁），真实落库由后端集成测试覆盖。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test-utils';

import { DispenseModal } from '@/components/pharmacy/DispenseModal';
import { ReviewModal } from '@/components/pharmacy/ReviewModal';
import { usePharmacyStore } from '@/store/pharmacyStore';
import type {
  CdsPreview,
  InventoryDto,
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

/* ------------------------------ 夹具 ------------------------------ */

function makeQueueItem(
  over: Partial<PharmacyQueueItem> = {},
  status: PharmacyQueueItem['prescription']['status'] = 'approved',
): PharmacyQueueItem {
  return {
    prescription: {
      id: 'rx1',
      visitId: 'v1',
      rxNo: 'RX20260927001',
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
          specification: '0.5g*12片',
          dosage: null,
          dosageUnit: null,
          frequency: 'qd',
          route: '口服',
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
    patientName: '测*甲',
    department: '内科',
    ...over,
  };
}

function makeInventory(
  drugCode: string,
  batches: Array<[string, string, number]>, // batchNo, expiry, qty
): InventoryDto[] {
  return batches.map(([batchNo, expiry, quantity], idx) => ({
    id: `inv${idx}`,
    drugId: 'drug1',
    drugCode,
    genericName: '对乙酰氨基酚',
    warehouse: '中心药房',
    batchNo,
    quantity,
    unit: '片',
    expiryDate: expiry,
    createdAt: '',
    updatedAt: '',
  }));
}

const emptyPreview: CdsPreview = { passed: true, maxLevel: null, blocks: [], hits: [] };

const blockPreview: CdsPreview = {
  passed: false,
  maxLevel: 'critical',
  blocks: [
    {
      ruleId: 'ALL-001',
      title: '药物过敏',
      message: '患者对青霉素过敏，禁用青霉素类',
      level: 'critical',
      actionType: 'block',
      requireOverride: true,
      suggestions: ['复核过敏史'],
    },
  ],
  hits: [
    {
      ruleId: 'ALL-001',
      title: '药物过敏',
      message: '患者对青霉素过敏，禁用青霉素类',
      level: 'critical',
      actionType: 'block',
      requireOverride: true,
      suggestions: ['复核过敏史'],
    },
  ],
};

const warningPreview: CdsPreview = {
  passed: true,
  maxLevel: 'warning',
  blocks: [],
  hits: [
    {
      ruleId: 'DDI-010',
      title: '相互作用提示',
      message: '两药联用可能增加出血风险',
      level: 'warning',
      actionType: 'warning',
      requireOverride: false,
      suggestions: ['加强观察'],
    },
  ],
};

function resetStore(): void {
  usePharmacyStore.setState({
    health: null,
    dbUp: true,
    healthChecking: false,
    dispenseQueue: [],
    reviewQueue: [],
    selectedId: null,
    cdsPreview: null,
    inventory: [],
    movements: [],
    dispensings: [],
    loading: false,
    submitting: false,
    error: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetStore();
});

/* --------------------------- DispenseModal --------------------------- */

describe('DispenseModal FEFO 批次', () => {
  it('默认按近效期先出选中 LOT-NEAR，并可改选为 LOT-FAR', async () => {
    vi.mocked(api.previewCds).mockResolvedValue(emptyPreview);
    const inventory = makeInventory('D021', [
      ['LOT-NEAR', '2026-12-01', 10],
      ['LOT-FAR', '2027-12-01', 20],
    ]);
    const onClose = vi.fn();
    render(
      <DispenseModal item={makeQueueItem()} inventory={inventory} onClose={onClose} />,
    );

    expect(await screen.findByText('处方调剂发药确认', { selector: '.ant-modal-title' })).toBeInTheDocument();
    // 默认选中近效期批次
    await waitFor(() =>
      expect(document.querySelector('.ant-select-selection-item')?.getAttribute('title')).toContain('LOT-NEAR'),
    );

    // 打开批次下拉，改选远效期
    const combobox = screen.getByRole('combobox', { name: '批次-D021' });
    fireEvent.mouseDown(combobox);
    const farOption = await waitFor(() => {
      const opts = document.querySelectorAll('.ant-select-item-option');
      const found = Array.from(opts).find((o) => o.textContent?.includes('LOT-FAR'));
      if (!found) throw new Error('LOT-FAR option not ready');
      return found;
    });
    fireEvent.click(farOption);
    await waitFor(() =>
      expect(document.querySelector('.ant-select-selection-item')?.getAttribute('title')).toContain('LOT-FAR'),
    );
  });
});

describe('DispenseModal CDS block 红色警示与 override 必填', () => {
  const inventory = makeInventory('D021', [['LOT-NEAR', '2026-12-01', 10]]);

  it('未填 override 原因时确认按钮禁用，block 红警与表单展示', async () => {
    vi.mocked(api.previewCds).mockResolvedValue(blockPreview);
    render(<DispenseModal item={makeQueueItem()} inventory={inventory} onClose={vi.fn()} />);

    expect(await screen.findByTestId('dispense-block-alert')).toBeInTheDocument();
    expect(screen.getByText(/CDS 拦截 1 项/)).toBeInTheDocument();
    expect(screen.getByTestId('override-form')).toBeInTheDocument();
    expect(screen.getByLabelText('override 原因')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /确认发药/ })).toBeDisabled();
    // 不出现 warning 样式的提示
    expect(screen.queryByTestId('dispense-warn-alert')).not.toBeInTheDocument();
  });

  it('填写 override 原因后放行，提交携带批次/数量/override 并关闭', async () => {
    vi.mocked(api.previewCds).mockResolvedValue(blockPreview);
    vi.mocked(api.dispense).mockResolvedValue({
      prescription: makeQueueItem().prescription,
      dispensings: [],
      cds: { passed: false, maxLevel: 'critical', hits: [] },
      deduplicated: false,
    });
    const onClose = vi.fn();
    render(<DispenseModal item={makeQueueItem()} inventory={inventory} onClose={onClose} />);

    await screen.findByTestId('dispense-block-alert');
    const confirm = screen.getByRole('button', { name: /确认发药/ });
    await waitFor(() => expect(confirm).toBeDisabled());

    fireEvent.change(screen.getByLabelText('override 原因'), {
      target: { value: '重症感染确需使用（测试）' },
    });
    await waitFor(() => expect(confirm).toBeEnabled());
    fireEvent.click(confirm);

    await waitFor(() => expect(api.dispense).toHaveBeenCalledTimes(1));
    const [id, payload] = vi.mocked(api.dispense).mock.calls[0];
    expect(id).toBe('rx1');
    expect(payload.warehouse).toBe('中心药房');
    expect(payload.overrideReason).toBe('重症感染确需使用（测试）');
    expect(payload.lines).toHaveLength(1);
    expect(payload.lines?.[0].itemId).toBe('it1');
    expect(payload.lines?.[0].quantity).toBe(4);
    expect(payload.lines?.[0].batchNo).toBe('LOT-NEAR');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe('DispenseModal warning / 断库 / 取消', () => {
  it('仅 warning：展示警示但无需 override，确认按钮可用', async () => {
    vi.mocked(api.previewCds).mockResolvedValue(warningPreview);
    const inventory = makeInventory('D021', [['LOT-NEAR', '2026-12-01', 10]]);
    render(<DispenseModal item={makeQueueItem()} inventory={inventory} onClose={vi.fn()} />);

    expect(await screen.findByTestId('dispense-warn-alert')).toBeInTheDocument();
    expect(screen.getByText(/CDS 警示 1 项/)).toBeInTheDocument();
    expect(screen.queryByTestId('override-form')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /确认发药/ })).toBeEnabled();
  });

  it('无可用批次（断库）：展示断库红警且确认禁用', async () => {
    vi.mocked(api.previewCds).mockResolvedValue(emptyPreview);
    // 处方药品 D021，但库存给的是 D999（无匹配批次）
    const inventory = makeInventory('D999', [['LOT-X', '2027-01-01', 5]]);
    render(<DispenseModal item={makeQueueItem()} inventory={inventory} onClose={vi.fn()} />);

    expect(await screen.findByTestId('dispense-outofstock-alert')).toBeInTheDocument();
    const tag = document.querySelector('.ant-table-cell .ant-tag-red');
    expect(tag?.textContent).toBe('无可用批次');
    expect(screen.getByRole('button', { name: /确认发药/ })).toBeDisabled();
  });

  it('取消按钮关闭弹窗，不触发发药', async () => {
    vi.mocked(api.previewCds).mockResolvedValue(emptyPreview);
    const inventory = makeInventory('D021', [['LOT-NEAR', '2026-12-01', 10]]);
    const onClose = vi.fn();
    render(<DispenseModal item={makeQueueItem()} inventory={inventory} onClose={onClose} />);

    await screen.findByText('处方调剂发药确认', { selector: '.ant-modal-title' });
    fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }));
    expect(onClose).toHaveBeenCalled();
    expect(api.dispense).not.toHaveBeenCalled();
  });
});

/* --------------------------- ReviewModal --------------------------- */

describe('ReviewModal 审方', () => {
  it('审核通过：调用 review(rx1, approved) 并关闭', async () => {
    vi.mocked(api.reviewPrescription).mockResolvedValue(makeQueueItem().prescription);
    const onClose = vi.fn();
    render(<ReviewModal item={makeQueueItem({}, 'pending_review')} onClose={onClose} />);

    expect(await screen.findByText('药师处方审核', { selector: '.ant-modal-title' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /审核通过/ }));
    await waitFor(() =>
      expect(api.reviewPrescription).toHaveBeenCalledWith('rx1', 'approved', null),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('退回：未填原因时退回按钮禁用；填写后调用 review(rx1, rejected, 原因)', async () => {
    vi.mocked(api.reviewPrescription).mockResolvedValue(makeQueueItem().prescription);
    const onClose = vi.fn();
    render(<ReviewModal item={makeQueueItem({}, 'pending_review')} onClose={onClose} />);

    await screen.findByText('药师处方审核', { selector: '.ant-modal-title' });
    const rejectBtn = screen.getByRole('button', { name: /退回/ });
    expect(rejectBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText('审核意见'), {
      target: { value: '用法用量不适宜（测试）' },
    });
    await waitFor(() => expect(rejectBtn).toBeEnabled());
    fireEvent.click(rejectBtn);
    await waitFor(() =>
      expect(api.reviewPrescription).toHaveBeenCalledWith('rx1', 'rejected', '用法用量不适宜（测试）'),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('关闭(X)按钮关闭弹窗，不触发审方', async () => {
    const onClose = vi.fn();
    render(<ReviewModal item={makeQueueItem({}, 'pending_review')} onClose={onClose} />);
    await screen.findByText('药师处方审核', { selector: '.ant-modal-title' });
    // ReviewModal 自定义 footer 无「取消」，关闭走右上角 X（onCancel）
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
    expect(api.reviewPrescription).not.toHaveBeenCalled();
  });
});
