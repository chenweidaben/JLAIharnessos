/**
 * 健澜科技 jlmedaios - 经验关联发现聚合器单测（M118-D）
 *
 * 覆盖（依据宪法第七章：仅对脱敏标签做最小必要统计，纯函数测试不连 PostgreSQL）：
 *  - 模式归并：相同 (条件, 结局) 组合合并为一条模式；
 *  - 频次统计：frequency = 组合在全部经验中出现的次数；
 *  - 置信度计算：confidence = P(结局|条件) = 组合频次 / 该条件总条数，两位小数；
 *  - 同条件多结局置信度之和为 1（条件概率归一）；
 *  - 空白标签跳过：condition / outcome 为空串的记录不计入；
 *  - 空数据兜底：null / undefined / 空数组一律 { patterns: [] }，绝不抛错；
 *  - 排序确定性：frequency 降序 → confidence 降序，相同输入两次结果一致。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  discoverExperiencePatterns,
  type ExperienceRecord,
} from '../../src/bff/aggregators/experiencePatternAggregator.js';

describe('discoverExperiencePatterns - 空数据兜底', () => {
  it('null 输入 → { patterns: [] }', () => {
    expect(discoverExperiencePatterns(null)).toEqual({ patterns: [] });
  });

  it('undefined 输入 → { patterns: [] }', () => {
    expect(discoverExperiencePatterns(undefined)).toEqual({ patterns: [] });
  });

  it('空数组输入 → { patterns: [] }', () => {
    expect(discoverExperiencePatterns([])).toEqual({ patterns: [] });
  });
});

describe('discoverExperiencePatterns - 模式归并与频次统计', () => {
  it('相同 (条件, 结局) 组合合并为一条模式，frequency 累计次数', () => {
    const input: ExperienceRecord[] = [
      { condition: '≥75岁卧床', outcome: '跌倒' },
      { condition: '≥75岁卧床', outcome: '跌倒' },
      { condition: '≥75岁卧床', outcome: '跌倒' },
    ];
    const { patterns } = discoverExperiencePatterns(input);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].condition).toBe('≥75岁卧床');
    expect(patterns[0].outcome).toBe('跌倒');
    expect(patterns[0].frequency).toBe(3);
  });

  it('同一条件的不同结局拆成不同模式', () => {
    const input: ExperienceRecord[] = [
      { condition: '术后48h', outcome: '转归良好' },
      { condition: '术后48h', outcome: '谵妄' },
    ];
    const { patterns } = discoverExperiencePatterns(input);
    expect(patterns).toHaveLength(2);
    expect(patterns.every((p) => p.condition === '术后48h')).toBe(true);
    expect(new Set(patterns.map((p) => p.outcome))).toEqual(new Set(['转归良好', '谵妄']));
    expect(patterns.every((p) => p.frequency === 1)).toBe(true);
  });
});

describe('discoverExperiencePatterns - 置信度计算', () => {
  it('confidence = P(结局|条件) = 组合频次 / 该条件总条数（3/4 = 0.75）', () => {
    const input: ExperienceRecord[] = [
      { condition: '≥75岁卧床', outcome: '跌倒' },
      { condition: '≥75岁卧床', outcome: '跌倒' },
      { condition: '≥75岁卧床', outcome: '跌倒' },
      { condition: '≥75岁卧床', outcome: '压疮新发' },
    ];
    const { patterns } = discoverExperiencePatterns(input);
    const fall = patterns.find((p) => p.outcome === '跌倒');
    const ulcer = patterns.find((p) => p.outcome === '压疮新发');
    expect(fall?.confidence).toBe(0.75);
    expect(ulcer?.confidence).toBe(0.25);
  });

  it('不同条件的分母互不影响：条件A的置信度不因条件B的记录而改变', () => {
    const input: ExperienceRecord[] = [
      { condition: '术后48h', outcome: '转归良好' },
      { condition: '术后48h', outcome: '转归良好' },
      { condition: '夜间巡视', outcome: '跌倒' },
    ];
    const { patterns } = discoverExperiencePatterns(input);
    const good = patterns.find((p) => p.condition === '术后48h' && p.outcome === '转归良好');
    const fall = patterns.find((p) => p.condition === '夜间巡视');
    expect(good?.confidence).toBe(1);
    expect(fall?.confidence).toBe(1);
  });

  it('置信度保留两位小数（1/3 → 0.33，2/3 → 0.67）', () => {
    const input: ExperienceRecord[] = [
      { condition: '条件X', outcome: '结局甲' },
      { condition: '条件X', outcome: '结局乙' },
      { condition: '条件X', outcome: '结局乙' },
    ];
    const { patterns } = discoverExperiencePatterns(input);
    const jia = patterns.find((p) => p.outcome === '结局甲');
    const yi = patterns.find((p) => p.outcome === '结局乙');
    expect(jia?.confidence).toBe(0.33);
    expect(yi?.confidence).toBe(0.67);
  });

  it('同一条件下各结局置信度之和归一为 1', () => {
    const input: ExperienceRecord[] = [
      { condition: '条件X', outcome: '结局甲' },
      { condition: '条件X', outcome: '结局乙' },
      { condition: '条件X', outcome: '结局乙' },
      { condition: '条件Y', outcome: '结局丙' },
    ];
    const { patterns } = discoverExperiencePatterns(input);
    const sumX = patterns
      .filter((p) => p.condition === '条件X')
      .reduce((acc, p) => acc + p.confidence, 0);
    expect(sumX).toBe(1);
  });
});

describe('discoverExperiencePatterns - 空白标签与排序', () => {
  it('condition / outcome 为空白的记录跳过，不计入频次与置信度分母', () => {
    const input: ExperienceRecord[] = [
      { condition: '', outcome: '跌倒' },
      { condition: '≥75岁卧床', outcome: '' },
      { condition: '   ', outcome: '跌倒' },
      { condition: '≥75岁卧床', outcome: '跌倒' },
    ];
    const { patterns } = discoverExperiencePatterns(input);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].frequency).toBe(1);
    expect(patterns[0].confidence).toBe(1);
  });

  it('排序确定性：frequency 降序，频次相同时 confidence 降序', () => {
    const input: ExperienceRecord[] = [
      { condition: '低频条件', outcome: '结局甲' },
      { condition: '高频条件', outcome: '结局乙' },
      { condition: '高频条件', outcome: '结局乙' },
    ];
    const { patterns } = discoverExperiencePatterns(input);
    expect(patterns[0].condition).toBe('高频条件');
    expect(patterns[0].frequency).toBe(2);
    expect(patterns[1].condition).toBe('低频条件');
  });

  it('相同输入两次调用结果完全一致（确定性、无副作用）', () => {
    const input: ExperienceRecord[] = [
      { condition: 'A', outcome: 'X' },
      { condition: 'A', outcome: 'Y' },
      { condition: 'A', outcome: 'Y' },
      { condition: 'B', outcome: 'Z' },
    ];
    expect(discoverExperiencePatterns(input)).toEqual(discoverExperiencePatterns(input));
  });
});
