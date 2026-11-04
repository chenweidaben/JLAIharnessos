/**
 * 健澜AI原生医院操作系统OS - P0-3 护士站交易单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterEach, describe, expect, it } from 'bun:test';
import {
  NurseStationTradeError,
  __resetStore,
  reviewOrder,
  executeAtBedside,
  buildExecutionSlip,
  listPendingReview,
  listApproved,
  listExecuted,
} from '../../src/bff/aggregators/nurseStationTradeAggregator';
import { nurseStationTradeRoutes } from '../../src/bff/routes/nurseStationTrade';

afterEach(() => __resetStore());

describe('P0-3 医嘱审核', () => {
  it('reject 未填意见 → 400 驳回必须填写意见', () => {
    try {
      reviewOrder({ orderId: 'ORD-1001', decision: 'reject', reviewerId: 'DOC-D009' });
      throw new Error('应当抛错');
    } catch (e) {
      expect(e).toBeInstanceOf(NurseStationTradeError);
      expect((e as NurseStationTradeError).status).toBe(400);
      expect((e as Error).message).toContain('驳回必须填写意见');
    }
  });

  it('decision 非法 → 400', () => {
    expect(() =>
      reviewOrder({ orderId: 'ORD-1001', decision: 'maybe' as 'approve', reviewerId: 'DOC-D009' }),
    ).toThrowError(/decision 必须为 approve 或 reject/);
  });

  it('非 pending_review 状态审核 → 409 医嘱状态不允许审核', () => {
    // ORD-1003 已是 approved
    expect(() =>
      reviewOrder({ orderId: 'ORD-1003', decision: 'approve', reviewerId: 'DOC-D009' }),
    ).toThrowError(/医嘱状态不允许审核/);
    // ORD-1004 已是 rejected（终态）
    try {
      reviewOrder({ orderId: 'ORD-1004', decision: 'approve', reviewerId: 'DOC-D009' });
    } catch (e) {
      expect((e as NurseStationTradeError).status).toBe(409);
    }
  });

  it('approve 通过 → status=approved，reviewerId/意见留痕', () => {
    const rec = reviewOrder({
      orderId: 'ORD-1001', decision: 'approve', comment: '同意执行', reviewerId: 'DOC-D009',
      now: 1_700_000_100_000,
    });
    expect(rec.status).toBe('approved');
    expect(rec.reviewDecision).toBe('approve');
    expect(rec.reviewerId).toBe('DOC-D009');
    expect(rec.reviewComment).toContain('同意执行');
  });

  it('reject 通过 → status=rejected，意见必填留痕', () => {
    const rec = reviewOrder({
      orderId: 'ORD-1002', decision: 'reject', comment: '药物过敏史禁用', reviewerId: 'DOC-D009',
      now: 1_700_000_100_000,
    });
    expect(rec.status).toBe('rejected');
    expect(rec.reviewDecision).toBe('reject');
    expect(rec.reviewComment).toContain('过敏史');
  });

  it('重复审核（approved 再审一次）→ 409', () => {
    reviewOrder({ orderId: 'ORD-1001', decision: 'approve', reviewerId: 'DOC-D009' });
    expect(() =>
      reviewOrder({ orderId: 'ORD-1001', decision: 'reject', comment: '改主意', reviewerId: 'DOC-D009' }),
    ).toThrowError(/医嘱状态不允许审核/);
  });
});

describe('P0-3 PDA 床边执行', () => {
  it('未审核（pending_review）直接执行 → 409 医嘱未审核不可执行', () => {
    expect(() =>
      executeAtBedside({
        orderId: 'ORD-1001',
        wristband: { patientId: 'PT-P001', scannedPatientId: 'PT-P001', scannedOrderId: 'ORD-1001' },
        executorId: 'NUR-N009',
      }),
    ).toThrowError(/医嘱未审核不可执行/);
  });

  it('腕带 scannedPatientId 与台账 patientId 不匹配 → 409 腕带与患者不匹配', () => {
    // ORD-1003 已 approved，patientId=PT-P003
    try {
      executeAtBedside({
        orderId: 'ORD-1003',
        wristband: { patientId: 'PT-P003', scannedPatientId: 'PT-P999', scannedOrderId: 'ORD-1003' },
        executorId: 'NUR-N009',
      });
      throw new Error('应当抛错');
    } catch (e) {
      expect(e).toBeInstanceOf(NurseStationTradeError);
      expect((e as NurseStationTradeError).status).toBe(409);
      expect((e as Error).message).toContain('腕带与患者不匹配');
    }
  });

  it('扫码药品/医嘱不匹配（scannedOrderId ≠ orderId）→ 409', () => {
    expect(() =>
      executeAtBedside({
        orderId: 'ORD-1003',
        wristband: { patientId: 'PT-P003', scannedPatientId: 'PT-P003', scannedOrderId: 'ORD-9999' },
        executorId: 'NUR-N009',
      }),
    ).toThrowError(/扫码药品\/医嘱不匹配/);
  });

  it('三项核对全部通过 → status=executed，checks 双 true', () => {
    const rec = executeAtBedside({
      orderId: 'ORD-1003',
      wristband: { patientId: 'PT-P003', scannedPatientId: 'PT-P003', scannedOrderId: 'ORD-1003' },
      executorId: 'NUR-N009',
      now: 1_700_000_200_000,
    });
    expect(rec.status).toBe('executed');
    expect(rec.executorId).toBe('NUR-N009');
    expect(rec.checks).toEqual({ patientMatched: true, orderMatched: true });
    expect(rec.executedAt).toBe(1_700_000_200_000);
  });

  it('已 executed 再执行一次 → 409 医嘱已执行', () => {
    executeAtBedside({
      orderId: 'ORD-1003',
      wristband: { patientId: 'PT-P003', scannedPatientId: 'PT-P003', scannedOrderId: 'ORD-1003' },
      executorId: 'NUR-N009',
    });
    expect(() =>
      executeAtBedside({
        orderId: 'ORD-1003',
        wristband: { patientId: 'PT-P003', scannedPatientId: 'PT-P003', scannedOrderId: 'ORD-1003' },
        executorId: 'NUR-N010',
      }),
    ).toThrowError(/医嘱已执行/);
  });
});

describe('P0-3 执行单生成', () => {
  it('未执行（approved）→ 409 医嘱未执行不可生成执行单', () => {
    expect(() => buildExecutionSlip({ orderId: 'ORD-1003' })).toThrowError(/医嘱未执行不可生成执行单/);
  });

  it('已执行（ORD-1005 种子）→ slipNo 正常生成，checks 均为 true，feeCents 整数分', () => {
    const slip = buildExecutionSlip({ orderId: 'ORD-1005', now: 1_700_000_300_000 });
    expect(slip.slipNo).toMatch(/^SLIP-\d+$/);
    expect(slip.orderId).toBe('ORD-1005');
    expect(slip.patientName).toBe('李某某');
    expect(slip.checks.patientMatched).toBe(true);
    expect(slip.checks.orderMatched).toBe(true);
    expect(Number.isInteger(slip.feeCents ?? NaN)).toBe(true);
    expect(typeof slip.generatedAt).toBe('string');
  });
});

describe('P0-3 列表分组', () => {
  it('listPendingReview/listApproved/listExecuted 与种子状态一致', () => {
    const pending = listPendingReview().map((o) => o.orderId).sort();
    expect(pending).toEqual(['ORD-1001', 'ORD-1002']);
    expect(listApproved().map((o) => o.orderId)).toEqual(['ORD-1003']);
    expect(listExecuted().map((o) => o.orderId)).toEqual(['ORD-1005']);
  });
});

describe('P0-3 路由表自检', () => {
  it('6 条路由全部 auth:true，前缀 /api/v1/nurse-station 且不与既有 ward/visit 冲突', () => {
    expect(nurseStationTradeRoutes.length).toBe(6);
    for (const r of nurseStationTradeRoutes) {
      expect(r.auth).toBe(true);
      expect(r.path.startsWith('/api/v1/nurse-station/')).toBe(true);
      expect(r.path).not.toContain('/ward');
      expect(r.path).not.toContain('/visit/');
      expect(r.path).not.toContain('/evaluations');
    }
  });
});
