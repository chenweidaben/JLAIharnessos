/**
 * 健澜科技 jlmedaios - M83-A 护士屏手术核查块纯函数测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { buildEvalSummary } from '../../src/medical-tools/nursing/evalSummary.js';

describe('evalSummary surgical 块', () => {
  it('无记录默认空块且不告警', () => {
    const s = buildEvalSummary({});
    expect(s.surgical.signinComplete).toBe(false);
    expect(s.surgical.timeoutComplete).toBe(false);
    expect(s.surgical.signoutComplete).toBe(false);
    expect(s.surgical.status).toBe('none');
    expect(s.surgical.failed).toBe(false);
    expect(s.flags).not.toContain('surgical_check_failed');
  });

  it('三阶段全 true 且 passed 不标红', () => {
    const s = buildEvalSummary({
      surgical: { signinComplete: true, timeoutComplete: true, signoutComplete: true, status: 'passed' },
    });
    expect(s.surgical.signinComplete).toBe(true);
    expect(s.surgical.timeoutComplete).toBe(true);
    expect(s.surgical.signoutComplete).toBe(true);
    expect(s.surgical.failed).toBe(false);
    expect(s.flags).not.toContain('surgical_check_failed');
  });

  it('status=failed -> surgical_check_failed', () => {
    const s = buildEvalSummary({
      surgical: { signinComplete: true, timeoutComplete: false, signoutComplete: false, status: 'failed' },
    });
    expect(s.surgical.failed).toBe(true);
    expect(s.flags).toContain('surgical_check_failed');
  });
});
