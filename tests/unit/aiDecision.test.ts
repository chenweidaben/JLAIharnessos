/**
 * 健澜科技 jlmedaios - AI 智能决策支持纯函数单测（M164-B）
 *
 * 覆盖：
 *  - 决策生成 buildAIDecisionSupport：门诊高峰场景识别 + 触发事实 + 候选方案齐全
 *    （增医生/开窗口/引导预约），第一名推荐有具体动作与量化收益；
 *  - 方案排序 rankDecisionOptions：四维加权后确定性有序、第一名 recommended；
 *  - 影响评估 estimateDecisionImpact：ROI = 收益/成本，置信度与风险挂钩；
 *  - 效果跟踪 monitorDecisionOutcome：达成/部分/未达成三档结论 + 经验沉淀。
 * 纯函数、无 I/O、无 DB、无 WebSocket、无 SQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  BED_TIGHT_RATE,
  buildAIDecisionSupport,
  buildDemoContext,
  buildScenarioOptions,
  DEFAULT_DECISION_CRITERIA,
  DRUG_LOW_STOCK_DAYS,
  estimateDecisionImpact,
  monitorDecisionOutcome,
  OUTPATIENT_PEAK_DEVIATION,
  QC_HIGH_DEDUCTION,
  rankDecisionOptions,
  type DecisionOption,
} from '../../src/bff/aggregators/aiDecisionAggregator.js';

describe('M164-B 决策生成 buildAIDecisionSupport', () => {
  it('门诊高峰：识别场景、触发事实含门诊量偏离，候选方案覆盖增医生/开窗口/引导预约', () => {
    const r = buildAIDecisionSupport(buildDemoContext());
    expect(r.scenario).toBe('outpatientPeak');
    expect(r.scenarioLabel).toContain('门诊');
    expect(r.triggerFacts.length).toBeGreaterThanOrEqual(2);
    expect(r.triggerFacts.some((f) => f.includes('门诊'))).toBe(true);

    const ids = r.options.map((o) => o.optionId);
    expect(ids).toContain('opd_add_doctors');
    expect(ids).toContain('opd_open_windows');
    expect(ids).toContain('opd_guide_appointment');

    // 推荐方案不空泛：有具体动作、量化收益、风险提示
    expect(r.recommended.action.length).toBeGreaterThan(5);
    expect(r.recommended.benefit.waitReductionMin).toBeGreaterThan(0);
    expect(r.recommended.riskNote.length).toBeGreaterThan(0);
  });

  it('四类场景自动识别：床位/药品/质控阈值触发对应方案库', () => {
    const bed = buildAIDecisionSupport({ bedRate: 96, pendingAdmissions: 12 });
    expect(bed.scenario).toBe('bedTight');
    expect(bed.options.map((o) => o.optionId)).toContain('bed_expedite_discharge');

    const drug = buildAIDecisionSupport({ drugStockDays: 3, drugDailyConsume: 20, drugUnitPrice: 50 });
    expect(drug.scenario).toBe('drugStockLow');
    expect(drug.options.map((o) => o.optionId)).toContain('drug_urgent_purchase');

    const qc = buildAIDecisionSupport({ qcDeductionThisMonth: 30, qcDeductionBaseline: 18, deptName: '内科' });
    expect(qc.scenario).toBe('qcDeductionHigh');
    expect(qc.options.map((o) => o.optionId)).toContain('qc_special_rectification');
  });

  it('阈值常量与场景判定一致', () => {
    expect(OUTPATIENT_PEAK_DEVIATION).toBe(0.2);
    expect(BED_TIGHT_RATE).toBe(92);
    expect(DRUG_LOW_STOCK_DAYS).toBe(7);
    expect(QC_HIGH_DEDUCTION).toBe(0.3);
  });
});

describe('M164-B 方案排序 rankDecisionOptions', () => {
  it('排序后名次连续、分不增、第一名 recommended，且确定性可复现', () => {
    const opts = buildScenarioOptions('outpatientPeak', buildDemoContext());
    const a = rankDecisionOptions(opts, DEFAULT_DECISION_CRITERIA);
    const b = rankDecisionOptions(opts, DEFAULT_DECISION_CRITERIA);

    expect(a.length).toBe(opts.length);
    expect(a[0].rank).toBe(1);
    expect(a[0].recommended).toBe(true);
    expect(a.every((o, i) => o.rank === i + 1)).toBe(true);
    // 综合分单调不增
    for (let i = 1; i < a.length; i += 1) {
      expect(a[i - 1].totalScore).toBeGreaterThanOrEqual(a[i].totalScore);
    }
    // 确定性：两次调用结果完全一致
    expect(a.map((o) => o.optionId)).toEqual(b.map((o) => o.optionId));
  });

  it('空候选项返回空数组不报错', () => {
    expect(rankDecisionOptions([])).toEqual([]);
  });

  it('自定义权重可改变推荐：极度看重成本时，最便宜的方案排前', () => {
    const opts = buildScenarioOptions('outpatientPeak', buildDemoContext());
    const cheapFirst = rankDecisionOptions(opts, { wBenefit: 0, wCost: 1, wRisk: 0, wSpeed: 0 });
    const cheapest = [...opts].sort((x, y) => x.costPerRun - y.costPerRun)[0];
    expect(cheapFirst[0].optionId).toBe(cheapest.optionId);
  });
});

describe('M164-B 影响评估 estimateDecisionImpact', () => {
  it('ROI = 预估收益 / 预估成本；成本为 0 时 roi 为 null；置信度与风险挂钩', () => {
    const opts = buildScenarioOptions('outpatientPeak', buildDemoContext());
    const ranked = rankDecisionOptions(opts);
    const impact = estimateDecisionImpact(ranked[0]);

    expect(impact.estimatedCost).toBe(ranked[0].costPerRun);
    if (impact.estimatedCost > 0) {
      expect(impact.roi).toBeCloseTo(Math.round((impact.estimatedBenefitValue / impact.estimatedCost) * 10) / 10, 1);
    }
    expect(impact.confidence).toBeGreaterThan(0);
    expect(impact.caveats.length).toBeGreaterThanOrEqual(2);

    // 零成本方案（转康复）roi 应为 null
    const free = estimateDecisionImpact(
      buildScenarioOptions('bedTight', {})[2] as DecisionOption,
    );
    expect(free.estimatedCost).toBe(0);
    expect(free.roi).toBeNull();
  });
});

describe('M164-B 效果跟踪 monitorDecisionOutcome', () => {
  it('达成 ≥90% → achieved；50~90% → partial；<50% → missed，并沉淀经验与下一步', () => {
    const base = { decisionId: 'opd_add_doctors', metric: 'waitReductionMin', expected: 20, costPlanned: 6000, costActual: 6300 };

    const good = monitorDecisionOutcome(base.decisionId, { ...base, actual: 19 });
    expect(good.verdict).toBe('achieved');
    expect(good.achievedRatio).toBe(0.95);
    expect(good.nextAction.length).toBeGreaterThan(0);

    const half = monitorDecisionOutcome(base.decisionId, { ...base, actual: 12 });
    expect(half.verdict).toBe('partial');
    expect(half.achievedRatio).toBe(0.6);

    const bad = monitorDecisionOutcome(base.decisionId, { ...base, actual: 5 });
    expect(bad.verdict).toBe('missed');
    expect(bad.learning).toContain('未达预期');

    // 成本偏差：(6300-6000)/6000 = 5%
    expect(good.costDeviationPct).toBe(5);
  });

  it('预测为 0 时不除零，达成率记 1', () => {
    const r = monitorDecisionOutcome('x', { metric: 'm', expected: 0, actual: 0, costPlanned: 0, costActual: 0 });
    expect(r.achievedRatio).toBe(1);
    expect(r.costDeviationPct).toBeNull();
  });
});
