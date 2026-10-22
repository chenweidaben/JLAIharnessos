/**
 * 健澜科技 jlmedaios - 门诊药房发药管理 API（M713）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type RxStatus = 'pending' | 'dispensing' | 'dispensed';

export interface OutpatientPrescription {
  id: string;
  rxNo: string;
  patientId: string;
  dept: string;
  drugCount: number;
  totalFee: number;
  status: RxStatus;
  items: { name: string; spec: string; dose: string; qty: number }[];
  dispenser: string;
  verifier: string;
}

export const RX_STATUS_META: Record<RxStatus, { label: string; color: string }> = {
  pending: { label: '待发药', color: 'orange' },
  dispensing: { label: '配药中', color: 'processing' },
  dispensed: { label: '已发药', color: 'green' },
};

const DEMO: OutpatientPrescription[] = [
  {
    id: 'OP-001',
    rxNo: 'RX-261001',
    patientId: 'P10002',
    dept: '呼吸内科',
    drugCount: 3,
    totalFee: 156.5,
    status: 'pending',
    items: [
      { name: '阿莫西林克拉维酸钾', spec: '0.375g×12片', dose: '0.375g tid', qty: 2 },
      { name: '氨溴索口服溶液', spec: '100ml:0.6g', dose: '10ml tid', qty: 1 },
      { name: '复方甘草片', spec: '100片', dose: '3片 tid', qty: 1 },
    ],
    dispenser: '—',
    verifier: '—',
  },
  {
    id: 'OP-002',
    rxNo: 'RX-261002',
    patientId: 'P10008',
    dept: '心内科',
    drugCount: 2,
    totalFee: 88.0,
    status: 'dispensed',
    items: [
      { name: '阿托伐他汀钙片', spec: '20mg×7片', dose: '20mg qn', qty: 2 },
      { name: '阿司匹林肠溶片', spec: '100mg×30片', dose: '100mg qd', qty: 1 },
    ],
    dispenser: '药师李',
    verifier: '药师王',
  },
];

export interface RxListResult {
  items: OutpatientPrescription[];
  demo: boolean;
}

export async function fetchOutpatientPrescriptions(): Promise<RxListResult> {
  try {
    const res = await get<{ items: OutpatientPrescription[] }>('/pharmacy/outpatient-prescriptions');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
