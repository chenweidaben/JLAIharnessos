/**
 * 健澜AI原生医院操作系统OS - P0-5 住院押金 / 出院结算交易单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterEach, describe, expect, it } from 'bun:test';
import {
  InpatientDepositSettleError,
  __resetStore,
  payDeposit,
  assessDepositWarning,
  settleDischarge,
  getAccount,
  listDeposits,
  listSettlements,
} from '../../src/bff/aggregators/inpatientDepositSettleAggregator';
import { inpatientDepositSettleTradeRoutes } from '../../src/bff/routes/inpatientDepositSettleTrade';

afterEach(() => __resetStore());

/** 测试内注入的固定 now（仅用于 payDeposit/settleDischarge 的时间戳留痕断言，与 seed 滚动 admissionAt 无关）。 */
const T0 = 1_700_000_000_000;

describe('P0-5 预交金缴纳', () => {
  it('amountCents=10.5（非整数）-> 400 预交金必须为正整数分', () => {
    try {
      payDeposit({ visitId: 'VISIT-A100', amountCents: 10.5, payMethod: 'cash', operatorId: 'CASH-001' });
      throw new Error('应当抛错');
    } catch (e) {
      expect(e).toBeInstanceOf(InpatientDepositSettleError);
      expect((e as InpatientDepositSettleError).status).toBe(400);
      expect((e as Error).message).toContain('预交金必须为正整数分');
    }
  });

  it('amountCents=0 -> 400', () => {
    expect(() =>
      payDeposit({ visitId: 'VISIT-A100', amountCents: 0, payMethod: 'cash', operatorId: 'CASH-001' }),
    ).toThrowError(/预交金必须为正整数分/);
  });

  it('amountCents=-100 -> 400', () => {
    expect(() =>
      payDeposit({ visitId: 'VISIT-A100', amountCents: -100, payMethod: 'cash', operatorId: 'CASH-001' }),
    ).toThrowError(/预交金必须为正整数分/);
  });

  it('payMethod 非法 -> 400', () => {
    expect(() =>
      payDeposit({ visitId: 'VISIT-A100', amountCents: 10000, payMethod: 'bitcoin', operatorId: 'CASH-001' }),
    ).toThrowError(/支付方式必须为/);
  });

  it('visitId 不存在 -> 404', () => {
    try {
      payDeposit({ visitId: 'VISIT-NOPE', amountCents: 10000, payMethod: 'cash', operatorId: 'CASH-001' });
      throw new Error('应当抛错');
    } catch (e) {
      expect(e).toBeInstanceOf(InpatientDepositSettleError);
      expect((e as InpatientDepositSettleError).status).toBe(404);
    }
  });

  it('已结算账户缴纳 -> 409 当前住院状态不可缴纳预交金', () => {
    // 先把 VISIT-A100 结算掉
    settleDischarge({
      visitId: 'VISIT-A100', operatorId: 'CASH-001',
      items: [{ name: '床位费', quantity: 5, unitPriceCents: 5000 }],
      now: T0,
    });
    expect(() =>
      payDeposit({ visitId: 'VISIT-A100', amountCents: 10000, payMethod: 'cash', operatorId: 'CASH-001' }),
    ).toThrowError(/当前住院状态不可缴纳预交金/);
  });

  it('正常缴纳 -> depositNo 生成，depositCents 累加，balanceCents 整数正确', () => {
    const before = getAccount('VISIT-A100');
    expect(before.depositCents).toBe(500_000);
    const rec = payDeposit({
      visitId: 'VISIT-A100', amountCents: 20_000, payMethod: 'wechat',
      operatorId: 'CASH-001', now: T0 + 60_000,
    });
    expect(rec.depositNo).toBe('DEP-VISIT-A100-1');
    expect(rec.amountCents).toBe(20_000);
    expect(rec.payMethod).toBe('wechat');
    // depositCents 累加：500000 + 20000 = 520000
    expect(rec.depositCents).toBe(520_000);
    // balanceCents = depositCents - consumedCents = 520000 - 50000 = 470000
    expect(rec.balanceCents).toBe(470_000);
    expect(Number.isInteger(rec.balanceCents)).toBe(true);
    const after = getAccount('VISIT-A100');
    expect(after.depositCents).toBe(520_000);
  });
});

describe('P0-5 押金不足预警', () => {
  // 说明：seed 的 admissionAt 为滚动基准（模块加载时刻 - N 天），故此处不再注入固定 now=T0，
  // 让其用真实 Date.now() 与滚动 admissionAt 对齐；金额断言仍精确，
  // 天数相关断言改为演示合理区间（住院 3~12 天 -> avgDaily 为正整数、daysCovered 落在 [3,30]）。
  it('VISIT-A100（余额充足）-> level=ok，天数落在合理演示区间', () => {
    const w = assessDepositWarning({ visitId: 'VISIT-A100' });
    expect(w.level).toBe('ok');
    expect(w.balanceCents).toBe(450_000);
    // avgDailyCostCents 必须为正整数分（住院天数非负、已消耗非负）
    expect(Number.isInteger(w.avgDailyCostCents)).toBe(true);
    expect(w.avgDailyCostCents).toBeGreaterThan(0);
    expect(w.avgDailyCostCents).toBeLessThan(100_000);
    // 住院 3~4 天（ceil 边界会 +1）、余额 4500 元 -> 可覆盖天数应在数十天量级，
    // 绝不允许出现 20000+ 这种"住院 56 年"的失真值；上界 60 仍比失真值小两个数量级。
    expect(w.daysCovered).toBeGreaterThanOrEqual(3);
    expect(w.daysCovered).toBeLessThanOrEqual(60);
  });

  it('VISIT-B200（余额低于阈值）-> level=warn', () => {
    const w = assessDepositWarning({ visitId: 'VISIT-B200' });
    expect(w.level).toBe('warn');
    expect(w.balanceCents).toBe(70_000);
    expect(w.thresholdCents).toBe(100_000);
  });

  it('VISIT-C300（余额透支）-> level=critical', () => {
    const w = assessDepositWarning({ visitId: 'VISIT-C300' });
    expect(w.level).toBe('critical');
    expect(w.balanceCents).toBe(-60_000);
  });

  it('thresholdCents 参数生效：A100 提高阈值后从 ok 变为 warn', () => {
    const w = assessDepositWarning({ visitId: 'VISIT-A100', thresholdCents: 1_000_000 });
    // A100 余额 450000 < 阈值 1000000 -> warn
    expect(w.thresholdCents).toBe(1_000_000);
    expect(w.level).toBe('warn');
  });
});

describe('P0-5 出院结算', () => {
  it('items 空数组 -> 400 结算明细不能为空', () => {
    expect(() =>
      settleDischarge({ visitId: 'VISIT-A100', operatorId: 'CASH-001', items: [] }),
    ).toThrowError(/结算明细不能为空/);
  });

  it('quantity=0 -> 400 结算数量必须为正整数', () => {
    expect(() =>
      settleDischarge({
        visitId: 'VISIT-A100', operatorId: 'CASH-001',
        items: [{ name: '床位费', quantity: 0, unitPriceCents: 5000 }],
      }),
    ).toThrowError(/结算数量必须为正整数/);
  });

  it('unitPriceCents=-1 -> 400 单价必须为非负整数分', () => {
    expect(() =>
      settleDischarge({
        visitId: 'VISIT-A100', operatorId: 'CASH-001',
        items: [{ name: '床位费', quantity: 1, unitPriceCents: -1 }],
      }),
    ).toThrowError(/单价必须为非负整数分/);
  });

  it('正常结算 -> totalCents 精确等于 Σ(quantity*unitPriceCents)，整数分', () => {
    const items = [
      { name: '床位费', quantity: 5, unitPriceCents: 5000 },
      { name: '化验费', quantity: 3, unitPriceCents: 1200 },
      { name: '护理费', quantity: 5, unitPriceCents: 800 },
    ];
    const expectedTotal =
      items[0].quantity * items[0].unitPriceCents +
      items[1].quantity * items[1].unitPriceCents +
      items[2].quantity * items[2].unitPriceCents;
    expect(expectedTotal).toBe(5 * 5000 + 3 * 1200 + 5 * 800); // 25000+3600+4000=32600
    expect(Number.isInteger(expectedTotal)).toBe(true);

    const rec = settleDischarge({
      visitId: 'VISIT-A100', operatorId: 'CASH-001', items, now: T0 + 1000,
    });
    expect(rec.settleNo).toMatch(/^ST-VISIT-A100-\d+$/);
    expect(rec.totalCents).toBe(expectedTotal);
    expect(rec.dailyBill.length).toBe(3);
    for (let i = 0; i < items.length; i++) {
      expect(rec.dailyBill[i].amountCents).toBe(items[i].quantity * items[i].unitPriceCents);
    }
  });

  it('押金充足 -> refundCents = depositCents - consumedCents - totalCents', () => {
    // A100: deposit=500000, consumed=50000；结算 total=100000
    // balance = 500000 - 50000 - 100000 = 350000 -> refund
    const rec = settleDischarge({
      visitId: 'VISIT-A100', operatorId: 'CASH-001',
      items: [{ name: '床位费', quantity: 10, unitPriceCents: 10000 }],
      now: T0 + 1000,
    });
    expect(rec.shortfallCents).toBe(0);
    expect(rec.refundCents).toBe(500_000 - 50_000 - 100_000);
    expect(rec.refundCents).toBe(350_000);
    expect(Number.isInteger(rec.refundCents)).toBe(true);
  });

  it('押金不足 -> shortfallCents = -(depositCents - consumedCents - totalCents)', () => {
    // C300: deposit=60000, consumed=120000；结算 total=200000
    // balance = 60000 - 120000 - 200000 = -260000 -> shortfall
    const rec = settleDischarge({
      visitId: 'VISIT-C300', operatorId: 'CASH-001',
      items: [{ name: '手术费', quantity: 1, unitPriceCents: 200_000 }],
      now: T0 + 1000,
    });
    expect(rec.refundCents).toBe(0);
    expect(rec.shortfallCents).toBe(-(60_000 - 120_000 - 200_000));
    expect(rec.shortfallCents).toBe(260_000);
    expect(Number.isInteger(rec.shortfallCents)).toBe(true);
  });

  it('重复结算 -> 409 该住院已结算', () => {
    settleDischarge({
      visitId: 'VISIT-A100', operatorId: 'CASH-001',
      items: [{ name: '床位费', quantity: 1, unitPriceCents: 1000 }],
    });
    expect(() =>
      settleDischarge({
        visitId: 'VISIT-A100', operatorId: 'CASH-001',
        items: [{ name: '再次结算', quantity: 1, unitPriceCents: 1000 }],
      }),
    ).toThrowError(/该住院已结算/);
  });
});

describe('P0-5 列表与路由表自检', () => {
  it('listDeposits/listSettlements 与操作一致', () => {
    expect(listDeposits('VISIT-A100').length).toBe(0);
    payDeposit({ visitId: 'VISIT-A100', amountCents: 10000, payMethod: 'cash', operatorId: 'CASH-001' });
    expect(listDeposits('VISIT-A100').length).toBe(1);
    expect(listDeposits('VISIT-A100')[0].depositNo).toBe('DEP-VISIT-A100-1');
    expect(listSettlements().length).toBe(0);
    settleDischarge({
      visitId: 'VISIT-A100', operatorId: 'CASH-001',
      items: [{ name: '床位费', quantity: 1, unitPriceCents: 1000 }],
    });
    expect(listSettlements().length).toBe(1);
  });

  it('6 条路由全部 auth:true，前缀 /api/v1/inpatient/deposit-settle', () => {
    expect(inpatientDepositSettleTradeRoutes.length).toBe(6);
    for (const r of inpatientDepositSettleTradeRoutes) {
      expect(r.auth).toBe(true);
      expect(r.path.startsWith('/api/v1/inpatient/deposit-settle/')).toBe(true);
      // 不得与既有路径冲突
      expect(r.path).not.toContain('/inpatient-billing-mgmt');
      expect(r.path).not.toContain('/discharge/');
      expect(r.path).not.toContain('/billing/');
    }
  });
});
