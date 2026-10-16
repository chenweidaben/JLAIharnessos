/**
 * 健澜科技 jlmedaios - 职业病防治纯函数单测（M221-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessOccupationalExposure,
  buildOccupationalHealthReport,
  diagnoseOccupationalDisease,
} from '../../src/bff/aggregators/occupationalHealthReportAggregator';

describe('assessOccupationalExposure', () => {
  it('浓度50 限值100 → 不超标', () => {
    expect(assessOccupationalExposure(50, 100).exceeded).toBe(false);
  });

  it('浓度150 限值100 → 超标', () => {
    expect(assessOccupationalExposure(150, 100).exceeded).toBe(true);
  });
});

describe('diagnoseOccupationalDisease', () => {
  it('有暴露 3症状 → 确诊', () => {
    expect(diagnoseOccupationalDisease(true, 3).diagnosed).toBe(true);
  });

  it('有暴露 1症状 → 疑似', () => {
    expect(diagnoseOccupationalDisease(true, 1).category).toBe('疑似职业病');
  });
});

describe('buildOccupationalHealthReport', () => {
  it('生成体检数据', () => {
    const r = buildOccupationalHealthReport('30d');
    expect(r.exam.in).toBeGreaterThan(0);
  });

  it('生成诊断数据', () => {
    const r = buildOccupationalHealthReport('30d');
    expect(r.diagnosis.pneumoconiosis).toBeGreaterThan(0);
  });

  it('生成危害数据', () => {
    const r = buildOccupationalHealthReport('30d');
    expect(r.hazard.dust).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildOccupationalHealthReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
