/**
 * 健澜科技 jlmedaios - M177-D 医院耗材管理深化——SPD 物流 纯函数单测。
 *
 * 【病案设备耗材】不依赖数据库：仅测
 *   optimizeConsumableInventory / trackConsumableConsumption /
 *   identifyHighValueConsumables / buildDeepConsumableMgmt 四个纯函数。
 *
 * 核心红线：高值耗材一物一码追溯，不能漏——缺序列号必须被显式判为漏追溯。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildDeepConsumableMgmt,
  optimizeConsumableInventory,
  trackConsumableConsumption,
  identifyHighValueConsumables,
  DEMO_CONSUMABLES,
  isHighValueItem,
  HIGH_VALUE_PRICE_THRESHOLD,
  type ConsumableItem,
} from '@/bff/aggregators/consumableSpdAggregator';

/* ===================== 高值耗材一物一码追溯（不能漏） ===================== */

describe('identifyHighValueConsumables', () => {
  it('识别高值件：显式 high 或单价 ≥ 阈值', () => {
    const stent = DEMO_CONSUMABLES.find((i) => i.itemCode === 'DISP-OR-STENT')!;
    const syringe = DEMO_CONSUMABLES.find((i) => i.itemCode === 'DISP-SYRINGE')!;
    expect(isHighValueItem(stent)).toBe(true);
    expect(isHighValueItem(syringe)).toBe(false);
    expect(HIGH_VALUE_PRICE_THRESHOLD).toBe(1000);
  });

  it('演示台账含 4 件高值耗材（支架/关节/起搏器/晶体）', () => {
    const r = identifyHighValueConsumables(DEMO_CONSUMABLES);
    expect(r.highValueCount).toBe(4);
  });

  it('缺序列号的高值件（人工晶体）必须判为漏追溯，不能静默放行', () => {
    const r = identifyHighValueConsumables(DEMO_CONSUMABLES);
    expect(r.hasGap).toBe(true);
    const lens = r.missingTrace.find((m) => m.itemCode === 'DISP-OR-LENS');
    expect(lens).toBeDefined();
    // 人工晶体有 UDI 但缺 serialNo → missing 含 'serial'
    expect(lens!.missing).toContain('serial');
    expect(lens!.reason).toContain('禁止出库');
  });

  it('追溯率 = 已闭环 / 高值总数（3/4 = 75%）', () => {
    const r = identifyHighValueConsumables(DEMO_CONSUMABLES);
    expect(r.fullyTracedCount).toBe(3);
    expect(r.traceRate).toBe(75);
  });

  it('已闭环高值件输出 8 段追溯链（采购→结算）', () => {
    const r = identifyHighValueConsumables(DEMO_CONSUMABLES);
    expect(r.traceChains.length).toBe(3);
    for (const chain of r.traceChains) {
      expect(chain.serialNo).not.toBe('');
      expect(chain.udiCode).not.toBe('');
      expect(chain.stages.length).toBe(8);
      expect(chain.stages[0].label).toBe('采购订单');
      expect(chain.stages[7].label).toBe('供应商结算');
    }
  });

  it('纯函数：补齐序列号后追溯率回到 100%、无漏追溯', () => {
    const fixed: ConsumableItem[] = DEMO_CONSUMABLES.map((it) =>
      it.itemCode === 'DISP-OR-LENS' ? { ...it, serialNo: 'SN-LENS-5001' } : it,
    );
    const r = identifyHighValueConsumables(fixed);
    expect(r.hasGap).toBe(false);
    expect(r.missingTrace).toHaveLength(0);
    expect(r.traceRate).toBe(100);
  });

  it('空台账：无高值件时追溯率 100、无漏追溯', () => {
    const r = identifyHighValueConsumables([]);
    expect(r.highValueCount).toBe(0);
    expect(r.traceRate).toBe(100);
    expect(r.hasGap).toBe(false);
  });
});

/* ===================== 库存优化 ===================== */

describe('optimizeConsumableInventory', () => {
  it('缺断样本（注射器在库 5 ≤ 安全库存 10）→ 紧急补货', () => {
    const r = optimizeConsumableInventory(DEMO_CONSUMABLES);
    const syringe = r.items.find((i) => i.itemCode === 'DISP-SYRINGE')!;
    expect(syringe.action).toBe('replenish');
    // 建议订货量 = (maxStock - current) * 0.6 = (200-5)*0.6 = 117
    expect(syringe.suggestedOrderQty).toBe(117);
  });

  it('呆滞样本（刀片在库 200 > 最高 120）→ 退库/调拨', () => {
    const r = optimizeConsumableInventory(DEMO_CONSUMABLES);
    const scalpel = r.items.find((i) => i.itemCode === 'DISP-SCALPEL')!;
    expect(scalpel.action).toBe('reduce');
    // 呆滞压占 = (200-120) * 3.5 = 280 元
    expect(r.summary.excessValue).toBe(280);
  });

  it('再订货点 = 安全库存 + 提前期需求（月耗/30 × 7 天上取整）', () => {
    const r = optimizeConsumableInventory(DEMO_CONSUMABLES);
    const syringe = r.items.find((i) => i.itemCode === 'DISP-SYRINGE')!;
    // 10 + ceil(300/30*7) = 10 + 70 = 80
    expect(syringe.reorderPoint).toBe(80);
  });

  it('可支撑天数 = 在库 / (月耗/30)，高值支架约 36 天', () => {
    const r = optimizeConsumableInventory(DEMO_CONSUMABLES);
    const stent = r.items.find((i) => i.itemCode === 'DISP-OR-STENT')!;
    expect(stent.stockDays).toBeCloseTo(36, 0);
  });

  it('ABC 分级：年耗用金额高的支架/关节为 A 类', () => {
    const r = optimizeConsumableInventory(DEMO_CONSUMABLES);
    const stent = r.items.find((i) => i.itemCode === 'DISP-OR-STENT')!;
    const gloves = r.items.find((i) => i.itemCode === 'DISP-GLOVES')!;
    expect(stent.abcClass).toBe('A');
    // 手套年耗用 = 900*12*0.8 = 8640 元 < 20000 → C
    expect(gloves.abcClass).toBe('C');
  });

  it('汇总计数：补货/退库/观察/健康之和等于总数', () => {
    const r = optimizeConsumableInventory(DEMO_CONSUMABLES);
    const s = r.summary;
    expect(s.replenishCount + s.reduceCount + s.monitorCount + s.okCount).toBe(s.total);
    expect(s.replenishValue).toBeGreaterThan(0);
    expect(s.conclusion).toContain('类耗材');
  });

  it('纯函数：同参两次结果一致', () => {
    const a = optimizeConsumableInventory(DEMO_CONSUMABLES);
    const b = optimizeConsumableInventory(DEMO_CONSUMABLES);
    expect(a).toEqual(b);
  });
});

/* ===================== 科室耗材消耗跟踪 ===================== */

describe('trackConsumableConsumption', () => {
  it('手术麻醉科本月：总件数 64、高值 18 件', () => {
    const r = trackConsumableConsumption('or', 'month');
    expect(r.totalQty).toBe(64);
    expect(r.highValueQty).toBe(18);
    expect(r.departmentName).toBe('手术麻醉科');
  });

  it('手术麻醉科消耗总金额精确（248121 元）', () => {
    const r = trackConsumableConsumption('or', 'month');
    expect(r.totalCost).toBe(248121);
  });

  it('HMS 计费闭环率 = 已计费 / 总件数（58/64 ≈ 90.6%）', () => {
    const r = trackConsumableConsumption('or', 'month');
    expect(r.billedQty).toBe(58);
    expect(r.billingMatchRate).toBeCloseTo(90.6, 1);
  });

  it('month 周期输出 3 个旬趋势桶，金额单调非负', () => {
    const r = trackConsumableConsumption('or', 'month');
    expect(r.trend).toHaveLength(3);
    for (const t of r.trend) {
      expect(t.qty).toBeGreaterThanOrEqual(0);
      expect(t.cost).toBeGreaterThanOrEqual(0);
    }
  });

  it('消耗 TOP 列表按金额降序、最多 5 条', () => {
    const r = trackConsumableConsumption('or', 'month');
    expect(r.topItems.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < r.topItems.length; i++) {
      expect(r.topItems[i - 1].cost).toBeGreaterThanOrEqual(r.topItems[i].cost);
    }
  });

  it('未知科室回退全院汇总（department=all）', () => {
    const r = trackConsumableConsumption('not-a-dept', 'month');
    expect(r.department).toBe('all');
    expect(r.totalQty).toBeGreaterThan(64); // 全院多于手术麻醉科
  });

  it('week 周期输出 7 个日趋势桶', () => {
    const r = trackConsumableConsumption('cardiology', 'week');
    expect(r.trend).toHaveLength(7);
    expect(r.departmentName).toBe('心血管内科');
  });
});

/* ===================== SPD 深度管理驾驶舱 ===================== */

describe('buildDeepConsumableMgmt', () => {
  it('模式为 SPD，demo=true', () => {
    const v = buildDeepConsumableMgmt();
    expect(v.mode).toBe('SPD');
    expect(v.demo).toBe(true);
  });

  it('三级库存合计 = 一级 + 二级 + 消耗点', () => {
    const v = buildDeepConsumableMgmt();
    expect(v.inventory.total).toBe(
      v.inventory.level1Total + v.inventory.level2Total + v.inventory.pointTotal,
    );
    expect(v.inventory.byLocation).toHaveLength(3);
  });

  it('组合高值追溯：存在漏追溯（hasGap=true）', () => {
    const v = buildDeepConsumableMgmt();
    expect(v.highValue.hasGap).toBe(true);
    expect(v.highValue.missingTrace.length).toBeGreaterThan(0);
  });

  it('四段闭环齐全：采购订单/到货/使用计费/PPV 结算', () => {
    const v = buildDeepConsumableMgmt();
    expect(v.procurement.purchaseOrders.length).toBeGreaterThan(0);
    expect(v.procurement.arrivals.length).toBeGreaterThan(0);
    expect(v.usage.billingMatchedRate).toBeGreaterThan(0);
    expect(v.settlement.consignmentSettleValue).toBeGreaterThan(0);
  });

  it('库存优化汇总与台账一致', () => {
    const v = buildDeepConsumableMgmt();
    expect(v.optimization.summary.total).toBe(DEMO_CONSUMABLES.length);
    expect(v.optimization.items.length).toBe(DEMO_CONSUMABLES.length);
  });
});
