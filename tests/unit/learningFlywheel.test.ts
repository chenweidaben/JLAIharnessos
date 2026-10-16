/**
 * 健澜科技 jlmedaios - 学习闭环数据飞轮纯函数单测
 *
 * 覆盖：buildLearningFlywheel（汇总计数、采纳率计算、飞轮转速、趋势线排序、
 *       空数据兜底、数字自洽）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildLearningFlywheel,
  type FlywheelPoint,
} from '../../src/bff/aggregators/learningFlywheelAggregator';

describe('buildLearningFlywheel', () => {
  const points: FlywheelPoint[] = [
    { date: '2026-10-14', recommendations: 100, adopted: 50, rejected: 20, knowledgeAccumulated: 15 },
    { date: '2026-10-15', recommendations: 120, adopted: 72, rejected: 18, knowledgeAccumulated: 22 },
    { date: '2026-10-16', recommendations: 110, adopted: 77, rejected: 11, knowledgeAccumulated: 25 },
  ];

  it('正确汇总总数', () => {
    const result = buildLearningFlywheel(points);
    expect(result.totalRecommendations).toBe(330);
    expect(result.totalAdopted).toBe(199);
    expect(result.totalRejected).toBe(49);
    expect(result.totalKnowledge).toBe(62);
  });

  it('采纳率 = 采纳 / (采纳 + 拒绝)', () => {
    const result = buildLearningFlywheel(points);
    expect(result.adoptionRate).toBeCloseTo(199 / (199 + 49), 5);
  });

  it('飞轮转速 = 总采纳数 / 天数', () => {
    const result = buildLearningFlywheel(points);
    expect(result.flywheelVelocity).toBeCloseTo(199 / 3, 5);
  });

  it('趋势线按日期升序', () => {
    const reversed = [...points].reverse();
    const result = buildLearningFlywheel(reversed);
    expect(result.trend[0].date).toBe('2026-10-14');
    expect(result.trend[2].date).toBe('2026-10-16');
  });

  it('数字自洽：trend 各列之和 = 总数', () => {
    const result = buildLearningFlywheel(points);
    const sumRec = result.trend.reduce((s, t) => s + t.recommendations, 0);
    const sumAdopt = result.trend.reduce((s, t) => s + t.adopted, 0);
    expect(sumRec).toBe(result.totalRecommendations);
    expect(sumAdopt).toBe(result.totalAdopted);
  });

  it('空数据时不除零', () => {
    const result = buildLearningFlywheel([]);
    expect(result.totalRecommendations).toBe(0);
    expect(result.adoptionRate).toBe(0);
    expect(result.flywheelVelocity).toBe(0);
  });

  it('飞轮四环节包含四项', () => {
    const result = buildLearningFlywheel(points);
    expect(result.stages.length).toBe(4);
    expect(result.stages[0].key).toBe('recommend');
    expect(result.stages[1].key).toBe('feedback');
    expect(result.stages[2].key).toBe('knowledge');
    expect(result.stages[3].key).toBe('adoption');
  });
});
