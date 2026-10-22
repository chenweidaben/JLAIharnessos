/**
 * 健澜科技 jlmedaios - 医保结算对账 API（M726）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ReconStatus = 'pending' | 'matched' | 'diff_found' | 'closed';

export interface Reconciliation {
  id: string;
  reconDate: string;
  declaredTotal: number;
  paidTotal: number;
  diffAmount: number;
  status: ReconStatus;
  diffReason: string;
  handleResult: string;
}

export const RECON_STATUS_META: Record<ReconStatus, { label: string; color: string }> = {
  pending: { label: '待对账', color: 'orange' },
  matched: { label: '对账一致', color: 'green' },
  diff_found: { label: '差异', color: 'red' },
  closed: { label: '已结案', color: 'blue' },
};

const DEMO: Reconciliation[] = [
  {
    id: 'RC-001',
    reconDate: '2026-10-20',
    declaredTotal: 1250000,
    paidTotal: 1238000,
    diffAmount: 12000,
    status: 'diff_found',
    diffReason: '3 笔门诊费用医保局侧未收到明细；2 笔住院结算编码差异。',
    handleResult: '待与医保局对账确认后调整。',
  },
  {
    id: 'RC-002',
    reconDate: '2026-10-19',
    declaredTotal: 980000,
    paidTotal: 980000,
    diffAmount: 0,
    status: 'matched',
    diffReason: '—',
    handleResult: '—',
  },
];

export interface ReconListResult {
  items: Reconciliation[];
  demo: boolean;
}

export async function fetchReconciliations(): Promise<ReconListResult> {
  try {
    const res = await get<{ items: Reconciliation[] }>('/insurance/reconciliations');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
