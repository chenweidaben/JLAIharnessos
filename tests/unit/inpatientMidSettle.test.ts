/**
 * 健澜AI原生医院操作系统OS - P0-5 中途结算/一日清单推送 单测
 *
 * 覆盖：中途结算正常 200(type=mid 且 consumedCents 扣减)、items 空 400、cents 非正 400、
 * 行级错配 403、已出院再中途 409、idempotencyKey 幂等、一日清单结构字段、
 * 同日重复推送幂等、错配患者 403、账户不存在 404。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore as resetCpoe,
} from '../../src/bff/aggregators/orderCpoeAggregator';
import {
  __resetStore,
  settleMid,
  settleDischarge,
  pushDailyStatement,
  getAccount,
  InpatientDepositSettleError,
} from '../../src/bff/aggregators/inpatientDepositSettleAggregator';

beforeEach(() => {
  resetCpoe();
  __resetStore();
});

describe('P0-5 中途结算', () => {
  test('正常中途结算 → type=mid 且 consumedCents 累加', () => {
    const before = getAccount('VISIT-A100').consumedCents;
    const r = settleMid({
      visitId: 'VISIT-A100', patientId: 'PT-P001',
      items: [{ name: 'CT平扫', cents: 8000 }], operatorId: 'cashier1',
    });
    expect(r.type).toBe('mid');
    expect(r.settleNo).toMatch(/^MID-/);
    expect(r.totalCents).toBe(8000);
    expect(getAccount('VISIT-A100').consumedCents).toBe(before + 8000);
  });

  test('items 为空 → 400', () => {
    expect(() => settleMid({ visitId: 'VISIT-A100', patientId: 'PT-P001', items: [], operatorId: 'c' })).toThrow(InpatientDepositSettleError);
  });

  test('cents 非正 → 400', () => {
    let status = 0;
    try { settleMid({ visitId: 'VISIT-A100', patientId: 'PT-P001', items: [{ name: 'x', cents: -5 }], operatorId: 'c' }); }
    catch (e) { status = (e as { status: number }).status; }
    expect(status).toBe(400);
  });

  test('行级绑定错配 patientId → 403', () => {
    let status = 0;
    try { settleMid({ visitId: 'VISIT-A100', patientId: 'PT-WRONG', items: [{ name: 'x', cents: 100 }], operatorId: 'c' }); }
    catch (e) { status = (e as { status: number }).status; }
    expect(status).toBe(403);
  });

  test('已出院结算后再中途结算 → 409', () => {
    settleDischarge({ visitId: 'VISIT-A100', operatorId: 'c', items: [{ name: '床位', quantity: 2, unitPriceCents: 5000 }] });
    let status = 0;
    try { settleMid({ visitId: 'VISIT-A100', patientId: 'PT-P001', items: [{ name: 'x', cents: 100 }], operatorId: 'c' }); }
    catch (e) { status = (e as { status: number }).status; }
    expect(status).toBe(409);
  });

  test('幂等键重复 → 返回原单（同一 settleNo，不重复扣款）', () => {
    const k = 'idem-1';
    const before = getAccount('VISIT-A100').consumedCents;
    const r1 = settleMid({ visitId: 'VISIT-A100', patientId: 'PT-P001', items: [{ name: 'x', cents: 300 }], operatorId: 'c', idempotencyKey: k });
    const r2 = settleMid({ visitId: 'VISIT-A100', patientId: 'PT-P001', items: [{ name: 'x', cents: 300 }], operatorId: 'c', idempotencyKey: k });
    expect(r1.settleNo).toBe(r2.settleNo);
    expect(getAccount('VISIT-A100').consumedCents).toBe(before + 300);
  });

  test('账户不存在 → 404', () => {
    let status = 0;
    try { settleMid({ visitId: 'VISIT-NOPE', patientId: 'PT-X', items: [{ name: 'x', cents: 100 }], operatorId: 'c' }); }
    catch (e) { status = (e as { status: number }).status; }
    expect(status).toBe(404);
  });
});

describe('P0-5 一日清单推送', () => {
  test('推送 → 返回 statementNo/items/totalCents/depositBalanceCents/pushedAt', () => {
    settleMid({ visitId: 'VISIT-A100', patientId: 'PT-P001', items: [{ name: '化验', cents: 1200 }], operatorId: 'c' });
    const r = pushDailyStatement({ visitId: 'VISIT-A100', patientId: 'PT-P001', operatorId: 'cashier1' });
    expect(r.statementNo).toMatch(/^DS-/);
    expect(typeof r.totalCents).toBe('number');
    expect(typeof r.depositBalanceCents).toBe('number');
    expect(Array.isArray(r.items)).toBe(true);
    expect(typeof r.pushedAt).toBe('number');
    expect(r.items.some((i) => i.name === '化验')).toBe(true);
  });

  test('同一天重复推送 → 同一 statementNo（幂等）', () => {
    const r1 = pushDailyStatement({ visitId: 'VISIT-A100', patientId: 'PT-P001', statementDate: '2026-11-04', operatorId: 'c' });
    const r2 = pushDailyStatement({ visitId: 'VISIT-A100', patientId: 'PT-P001', statementDate: '2026-11-04', operatorId: 'c' });
    expect(r1.statementNo).toBe(r2.statementNo);
  });

  test('错配患者推送 → 403', () => {
    let status = 0;
    try { pushDailyStatement({ visitId: 'VISIT-A100', patientId: 'PT-WRONG', operatorId: 'c' }); }
    catch (e) { status = (e as { status: number }).status; }
    expect(status).toBe(403);
  });

  test('账户不存在推送 → 404', () => {
    let status = 0;
    try { pushDailyStatement({ visitId: 'VISIT-GONE', patientId: 'PT-X', operatorId: 'c' }); }
    catch (e) { status = (e as { status: number }).status; }
    expect(status).toBe(404);
  });
});
