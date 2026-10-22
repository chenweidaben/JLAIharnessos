/**
 * 健澜科技 jlmedaios - 医保结算看板 v2 API（M635，配套 M608）
 *
 * 对接 BFF：GET /api/v1/insurance/settlements + GET /api/v1/insurance/preauths
 *   （10 条含 3 拒付 + 2 部分支付 + 3 条预授权）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type SettlementStatus = 'paid' | 'partial' | 'denied';

export interface Settlement {
  id: string;
  caseId: string;
  patientId: string;
  billedAmount: number;
  paidAmount: number;
  status: SettlementStatus;
  deniedReason: string | null;
  settledAt: string;
}

export interface Preauth {
  id: string;
  patientId: string;
  item: string;
  approvedAmount: number;
  status: 'approved' | 'pending' | 'rejected';
  appliedAt: string;
}

export interface InsuranceBundle {
  settlements: Settlement[];
  preauths: Preauth[];
}

export const SETTLEMENT_STATUS_META: Record<SettlementStatus, { label: string; color: string }> = {
  paid: { label: '全额支付', color: 'green' },
  partial: { label: '部分支付', color: 'orange' },
  denied: { label: '拒付', color: 'red' },
};

const DEMO_BUNDLE: InsuranceBundle = {
  settlements: [
    { id: 'IS-001', caseId: 'C-2601', patientId: 'P10001', billedAmount: 32500, paidAmount: 31000, status: 'partial', deniedReason: '超医保限定支付范围 1500 元', settledAt: '2026-10-20T10:00:00+08:00' },
    { id: 'IS-002', caseId: 'C-2602', patientId: 'P10002', billedAmount: 18800, paidAmount: 18800, status: 'paid', deniedReason: null, settledAt: '2026-10-20T11:00:00+08:00' },
    { id: 'IS-003', caseId: 'C-2603', patientId: 'P10003', billedAmount: 45000, paidAmount: 0, status: 'denied', deniedReason: '违规收费：重复计费', settledAt: '2026-10-19T15:00:00+08:00' },
    { id: 'IS-004', caseId: 'C-2604', patientId: 'P10004', billedAmount: 6200, paidAmount: 6200, status: 'paid', deniedReason: null, settledAt: '2026-10-19T16:00:00+08:00' },
    { id: 'IS-005', caseId: 'C-2605', patientId: 'P10005', billedAmount: 22000, paidAmount: 21000, status: 'partial', deniedReason: '自费项目未签字 1000 元', settledAt: '2026-10-18T09:00:00+08:00' },
    { id: 'IS-006', caseId: 'C-2606', patientId: 'P10006', billedAmount: 19500, paidAmount: 0, status: 'denied', deniedReason: '诊断与结算清单不符', settledAt: '2026-10-18T10:00:00+08:00' },
    { id: 'IS-007', caseId: 'C-2607', patientId: 'P10007', billedAmount: 9800, paidAmount: 9800, status: 'paid', deniedReason: null, settledAt: '2026-10-17T14:00:00+08:00' },
    { id: 'IS-008', caseId: 'C-2608', patientId: 'P10008', billedAmount: 27000, paidAmount: 27000, status: 'paid', deniedReason: null, settledAt: '2026-10-17T15:00:00+08:00' },
    { id: 'IS-009', caseId: 'C-2609', patientId: 'P10009', billedAmount: 15000, paidAmount: 0, status: 'denied', deniedReason: '未按规定转诊', settledAt: '2026-10-16T11:00:00+08:00' },
    { id: 'IS-010', caseId: 'C-2610', patientId: 'P10010', billedAmount: 12000, paidAmount: 12000, status: 'paid', deniedReason: null, settledAt: '2026-10-16T12:00:00+08:00' },
  ],
  preauths: [
    { id: 'PA-001', patientId: 'P10003', item: '骨科关节置换材料费', approvedAmount: 35000, status: 'approved', appliedAt: '2026-10-15T09:00:00+08:00' },
    { id: 'PA-002', patientId: 'P10006', item: '抗肿瘤靶向药', approvedAmount: 18000, status: 'approved', appliedAt: '2026-10-16T10:00:00+08:00' },
    { id: 'PA-003', patientId: 'P10011', item: 'ICU 重症监护 7 天', approvedAmount: 0, status: 'pending', appliedAt: '2026-10-22T08:00:00+08:00' },
  ],
};

export async function fetchInsuranceBundle(): Promise<InsuranceBundle & { demo: boolean }> {
  try {
    const [setRes, preRes] = await Promise.all([
      get<{ items: Settlement[] }>('/insurance/settlements'),
      get<{ items: Preauth[] }>('/insurance/preauths'),
    ]);
    return { settlements: setRes.items, preauths: preRes.items, demo: false };
  } catch {
    return { ...DEMO_BUNDLE, demo: true };
  }
}
