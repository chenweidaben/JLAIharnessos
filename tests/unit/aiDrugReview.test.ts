/**
 * 健澜科技 jlmedaios - AI 合理用药深度审核 单测（M144-C）「AI核心能力深化」
 *
 * 覆盖：药物相互作用检测 / 禁忌症判断（含过敏史）/ 剂量计算 / 重复用药 /
 *       特殊人群 / 误拦反馈留痕与误拦率统计。纯函数、无 I/O、无 DB。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildFalsePositiveFeedback,
  deepDrugReview,
  getDrugReviewStats,
} from '../../src/bff/aggregators/aiDrugReviewAggregator.js';

describe('M144-C 药物相互作用检测', () => {
  it('华法林+阿司匹林 判为 high 相互作用', () => {
    const r = deepDrugReview('RX-1', 60, 'male', [], [], ['华法林', '阿司匹林']);
    const itx = r.findings.find((f) => f.dimension === 'interaction');
    expect(itx).toBeDefined();
    expect(itx!.level).toBe('high');
    expect(itx!.relatedDrug).toBeTruthy();
    expect(r.overallRisk).toBe('high');
  });

  it('无相互作用的干净组合不产生 interaction 告警', () => {
    const r = deepDrugReview('RX-2', 60, 'male', [], [], ['对乙酰氨基酚']);
    expect(r.findings.filter((f) => f.dimension === 'interaction')).toHaveLength(0);
  });
});

describe('M144-C 禁忌症判断', () => {
  it('阿司匹林 + 胃溃疡 判为 high 禁忌', () => {
    const r = deepDrugReview('RX-3', 60, 'male', [], ['胃溃疡'], ['阿司匹林']);
    const contra = r.findings.filter((f) => f.dimension === 'contraindication');
    expect(contra.length).toBeGreaterThanOrEqual(1);
    expect(contra[0].level).toBe('high');
  });

  it('过敏史直接匹配一律 high（青霉素类）', () => {
    const r = deepDrugReview('RX-4', 60, 'male', ['青霉素'], [], ['青霉素V钾']);
    const allergy = r.findings.find((f) => f.reason.includes('过敏原'));
    expect(allergy).toBeDefined();
    expect(allergy!.level).toBe('high');
  });
});

describe('M144-C 剂量计算', () => {
  it('单次超量 -> medium；日累计超量 -> high', () => {
    const r = deepDrugReview('RX-5', 60, 'male', [], [], [
      { name: '对乙酰氨基酚', doseMg: 1500, dosesPerDay: 3 },
    ]);
    const single = r.findings.find((f) => f.id === 'dose-single:对乙酰氨基酚');
    const daily = r.findings.find((f) => f.id === 'dose-daily:对乙酰氨基酚');
    expect(single?.level).toBe('medium'); // 1500 > 1000
    expect(daily?.level).toBe('high');    // 1500*3=4500 > 4000
  });

  it('常规剂量（500mg tid）不触发剂量告警', () => {
    const r = deepDrugReview('RX-6', 60, 'male', [], [], [
      { name: '对乙酰氨基酚', doseMg: 500, dosesPerDay: 3 },
    ]);
    expect(r.findings.filter((f) => f.dimension === 'dose')).toHaveLength(0);
  });
});

describe('M144-C 重复用药与特殊人群', () => {
  it('布洛芬+阿司匹林同属 NSAIDs -> medium 重复用药', () => {
    const r = deepDrugReview('RX-7', 60, 'male', [], [], ['布洛芬', '阿司匹林']);
    const dup = r.findings.find((f) => f.dimension === 'duplicate');
    expect(dup).toBeDefined();
    expect(dup!.level).toBe('medium');
  });

  it('儿童(<18) 使用阿司匹林 -> high 特殊人群告警', () => {
    const r = deepDrugReview('RX-8', 8, 'male', [], [], ['阿司匹林']);
    const sp = r.findings.find((f) => f.dimension === 'specialPopulation');
    expect(sp).toBeDefined();
    expect(sp!.level).toBe('high');
  });
});

describe('M144-C 误拦反馈留痕与误拦率', () => {
  it('buildFalsePositiveFeedback 生成结构化留痕记录', () => {
    const fb = buildFalsePositiveFeedback('RX-9', 'dose-daily:布洛芬', '剂量录入有误', '张药师');
    expect(fb.type).toBe('false_positive');
    expect(fb.reviewId).toBe('RX-9');
    expect(fb.findingId).toBe('dose-daily:布洛芬');
    expect(fb.operator).toBe('张药师');
  });

  it('getDrugReviewStats 聚合五维分布并计算误拦率', () => {
    const s = getDrugReviewStats('2026-10', [
      {
        overallRisk: 'high',
        findings: [
          { dimension: 'interaction', level: 'high' },
          { dimension: 'dose', level: 'medium' },
        ],
        falsePositiveFeedbacks: [{ findingId: 'dose-daily:x' }],
      },
    ]);
    expect(s.totalReviews).toBe(1);
    expect(s.byLevel.high).toBe(1);
    expect(s.byLevel.medium).toBe(1);
    expect(s.falsePositiveFeedbacks).toBe(1);
    expect(s.falsePositiveRate).toBe(0.5); // 1 条误拦 / 2 条告警
  });

  it('无记录时误拦率为 0，不臆造分母', () => {
    const s = getDrugReviewStats('all', []);
    expect(s.totalReviews).toBe(0);
    expect(s.falsePositiveRate).toBe(0);
  });
});

describe('M144-C 安全降级', () => {
  it('空处方 -> overallRisk none、无告警', () => {
    const r = deepDrugReview('RX-10', 60, 'male', [], [], []);
    expect(r.overallRisk).toBe('none');
    expect(r.counts.total).toBe(0);
  });

  it('非法输入（null/undefined）安全降级不抛错', () => {
    const r = deepDrugReview(null as never, null as never, null as never, null, null, null);
    expect(r.prescriptionId).toBe('UNKNOWN');
    expect(r.findings).toEqual([]);
  });
});
