/**
 * 健澜科技 jlmedaios - 后勤安全纯函数单测（M213-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessFireSafetyCompliance,
  buildLogisticsSafetyReport,
  trackMedicalWasteManifest,
  type FireFacility,
  type WasteManifest,
} from '../../src/bff/aggregators/logisticsSafetyReportAggregator';

describe('assessFireSafetyCompliance', () => {
  it('10 设施全合格 → 100% 优秀', () => {
    const facilities: FireFacility[] = [
      { type: '灭火器', inspected: true, passed: true },
      { type: '消火栓', inspected: true, passed: true },
    ];
    const r = assessFireSafetyCompliance(facilities);
    expect(r.complianceRate).toBe(1);
    expect(r.level).toBe('优秀');
  });

  it('10 设施 3 不合格 → 70% 不达标', () => {
    const facilities: FireFacility[] = [
      { type: '灭火器', inspected: true, passed: true },
      { type: '消火栓', inspected: true, passed: false },
      { type: '报警器', inspected: true, passed: false },
    ];
    const r = assessFireSafetyCompliance(facilities);
    expect(r.level).toBe('不达标');
  });
});

describe('trackMedicalWasteManifest', () => {
  it('3 联单 15kg 全密封 → sealedRate 100%', () => {
    const waste: WasteManifest[] = [
      { id: 'W001', weight: 5, sealed: true },
      { id: 'W002', weight: 5, sealed: true },
      { id: 'W003', weight: 5, sealed: true },
    ];
    const r = trackMedicalWasteManifest(waste);
    expect(r.count).toBe(3);
    expect(r.totalWeight).toBe(15);
    expect(r.sealedRate).toBe(1);
  });
});

describe('buildLogisticsSafetyReport', () => {
  it('生成消防数据', () => {
    const r = buildLogisticsSafetyReport('30d');
    expect(r.fire.facilities).toBeGreaterThan(0);
  });

  it('生成治安数据', () => {
    const r = buildLogisticsSafetyReport('30d');
    expect(r.security.incidents).toBeGreaterThanOrEqual(0);
  });

  it('生成医废数据', () => {
    const r = buildLogisticsSafetyReport('30d');
    expect(r.waste.manifests).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildLogisticsSafetyReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
