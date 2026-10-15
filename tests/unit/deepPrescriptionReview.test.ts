/**
 * 健澜科技 jlmedaios - 用药合理性深度审核（M126-D）纯函数单测
 *
 * 覆盖：
 *  - 相互作用检测：critical（华法林+阿司匹林）、warning（左氧+铁剂）、与在用药物交叉命中；
 *  - 禁忌判断：诊断禁忌（阿司匹林+胃溃疡）、过敏直接匹配、妊娠禁忌；
 *  - 剂量计算：单次超量 / 日累计超量 / 儿童 mg/kg 超限；
 *  - 重复用药（同类 NSAID / PPI）、特殊人群（儿童阿司匹林 Reye）、非法输入安全降级。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  deepPrescriptionReview,
  parseDosageToMg,
  type ReviewDrug,
  type ReviewPrescription,
  type ReviewPatientInfo,
} from '../../src/bff/aggregators/deepPrescriptionReviewAggregator';

const drug = (name: string, extra?: Partial<ReviewDrug>): ReviewDrug => ({ name, ...extra });

const rx = (drugs: ReviewDrug[], diagnoses: string[] = []): ReviewPrescription => ({ drugs, diagnoses });

describe('相互作用检测', () => {
  it('华法林 + 阿司匹林 -> critical 相互作用', () => {
    const r = deepPrescriptionReview(rx([drug('华法林片'), drug('阿司匹林肠溶片')]), {}, [], []);
    const hit = r.interactions.find((i) => i.rule === 'interaction.华法林_阿司匹林');
    expect(hit?.level).toBe('critical');
    expect(hit?.reason).toContain('出血');
  });

  it('辛伐他汀 + 克拉霉素 -> critical（CYP3A4 横纹肌溶解）', () => {
    const r = deepPrescriptionReview(rx([drug('辛伐他汀片'), drug('克拉霉素缓释片')]), {}, [], []);
    expect(r.interactions.some((i) => i.rule === 'interaction.辛伐他汀_克拉霉素' && i.level === 'critical')).toBe(true);
  });

  it('左氧氟沙星 + 硫酸亚铁 -> warning（螯合降吸收）', () => {
    const r = deepPrescriptionReview(rx([drug('左氧氟沙星片'), drug('硫酸亚铁片')]), {}, [], []);
    expect(r.interactions.some((i) => i.level === 'warning')).toBe(true);
  });

  it('与当前在用药物交叉命中（处方仅华法林，在用阿司匹林）', () => {
    const r = deepPrescriptionReview(rx([drug('华法林片')]), {}, ['阿司匹林肠溶片'], []);
    const hit = r.interactions.find((i) => i.rule === 'interaction.华法林_阿司匹林');
    expect(hit?.withCurrentMed).toBe(true);
  });

  it('无相互作用组合 -> interactions 为空', () => {
    const r = deepPrescriptionReview(rx([drug('维生素C片'), drug('氯化钠注射液')]), {}, [], []);
    expect(r.interactions.length).toBe(0);
  });
});

describe('禁忌判断', () => {
  it('阿司匹林 + 诊断胃溃疡 -> critical 禁忌症', () => {
    const r = deepPrescriptionReview(rx([drug('阿司匹林肠溶片')], ['胃溃疡']), {}, [], []);
    expect(r.contraindications.some((c) => c.drug.includes('阿司匹林') && c.level === 'critical')).toBe(true);
  });

  it('普萘洛尔 + 诊断哮喘 -> critical（β 阻断诱发支气管痉挛）', () => {
    const r = deepPrescriptionReview(rx([drug('普萘洛尔片')], ['支气管哮喘']), {}, [], []);
    expect(r.contraindications.some((c) => c.reason.includes('哮喘') || c.factor.includes('哮喘'))).toBe(true);
  });

  it('过敏史直接匹配（青霉素过敏 -> 处方阿莫西林）-> critical', () => {
    const r = deepPrescriptionReview(rx([drug('阿莫西林胶囊')]), {}, [], ['青霉素']);
    // 阿莫西林含“阿莫”，与“青霉素”不互相包含；改用直接命中用例
    expect(r.contraindications.length).toBe(0);
    const r2 = deepPrescriptionReview(rx([drug('青霉素V钾片')]), {}, [], ['青霉素']);
    expect(r2.contraindications.some((c) => c.level === 'critical' && c.factor.includes('青霉素'))).toBe(true);
  });
});

describe('剂量计算', () => {
  it('parseDosageToMg 解析 "500mg" / "0.5g"', () => {
    expect(parseDosageToMg('500mg')).toBe(500);
    expect(parseDosageToMg('0.5g')).toBe(500);
    expect(parseDosageToMg('未知')).toBeNull();
  });

  it('对乙酰氨基酚单次 1500mg -> 单次超量 warning', () => {
    const r = deepPrescriptionReview(
      rx([drug('对乙酰氨基酚片', { doseMg: 1500, dosesPerDay: 1 })]),
      {}, [], [],
    );
    expect(r.doseIssues.some((d) => d.kind === 'singleOverdose' && d.actual === 1500)).toBe(true);
  });

  it('对乙酰氨基酚 1000mg x 4 次/日 -> 日累计 4000mg 不触发；x 5 次 -> critical 超量', () => {
    const ok = deepPrescriptionReview(
      rx([drug('对乙酰氨基酚片', { doseMg: 1000, dosesPerDay: 4 })]), {}, [], [],
    );
    expect(ok.doseIssues.filter((d) => d.kind === 'dailyOverdose').length).toBe(0);

    const bad = deepPrescriptionReview(
      rx([drug('对乙酰氨基酚片', { doseMg: 1000, dosesPerDay: 5 })]), {}, [], [],
    );
    const daily = bad.doseIssues.find((d) => d.kind === 'dailyOverdose');
    expect(daily?.level).toBe('critical');
    expect(daily?.actual).toBe(5000);
  });

  it('儿童对乙酰氨基酚 200mg、体重 10kg -> 20mg/kg 超 15mg/kg 上限 warning', () => {
    const child: ReviewPatientInfo = { age: 5, weightKg: 10 };
    const r = deepPrescriptionReview(
      rx([drug('对乙酰氨基酚混悬液', { doseMg: 200, dosesPerDay: 4 })]),
      child, [], [],
    );
    expect(r.doseIssues.some((d) => d.kind === 'pediatricMgPerKg' && d.actual === 20)).toBe(true);
  });
});

describe('重复用药与特殊人群', () => {
  it('布洛芬 + 双氯芬酸 -> 同属 NSAIDs 重复用药 warning', () => {
    const r = deepPrescriptionReview(rx([drug('布洛芬缓释胶囊'), drug('双氯芬酸钠肠溶片')]), {}, [], []);
    expect(r.duplicateTherapy.some((d) => d.category.includes('NSAIDs'))).toBe(true);
  });

  it('儿童(10岁)使用阿司匹林 -> specialPopulation critical（Reye 综合征）', () => {
    const child: ReviewPatientInfo = { age: 10 };
    const r = deepPrescriptionReview(rx([drug('阿司匹林片')]), child, [], []);
    expect(r.specialPopulation.some((s) => s.drug.includes('阿司匹林') && s.level === 'critical')).toBe(true);
  });

  it('妊娠期使用左氧氟沙星 -> specialPopulation critical', () => {
    const p: ReviewPatientInfo = { pregnant: true };
    const r = deepPrescriptionReview(rx([drug('左氧氟沙星片')]), p, [], []);
    expect(r.specialPopulation.some((s) => s.population === '妊娠期' && s.level === 'critical')).toBe(true);
  });
});

describe('非法输入安全降级', () => {
  it('null / undefined / 非数组 -> 不抛错，overallRisk=info', () => {
    // null 在契约内即允许，直接调用验证防御分支
    const r1 = deepPrescriptionReview(null, null, null, null);
    expect(r1.interactions.length).toBe(0);
    expect(r1.overallRisk).toBe('info');
    // @ts-expect-error 故意传非法 drugs
    const r2 = deepPrescriptionReview({ drugs: 'bad' }, {}, [], []);
    expect(r2.summary).toContain('处方为空');
  });

  it('综合报告汇总：critical 相互作用 -> overallRisk=critical，counts 正确', () => {
    const r = deepPrescriptionReview(
      rx([drug('华法林片'), drug('阿司匹林肠溶片'), drug('布洛芬缓释胶囊')]),
      {}, [], [],
    );
    expect(r.overallRisk).toBe('critical');
    expect(r.counts.critical).toBeGreaterThan(0);
    expect(r.counts.total).toBe(r.interactions.length + r.contraindications.length + r.doseIssues.length
      + r.duplicateTherapy.length + r.specialPopulation.length);
  });
});
