/**
 * 健澜科技 jlmedaios - 药品供应链 V2 纯函数单测（M209-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessDrugInventoryTurnover,
  buildDrugSupplyReportV2,
  traceHighValueConsumable,
} from '../../src/bff/aggregators/drugSupplyReportV2Aggregator';

describe('assessDrugInventoryTurnover', () => {
  it('库存 1000 万 使用 5000 万 → 5 次 合理', () => {
    const r = assessDrugInventoryTurnover(1000, 5000);
    expect(r.turnover).toBe(5);
    expect(r.level).toBe('合理');
  });

  it('库存 1000 万 使用 1000 万 → 1 次 积压', () => {
    const r = assessDrugInventoryTurnover(1000, 1000);
    expect(r.level).toBe('积压');
  });
});

describe('traceHighValueConsumable', () => {
  it('有效条码 → traced', () => {
    const r = traceHighValueConsumable('HB2026001');
    expect(r.traced).toBe(true);
    expect(r.batch).toBe('B2026001');
  });

  it('空条码 → not traced', () => {
    const r = traceHighValueConsumable('');
    expect(r.traced).toBe(false);
  });
});

describe('buildDrugSupplyReportV2', () => {
  it('生成采购数据', () => {
    const r = buildDrugSupplyReportV2('30d');
    expect(r.procurement.sunshine).toBeGreaterThan(0);
  });

  it('生成库存数据', () => {
    const r = buildDrugSupplyReportV2('30d');
    expect(r.inventory.total).toBeGreaterThan(0);
  });

  it('生成SPD数据', () => {
    const r = buildDrugSupplyReportV2('30d');
    expect(r.spd.highValue).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildDrugSupplyReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
