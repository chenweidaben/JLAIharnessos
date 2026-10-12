/**
 * 健澜科技 jlmedaios - M44-B 护士屏心理块集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { buildEvalSummary } from '../../src/medical-tools/nursing/evalSummary.js';

describe('evalSummary psych', () => {
  it('重度标红', () => {
    const s = buildEvalSummary({
      psych: { phq9Total: 18, phq9Level: 'moderately_severe', gad7Total: 5, gad7Level: 'mild' },
    });
    expect(s.psych.severe).toBe(true);
    expect(s.flags).toContain('psych_severe');
    expect(s.needsAttention).toBe(true);
  });
  it('轻度不标红', () => {
    const s = buildEvalSummary({
      psych: { phq9Total: 8, phq9Level: 'mild', gad7Total: 3, gad7Level: 'none' },
    });
    expect(s.psych.severe).toBe(false);
    expect(s.flags).not.toContain('psych_severe');
  });
});
