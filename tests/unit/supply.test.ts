/**
 * 健澜科技 jlmedaios - M139-C 物资耗材管理纯函数单测（医院运营管理）
 *
 * 覆盖：入库累加与批次更新、出库扣减、库存计算、库存不足禁止出库（账实相符红线）、
 * 低库存预警触发（< 阈值预警 / == 阈值不预警 / 缺货 out 优先排序）、非法输入防御。
 * 全部内存台账，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it, beforeEach } from 'bun:test';

import {
  getLowStockAlerts,
  recordSupplyIn,
  recordSupplyOut,
  resetSupplyStore,
  listStock,
} from '../../src/bff/aggregators/supplyAggregator';

describe('物资入库', () => {
  beforeEach(() => resetSupplyStore());

  it('入库累加在库存，并记录批次', () => {
    const s = recordSupplyIn('S001', 100, 'B20261001');
    expect(s.quantity).toBe(100);
    expect(s.batchNo).toBe('B20261001');
    // minStock=500，100 < 500，状态应为 low
    expect(s.status).toBe('low');
  });

  it('多次入库累加', () => {
    recordSupplyIn('S001', 200, 'B1');
    const s = recordSupplyIn('S001', 350, 'B2');
    expect(s.quantity).toBe(550);
    expect(s.batchNo).toBe('B2');
    expect(s.status).toBe('normal'); // 550 >= 500
  });

  it('非法数量 / 未知物资 -> 抛错', () => {
    expect(() => recordSupplyIn('S001', 0)).toThrow();
    expect(() => recordSupplyIn('S001', -5)).toThrow();
    expect(() => recordSupplyIn('S001', 'abc' as unknown as number)).toThrow();
    expect(() => recordSupplyIn('UNKNOWN', 10)).toThrow();
  });
});

describe('物资出库与库存计算', () => {
  beforeEach(() => resetSupplyStore({ S001: 500, S004: 100 }));

  it('出库扣减在库存', () => {
    const s = recordSupplyOut('S001', 120, '内科病区', 'P0001');
    expect(s.quantity).toBe(380);
    // 380 < minStock 500 -> 偏低
    expect(s.status).toBe('low');
  });

  it('出库到 0 -> 缺货', () => {
    const s = recordSupplyOut('S004', 100, '消毒供应中心');
    expect(s.quantity).toBe(0);
    expect(s.status).toBe('out');
  });

  it('库存不足时禁止出库（账实相符红线，不形成负库存）', () => {
    expect(() => recordSupplyOut('S001', 501, '外科病区')).toThrow(/库存不足/);
    // 库存未被改动
    const after = listStock().find((x) => x.itemId === 'S001');
    expect(after?.quantity).toBe(500);
  });

  it('出库缺科室 / 非法数量 -> 抛错', () => {
    expect(() => recordSupplyOut('S001', 10, '')).toThrow(/科室/);
    expect(() => recordSupplyOut('S001', 0, '内科')).toThrow();
  });
});

describe('低库存预警', () => {
  beforeEach(() => resetSupplyStore({
    S001: 10,   // minStock 500 -> 严重偏低
    S002: 500,  // minStock 300 -> 充足
    S003: 2000, // minStock 2000 -> == 阈值，不预警
    S004: 200,  // minStock 100 -> 充足
    S005: 300,  // minStock 120 -> 充足
    S006: 200,  // minStock 60  -> 充足
    S007: 100,  // minStock 40  -> 充足
    S008: 0,    // minStock 80  -> 缺货 out
    S009: 100,  // minStock 30  -> 充足
  }));

  it('仅低于安全库存的物资命中预警', () => {
    const alerts = getLowStockAlerts();
    const ids = alerts.map((a) => a.itemId).sort();
    expect(ids).toEqual(['S001', 'S008']);
  });

  it('库存等于阈值不预警（严格小于）', () => {
    expect(getLowStockAlerts().find((a) => a.itemId === 'S003')).toBeUndefined();
  });

  it('缺货(out)优先于偏低(low)，同级别按缺口降序', () => {
    const alerts = getLowStockAlerts();
    expect(alerts[0].level).toBe('out');
    expect(alerts[0].itemId).toBe('S008');
    // S001 缺口 = 500 - 10 = 490
    expect(alerts.find((a) => a.itemId === 'S001')?.shortfall).toBe(490);
  });
});
