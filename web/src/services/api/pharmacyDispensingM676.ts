/**
 * 健澜科技 jlmedaios - 药房发药 API（M676）
 *
 * 对接 BFF：GET /api/v1/pharmacy/prescriptions（DEMO 兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type RxStatus = 'pending' | 'dispensing' | 'dispensed' | 'cancelled';

export interface Prescription {
  id: string;
  rxNo: string;
  patientId: string;
  dept: string;
  doctor: string;
  itemCount: number;
  totalAmount: number;
  status: RxStatus;
  createdAt: string;
}

export const RX_STATUS_META: Record<RxStatus, { label: string; color: string }> = {
  pending: { label: '待发药', color: 'orange' },
  dispensing: { label: '调剂中', color: 'processing' },
  dispensed: { label: '已发药', color: 'green' },
  cancelled: { label: '已撤销', color: 'default' },
};

const DEMO_RX: Prescription[] = [
  { id: 'RX-001', rxNo: 'RX-2610001', patientId: 'P20001', dept: '呼吸科', doctor: '王主任', itemCount: 3, totalAmount: 186.5, status: 'pending', createdAt: '2026-10-22T09:30:00+08:00' },
  { id: 'RX-002', rxNo: 'RX-2610002', patientId: 'P20005', dept: '心内科', doctor: '陈主任', itemCount: 5, totalAmount: 428.0, status: 'pending', createdAt: '2026-10-22T09:45:00+08:00' },
  { id: 'RX-003', rxNo: 'RX-2610003', patientId: 'P20011', dept: '普外科', doctor: '刘医师', itemCount: 2, totalAmount: 96.8, status: 'dispensing', createdAt: '2026-10-22T10:00:00+08:00' },
];

export interface RxListResult {
  items: Prescription[];
  demo: boolean;
}

export async function fetchPrescriptions(): Promise<RxListResult> {
  try {
    const res = await get<{ items: Prescription[] }>('/pharmacy/prescriptions');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO_RX, demo: true };
  }
}
