/**
 * 健澜科技 jlmedaios - 国考绩效纯函数单测（M210-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessCMI,
  buildHospitalKPIReport,
  calculateHospitalKPI,
  type HospitalKPIScores,
} from '../../src/bff/aggregators/hospitalKPIReportAggregator';

describe('calculateHospitalKPI', () => {
  it('四维 90 → 总分 90 A+', () => {
    const s: HospitalKPIScores = { quality: 90, efficiency: 90, development: 90, satisfaction: 90 };
    const r = calculateHospitalKPI(s);
    expect(r.total).toBe(90);
    expect(r.level).toBe('A+');
  });

  it('四维 70 → 总分 70 B+', () => {
    const s: HospitalKPIScores = { quality: 70, efficiency: 70, development: 70, satisfaction: 70 };
    const r = calculateHospitalKPI(s);
    expect(r.level).toBe('B+');
  });
});

describe('assessCMI', () => {
  it('CMI 1.2 / 期望 1.0 → 达标', () => {
    const r = assessCMI(1.2, 1.0);
    expect(r.met).toBe(true);
  });

  it('CMI 0.8 / 期望 1.0 → 未达标', () => {
    const r = assessCMI(0.8, 1.0);
    expect(r.met).toBe(false);
  });
});

describe('buildHospitalKPIReport', () => {
  it('生成质量数据', () => {
    const r = buildHospitalKPIReport('30d');
    expect(r.quality.cmi).toBeGreaterThan(0);
  });

  it('生成效率数据', () => {
    const r = buildHospitalKPIReport('30d');
    expect(r.efficiency.time).toBeGreaterThan(0);
  });

  it('生成满意度数据', () => {
    const r = buildHospitalKPIReport('30d');
    expect(r.satisfaction.patient).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildHospitalKPIReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
