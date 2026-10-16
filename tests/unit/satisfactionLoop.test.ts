/**
 * 健澜科技 jlmedaios - 【CDSS与运营精细化】M165-C 满意度改进闭环纯函数单测
 *
 * 覆盖：
 *   - buildSatisfactionLoop：收集三通道计数/均分/不满意率、分析归类与严重度、
 *     改进措施生成、验证汇总、underpowered 小样本标记、空数据兜底、不修改入参；
 *   - analyzeSatisfactionRootCause：类别默认根因、关键词细化、置信度区间；
 *   - generateImprovementAction：责任到人/限期天数/高优压缩工期/量化目标；
 *   - trackImprovementEffect：resolved/improved/no_change/regressed 四档评定、
 *     标准化沉淀、回炉标记、缺复查数据兜底、负面回访一票降级。
 *
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  analyzeSatisfactionRootCause,
  buildSatisfactionLoop,
  generateImprovementAction,
  trackImprovementEffect,
  type SatisfactionSignal,
} from '../../src/bff/aggregators/satisfactionLoopAggregator';

const SIGNALS: SatisfactionSignal[] = [
  { source: 'satisfaction', score: 2, comment: '排队太久，等了半天', dept: 'outpatient', date: '2026-09-20' },
  { source: 'satisfaction', score: 2, comment: '候诊太久，排长队', dept: 'outpatient', date: '2026-09-25' },
  { source: 'complaint', comment: '医生态度差，不耐烦', dept: 'outpatient', date: '2026-09-28' },
  { source: 'complaint', comment: '费用贵，乱收费', dept: 'pharmacy', date: '2026-10-02' },
  { source: 'satisfaction', score: 3, comment: '来回跑，手续多', dept: 'outpatient', date: '2026-10-05' },
  { source: 'satisfaction', score: 5, comment: '护士耐心，非常满意', dept: 'nursing', date: '2026-10-06' },
  { source: 'praise', comment: '医生专业，感谢', dept: 'internal', date: '2026-10-08' },
  { source: 'satisfaction', score: 4, comment: '不错', dept: 'registration', date: '2026-10-12' },
  { source: 'complaint', comment: '排队太久，号难挂', dept: 'outpatient', date: '2026-10-14' },
];

describe('buildSatisfactionLoop · 收集阶段', () => {
  it('三通道计数：满意度/投诉/表扬分别统计', () => {
    const loop = buildSatisfactionLoop(SIGNALS);
    expect(loop.collect.total).toBe(9);
    expect(loop.collect.satisfactionCount).toBe(5);
    expect(loop.collect.complaintCount).toBe(3);
    expect(loop.collect.praiseCount).toBe(1);
  });

  it('满意度均分仅统计带分的 satisfaction 信号', () => {
    const loop = buildSatisfactionLoop(SIGNALS);
    // 2+2+3+5+4 = 16 / 5 = 3.2（praise 不带分）
    expect(loop.collect.avgScore).toBeCloseTo(3.2, 1);
  });

  it('不满意率 = 低分问卷+投诉 / 总信号', () => {
    const loop = buildSatisfactionLoop(SIGNALS);
    // 不满意信号：2,2,投诉,投诉,3,投诉(排队) = 6 条 / 9
    expect(loop.collect.dissatisfactionRatio).toBeCloseTo(6 / 9, 1);
  });

  it('样本量 <10 标记 underpowered，不夸大结论', () => {
    expect(buildSatisfactionLoop(SIGNALS).analyze.underpowered).toBe(true);
    const many = Array.from({ length: 20 }, (_, i) => ({
      source: 'satisfaction' as const,
      score: 4,
      comment: '满意',
      date: `2026-10-${(i % 28) + 1}`,
    }));
    expect(buildSatisfactionLoop(many).analyze.underpowered).toBe(false);
  });
});

describe('buildSatisfactionLoop · 分析阶段', () => {
  it('负面评论归类：wait_time / staff_attitude / cost / process 均被识别', () => {
    const loop = buildSatisfactionLoop(SIGNALS);
    const cats = loop.analyze.issues.map((i) => i.category);
    expect(cats).toContain('wait_time');
    expect(cats).toContain('staff_attitude');
    expect(cats).toContain('cost');
    expect(cats).toContain('process');
  });

  it('wait_time 命中 3 条 → severity=medium，样本最多 3 条', () => {
    const loop = buildSatisfactionLoop(SIGNALS);
    const wait = loop.analyze.issues.find((i) => i.category === 'wait_time');
    expect(wait?.count).toBe(3);
    expect(wait?.severity).toBe('medium');
    expect(wait?.sampleComments.length).toBeLessThanOrEqual(3);
  });

  it('分析出的问题按条数倒序', () => {
    const loop = buildSatisfactionLoop(SIGNALS);
    for (let i = 1; i < loop.analyze.issues.length; i += 1) {
      expect(loop.analyze.issues[i - 1].count).toBeGreaterThanOrEqual(loop.analyze.issues[i].count);
    }
  });

  it('正面/表扬评论不产生问题', () => {
    const loop = buildSatisfactionLoop([
      { source: 'praise', comment: '满意谢谢周到' },
      { source: 'satisfaction', score: 5, comment: '专业负责' },
    ]);
    expect(loop.analyze.issues.length).toBe(0);
  });
});

describe('buildSatisfactionLoop · 改进阶段', () => {
  it('每个分析出的问题都生成改进措施，且责任到人、有明确限期', () => {
    const loop = buildSatisfactionLoop(SIGNALS);
    expect(loop.improve.actions.length).toBe(loop.analyze.issues.length);
    for (const a of loop.improve.actions) {
      expect(a.owner.length).toBeGreaterThan(0);
      expect(a.dueDays).toBeGreaterThan(0);
      expect(a.action.length).toBeGreaterThan(0);
    }
  });

  it('高优问题（≥5 条）工期被压缩', () => {
    const manyWait: SatisfactionSignal[] = Array.from({ length: 6 }, () => ({
      source: 'complaint' as const,
      comment: '排队太久，等了半天',
    }));
    const loop = buildSatisfactionLoop(manyWait);
    const wait = loop.improve.actions.find((a) => a.issueCategory === 'wait_time');
    expect(wait?.priority).toBe('high');
    expect(wait?.dueDays).toBeLessThanOrEqual(14);
  });
});

describe('buildSatisfactionLoop · 验证阶段', () => {
  it('改进效果记录逐条评定并汇总计数', () => {
    const loop = buildSatisfactionLoop(SIGNALS, [
      { improvementId: 'i1', beforeScore: 2.0, afterScore: 4.6 }, // resolved
      { improvementId: 'i2', beforeScore: 3.0, afterScore: 3.6 }, // improved
      { improvementId: 'i3', beforeScore: 3.0, afterScore: 2.4 }, // regressed
    ]);
    expect(loop.verify.total).toBe(3);
    expect(loop.verify.resolvedCount).toBe(1);
    expect(loop.verify.improvedCount).toBe(1);
    expect(loop.verify.regressedCount).toBe(1);
    expect(loop.verify.standardizedCount).toBe(1);
  });

  it('空输入返回空闭环，不抛错', () => {
    const loop = buildSatisfactionLoop([]);
    expect(loop.collect.total).toBe(0);
    expect(loop.analyze.issues).toEqual([]);
    expect(loop.improve.actions).toEqual([]);
    expect(loop.verify.effects).toEqual([]);
  });

  it('不修改入参', () => {
    const snapshot = SIGNALS.map((s) => ({ ...s }));
    buildSatisfactionLoop(SIGNALS);
    expect(SIGNALS).toEqual(snapshot);
  });
});

describe('analyzeSatisfactionRootCause', () => {
  it('类别默认根因：wait_time → staffing_gap', () => {
    const r = analyzeSatisfactionRootCause({ category: 'wait_time', sampleComments: ['排队太久'] });
    expect(r.rootCause).toBe('staffing_gap');
    expect(r.rootCauseLabel).toBe('人力配置不足');
    expect(r.confidence).toBeGreaterThan(0);
  });

  it('评论提及号源/挂号 → 细化为 resource_misconfig，置信度上浮', () => {
    const r = analyzeSatisfactionRootCause({
      category: 'wait_time',
      sampleComments: ['号难挂，预约不上'],
    });
    expect(r.rootCause).toBe('resource_misconfig');
    expect(r.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('staff_attitude → communication_gap（沟通培训不足）', () => {
    const r = analyzeSatisfactionRootCause({ category: 'staff_attitude', sampleComments: ['态度差'] });
    expect(r.rootCause).toBe('communication_gap');
  });

  it('cost → policy_unclear（收费公示不清）', () => {
    const r = analyzeSatisfactionRootCause({ category: 'cost', sampleComments: ['费用贵'] });
    expect(r.rootCause).toBe('policy_unclear');
  });

  it('high 严重度置信度上浮', () => {
    const plain = analyzeSatisfactionRootCause({ category: 'environment', sampleComments: ['环境脏'] });
    const urgent = analyzeSatisfactionRootCause({ category: 'environment', sampleComments: ['环境脏'], severity: 'high' });
    expect(urgent.confidence).toBeGreaterThanOrEqual(plain.confidence);
  });
});

describe('generateImprovementAction', () => {
  it('根因 → 措施模板 + 责任岗位 + 量化目标', () => {
    const rc = analyzeSatisfactionRootCause({ category: 'wait_time', sampleComments: ['排队太久'] });
    const action = generateImprovementAction({ category: 'wait_time', severity: 'high' }, rc);
    expect(action.owner.length).toBeGreaterThan(0);
    expect(action.action.length).toBeGreaterThan(0);
    expect(action.target).toContain('30 天');
    expect(action.rootCause).toBe(rc.rootCause);
  });

  it('high 优先级工期压缩，low 优先级宽限', () => {
    const rc = analyzeSatisfactionRootCause({ category: 'process', sampleComments: ['来回跑'] });
    const high = generateImprovementAction({ category: 'process', severity: 'high' }, rc);
    const low = generateImprovementAction({ category: 'process', severity: 'low' }, rc);
    expect(high.dueDays).toBeLessThan(low.dueDays);
  });
});

describe('trackImprovementEffect', () => {
  it('after≥4.5 且 Δ≥1 → resolved，措施标准化沉淀', () => {
    const e = trackImprovementEffect({ improvementId: 'imp-1', beforeScore: 2.2, afterScore: 4.8 });
    expect(e.verdict).toBe('resolved');
    expect(e.standardized).toBe(true);
    expect(e.needsRework).toBe(false);
    expect(e.delta).toBeCloseTo(2.6, 1);
  });

  it('Δ≥0.5 但未达解决线 → improved', () => {
    const e = trackImprovementEffect({ improvementId: 'imp-2', beforeScore: 3.0, afterScore: 3.7 });
    expect(e.verdict).toBe('improved');
    expect(e.standardized).toBe(false);
  });

  it('|Δ|<0.5 → no_change，标记回炉再分析', () => {
    const e = trackImprovementEffect({ improvementId: 'imp-3', beforeScore: 3.0, afterScore: 3.2 });
    expect(e.verdict).toBe('no_change');
    expect(e.needsRework).toBe(true);
  });

  it('Δ≤-0.5 → regressed，升级督办', () => {
    const e = trackImprovementEffect({ improvementId: 'imp-4', beforeScore: 3.5, afterScore: 2.8 });
    expect(e.verdict).toBe('regressed');
    expect(e.needsRework).toBe(true);
  });

  it('缺复查数据 → no_change、delta=null、不误报标准化', () => {
    const e = trackImprovementEffect({ improvementId: 'imp-5' });
    expect(e.verdict).toBe('no_change');
    expect(e.delta).toBeNull();
    expect(e.standardized).toBe(false);
    expect(e.needsRework).toBe(false);
    expect(e.conclusion).toContain('待复查');
  });

  it('量化达标但回访仍有负面声音 → 暂缓标准化，提示人工复核', () => {
    const e = trackImprovementEffect({
      improvementId: 'imp-6',
      beforeScore: 2.0,
      afterScore: 4.6,
      followUpComments: ['还是觉得贵'],
    });
    expect(e.verdict).toBe('resolved');
    expect(e.standardized).toBe(false);
    expect(e.conclusion).toContain('人工复核');
  });
});
