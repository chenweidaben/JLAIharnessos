/**
 * 健澜科技 jlmedaios - 设备 V2 纯函数单测（M213-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessEquipmentUtilization,
  buildEquipmentReportV2,
  trackConsumableTraceability,
} from '../../src/bff/aggregators/equipmentReportV2Aggregator';

describe('assessEquipmentUtilization', () => {
  it('160 小时 / 200 可用 → 80% 高效', () => {
    const r = assessEquipmentUtilization(160, 200);
    expect(r.rate).toBe(0.8);
    expect(r.level).toBe('高效');
  });

  it('60 小时 / 200 可用 → 30% 闲置', () => {
    const r = assessEquipmentUtilization(60, 200);
    expect(r.level).toBe('闲置');
  });
});

describe('trackConsumableTraceability', () => {
  it('8 位条码 → 可追溯', () => {
    const r = trackConsumableTraceability('ABC12345');
    expect(r.traceable).toBe(true);
  });

  it('短条码 → 不可追溯', () => {
    const r = trackConsumableTraceability('AB12');
    expect(r.traceable).toBe(false);
  });
});

describe('buildEquipmentReportV2', () => {
  it('生成生命周期数据', () => {
    const r = buildEquipmentReportV2('30d');
    expect(r.lifecycle.total).toBeGreaterThan(0);
  });

  it('生成绩效数据', () => {
    const r = buildEquipmentReportV2('30d');
    expect(r.performance.utilization).toBeGreaterThan(0);
  });

  it('生成耗材数据', () => {
    const r = buildEquipmentReportV2('30d');
    expect(r.consumable.highValue).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildEquipmentReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
