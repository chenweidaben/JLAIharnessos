/**
 * 健澜科技 jlmedaios - 教学管理纯函数单测（M191-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildTeachingManagementReport,
  calculateTeachingScore,
  type TeachingData,
} from '../../src/bff/aggregators/teachingManagementAggregator';

describe('calculateTeachingScore', () => {
  it('得分不超过 100', () => {
    const data: TeachingData = {
      undergraduateHours: 500,
      postgraduateHours: 500,
      trainingHours: 500,
      evaluationScore: 100,
      satisfaction: 1,
      teachingAwards: 20,
    };
    expect(calculateTeachingScore(data)).toBeLessThanOrEqual(100);
  });

  it('满意度越高得分越高', () => {
    const low: TeachingData = { undergraduateHours: 100, postgraduateHours: 100, trainingHours: 100, evaluationScore: 80, satisfaction: 0.7, teachingAwards: 1 };
    const high: TeachingData = { undergraduateHours: 100, postgraduateHours: 100, trainingHours: 100, evaluationScore: 80, satisfaction: 0.95, teachingAwards: 1 };
    expect(calculateTeachingScore(high)).toBeGreaterThan(calculateTeachingScore(low));
  });
});

describe('buildTeachingManagementReport', () => {
  it('生成教学任务', () => {
    const r = buildTeachingManagementReport('教务处', '30d');
    expect(r.tasks.undergraduate).toBeGreaterThanOrEqual(0);
  });

  it('生成教学质量', () => {
    const r = buildTeachingManagementReport('教务处', '30d');
    expect(r.quality.evaluationScore).toBeGreaterThan(0);
  });

  it('生成师资队伍', () => {
    const r = buildTeachingManagementReport('教务处', '30d');
    expect(r.faculty.masterSupervisor).toBeGreaterThanOrEqual(0);
  });

  it('生成改进建议', () => {
    const r = buildTeachingManagementReport('教务处', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
