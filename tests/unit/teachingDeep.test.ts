/**
 * 健澜科技 jlmedaios - M162-B 教学与培训深化聚合器纯函数单测。
 *
 * 不依赖数据库：仅测 buildTeachingPlan / evaluateStudentPerformance /
 * generateTeachingReport。重点验证「教学考核要公平，不走过场」：
 *   - OSCE 五考站权重合计 = 1；
 *   - 任一考站 <60 即整体不通过、不计学分；
 *   - 同参两次结果完全一致（确定性、可复算、可申诉）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildTeachingPlan,
  evaluateStudentPerformance,
  generateTeachingReport,
} from '@/bff/aggregators/teachingDeepAggregator';

describe('buildTeachingPlan', () => {
  it('返回科室年度计划：含录播/直播/OSCE/轮转/出科五类课程与轮转段', () => {
    const plan = buildTeachingPlan('internal', 2026);
    expect(plan.dept).toBe('internal');
    expect(plan.year).toBe(2026);
    expect(plan.courses.length).toBeGreaterThan(0);
    expect(plan.rotationTracks.length).toBe(4);

    const types = new Set(plan.courses.map((c) => c.courseType));
    expect(types.has('recorded')).toBe(true);
    expect(types.has('live')).toBe(true);
    expect(types.has('osce')).toBe(true);
    expect(types.has('rotation')).toBe(true);
    expect(types.has('exit_exam')).toBe(true);
  });

  it('学分守恒：各类学分之和 = 总学分', () => {
    const plan = buildTeachingPlan('surgery', 2026);
    const sum = Object.values(plan.creditSummary.byType).reduce((a, b) => a + b, 0);
    expect(Math.round(sum * 10)).toBe(Math.round(plan.creditSummary.total * 10));
    expect(plan.creditSummary.total).toBeGreaterThan(0);
  });

  it('确定性：同科室同年份两次结果完全一致', () => {
    const a = buildTeachingPlan('internal', 2026);
    const b = buildTeachingPlan('internal', 2026);
    expect(a.courses).toEqual(b.courses);
    expect(a.rotationTracks).toEqual(b.rotationTracks);
  });

  it('未知科室回退内科；缺省年份取合理值', () => {
    const plan = buildTeachingPlan('not-exist');
    expect(plan.dept).toBe('internal');
    expect(plan.year).toBeGreaterThan(2000);
    expect(plan.year).toBeLessThan(2100);
  });
});

describe('evaluateStudentPerformance', () => {
  it('OSCE 五考站：权重合计 = 1，分数在 0..100', () => {
    const r = evaluateStudentPerformance('S-1024', 'OSCE-internal-2026-MID');
    expect(r.stations).toHaveLength(5);
    const weightSum = r.stations.reduce((s, x) => s + x.weight, 0);
    expect(Math.round(weightSum * 100)).toBe(100);
    for (const s of r.stations) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
      expect(s.passed).toBe(s.score >= 60);
    }
  });

  it('加权总分在 0..100，且通过规则自洽：不通过则学分为 0', () => {
    const r = evaluateStudentPerformance('S-2048', 'OSCE-surgery-2026-FIN');
    expect(r.weightedTotal).toBeGreaterThanOrEqual(0);
    expect(r.weightedTotal).toBeLessThanOrEqual(100);
    expect(r.overallPassed).toBe(
      r.weightedTotal >= 60 && r.stations.every((s) => s.passed),
    );
    if (!r.overallPassed) expect(r.creditEarned).toBe(0);
    expect(r.creditAutoRecorded).toBe(r.overallPassed);
  });

  it('单站低于 60 必然整体不通过（短板不过，杜绝平均放水）', () => {
    // 批量采样不同学生，校验「任一考站<60 ⇒ 不通过」恒成立
    for (let i = 0; i < 40; i += 1) {
      const r = evaluateStudentPerformance(`S-${1000 + i}`, 'OSCE-pediatrics-2026-MID');
      const hasWeak = r.stations.some((s) => s.score < 60);
      if (hasWeak) expect(r.overallPassed).toBe(false);
    }
  });

  it('确定性：同学生同考核两次结果完全一致（可复算、可申诉）', () => {
    const a = evaluateStudentPerformance('S-3141', 'OSCE-icu-2026-FIN');
    const b = evaluateStudentPerformance('S-3141', 'OSCE-icu-2026-FIN');
    expect(a.stations).toEqual(b.stations);
    expect(a.weightedTotal).toBe(b.weightedTotal);
    expect(a.overallPassed).toBe(b.overallPassed);
  });

  it('群体成绩有区分度（非一刀切走过场）：抽样 30 人分数不全部相同', () => {
    const totals = new Set<number>();
    for (let i = 0; i < 30; i += 1) {
      totals.add(evaluateStudentPerformance(`S-${1000 + i}`, 'OSCE-internal-2026-MID').weightedTotal);
    }
    expect(totals.size).toBeGreaterThan(1);
  });

  it('必给出公平性提示（数组非空）', () => {
    const r = evaluateStudentPerformance('S-5555', 'OSCE-emergency-2026-MID');
    expect(r.fairnessFlags.length).toBeGreaterThan(0);
  });
});

describe('generateTeachingReport', () => {
  it('核心比率在 0..100，学分为正', () => {
    const r = generateTeachingReport('internal', '2026-H1');
    expect(r.overview.courseCount).toBeGreaterThan(0);
    expect(r.overview.studentCount).toBeGreaterThan(0);
    for (const k of ['completionRate', 'oscePassRate', 'exitExamPassRate'] as const) {
      expect(r.overview[k]).toBeGreaterThanOrEqual(0);
      expect(r.overview[k]).toBeLessThanOrEqual(100);
    }
    expect(r.overview.creditAvg).toBeGreaterThan(0);
  });

  it('分数段合计严格 = 学生人数（分布无漏气）', () => {
    const r = generateTeachingReport('surgery', '2026-Q3');
    const sum = r.scoreDistribution.reduce((s, b) => s + b.count, 0);
    expect(sum).toBe(r.overview.studentCount);
  });

  it('满分率/不及格率在 0..100，且结论非空', () => {
    const r = generateTeachingReport('obgyn', '2026 年度');
    expect(r.fairness.ceilingRate).toBeGreaterThanOrEqual(0);
    expect(r.fairness.ceilingRate).toBeLessThanOrEqual(100);
    expect(r.fairness.failRate).toBeGreaterThanOrEqual(0);
    expect(r.fairness.failRate).toBeLessThanOrEqual(100);
    expect(r.fairness.conclusion.length).toBeGreaterThan(0);
    expect(r.recommendations.length).toBeGreaterThan(0);
  });

  it('确定性：同科室同周期两次结果完全一致', () => {
    const a = generateTeachingReport('pediatrics', '2026-H1');
    const b = generateTeachingReport('pediatrics', '2026-H1');
    expect(a.scoreDistribution).toEqual(b.scoreDistribution);
    expect(a.overview).toEqual(b.overview);
  });
});
