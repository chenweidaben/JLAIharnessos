/**
 * 健澜科技 jlmedaios - 个人智能体成长报告（M146-B）纯函数单测
 *
 * 覆盖：
 *  - 成长报告：六大模块齐全（经验沉淀/AI 采纳/技能标签/互助/成长曲线/徽章），
 *    数值口径自洽、确定性可复现；
 *  - 对比分析：同侪样本规模、分位区间、四指标结构；
 *  - 成就计算：evaluateBadges 六条徽章的解锁阈值。
 *
 * 全部由 staffId 哈希派生，不依赖数据库、不碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildPersonalAgentReport,
  evaluateBadges,
  getPeerComparison,
  GROWTH_MONTHS,
  PEER_POOL_SIZE,
} from '../../src/bff/aggregators/personalGrowthAggregator';

describe('buildPersonalAgentReport 成长报告结构与口径', () => {
  const staffId = 'STAFF-TEST-001';

  it('六大模块齐全：经验/AI/技能/互助/曲线/徽章', () => {
    const r = buildPersonalAgentReport(staffId);
    expect(r.staffId).toBe(staffId);
    expect(r.experience).toBeDefined();
    expect(r.aiAdoption).toBeDefined();
    expect(r.skillTags).toBeDefined();
    expect(typeof r.helpedColleagues).toBe('number');
    expect(r.growth).toBeDefined();
    expect(Array.isArray(r.badges)).toBe(true);
  });

  it('经验沉淀：total = success + failure，lessonRate 自洽', () => {
    const e = buildPersonalAgentReport(staffId).experience;
    expect(e.total).toBe(e.totalSuccess + e.totalFailure);
    expect(e.totalSuccess).toBeGreaterThanOrEqual(0);
    expect(e.totalFailure).toBeGreaterThanOrEqual(0);
    const expectRate = e.total > 0 ? e.totalFailure / e.total : 0;
    expect(e.lessonRate).toBeCloseTo(expectRate, 6);
  });

  it('AI 采纳率：suggested >= accepted，rate ∈ [0,1]', () => {
    const a = buildPersonalAgentReport(staffId).aiAdoption;
    expect(a.suggested).toBeGreaterThan(0);
    expect(a.accepted).toBeGreaterThanOrEqual(0);
    expect(a.accepted).toBeLessThanOrEqual(a.suggested);
    expect(a.rate).toBeGreaterThanOrEqual(0);
    expect(a.rate).toBeLessThanOrEqual(1);
    expect(a.rate).toBeCloseTo(a.suggested > 0 ? a.accepted / a.suggested : 0, 6);
  });

  it('技能标签：added/removed 分别是 current/threeMonthsAgo 的子集且互不相交', () => {
    const s = buildPersonalAgentReport(staffId).skillTags;
    for (const t of s.added) expect(s.current).toContain(t);
    for (const t of s.removed) expect(s.threeMonthsAgo).toContain(t);
    for (const t of s.added) expect(s.removed).not.toContain(t);
  });

  it('成长曲线：近 GROWTH_MONTHS 个月，分数 0~100，delta 与 direction 自洽', () => {
    const g = buildPersonalAgentReport(staffId).growth;
    expect(g.months.length).toBe(GROWTH_MONTHS);
    for (const p of g.months) {
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(100);
    }
    expect(g.currentScore).toBe(g.months[g.months.length - 1].score);
    expect(g.delta).toBeCloseTo(g.currentScore - g.scoreThreeMonthsAgo, 6);
    if (g.delta > 2) expect(g.direction).toBe('up');
    else if (g.delta < -2) expect(g.direction).toBe('down');
    else expect(g.direction).toBe('flat');
  });

  it('徽章：earnedBadgeCount === badges 中 earned=true 的数量', () => {
    const r = buildPersonalAgentReport(staffId);
    const earned = r.badges.filter((b) => b.earned).length;
    expect(r.earnedBadgeCount).toBe(earned);
    // 起步员工至少解锁「初露锋芒」（经验>=1 恒成立）
    const first = r.badges.find((b) => b.code === 'first_lesson');
    expect(first?.earned).toBe(true);
  });

  it('确定性：同一 staffId 两次构建深度相等（generatedAt 实时除外）；空值不抛错', () => {
    const a = buildPersonalAgentReport(staffId);
    const b = buildPersonalAgentReport(staffId);
    const { generatedAt: _gaA, ...restA } = a;
    const { generatedAt: _gaB, ...restB } = b;
    expect(restA).toEqual(restB);
    expect(() => buildPersonalAgentReport('')).not.toThrow();
    expect(() => buildPersonalAgentReport('   ')).not.toThrow();
  });
});

describe('getPeerComparison 同侪对比', () => {
  const staffId = 'STAFF-TEST-002';

  it('样本规模 = PEER_POOL_SIZE + 1（含本人）', () => {
    expect(getPeerComparison(staffId).cohortSize).toBe(PEER_POOL_SIZE + 1);
  });

  it('四指标齐全，分位 ∈ [0,100]，label 非空', () => {
    const c = getPeerComparison(staffId);
    for (const m of [c.experienceTotal, c.aiAdoptionRate, c.helpedColleagues, c.growthScore]) {
      expect(typeof m.self).toBe('number');
      expect(typeof m.cohortAvg).toBe('number');
      expect(typeof m.delta).toBe('number');
      expect(m.percentile).toBeGreaterThanOrEqual(0);
      expect(m.percentile).toBeLessThanOrEqual(100);
      expect(m.label.length).toBeGreaterThan(0);
    }
    expect(c.summary.length).toBeGreaterThan(0);
  });

  it('确定性：同一 staffId 两次对比深度相等', () => {
    expect(getPeerComparison(staffId)).toEqual(getPeerComparison(staffId));
  });
});

describe('evaluateBadges 成就计算阈值', () => {
  const base = {
    totalSuccess: 0,
    totalFailure: 0,
    aiAdoptionRate: 0,
    aiSuggested: 0,
    helpedColleagues: 0,
    growthDirection: 'flat' as const,
    currentMonth: '2026-10',
    earliestBadgeMonth: '2026-05',
  };

  it('初露锋芒：任意沉淀>=1 即解锁', () => {
    const bs = evaluateBadges({ ...base, totalSuccess: 1 });
    expect(bs.find((b) => b.code === 'first_lesson')?.earned).toBe(true);
  });

  it('屡败屡战：失败教训 >=3 解锁，<3 不解锁', () => {
    expect(evaluateBadges({ ...base, totalFailure: 2 }).find((b) => b.code === 'resilient')?.earned).toBe(false);
    expect(evaluateBadges({ ...base, totalFailure: 3 }).find((b) => b.code === 'resilient')?.earned).toBe(true);
  });

  it('AI 搭子：采纳率>=0.5 且建议>=10 才解锁，任一不满足不解锁', () => {
    const noRate = evaluateBadges({ ...base, aiAdoptionRate: 0.9, aiSuggested: 10 }).find(
      (b) => b.code === 'ai_buddy',
    );
    expect(noRate?.earned).toBe(true);
    const lowRate = evaluateBadges({ ...base, aiAdoptionRate: 0.3, aiSuggested: 20 }).find(
      (b) => b.code === 'ai_buddy',
    );
    expect(lowRate?.earned).toBe(false);
    const fewSuggest = evaluateBadges({ ...base, aiAdoptionRate: 0.9, aiSuggested: 5 }).find(
      (b) => b.code === 'ai_buddy',
    );
    expect(fewSuggest?.earned).toBe(false);
  });

  it('良师益友：帮助同事 >=5 解锁', () => {
    expect(evaluateBadges({ ...base, helpedColleagues: 4 }).find((b) => b.code === 'mentor')?.earned).toBe(false);
    expect(evaluateBadges({ ...base, helpedColleagues: 5 }).find((b) => b.code === 'mentor')?.earned).toBe(true);
  });

  it('稳健进阶：成长方向 up 才解锁', () => {
    expect(evaluateBadges({ ...base, growthDirection: 'flat' }).find((b) => b.code === 'steady_climber')?.earned).toBe(false);
    expect(evaluateBadges({ ...base, growthDirection: 'up' }).find((b) => b.code === 'steady_climber')?.earned).toBe(true);
  });

  it('经验丰饶：成功经验 >=20 解锁', () => {
    expect(evaluateBadges({ ...base, totalSuccess: 19 }).find((b) => b.code === 'rich_knowledge')?.earned).toBe(false);
    expect(evaluateBadges({ ...base, totalSuccess: 20 }).find((b) => b.code === 'rich_knowledge')?.earned).toBe(true);
  });

  it('返回固定 6 枚徽章，且不修改入参', () => {
    const before = JSON.stringify(base);
    const bs = evaluateBadges(base);
    expect(bs.length).toBe(6);
    expect(JSON.stringify(base)).toBe(before);
  });
});
