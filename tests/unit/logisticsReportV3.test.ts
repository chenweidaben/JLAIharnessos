/**
 * 健澜科技 jlmedaios - 后勤 V3 纯函数单测（M207-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessEquipmentReliability,
  buildLogisticsReportV3,
  trackMedicalWaste,
  type MedicalWaste,
} from '../../src/bff/aggregators/logisticsReportV3Aggregator';

describe('assessEquipmentReliability', () => {
  it('MTBF 950 MTTR 50 → 95% 可用', () => {
    const r = assessEquipmentReliability(950, 50);
    expect(r.availability).toBe(0.95);
    expect(r.reliable).toBe(true);
  });

  it('MTBF 800 MTTR 200 → 80% 不可靠', () => {
    const r = assessEquipmentReliability(800, 200);
    expect(r.reliable).toBe(false);
  });
});

describe('trackMedicalWaste', () => {
  it('感染性 60 其他 40 → 总量 100 分类合规', () => {
    const w: MedicalWaste = { infectious: 60, pathological: 10, sharp: 20, chemical: 10 };
    const r = trackMedicalWaste(w);
    expect(r.total).toBe(100);
    expect(r.segregated).toBe(true);
  });
});

describe('buildLogisticsReportV3', () => {
  it('生成设备数据', () => {
    const r = buildLogisticsReportV3('30d');
    expect(r.equipment.total).toBeGreaterThan(0);
  });

  it('生成安全数据', () => {
    const r = buildLogisticsReportV3('30d');
    expect(r.safety.fire).toBeGreaterThanOrEqual(0);
  });

  it('生成能源数据', () => {
    const r = buildLogisticsReportV3('30d');
    expect(r.energy.carbonTons).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildLogisticsReportV3('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
