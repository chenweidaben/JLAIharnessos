/**
 * 健澜科技 jlmedaios - 药房调剂发药 pharmacyStore 单元测试（M2-A）
 *
 * mock 掉 services/api/pharmacy，验证 Zustand store 的：
 *  - 健康探活门禁（db up/down/抛错）；
 *  - 待发药/待审方队列、库存、流水、发药记录加载（成功/失败）；
 *  - select 与 CDS 预览；
 *  - 写操作门禁：dbUp=false 时审方/发药被拒；成功后刷新读模型；失败留 error。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
import { usePharmacyStore } from '@/store/pharmacyStore';
import type {
  CdsPreview,
  DispenseResult,
  DispensingDto,
  InventoryDto,
  InventoryMovementDto,
  PharmacyHealth,
  PharmacyQueueItem,
} from '@/types/pharmacy';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

const health = (db: PharmacyHealth['db'] = 'up'): PharmacyHealth => ({
  status: 'ok',
  version: '0.3.0',
  demoMode: false,
  db,
});

const queueItem = (over: Partial<PharmacyQueueItem> = {}): PharmacyQueueItem => ({
  prescription: {
    id: 'rx1',
    visitId: 'v1',
    rxNo: 'RX20260927001',
    prescriberId: 'doc1',
    status: 'approved',
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
  patientName: '测*甲',
  department: '内科',
  ...over,
});

const inventory = (over: Partial<InventoryDto> = {}): InventoryDto => ({
  id: 'inv1',
  drugId: 'drug1',
  drugCode: 'D021',
  genericName: '对乙酰氨基酚',
  warehouse: '中心药房',
  batchNo: 'LOT-D021',
  quantity: 100,
  unit: '片',
  expiryDate: '2027-01-01',
  createdAt: '',
  updatedAt: '',
  ...over,
});

const movement = (over: Partial<InventoryMovementDto> = {}): InventoryMovementDto => ({
  id: 'mv1',
  drugId: 'drug1',
  warehouse: '中心药房',
  batchNo: 'LOT-D021',
  changeQty: -4,
  balanceAfter: 96,
  reason: 'dispense',
  refType: 'prescription',
  refId: 'rx1',
  actorId: 'ph1',
  createdAt: '2026-09-27T08:05:00Z',
  ...over,
});

const dispensing = (over: Partial<DispensingDto> = {}): DispensingDto => ({
  id: 'd1',
  prescriptionId: 'rx1',
  itemId: 'it1',
  drugId: 'drug1',
  drugCode: 'D021',
  drugName: '对乙酰氨基酚',
  warehouse: '中心药房',
  batchNo: 'LOT-D021',
  quantity: 4,
  unit: '片',
  dispensedBy: 'ph1',
  dispensedAt: '2026-09-27T08:05:00Z',
  idempotencyKey: 'rx1:it1:ph1',
  overrideReason: null,
  overrideBy: null,
  cdsHits: [],
  createdAt: '2026-09-27T08:05:00Z',
  ...over,
});

const cdsPreview = (over: Partial<CdsPreview> = {}): CdsPreview => ({
  passed: true,
  maxLevel: null,
  blocks: [],
  hits: [],
  ...over,
});

const dispenseResult = (over: Partial<DispenseResult> = {}): DispenseResult => ({
  prescription: queueItem().prescription,
  dispensings: [dispensing()],
  cds: { passed: true, maxLevel: null, hits: [] },
  deduplicated: false,
  ...over,
});

/** 重置为初始数据态（动作函数保持不变）。 */
function resetStore(): void {
  usePharmacyStore.setState({
    health: null,
    dbUp: false,
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

describe('pharmacyStore 健康探活门禁', () => {
  it('db=up → dbUp=true，写入 health，返回 true', async () => {
    m.getSystemHealth.mockResolvedValue(health('up'));
    const up = await usePharmacyStore.getState().checkHealth();
    const s = usePharmacyStore.getState();
    expect(up).toBe(true);
    expect(s.dbUp).toBe(true);
    expect(s.health?.db).toBe('up');
    expect(s.healthChecking).toBe(false);
    expect(s.error).toBeNull();
  });

  it('db=down → dbUp=false，返回 false', async () => {
    m.getSystemHealth.mockResolvedValue(health('down'));
    const up = await usePharmacyStore.getState().checkHealth();
    expect(up).toBe(false);
    expect(usePharmacyStore.getState().dbUp).toBe(false);
  });

  it('探活抛错（BFF/DB 不可达）→ dbUp=false 并记录连接错误', async () => {
    m.getSystemHealth.mockRejectedValue(new Error('fetch failed'));
    const up = await usePharmacyStore.getState().checkHealth();
    const s = usePharmacyStore.getState();
    expect(up).toBe(false);
    expect(s.dbUp).toBe(false);
    expect(s.error).toContain('BFF/数据库连接失败');
    expect(s.error).toContain('fetch failed');
  });
});

describe('pharmacyStore 队列加载', () => {
  it('loadDispenseQueue 成功写入待发队列', async () => {
    m.fetchDispenseQueue.mockResolvedValue([queueItem()]);
    await usePharmacyStore.getState().loadDispenseQueue();
    const s = usePharmacyStore.getState();
    expect(s.dispenseQueue).toHaveLength(1);
    expect(s.loading).toBe(false);
    expect(s.error).toBeNull();
  });

  it('loadReviewQueue 成功写入待审队列', async () => {
    m.fetchReviewQueue.mockResolvedValue([queueItem()]);
    await usePharmacyStore.getState().loadReviewQueue();
    expect(usePharmacyStore.getState().reviewQueue).toHaveLength(1);
  });

  it('队列加载失败 → 记录 error 且 loading 复位，不抛出', async () => {
    m.fetchDispenseQueue.mockRejectedValue(new Error('队列加载失败'));
    await usePharmacyStore.getState().loadDispenseQueue();
    const s = usePharmacyStore.getState();
    expect(s.error).toBe('队列加载失败');
    expect(s.loading).toBe(false);
  });
});

describe('pharmacyStore 选择与 CDS 预览', () => {
  it('select(id) 记录选中并清空旧预览；select(null) 复位', () => {
    usePharmacyStore.setState({ cdsPreview: cdsPreview(), selectedId: 'old' });
    usePharmacyStore.getState().select('rx1');
    let s = usePharmacyStore.getState();
    expect(s.selectedId).toBe('rx1');
    expect(s.cdsPreview).toBeNull();

    usePharmacyStore.getState().select(null);
    s = usePharmacyStore.getState();
    expect(s.selectedId).toBeNull();
  });

  it('previewCds 成功写入预览并返回', async () => {
    const pv = cdsPreview({ passed: false });
    m.previewCds.mockResolvedValue(pv);
    const r = await usePharmacyStore.getState().previewCds('rx1');
    expect(r).toBe(pv);
    expect(usePharmacyStore.getState().cdsPreview).toBe(pv);
  });

  it('previewCds 失败 → 记录 error 并返回 null', async () => {
    m.previewCds.mockRejectedValue(new Error('预览失败'));
    const r = await usePharmacyStore.getState().previewCds('rx1');
    expect(r).toBeNull();
    expect(usePharmacyStore.getState().error).toBe('预览失败');
  });
});

describe('pharmacyStore 审方写操作', () => {
  it('dbUp=false 时审方被门禁拒绝，不调用 api', async () => {
    const ok = await usePharmacyStore.getState().review('rx1', 'approved');
    expect(ok).toBe(false);
    expect(usePharmacyStore.getState().error).toBe('数据库不可用，无法审方');
    expect(m.reviewPrescription).not.toHaveBeenCalled();
  });

  it('审方成功 → 刷新待审/待发队列并返回 true', async () => {
    usePharmacyStore.setState({ dbUp: true });
    m.reviewPrescription.mockResolvedValue(queueItem().prescription);
    m.fetchReviewQueue.mockResolvedValue([]);
    m.fetchDispenseQueue.mockResolvedValue([queueItem()]);
    const ok = await usePharmacyStore.getState().review('rx1', 'approved', '通过');
    expect(ok).toBe(true);
    expect(m.reviewPrescription).toHaveBeenCalledWith('rx1', 'approved', '通过');
    expect(m.fetchReviewQueue).toHaveBeenCalled();
    expect(m.fetchDispenseQueue).toHaveBeenCalled();
    expect(usePharmacyStore.getState().submitting).toBe(false);
  });

  it('审方失败 → 返回 false、记录 error、submitting 复位', async () => {
    usePharmacyStore.setState({ dbUp: true });
    m.reviewPrescription.mockRejectedValue(new Error('审方失败'));
    const ok = await usePharmacyStore.getState().review('rx1', 'rejected', 'x');
    expect(ok).toBe(false);
    expect(usePharmacyStore.getState().error).toBe('审方失败');
    expect(usePharmacyStore.getState().submitting).toBe(false);
  });
});

describe('pharmacyStore 发药写操作', () => {
  it('dbUp=false 时发药被门禁拒绝，不调用 api', async () => {
    const r = await usePharmacyStore.getState().dispense('rx1', {});
    expect(r).toBeNull();
    expect(usePharmacyStore.getState().error).toBe('数据库不可用，无法发药');
    expect(m.dispense).not.toHaveBeenCalled();
  });

  it('发药成功 → 返回结果，清空选中，并刷新队列/库存/流水/记录', async () => {
    usePharmacyStore.setState({ dbUp: true, selectedId: 'rx1', cdsPreview: cdsPreview() });
    m.dispense.mockResolvedValue(dispenseResult());
    m.fetchDispenseQueue.mockResolvedValue([]);
    m.fetchInventory.mockResolvedValue([inventory()]);
    m.fetchMovements.mockResolvedValue([movement()]);
    m.fetchDispensings.mockResolvedValue([dispensing()]);

    const r = await usePharmacyStore.getState().dispense('rx1', { warehouse: '中心药房' });
    expect(r).not.toBeNull();
    expect(r?.deduplicated).toBe(false);
    expect(m.dispense).toHaveBeenCalledWith('rx1', { warehouse: '中心药房' });
    const s = usePharmacyStore.getState();
    expect(s.selectedId).toBeNull();
    expect(s.cdsPreview).toBeNull();
    expect(s.inventory).toHaveLength(1);
    expect(s.movements).toHaveLength(1);
    expect(s.dispensings).toHaveLength(1);
    expect(s.submitting).toBe(false);
  });

  it('发药失败 → 返回 null、记录 error、submitting 复位', async () => {
    usePharmacyStore.setState({ dbUp: true });
    m.dispense.mockRejectedValue(new Error('发药失败'));
    const r = await usePharmacyStore.getState().dispense('rx1', {});
    expect(r).toBeNull();
    expect(usePharmacyStore.getState().error).toBe('发药失败');
    expect(usePharmacyStore.getState().submitting).toBe(false);
  });
});

describe('pharmacyStore 库存/流水/记录加载与清错', () => {
  it('loadInventory / loadMovements / loadDispensings 成功写入', async () => {
    m.fetchInventory.mockResolvedValue([inventory()]);
    m.fetchMovements.mockResolvedValue([movement()]);
    m.fetchDispensings.mockResolvedValue([dispensing()]);
    await usePharmacyStore.getState().loadInventory();
    await usePharmacyStore.getState().loadMovements();
    await usePharmacyStore.getState().loadDispensings();
    const s = usePharmacyStore.getState();
    expect(s.inventory).toHaveLength(1);
    expect(s.movements).toHaveLength(1);
    expect(s.dispensings).toHaveLength(1);
  });

  it('库存加载失败 → 记录 error 且 loading 复位', async () => {
    m.fetchInventory.mockRejectedValue(new Error('库存加载失败'));
    await usePharmacyStore.getState().loadInventory();
    expect(usePharmacyStore.getState().error).toBe('库存加载失败');
    expect(usePharmacyStore.getState().loading).toBe(false);
  });

  it('clearError 清空错误', () => {
    usePharmacyStore.setState({ error: '某错误' });
    usePharmacyStore.getState().clearError();
    expect(usePharmacyStore.getState().error).toBeNull();
  });
});
