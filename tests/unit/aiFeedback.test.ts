/**
 * 健澜科技 jlmedaios - M108 诊疗反馈学习闭环单测
 *
 * 验证「医生反馈积累 -> 推荐权重变化」的闭环：
 *  - 无历史时中性权重 1.0；
 *  - 某类建议被多次拒绝 -> 权重逐次下降（降权）；
 *  - 某类建议被多次采纳 -> 权重逐次上升（升权）；
 *  - 修改后采纳按半权正向计入；
 *  - aggregateByType 正确分桶统计并折算权重。
 * 全部为纯函数断言，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  aggregateByType,
  computeWeight,
  DEFAULT_WEIGHT,
  MAX_WEIGHT,
  MIN_WEIGHT,
  scoreSuggestion,
  type Feedback,
} from '../../src/bff/aggregators/aiFeedbackAggregator';

const fb = (suggestionType: string, doctorDecision: Feedback['doctorDecision']): Feedback => ({
  suggestionType,
  doctorDecision,
});

describe('M108 反馈学习闭环', () => {
  it('无任何历史反馈：该类型权重为中性默认值 1.0', () => {
    expect(scoreSuggestion([], { suggestionType: 'drug' })).toBe(DEFAULT_WEIGHT);
    expect(aggregateByType([])).toEqual({});
  });

  it('闭环：同一类型被连续多次拒绝，权重逐次下降并最终触及下限', () => {
    const history: Feedback[] = [];
    const w0 = scoreSuggestion(history, { suggestionType: 'diagnosis' });
    expect(w0).toBe(1.0);

    // 医生连续 4 次拒绝同一类建议
    history.push(fb('diagnosis', 'rejected'));
    const w1 = scoreSuggestion(history, { suggestionType: 'diagnosis' });
    history.push(fb('diagnosis', 'rejected'));
    const w2 = scoreSuggestion(history, { suggestionType: 'diagnosis' });
    history.push(fb('diagnosis', 'rejected'));
    const w3 = scoreSuggestion(history, { suggestionType: 'diagnosis' });

    // 单调降权
    expect(w1).toBeLessThan(w0);
    expect(w2).toBeLessThan(w1);
    expect(w3).toBeLessThan(w2);
    // 每次拒绝 -0.3：1.0 -> 0.7 -> 0.4 -> 0.1（第三次已触下限）
    expect(w1).toBe(0.7);
    expect(w2).toBe(0.4);
    expect(w3).toBe(MIN_WEIGHT);

    // 再多拒绝也不会跌破下限
    history.push(fb('diagnosis', 'rejected'));
    expect(scoreSuggestion(history, { suggestionType: 'diagnosis' })).toBe(MIN_WEIGHT);
  });

  it('闭环：同一类型被连续多次采纳，权重逐次上升并最终触及上限', () => {
    const history: Feedback[] = [];
    const w0 = scoreSuggestion(history, { suggestionType: 'pathway' });

    history.push(fb('pathway', 'adopted'));
    const w1 = scoreSuggestion(history, { suggestionType: 'pathway' });
    history.push(fb('pathway', 'adopted'));
    const w2 = scoreSuggestion(history, { suggestionType: 'pathway' });
    history.push(fb('pathway', 'adopted'));
    history.push(fb('pathway', 'adopted'));
    history.push(fb('pathway', 'adopted'));
    const w5 = scoreSuggestion(history, { suggestionType: 'pathway' });

    expect(w1).toBeGreaterThan(w0);
    expect(w2).toBeGreaterThan(w1);
    // 每次采纳 +0.2：1.0 -> 1.2 -> 1.4；5 次后 1.0+1.0=2.0 触顶
    expect(w1).toBe(1.2);
    expect(w2).toBe(1.4);
    expect(w5).toBe(MAX_WEIGHT);
  });

  it('修改后采纳按半权正向计入（弱于直接采纳）', () => {
    const adoptedOnly = aggregateByType([fb('drug', 'adopted')]);
    const modifiedOnly = aggregateByType([fb('drug', 'modified')]);
    expect(adoptedOnly.drug.weight).toBe(1.2);
    expect(modifiedOnly.drug.weight).toBe(1.1);
    expect(modifiedOnly.drug.weight).toBeLessThan(adoptedOnly.drug.weight);
  });

  it('aggregateByType：分桶统计 + 权重折算互不串扰', () => {
    const history: Feedback[] = [
      fb('diagnosis', 'adopted'),
      fb('diagnosis', 'adopted'),
      fb('diagnosis', 'rejected'),
      fb('drug', 'rejected'),
      fb('drug', 'modified'),
    ];
    const stats = aggregateByType(history);

    expect(stats.diagnosis).toEqual({
      adopted: 2,
      modified: 0,
      rejected: 1,
      // 1.0 + 0.4 - 0.3 = 1.1
      weight: 1.1,
    });
    expect(stats.drug).toEqual({
      adopted: 0,
      modified: 1,
      rejected: 1,
      // 1.0 + 0.1 - 0.3 = 0.8
      weight: 0.8,
    });
  });

  it('跨类型隔离：A 类型被降权不影响 B 类型的中性权重', () => {
    const history: Feedback[] = [
      fb('lab_interpret', 'rejected'),
      fb('lab_interpret', 'rejected'),
    ];
    expect(scoreSuggestion(history, { suggestionType: 'lab_interpret' })).toBe(0.4);
    expect(scoreSuggestion(history, { suggestionType: 'voice' })).toBe(DEFAULT_WEIGHT);
  });

  it('computeWeight 边界：权重被正确截断到 [0.1, 2.0]', () => {
    expect(computeWeight(0, 0, 100)).toBe(MIN_WEIGHT);
    expect(computeWeight(100, 100, 0)).toBe(MAX_WEIGHT);
  });
});
