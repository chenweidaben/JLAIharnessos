/**
 * 健澜科技 jlmedaios - 人力资源管理纯函数单测（M191-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildHRManagementReport,
  predictHRNeed,
  type BusinessData,
} from '../../src/bff/aggregators/hrManagementAggregator';

describe('predictHRNeed', () => {
  it('床护比 1:0.4', () => {
    const data: BusinessData = { bedCount: 100, outpatientVisits: 0, surgeryCount: 0 };
    expect(predictHRNeed(data).nurses).toBe(40);
  });

  it('床位越多需要医师越多', () => {
    const small: BusinessData = { bedCount: 100, outpatientVisits: 0, surgeryCount: 0 };
    const large: BusinessData = { bedCount: 500, outpatientVisits: 0, surgeryCount: 0 };
    expect(predictHRNeed(large).doctors).toBeGreaterThan(predictHRNeed(small).doctors);
  });

  it('门诊量越多需要技师越多', () => {
    const low: BusinessData = { bedCount: 100, outpatientVisits: 1000, surgeryCount: 0 };
    const high: BusinessData = { bedCount: 100, outpatientVisits: 10000, surgeryCount: 0 };
    expect(predictHRNeed(high).technicians).toBeGreaterThan(predictHRNeed(low).technicians);
  });
});

describe('buildHRManagementReport', () => {
  it('生成人员结构', () => {
    const r = buildHRManagementReport('人事处', '30d');
    expect(r.structure.doctors).toBeGreaterThan(0);
  });

  it('生成职称结构', () => {
    const r = buildHRManagementReport('人事处', '30d');
    expect(r.titleStructure.senior).toBeGreaterThanOrEqual(0);
  });

  it('生成需求预测', () => {
    const r = buildHRManagementReport('人事处', '30d');
    expect(r.predictedNeed.doctors).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildHRManagementReport('人事处', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
