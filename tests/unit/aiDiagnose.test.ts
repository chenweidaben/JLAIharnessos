/**
 * 健澜科技 jlmedaios - AI核心能力深化（M144-A）：AI 辅助诊断纯函数单测
 *
 * 覆盖：
 *   - aiDiagnose：Top3 可能诊断、置信度排序、鉴别诊断/建议检查/治疗方向输出；
 *   - 置信度计算：年龄带 / 性别好发修正会抬高同一条线索的置信度；
 *   - refineDiagnosis + getDiagnosisAccuracy：医生采纳/驳回留痕与准确率回流。
 *
 * 与持久化解耦：单测走内存 feedback 账本（resetFeedbackLog 每用例清空）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it } from 'bun:test';
import {
  aiDiagnose,
  getDiagnosisAccuracy,
  refineDiagnosis,
  resetFeedbackLog,
} from '../../src/bff/aggregators/aiDiagnoseAggregator';

beforeEach(() => resetFeedbackLog());

describe('aiDiagnose 诊断建议生成', () => {
  it('胸痛+压榨样+55岁男性+高血压，Top1 命中冠心病且带 ICD10 与置信度', () => {
    const s = aiDiagnose(
      [{ name: '胸痛' }, { name: '胸闷', onset: '压榨样' }],
      55,
      'male',
      { chronicDiseases: ['高血压'] },
    );
    expect(s.suggestionId).toMatch(/^diag_/);
    expect(s.topCandidates.length).toBeGreaterThanOrEqual(1);
    expect(s.topCandidates[0].diagnosis).toContain('冠心病');
    expect(s.topCandidates[0].icd10).toBe('I20.900');
    expect(s.topCandidates[0].confidence).toBeGreaterThan(0);
    expect(s.topCandidates[0].confidence).toBeLessThanOrEqual(0.95);
    // 输出鉴别诊断 / 建议检查 / 治疗方向
    expect(s.suggestedExams.length).toBeGreaterThan(0);
    expect(s.treatmentDirections.length).toBeGreaterThan(0);
    expect(s.disclaimer).toContain('仅供参考');
  });

  it('Top3 置信度严格降序，且每条候选有支持依据', () => {
    const s = aiDiagnose(
      [{ name: '发热' }, { name: '咳嗽' }, { name: '咳痰' }, { name: '气促' }],
      70,
      'female',
      {},
    );
    expect(s.topCandidates.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < s.topCandidates.length; i++) {
      expect(s.topCandidates[i - 1].confidence).toBeGreaterThanOrEqual(
        s.topCandidates[i].confidence,
      );
    }
    expect(s.topCandidates[0].evidence.length).toBeGreaterThan(0);
  });

  it('无任何命中时返回待查兜底，不抛错', () => {
    const s = aiDiagnose([], 30, '', {});
    expect(s.topCandidates[0].diagnosis).toContain('待查');
    expect(s.riskWarnings.length).toBeGreaterThan(0);
  });

  it('红旗症状触发 critical 风险提示', () => {
    const s = aiDiagnose(
      [{ name: '胸痛', onset: '持续不缓解伴大汗濒死感' }],
      60,
      'male',
      {},
    );
    expect(s.riskWarnings.some((w) => w.level === 'critical')).toBe(true);
  });
});

describe('aiDiagnose 置信度计算（年龄/性别修正）', () => {
  it('同一条胸痛线索，55岁男性的置信度高于无年龄性别信息者', () => {
    const withDemographics = aiDiagnose([{ name: '胸痛' }], 55, 'male', {});
    const without = aiDiagnose([{ name: '胸痛' }], 30, '', {});
    expect(withDemographics.topCandidates[0].diagnosis).toContain('冠心病');
    expect(withDemographics.topCandidates[0].confidence).toBeGreaterThan(
      without.topCandidates[0].confidence,
    );
  });

  it('女性尿路症状因性别好发修正抬高置信度', () => {
    const female = aiDiagnose([{ name: '尿频' }, { name: '尿急' }, { name: '尿痛' }], 28, 'female', {});
    const male = aiDiagnose([{ name: '尿频' }, { name: '尿急' }, { name: '尿痛' }], 28, 'male', {});
    expect(female.topCandidates[0].diagnosis).toContain('尿路感染');
    expect(female.topCandidates[0].confidence).toBeGreaterThan(
      male.topCandidates[0].confidence,
    );
  });
});

describe('refineDiagnosis 反馈学习与准确率回流', () => {
  it('医生采纳/驳回均留痕，统计采纳率与 Top1 命中率', () => {
    const s = aiDiagnose(
      [{ name: '胸痛' }, { name: '胸闷', onset: '压榨样' }],
      55,
      'male',
      { chronicDiseases: ['高血压'] },
    );
    refineDiagnosis(s.topCandidates[0].diagnosis, s, {
      doctorId: 'D001', action: 'accepted', timestamp: '2026-10-01T10:00:00Z',
    });
    refineDiagnosis('上呼吸道感染', s, {
      doctorId: 'D001', action: 'rejected', timestamp: '2026-10-02T10:00:00Z',
    });

    const stats = getDiagnosisAccuracy('D001');
    expect(stats.total).toBe(2);
    expect(stats.accepted).toBe(1);
    expect(stats.rejected).toBe(1);
    expect(stats.acceptanceRate).toBe(0.5);
    // 1 次采纳命中 + 1 次驳回不一致 → Top1 命中率 0.5
    expect(stats.top1MatchRate).toBe(0.5);
  });

  it('period 区间过滤只统计窗口内的留痕', () => {
    const s = aiDiagnose([{ name: '发热' }, { name: '咽痛' }], 10, 'female', {});
    refineDiagnosis(s.topCandidates[0].diagnosis, s, {
      doctorId: 'D002', action: 'accepted', timestamp: '2026-09-15T10:00:00Z',
    });
    refineDiagnosis(s.topCandidates[0].diagnosis, s, {
      doctorId: 'D002', action: 'accepted', timestamp: '2026-10-05T10:00:00Z',
    });

    const all = getDiagnosisAccuracy('D002');
    expect(all.total).toBe(2);

    const oct = getDiagnosisAccuracy('D002', {
      from: '2026-10-01T00:00:00Z',
      to: '2026-10-31T23:59:59Z',
    });
    expect(oct.total).toBe(1);
    expect(oct.accepted).toBe(1);
    expect(oct.top1MatchRate).toBe(1);
  });

  it('无留痕医生返回零值统计，不抛错', () => {
    const stats = getDiagnosisAccuracy('NO_SUCH_DOCTOR');
    expect(stats.total).toBe(0);
    expect(stats.acceptanceRate).toBe(0);
    expect(stats.top1MatchRate).toBe(0);
  });
});
