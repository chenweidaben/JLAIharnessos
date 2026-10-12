/**
 * 健澜科技 jlmedaios - 成本归因纯函数单测（M22-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { attributeCosts } from '../../src/medical-tools/operations/costAttribution';

describe('cost attribution pure', () => {
  it('variance/contribution/TopN', () => {
    const rows = attributeCosts([
      { category: 'drug', actual: 200, expected: 100 }, // +100
      { category: 'lab', actual: 50, expected: 100 },   // -50
      { category: 'ward', actual: 150, expected: 100 },  // +50
    ], 1);
    expect(rows[0].category).toBe('drug');
    expect(rows[0].top).toBe(true);
    expect(rows[0].contributionPct).toBeCloseTo(100 / 150);
    expect(rows[1].category).toBe('ward');
    expect(rows[1].top).toBe(false);
    expect(rows[2].category).toBe('lab');
    expect(rows[2].contributionPct).toBe(0);
  });
});
