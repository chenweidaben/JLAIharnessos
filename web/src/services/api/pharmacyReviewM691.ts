/**
 * 健澜科技 jlmedaios - 药剂科处方审核 API（M691）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface PharmacyReview {
  id: string;
  rxNo: string;
  patientId: string;
  dept: string;
  doctor: string;
  itemCount: number;
  totalAmount: number;
  status: ReviewStatus;
  reviewNote: string;
  pharmacist: string;
}

export const REVIEW_STATUS_META: Record<ReviewStatus, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'orange' },
  approved: { label: '已通过', color: 'green' },
  rejected: { label: '已退回', color: 'red' },
};

const DEMO: PharmacyReview[] = [
  {
    id: 'RXR-001',
    rxNo: 'RX-2610001',
    patientId: 'P20001',
    dept: '呼吸科',
    doctor: '王主任',
    itemCount: 3,
    totalAmount: 186.5,
    status: 'pending',
    reviewNote: '',
    pharmacist: '',
  },
  {
    id: 'RXR-002',
    rxNo: 'RX-2610002',
    patientId: 'P20005',
    dept: '心内科',
    doctor: '陈主任',
    itemCount: 5,
    totalAmount: 428.0,
    status: 'approved',
    reviewNote: '用药合理，剂量在治疗范围。',
    pharmacist: '李药师',
  },
  {
    id: 'RXR-003',
    rxNo: 'RX-2610003',
    patientId: 'P20011',
    dept: '普外科',
    doctor: '刘医师',
    itemCount: 2,
    totalAmount: 96.8,
    status: 'rejected',
    reviewNote: '莫西沙星与华法林存在相互作用，建议调整。',
    pharmacist: '赵主任药师',
  },
];

export interface ReviewListResult {
  items: PharmacyReview[];
  demo: boolean;
}

export async function fetchPharmacyReviews(): Promise<ReviewListResult> {
  try {
    const res = await get<{ items: PharmacyReview[] }>('/pharmacy/reviews');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
