/**
 * 健澜科技 jlmedaios - 全自学习闭环深化纯函数单测（M186-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { buildSelfLearningLoop } from '../../src/bff/aggregators/selfLearningLoopAggregator';

describe('buildSelfLearningLoop', () => {
  it('沉淀案例总数 = 各角色之和', () => {
    const r = buildSelfLearningLoop('30d');
    expect(r.caseAccumulation.total).toBe(
      r.caseAccumulation.doctorCases + r.caseAccumulation.nurseCases + r.caseAccumulation.pharmaCases,
    );
  });

  it('复用率 = 复用数/总数', () => {
    const r = buildSelfLearningLoop('30d');
    const expected = Math.round((r.knowledgeReuse.reusedCases / r.caseAccumulation.total) * 100) / 100;
    expect(r.knowledgeReuse.reuseRate).toBe(expected);
  });

  it('飞轮包含4阶段', () => {
    const r = buildSelfLearningLoop('30d');
    expect(r.flywheel.length).toBe(4);
    expect(r.flywheel[0].stage).toBe('经验沉淀');
  });

  it('效果提升指标在 0-1 之间', () => {
    const r = buildSelfLearningLoop('30d');
    expect(r.improvementMetrics.adoptionRate).toBeGreaterThan(0);
    expect(r.improvementMetrics.adoptionRate).toBeLessThan(1);
    expect(r.improvementMetrics.diagnosisAccuracy).toBeGreaterThan(0);
    expect(r.improvementMetrics.patientSatisfaction).toBeGreaterThan(0);
  });

  it('模型改进有迭代次数', () => {
    const r = buildSelfLearningLoop('30d');
    expect(r.modelImprovement.iterations).toBeGreaterThan(0);
    expect(r.modelImprovement.updatedRules).toBeGreaterThan(0);
  });
});
