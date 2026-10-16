/**
 * 健澜科技 jlmedaios - 绩效管理纯函数单测（M189-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPerformanceManagementReport,
  calculateDeptScore,
  calculateDoctorScore,
  type DeptPerfData,
  type DoctorPerfData,
  type PerfWeights,
} from '../../src/bff/aggregators/performanceManagementAggregator';

const weights: PerfWeights = {
  outpatient: 0.2,
  inpatient: 0.2,
  surgery: 0.15,
  drg: 0.15,
  satisfaction: 0.15,
  quality: 0.15,
};

describe('calculateDeptScore', () => {
  it('得分在 0-100 之间', () => {
    const data: DeptPerfData = {
      dept: '心内科',
      outpatientVolume: 3200,
      inpatientVolume: 280,
      surgeryVolume: 120,
      drgWeight: 1.2,
      satisfaction: 0.92,
      qualityScore: 88,
    };
    const score = calculateDeptScore(data, weights);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('指标越高得分越高', () => {
    const low: DeptPerfData = {
      dept: 'A', outpatientVolume: 100, inpatientVolume: 10, surgeryVolume: 0,
      drgWeight: 0.5, satisfaction: 0.5, qualityScore: 60,
    };
    const high: DeptPerfData = {
      dept: 'B', outpatientVolume: 5000, inpatientVolume: 500, surgeryVolume: 200,
      drgWeight: 2, satisfaction: 0.99, qualityScore: 95,
    };
    expect(calculateDeptScore(high, weights)).toBeGreaterThan(calculateDeptScore(low, weights));
  });
});

describe('calculateDoctorScore', () => {
  it('得分在 0-100 之间', () => {
    const data: DoctorPerfData = {
      doctor: '张医生', dept: '心内科', workload: 90, qualityScore: 88, patientRating: 92, researchScore: 70,
    };
    const score = calculateDoctorScore(data);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('buildPerformanceManagementReport', () => {
  it('生成科室排名', () => {
    const r = buildPerformanceManagementReport('心内科', '30d');
    expect(r.deptRanking.length).toBeGreaterThan(0);
  });

  it('生成医生排名', () => {
    const r = buildPerformanceManagementReport('心内科', '30d');
    expect(r.doctorRanking.length).toBeGreaterThan(0);
  });

  it('生成护士排名', () => {
    const r = buildPerformanceManagementReport('心内科', '30d');
    expect(r.nurseRanking.length).toBeGreaterThan(0);
  });

  it('生成改进建议', () => {
    const r = buildPerformanceManagementReport('心内科', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
