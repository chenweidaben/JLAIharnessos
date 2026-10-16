/**
 * 健澜科技 jlmedaios - 互联互通纯函数单测（M210-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessInteropMaturity,
  buildInteroperabilityReport,
  validateDatasetCompliance,
  type DatasetCompliance,
} from '../../src/bff/aggregators/interoperabilityReportAggregator';

describe('assessInteropMaturity', () => {
  it('4 级 → 四级甲 可冲击五级', () => {
    const r = assessInteropMaturity(4);
    expect(r.maturity).toBe('四级甲');
    expect(r.readyForNext).toBe(true);
  });

  it('5 级 → 五级甲', () => {
    const r = assessInteropMaturity(5);
    expect(r.maturity).toBe('五级甲');
  });
});

describe('validateDatasetCompliance', () => {
  it('WS363 95% + WS445 92% → 合规', () => {
    const d: DatasetCompliance = { ws363: 0.95, ws445: 0.92 };
    const r = validateDatasetCompliance(d);
    expect(r.compliant).toBe(true);
  });

  it('WS445 80% → 不合规', () => {
    const d: DatasetCompliance = { ws363: 0.95, ws445: 0.8 };
    const r = validateDatasetCompliance(d);
    expect(r.compliant).toBe(false);
  });
});

describe('buildInteroperabilityReport', () => {
  it('生成架构数据', () => {
    const r = buildInteroperabilityReport('30d');
    expect(r.architecture.integratedPlatform).toBe(true);
  });

  it('生成集成数据', () => {
    const r = buildInteroperabilityReport('30d');
    expect(r.integration.his).toBe(true);
  });

  it('生成评级数据', () => {
    const r = buildInteroperabilityReport('30d');
    expect(r.rating.current).toBeGreaterThanOrEqual(0);
  });

  it('生成建议', () => {
    const r = buildInteroperabilityReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
