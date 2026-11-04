/**
 * 健澜AI原生医院操作系统OS - P0-1 门诊挂号交易闭环单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterEach, describe, expect, it } from 'bun:test';
import {
  OutpatientRegisterTradeError,
  __resetStore,
  approveCancel,
  listQueue,
  register,
  releaseSlot,
  reserveSlot,
  requestCancel,
  transition,
} from '../../src/bff/aggregators/outpatientRegisterTradeAggregator';
import { outpatientRegisterTradeRoutes } from '../../src/bff/routes/outpatientRegisterTrade';

afterEach(() => __resetStore());

describe('P0-1 号源预占与释放', () => {
  it('同一 slotId 并发预占第二次 → 抛 409 号源已被占用', () => {
    reserveSlot({ slotId: 'SLOT-001', patientId: 'P001', patientName: '张某某' });
    expect(() =>
      reserveSlot({ slotId: 'SLOT-001', patientId: 'P002', patientName: '李某某' }),
    ).toThrowError(/号源已被占用/);
    try {
      reserveSlot({ slotId: 'SLOT-001', patientId: 'P002', patientName: '李某某' });
    } catch (e) {
      expect(e).toBeInstanceOf(OutpatientRegisterTradeError);
      expect((e as OutpatientRegisterTradeError).status).toBe(409);
    }
  });

  it('超时释放：ttl=1s，now 推进到过期后再次预占成功', () => {
    const t0 = 1_000_000;
    const r1 = reserveSlot({
      slotId: 'SLOT-002', patientId: 'P001', patientName: '王某某',
      ttlSeconds: 1, now: t0,
    });
    // 未过期再预占 → 409
    expect(() =>
      reserveSlot({ slotId: 'SLOT-002', patientId: 'P002', patientName: '李某某', now: t0 + 500 }),
    ).toThrowError(/号源已被占用/);
    // 过期后再预占 → 成功（sweepExpired 惰性释放）
    const r2 = reserveSlot({
      slotId: 'SLOT-002', patientId: 'P002', patientName: '李某某',
      ttlSeconds: 1, now: t0 + 2000,
    });
    expect(r2.reservationId).not.toBe(r1.reservationId);
    expect(r2.slotId).toBe('SLOT-002');
  });

  it('releaseSlot：不存在 → 404；正常释放后号源可再占', () => {
    expect(() => releaseSlot('RSV-not-exist', 1_000_000)).toThrowError(/预占不存在/);
    const r = reserveSlot({
      slotId: 'SLOT-003', patientId: 'P001', patientName: '张某某', now: 1_000_000,
    });
    releaseSlot(r.reservationId, 1_000_100);
    // 释放后可再占
    const r2 = reserveSlot({
      slotId: 'SLOT-003', patientId: 'P009', patientName: '李某某', now: 1_000_200,
    });
    expect(r2.reservationId).not.toBe(r.reservationId);
  });
});

describe('P0-1 正式挂号', () => {
  it('预占不存在 → 409 预占无效或已过期', () => {
    expect(() =>
      register({ reservationId: 'RSV-not-exist', feeCents: 1500, now: 1_000_000 }),
    ).toThrowError(/预占无效或已过期/);
  });

  it('feeCents=12.5 → 400 金额必须为整数分；负数 → 400', () => {
    const r = reserveSlot({
      slotId: 'SLOT-010', patientId: 'P001', patientName: '张某某', now: 1_000_000,
    });
    expect(() =>
      register({ reservationId: r.reservationId, feeCents: 12.5, now: 1_000_100 }),
    ).toThrowError(/金额必须为整数分/);
    // 负金额也拒
    const r2 = reserveSlot({
      slotId: 'SLOT-011', patientId: 'P002', patientName: '李某某', now: 1_000_000,
    });
    expect(() =>
      register({ reservationId: r2.reservationId, feeCents: -100, now: 1_000_100 }),
    ).toThrowError(/金额必须为整数分/);
  });

  it('正常挂号成功：feeCents 保持整数，status=registered，regNo 前缀 RG-T-', () => {
    const r = reserveSlot({
      slotId: 'SLOT-020', patientId: 'P001', patientName: '张某某', now: 1_000_000,
    });
    const rec = register({
      reservationId: r.reservationId, feeCents: 1500, paymentMethod: 'wechat', now: 1_000_100,
    });
    expect(Number.isInteger(rec.feeCents)).toBe(true);
    expect(rec.feeCents).toBe(1500);
    expect(rec.status).toBe('registered');
    expect(rec.regNo).toMatch(/^RG-T-\d+$/);
    expect(rec.patientName).toBe('张某某');
  });
});

describe('P0-1 退号申请与审批', () => {
  function setupRegistered() {
    const r = reserveSlot({ slotId: 'SLOT-030', patientId: 'P001', patientName: '王某某', now: 1_000_000 });
    return register({ reservationId: r.reservationId, feeCents: 2000, now: 1_000_100 });
  }

  it('非 registered/called 状态申请退号 → 409', () => {
    const rec = setupRegistered();
    transition({ regNo: rec.regNo, action: 'call', now: 1_000_200 });
    transition({ regNo: rec.regNo, action: 'start', now: 1_000_300 });
    transition({ regNo: rec.regNo, action: 'complete', now: 1_000_400 });
    expect(() =>
      requestCancel({ regNo: rec.regNo, reason: '个人原因', now: 1_000_500 }),
    ).toThrowError(/当前状态不可退号/);
  });

  it('审批通过 → cancelled 且 refundCents === feeCents（整数分全额退）', () => {
    const rec = setupRegistered();
    requestCancel({ regNo: rec.regNo, reason: '挂号后临时有事', now: 1_000_200 });
    const approved = approveCancel({
      regNo: rec.regNo, approved: true, approverNote: '同意退号', now: 1_000_300,
    });
    expect(approved.status).toBe('cancelled');
    expect(approved.refundCents).toBe(rec.feeCents);
    expect(Number.isInteger(approved.refundCents ?? NaN)).toBe(true);
  });

  it('审批驳回 → 回 registered 且记录驳回意见', () => {
    const rec = setupRegistered();
    requestCancel({ regNo: rec.regNo, reason: '误操作', now: 1_000_200 });
    const rejected = approveCancel({
      regNo: rec.regNo, approved: false, approverNote: '已候诊过号不予退号', now: 1_000_300,
    });
    expect(rejected.status).toBe('registered');
    expect(rejected.approved).toBe(false);
    expect(rejected.approverNote).toContain('不予退号');
  });

  it('非 cancel_requested 状态审批 → 409', () => {
    const rec = setupRegistered();
    expect(() =>
      approveCancel({ regNo: rec.regNo, approved: true, now: 1_000_200 }),
    ).toThrowError(/当前状态不可审批/);
  });
});

describe('P0-1 叫号状态机', () => {
  let slotSeq = 0;
  function setupRegistered() {
    const sid = `SLOT-04${++slotSeq}`;
    const r = reserveSlot({ slotId: sid, patientId: 'P001', patientName: '张某某', now: 1_000_000 });
    return register({ reservationId: r.reservationId, feeCents: 1500, now: 1_000_100 });
  }

  it('registered 直接 complete → 409 非法状态跃迁', () => {
    const rec = setupRegistered();
    expect(() =>
      transition({ regNo: rec.regNo, action: 'complete', now: 1_000_200 }),
    ).toThrowError(/非法状态跃迁/);
    try {
      transition({ regNo: rec.regNo, action: 'complete', now: 1_000_200 });
    } catch (e) {
      expect((e as OutpatientRegisterTradeError).status).toBe(409);
    }
  });

  it('合法链 call→start→complete 全通', () => {
    const rec = setupRegistered();
    const c = transition({ regNo: rec.regNo, action: 'call', now: 1_000_200 });
    expect(c.status).toBe('called');
    const s = transition({ regNo: rec.regNo, action: 'start', now: 1_000_300 });
    expect(s.status).toBe('in_consultation');
    const d = transition({ regNo: rec.regNo, action: 'complete', now: 1_000_400 });
    expect(d.status).toBe('completed');
  });

  it('skip 从 completed → 409；skip 从 registered → skipped 过号成功', () => {
    const rec = setupRegistered();
    const c = transition({ regNo: rec.regNo, action: 'call', now: 1_000_200 });
    transition({ regNo: rec.regNo, action: 'start', now: 1_000_300 });
    transition({ regNo: rec.regNo, action: 'complete', now: 1_000_400 });
    expect(() =>
      transition({ regNo: rec.regNo, action: 'skip', now: 1_000_500 }),
    ).toThrowError(/非法状态跃迁/);
    // 另开一条：registered → skip 过号
    const rec2 = setupRegistered();
    const sk = transition({ regNo: rec2.regNo, action: 'skip', now: 1_000_200 });
    expect(sk.status).toBe('skipped');
    void c;
  });
});

describe('P0-1 listQueue 分组', () => {
  it('按 waiting/called/in_consultation/completed/skipped/cancel_requested/cancelled 分组', () => {
    const r1 = reserveSlot({ slotId: 'SLOT-050', patientId: 'P001', patientName: '张某某', now: 1 });
    const a = register({ reservationId: r1.reservationId, feeCents: 1000, now: 2 });
    const r2 = reserveSlot({ slotId: 'SLOT-051', patientId: 'P002', patientName: '李某某', now: 1 });
    const b = register({ reservationId: r2.reservationId, feeCents: 1000, now: 2 });
    transition({ regNo: b.regNo, action: 'call', now: 3 });
    const q = listQueue(4);
    expect(q.waiting.map((x) => x.regNo)).toContain(a.regNo);
    expect(q.called.map((x) => x.regNo)).toContain(b.regNo);
    expect(q.completed).toHaveLength(0);
  });
});

describe('P0-1 路由表自检', () => {
  it('8 条路由全部 auth:true，路径前缀 register-trade', () => {
    expect(outpatientRegisterTradeRoutes.length).toBe(8);
    for (const r of outpatientRegisterTradeRoutes) {
      expect(r.path.startsWith('/api/v1/outpatient/register-trade')).toBe(true);
      expect(r.auth).toBe(true);
    }
  });
});
