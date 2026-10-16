/**
 * 健澜科技 jlmedaios - 应急管理 V2 纯函数单测（M229-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessEmergencyReadiness,
  buildEmergencyResponseReportV2,
  triageMassCasualty,
} from '../../src/bff/aggregators/emergencyResponseV2Aggregator';

describe('triageMassCasualty', () => {
  it('100名伤员 → 红10黄30绿50黑10', () => {
    const r = triageMassCasualty(100);
    expect(r.red).toBe(10);
    expect(r.yellow).toBe(30);
    expect(r.green).toBe(50);
    expect(r.black).toBe(10);
  });
});

describe('assessEmergencyReadiness', () => {
  it('90预案 5演练 90物资 → 良好', () => {
    expect(assessEmergencyReadiness(90, 5, 90).level).toBe('良好');
  });

  it('60预案 2演练 60物资 → 一般', () => {
    expect(assessEmergencyReadiness(60, 2, 60).level).toBe('一般');
  });
});

describe('buildEmergencyResponseReportV2', () => {
  it('生成预案数据', () => {
    const r = buildEmergencyResponseReportV2('30d');
    expect(r.plan.special).toBeGreaterThan(0);
  });

  it('生成组织数据', () => {
    const r = buildEmergencyResponseReportV2('30d');
    expect(r.organization.teams).toBeGreaterThan(0);
  });

  it('生成物资数据', () => {
    const r = buildEmergencyResponseReportV2('30d');
    expect(r.supplies.adequacy).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildEmergencyResponseReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
