/**
 * 健澜科技 jlmedaios - 转诊协同知识沉淀纯函数单测（依据宪法第三章）
 *
 * 不依赖数据库/BFF：直接测 buildReferralKnowledge 与 recommendBestDept 纯函数。
 *   1) 知识聚合：按 (referralReason, fromDept, toDept) 归并分组；
 *   2) 成功率计算：successRate = 成功结案数 / 已结案总数；avgDays 为结案耗时均值；
 *   3) 推荐排序：按转诊原因筛出模式，跨转出科室加权后按成功率降序、耗时升序。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildReferralKnowledge,
  recommendBestDept,
  rankDeptRecommendations,
  type ReferralOutcome,
  type ReferralRecord,
} from '../../src/bff/aggregators/referralKnowledgeAggregator';

const rq = (
  fromDept: string,
  toDept: string,
  referralReason: string,
): ReferralRecord => ({ fromDept, toDept, referralReason });

const oc = (
  fromDept: string,
  toDept: string,
  referralReason: string,
  success: boolean,
  days: number,
): ReferralOutcome => ({ fromDept, toDept, referralReason, success, days });

describe('buildReferralKnowledge', () => {
  it('空输入 -> 空模式列表', () => {
    expect(buildReferralKnowledge([], [])).toEqual([]);
  });

  it('知识聚合：按 (referralReason, fromDept, toDept) 归并分组，同组合并、异组拆分', () => {
    const patterns = buildReferralKnowledge(
      [
        rq('全科医学科', '心血管内科', '胸痛待查'),
        rq('急诊科', '心血管内科', '胸痛待查'),
        rq('全科医学科', '消化内科', '腹痛待查'),
      ],
      [
        oc('全科医学科', '心血管内科', '胸痛待查', true, 2),
        oc('急诊科', '心血管内科', '胸痛待查', true, 3),
        oc('全科医学科', '消化内科', '腹痛待查', true, 4),
      ],
    );
    // 三个 (原因, 转出, 转往) 组合 -> 三行
    expect(patterns).toHaveLength(3);
    const cardio = patterns.find(
      (p) => p.referralReason === '胸痛待查' && p.fromDept === '急诊科',
    )!;
    expect(cardio.toDept).toBe('心血管内科');
    expect(cardio.total).toBe(1);
  });

  it('成功率计算：successRate = 成功结案数 / 已结案总数；avgDays 为耗时均值', () => {
    const patterns = buildReferralKnowledge(
      [rq('全科医学科', '心血管内科', '胸痛待查')],
      [
        oc('全科医学科', '心血管内科', '胸痛待查', true, 2),
        oc('全科医学科', '心血管内科', '胸痛待查', true, 4),
        oc('全科医学科', '心血管内科', '胸痛待查', false, 6),
      ],
    );
    expect(patterns).toHaveLength(1);
    // 3 结案 2 成功 -> 0.6667
    expect(patterns[0].successRate).toBe(0.6667);
    // 平均耗时 (2+4+6)/3 = 4 天
    expect(patterns[0].avgDays).toBe(4);
    expect(patterns[0].total).toBe(3);
  });

  it('仅有请求、尚无结案结局的组合不产生知识行', () => {
    const patterns = buildReferralKnowledge(
      [rq('全科医学科', '消化内科', '腹痛待查')],
      // 腹痛待查尚无结案
      [oc('全科医学科', '心血管内科', '胸痛待查', true, 2)],
    );
    // 只有胸痛待查有结案 -> 一行
    expect(patterns).toHaveLength(1);
    expect(patterns[0].referralReason).toBe('胸痛待查');
  });

  it('输出按 successRate 降序、avgDays 升序排列', () => {
    const patterns = buildReferralKnowledge(
      [
        rq('全科医学科', '呼吸与危重症医学科', '胸痛待查'),
        rq('全科医学科', '心血管内科', '胸痛待查'),
      ],
      [
        oc('全科医学科', '呼吸与危重症医学科', '胸痛待查', false, 5),
        oc('全科医学科', '心血管内科', '胸痛待查', true, 2),
        oc('全科医学科', '心血管内科', '胸痛待查', true, 4),
      ],
    );
    // 心血管内科 2/2=1.0 > 呼吸 0/1=0
    expect(patterns[0].toDept).toBe('心血管内科');
    expect(patterns[0].successRate).toBeGreaterThan(patterns[1].successRate);
  });
});

describe('recommendBestDept', () => {
  const patterns = buildReferralKnowledge(
    [
      rq('全科医学科', '心血管内科', '胸痛待查'),
      rq('急诊科', '心血管内科', '胸痛待查'),
      rq('全科医学科', '呼吸与危重症医学科', '胸痛待查'),
      rq('全科医学科', '消化内科', '腹痛待查'),
    ],
    [
      oc('全科医学科', '心血管内科', '胸痛待查', true, 2),
      oc('急诊科', '心血管内科', '胸痛待查', true, 3),
      oc('全科医学科', '心血管内科', '胸痛待查', true, 2),
      oc('全科医学科', '呼吸与危重症医学科', '胸痛待查', false, 5),
      oc('全科医学科', '呼吸与危重症医学科', '胸痛待查', false, 6),
      oc('全科医学科', '消化内科', '腹痛待查', true, 4),
    ],
  );

  it('推荐排序：跨转出科室按 toDept 聚合，成功率高者排前', () => {
    const depts = recommendBestDept(patterns, '胸痛待查');
    // 心血管内科 3/3=1.0、平均 2.33 天；呼吸 0/2=0、平均 5.5 天
    expect(depts).toEqual(['心血管内科', '呼吸与危重症医学科']);
  });

  it('推荐明细携带加权成功率与平均耗时', () => {
    const recs = rankDeptRecommendations(patterns, '胸痛待查');
    expect(recs).toHaveLength(2);
    expect(recs[0].dept).toBe('心血管内科');
    expect(recs[0].successRate).toBe(1);
    // (2+3+2)/3 ≈ 2.33 天
    expect(recs[0].avgDays).toBe(2.33);
    expect(recs[0].total).toBe(3);
  });

  it('只返回命中转诊原因的科室，不串入其他原因', () => {
    const depts = recommendBestDept(patterns, '腹痛待查');
    expect(depts).toEqual(['消化内科']);
  });

  it('无历史沉淀时返回空数组，不抛错', () => {
    expect(recommendBestDept(patterns, '头痛待查')).toEqual([]);
    expect(() => recommendBestDept([], '胸痛待查')).not.toThrow();
  });
});
