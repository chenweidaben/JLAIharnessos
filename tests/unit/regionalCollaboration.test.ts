/**
 * 健澜科技 jlmedaios - 区域协同分级诊疗纯函数单测（M186-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildRegionalCollaboration,
  recommendCareLevel,
} from '../../src/bff/aggregators/regionalCollaborationAggregator';

describe('recommendCareLevel', () => {
  it('心梗 → tertiary', () => {
    const r = recommendCareLevel('p1', '急性心梗');
    expect(r.level).toBe('tertiary');
  });

  it('肺炎 → secondary', () => {
    const r = recommendCareLevel('p1', '社区获得性肺炎');
    expect(r.level).toBe('secondary');
  });

  it('普通感冒 → community', () => {
    const r = recommendCareLevel('p1', '普通感冒');
    expect(r.level).toBe('community');
  });
});

describe('buildRegionalCollaboration', () => {
  it('返回三级机构', () => {
    const r = buildRegionalCollaboration('余杭', '2026-10-16');
    expect(r.institutions.length).toBeGreaterThan(0);
    expect(r.institutions.some((i) => i.level === 'tertiary')).toBe(true);
  });

  it('包含上下转', () => {
    const r = buildRegionalCollaboration('余杭', '2026-10-16');
    expect(r.referrals.some((x) => x.direction === 'up')).toBe(true);
    expect(r.referrals.some((x) => x.direction === 'down')).toBe(true);
  });

  it('包含共享病例', () => {
    const r = buildRegionalCollaboration('余杭', '2026-10-16');
    expect(r.sharedCases.length).toBeGreaterThan(0);
  });
});
