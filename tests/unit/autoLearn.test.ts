/**
 * 健澜科技 jlmedaios - M160-A 全自学习闭环纯函数单测
 *
 * 覆盖：
 *   1. 反馈学习：autoLearnFromFeedback 四通道（医生决策/满意度/差错/质控）
 *      各自产出真实进化动作；
 *   2. 权重调整：adjustRecommendationWeights 升权/降权/观望不动/边界截断/不修改入参；
 *   3. 知识缺口：detectKnowledgeGap 低采纳率建议、低满意度环节、高危差错、
 *      质控扣分维度均被识别并按严重度排序；
 *   4. 周报告：generateLearningReport 汇总计数与进化成熟度口径。
 *
 * 与持久化解耦，不触库、不写 SQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  adjustRecommendationWeights,
  adoptionRateOf,
  autoLearnFromFeedback,
  detectKnowledgeGap,
  generateLearningReport,
  BOOST_FACTOR,
  DAMPEN_FACTOR,
  MAX_WEIGHT,
  MIN_WEIGHT,
  type FeedbackEvent,
  type WeightMap,
} from '../../src/bff/aggregators/autoLearnAggregator';

/* ---------- 测试夹具 ---------- */

/** 一条四通道齐全的周度反馈样本（与路由演示样本同构） */
function weeklyEvents(): FeedbackEvent[] {
  const events: FeedbackEvent[] = [];
  // drug：高采纳 → 应升权
  for (let i = 0; i < 9; i += 1) {
    events.push({ kind: 'doctor_decision', suggestionType: 'drug', doctorDecision: 'adopted' });
  }
  events.push({ kind: 'doctor_decision', suggestionType: 'drug', doctorDecision: 'rejected' });
  // lab_interpret：高拒绝 → 应降权 + 知识缺口
  for (let i = 0; i < 2; i += 1) {
    events.push({ kind: 'doctor_decision', suggestionType: 'lab_interpret', doctorDecision: 'adopted' });
  }
  for (let i = 0; i < 8; i += 1) {
    events.push({ kind: 'doctor_decision', suggestionType: 'lab_interpret', doctorDecision: 'rejected' });
  }
  // diagnosis：观望区间 → 不动
  for (let i = 0; i < 4; i += 1) {
    events.push({ kind: 'doctor_decision', suggestionType: 'diagnosis', doctorDecision: 'adopted' });
  }
  for (let i = 0; i < 6; i += 1) {
    events.push({ kind: 'doctor_decision', suggestionType: 'diagnosis', doctorDecision: 'rejected' });
  }
  // charging：满意度偏低 → 流程优化 + 缺口
  for (const score of [3.2, 3.5, 3.1, 3.4]) {
    events.push({ kind: 'patient_satisfaction', serviceStage: 'charging', satisfactionScore: score });
  }
  // registration：合格 → 不动
  for (const score of [4.5, 4.6, 4.4]) {
    events.push({ kind: 'patient_satisfaction', serviceStage: 'registration', satisfactionScore: score });
  }
  // 高危差错 → 规则升级为 block + 缺口
  events.push({ kind: 'medical_error', safetyRule: 'drug_interaction_check', severity: 'high' });
  events.push({ kind: 'medical_error', safetyRule: 'drug_interaction_check', severity: 'low' });
  // 质控扣分 → 强化
  events.push({ kind: 'qc_deduction', qcDimension: '病案首页', deductionPoints: 3 });
  events.push({ kind: 'qc_deduction', qcDimension: '病案首页', deductionPoints: 4 });
  return events;
}

describe('adoptionRateOf', () => {
  it('modified 按半权计入正向，无样本返回 null', () => {
    expect(adoptionRateOf({ adopted: 9, modified: 0, rejected: 1 })).toBeCloseTo(0.9, 5);
    expect(adoptionRateOf({ adopted: 0, modified: 0, rejected: 0 })).toBeNull();
  });
});

describe('adjustRecommendationWeights 权重调整方向', () => {
  const base: WeightMap = { diagnosis: 1.0, drug: 1.0, pathway: 1.0, lab_interpret: 1.0 };

  it('采纳率 > 0.7 的类型权重 ×1.15（升权）', () => {
    const { weights, changes } = adjustRecommendationWeights({ currentWeights: base, events: weeklyEvents() });
    expect(weights.drug).toBeCloseTo(1.0 * BOOST_FACTOR, 2);
    const drug = changes.find((c) => c.suggestionType === 'drug');
    expect(drug?.direction).toBe('boost');
    expect(drug?.adoptionRate).toBeCloseTo(0.9, 2);
  });

  it('采纳率 < 0.3 的类型权重 ×0.85（降权）', () => {
    const { weights, changes } = adjustRecommendationWeights({ currentWeights: base, events: weeklyEvents() });
    expect(weights.lab_interpret).toBeCloseTo(1.0 * DAMPEN_FACTOR, 2);
    expect(changes.find((c) => c.suggestionType === 'lab_interpret')?.direction).toBe('dampen');
  });

  it('采纳率落在 [0.3,0.7] 区间保持不动（hold）', () => {
    const { weights, changes } = adjustRecommendationWeights({ currentWeights: base, events: weeklyEvents() });
    // diagnosis：4 采纳 6 拒绝 = 0.4
    expect(weights.diagnosis).toBeCloseTo(1.0, 2);
    expect(changes.find((c) => c.suggestionType === 'diagnosis')?.direction).toBe('hold');
  });

  it('无反馈的类型保持原权重、不产生调整记录', () => {
    const { weights, changes } = adjustRecommendationWeights({ currentWeights: base, events: weeklyEvents() });
    expect(weights.pathway).toBeCloseTo(1.0, 2);
    expect(changes.find((c) => c.suggestionType === 'pathway')).toBeUndefined();
  });

  it('不修改入参', () => {
    const snapshot = { ...base };
    adjustRecommendationWeights({ currentWeights: base, events: weeklyEvents() });
    expect(base).toEqual(snapshot);
  });

  it('事件中新出现的类型以默认权重起评', () => {
    const { weights, changes } = adjustRecommendationWeights({
      currentWeights: {},
      events: [
        ...Array.from({ length: 9 }, () => ({
          kind: 'doctor_decision' as const,
          suggestionType: 'new_type',
          doctorDecision: 'adopted' as const,
        })),
        { kind: 'doctor_decision', suggestionType: 'new_type', doctorDecision: 'rejected' },
      ],
    });
    expect(weights.new_type).toBeCloseTo(1.15, 2);
    expect(changes.some((c) => c.suggestionType === 'new_type')).toBe(true);
  });
});

describe('adjustRecommendationWeights 边界截断', () => {
  it('高权重升权后超过上界截断到 MAX_WEIGHT', () => {
    const { weights } = adjustRecommendationWeights({
      currentWeights: { heavy: MAX_WEIGHT },
      events: Array.from({ length: 10 }, () => ({
        kind: 'doctor_decision' as const,
        suggestionType: 'heavy',
        doctorDecision: 'adopted' as const,
      })),
    });
    expect(weights.heavy).toBe(MAX_WEIGHT);
  });

  it('低权重降权后低于下界截断到 MIN_WEIGHT', () => {
    const { weights } = adjustRecommendationWeights({
      currentWeights: { light: MIN_WEIGHT },
      events: Array.from({ length: 10 }, () => ({
        kind: 'doctor_decision' as const,
        suggestionType: 'light',
        doctorDecision: 'rejected' as const,
      })),
    });
    expect(weights.light).toBe(MIN_WEIGHT);
  });
});

describe('autoLearnFromFeedback 四通道反馈学习', () => {
  it('医生通道产出权重调整记录', () => {
    const out = autoLearnFromFeedback(weeklyEvents(), { drug: 1.0, lab_interpret: 1.0 });
    expect(out.weightChanges.length).toBeGreaterThan(0);
  });

  it('满意度低于合格线的环节触发服务流程优化动作', () => {
    const out = autoLearnFromFeedback(weeklyEvents());
    const charging = out.processImprovements.find((p) => p.serviceStage === 'charging');
    expect(charging).toBeDefined();
    expect(charging?.priority).toBe('high'); // 均值 3.3 < 3.5
    expect(charging?.action).toContain('服务流程');
    // 合格环节不应触发
    expect(out.processImprovements.find((p) => p.serviceStage === 'registration')).toBeUndefined();
  });

  it('高危医疗差错把安全规则严格度升级为 block', () => {
    const out = autoLearnFromFeedback(weeklyEvents());
    const rule = out.safetyRuleUpdates.find((r) => r.rule === 'drug_interaction_check');
    expect(rule).toBeDefined();
    expect(rule?.highSeverityCount).toBe(1);
    expect(rule?.newStrictness).toBe('block');
  });

  it('质控累计扣分触发薄弱环节强化等级 L2', () => {
    const out = autoLearnFromFeedback(weeklyEvents());
    const qc = out.qcStrengthenings.find((q) => q.dimension === '病案首页');
    expect(qc).toBeDefined();
    expect(qc?.totalDeduction).toBe(7);
    expect(qc?.reinforcementLevel).toBe(2); // 5<=7<10
  });

  it('autoActionsTaken 为四通道动作数之和', () => {
    const out = autoLearnFromFeedback(weeklyEvents());
    expect(out.autoActionsTaken).toBe(
      out.weightChanges.length +
        out.processImprovements.length +
        out.safetyRuleUpdates.length +
        out.qcStrengthenings.length,
    );
    expect(out.autoActionsTaken).toBeGreaterThan(0);
  });

  it('空事件兜底：四通道均空、动作数为 0', () => {
    const out = autoLearnFromFeedback([], { drug: 1.0 });
    expect(out.weightChanges).toEqual([]);
    expect(out.processImprovements).toEqual([]);
    expect(out.safetyRuleUpdates).toEqual([]);
    expect(out.qcStrengthenings).toEqual([]);
    expect(out.autoActionsTaken).toBe(0);
  });
});

describe('detectKnowledgeGap 知识缺口诊断', () => {
  it('低采纳率建议类型 → 高严重度推荐缺口', () => {
    const gaps = detectKnowledgeGap(weeklyEvents());
    const labGap = gaps.find((g) => g.subject.includes('lab_interpret'));
    expect(labGap).toBeDefined();
    expect(labGap?.channel).toBe('recommendation');
    expect(labGap?.severity).toBe('high');
  });

  it('低满意度环节 → 高严重度服务缺口', () => {
    const gaps = detectKnowledgeGap(weeklyEvents());
    const chargingGap = gaps.find((g) => g.subject.includes('charging'));
    expect(chargingGap?.channel).toBe('service');
    expect(chargingGap?.severity).toBe('high');
  });

  it('高危差错规则 → 高严重度安全缺口', () => {
    const gaps = detectKnowledgeGap(weeklyEvents());
    const safetyGap = gaps.find((g) => g.subject.includes('drug_interaction_check'));
    expect(safetyGap?.channel).toBe('safety');
    expect(safetyGap?.severity).toBe('high');
  });

  it('质控扣分维度 → 对应等级缺口', () => {
    const gaps = detectKnowledgeGap(weeklyEvents());
    const qcGap = gaps.find((g) => g.subject.includes('病案首页'));
    expect(qcGap?.channel).toBe('qc');
    expect(qcGap?.severity).toBe('medium'); // 7 分 ∈ [5,10)
  });

  it('无问题时返回空缺口；排序 high 在前', () => {
    expect(detectKnowledgeGap([])).toEqual([]);
    const gaps = detectKnowledgeGap(weeklyEvents());
    const severities = gaps.map((g) => g.severity);
    const rank = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < severities.length; i += 1) {
      expect(rank[severities[i]]).toBeGreaterThanOrEqual(rank[severities[i - 1]]);
    }
  });
});

describe('generateLearningReport 周度报告', () => {
  it('汇总四通道事件计数并折算进化成熟度', () => {
    const report = generateLearningReport({
      days: 7,
      events: weeklyEvents(),
      currentWeights: { drug: 1.0, lab_interpret: 1.0, diagnosis: 1.0, pathway: 1.0 },
      generatedAt: '2026-10-16T00:00:00.000Z',
    });
    expect(report.period.days).toBe(7);
    expect(report.period.generatedAt).toBe('2026-10-16T00:00:00.000Z');
    expect(report.summary.totalEvents).toBe(weeklyEvents().length);
    expect(report.summary.doctorDecisions).toBe(30); // (9+1)+(2+8)+(4+6)
    expect(report.summary.satisfactionSamples).toBe(7); // 4 + 3
    expect(report.summary.medicalErrors).toBe(2);
    expect(report.summary.qcDeductionIncidents).toBe(2);
    // 四通道本周期均产出动作 → 成熟度满分
    expect(report.summary.evolutionScore).toBe(100);
    expect(report.knowledgeGaps.length).toBeGreaterThan(0);
  });

  it('无反馈时进化成熟度为 0、报告结构完整', () => {
    const report = generateLearningReport({
      days: 7,
      events: [],
      currentWeights: { drug: 1.0 },
    });
    expect(report.summary.autoActionsTaken).toBe(0);
    expect(report.summary.evolutionScore).toBe(0);
    expect(report.weights).toEqual([]);
    expect(report.knowledgeGaps).toEqual([]);
    expect(report.period.generatedAt).toBeTruthy();
  });
});
