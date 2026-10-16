/**
 * 健澜科技 jlmedaios - 设备预测性维护纯函数单测（M184-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  predictEquipmentFailure,
  schedulePreventiveMaintenance,
} from '../../src/bff/aggregators/equipmentPredictiveAggregator';

describe('predictEquipmentFailure', () => {
  it('新设备低风险', () => {
    const r = predictEquipmentFailure('e1', {
      totalRunHours: 5000,
      recentFailures: 0,
      daysSinceLastMaintenance: 30,
      ageYears: 2,
    });
    expect(r.riskLevel).toBe('low');
    expect(r.score).toBe(0);
  });

  it('老旧设备高故障历史 → 高风险', () => {
    const r = predictEquipmentFailure('e1', {
      totalRunHours: 60000,
      recentFailures: 3,
      daysSinceLastMaintenance: 200,
      ageYears: 12,
    });
    expect(r.riskLevel).toBe('high');
    expect(r.score).toBeGreaterThanOrEqual(6);
  });

  it('中等风险：仅近期故障', () => {
    const r = predictEquipmentFailure('e1', {
      totalRunHours: 20000,
      recentFailures: 2,
      daysSinceLastMaintenance: 60,
      ageYears: 4,
    });
    expect(r.riskLevel).toBe('medium');
  });
});

describe('schedulePreventiveMaintenance', () => {
  it('高风险设备7天内维护', () => {
    const pred = predictEquipmentFailure('e1', {
      totalRunHours: 60000,
      recentFailures: 3,
      daysSinceLastMaintenance: 200,
      ageYears: 12,
    });
    const s = schedulePreventiveMaintenance('e1', pred);
    expect(s.recommendedWithinDays).toBe(7);
  });

  it('低风险设备90天维护', () => {
    const pred = predictEquipmentFailure('e1', {
      totalRunHours: 5000,
      recentFailures: 0,
      daysSinceLastMaintenance: 30,
      ageYears: 2,
    });
    const s = schedulePreventiveMaintenance('e1', pred);
    expect(s.recommendedWithinDays).toBe(90);
  });
});
