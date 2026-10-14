/**
 * 健澜科技 jlmedaios - 药品库存预警纯函数单测
 *
 * 覆盖：低库存判定（< 阈值才预警 / == 阈值不预警 / >= 不预警）、
 * 缺口与建议采购量计算、缺口降序排序、非法输入安全降级、默认阈值。
 * 全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import { lowStockAlert, DEFAULT_STOCK_THRESHOLD, type DrugStockItem } from '../../src/bff/aggregators/drugInventoryAggregator';

const item = (id: string, drugName: string, quantity: number, extra?: Partial<DrugStockItem>): DrugStockItem => ({
  id, drugCode: `D${id}`, drugName, warehouse: '中心药房', batchNo: null,
  quantity, unit: '盒', expiryDate: null, ...extra,
});

describe('低库存判定', () => {
  it('空数组或非法输入 -> 无预警，不抛错', () => {
    expect(lowStockAlert([], 100).length).toBe(0);
    // @ts-expect-error 故意传非法输入验证防御
    expect(lowStockAlert(undefined, 100).length).toBe(0);
    // @ts-expect-error 故意传非法阈值：回退默认 100，qty=10 仍应预警
    const alerts = lowStockAlert([item('1', '药A', 10)], 'abc');
    expect(alerts.length).toBe(1);
    expect(alerts[0].threshold).toBe(DEFAULT_STOCK_THRESHOLD);
  });

  it('库存低于阈值 -> 命中预警', () => {
    const alerts = lowStockAlert([item('1', '注射用头孢曲松钠', 32)], 100);
    expect(alerts.length).toBe(1);
    expect(alerts[0].shortfall).toBe(68);
    // 建议采购量 = 2*阈值 - 当前库存 = 200 - 32 = 168
    expect(alerts[0].suggestedPurchaseQty).toBe(168);
    expect(alerts[0].threshold).toBe(100);
  });

  it('库存等于阈值 -> 不预警（严格小于）', () => {
    expect(lowStockAlert([item('1', '药A', 100)], 100).length).toBe(0);
  });

  it('库存高于阈值 -> 不预警', () => {
    expect(lowStockAlert([item('1', '药A', 500)], 100).length).toBe(0);
  });

  it('混合库存：仅低于阈值的行被选中', () => {
    const alerts = lowStockAlert([
      item('1', '低库存药', 20),
      item('2', '充足药', 800),
      item('3', '临界药', 100),
    ], 100);
    expect(alerts.map((a) => a.drugName)).toEqual(['低库存药']);
  });
});

describe('建议采购量与排序', () => {
  it('建议采购量补至两倍安全库存', () => {
    const alerts = lowStockAlert([item('1', '药A', 60)], 100);
    // 缺口 40，补到 200 -> 采购 140
    expect(alerts[0].shortfall).toBe(40);
    expect(alerts[0].suggestedPurchaseQty).toBe(140);
  });

  it('缺口最大的排最前（最紧急优先）', () => {
    const alerts = lowStockAlert([
      item('1', '缺口小', 90),
      item('2', '缺口大', 10),
      item('3', '缺口中', 50),
    ], 100);
    expect(alerts.map((a) => a.drugName)).toEqual(['缺口大', '缺口中', '缺口小']);
  });
});

describe('防御与默认值', () => {
  it('缺药名/数量非数的脏行被过滤，不抛错', () => {
    const alerts = lowStockAlert([
      // @ts-expect-error 药名为空
      { id: '1', drugName: '', quantity: 5 },
      // @ts-expect-error 数量非数
      { id: '2', drugName: '坏数据', quantity: 'N/A' },
      item('3', '正常低库存', 10),
    ], 100);
    expect(alerts.map((a) => a.id)).toEqual(['3']);
  });

  it('阈值非正数 -> 回退默认阈值 DEFAULT_STOCK_THRESHOLD', () => {
    const alerts = lowStockAlert([item('1', '药A', DEFAULT_STOCK_THRESHOLD - 1)], 0);
    expect(alerts.length).toBe(1);
    expect(alerts[0].threshold).toBe(DEFAULT_STOCK_THRESHOLD);
  });

  it('负库存按 0 计缺口，建议采购量 = 2 倍阈值', () => {
    const alerts = lowStockAlert([item('1', '药A', -5)], 100);
    expect(alerts[0].quantity).toBe(0);
    expect(alerts[0].shortfall).toBe(100);
    expect(alerts[0].suggestedPurchaseQty).toBe(200);
  });
});
