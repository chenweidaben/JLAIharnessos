/**
 * 健澜科技 jlmedaios - M53-A 护士屏康复/疼痛块纯函数测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { buildEvalSummary } from '../../src/medical-tools/nursing/evalSummary.js';

describe('evalSummary rehabTreatment 块', () => {
  it('poor/fair 疗效标红', () => {
    const s = buildEvalSummary({ rehabTreatment: { modality: 'pt', status: 'completed', efficacy: 'poor' } });
    expect(s.rehabTreatment.poorEfficacy).toBe(true);
    expect(s.flags).toContain('rehab_poor_efficacy');
  });
  it('excellent 不标红', () => {
    const s = buildEvalSummary({ rehabTreatment: { modality: 'pt', status: 'completed', efficacy: 'excellent' } });
    expect(s.rehabTreatment.poorEfficacy).toBe(false);
    expect(s.flags).not.toContain('rehab_poor_efficacy');
  });
  it('无治疗块默认空', () => {
    const s = buildEvalSummary({});
    expect(s.rehabTreatment.modality).toBeNull();
    expect(s.rehabTreatment.efficacy).toBeNull();
  });
});

describe('evalSummary painClinic 块', () => {
  it('NRS>=7 标红', () => {
    const s = buildEvalSummary({ painClinic: { baselineNrs: 9, currentNrs: 8, breakthroughCount: 0 } });
    expect(s.painClinic.severeNrs).toBe(true);
    expect(s.flags).toContain('pain_severe_nrs');
  });
  it('爆发痛>=3 标红', () => {
    const s = buildEvalSummary({ painClinic: { baselineNrs: 5, currentNrs: 3, breakthroughCount: 3 } });
    expect(s.painClinic.severeNrs).toBe(true);
  });
  it('低 NRS 不标红', () => {
    const s = buildEvalSummary({ painClinic: { baselineNrs: 5, currentNrs: 3, breakthroughCount: 1 } });
    expect(s.painClinic.severeNrs).toBe(false);
    expect(s.flags).not.toContain('pain_severe_nrs');
  });
});
