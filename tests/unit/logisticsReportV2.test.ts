/**
 * 健澜科技 jlmedaios - 后勤基建 V2 纯函数单测（M220-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessLogisticsEfficiency,
  buildLogisticsReportV2,
  calculateEnergyConsumption,
} from '../../src/bff/aggregators/logisticsReportV2Aggregator';

describe('assessLogisticsEfficiency', () => {
  it('5分钟 95%完成率 → 优秀', () => {
    const r = assessLogisticsEfficiency(5, 0.95);
    expect(r.level).toBe('优秀');
  });

  it('30分钟 50%完成率 → 待改进', () => {
    const r = assessLogisticsEfficiency(30, 0.5);
    expect(r.level).toBe('待改进');
  });
});

describe('calculateEnergyConsumption', () => {
  it('80000平米 50kwh/平米 → 400万', () => {
    const r = calculateEnergyConsumption(80000, 50);
    expect(r.total).toBe(4000000);
  });
});

describe('buildLogisticsReportV2', () => {
  it('生成物业数据', () => {
    const r = buildLogisticsReportV2('30d');
    expect(r.property.workOrders).toBeGreaterThan(0);
  });

  it('生成被服数据', () => {
    const r = buildLogisticsReportV2('30d');
    expect(r.linen.processed).toBeGreaterThan(0);
  });

  it('生成餐饮数据', () => {
    const r = buildLogisticsReportV2('30d');
    expect(r.food.meals).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildLogisticsReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
