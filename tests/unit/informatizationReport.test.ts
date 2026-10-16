/**
 * 健澜科技 jlmedaios - 信息化纯函数单测（M213-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessITAvailability,
  buildInformatizationReport,
  scoreInformatizationMaturity,
} from '../../src/bff/aggregators/informatizationReportAggregator';

describe('assessITAvailability', () => {
  it('43190 / 43200 → 99.98% 优秀', () => {
    const r = assessITAvailability(43190, 43200);
    expect(r.level).toBe('优秀');
  });

  it('42000 / 43200 → 97.2% 不达标', () => {
    const r = assessITAvailability(42000, 43200);
    expect(r.level).toBe('不达标');
  });
});

describe('scoreInformatizationMaturity', () => {
  it('[90, 85, 88] → 87.7 高级', () => {
    const r = scoreInformatizationMaturity([90, 85, 88]);
    expect(r.level).toBe('高级');
  });

  it('[50, 55, 60] → 55 初级', () => {
    const r = scoreInformatizationMaturity([50, 55, 60]);
    expect(r.level).toBe('初级');
  });
});

describe('buildInformatizationReport', () => {
  it('生成基础设施数据', () => {
    const r = buildInformatizationReport('30d');
    expect(r.infrastructure.servers).toBeGreaterThan(0);
  });

  it('生成应用数据', () => {
    const r = buildInformatizationReport('30d');
    expect(r.applications.his).toBe(true);
  });

  it('生成安全数据', () => {
    const r = buildInformatizationReport('30d');
    expect(r.security.mlps3).toBe(true);
  });

  it('生成建议', () => {
    const r = buildInformatizationReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
