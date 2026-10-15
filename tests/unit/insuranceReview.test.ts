/**
 * 健澜科技 jlmedaios - 医保结算智能审核纯函数单测（M130-C）
 *
 * 覆盖：
 *  - 医保规则：甲/乙/丙类分类纳入口径、目录匹配（丙类误标目录内）、分类缺失、乙类缺比例；
 *  - 费用计算：总金额 / 统筹纳入基数 / 自费金额 / 自费占比；
 *  - 问题识别：重复收费、超标准收费、自费占比过高；
 *  - 安全降级与「建议级」语义（needManualConfirm 恒 true，不拦截）。
 * 全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  reviewInsuranceSettlement,
  type SettlementItem,
} from '../../src/bff/aggregators/insuranceReviewAggregator';

const drug = (
  itemCode: string,
  itemName: string,
  unitPrice: number,
  quantity: number,
  extra?: Partial<SettlementItem>,
): SettlementItem => ({
  itemCode,
  itemName,
  category: '药品',
  unitPrice,
  quantity,
  billedAt: '2026-10-15T09:00:00',
  inCatalog: true,
  ...extra,
});

describe('医保规则：甲/乙/丙类纳入口径', () => {
  it('甲类药品 100% 纳入统筹基数', () => {
    const r = reviewInsuranceSettlement(
      [drug('A001', '阿莫西林', 10, 2, { drugClass: '甲类' })],
      null,
    );
    expect(r.totalAmount).toBe(20);
    expect(r.insuranceBase).toBe(20);
    expect(r.selfPayAmount).toBe(0);
  });

  it('乙类药品按 (1−先自付比例) 纳入', () => {
    const r = reviewInsuranceSettlement(
      [drug('B002', '某降压药', 50, 1, { drugClass: '乙类', selfPayRatio: 0.2 })],
      null,
    );
    // 金额 50，纳入 50*0.8=40，先自付 10
    expect(r.insuranceBase).toBe(40);
    expect(r.selfPayAmount).toBe(10);
  });

  it('丙类药品全自费，不纳入统筹基数', () => {
    const r = reviewInsuranceSettlement(
      [drug('C003', '某营养针', 200, 1, { drugClass: '丙类', inCatalog: false })],
      null,
    );
    expect(r.insuranceBase).toBe(0);
    expect(r.selfPayAmount).toBe(200);
  });

  it('丙类却标记为目录内 -> 命中目录匹配 drug.bing_in_catalog', () => {
    const r = reviewInsuranceSettlement(
      [drug('C003', '某营养针', 200, 1, { drugClass: '丙类', inCatalog: true })],
      null,
    );
    const hit = r.issues.find((i) => i.rule === 'drug.bing_in_catalog');
    expect(hit?.severity).toBe('medium');
    expect(hit?.detail).toContain('丙类');
  });

  it('药品未标注甲乙丙分类 -> 命中 drug.class_missing，暂按全自费', () => {
    const r = reviewInsuranceSettlement(
      [drug('D004', '某新药', 30, 1, { inCatalog: true })],
      null,
    );
    const hit = r.issues.find((i) => i.rule === 'drug.class_missing');
    expect(hit?.severity).toBe('low');
    expect(r.insuranceBase).toBe(0);
  });

  it('乙类缺先自付比例 -> 命中 drug.yi_ratio_missing，按默认 10% 测算', () => {
    const r = reviewInsuranceSettlement(
      [drug('B005', '某乙类药', 100, 1, { drugClass: '乙类' })],
      null,
    );
    expect(r.issues.some((i) => i.rule === 'drug.yi_ratio_missing')).toBe(true);
    // 默认先自付 10% -> 纳入 90
    expect(r.insuranceBase).toBe(90);
  });
});

describe('费用计算', () => {
  it('混合明细：总金额 / 统筹基数 / 自费金额 / 自费占比', () => {
    const r = reviewInsuranceSettlement(
      [
        drug('A001', '甲类药', 10, 2, { drugClass: '甲类' }), // 20，纳入20
        drug('B002', '乙类药', 50, 1, { drugClass: '乙类', selfPayRatio: 0.2 }), // 50，纳入40
        {
          itemCode: 'X101',
          itemName: '血常规',
          category: '检验',
          unitPrice: 100,
          quantity: 1,
          billedAt: '2026-10-15T09:30:00',
          inCatalog: true,
        }, // 100，纳入100
      ],
      null,
    );
    expect(r.totalAmount).toBe(170);
    expect(r.insuranceBase).toBe(160);
    expect(r.selfPayAmount).toBe(10);
    expect(Math.abs(r.selfPayRatio - 0.0588)).toBeLessThan(1e-9);
    expect(r.issueCount).toBe(0);
    expect(r.maxSeverity).toBe('none');
  });

  it('目录外项目全自费并计入自费占比', () => {
    const r = reviewInsuranceSettlement(
      [
        {
          itemCode: 'Y202',
          itemName: '豪华耗材',
          category: '耗材',
          unitPrice: 320,
          quantity: 2,
          billedAt: '2026-10-15T10:00:00',
          inCatalog: false,
        },
      ],
      null,
    );
    expect(r.totalAmount).toBe(640);
    expect(r.insuranceBase).toBe(0);
    expect(r.selfPayAmount).toBe(640);
  });
});

describe('问题识别', () => {
  it('超标准收费：单价超限价 -> billing.over_standard，统筹按限价封顶', () => {
    const r = reviewInsuranceSettlement(
      [
        {
          itemCode: 'X101',
          itemName: '核磁共振',
          category: '检查',
          unitPrice: 680,
          quantity: 1,
          billedAt: '2026-10-15T10:00:00',
          inCatalog: true,
          standardPrice: 500,
        },
      ],
      null,
    );
    const hit = r.issues.find((i) => i.rule === 'billing.over_standard');
    expect(hit?.severity).toBe('medium');
    expect(hit?.suggestedDeduct).toBe(180);
    // 统筹只纳入限价部分 500
    expect(r.insuranceBase).toBe(500);
    expect(r.selfPayAmount).toBe(180);
  });

  it('重复收费：同项目同日多条 -> billing.duplicate', () => {
    const r = reviewInsuranceSettlement(
      [
        drug('A001', '阿莫西林', 12.5, 1, { drugClass: '甲类', billedAt: '2026-10-15T09:00:00' }),
        drug('A001', '阿莫西林', 12.5, 1, { drugClass: '甲类', billedAt: '2026-10-15T15:00:00' }),
      ],
      null,
    );
    const hit = r.issues.find((i) => i.rule === 'billing.duplicate');
    expect(hit?.severity).toBe('low');
    expect(hit?.detail).toContain('2 条');
  });

  it('自费占比过高 -> selfpay.ratio_high', () => {
    const r = reviewInsuranceSettlement(
      [
        drug('C003', '丙类药', 200, 1, { drugClass: '丙类', inCatalog: false }),
        {
          itemCode: 'Y202',
          itemName: '目录外耗材',
          category: '耗材',
          unitPrice: 640,
          quantity: 1,
          billedAt: '2026-10-15T11:00:00',
          inCatalog: false,
        },
      ],
      null,
    );
    expect(r.selfPayRatio).toBe(1);
    const hit = r.issues.find((i) => i.rule === 'selfpay.ratio_high');
    expect(hit?.severity).toBe('medium');
  });
});

describe('建议级语义与安全降级', () => {
  it('needManualConfirm 恒为 true（结果为建议，人工确认）', () => {
    const r = reviewInsuranceSettlement([drug('A001', '甲类药', 10, 1, { drugClass: '甲类' })], null);
    expect(r.needManualConfirm).toBe(true);
    // 合规单也带人工确认提示
    expect(r.summary).toContain('人工确认');
  });

  it('空 / 非法输入 -> 零金额空结果，不抛错', () => {
    expect(reviewInsuranceSettlement(null, null).issueCount).toBe(0);
    expect(reviewInsuranceSettlement(undefined, null).totalAmount).toBe(0);
    expect(reviewInsuranceSettlement([], null).summary).toContain('无有效结算明细');
  });

  it('最高严重度取问题中最高级', () => {
    const r = reviewInsuranceSettlement(
      [
        drug('C003', '丙类药误标目录', 200, 1, { drugClass: '丙类', inCatalog: true }), // medium
        drug('A001', '甲类药重复', 10, 1, { drugClass: '甲类', billedAt: '2026-10-15T09:00:00' }),
        drug('A001', '甲类药重复', 10, 1, { drugClass: '甲类', billedAt: '2026-10-15T10:00:00' }), // low
      ],
      null,
    );
    expect(r.maxSeverity).toBe('medium');
    expect(r.issueCount).toBeGreaterThanOrEqual(2);
  });
});
