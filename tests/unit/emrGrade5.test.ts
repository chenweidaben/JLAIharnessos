/**
 * 健澜科技 jlmedaios - 电子病历五级评审八维度闭环自评（M99-A）纯函数单测
 *
 * 覆盖：scoreDimension 完成率折算（空集合 / 全部完成 / 部分完成 / 自定义满分 / 两位小数舍入）；
 *       generateSuggestions 三档建议（<60% 红线 / <80% 提升 / ≥80% 巩固）、未知维度回退、
 *       ratio 越界截断。全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  generateSuggestions, scoreDimension,
} from '../../src/bff/aggregators/emrGrade5Aggregator';

describe('五级评审 scoreDimension 完成率折算口径', () => {
  it('空条款集合 → 0 分、0 完成率、不计分母', () => {
    const r = scoreDimension([]);
    expect(r).toEqual({ score: 0, ratio: 0, achievedCount: 0, totalCount: 0 });
  });

  it('全部达成 → ratio=1、score=满分', () => {
    const r = scoreDimension([{ achieved: true }, { achieved: true }, { achieved: true }]);
    expect(r).toEqual({ score: 100, ratio: 1, achievedCount: 3, totalCount: 3 });
  });

  it('部分达成 → score = 完成率 × 满分，两位小数', () => {
    const r = scoreDimension([
      { achieved: true },
      { achieved: false },
      { achieved: false },
    ]);
    expect(r.achievedCount).toBe(1);
    expect(r.totalCount).toBe(3);
    expect(r.ratio).toBeCloseTo(1 / 3, 10);
    expect(r.score).toBe(33.33); // round(33.333... * 100) / 100
  });

  it('自定义满分：50 分制下完成一半得 25', () => {
    const r = scoreDimension([{ achieved: true }, { achieved: false }], 50);
    expect(r.score).toBe(25);
    expect(r.ratio).toBe(0.5);
  });

  it('全部未达成 → 0 分', () => {
    const r = scoreDimension([{ achieved: false }, { achieved: false }]);
    expect(r.score).toBe(0);
    expect(r.ratio).toBe(0);
  });
});

describe('五级评审 generateSuggestions 整改建议分档', () => {
  it('ratio < 0.6 → 红线整改建议（3 条，含完成率文案）', () => {
    const s = generateSuggestions('interoperability', 0.5);
    expect(s.length).toBe(3);
    expect(s[0]).toContain('互联互通');
    expect(s[0]).toContain('50%');
    expect(s.join('\n')).toContain('红线');
  });

  it('ratio < 0.8 → 定向补短板建议', () => {
    const s = generateSuggestions('data_quality', 0.72);
    expect(s.length).toBe(3);
    expect(s[0]).toContain('数据准确率');
    expect(s[0]).toContain('72%');
    expect(s.join('\n')).toContain('80% 基线');
  });

  it('ratio ≥ 0.8 → 巩固推广建议（2 条）', () => {
    const s = generateSuggestions('information_security', 0.9);
    expect(s.length).toBe(2);
    expect(s[0]).toContain('等保三级');
    expect(s[0]).toContain('90%');
    expect(s.join('\n')).toContain('基线');
  });

  it('ratio 边界：0.6 整 → 提升档；0.8 整 → 巩固档', () => {
    expect(generateSuggestions('medical_quality', 0.6).join('\n')).toContain('80% 基线');
    expect(generateSuggestions('medical_quality', 0.8).join('\n')).toContain('基线');
  });

  it('未知维度编码 → 通用建议文案，不抛错', () => {
    const s = generateSuggestions('unknown_dim', 0.4);
    expect(s.length).toBe(3);
    expect(s[0]).toContain('本维度');
  });

  it('ratio 越界截断：>1 按 1 处理，<0 按 0 处理', () => {
    const high = generateSuggestions('operations', 1.5);
    expect(high[0]).toContain('100%');
    const low = generateSuggestions('operations', -0.2);
    expect(low[0]).toContain('0%');
  });
});
