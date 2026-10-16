/**
 * 健澜科技 jlmedaios - M170-A 自学习闭环深化纯函数单测
 *
 * 覆盖：
 *   1. 深度学习：deepAutoLearn 四维度（诊断/用药/护理/管理）指标真实折算；
 *   2. 权重调整：adjustWeightsAutomatically 升权/降权/冷启动不动/边界截断/不修改入参；
 *   3. 漂移检测：detectKnowledgeDrift 本周期 vs 上周期指标下滑触发 high/medium/none；
 *   4. 进化报告：generateEvolutionReport 汇总计数、成熟度口径、交叉验证结果；
 *   5. 交叉验证：crossValidateLearning 混淆矩阵 → accuracy/precision/recall/F1/过拟合判定。
 *
 * 与持久化解耦，不触库、不写 SQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  adjustWeightsAutomatically,
  crossValidateLearning,
  deepAutoLearn,
  detectKnowledgeDrift,
  dimensionMetric,
  generateEvolutionReport,
  DEFAULT_DIM_WEIGHT,
  MAX_DIM_WEIGHT,
  MIN_DIM_WEIGHT,
  type DeepFeedbackData,
} from '../../src/bff/aggregators/autoLearnDeepAggregator';

/* ---------- 测试夹具 ---------- */

/** 高命中率诊断样本：10 条中 9 条正确 */
function goodDiagnosis() {
  return Array.from({ length: 10 }, (_, i) => ({
    encounterId: `ENC-${i}`,
    suggestedDiagnosis: 'J18.9',
    finalDiagnosis: 'J18.9',
    correct: i < 9,
    delayedDays: i < 9 ? 0 : 3,
  }));
}

/** 低合理率用药样本：12 条中仅 5 条合理、5 条错误 */
function badMedication() {
  return Array.from({ length: 12 }, (_, i) => ({
    prescriptionId: `RX-${i}`,
    judgement: (i < 5 ? 'appropriate' : i < 8 ? 'suboptimal' : 'wrong') as
      | 'appropriate'
      | 'suboptimal'
      | 'wrong',
    issueType: (i < 5 ? undefined : i < 8 ? 'dose' : 'interaction') as
      | 'dose'
      | 'interaction'
      | 'indication'
      | 'duplication'
      | undefined,
  }));
}

/** 高漏报护理样本：10 起事件仅 6 起被预警 */
function lowSensitivityNursing() {
  return Array.from({ length: 10 }, (_, i) => ({
    eventId: `AE-${i}`,
    riskType: 'fall' as const,
    warned: i < 6,
    severity: 'medium' as const,
  }));
}

/** 中等成功率管理样本 */
function mixedManagement() {
  return [
    { decisionId: 'MD-1', domain: 'bed_allocation' as const, outcome: 'success' as const, impact: 0.2 },
    { decisionId: 'MD-2', domain: 'staffing' as const, outcome: 'partial' as const, impact: 0.0 },
    { decisionId: 'MD-3', domain: 'schedule' as const, outcome: 'failure' as const, impact: -0.2 },
    { decisionId: 'MD-4', domain: 'procurement' as const, outcome: 'success' as const, impact: 0.1 },
    { decisionId: 'MD-5', domain: 'bed_allocation' as const, outcome: 'success' as const, impact: 0.15 },
    { decisionId: 'MD-6', domain: 'staffing' as const, outcome: 'partial' as const, impact: 0.05 },
  ];
}

/** 本周期反馈：诊断好、用药差、护理漏报、管理中等 */
function currentFeedback(): DeepFeedbackData {
  return {
    diagnosis: goodDiagnosis(),
    medication: badMedication(),
    nursing: lowSensitivityNursing(),
    management: mixedManagement(),
  };
}

/** 上周期反馈：各维度指标都更高（用于触发漂移） */
function previousGoodFeedback(): DeepFeedbackData {
  return {
    diagnosis: Array.from({ length: 10 }, () => ({
      encounterId: 'PRE',
      suggestedDiagnosis: 'J18.9',
      finalDiagnosis: 'J18.9',
      correct: true,
    })),
    medication: Array.from({ length: 12 }, (_, i) => ({
      prescriptionId: 'PRE',
      judgement: (i < 10 ? 'appropriate' : 'suboptimal') as 'appropriate' | 'suboptimal' | 'wrong',
      issueType: undefined,
    })),
    nursing: Array.from({ length: 10 }, () => ({
      eventId: 'PRE',
      riskType: 'fall' as const,
      warned: true,
      severity: 'low' as const,
    })),
    management: Array.from({ length: 6 }, () => ({
      decisionId: 'PRE',
      domain: 'bed_allocation' as const,
      outcome: 'success' as const,
      impact: 0.2,
    })),
  };
}

/* ---------- 测试用例 ---------- */

describe('dimensionMetric 四维度指标折算', () => {
  it('诊断命中率 = correct / samples', () => {
    const m = dimensionMetric('diagnosis', { diagnosis: goodDiagnosis() });
    expect(m.samples).toBe(10);
    expect(m.metricName).toBe('accuracy');
    expect(m.value).toBeCloseTo(0.9, 5);
  });

  it('用药合理率 = appropriate / samples', () => {
    const m = dimensionMetric('medication', { medication: badMedication() });
    expect(m.samples).toBe(12);
    expect(m.value).toBeCloseTo(5 / 12, 5);
  });

  it('护理敏感性 = warned / samples', () => {
    const m = dimensionMetric('nursing', { nursing: lowSensitivityNursing() });
    expect(m.value).toBeCloseTo(0.6, 5);
  });

  it('管理成功率 = success / samples', () => {
    const m = dimensionMetric('management', { management: mixedManagement() });
    expect(m.value).toBeCloseTo(3 / 6, 5);
  });

  it('空样本返回 0 与 0 条', () => {
    const m = dimensionMetric('diagnosis', {});
    expect(m.samples).toBe(0);
    expect(m.value).toBe(0);
  });
});

describe('adjustWeightsAutomatically 权重自动调整', () => {
  it('高指标维度升权、低指标维度降权、中间区间 hold', () => {
    const { weights, changes } = adjustWeightsAutomatically(currentFeedback(), { ...DEFAULT_DIM_WEIGHT });
    // diagnosis 0.9 ≥ 0.8 → boost
    const diagChange = changes.find((c) => c.dimension === 'diagnosis')!;
    expect(diagChange.direction).toBe('boost');
    expect(weights.diagnosis).toBeGreaterThan(1.0);
    // medication 5/12≈0.42 < 0.5 → dampen
    const medChange = changes.find((c) => c.dimension === 'medication')!;
    expect(medChange.direction).toBe('dampen');
    expect(weights.medication).toBeLessThan(1.0);
    // nursing 0.6 在 [0.5, 0.8) → hold
    const nursChange = changes.find((c) => c.dimension === 'nursing')!;
    expect(nursChange.direction).toBe('hold');
    expect(weights.nursing).toBe(1.0);
    // management 0.5 不 < 0.5（strict）→ hold
    const mgmtChange = changes.find((c) => c.dimension === 'management')!;
    expect(mgmtChange.direction).toBe('hold');
  });

  it('冷启动：样本不足不干预权重', () => {
    const sparse: DeepFeedbackData = {
      diagnosis: [{ encounterId: 'x', suggestedDiagnosis: 'a', finalDiagnosis: 'a', correct: true }],
    };
    const before = { ...DEFAULT_DIM_WEIGHT };
    const { weights, changes } = adjustWeightsAutomatically(sparse, before);
    expect(weights.diagnosis).toBe(before.diagnosis);
    expect(changes.every((c) => c.direction === 'hold')).toBe(true);
  });

  it('权重截断到 [MIN, MAX]', () => {
    // 连续多次升权后不得超过 MAX
    let weights = { ...DEFAULT_DIM_WEIGHT };
    for (let i = 0; i < 20; i += 1) {
      const next = adjustWeightsAutomatically(currentFeedback(), weights);
      weights = next.weights;
    }
    expect(weights.diagnosis).toBeLessThanOrEqual(MAX_DIM_WEIGHT);
    expect(weights.diagnosis).toBeGreaterThanOrEqual(MIN_DIM_WEIGHT);
  });

  it('不修改入参 currentWeights', () => {
    const before = { diagnosis: 1.0, medication: 1.0, nursing: 1.0, management: 1.0 };
    const snapshot = { ...before };
    adjustWeightsAutomatically(currentFeedback(), before);
    expect(before).toEqual(snapshot);
  });
});

describe('deepAutoLearn 四维度深度自学习', () => {
  it('诊断维度输出命中率/漏诊率/平均延迟天数与动作', () => {
    const out = deepAutoLearn(currentFeedback());
    expect(out.diagnosis.samples).toBe(10);
    expect(out.diagnosis.accuracy).toBeCloseTo(0.9, 5);
    expect(out.diagnosis.missRate).toBeCloseTo(0.1, 5);
    // 10 条样本中仅 1 条延迟 3 天，其余 9 条延迟 0 天 → 平均 0.3
    expect(out.diagnosis.avgDelayedDays).toBe(0.3);
    expect(out.diagnosis.action.length).toBeGreaterThan(0);
  });

  it('用药维度输出合理率/错误率/不合理类型分布', () => {
    const out = deepAutoLearn(currentFeedback());
    // 代码内 round2 → 0.42
    expect(out.medication.appropriateRate).toBe(0.42);
    // 12 条中 4 条 wrong → 4/12 ≈ 0.33
    expect(out.medication.wrongRate).toBe(0.33);
    // issueBreakdown 应包含 interaction 与 dose
    const types = out.medication.issueBreakdown.map((i) => i.issueType);
    expect(types).toContain('interaction');
    expect(types).toContain('dose');
  });

  it('护理维度漏报多 → 阈值自动下调', () => {
    const out = deepAutoLearn(currentFeedback());
    expect(out.nursing.sensitivity).toBeCloseTo(0.6, 5);
    expect(out.nursing.thresholdDirection).toBe('lower');
    expect(out.nursing.suggestedThreshold).toBeLessThan(0.5);
  });

  it('管理维度输出成功率与平均影响偏差', () => {
    const out = deepAutoLearn(currentFeedback());
    expect(out.management.successRate).toBeCloseTo(0.5, 5);
    expect(out.management.avgImpact).toBeCloseTo((0.2 + 0 - 0.2 + 0.1 + 0.15 + 0.05) / 6, 5);
  });

  it('空反馈不抛错并产出中性结果', () => {
    const out = deepAutoLearn({});
    expect(out.diagnosis.samples).toBe(0);
    expect(out.medication.samples).toBe(0);
    expect(out.nursing.thresholdDirection).toBe('hold');
    expect(Object.keys(out.weights).sort()).toEqual(['diagnosis', 'management', 'medication', 'nursing']);
  });
});

describe('detectKnowledgeDrift 知识漂移检测', () => {
  it('无 previous 时返回空告警', () => {
    const alerts = detectKnowledgeDrift({ days: 7, feedback: currentFeedback() });
    expect(alerts).toEqual([]);
  });

  it('用药/护理指标从高降到低 → 触发 high 或 medium 告警', () => {
    const alerts = detectKnowledgeDrift({
      days: 7,
      feedback: currentFeedback(),
      previous: previousGoodFeedback(),
    });
    const med = alerts.find((a) => a.dimension === 'medication');
    expect(med).toBeDefined();
    // previous appropriate 10/12≈0.83, current 5/12≈0.42, delta≈-0.42 → high
    expect(med!.severity).toBe('high');
    expect(med!.delta).toBeLessThan(0);

    const nurs = alerts.find((a) => a.dimension === 'nursing');
    expect(nurs).toBeDefined();
    // previous sensitivity 1.0, current 0.6, delta -0.4 → high
    expect(nurs!.severity).toBe('high');
  });

  it('指标稳定 → none 且 recommendation 为稳定话术', () => {
    const alerts = detectKnowledgeDrift({
      days: 7,
      feedback: currentFeedback(),
      previous: currentFeedback(),
    });
    expect(alerts.every((a) => a.severity === 'none')).toBe(true);
  });
});

describe('crossValidateLearning 交叉验证', () => {
  it('完美预测 → accuracy/recall/F1 = 1, passed', () => {
    const data = Array.from({ length: 20 }, () => ({ modelPredicted: true, actual: true }));
    const r = crossValidateLearning({ dimension: 'diagnosis', trainAccuracy: 1 }, data);
    expect(r.testSamples).toBe(20);
    expect(r.accuracy).toBe(1);
    expect(r.precision).toBe(1);
    expect(r.recall).toBe(1);
    expect(r.f1).toBe(1);
    expect(r.passed).toBe(true);
    expect(r.overfitRisk).toBe(false);
  });

  it('混淆矩阵正确：TP/FP/TN/FN 派生指标', () => {
    // 10 条：TP=4, FP=1, TN=4, FN=1
    const data = [
      ...Array.from({ length: 4 }, () => ({ modelPredicted: true, actual: true })),
      { modelPredicted: true, actual: false },
      ...Array.from({ length: 4 }, () => ({ modelPredicted: false, actual: false })),
      { modelPredicted: false, actual: true },
    ];
    const r = crossValidateLearning({ dimension: 'medication' }, data);
    expect(r.tp).toBe(4);
    expect(r.fp).toBe(1);
    expect(r.tn).toBe(4);
    expect(r.fn).toBe(1);
    expect(r.accuracy).toBeCloseTo(0.8, 5);
    expect(r.precision).toBeCloseTo(4 / 5, 5);
    expect(r.recall).toBeCloseTo(4 / 5, 5);
    expect(r.f1).toBeCloseTo(0.8, 5);
  });

  it('训练准确率远高于测试准确率 → overfitRisk', () => {
    const data = Array.from({ length: 10 }, () => ({ modelPredicted: true, actual: false }));
    const r = crossValidateLearning({ dimension: 'nursing', trainAccuracy: 0.95 }, data);
    expect(r.accuracy).toBe(0);
    expect(r.overfitRisk).toBe(true);
    expect(r.passed).toBe(false);
  });
});

describe('generateEvolutionReport 进化报告', () => {
  it('汇总四维度学习 + 漂移 + 交叉验证 + 成熟度', () => {
    const report = generateEvolutionReport({
      days: 7,
      feedback: currentFeedback(),
      previous: previousGoodFeedback(),
      generatedAt: '2026-10-16T00:00:00.000Z',
    });
    expect(report.period.days).toBe(7);
    expect(report.period.generatedAt).toBe('2026-10-16T00:00:00.000Z');
    expect(report.learning.diagnosis.samples).toBe(10);
    expect(report.drift.hasDrift).toBe(true);
    expect(report.summary.driftAlerts).toBeGreaterThan(0);
    // 四维度样本都 ≥5，应产出 4 条交叉验证
    expect(report.crossValidation.length).toBe(4);
    expect(report.summary.cvTotal).toBe(4);
    // 成熟度 0~100
    expect(report.summary.evolutionScore).toBeGreaterThanOrEqual(0);
    expect(report.summary.evolutionScore).toBeLessThanOrEqual(100);
  });

  it('空反馈：报告结构完整，仅稳定分（无漂移告警 +10）', () => {
    const report = generateEvolutionReport({ days: 7, feedback: {} });
    // 无维度样本达标 → 0；无漂移告警 → +10；无交叉验证 → 0
    expect(report.summary.evolutionScore).toBe(10);
    expect(report.crossValidation).toEqual([]);
    expect(report.drift.alerts).toEqual([]);
  });
});
