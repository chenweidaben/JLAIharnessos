/**
 * 健澜科技 jlmedaios - 护士屏营养/睡眠块纯函数测试（M60-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { buildEvalSummary } from '../../src/medical-tools/nursing/evalSummary.js';

describe('evalSummary nutritionConsult 块', () => {
  it('high 方案 -> highPlan + flag', () => {
    const s = buildEvalSummary({
      nutritionConsult: { nutritionDiagnosis: 'x', planTier: 'high', caloriesPerDay: 2800, followupDays: 7, status: 'consulted' },
    });
    expect(s.nutritionConsult.highPlan).toBe(true);
    expect(s.nutritionConsult.followupOverdue).toBe(true);
    expect(s.flags).toContain('nutrition_high_plan');
    expect(s.flags).toContain('nutrition_followup_pending');
  });
  it('normal 且已随访 -> 无 flag', () => {
    const s = buildEvalSummary({
      nutritionConsult: { nutritionDiagnosis: 'x', planTier: 'normal', caloriesPerDay: 2000, followupDays: 7, status: 'followed_up' },
    });
    expect(s.nutritionConsult.highPlan).toBe(false);
    expect(s.nutritionConsult.followupOverdue).toBe(false);
  });
});

describe('evalSummary stopbang 块', () => {
  it('high -> highRisk + osa flag', () => {
    const s = buildEvalSummary({ stopbang: { score: 5, riskLevel: 'high' } });
    expect(s.stopbang.highRisk).toBe(true);
    expect(s.flags).toContain('osa_high_risk');
  });
  it('low -> 无 flag', () => {
    const s = buildEvalSummary({ stopbang: { score: 1, riskLevel: 'low' } });
    expect(s.stopbang.highRisk).toBe(false);
  });
});
