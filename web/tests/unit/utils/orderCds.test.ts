/**
 * 健澜科技 jlmedaios - 医嘱开方 CDS utils 单测（M18-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'vitest';
import { ruleLabel, severityColor, severityLabel } from '@/utils/orderCds';

describe('M18-A cds utils', () => {
  it('severity color', () => {
    expect(severityColor('hard')).toBe('red');
    expect(severityColor('warn')).toBe('orange');
    expect(severityColor('info')).toBe('blue');
  });
  it('severity label', () => {
    expect(severityLabel('hard')).toContain('拦截');
  });
  it('rule label', () => {
    expect(ruleLabel('allergy')).toBe('过敏');
  });
});
