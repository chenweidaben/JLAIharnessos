/**
 * 健澜科技 jlmedaios - 用户体验纯函数单测（M199-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildUserExperienceReport,
  optimizeUserJourney,
  scoreUserExperience,
  type JourneyData,
  type UserFeedback,
} from '../../src/bff/aggregators/userExperienceAggregator';

describe('scoreUserExperience', () => {
  it('高满意+高NPS → excellent', () => {
    const feedback: UserFeedback = { satisfaction: 90, nps: 60, usabilityIssues: 2 };
    expect(scoreUserExperience(feedback).level).toBe('excellent');
  });

  it('低满意+低NPS → poor', () => {
    const feedback: UserFeedback = { satisfaction: 30, nps: -20, usabilityIssues: 20 };
    expect(scoreUserExperience(feedback).level).toBe('poor');
  });
});

describe('optimizeUserJourney', () => {
  it('步骤多+流失高 → 有建议', () => {
    const journey: JourneyData = { steps: 8, dropOffRate: 0.5, avgTimeMinutes: 45 };
    const r = optimizeUserJourney(journey);
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

describe('buildUserExperienceReport', () => {
  it('生成设计系统数据', () => {
    const r = buildUserExperienceReport('30d');
    expect(r.design.components).toBeGreaterThan(0);
  });

  it('生成研究数据', () => {
    const r = buildUserExperienceReport('30d');
    expect(r.research.satisfaction).toBeGreaterThan(0);
  });

  it('生成性能数据', () => {
    const r = buildUserExperienceReport('30d');
    expect(r.performance.firstScreenMs).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildUserExperienceReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
