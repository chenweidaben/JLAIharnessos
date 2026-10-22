/**
 * 健澜科技 jlmedaios - 病案借阅管理 API（M699）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type BorrowStatus = 'requested' | 'approved' | 'borrowed' | 'returned' | 'overdue';

export interface MedicalRecordBorrow {
  id: string;
  recordNo: string;
  borrower: string;
  borrowerDept: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  status: BorrowStatus;
  reason: string;
  approver: string;
}

export const BORROW_STATUS_META: Record<BorrowStatus, { label: string; color: string }> = {
  requested: { label: '已申请', color: 'orange' },
  approved: { label: '已审批', color: 'blue' },
  borrowed: { label: '在借', color: 'processing' },
  returned: { label: '已归还', color: 'green' },
  overdue: { label: '逾期', color: 'red' },
};

const DEMO: MedicalRecordBorrow[] = [
  {
    id: 'BR-001',
    recordNo: 'ZY-2601',
    borrower: '王医师',
    borrowerDept: '呼吸科',
    borrowedAt: '2026-10-20T10:00:00+08:00',
    dueAt: '2026-10-27',
    returnedAt: null,
    status: 'borrowed',
    reason: '死亡病例讨论调阅',
    approver: '病案室李主任',
  },
  {
    id: 'BR-002',
    recordNo: 'ZY-2588',
    borrower: '陈医师',
    borrowerDept: '心内科',
    borrowedAt: '2026-10-10T14:00:00+08:00',
    dueAt: '2026-10-17',
    returnedAt: null,
    status: 'overdue',
    reason: '科研回顾性研究',
    approver: '科教科赵科长',
  },
  {
    id: 'BR-003',
    recordNo: 'ZY-2550',
    borrower: '刘医师',
    borrowerDept: '普外科',
    borrowedAt: '2026-10-05T09:00:00+08:00',
    dueAt: '2026-10-12',
    returnedAt: '2026-10-11T16:00:00+08:00',
    status: 'returned',
    reason: '医疗纠纷举证',
    approver: '医务处孙主任',
  },
];

export interface BorrowListResult {
  items: MedicalRecordBorrow[];
  demo: boolean;
}

export async function fetchMedicalRecordBorrows(): Promise<BorrowListResult> {
  try {
    const res = await get<{ items: MedicalRecordBorrow[] }>('/medical-records/borrows');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
