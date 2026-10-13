/**
 * 健澜科技 jlmedaios - 出院计划纯函数测试（M61-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { buildGuidance, suggestFollowup } from '../../src/medical-tools/nursing/dischargePlan.js';

describe('suggestFollowup', () => {
  it('外科 7 天', () => {
    expect(suggestFollowup('普外科', '2026-10-01')).toBe('2026-10-08');
  });
  it('慢病 30 天', () => {
    expect(suggestFollowup('内分泌科', '2026-10-01')).toBe('2026-10-31');
  });
  it('默认 14 天', () => {
    expect(suggestFollowup('普通内科', '2026-10-01')).toBe('2026-10-15');
  });
});

describe('buildGuidance', () => {
  it('有诊断生成要点', () => {
    const g = buildGuidance(['2型糖尿病', '高血压']);
    expect(g).toContain('2型糖尿病');
    expect(g).toContain('高血压');
  });
  it('空诊断给默认', () => {
    expect(buildGuidance([])).toContain('遵医嘱');
  });
});
