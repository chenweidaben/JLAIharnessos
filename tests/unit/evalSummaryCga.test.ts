/**
 * 健澜科技 jlmedaios - M57-A 护士屏 CGA 块纯函数测试
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { buildEvalSummary } from '../../src/medical-tools/nursing/evalSummary.js';

describe('evalSummary cga 块', () => {
  it('high risk 标红', () => {
    const s = buildEvalSummary({ cga: { adlScore: 50, iadlScore: 20, mmseScore: 28, fallRisk: false, mnaScore: 13, gdsScore: 2, riskLevel: 'high' } });
    expect(s.cga.highRisk).toBe(true);
    expect(s.flags).toContain('cga_high_risk');
  });
  it('low risk 不标红', () => {
    const s = buildEvalSummary({ cga: { adlScore: 100, iadlScore: 28, mmseScore: 30, fallRisk: false, mnaScore: 14, gdsScore: 0, riskLevel: 'low' } });
    expect(s.cga.highRisk).toBe(false);
    expect(s.flags).not.toContain('cga_high_risk');
  });
  it('无 CGA 块默认空', () => {
    const s = buildEvalSummary({});
    expect(s.cga.adlScore).toBeNull();
    expect(s.cga.riskLevel).toBe('unknown');
  });
});
