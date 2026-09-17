/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * qualityStore 测试：质控评分 / 缺陷 / 等级
 */
import { describe, it, expect } from 'vitest';
import { gradeFromScore, useQualityStore } from '@/store/qualityStore';

describe('gradeFromScore 等级判定', () => {
  it('>=90 且无否决项为 A', () => {
    expect(gradeFromScore(95, [])).toBe('A');
    expect(gradeFromScore(90, [])).toBe('A');
  });

  it('75-89 为 B', () => {
    expect(gradeFromScore(85, [])).toBe('B');
    expect(gradeFromScore(75, [])).toBe('B');
  });

  it('<75 为 C', () => {
    expect(gradeFromScore(60, [])).toBe('C');
  });

  it('有否决项直接为 C', () => {
    expect(gradeFromScore(95, ['缺知情同意书'])).toBe('C');
  });
});

describe('qualityStore 评分计算', () => {
  it('addDefect 后 recalcScore 自动扣分', async () => {
    // 先加载一个有结果的记录
    await useQualityStore.getState().startQualityCheck('R20260916001');
    const before = useQualityStore.getState().qualityResult?.score;
    expect(before).toBeDefined();

    await useQualityStore.getState().addDefect({
      defectId: 'd-test',
      ruleCode: 'rule-1',
      type: 'integrity',
      level: 'major',
      description: '主诉栏为空',
      deduction: 5,
      location: { section: '入院记录', anchor: '主诉栏为空', startOffset: 0, endOffset: 6 },
      suggestion: '补充主诉',
      aiSuggested: true,
      aiAction: 'adopted',
    });

    const after = useQualityStore.getState().qualityResult?.score;
    expect(after).toBe((before ?? 100) - 5);
  });

  it('removeDefect 后分数恢复', async () => {
    await useQualityStore.getState().startQualityCheck('R20260916002');
    await useQualityStore.getState().addDefect({
      defectId: 'd-test-2',
      ruleCode: 'rule-1',
      type: 'integrity',
      level: 'minor',
      description: '',
      deduction: 3,
      location: { section: '病程', anchor: '', startOffset: 0, endOffset: 0 },
      suggestion: '',
      aiSuggested: false,
      aiAction: 'adopted',
    });
    const afterAdd = useQualityStore.getState().qualityResult?.score;
    await useQualityStore.getState().removeDefect('d-test-2');
    const afterRemove = useQualityStore.getState().qualityResult?.score;
    expect(afterRemove).toBe((afterAdd ?? 100) + 3);
  });
});
