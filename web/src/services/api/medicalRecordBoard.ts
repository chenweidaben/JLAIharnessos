/**
 * 健澜科技 jlmedaios - 病案管理看板 API（M491）
 * 对接 BFF /api/v1/emr/* ：
 *   /emr/archive-status   归档状态
 *   /emr/archive-borrow   借阅
 *   /emr/archive-copy     复印
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface ArchiveRow {
  id: string;
  dept: string;
  should: number;
  archived: number;
  rate: number; // %
  overdue: number;
  demo?: boolean;
}

export interface BorrowRow {
  id: string;
  mrn: string;
  borrower: string;
  borrowedAt: string;
  dueAt: string;
  status: 'borrowed' | 'returned' | 'overdue';
  demo?: boolean;
}

export interface CopyRow {
  id: string;
  type: string;
  applied: number;
  done: number;
  fee: number;
  demo?: boolean;
}

const DEMO_ARCHIVE: ArchiveRow[] = [
  { id: 'a-1', dept: '心内科', should: 220, archived: 210, rate: 95.5, overdue: 3, demo: true },
  { id: 'a-2', dept: '普外科', should: 180, archived: 168, rate: 93.3, overdue: 5, demo: true },
  { id: 'a-3', dept: '神经内科', should: 140, archived: 120, rate: 85.7, overdue: 8, demo: true },
  { id: 'a-4', dept: '呼吸内科', should: 160, archived: 156, rate: 97.5, overdue: 1, demo: true },
  { id: 'a-5', dept: '骨科', should: 120, archived: 108, rate: 90.0, overdue: 4, demo: true },
];

const DEMO_BORROW: BorrowRow[] = [
  { id: 'b-1', mrn: 'ZY202610001', borrower: '医务处-王**', borrowedAt: '2026-10-12', dueAt: '2026-10-22', status: 'borrowed', demo: true },
  { id: 'b-2', mrn: 'ZY202609088', borrower: '病理科-李**', borrowedAt: '2026-09-28', dueAt: '2026-10-08', status: 'overdue', demo: true },
  { id: 'b-3', mrn: 'ZY202609215', borrower: '医保办-赵**', borrowedAt: '2026-10-05', dueAt: '2026-10-15', status: 'returned', demo: true },
  { id: 'b-4', mrn: 'ZY202610102', borrower: '医务处-陈**', borrowedAt: '2026-10-15', dueAt: '2026-10-25', status: 'borrowed', demo: true },
];

const DEMO_COPY: CopyRow[] = [
  { id: 'c-1', type: '出院病历复印', applied: 180, done: 168, fee: 12600, demo: true },
  { id: 'c-2', type: '死亡病历复印', applied: 24, done: 22, fee: 1760, demo: true },
  { id: 'c-3', type: '医保理赔复印', applied: 96, done: 88, fee: 5280, demo: true },
  { id: 'c-4', type: '诉讼病历复印', applied: 12, done: 10, fee: 900, demo: true },
];

async function safeGet<T>(url: string, fallback: T[]): Promise<{ data: T[]; demo: boolean }> {
  try {
    const res = await get<{ items?: T[] } | T[]>(url);
    const items = Array.isArray(res) ? (res as T[]) : ((res as { items?: T[] })?.items ?? []);
    if (items.length > 0) return { data: items, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

export const fetchArchiveStatus = () =>
  safeGet<ArchiveRow>('/emr/archive-status', DEMO_ARCHIVE);
export const fetchBorrow = () =>
  safeGet<BorrowRow>('/emr/archive-borrow', DEMO_BORROW);
export const fetchCopy = () =>
  safeGet<CopyRow>('/emr/archive-copy', DEMO_COPY);
