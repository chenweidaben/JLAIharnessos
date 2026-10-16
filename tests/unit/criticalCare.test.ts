/**
 * 健澜科技 jlmedaios - 重症纯函数单测（M203-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessTraumaSeverity,
  buildCriticalCareReport,
  scoreSeverityLevel,
} from '../../src/bff/aggregators/criticalCareAggregator';

describe('scoreSeverityLevel', () => {
  it('重度（APACHE 高）', () => {
    const r = scoreSeverityLevel(30, 15);
    expect(r.level).toBe('重度');
    expect(r.deathRisk).toBeGreaterThan(0.3);
  });

  it('轻度', () => {
    const r = scoreSeverityLevel(5, 2);
    expect(r.level).toBe('轻度');
  });
});

describe('assessTraumaSeverity', () => {
  it('严重创伤+黄金一小时', () => {
    const r = assessTraumaSeverity(30, 6);
    expect(r.category).toBe('严重创伤');
    expect(r.goldenHour).toBe(true);
  });

  it('轻度创伤', () => {
    const r = assessTraumaSeverity(8, 14);
    expect(r.category).toBe('轻度创伤');
    expect(r.goldenHour).toBe(false);
  });
});

describe('buildCriticalCareReport', () => {
  it('生成收治数据', () => {
    const r = buildCriticalCareReport('30d');
    expect(r.admissions.total).toBeGreaterThan(0);
  });

  it('生成器官支持数据', () => {
    const r = buildCriticalCareReport('30d');
    expect(r.support.ventilation).toBeGreaterThan(0);
  });

  it('生成感染数据', () => {
    const r = buildCriticalCareReport('30d');
    expect(r.infection.vapRate).toBeGreaterThanOrEqual(0);
  });

  it('生成建议', () => {
    const r = buildCriticalCareReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
