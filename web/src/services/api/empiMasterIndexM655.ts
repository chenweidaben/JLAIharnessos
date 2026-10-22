/**
 * 健澜科技 jlmedaios - EMPI 患者主索引 API（M655，配套 M582）
 *
 * 对接 BFF：GET /api/v1/empi/patients
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface EmpiPatient {
  empiId: string;
  name: string;
  gender: 'M' | 'F';
  age: number;
  idCard: string;
  mrnList: Array<{ hospital: string; mrn: string }>;
  mergeStatus: 'single' | 'merged' | 'pending_review';
}

export const MERGE_STATUS_META: Record<EmpiPatient['mergeStatus'], { label: string; color: string }> = {
  single: { label: '单院患者', color: 'default' },
  merged: { label: '已合并', color: 'green' },
  pending_review: { label: '待复核', color: 'orange' },
};

const DEMO_EMPI: EmpiPatient[] = [
  {
    empiId: 'EMPI-100001',
    name: '张建国',
    gender: 'M',
    age: 58,
    idCard: '3301**********1234',
    mrnList: [
      { hospital: '本院', mrn: 'P10001' },
      { hospital: '市一医院', mrn: 'M20001' },
      { hospital: '省人民', mrn: 'S30012' },
    ],
    mergeStatus: 'merged',
  },
  {
    empiId: 'EMPI-100002',
    name: '李梅',
    gender: 'F',
    age: 45,
    idCard: '3301**********5678',
    mrnList: [{ hospital: '本院', mrn: 'P10004' }],
    mergeStatus: 'single',
  },
  {
    empiId: 'EMPI-100003',
    name: '王强',
    gender: 'M',
    age: 62,
    idCard: '3301**********9012',
    mrnList: [
      { hospital: '本院', mrn: 'P10009' },
      { hospital: '同德医院', mrn: 'T11022' },
    ],
    mergeStatus: 'pending_review',
  },
];

export interface EmpiListResult {
  items: EmpiPatient[];
  totalCount: number;
  demo: boolean;
}

export async function fetchEmpiPatients(): Promise<EmpiListResult> {
  try {
    const res = await get<{ items: EmpiPatient[]; totalCount: number }>('/empi/patients');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_EMPI, totalCount: DEMO_EMPI.length, demo: true };
  }
}
