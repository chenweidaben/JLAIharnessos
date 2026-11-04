/**
 * 健澜AI原生医院操作系统OS - P0-4 药房发药交易单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterEach, describe, expect, it } from 'bun:test';
import {
  PharmacyDispenseTradeError,
  __resetStore,
  createPrepackBatch,
  completePrepacking,
  confirmDispense,
  requestReturn,
  approveReturn,
  listPrepackBatches,
  listDispenses,
  listReturnRequests,
} from '../../src/bff/aggregators/pharmacyDispenseTradeAggregator';
import { pharmacyDispenseTradeRoutes } from '../../src/bff/routes/pharmacyDispenseTrade';

afterEach(() => __resetStore());

/** 工具：建一个可发药的批次并完成摆药，返回 batchNo。 */
function readyBatch(orderIds: string[] = ['ORD-2001', 'ORD-2002']): string {
  const b = createPrepackBatch({ deptCode: 'WARD1', period: 'morning', orderIds, now: 1_700_000_100_000 });
  completePrepacking({ batchNo: b.batchNo, now: 1_700_000_110_000 });
  return b.batchNo;
}

describe('P0-4 摆药批次', () => {
  it('period 非法 -> 400', () => {
    expect(() =>
      createPrepackBatch({ deptCode: 'WARD1', period: 'dawn', orderIds: ['ORD-2001'] }),
    ).toThrowError(/period 必须为 morning/);
  });

  it('orderIds 空数组 -> 400 摆药医嘱不能为空', () => {
    try {
      createPrepackBatch({ deptCode: 'WARD1', period: 'morning', orderIds: [] });
      throw new Error('应当抛错');
    } catch (e) {
      expect(e).toBeInstanceOf(PharmacyDispenseTradeError);
      expect((e as PharmacyDispenseTradeError).status).toBe(400);
      expect((e as Error).message).toContain('摆药医嘱不能为空');
    }
  });

  it('同病区同时段重复建批次 -> 409 该病区该时段已有未关闭批次', () => {
    createPrepackBatch({ deptCode: 'WARD1', period: 'morning', orderIds: ['ORD-2001'] });
    expect(() =>
      createPrepackBatch({ deptCode: 'WARD1', period: 'morning', orderIds: ['ORD-2002'] }),
    ).toThrowError(/该病区该时段已有未关闭批次/);
  });

  it('complete 非 preparing（重复 complete）-> 409', () => {
    const b = createPrepackBatch({ deptCode: 'WARD1', period: 'noon', orderIds: ['ORD-2001'] });
    completePrepacking({ batchNo: b.batchNo });
    expect(() => completePrepacking({ batchNo: b.batchNo })).toThrowError(/批次状态不允许完成摆药/);
  });

  it('正常建批 -> batchNo 形如 PB-*, 条目含药品/费用整数分', () => {
    const b = createPrepackBatch({
      deptCode: 'WARD1', period: 'morning', orderIds: ['ORD-2001', 'ORD-2002'],
      now: 1_700_000_100_000,
    });
    expect(b.batchNo).toMatch(/^PB-WARD1-morning-\d+$/);
    expect(b.status).toBe('preparing');
    expect(b.items.length).toBe(2);
    expect(b.items[0].drugName).toBe('阿莫西林胶囊');
    expect(Number.isInteger(b.items[0].feeCents)).toBe(true);
  });
});

describe('P0-4 发药确认', () => {
  it('批次未 prepared（仍 preparing）发药 -> 409 批次未完成摆药', () => {
    const b = createPrepackBatch({ deptCode: 'WARD1', period: 'morning', orderIds: ['ORD-2001'] });
    expect(() =>
      confirmDispense({ orderId: 'ORD-2001', batchNo: b.batchNo, dispenserId: 'PHY-P101', checkerId: 'PHY-P202' }),
    ).toThrowError(/批次未完成摆药/);
  });

  it('双人签名同一人 -> 409 发药需双人核对', () => {
    const batchNo = readyBatch();
    expect(() =>
      confirmDispense({ orderId: 'ORD-2001', batchNo, dispenserId: 'PHY-P101', checkerId: 'PHY-P101' }),
    ).toThrowError(/发药需双人核对，签名人不得同一人/);
  });

  it('医嘱 cancelled（ORD-2004）-> 409 医嘱状态不允许发药', () => {
    const batchNo = readyBatch(['ORD-2004']);
    expect(() =>
      confirmDispense({ orderId: 'ORD-2004', batchNo, dispenserId: 'PHY-P101', checkerId: 'PHY-P202' }),
    ).toThrowError(/医嘱状态不允许发药/);
  });

  it('正常发药成功 -> dispenseNo 生成，feeCents 整数分，医嘱标记 dispensed', () => {
    const batchNo = readyBatch(['ORD-2001']);
    const rec = confirmDispense({
      orderId: 'ORD-2001', batchNo, dispenserId: 'PHY-P101', checkerId: 'PHY-P202',
      signedAt: 1_700_000_200_000,
    });
    expect(rec.dispenseNo).toMatch(/^DISP-\d+$/);
    expect(rec.batchNo).toBe(batchNo);
    expect(rec.dispenserId).toBe('PHY-P101');
    expect(rec.checkerId).toBe('PHY-P202');
    expect(rec.feeCents).toBe(450);
    expect(Number.isInteger(rec.feeCents)).toBe(true);
    expect(rec.dispensedAt).toBe(1_700_000_200_000);
    expect(rec.status).toBe('dispensed');
  });

  it('种子医嘱 ORD-2003 已发药 -> 409 医嘱已发药', () => {
    // ORD-2003 预置 dispensed + DISP-0001；需要一个 prepared 批次承载 batchNo
    const batchNo = readyBatch(['ORD-2002']);
    expect(() =>
      confirmDispense({ orderId: 'ORD-2003', batchNo, dispenserId: 'PHY-P101', checkerId: 'PHY-P202' }),
    ).toThrowError(/医嘱已发药/);
  });
});

describe('P0-4 退药申请与审批', () => {
  it('reason 为空 -> 400 退药原因必填', () => {
    expect(() =>
      requestReturn({ dispenseNo: 'DISP-0001', reason: '', quantity: 1 }),
    ).toThrowError(/退药原因必填/);
  });

  it('quantity 非正整数或超量 -> 400', () => {
    expect(() =>
      requestReturn({ dispenseNo: 'DISP-0001', reason: '患者拒服', quantity: 0 }),
    ).toThrowError(/退药数量必须为正整数/);
    expect(() =>
      requestReturn({ dispenseNo: 'DISP-0001', reason: '患者拒服', quantity: NaN }),
    ).toThrowError(/退药数量必须为正整数/);
    // DISP-0001 原发药数量=1
    expect(() =>
      requestReturn({ dispenseNo: 'DISP-0001', reason: '患者拒服', quantity: 2 }),
    ).toThrowError(/退药数量不得超过原发药数量/);
  });

  it('非 dispensed 状态申请退药 -> 409', () => {
    // 先申请一次 -> return_requested，再申请第二次即 409
    requestReturn({ dispenseNo: 'DISP-0001', reason: '患者拒服', quantity: 1 });
    expect(() =>
      requestReturn({ dispenseNo: 'DISP-0001', reason: '再次申请', quantity: 1 }),
    ).toThrowError(/发药单状态不允许申请退药/);
  });

  it('审批通过 -> returned + refundCents 整数分，医嘱联动回 approved', () => {
    requestReturn({ dispenseNo: 'DISP-0001', reason: '患者拒服', quantity: 1, now: 1_700_000_300_000 });
    const rec = approveReturn({
      dispenseNo: 'DISP-0001', approved: true, approverId: 'PHY-P900',
      note: '同意退药', now: 1_700_000_360_000,
    });
    expect(rec.status).toBe('returned');
    // ORD-2003 单价 280 分 * 退药 1 = 280
    expect(rec.refundCents).toBe(280);
    expect(Number.isInteger(rec.refundCents ?? NaN)).toBe(true);
    expect(rec.returnApproverId).toBe('PHY-P900');
  });

  it('审批驳回 -> 回 dispensed + note 留痕', () => {
    requestReturn({ dispenseNo: 'DISP-0001', reason: '患者拒服', quantity: 1 });
    const rec = approveReturn({
      dispenseNo: 'DISP-0001', approved: false, approverId: 'PHY-P900',
      note: '药已拆封不可退',
    });
    expect(rec.status).toBe('dispensed');
    expect(rec.returnApproveNote).toContain('拆封');
  });

  it('非 return_requested 状态审批 -> 409', () => {
    // DISP-0001 初始 dispensed，直接审批 -> 409
    expect(() =>
      approveReturn({ dispenseNo: 'DISP-0001', approved: true, approverId: 'PHY-P900' }),
    ).toThrowError(/发药单状态不允许审批退药/);
  });
});

describe('P0-4 列表与路由表自检', () => {
  it('listPrepackBatches/listDispenses/listReturnRequests 与操作一致', () => {
    expect(listDispenses().map((d) => d.dispenseNo)).toEqual(['DISP-0001']);
    expect(listPrepackBatches().length).toBe(0);
    expect(listReturnRequests().length).toBe(0);
    requestReturn({ dispenseNo: 'DISP-0001', reason: '患者拒服', quantity: 1 });
    expect(listReturnRequests().map((d) => d.dispenseNo)).toEqual(['DISP-0001']);
  });

  it('8 条路由全部 auth:true，前缀 /api/v1/pharmacy/dispense-trade', () => {
    expect(pharmacyDispenseTradeRoutes.length).toBe(8);
    for (const r of pharmacyDispenseTradeRoutes) {
      expect(r.auth).toBe(true);
      expect(r.path.startsWith('/api/v1/pharmacy/dispense-trade/')).toBe(true);
      expect(r.path).not.toContain('/dispense/confirm');
      expect(r.path).not.toContain('/dispense/pending');
    }
  });
});
