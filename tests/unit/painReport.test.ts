/**
 * 健澜科技 jlmedaios - 疼痛管理纯函数单测（M222-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessPainScore,
  buildPainReport,
  designAnalgesiaPlan,
} from '../../src/bff/aggregators/painReportAggregator';

describe('assessPainScore', () => {
  it('评分8 NRS → 重度', () => {
    expect(assessPainScore(8, 'NRS').level).toBe('重度');
  });

  it('评分2 NRS → 轻度 已控制', () => {
    const r = assessPainScore(2, 'NRS');
    expect(r.controlled).toBe(true);
  });
});

describe('designAnalgesiaPlan', () => {
  it('重度7分 → 第三阶梯 PCA', () => {
    const r = designAnalgesiaPlan('术后', 7);
    expect(r.ladder).toBe('第三阶梯');
  });

  it('神经病理性 5分 → 神经阻滞', () => {
    expect(designAnalgesiaPlan('神经病理性', 5).method).toBe('神经阻滞');
  });
});

describe('buildPainReport', () => {
  it('生成评估数据', () => {
    const r = buildPainReport('30d');
    expect(r.assessment.nrs).toBeGreaterThan(0);
  });

  it('生成急性疼痛数据', () => {
    const r = buildPainReport('30d');
    expect(r.acute.postoperative).toBeGreaterThan(0);
  });

  it('生成癌痛数据', () => {
    const r = buildPainReport('30d');
    expect(r.cancer.threeLadder).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildPainReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
