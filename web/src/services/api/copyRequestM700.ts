/**
 * 健澜科技 jlmedaios - 病历复印申请 API（M700）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type CopyStatus = 'requested' | 'processing' | 'ready' | 'collected';
export type CollectMethod = 'onsite' | 'mail' | 'courier';

export interface CopyRequest {
  id: string;
  reqNo: string;
  patientId: string;
  purpose: string;
  requestedAt: string;
  materials: string[];
  totalFee: number;
  collectMethod: CollectMethod;
  status: CopyStatus;
}

export const COPY_STATUS_META: Record<CopyStatus, { label: string; color: string }> = {
  requested: { label: '已申请', color: 'orange' },
  processing: { label: '处理中', color: 'processing' },
  ready: { label: '待领取', color: 'blue' },
  collected: { label: '已领取', color: 'green' },
};

export const COLLECT_METHOD_META: Record<CollectMethod, string> = {
  onsite: '现场领取',
  mail: '邮寄',
  courier: '快递',
};

const DEMO: CopyRequest[] = [
  {
    id: 'CP-001',
    reqNo: 'CP-2610001',
    patientId: 'P10002',
    purpose: '商业保险理赔',
    requestedAt: '2026-10-20T10:00:00+08:00',
    materials: ['出院小结', '住院病案首页', '出院诊断证明', '手术记录'],
    totalFee: 35.0,
    collectMethod: 'onsite',
    status: 'ready',
  },
  {
    id: 'CP-002',
    reqNo: 'CP-2610002',
    patientId: 'P10015',
    purpose: '异地医保报销',
    requestedAt: '2026-10-22T09:00:00+08:00',
    materials: ['住院费用清单', '住院发票', '出院小结'],
    totalFee: 48.0,
    collectMethod: 'mail',
    status: 'processing',
  },
];

export interface CopyListResult {
  items: CopyRequest[];
  demo: boolean;
}

export async function fetchCopyRequests(): Promise<CopyListResult> {
  try {
    const res = await get<{ items: CopyRequest[] }>('/medical-records/copy-requests');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
