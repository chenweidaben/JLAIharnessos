/**
 * 健澜AI原生医院操作系统OS - P0-2 医嘱 CPOE 交易单测
 *
 * 覆盖：开立金额校验、审核状态机（含重复审核 409）、执行/停止/撤销状态机、
 * 成套医嘱原子性（任一非法零落库）、执行单生成与幂等、三级权限分级。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterEach, describe, expect, it } from 'bun:test';
import {
  OrderCpoeError,
  __resetStore,
  assertCan,
  createOrder,
  reviewOrder,
  executeOrder,
  stopOrder,
  cancelOrder,
  createOrderSet,
  buildExecutionSlip,
  listOrders,
  listSlips,
} from '../../src/bff/aggregators/orderCpoeAggregator';

afterEach(() => __resetStore());

function mkActor(roles: string[] = [], permissions: string[] = []) {
  return { roles, permissions };
}

function expectStatus(err: unknown, status: number): OrderCpoeError {
  const e = err as OrderCpoeError;
  expect(e).toBeInstanceOf(OrderCpoeError);
  expect(e.status).toBe(status);
  return e;
}

describe('P0-2 开立医嘱', () => {
  it('feeCents=1.5（非整数）-> 400 金额必须为非负整数分', () => {
    try {
      createOrder({ visitId: 'VISIT-A100', orderType: 'medication', content: 'X', feeCents: 1.5, orderedBy: 'doc1' });
      throw new Error('应当抛错');
    } catch (e) {
      expectStatus(e, 400);
      expect((e as Error).message).toContain('非负整数分');
    }
  });

  it('feeCents=-1 -> 400', () => {
    expect(() =>
      createOrder({ visitId: 'VISIT-A100', orderType: 'medication', content: 'X', feeCents: -1, orderedBy: 'doc1' }),
    ).toThrowError(/非负整数分/);
  });

  it('正常开立 -> pending_review，orderId 形如 ORD-CO-N', () => {
    const o = createOrder({ visitId: 'VISIT-A100', orderType: 'medication', content: '补液', feeCents: 100, orderedBy: 'doc1', orderedByName: '王医生' });
    expect(o.orderId).toMatch(/^ORD-CO-\d+$/);
    expect(o.status).toBe('pending_review');
    expect(o.patientName).toBe('张某某');
  });

  it('content 缺失 -> 400', () => {
    expect(() =>
      createOrder({ visitId: 'VISIT-A100', orderType: 'medication', content: '', feeCents: 100, orderedBy: 'doc1' }),
    ).toThrowError(/医嘱内容必填/);
  });
});

describe('P0-2 护士/药师审核状态机', () => {
  it('approve -> approved 并留痕', () => {
    const o = createOrder({ visitId: 'VISIT-A100', orderType: 'medication', content: '补液', feeCents: 100, orderedBy: 'doc1' });
    const r = reviewOrder({ orderId: o.orderId, decision: 'approve', reviewerId: 'nurse1', reviewerName: '护士长赵' });
    expect(r.status).toBe('approved');
    expect(r.reviewerId).toBe('nurse1');
    expect(r.reviewedAt).toBeTypeOf('number');
  });

  it('reject 无 comment -> 400', () => {
    const o = createOrder({ visitId: 'VISIT-A100', orderType: 'medication', content: '补液', feeCents: 100, orderedBy: 'doc1' });
    try {
      reviewOrder({ orderId: o.orderId, decision: 'reject', reviewerId: 'nurse1' });
      throw new Error('应当抛错');
    } catch (e) { expectStatus(e, 400); }
  });

  it('reject 有 comment -> rejected 并留痕意见', () => {
    const o = createOrder({ visitId: 'VISIT-A100', orderType: 'medication', content: '补液', feeCents: 100, orderedBy: 'doc1' });
    const r = reviewOrder({ orderId: o.orderId, decision: 'reject', comment: '指征不足', reviewerId: 'pharm1' });
    expect(r.status).toBe('rejected');
    expect(r.reviewComment).toBe('指征不足');
  });

  it('对已审核单据重复审核 -> 409', () => {
    const o = createOrder({ visitId: 'VISIT-A100', orderType: 'medication', content: '补液', feeCents: 100, orderedBy: 'doc1' });
    reviewOrder({ orderId: o.orderId, decision: 'approve', reviewerId: 'nurse1' });
    try {
      reviewOrder({ orderId: o.orderId, decision: 'approve', reviewerId: 'nurse2' });
      throw new Error('应当抛错');
    } catch (e) { expectStatus(e, 409); }
  });

  it('对 approved 再 review -> 409 非法状态跃迁', () => {
    const o = createOrder({ visitId: 'VISIT-A100', orderType: 'medication', content: '补液', feeCents: 100, orderedBy: 'doc1' });
    reviewOrder({ orderId: o.orderId, decision: 'approve', reviewerId: 'nurse1' });
    expect(() => reviewOrder({ orderId: o.orderId, decision: 'reject', comment: 'x', reviewerId: 'nurse2' }))
      .toThrowError(/非法状态跃迁/);
  });

  it('decision 非法 -> 400', () => {
    const o = createOrder({ visitId: 'VISIT-A100', orderType: 'medication', content: '补液', feeCents: 100, orderedBy: 'doc1' });
    expect(() => reviewOrder({ orderId: o.orderId, decision: 'bogus', reviewerId: 'n1' })).toThrowError(/decision/);
  });
});

describe('P0-2 执行确认状态机', () => {
  it('对 pending_review 执行 -> 409', () => {
    const o = createOrder({ visitId: 'VISIT-A100', orderType: 'nursing', content: '护理', feeCents: 100, orderedBy: 'doc1' });
    try {
      executeOrder({ orderId: o.orderId, executedBy: 'nurse1' });
      throw new Error('应当抛错');
    } catch (e) { expectStatus(e, 409); }
  });

  it('对 approved 执行 -> executed 并落执行记录', () => {
    const o = createOrder({ visitId: 'VISIT-A100', orderType: 'nursing', content: '护理', feeCents: 100, orderedBy: 'doc1' });
    reviewOrder({ orderId: o.orderId, decision: 'approve', reviewerId: 'nurse1' });
    const r = executeOrder({ orderId: o.orderId, executedBy: 'nurse1', executedByName: '护士钱', note: '床旁核对' });
    expect(r.status).toBe('executed');
    expect(r.executedAt).toBeTypeOf('number');
  });

  it('重复执行 -> 409', () => {
    const o = createOrder({ visitId: 'VISIT-A100', orderType: 'nursing', content: '护理', feeCents: 100, orderedBy: 'doc1' });
    reviewOrder({ orderId: o.orderId, decision: 'approve', reviewerId: 'nurse1' });
    executeOrder({ orderId: o.orderId, executedBy: 'nurse1' });
    expect(() => executeOrder({ orderId: o.orderId, executedBy: 'nurse2' })).toThrowError(/非法状态跃迁/);
  });
});

describe('P0-2 停止/撤销状态机', () => {
  it('stop reason 空 -> 400', () => {
    const o = createOrder({ visitId: 'VISIT-A100', orderType: 'medication', content: '补液', feeCents: 100, orderedBy: 'doc1' });
    expect(() => stopOrder({ orderId: o.orderId, reason: '', stoppedBy: 'doc1' })).toThrowError(/停止原因必填/);
  });

  it('对 pending_review 停止 -> 409', () => {
    const o = createOrder({ visitId: 'VISIT-A100', orderType: 'medication', content: '补液', feeCents: 100, orderedBy: 'doc1' });
    try {
      stopOrder({ orderId: o.orderId, reason: 'x', stoppedBy: 'doc1' });
      throw new Error('应当抛错');
    } catch (e) { expectStatus(e, 409); }
  });

  it('对 approved 停止 -> stopped 并留痕原因', () => {
    const o = createOrder({ visitId: 'VISIT-A100', orderType: 'medication', content: '补液', feeCents: 100, orderedBy: 'doc1' });
    reviewOrder({ orderId: o.orderId, decision: 'approve', reviewerId: 'nurse1' });
    const r = stopOrder({ orderId: o.orderId, reason: '患者出院', stoppedBy: 'doc1' });
    expect(r.status).toBe('stopped');
    expect(r.stopReason).toBe('患者出院');
  });

  it('对 stopped 再 stop -> 409', () => {
    const o = createOrder({ visitId: 'VISIT-A100', orderType: 'medication', content: '补液', feeCents: 100, orderedBy: 'doc1' });
    reviewOrder({ orderId: o.orderId, decision: 'approve', reviewerId: 'nurse1' });
    stopOrder({ orderId: o.orderId, reason: '出院', stoppedBy: 'doc1' });
    expect(() => stopOrder({ orderId: o.orderId, reason: '再停', stoppedBy: 'doc1' })).toThrowError(/已停止/);
  });

  it('cancel 对 approved -> 409 仅待审核可撤销', () => {
    const o = createOrder({ visitId: 'VISIT-A100', orderType: 'medication', content: '补液', feeCents: 100, orderedBy: 'doc1' });
    reviewOrder({ orderId: o.orderId, decision: 'approve', reviewerId: 'nurse1' });
    try {
      cancelOrder({ orderId: o.orderId, reason: 'x', cancelledBy: 'doc1' });
      throw new Error('应当抛错');
    } catch (e) {
      expectStatus(e, 409);
      expect((e as Error).message).toContain('仅待审核');
    }
  });

  it('cancel 对 pending_review -> cancelled', () => {
    const o = createOrder({ visitId: 'VISIT-A100', orderType: 'medication', content: '补液', feeCents: 100, orderedBy: 'doc1' });
    const r = cancelOrder({ orderId: o.orderId, reason: '开错', cancelledBy: 'doc1' });
    expect(r.status).toBe('cancelled');
  });
});

describe('P0-2 成套医嘱原子性', () => {
  it('3 条里第 3 条 feeCents=1.5 -> 400 且前 2 条也零落库', () => {
    const before = listOrders().length;
    try {
      createOrderSet({
        visitId: 'VISIT-A100',
        setName: '术前成套',
        orders: [
          { orderType: 'medication', content: '药A', feeCents: 100 },
          { orderType: 'lab', content: '化验B', feeCents: 200 },
          { orderType: 'exam', content: '检查C', feeCents: 1.5 },
        ],
        orderedBy: 'doc1',
      });
      throw new Error('应当抛错');
    } catch (e) { expectStatus(e, 400); }
    // 原子性硬断言：整批未落库
    expect(listOrders().length).toBe(before);
  });

  it('成套成功 -> orderIds 列表且 totalFeeCents=Σ', () => {
    const r = createOrderSet({
      visitId: 'VISIT-B200',
      setName: '术后成套',
      orders: [
        { orderType: 'medication', content: '药A', feeCents: 100 },
        { orderType: 'treatment', content: '治疗B', feeCents: 250 },
      ],
      orderedBy: 'doc1',
    });
    expect(r.orderIds.length).toBe(2);
    expect(r.totalFeeCents).toBe(350);
    expect(r.setId).toMatch(/^ORDSET-CO-/);
  });

  it('orders 为空 -> 400', () => {
    expect(() =>
      createOrderSet({ visitId: 'VISIT-A100', setName: 'x', orders: [], orderedBy: 'doc1' }),
    ).toThrowError(/不能为空/);
  });
});

describe('P0-2 执行单生成与幂等', () => {
  it('含未执行医嘱 -> 409 仅已执行可生成', () => {
    try {
      buildExecutionSlip({ orderIds: ['ORD-CO-1'], generatedBy: 'nurse1' }); // pending_review
      throw new Error('应当抛错');
    } catch (e) {
      expectStatus(e, 409);
      expect((e as Error).message).toContain('仅已执行');
    }
  });

  it('全已执行 -> slipNo 存在且 totalFeeCents=Σ', () => {
    const s = buildExecutionSlip({ orderIds: ['ORD-CO-3'], generatedBy: 'nurse1' });
    expect(s.slipNo).toMatch(/^SLIP-CO-\d+$/);
    expect(s.totalFeeCents).toBe(1200);
    expect(s.items[0].patientName).toBe('王某某');
  });

  it('同批重复生成 -> 同一 slipNo 且 reused=true（幂等取舍：允许重打）', () => {
    const s1 = buildExecutionSlip({ orderIds: ['ORD-CO-3'], generatedBy: 'nurse1' });
    const s2 = buildExecutionSlip({ orderIds: ['ORD-CO-3'], generatedBy: 'nurse1' });
    expect(s2.slipNo).toBe(s1.slipNo);
    expect(s2.reused).toBe(true);
    expect(listSlips().length).toBe(1); // 不新增重复单
  });

  it('orderIds 为空 -> 400', () => {
    expect(() => buildExecutionSlip({ orderIds: [], generatedBy: 'n1' })).toThrowError(/不能为空/);
  });
});

describe('P0-2 权限分级 assertCan', () => {
  it('doctor 可开立(write)但不可审核(review) -> 403', () => {
    expect(() => assertCan(mkActor(['doctor'], []), 'write')).not.toThrow();
    try {
      assertCan(mkActor(['doctor'], []), 'review');
      throw new Error('应当抛错');
    } catch (e) { expectStatus(e, 403); }
  });

  it('nurse 可执行(execute)但不可开立(write) -> 403', () => {
    expect(() => assertCan(mkActor(['nurse'], []), 'execute')).not.toThrow();
    try {
      assertCan(mkActor(['nurse'], []), 'write');
      throw new Error('应当抛错');
    } catch (e) { expectStatus(e, 403); }
  });

  it('admin 三动作全通', () => {
    expect(() => assertCan(mkActor(['admin'], []), 'write')).not.toThrow();
    expect(() => assertCan(mkActor(['admin'], []), 'review')).not.toThrow();
    expect(() => assertCan(mkActor(['admin'], []), 'execute')).not.toThrow();
  });

  it('无角色无权限 -> 403', () => {
    try {
      assertCan(mkActor([], []), 'write');
      throw new Error('应当抛错');
    } catch (e) { expectStatus(e, 403); }
  });

  it('持 inpatient_order:review 权限码可审核（角色外通道）', () => {
    expect(() => assertCan(mkActor([], ['inpatient_order:review']), 'review')).not.toThrow();
  });
});
